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
        this.state = 'idle'; // idle, moving, leaving
        this.config = config;
        this.color = config.COLORS.AGENT_ACTIVE;
        this.radius = config.AGENT_RADIUS;
    }

    /**
     * Set movement target for the agent
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.state = 'moving';
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
     * @returns {boolean} True if agents are too close
     */
    overlapsWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const personalSpace = this.getPersonalSpace(other);
        return distance < personalSpace;
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
        const personalSpace = this.getPersonalSpace(other);
        
        if (distance < personalSpace && distance > 0) {
            // Calculate push direction
            const pushDistance = (personalSpace - distance) / 2;
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
     * Update agent state for current frame
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     */
    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null) {
        // Allow movement for moving, in_queue, passed_security, and approaching_queue states
        if ((this.state === 'moving' || this.state === 'in_queue' || this.state === 'passed_security' || this.state === 'approaching_queue') && this.targetX !== null) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Frame-independent movement using delta time
            const moveDistance = this.config.AGENT_SPEED * deltaTime * simulationSpeed;
            
            if (distance < moveDistance) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.targetX = null;
                this.targetY = null;
                // Transition to idle when reaching target
                if (this.state === 'moving' || this.state === 'passed_security') {
                    this.state = 'idle';
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
        for (const other of otherAgents) {
            if (other !== this && this.overlapsWith(other)) {
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
