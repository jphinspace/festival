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
        
        // Security queue properties
        this.queueIndex = null; // Which security queue (0 or 1) the fan is in
        this.queuePosition = null; // Position in the security queue
        this.enhancedSecurity = false; // Whether this fan needs enhanced security
        
        // Initialize hunger to a random level
        this.hunger = config.HUNGER_MIN_INITIAL + 
            Math.random() * (config.HUNGER_MAX_INITIAL - config.HUNGER_MIN_INITIAL);
        
        // Randomized hunger threshold (±10% variance)
        this.hungerThreshold = config.HUNGER_THRESHOLD_BASE + 
            (Math.random() - 0.5) * 2 * config.HUNGER_THRESHOLD_VARIANCE;
        
        // Food queue-related properties
        this.inQueue = false;
        this.queuedAt = null;
        this.waitStartTime = null;
        this.targetFoodStall = null;
        this.queueSide = null; // 'left' or 'right' for food stalls
        
        // Stage preference: 'left', 'right', or 'none'
        const rand = Math.random();
        if (rand < 0.4) {
            this.stagePreference = 'left';
        } else if (rand < 0.8) {
            this.stagePreference = 'right';
        } else {
            this.stagePreference = 'none'; // No preference, watches both
        }
        
        // Show tracking
        this.currentShow = null; // Which stage they're watching
        this.hasSeenShow = false; // Whether they've seen a full show (any stage)
        this.hasEatenFood = false; // Whether they've eaten food
        this.isUpFront = false; // Whether they're in the front cluster at a show
        
        // Spread out behavior
        this.wanderTargetUpdateTime = 0; // Last time wander target was updated
    }
    
    /**
     * Update fan state, including hunger
     * @param {number} deltaTime - Time since last frame in seconds
     * @param {number} simulationSpeed - Speed multiplier for simulation
     * @param {Agent[]} otherAgents - Array of other agents for collision detection
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     */
    update(deltaTime, simulationSpeed, otherAgents = [], obstacles = null) {
        // Update base agent behavior
        super.update(deltaTime, simulationSpeed, otherAgents, obstacles);
        
        // Increase hunger over time (unless waiting at food stall)
        // Note: Hunger increases at the same rate regardless of simulation speed
        // because we want the perceived experience to remain consistent
        if (!this.waitStartTime) {
            this.hunger = Math.min(1.0, this.hunger + 
                this.config.HUNGER_INCREASE_RATE * deltaTime);
        }
        
        // Spread-out behavior: wander if idle and not watching a show
        if (this.state === 'idle' && !this.currentShow && !this.inQueue && this.state !== 'leaving') {
            const now = Date.now();
            // Update wander target every 5-10 seconds
            if (now - this.wanderTargetUpdateTime > 5000 + Math.random() * 5000) {
                this.wanderTargetUpdateTime = now;
                // Pick a random position to wander to (spread out)
                const targetX = Math.random() * (obstacles ? obstacles.width : 800);
                const targetY = Math.random() * (obstacles ? obstacles.height * 0.7 : 400);
                this.setTarget(targetX, targetY);
            }
        }
    }

    /**
     * Override draw to show different colors based on queue state
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Update color based on state
        if (this.state === 'in_queue' || this.state === 'approaching_queue') {
            this.color = this.config.COLORS.AGENT_IN_QUEUE;
        } else if (this.state === 'being_checked') {
            this.color = this.enhancedSecurity ? 
                this.config.COLORS.AGENT_ENHANCED_SECURITY : 
                this.config.COLORS.AGENT_BEING_CHECKED;
        } else if (this.state === 'leaving') {
            this.color = this.config.COLORS.AGENT_LEAVING;
        } else if (this.state === 'moving' || this.state === 'passed_security') {
            this.color = this.config.COLORS.AGENT_ACTIVE;
        }
        
        super.draw(ctx);
    }
}
