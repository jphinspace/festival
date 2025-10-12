/**
 * Base Agent class representing any festival attendee
 * Provides movement, collision detection, and rendering functionality
 */
import * as Pathfinding from './pathfinding.js'
import { AgentState } from '../utils/enums.js'
import * as Geometry from '../utils/geometry.js'
import * as StateChecks from '../utils/stateChecks.js'
import * as TimeUtils from '../utils/timeUtils.js'

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
        const needsPathfinding = obstacles && StateChecks.needsPathfinding(this.state)
        
        if (needsPathfinding) {
            // Calculate static waypoints using pathfinding module
            const personalSpaceBuffer = StateChecks.shouldUsePersonalSpaceBuffer(this.state) ? 
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
        const distance = Geometry.calculateDistance(this.x, this.y, other.x, other.y);
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
        return StateChecks.isMovingState(this.state);
    }

    /**
     * Resolve overlap by pushing agents apart
     * Uses simple push-based collision resolution
     * @param {Agent} other - Another agent to resolve collision with
     */
    resolveOverlap(other) {
        const distance = Geometry.calculateDistance(this.x, this.y, other.x, other.y);
        
        // Use stricter distance for pushing (only push if bodies actually overlap)
        const minDistance = this.radius + other.radius;
        
        if (distance < minDistance && distance > 0) {
            // Calculate push direction
            const pushDistance = (minDistance - distance) / 2;
            const normalized = Geometry.normalizeVector(this.x - other.x, this.y - other.y);
            const pushX = normalized.x * pushDistance;
            const pushY = normalized.y * pushDistance;
            
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
        
        const distance = Geometry.calculateDistanceFromDeltas(targetDx, targetDy)
        if (distance === 0) return null
        
        const normalized = Geometry.normalizeVector(targetDx, targetDy)
        const dirX = normalized.x
        const dirY = normalized.y
        
        // Perpendicular direction for side-stepping
        const perp = Geometry.calculatePerpendicularVector(dirX, dirY)
        const perpX = perp.x
        const perpY = perp.y
        
        // Use personal space buffer for food stalls when approaching_queue or moving
        const personalSpaceBuffer = StateChecks.shouldUsePersonalSpaceBuffer(this.state) ? 
            this.config.PERSONAL_SPACE : 0
        
        // Try multiple avoidance strategies in order of preference
        const strategies = [
            // 1. Try moving at an angle (30 degrees) to the right
            Geometry.positionWithAngularOffset(this.x, this.y, dirX, dirY, moveDistance, -30),
            // 2. Try moving at an angle (30 degrees) to the left
            Geometry.positionWithAngularOffset(this.x, this.y, dirX, dirY, moveDistance, 30),
            // 3. Try moving at steeper angle (60 degrees) to the right
            Geometry.positionWithAngularOffset(this.x, this.y, dirX, dirY, moveDistance, -60),
            // 4. Try moving at steeper angle (60 degrees) to the left
            Geometry.positionWithAngularOffset(this.x, this.y, dirX, dirY, moveDistance, 60),
            // 5. Try moving perpendicular right
            Geometry.moveInDirection(this.x, this.y, perpX, perpY, moveDistance),
            // 6. Try moving perpendicular left
            Geometry.moveInDirection(this.x, this.y, -perpX, -perpY, moveDistance)
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
    /**
     * Update waypoints if needed (keeps first waypoint fixed)
     * @param {Object} obstacles - Obstacles object
     * @param {number} personalSpaceBuffer - Personal space buffer
     * @param {number} currentTime - Current timestamp
     * @private
     */
    _updateWaypointsIfNeeded(obstacles, personalSpaceBuffer, currentTime) {
        if (!obstacles || this.staticWaypoints.length <= 1) {
            return
        }
        
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

    /**
     * Get the next static waypoint or final target
     * @param {number} waypointReachDistance - Distance threshold for reaching waypoint
     * @returns {{x: number, y: number}} Next target position
     * @private
     */
    _getNextStaticTarget(waypointReachDistance) {
        if (this.staticWaypoints.length === 0) {
            return { x: this.targetX, y: this.targetY }
        }
        
        const waypoint = this.staticWaypoints[0]
        
        // Check if we've reached this waypoint
        const distToWaypoint = Geometry.calculateDistance(this.x, this.y, waypoint.x, waypoint.y)
        
        if (distToWaypoint < waypointReachDistance) {
            // Remove reached waypoint
            this.staticWaypoints.shift()
            this.waypointUpdateTimes.shift()
            
            // Return next waypoint or final destination
            if (this.staticWaypoints.length === 0) {
                return { x: this.targetX, y: this.targetY }
            } else {
                const nextWaypoint = this.staticWaypoints[0]
                return { x: nextWaypoint.x, y: nextWaypoint.y }
            }
        }
        
        return { x: waypoint.x, y: waypoint.y }
    }

    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null, simulationTime = 0) {
        // Allow movement for moving, in_queue_advancing, approaching_queue, and returning_to_queue states
        // Note: in_queue_waiting, processing, and idle are stationary states
        if (StateChecks.canMove(this.state) && this.targetX !== null) {
            const currentTime = simulationTime || Date.now()
            const personalSpaceBuffer = StateChecks.shouldUsePersonalSpaceBuffer(this.state) ? 
                this.config.PERSONAL_SPACE : 0
            const waypointReachDistance = this.config.WAYPOINT_REACH_DISTANCE || 10
            
            // Check if waypoints need updating (only updates non-first waypoints)
            const needsWaypointUpdate = obstacles && 
                Pathfinding.shouldUpdateWaypoints(this.waypointUpdateTimes, currentTime, this.config)
            
            // Update waypoints if needed
            if (needsWaypointUpdate && this.targetX !== null && this.targetY !== null) {
                this._updateWaypointsIfNeeded(obstacles, personalSpaceBuffer, currentTime)
            }
            
            // Determine next static waypoint or final target
            const nextStaticTarget = this._getNextStaticTarget(waypointReachDistance)
            
            // Calculate dynamic fan avoidance waypoint (updated every frame)
            this.dynamicWaypoint = Pathfinding.calculateDynamicFanAvoidance(
                this, otherAgents, nextStaticTarget.x, nextStaticTarget.y, obstacles, this.config
            )
            
            // Determine actual movement target
            let currentTargetX, currentTargetY
            if (this.dynamicWaypoint) {
                // Use dynamic waypoint for immediate fan avoidance
                currentTargetX = this.dynamicWaypoint.x
                currentTargetY = this.dynamicWaypoint.y
            } else {
                // No fans to avoid, head toward next static waypoint or target
                currentTargetX = nextStaticTarget.x
                currentTargetY = nextStaticTarget.y
            }
            
            const dx = currentTargetX - this.x
            const dy = currentTargetY - this.y
            const distance = Geometry.calculateDistanceFromDeltas(dx, dy)
            
            // Frame-independent movement using delta time
            const moveDistance = TimeUtils.calculateMovementDistance(this.config.AGENT_SPEED, deltaTime, simulationSpeed)
            
            if (distance < moveDistance) {
                this.x = currentTargetX
                this.y = currentTargetY
                
                // Check if we've reached the final destination
                const distToFinalTarget = Geometry.calculateDistance(this.x, this.y, this.targetX, this.targetY)
                
                if (distToFinalTarget < waypointReachDistance && this.staticWaypoints.length === 0) {
                    // Reached final destination
                    this.x = this.targetX
                    this.y = this.targetY
                    this.targetX = null
                    this.targetY = null
                    this.staticWaypoints = []
                    this.waypointUpdateTimes = []
                    
                    // Transition to idle when reaching target
                    if (StateChecks.shouldTransitionToIdle(this.state)) {
                        this.state = AgentState.IDLE
                    }
                }
            } else {
                // Calculate next position
                const normalized = Geometry.normalizeVector(dx, dy)
                const nextPos = Geometry.moveInDirection(this.x, this.y, normalized.x, normalized.y, moveDistance)
                let nextX = nextPos.x
                let nextY = nextPos.y
                
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
        return Geometry.isWithinDistance(this.x, this.y, this.targetX, this.targetY, threshold);
    }
}
