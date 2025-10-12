/**
 * Base Agent class representing any festival attendee
 * Provides movement, collision detection, and rendering functionality
 */
import * as Pathfinding from './pathfinding.js'
import { AgentState } from '../utils/enums.js'

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
        this.state = AgentState.IDLE
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
            this.state === AgentState.MOVING || 
            this.state === AgentState.APPROACHING_QUEUE || 
            this.state === AgentState.IDLE
        )
        
        if (needsPathfinding) {
            // Calculate static waypoints using pathfinding module
            const personalSpaceBuffer = (this.state === AgentState.APPROACHING_QUEUE || this.state === AgentState.MOVING) ? 
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
        
        // Set state to moving (unless already in a queue/processing/advancing/waiting state)
        if (this.state !== AgentState.IN_QUEUE_WAITING && 
            this.state !== AgentState.APPROACHING_QUEUE && 
            this.state !== AgentState.PROCESSING &&
            this.state !== AgentState.IN_QUEUE_ADVANCING) {
            this.state = AgentState.MOVING
        }
        
        // Clear dynamic waypoint when target changes
        this.dynamicWaypoint = null
    }

    /**
     * Mark agent as leaving the festival
     */
    markAsLeaving() {
        this.state = AgentState.LEAVING;
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
        const thisPassingThrough = (this.state === AgentState.MOVING || this.state === AgentState.IDLE) && !this.inQueue;
        const otherInQueue = other.inQueue || other.state === AgentState.IN_QUEUE || other.state === AgentState.APPROACHING_QUEUE;
        const otherPassingThrough = (other.state === AgentState.MOVING || other.state === AgentState.IDLE) && !other.inQueue;
        const thisInQueue = this.inQueue || this.state === AgentState.IN_QUEUE || this.state === AgentState.APPROACHING_QUEUE;
        
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
        return this.state === AgentState.MOVING || this.state === AgentState.APPROACHING_QUEUE || 
               this.state === AgentState.IN_QUEUE_ADVANCING || this.state === AgentState.RETURNING_TO_QUEUE;
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
        const personalSpaceBuffer = (this.state === AgentState.APPROACHING_QUEUE || this.state === AgentState.MOVING) ? 
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
     * Update agent state for current frame
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null, simulationTime = 0) {
        // Allow movement for moving, in_queue_advancing, approaching_queue, and returning_to_queue states
        // Note: in_queue_waiting, processing, and idle are stationary states
        if ((this.state === AgentState.MOVING || this.state === AgentState.IN_QUEUE_ADVANCING || this.state === AgentState.APPROACHING_QUEUE || this.state === AgentState.RETURNING_TO_QUEUE) && this.targetX !== null) {
            const currentTime = simulationTime || Date.now()
            const personalSpaceBuffer = (this.state === AgentState.APPROACHING_QUEUE || this.state === AgentState.MOVING) ? 
                this.config.PERSONAL_SPACE : 0
            const waypointReachDistance = this.config.WAYPOINT_REACH_DISTANCE || 10
            
            // Check if waypoints need updating (only updates non-first waypoints)
            const needsWaypointUpdate = obstacles && 
                Pathfinding.shouldUpdateWaypoints(this.waypointUpdateTimes, currentTime, this.config)
            
            // Update waypoints if needed
            if (needsWaypointUpdate && this.targetX !== null && this.targetY !== null && this.staticWaypoints.length > 1) {
                // Keep first waypoint fixed, only update subsequent waypoints
                const firstWaypoint = this.staticWaypoints[0]
                const firstUpdateTime = this.waypointUpdateTimes[0]
                
                // Recalculate path from first waypoint to target
                const updatedWaypoints = Pathfinding.calculateStaticWaypoints(
                    firstWaypoint.x, firstWaypoint.y, this.targetX, this.targetY, 
                    obstacles, this.radius, personalSpaceBuffer, this.config
                )
                
                // Replace waypoints but keep the first one fixed
                this.staticWaypoints = [firstWaypoint, ...updatedWaypoints]
                
                // Reset update times but keep first waypoint's time
                const newUpdateTimes = Pathfinding.initializeWaypointUpdateTimes(
                    updatedWaypoints, currentTime, this.config
                )
                this.waypointUpdateTimes = [firstUpdateTime, ...newUpdateTimes]
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
            this.dynamicWaypoint = Pathfinding.calculateDynamicFanAvoidance(
                this, otherAgents, nextStaticTargetX, nextStaticTargetY, obstacles, this.config
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
                    if (this.state === AgentState.MOVING) {
                        this.state = AgentState.IDLE
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
