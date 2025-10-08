/**
 * Fan class - a subclass of Agent representing festival fans/attendees
 * Extends the base Agent class with fan-specific behaviors
 */
import { Agent } from './agent.js';

export class Fan extends Agent {
    /**
     * Create a new fan
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {Object} config - Configuration object
     */
    constructor(x, y, config) {
        super(x, y, config);
        this.type = 'fan';
        
        // Initialize hunger to a random level
        this.hunger = config.HUNGER_MIN_INITIAL + 
            Math.random() * (config.HUNGER_MAX_INITIAL - config.HUNGER_MIN_INITIAL);
        
        // Queue-related properties
        this.inQueue = false;
        this.queuedAt = null;
        this.waitStartTime = null;
        this.targetFoodStall = null;
        this.queueSide = null; // 'left' or 'right'
    }
    
    /**
     * Update fan state, including hunger
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     */
    update(deltaTime, simulationSpeed, otherAgents = []) {
        // Update base agent behavior
        super.update(deltaTime, simulationSpeed, otherAgents);
        
        // Increase hunger over time (unless waiting at food stall)
        if (!this.waitStartTime) {
            this.hunger = Math.min(1.0, this.hunger + 
                this.config.HUNGER_INCREASE_RATE * deltaTime * simulationSpeed);
        }
    }
}
