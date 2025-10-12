/**
 * Base Agent class representing any festival attendee
 * Provides movement, collision detection, and rendering functionality
 */
import * as Pathfinding from './pathfinding.js'

export class Agent {
    /**
     * Create a new agent
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {Object} config - Configuration object
     */
    constructor(x, y, config) {
        this.x = x
        this.y = y
        this.targetX = null
        this.targetY = null
        this.staticWaypoints = [] // Waypoints for routing around static obstacles (stages, food stalls)
        this.dynamicWaypoint = null // Single waypoint for avoiding other fans
        this.state = 'idle' // idle, moving, leaving, in_queue, approaching_queue, passed_security, processing
        this.config = config
        this.color = config.COLORS.AGENT_ACTIVE
        this.radius = config.AGENT_RADIUS
        this.waypointUpdateTimes = [] // Track last update time for each waypoint individually
    }

    /**
     * Set movement target for the agent
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {Obstacles} obstacles - Optional obstacles manager for pathfinding
     * @param {number} simulationTime - Optional simulation time (for timestamp initialization)
     */
    setTarget(x, y, obstacles = null, simulationTime = 0) {
        this.targetX = x
        this.targetY = y
        
        // Determine if this agent needs pathfinding based on state
        // Moving fans need pathfinding (but not stationary fans like those in_queue, processing, or idle)
        const needsPathfinding = obstacles && (
            this.state === 'moving' || 
            this.state === 'approaching_queue' || 
            this.state === 'passed_security'
        )
        
        if (needsPathfinding) {
            // Calculate static waypoints using pathfinding module
            const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
                this.config.PERSONAL_SPACE : 0
            
            this.staticWaypoints = Pathfinding.calculateStaticWaypoints(
                this.x, this.y, x, y, obstacles, this.radius, personalSpaceBuffer, this.config
            )
            
            // Initialize update times for waypoints (with randomization)
            const currentTime = simulationTime || Date.now()
            this.waypointUpdateTimes = Pathfinding.initializeWaypointUpdateTimes(
                this.staticWaypoints, currentTime, this.config
            )
        } else {
            // Stationary fans don't need waypoints
            this.staticWaypoints = []
            this.waypointUpdateTimes = []
        }
        
        // Set state to moving (unless already in a queue/processing state)
        if (this.state !== 'in_queue' && 
            this.state !== 'approaching_queue' && 
            this.state !== 'processing') {
            this.state = 'moving'
        }
        
        // Clear dynamic waypoint when target changes
        this.dynamicWaypoint = null
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
        if (!obstacles) return null
        
        const distance = Math.sqrt(targetDx * targetDx + targetDy * targetDy)
        if (distance === 0) return null
        
        const dirX = targetDx / distance
        const dirY = targetDy / distance
        
        // Perpendicular direction for side-stepping
        const perpX = -dirY
        const perpY = dirX
        
        // Use personal space buffer for food stalls when approaching_queue or moving
        const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
            this.config.PERSONAL_SPACE : 0
        
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
        ]
        
        // Try each strategy
        for (const pos of strategies) {
            if (!obstacles.checkCollision(pos.x, pos.y, this.radius, this.state, personalSpaceBuffer)) {
                return pos
            }
        }
        
        return null // No valid position found
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
                this.config.PERSONAL_SPACE : 0
            
