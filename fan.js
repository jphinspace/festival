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
        this.queueIndex = null; // Which queue (0 or 1) the fan is in
        this.queuePosition = null; // Position in the queue
        this.enhancedSecurity = false; // Whether this fan needs enhanced security
    }

    /**
     * Override draw to show different colors based on queue state
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Update color based on state
        if (this.state === 'in_queue') {
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
