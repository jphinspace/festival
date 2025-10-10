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
     * Check if this agent overlaps with another agent
     * @param {Agent} other - Another agent to check collision with
     * @returns {boolean} True if agents overlap
     */
    overlapsWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.radius + other.radius;
        return distance < minDistance;
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
                
                // Simple obstacle avoidance: if next position would collide, try moving around
                if (obstacles && obstacles.checkCollision(nextX, nextY, this.radius, this.state)) {
                    // Try moving perpendicular to the obstacle
                    const perpX = -dy / distance;
                    const perpY = dx / distance;
                    
                    // Try right first
                    let altX = this.x + perpX * moveDistance;
                    let altY = this.y + perpY * moveDistance;
                    
                    if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                        nextX = altX;
                        nextY = altY;
                    } else {
                        // Try left
                        altX = this.x - perpX * moveDistance;
                        altY = this.y - perpY * moveDistance;
                        
                        if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                            nextX = altX;
                            nextY = altY;
                        } else {
                            // Try diagonal combinations for better navigation
                            const diagMoveDistance = moveDistance * 0.7; // Reduced for diagonal
                            
                            // Try forward-right diagonal
                            altX = this.x + (dx / distance) * diagMoveDistance + perpX * diagMoveDistance;
                            altY = this.y + (dy / distance) * diagMoveDistance + perpY * diagMoveDistance;
                            
                            if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                                nextX = altX;
                                nextY = altY;
                            } else {
                                // Try forward-left diagonal
                                altX = this.x + (dx / distance) * diagMoveDistance - perpX * diagMoveDistance;
                                altY = this.y + (dy / distance) * diagMoveDistance - perpY * diagMoveDistance;
                                
                                if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                                    nextX = altX;
                                    nextY = altY;
                                } else {
                                    // Try just moving in one axis to slide along obstacles
                                    // Try X movement only
                                    altX = this.x + (dx / distance) * moveDistance;
                                    altY = this.y;
                                    if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                                        nextX = altX;
                                        nextY = altY;
                                    } else {
                                        // Try Y movement only  
                                        altX = this.x;
                                        altY = this.y + (dy / distance) * moveDistance;
                                        if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                                            nextX = altX;
                                            nextY = altY;
                                        } else {
                                            // Last resort: try small random jitter to unstuck
                                            const jitterX = (Math.random() - 0.5) * moveDistance * 0.5;
                                            const jitterY = (Math.random() - 0.5) * moveDistance * 0.5;
                                            altX = this.x + jitterX;
                                            altY = this.y + jitterY;
                                            if (!obstacles.checkCollision(altX, altY, this.radius, this.state)) {
                                                nextX = altX;
                                                nextY = altY;
                                            }
                                            // If even jitter doesn't work, stay in place but don't permanently block
                                            // The resolveCollision after movement will push away from obstacles
                                        }
                                    }
                                }
                            }
                        }
                    }
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