            // Check if waypoint is inside an obstacle
            if (obstacles.checkCollision(waypointX, waypointY, this.radius, this.state, personalSpaceBuffer)) {
                return null // Waypoint is inside an obstacle, don't use it
            }
        }
        
        return { x: waypointX, y: waypointY }
    }

    /**
     * Update agent state for current frame
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null, simulationTime = 0) {
        // Allow movement for moving, in_queue, passed_security, and approaching_queue states
        if ((this.state === 'moving' || this.state === 'in_queue' || this.state === 'passed_security' || this.state === 'approaching_queue') && this.targetX !== null) {
            const currentTime = simulationTime || Date.now()
            const personalSpaceBuffer = (this.state === 'approaching_queue' || this.state === 'moving') ? 
                this.config.PERSONAL_SPACE : 0
            const waypointReachDistance = this.config.WAYPOINT_REACH_DISTANCE || 10
            
            // Check if waypoints need updating (only checks first waypoint)
            const needsWaypointUpdate = obstacles && 
                Pathfinding.shouldUpdateWaypoints(this.waypointUpdateTimes, currentTime, this.config)
            
            // Update waypoints if needed
            if (needsWaypointUpdate && this.targetX !== null && this.targetY !== null) {
                // Recalculate entire path from current position
                this.staticWaypoints = Pathfinding.calculateStaticWaypoints(
                    this.x, this.y, this.targetX, this.targetY, 
                    obstacles, this.radius, personalSpaceBuffer, this.config
                )
                // Reset all waypoint update times
                this.waypointUpdateTimes = Pathfinding.initializeWaypointUpdateTimes(
                    this.staticWaypoints, currentTime, this.config
                )
            }
            
            // Determine next static waypoint or final target
            let nextStaticTargetX, nextStaticTargetY
            
            if (this.staticWaypoints.length > 0) {
                // Follow static waypoints first
                const waypoint = this.staticWaypoints[0]
                nextStaticTargetX = waypoint.x
                nextStaticTargetY = waypoint.y
                
                // Check if we've reached this waypoint
                const distToWaypoint = Math.sqrt(
                    Math.pow(waypoint.x - this.x, 2) + 
                    Math.pow(waypoint.y - this.y, 2)
                )
                
                if (distToWaypoint < waypointReachDistance) {
                    // Remove reached waypoint
                    this.staticWaypoints.shift()
                    this.waypointUpdateTimes.shift()
                    
                    // Update target to next waypoint or final destination
                    if (this.staticWaypoints.length === 0) {
                        nextStaticTargetX = this.targetX
                        nextStaticTargetY = this.targetY
                    } else {
                        const nextWaypoint = this.staticWaypoints[0]
                        nextStaticTargetX = nextWaypoint.x
                        nextStaticTargetY = nextWaypoint.y
                    }
                }
            } else {
                // No static waypoints, use final target directly
                nextStaticTargetX = this.targetX
                nextStaticTargetY = this.targetY
            }
            
            // Calculate dynamic fan avoidance waypoint (updated every frame)
            this.dynamicWaypoint = this.calculateDynamicFanAvoidance(
                otherAgents, nextStaticTargetX, nextStaticTargetY, obstacles
            )
            
            // Determine actual movement target
            let currentTargetX, currentTargetY
            if (this.dynamicWaypoint) {
                // Use dynamic waypoint for immediate fan avoidance
                currentTargetX = this.dynamicWaypoint.x
                currentTargetY = this.dynamicWaypoint.y
            } else {
                // No fans to avoid, head toward next static waypoint or target
                currentTargetX = nextStaticTargetX
                currentTargetY = nextStaticTargetY
            }
            
            const dx = currentTargetX - this.x
            const dy = currentTargetY - this.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Frame-independent movement using delta time
            const moveDistance = this.config.AGENT_SPEED * deltaTime * simulationSpeed
            
            if (distance < moveDistance) {
                this.x = currentTargetX
                this.y = currentTargetY
                
                // Check if we've reached the final destination
                const distToFinalTarget = Math.sqrt(
                    Math.pow(this.targetX - this.x, 2) + 
                    Math.pow(this.targetY - this.y, 2)
                )
                
                if (distToFinalTarget < waypointReachDistance && this.staticWaypoints.length === 0) {
                    // Reached final destination
                    this.x = this.targetX
                    this.y = this.targetY
                    this.targetX = null
                    this.targetY = null
                    this.staticWaypoints = []
                    this.waypointUpdateTimes = []
                    
                    // Transition to idle when reaching target
                    if (this.state === 'moving' || this.state === 'passed_security') {
                        this.state = 'idle'
                    }
                }
            } else {
                // Calculate next position
                let nextX = this.x + (dx / distance) * moveDistance
                let nextY = this.y + (dy / distance) * moveDistance
                
                // Check if next position collides with obstacle
                if (obstacles && obstacles.checkCollision(nextX, nextY, this.radius, this.state, personalSpaceBuffer)) {
                    // Try to find alternative path around obstacle
                    const avoidancePos = this.findAvoidancePosition(dx, dy, moveDistance, obstacles)
                    if (avoidancePos) {
                        nextX = avoidancePos.x
                        nextY = avoidancePos.y
                    }
                    // If no avoidance position found, stay in place
                    // The resolveCollision after movement will push away from obstacles
                }
                
                this.x = nextX
                this.y = nextY
            }
        }

        // Check and resolve collisions with other agents
        // Use allowMovingOverlap=true to allow temporary personal space overlap while moving
        for (const other of otherAgents) {
            if (other !== this && this.overlapsWith(other, true)) {
                this.resolveOverlap(other)
            }
        }

        // Check and resolve collisions with obstacles
        if (obstacles) {
            obstacles.resolveCollision(this)
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
