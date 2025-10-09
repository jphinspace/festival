/**
 * SecurityQueue class for managing fans entering the festival through security
 * Maintains two queues with processing logic for regular and enhanced security
 */
export class SecurityQueue {
    /**
     * Create a new security queue
     * @param {Object} config - Configuration object
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(config, width, height) {
        this.config = config;
        this.width = width;
        this.height = height;
        
        // Two queues for the two lines
        this.queues = [[], []];
        
        // Track which fans are currently being processed at the front
        this.processing = [null, null];
        
        // Track when processing started for each queue
        this.processingStartTime = [null, null];
        
        // Track fans moving to the entry point (not yet in queue)
        this.entering = [[], []];
    }

    /**
     * Update dimensions when canvas resizes
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Add a fan to one of the queues (choose shorter queue)
     * @param {Fan} fan - Fan to add to queue
     */
    addToQueue(fan) {
        // Choose the shorter queue (including those entering)
        const totalLeft = this.queues[0].length + this.entering[0].length;
        const totalRight = this.queues[1].length + this.entering[1].length;
        const queueIndex = totalLeft <= totalRight ? 0 : 1;
        
        // Mark fan as entering and determine if enhanced security
        fan.queueIndex = queueIndex;
        fan.enhancedSecurity = Math.random() < this.config.ENHANCED_SECURITY_PERCENTAGE;
        
        // Add to entering list first
        this.entering[queueIndex].push(fan);
        
        // Send fan to entry point at the BACK of the current queue (not a fixed point)
        // This prevents fans from reserving spots
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        const position = this.queues[queueIndex].length + this.entering[queueIndex].length - 1;
        const entryY = startY + (position * spacing);
        fan.setTarget(queueX, entryY);
        fan.state = 'approaching_queue';
    }

    /**
     * Update positions for all fans in a specific queue
     * @param {number} queueIndex - Index of the queue to update (0 or 1)
     */
    updateQueuePositions(queueIndex) {
        const queue = this.queues[queueIndex];
        const entering = this.entering[queueIndex];
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        
        // Update fans in the actual queue
        queue.forEach((fan, index) => {
            const targetY = startY + (index * spacing); // Queue extends downward from front
            fan.setTarget(queueX, targetY);
            fan.queuePosition = index;
            // All fans in queue should have in_queue state (unless being checked)
            if (fan.state !== 'being_checked') {
                fan.state = 'in_queue';
            }
        });
        
        // Update fans approaching/entering the queue - they should target the end of current queue
        entering.forEach((fan, index) => {
            const position = queue.length + index;
            const targetY = startY + (position * spacing);
            fan.setTarget(queueX, targetY);
            fan.queuePosition = position;
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });
    }

    /**
     * Process queues - handle fans at the front and those entering
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    update(simulationTime) {
        for (let queueIndex = 0; queueIndex < 2; queueIndex++) {
            const queue = this.queues[queueIndex];
            const entering = this.entering[queueIndex];
            
            // Process fans entering the queue
            for (let i = entering.length - 1; i >= 0; i--) {
                const fan = entering[i];
                // Check if fan has reached the entry point
                if (fan.isNearTarget(5)) {
                    // Move from entering to actual queue
                    entering.splice(i, 1);
                    queue.push(fan);
                    fan.state = 'in_queue';
                    // Update all queue positions
                    this.updateQueuePositions(queueIndex);
                }
            }
            
            // If no one is being processed and queue has people, start processing
            if (this.processing[queueIndex] === null && queue.length > 0) {
                const fan = queue[0];
                
                // Check if fan has reached the front of the queue
                if (fan.isNearTarget(5)) {
                    this.processing[queueIndex] = fan;
                    this.processingStartTime[queueIndex] = simulationTime;
                    fan.state = 'being_checked';
                }
            }
            
            // If someone is being processed, check if their time is up
            if (this.processing[queueIndex] !== null) {
                const fan = this.processing[queueIndex];
                const elapsedTime = simulationTime - this.processingStartTime[queueIndex];
                const requiredTime = fan.enhancedSecurity ? 
                    this.config.ENHANCED_SECURITY_TIME : 
                    this.config.REGULAR_SECURITY_TIME;
                
                if (elapsedTime >= requiredTime) {
                    // Remove from front of queue
                    queue.shift();
                    
                    if (fan.enhancedSecurity) {
                        // Send to back of the line - add to entering list
                        fan.enhancedSecurity = false; // Only enhanced once
                        entering.push(fan);
                        
                        // Send to end of current queue (not a fixed position)
                        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
                        const startY = this.height * this.config.QUEUE_START_Y;
                        const spacing = this.config.QUEUE_SPACING;
                        const position = queue.length + entering.length - 1;
                        const entryY = startY + (position * spacing);
                        fan.setTarget(queueX, entryY);
                        fan.state = 'approaching_queue';
                    } else {
                        // Allow into festival
                        const targetX = Math.random() * this.width;
                        const targetY = Math.random() * this.height * 0.7;
                        fan.setTarget(targetX, targetY);
                        fan.state = 'passed_security'; // Set state after setTarget
                    }
                    
                    // Clear processing
                    this.processing[queueIndex] = null;
                    this.processingStartTime[queueIndex] = null;
                    
                    // Update positions for remaining fans
                    this.updateQueuePositions(queueIndex);
                }
            }
        }
    }

    /**
     * Get total count of fans in both queues (including those entering)
     * @returns {number} Total number of fans in queues
     */
    getTotalCount() {
        return this.queues[0].length + this.queues[1].length + 
               this.entering[0].length + this.entering[1].length;
    }

    /**
     * Get all fans currently in queues (including those entering)
     * @returns {Fan[]} Array of all fans in queues
     */
    getAllFans() {
        return [...this.queues[0], ...this.queues[1], ...this.entering[0], ...this.entering[1]];
    }
}
