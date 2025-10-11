/**
 * Base Agent class representing any festival attendee
 * Provides movement, collision detection, and rendering functionality
 */
export class Agent {
    /**
     * Create a new agent
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {Object} config - Configuration object
     */
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.targetX = null;
        this.targetY = null;
        this.staticWaypoints = []; // Waypoints for routing around static obstacles (stages, food stalls)
        this.dynamicWaypoint = null; // Single waypoint for avoiding other fans
        this.state = 'idle'; // idle, moving, leaving
        this.config = config;
        this.color = config.COLORS.AGENT_ACTIVE;
        this.radius = config.AGENT_RADIUS;
        this.lastStaticWaypointUpdate = 0; // Track when static waypoints were last recalculated
        this.staticWaypointUpdateInterval = 500; // ms between static waypoint updates
    }

    /**
     * Set movement target for the agent
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {Obstacles} obstacles - Optional obstacles manager for pathfinding
     */
    setTarget(x, y, obstacles = null) {
        // Check if target has changed significantly (more than 5 pixels)
        const targetChanged = !this.targetX || !this.targetY || 
            Math.abs(x - this.targetX) > 5 || Math.abs(y - this.targetY) > 5;
        
        this.targetX = x;
        this.targetY = y;
        
        // Only recalculate waypoints if target changed significantly
        if (!targetChanged) {
            return; // Target hasn't moved enough, keep existing waypoints
        }
        
        // Calculate static waypoints for routing around obstacles (global pathfinding)
        // Check state BEFORE potentially changing it
        const needsPathfinding = obstacles && (this.state === 'moving' || this.state === 'approaching_queue' || this.state === 'idle' || this.state === 'passed_security');
        
        // Generate waypoints BEFORE changing state
        if (needsPathfinding) {
            this.staticWaypoints = this.calculateStaticWaypoints(x, y, obstacles);
            // Reset the timer so waypoints are recalculated on schedule
            this.lastStaticWaypointUpdate = Date.now();
        } else {
            this.staticWaypoints = [];
        }
        
        // Set state to moving (unless already in a queue state)
        // Do this AFTER pathfinding so the state check works correctly
        if (this.state !== 'in_queue' && this.state !== 'approaching_queue') {
            this.state = 'moving';
        }
        
        // Clear dynamic waypoint when target changes
        this.dynamicWaypoint = null;
    }

    /**
     * Calculate static waypoints to route around obstacles
     * Uses global knowledge of all static obstacles (stages, food stalls)
     * Can make sharp turns and multiple waypoints as needed (up to 5)
     * @param {number} targetX - Final target X position
     * @param {number} targetY - Final target Y position
     * @param {Obstacles} obstacles - Obstacles manager
     * @returns {Array} Array of {x, y} waypoints (minimum 0, maximum 5)
     */
    calculateStaticWaypoints(targetX, targetY, obstacles) {
        const waypoints = [];
        const MAX_WAYPOINTS = 5;
        const MIN_WAYPOINTS = 0; // Can be 0 if direct path is clear
        const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
            this.config.PERSONAL_SPACE : 0;
        
        // Start from current position
        let currentX = this.x;
        let currentY = this.y;
        
        // Iteratively build path around obstacles
        for (let iteration = 0; iteration < MAX_WAYPOINTS; iteration++) {
            // Check if straight line from current position to target is clear
            if (this.isPathClear(currentX, currentY, targetX, targetY, obstacles, personalSpaceBuffer)) {
                // Path is clear! We're done
                break;
            }
            
            // Find obstacles that block the path from current position to target
            const blockingObstacles = this.findBlockingObstacles(targetX, targetY, obstacles, personalSpaceBuffer, currentX, currentY);
            
            if (blockingObstacles.length === 0) {
                break; // No obstacles blocking, we're done
            }
            
            // Route around the first blocking obstacle
            const obstacle = blockingObstacles[0];
            const buffer = this.radius + personalSpaceBuffer + 5; // Extra 5px buffer
            
            // Calculate the four corners of the obstacle (with buffer)
            const corners = [
                { x: obstacle.x - buffer, y: obstacle.y - buffer }, // Top-left
                { x: obstacle.x + obstacle.width + buffer, y: obstacle.y - buffer }, // Top-right
                { x: obstacle.x - buffer, y: obstacle.y + obstacle.height + buffer }, // Bottom-left
                { x: obstacle.x + obstacle.width + buffer, y: obstacle.y + obstacle.height + buffer } // Bottom-right
            ];
            
            // Add slight randomness to corner positions to avoid all fans taking identical routes
            const randomness = 5; // +/- 5 pixels of randomness
            corners.forEach(corner => {
                corner.x += (Math.random() - 0.5) * randomness * 2;
                corner.y += (Math.random() - 0.5) * randomness * 2;
            });
            
            // Choose the best corner that has clear paths both TO and FROM it
            let bestCorner = null;
            let bestScore = Infinity;
            
            // Calculate direction from current position to target for directional preference
            const toTargetDx = targetX - currentX;
            const toTargetDy = targetY - currentY;
            const toTargetDist = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy);
            
            for (const corner of corners) {
                // First check if corner itself is accessible (not inside an obstacle)
                if (obstacles.checkCollision(corner.x, corner.y, this.radius, this.state, personalSpaceBuffer)) {
                    continue; // Skip this corner, it's inside an obstacle
                }
                
                // Check if path from current position to corner is clear
                if (!this.isPathClear(currentX, currentY, corner.x, corner.y, obstacles, personalSpaceBuffer)) {
                    continue; // Can't reach this corner
                }
                
                // NOTE: We DON'T check if path from corner to target is clear
                // This allows multi-waypoint paths where we route around multiple obstacles
                // The next iteration will handle any remaining obstacles
                
                // Calculate score = total distance through this corner
                const distToCorner = Math.sqrt(Math.pow(corner.x - currentX, 2) + Math.pow(corner.y - currentY, 2));
                const distFromCorner = Math.sqrt(Math.pow(targetX - corner.x, 2) + Math.pow(targetY - corner.y, 2));
                
                // Add directional preference: favor corners that are generally in the direction of the target
                // This helps when at midpoint - choose corner that moves us toward target
                let directionBonus = 0;
                if (toTargetDist > 0) {
                    const toCornerDx = corner.x - currentX;
                    const toCornerDy = corner.y - currentY;
                    const toCornerDist = Math.sqrt(toCornerDx * toCornerDx + toCornerDy * toCornerDy);
                    if (toCornerDist > 0) {
                        // Dot product gives alignment: 1 = same direction, -1 = opposite
                        const alignment = (toCornerDx * toTargetDx + toCornerDy * toTargetDy) / (toCornerDist * toTargetDist);
                        // Penalize corners that go backwards (negative alignment)
                        // alignment ranges from -1 to 1, convert to penalty: 0 to 200 pixels
                        directionBonus = (1 - alignment) * 100; // 0 penalty for forward, 200 for backward
                    }
                }
                
                const randomFactor = 0.95 + Math.random() * 0.1; // 0.95 to 1.05 - reduced randomness for more consistency
                const score = (distToCorner + distFromCorner + directionBonus) * randomFactor;
                
                if (score < bestScore) {
                    bestScore = score;
                    bestCorner = corner;
                }
            }
            
            // If we found a valid corner, add it as a waypoint and continue from there
            if (bestCorner) {
                waypoints.push(bestCorner);
                currentX = bestCorner.x;
                currentY = bestCorner.y;
            } else {
                // No valid corner found - try intermediate waypoint along edge
                // This helps when all corners are blocked but we can move along obstacle edge
                const midPoints = [
                    { x: (obstacle.x + obstacle.x + obstacle.width) / 2 - buffer, y: obstacle.y - buffer }, // Top middle
                    { x: (obstacle.x + obstacle.x + obstacle.width) / 2 + buffer, y: obstacle.y + obstacle.height + buffer }, // Bottom middle
                    { x: obstacle.x - buffer, y: (obstacle.y + obstacle.y + obstacle.height) / 2 }, // Left middle
                    { x: obstacle.x + obstacle.width + buffer, y: (obstacle.y + obstacle.y + obstacle.height) / 2 } // Right middle
                ];
                
                for (const midPoint of midPoints) {
                    if (!obstacles.checkCollision(midPoint.x, midPoint.y, this.radius, this.state, personalSpaceBuffer) &&
                        this.isPathClear(currentX, currentY, midPoint.x, midPoint.y, obstacles, personalSpaceBuffer)) {
                        waypoints.push(midPoint);
                        currentX = midPoint.x;
                        currentY = midPoint.y;
                        break; // Try this intermediate point, then recalculate on next iteration
                    }
                }
                break; // If still no waypoint, give up on this iteration
            }
        }
        
        return waypoints;
    }
    
    /**
     * Check if a straight path between two points is clear of obstacles
     * @param {number} x1 - Start X position
     * @param {number} y1 - Start Y position
     * @param {number} x2 - End X position
     * @param {number} y2 - End Y position
     * @param {Obstacles} obstacles - Obstacles manager
     * @param {number} personalSpaceBuffer - Personal space buffer
     * @returns {boolean} True if path is clear
     */
    isPathClear(x1, y1, x2, y2, obstacles, personalSpaceBuffer) {
        if (!obstacles) return true;
        
        // Use proper line-rectangle intersection checking
        // This catches edges and corners that discrete point sampling might miss
        const blocking = this.findBlockingObstacles(x2, y2, obstacles, personalSpaceBuffer, x1, y1);
        return blocking.length === 0;
    }

    /**
     * Find obstacles that block the direct path to target
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {Obstacles} obstacles - Obstacles manager
     * @param {number} personalSpaceBuffer - Personal space buffer
     * @param {number} fromX - Start X position (defaults to this.x)
     * @param {number} fromY - Start Y position (defaults to this.y)
     * @returns {Array} Array of blocking obstacles
     */
    findBlockingObstacles(targetX, targetY, obstacles, personalSpaceBuffer, fromX = null, fromY = null) {
        const blocking = [];
        const startX = fromX !== null ? fromX : this.x;
        const startY = fromY !== null ? fromY : this.y;
        
        // Check line from start position to target against each obstacle
        for (const obs of obstacles.obstacles) {
            // Skip security and bus obstacles as usual
            if (obs.type === 'security' || obs.type === 'bus') continue;
            
            // Check if line intersects obstacle bounds (with buffer for food stalls)
            let effectiveBuffer = 0;
            if (obs.type === 'foodStall' && (this.state === 'approaching_queue' || this.state === 'moving')) {
                effectiveBuffer = personalSpaceBuffer;
            }
            
            // Expand obstacle bounds
            const obsLeft = obs.x - effectiveBuffer;
            const obsRight = obs.x + obs.width + effectiveBuffer;
            const obsTop = obs.y - effectiveBuffer;
            const obsBottom = obs.y + obs.height + effectiveBuffer;
            
            // Check if target is within the buffer zone of this obstacle
            // If so, this obstacle should NOT be considered blocking, because we're trying to get TO it (for queue)
            const targetNearObstacle = targetX >= obsLeft && targetX <= obsRight && 
                                      targetY >= obsTop && targetY <= obsBottom;
            
            if (targetNearObstacle) {
                continue; // Skip this obstacle - target is supposed to be near it
            }
            
            // Check if line from start to target intersects this rectangle
            if (this.lineIntersectsRectangle(startX, startY, targetX, targetY, 
                obsLeft, obsTop, obsRight, obsBottom)) {
                blocking.push({
                    ...obs,
                    x: obsLeft,
                    y: obsTop,
                    width: obsRight - obsLeft,
                    height: obsBottom - obsTop
                });
            }
        }
        
        return blocking;
    }

    /**
     * Check if line segment intersects rectangle
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {number} left - Rectangle left edge
     * @param {number} top - Rectangle top edge
     * @param {number} right - Rectangle right edge
     * @param {number} bottom - Rectangle bottom edge
     * @returns {boolean} True if line intersects rectangle
     */
    lineIntersectsRectangle(x1, y1, x2, y2, left, top, right, bottom) {
        // Check if either endpoint is inside rectangle
        if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
            (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
            return true;
        }
        
        // Check if line intersects any of the four edges
        return this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||  // Top edge
               this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) || // Right edge
               this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) || // Bottom edge
               this.lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom);  // Left edge
    }

    /**
     * Check if two line segments intersect
     * @param {number} x1 - First line start X
     * @param {number} y1 - First line start Y
     * @param {number} x2 - First line end X
     * @param {number} y2 - First line end Y
     * @param {number} x3 - Second line start X
     * @param {number} y3 - Second line start Y
     * @param {number} x4 - Second line end X
     * @param {number} y4 - Second line end Y
     * @returns {boolean} True if lines intersect
     */
    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false; // Parallel lines
        
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    /**
     * Mark agent as leaving the festival
     */
    markAsLeaving() {
        this.state = 'leaving';
        this.color = this.config.COLORS.AGENT_LEAVING;
    }

    /**
     * Get personal space distance based on context
     * @param {Agent} other - Another agent to check context with
     * @returns {number} Personal space distance in pixels
     */
    getPersonalSpace(other) {
        // Check if both agents are watching a concert and up front (packed crowd)
        if (this.currentShow && other.currentShow && 
            this.isUpFront && other.isUpFront) {
            return this.config.CONCERT_PERSONAL_SPACE;
        }
        
        // Check if one agent is passing through a queue (special case)
        // An agent is "passing through" if they're moving and not in queue, 
        // while the other is in queue
        const thisPassingThrough = (this.state === 'moving' || this.state === 'idle') && !this.inQueue;
        const otherInQueue = other.inQueue || other.state === 'in_queue' || other.state === 'approaching_queue';
        const otherPassingThrough = (other.state === 'moving' || other.state === 'idle') && !other.inQueue;
        const thisInQueue = this.inQueue || this.state === 'in_queue' || this.state === 'approaching_queue';
        
        if ((thisPassingThrough && otherInQueue) || (otherPassingThrough && thisInQueue)) {
            // Allow closer proximity when passing through queues
            return this.config.CONCERT_PERSONAL_SPACE;
        }
        
        // Normal personal space for all other situations
        return this.config.PERSONAL_SPACE;
    }

    /**
     * Check if this agent overlaps with another agent (considering personal space)
     * @param {Agent} other - Another agent to check collision with
     * @param {boolean} allowMovingOverlap - Allow temporary overlap if both are moving
     * @returns {boolean} True if agents are too close
     */
    overlapsWith(other, allowMovingOverlap = false) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const personalSpace = this.getPersonalSpace(other);
        
        // Allow temporary personal space overlap while moving (but not complete body overlap)
        if (allowMovingOverlap && this.isMoving() && other.isMoving()) {
            // Allow overlap of personal space circles but not bodies
            const minDistance = this.radius + other.radius;
            return distance < minDistance;
        }
        
        return distance < personalSpace;
    }
    
    /**
     * Check if agent is currently moving
     * @returns {boolean} True if agent is in a moving state
     */
    isMoving() {
        return this.state === 'moving' || this.state === 'approaching_queue' || 
               this.state === 'in_queue' || this.state === 'passed_security';
    }

    /**
     * Resolve overlap by pushing agents apart
     * Uses simple push-based collision resolution
     * @param {Agent} other - Another agent to resolve collision with
     */
    resolveOverlap(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Use stricter distance for pushing (only push if bodies actually overlap)
        const minDistance = this.radius + other.radius;
        
        if (distance < minDistance && distance > 0) {
            // Calculate push direction
            const pushDistance = (minDistance - distance) / 2;
            const pushX = (dx / distance) * pushDistance;
            const pushY = (dy / distance) * pushDistance;
            
            // Push both agents apart
            this.x += pushX;
            this.y += pushY;
            other.x -= pushX;
            other.y -= pushY;
        }
    }

    /**
     * Try to find a valid position that avoids obstacles
     * @param {number} targetDx - Direction to target (X)
     * @param {number} targetDy - Direction to target (Y)
     * @param {number} moveDistance - Distance to move
     * @param {Obstacles} obstacles - Obstacles manager
     * @returns {Object|null} {x, y} position or null if no valid position found
     */
    findAvoidancePosition(targetDx, targetDy, moveDistance, obstacles) {
        const distance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
        if (distance === 0) return null;
        
        const dirX = targetDx / distance;
        const dirY = targetDy / distance;
        
        // Perpendicular direction for side-stepping
        const perpX = -dirY;
        const perpY = dirX;
        
        // Use personal space buffer for food stalls when approaching_queue or moving
        const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
            this.config.PERSONAL_SPACE : 0;
        
        // Try multiple avoidance strategies in order of preference
        const strategies = [
            // 1. Try moving at an angle (30 degrees) to the right
            { x: this.x + (dirX * 0.866 + perpX * 0.5) * moveDistance, 
              y: this.y + (dirY * 0.866 + perpY * 0.5) * moveDistance },
            // 2. Try moving at an angle (30 degrees) to the left
            { x: this.x + (dirX * 0.866 - perpX * 0.5) * moveDistance, 
              y: this.y + (dirY * 0.866 - perpY * 0.5) * moveDistance },
            // 3. Try moving at steeper angle (60 degrees) to the right
            { x: this.x + (dirX * 0.5 + perpX * 0.866) * moveDistance, 
              y: this.y + (dirY * 0.5 + perpY * 0.866) * moveDistance },
            // 4. Try moving at steeper angle (60 degrees) to the left
            { x: this.x + (dirX * 0.5 - perpX * 0.866) * moveDistance, 
              y: this.y + (dirY * 0.5 - perpY * 0.866) * moveDistance },
            // 5. Try moving perpendicular right
            { x: this.x + perpX * moveDistance, 
              y: this.y + perpY * moveDistance },
            // 6. Try moving perpendicular left
            { x: this.x - perpX * moveDistance, 
              y: this.y - perpY * moveDistance }
        ];
        
        // Try each strategy
        for (const pos of strategies) {
            if (!obstacles.checkCollision(pos.x, pos.y, this.radius, this.state, personalSpaceBuffer)) {
                return pos;
            }
        }
        
        return null; // No valid position found
    }

    /**
     * Calculate dynamic waypoint for avoiding other fans
     * Uses local knowledge (MAX_DETECTION_DISTANCE) and 30-degree avoidance angle
     * Updated every frame for responsive fan avoidance
     * @param {Agent[]} otherAgents - Array of other agents to avoid
     * @param {number} nextTargetX - Next waypoint or final target X
     * @param {number} nextTargetY - Next waypoint or final target Y
     * @param {Obstacles} obstacles - Obstacles manager for validation
     * @returns {Object|null} Single waypoint object {x, y} or null
     */
    calculateDynamicFanAvoidance(otherAgents, nextTargetX, nextTargetY, obstacles = null) {
        const MAX_DETECTION_DISTANCE = 100; // Local knowledge limit
        const AVOIDANCE_ANGLE = Math.PI / 6; // 30 degrees - small angle for mostly straight paths
        const MIN_AVOIDANCE_DISTANCE = 20; // Minimum distance to create waypoint
        
        // Direction to next target
        const toTargetDx = nextTargetX - this.x;
        const toTargetDy = nextTargetY - this.y;
        const distToTarget = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy);
        
        if (distToTarget < 5) return null; // Already at target
        
        const targetDirX = toTargetDx / distToTarget;
        const targetDirY = toTargetDy / distToTarget;
        
        // Find fans in the way
        let needsAvoidance = false;
        let avoidRight = false;
        
        for (const other of otherAgents) {
            if (other === this) continue;
            // Note: Removed !other.isMoving() check - we need to avoid ALL fans, moving or stuck
            
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distToOther = Math.sqrt(dx * dx + dy * dy);
            
            // Only consider nearby fans (local knowledge)
            if (distToOther > MAX_DETECTION_DISTANCE) continue;
            
            // Check if other fan is roughly in our path to target
            const dotProduct = (dx * targetDirX + dy * targetDirY) / distToOther;
            
            // Fan is in our way if they're ahead of us (dotProduct > 0.5 means within ~60 degrees)
            // OR if they're very close (within personal space * 2) at any angle (handles perpendicular collisions)
            const inOurPath = dotProduct > 0.5 && distToOther < this.config.PERSONAL_SPACE * 3;
            const veryClose = distToOther < this.config.PERSONAL_SPACE * 2;
            
            if (inOurPath || veryClose) {
                needsAvoidance = true;
                
                // Determine if we should avoid right or left
                // Cross product tells us if other fan is to our left or right
                const crossProduct = targetDirX * dy - targetDirY * dx;
                
                // Both fans avoid to their right (positive cross = fan on left, avoid right)
                // This creates consistent behavior when fans are on collision course
                avoidRight = crossProduct > 0;
                break;
            }
        }
        
        if (!needsAvoidance) return null;
        
        // Create a waypoint to the side using 30-degree angle
        const avoidDistance = MIN_AVOIDANCE_DISTANCE;
        const angle = avoidRight ? -AVOIDANCE_ANGLE : AVOIDANCE_ANGLE;
        
        // Rotate direction vector by avoidance angle
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const avoidDirX = targetDirX * cos - targetDirY * sin;
        const avoidDirY = targetDirX * sin + targetDirY * cos;
        
        // Create waypoint
        const waypointX = this.x + avoidDirX * avoidDistance;
        const waypointY = this.y + avoidDirY * avoidDistance;
        
        // Validate dynamic waypoint isn't inside an obstacle
        if (obstacles) {
            const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
                this.config.PERSONAL_SPACE : 0;
            
            // Check if waypoint is inside an obstacle
            if (obstacles.checkCollision(waypointX, waypointY, this.radius, this.state, personalSpaceBuffer)) {
                return null; // Waypoint is inside an obstacle, don't use it
            }
            
            // Check if path to waypoint is clear (won't be blocked by obstacle)
            if (!this.isPathClear(this.x, this.y, waypointX, waypointY, obstacles, personalSpaceBuffer)) {
                return null; // Can't reach waypoint, don't use it
            }
        }
        
        return { x: waypointX, y: waypointY };
    }

    /**
     * Update agent state for current frame
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     */
    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null) {
        // Allow movement for moving, in_queue, passed_security, and approaching_queue states
        if ((this.state === 'moving' || this.state === 'in_queue' || this.state === 'passed_security' || this.state === 'approaching_queue') && this.targetX !== null) {
            // Periodically update static waypoints (every 500ms) with slight randomness
            const currentTime = Date.now();
            const shouldUpdateStaticWaypoints = (currentTime - this.lastStaticWaypointUpdate) > this.staticWaypointUpdateInterval;
            
            // Also update if we have no waypoints and path to target is blocked
            const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? this.config.PERSONAL_SPACE : 0;
            
            // Check if path is blocked - ALWAYS check when we have no waypoints
            const pathBlocked = obstacles && this.targetX !== null && this.targetY !== null &&
                !this.isPathClear(this.x, this.y, this.targetX, this.targetY, obstacles, personalSpaceBuffer);
            
            const needsWaypointsNow = this.staticWaypoints.length === 0 && pathBlocked;
            
            if ((shouldUpdateStaticWaypoints || needsWaypointsNow) && this.targetX !== null && this.targetY !== null && obstacles) {
                this.lastStaticWaypointUpdate = currentTime;
                
                // Recalculate static waypoints with randomness for path variety
                this.staticWaypoints = this.calculateStaticWaypoints(this.targetX, this.targetY, obstacles);
            }
            
            // Determine next static waypoint or final target
            let nextStaticTargetX, nextStaticTargetY;
            
            if (this.staticWaypoints.length > 0) {
                // Follow static waypoints first
                const waypoint = this.staticWaypoints[0];
                nextStaticTargetX = waypoint.x;
                nextStaticTargetY = waypoint.y;
                
                // Check if we've reached this waypoint
                const distToWaypoint = Math.sqrt(
                    Math.pow(waypoint.x - this.x, 2) + 
                    Math.pow(waypoint.y - this.y, 2)
                );
                
                if (distToWaypoint < 10) { // Within 10 pixels of waypoint
                    this.staticWaypoints.shift(); // Remove this waypoint
                    
                    // If no more waypoints, use final target
                    if (this.staticWaypoints.length === 0) {
                        nextStaticTargetX = this.targetX;
                        nextStaticTargetY = this.targetY;
                    } else {
                        // Move to next waypoint
                        const nextWaypoint = this.staticWaypoints[0];
                        nextStaticTargetX = nextWaypoint.x;
                        nextStaticTargetY = nextWaypoint.y;
                    }
                }
            } else {
                // No static waypoints, use final target
                nextStaticTargetX = this.targetX;
                nextStaticTargetY = this.targetY;
            }
            
            // Calculate dynamic fan avoidance waypoint (updated every frame)
            this.dynamicWaypoint = this.calculateDynamicFanAvoidance(otherAgents, nextStaticTargetX, nextStaticTargetY, obstacles);
            
            // Determine actual movement target
            let currentTargetX, currentTargetY;
            if (this.dynamicWaypoint) {
                // Use dynamic waypoint for immediate fan avoidance
                currentTargetX = this.dynamicWaypoint.x;
                currentTargetY = this.dynamicWaypoint.y;
            } else {
                // No fans to avoid, head toward next static waypoint or target
                currentTargetX = nextStaticTargetX;
                currentTargetY = nextStaticTargetY;
            }
            
            const dx = currentTargetX - this.x;
            const dy = currentTargetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Frame-independent movement using delta time
            const moveDistance = this.config.AGENT_SPEED * deltaTime * simulationSpeed;
            
            if (distance < moveDistance) {
                this.x = currentTargetX;
                this.y = currentTargetY;
                
                // Only clear target if we've reached the final target (no waypoints left)
                if (this.staticWaypoints.length === 0 && currentTargetX === this.targetX && currentTargetY === this.targetY) {
                    this.targetX = null;
                    this.targetY = null;
                    // Transition to idle when reaching target
                    if (this.state === 'moving' || this.state === 'passed_security') {
                        this.state = 'idle';
                    }
                }
            } else {
                // Calculate next position
                let nextX = this.x + (dx / distance) * moveDistance;
                let nextY = this.y + (dy / distance) * moveDistance;
                
                // Use personal space buffer for food stalls when approaching_queue or moving
                const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
                    this.config.PERSONAL_SPACE : 0;
                
                // Check if next position collides with obstacle
                if (obstacles && obstacles.checkCollision(nextX, nextY, this.radius, this.state, personalSpaceBuffer)) {
                    // Try to find alternative path around obstacle
                    const avoidancePos = this.findAvoidancePosition(dx, dy, moveDistance, obstacles);
                    if (avoidancePos) {
                        nextX = avoidancePos.x;
                        nextY = avoidancePos.y;
                    }
                    // If no avoidance position found, stay in place
                    // The resolveCollision after movement will push away from obstacles
                }
                
                this.x = nextX;
                this.y = nextY;
            }
        }

        // Check and resolve collisions with other agents
        // Use allowMovingOverlap=true to allow temporary personal space overlap while moving
        for (const other of otherAgents) {
            if (other !== this && this.overlapsWith(other, true)) {
                this.resolveOverlap(other);
            }
        }

        // Check and resolve collisions with obstacles
        if (obstacles) {
            obstacles.resolveCollision(this);
        }
    }

    /**
     * Render agent to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Check if agent is near its target
     * @param {number} threshold - Distance threshold in pixels
     * @returns {boolean} True if near target or has no target
     */
    isNearTarget(threshold = 10) {
        if (this.targetX === null || this.targetY === null) return true;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }
}
