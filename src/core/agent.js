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
        this.waypoints = []; // Array of {x, y} waypoints to follow
        this.state = 'idle'; // idle, moving, leaving
        this.config = config;
        this.color = config.COLORS.AGENT_ACTIVE;
        this.radius = config.AGENT_RADIUS;
        this.lastWaypointUpdate = 0; // Track when waypoints were last recalculated
        this.waypointUpdateInterval = 500; // ms between waypoint updates
    }

    /**
     * Set movement target for the agent
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {Obstacles} obstacles - Optional obstacles manager for pathfinding
     */
    setTarget(x, y, obstacles = null) {
        // Check if target has changed significantly (more than 5 pixels)
        const targetChanged = this.targetX === null || this.targetY === null ||
            Math.abs(this.targetX - x) > 5 || Math.abs(this.targetY - y) > 5;
        
        this.targetX = x;
        this.targetY = y;
        this.state = 'moving';
        
        // Only recalculate waypoints if target changed significantly
        // This prevents waypoints from being wiped out every frame when setTarget is called with same/similar coordinates
        if (targetChanged) {
            // Calculate waypoints if obstacles provided and target requires routing around them
            if (obstacles && (this.state === 'moving' || this.state === 'approaching_queue')) {
                this.waypoints = this.calculateWaypoints(x, y, obstacles);
            } else {
                this.waypoints = [];
            }
        }
    }

    /**
     * Calculate waypoints to route around obstacles
     * @param {number} targetX - Final target X position
     * @param {number} targetY - Final target Y position
     * @param {Obstacles} obstacles - Obstacles manager
     * @returns {Array} Array of {x, y} waypoints
     */
    calculateWaypoints(targetX, targetY, obstacles) {
        const waypoints = [];
        const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
            this.config.PERSONAL_SPACE : 0;
        
        // Check if straight line to target is clear
        const steps = 10; // Check 10 points along the path
        let needsWaypoint = false;
        
        for (let i = 1; i <= steps; i++) {
            const checkX = this.x + (targetX - this.x) * (i / steps);
            const checkY = this.y + (targetY - this.y) * (i / steps);
            
            if (obstacles.checkCollision(checkX, checkY, this.radius, this.state, personalSpaceBuffer)) {
                needsWaypoint = true;
                break;
            }
        }
        
        if (!needsWaypoint) {
            return []; // Direct path is clear
        }
        
        // Find obstacles that block the path and route around them
        const blockingObstacles = this.findBlockingObstacles(targetX, targetY, obstacles, personalSpaceBuffer);
        
        if (blockingObstacles.length === 0) {
            return []; // No obstacles blocking
        }
        
        // For simplicity, route around the first blocking obstacle
        // by going to one of its corners
        const obstacle = blockingObstacles[0];
        const buffer = this.radius + personalSpaceBuffer + 5; // Extra 5px buffer
        
        // Calculate the four corners of the obstacle (with buffer)
        const corners = [
            { x: obstacle.x - buffer, y: obstacle.y - buffer }, // Top-left
            { x: obstacle.x + obstacle.width + buffer, y: obstacle.y - buffer }, // Top-right
            { x: obstacle.x - buffer, y: obstacle.y + obstacle.height + buffer }, // Bottom-left
            { x: obstacle.x + obstacle.width + buffer, y: obstacle.y + obstacle.height + buffer } // Bottom-right
        ];
        
        // Choose the corner that's closest to a line from agent to target
        let bestCorner = corners[0];
        let bestScore = Infinity;
        
        for (const corner of corners) {
            // Score = distance from agent to corner + distance from corner to target
            const distToCorner = Math.sqrt(Math.pow(corner.x - this.x, 2) + Math.pow(corner.y - this.y, 2));
            const distFromCorner = Math.sqrt(Math.pow(targetX - corner.x, 2) + Math.pow(targetY - corner.y, 2));
            const score = distToCorner + distFromCorner;
            
            // Also check if corner is actually accessible
            if (!obstacles.checkCollision(corner.x, corner.y, this.radius, this.state, personalSpaceBuffer) &&
                score < bestScore) {
                bestScore = score;
                bestCorner = corner;
            }
        }
        
        waypoints.push(bestCorner);
        return waypoints;
    }

    /**
     * Find obstacles that block the direct path to target
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {Obstacles} obstacles - Obstacles manager
     * @param {number} personalSpaceBuffer - Personal space buffer
     * @returns {Array} Array of blocking obstacles
     */
    findBlockingObstacles(targetX, targetY, obstacles, personalSpaceBuffer) {
        const blocking = [];
        
        // Check line from agent to target against each obstacle
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
            
            // Check if line from agent to target intersects this rectangle
            if (this.lineIntersectsRectangle(this.x, this.y, targetX, targetY, 
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
     * Calculate avoidance waypoints around other fans
     * @param {Agent[]} otherAgents - Array of other agents to avoid
     * @param {number} targetX - Final target X
     * @param {number} targetY - Final target Y
     * @returns {Array} Array of waypoint objects {x, y}
     */
    calculateFanAvoidanceWaypoints(otherAgents, targetX, targetY) {
        const MAX_DETECTION_DISTANCE = 100; // Local knowledge limit
        const AVOIDANCE_ANGLE = Math.PI / 6; // 30 degrees - small angle for mostly straight paths
        const MIN_AVOIDANCE_DISTANCE = 20; // Minimum distance to create waypoint
        
        // Direction to target
        const toTargetDx = targetX - this.x;
        const toTargetDy = targetY - this.y;
        const distToTarget = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy);
        
        if (distToTarget < 5) return []; // Already at target
        
        const targetDirX = toTargetDx / distToTarget;
        const targetDirY = toTargetDy / distToTarget;
        
        // Find fans in the way
        let needsAvoidance = false;
        let avoidRight = false;
        
        for (const other of otherAgents) {
            if (other === this || !other.isMoving()) continue;
            
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distToOther = Math.sqrt(dx * dx + dy * dy);
            
            // Only consider nearby fans (local knowledge)
            if (distToOther > MAX_DETECTION_DISTANCE) continue;
            
            // Check if other fan is roughly in our path to target
            const dotProduct = (dx * targetDirX + dy * targetDirY) / distToOther;
            
            // Fan is in our way if they're ahead of us (dotProduct > 0.5 means within ~60 degrees)
            if (dotProduct > 0.5 && distToOther < this.config.PERSONAL_SPACE * 3) {
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
        
        if (!needsAvoidance) return [];
        
        // Create a waypoint to the side
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
        
        return [{ x: waypointX, y: waypointY }];
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
            // Only recalculate waypoints if we don't have any, or if we're making poor progress
            const currentTime = Date.now();
            const shouldUpdateWaypoints = (currentTime - this.lastWaypointUpdate) > this.waypointUpdateInterval;
            
            if (shouldUpdateWaypoints && this.targetX !== null && this.targetY !== null) {
                this.lastWaypointUpdate = currentTime;
                
                // Check if we're making progress toward our target
                // Calculate distance to final target
                const distToFinalTarget = Math.sqrt(
                    Math.pow(this.targetX - this.x, 2) + 
                    Math.pow(this.targetY - this.y, 2)
                );
                
                // Only recalculate waypoints if:
                // 1. We don't have waypoints already, OR
                // 2. We're very close to our target (< 30 pixels) and need precise navigation
                const needsRecalculation = this.waypoints.length === 0 || distToFinalTarget < 30;
                
                if (needsRecalculation) {
                    // Calculate waypoints around other fans
                    const fanWaypoints = this.calculateFanAvoidanceWaypoints(otherAgents, this.targetX, this.targetY);
                    
                    // Only use fan avoidance waypoints if they would help
                    if (fanWaypoints.length > 0) {
                        this.waypoints = fanWaypoints;
                    }
                }
            }
            
            // Check if we have waypoints to follow
            let currentTargetX, currentTargetY;
            
            if (this.waypoints.length > 0) {
                // Follow waypoints first
                const waypoint = this.waypoints[0];
                currentTargetX = waypoint.x;
                currentTargetY = waypoint.y;
                
                // Check if we've reached this waypoint
                const distToWaypoint = Math.sqrt(
                    Math.pow(waypoint.x - this.x, 2) + 
                    Math.pow(waypoint.y - this.y, 2)
                );
                
                if (distToWaypoint < 10) { // Within 10 pixels of waypoint
                    this.waypoints.shift(); // Remove this waypoint
                    
                    // If no more waypoints, use final target
                    if (this.waypoints.length === 0) {
                        currentTargetX = this.targetX;
                        currentTargetY = this.targetY;
                    } else {
                        // Move to next waypoint
                        const nextWaypoint = this.waypoints[0];
                        currentTargetX = nextWaypoint.x;
                        currentTargetY = nextWaypoint.y;
                    }
                }
            } else {
                // No waypoints, use final target
                currentTargetX = this.targetX;
                currentTargetY = this.targetY;
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
                if (this.waypoints.length === 0 && currentTargetX === this.targetX && currentTargetY === this.targetY) {
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
