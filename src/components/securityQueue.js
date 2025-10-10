/**
 * SecurityQueue class for managing fans entering the festival through security
 * Maintains two queues with processing logic for regular and enhanced security
 */
import { QueueManager } from '../core/queueManager.js';

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
        fan.inQueue = false; // Not in actual queue yet (consistent with food queues)
        
        // Add to entering list first
        this.entering[queueIndex].push(fan);
        
        // CRITICAL FIX: Two-stage movement to prevent diagonal lines
        // Stage 1: Move straight UP to the queue level (Y position) while maintaining current X
        // Stage 2: Once at queue level, move laterally to the queue X position
        // This creates vertical movement first, then lateral, instead of diagonal
        
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        const position = this.queues[queueIndex].length + this.entering[queueIndex].length - 1;
        
        // Check if fan is below the queue level
        if (fan.y > startY + 20) {
            // Stage 1: Move straight up to queue level at current X position
            // Go to a position slightly past the back of the queue
            const entryY = startY + (position * spacing) + spacing;
            fan.setTarget(fan.x, entryY); // Use fan's current X, not queue X
            fan.securityStage = 'moving_to_queue_level';
        } else {
            // Fan is already at queue level, move directly to queue X position
            const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
            const entryY = startY + (position * spacing);
            fan.setTarget(queueX, entryY);
            fan.securityStage = 'approaching_queue';
        }
        
        fan.state = 'approaching_queue';
    }

    /**
     * Update positions for all fans in a specific queue
     * @param {number} queueIndex - Index of the queue to update (0 or 1)
     * @param {boolean} sortNeeded - Whether to sort the queue (only on join/leave events)
     */
    updateQueuePositions(queueIndex, sortNeeded = false) {
        const queue = this.queues[queueIndex];
        const entering = this.entering[queueIndex];
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        
        // Only sort when needed (someone joined/left), not every frame
        if (sortNeeded) {
            // Sort queue by Y position - fans closer to front (lower Y) go first
            queue.sort((a, b) => a.y - b.y);
            
            // Sort entering by distance to target
            entering.sort((a, b) => {
                const distA = Math.abs(a.y - a.targetY);
                const distB = Math.abs(b.y - b.targetY);
                return distA - distB;
            });
        }
        
        // Update fans in the actual queue
        queue.forEach((fan, index) => {
            const targetY = startY + (index * spacing);
            // Only update if changed significantly (avoid jitter)
            if (Math.abs(fan.targetX - queueX) > 1 || Math.abs(fan.targetY - targetY) > 1) {
                fan.setTarget(queueX, targetY);
            }
            fan.inQueue = true;
            if (fan.state !== 'being_checked') {
                fan.state = 'in_queue';
            }
        });
        
        // Update fans approaching/entering the queue
        entering.forEach((fan, index) => {
            const position = queue.length + index;
            const adjustedPosition = (queue.length === 0 && index === 0) ? Math.max(1, position) : position;
            const targetY = startY + (adjustedPosition * spacing);
            
            // Only update if changed significantly
            if (Math.abs(fan.targetX - queueX) > 1 || Math.abs(fan.targetY - targetY) > 1) {
                fan.setTarget(queueX, targetY);
            }
            fan.inQueue = false;
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
                
                // Handle two-stage movement for fans approaching from below
                if (fan.securityStage === 'moving_to_queue_level') {
                    // Check if fan has reached the queue level (Y position)
                    if (fan.isNearTarget(8)) {
                        // Stage 1 complete, now move laterally to queue X position
                        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
                        const startY = this.height * this.config.QUEUE_START_Y;
                        const spacing = this.config.QUEUE_SPACING;
                        const position = queue.length + entering.indexOf(fan);
                        const entryY = startY + (position * spacing);
                        fan.setTarget(queueX, entryY);
                        fan.securityStage = 'approaching_queue';
                    }
                } else {
                    // Check if fan has reached the entry point
                    if (fan.isNearTarget(5)) {
                        // Move from entering to actual queue
                        entering.splice(i, 1);
                        queue.push(fan);
                        fan.state = 'in_queue';
                        fan.inQueue = true; // Now in actual queue
                        fan.securityStage = null; // Clear stage
                        // Update all queue positions and sort since someone joined
                        this.updateQueuePositions(queueIndex, true);
                    }
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
                        fan.inQueue = false; // Not in actual queue yet
                    } else {
                        // Allow into festival - move straight ahead (up towards festival)
                        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
                        const targetY = this.height * 0.3; // Move to festival area (30% down from top)
                        fan.setTarget(queueX, targetY);
                        fan.state = 'passed_security'; // Set state after setTarget
                        fan.inQueue = false; // Clear queue status
                    }
                    
                    // Clear processing
                    this.processing[queueIndex] = null;
                    this.processingStartTime[queueIndex] = null;
                    
                    // Update positions for remaining fans and sort since someone left
                    this.updateQueuePositions(queueIndex, true);
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
