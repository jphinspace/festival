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
    }

    // Fans inherit all base Agent functionality
    // Future fan-specific behaviors can be added here
}
