/**
 * Fan class - a subclass of Agent representing festival fans/attendees
 * Extends the base Agent class with fan-specific behaviors
 */
import { Agent } from './agent.js';
import { AgentState, StagePreference, FanGoal } from '../utils/enums.js';
import * as AgentUtils from '../utils/agentUtils.js';
import * as StateChecks from '../utils/stateChecks.js';
import * as TimeUtils from '../utils/timeUtils.js';

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
        
        // Initialize hunger to minimum level (deterministic)
        this.hunger = config.HUNGER_MIN_INITIAL;
        
        // Hunger threshold at base level (deterministic, no variance)
        this.hungerThreshold = config.HUNGER_THRESHOLD_BASE;
        
        // Food queue-related properties
        this.inQueue = false;
        this.queuedAt = null;
        this.waitStartTime = null;
        this.targetFoodStall = null;
        this.queueSide = null; // QueueSide.LEFT or QueueSide.RIGHT for food stalls
        
        // Fan goal/intent tracking for debug tooltip
        this.goal = FanGoal.EXPLORING;
        
        // Stage preference - deterministic: all fans prefer LEFT stage
        this.stagePreference = StagePreference.LEFT;
        
        // Show tracking
        this.currentShow = null; // Which stage they're watching
        this.hasSeenShow = false; // Whether they've seen a full show (any stage)
        this.hasEatenFood = false; // Whether they've eaten food
        this.isUpFront = false; // Whether they're in the front cluster at a show
        
        // Spread out behavior
        this.wanderTargetUpdateTime = 0; // Last time wander target was updated
    }
    
    /**
     * Start wandering to a deterministic location (center of space)
     * @param {Obstacles} obstacles - Obstacles manager for static object collision
     */
    startWandering(obstacles) {
        // Pick center position deterministically
        const targetX = (obstacles ? obstacles.width : 800) / 2
        const targetY = (obstacles ? obstacles.height * 0.7 : 400) / 2
        
        // Only set target if we have a valid position
        if (!obstacles || obstacles.isValidPosition(targetX, targetY)) {
            this.setTarget(targetX, targetY, obstacles)
            this.state = AgentState.MOVING
        }
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
        // Hunger now scales with simulation speed for consistent behavior
        if (!this.waitStartTime) {
            const hungerIncrease = AgentUtils.calculateHungerIncrease(
                this.config.HUNGER_INCREASE_RATE, 
                deltaTime, 
                simulationSpeed
            );
            this.hunger = Math.min(1.0, this.hunger + hungerIncrease);
        }
        
        // Spread-out behavior: wander if idle and not watching a show
        // Wander on every sim tick when idle (checked every frame, but wandering happens when reaching previous target)
        if (StateChecks.shouldWander(this.state, this.currentShow, this.inQueue)) {
            // If fan has no target (reached previous wander target), pick a new one
            if (this.targetX === null && this.targetY === null) {
                this.startWandering(obstacles)
            }
        }
    }

    /**
     * Override draw to show different colors based on queue state
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Update color based on state
        if (this.state === AgentState.IN_QUEUE_WAITING || this.state === AgentState.IN_QUEUE_ADVANCING || this.state === AgentState.APPROACHING_QUEUE) {
            this.color = this.config.COLORS.AGENT_IN_QUEUE;
        } else if (this.state === AgentState.BEING_CHECKED || this.state === AgentState.PROCESSING) {
            this.color = this.enhancedSecurity ? 
                this.config.COLORS.AGENT_ENHANCED_SECURITY : 
                this.config.COLORS.AGENT_BEING_CHECKED;
        } else if (this.state === AgentState.LEAVING) {
            this.color = this.config.COLORS.AGENT_LEAVING;
        } else if (this.state === AgentState.MOVING || this.state === AgentState.IDLE) {
            this.color = this.config.COLORS.AGENT_ACTIVE;
        }
        
        super.draw(ctx);
    }
}
