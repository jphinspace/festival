/**
 * FoodStall class - represents a food stall where fans can queue
 */
export class FoodStall {
    /**
     * Create a new food stall
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Configuration object
     */
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.width = 20;  // Narrower for vertical orientation
        this.height = 30; // Taller for vertical orientation
        this.leftQueue = [];  // Queue on left side
        this.rightQueue = []; // Queue on right side
    }

    /**
     * Add a fan to the queue (left or right side, whichever is shorter)
     * @param {Fan} fan - Fan to add to queue
     */
    addToQueue(fan) {
        // Check if already in either queue
        if (this.leftQueue.includes(fan) || this.rightQueue.includes(fan)) {
            return -1;
        }
        
        // Add to whichever queue is shorter
        const queue = this.leftQueue.length <= this.rightQueue.length ? this.leftQueue : this.rightQueue;
        const side = queue === this.leftQueue ? 'left' : 'right';
        
        queue.push(fan);
        fan.inQueue = true;
        fan.queuedAt = Date.now();
        fan.targetFoodStall = this;
        fan.queueSide = side; // Track which side of the stall
        
        return queue.length - 1; // Return position in queue
    }

    /**
     * Remove a fan from the queue
     * @param {Fan} fan - Fan to remove
     */
    removeFromQueue(fan) {
        let index = this.leftQueue.indexOf(fan);
        if (index !== -1) {
            this.leftQueue.splice(index, 1);
        } else {
            index = this.rightQueue.indexOf(fan);
            if (index !== -1) {
                this.rightQueue.splice(index, 1);
            }
        }
        
        if (index !== -1) {
            fan.inQueue = false;
            fan.queuedAt = null;
            fan.waitStartTime = null;
            fan.targetFoodStall = null;
            fan.queueSide = null;
        }
    }

    /**
     * Get the position of a fan in the queue
     * @param {Fan} fan - Fan to check
     * @returns {number} Position in queue (-1 if not in queue)
     */
    getQueuePosition(fan) {
        let index = this.leftQueue.indexOf(fan);
        if (index !== -1) return index;
        
        index = this.rightQueue.indexOf(fan);
        return index;
    }

    /**
     * Get the target position for a fan in the queue
     * @param {number} position - Position in queue
     * @param {string} side - 'left' or 'right'
     * @returns {Object} {x, y} coordinates
     */
    getQueueTargetPosition(position, side) {
        // Queues form horizontally to the left and right of the stall
        const spacing = 8;
        if (side === 'left') {
            return {
                x: this.x - spacing * (position + 1),
                y: this.y + this.height / 2
            };
        } else {
            return {
                x: this.x + this.width + spacing * (position + 1),
                y: this.y + this.height / 2
            };
        }
    }

    /**
     * Check if fan is at front of queue
     * @param {Fan} fan - Fan to check
     * @returns {boolean}
     */
    isAtFront(fan) {
        return this.leftQueue[0] === fan || this.rightQueue[0] === fan;
    }

    /**
     * Process the queue, moving fans forward
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    processQueue(width, height) {
        // Process both left and right queues
        [this.leftQueue, this.rightQueue].forEach(queue => {
            if (queue.length > 0) {
                const frontFan = queue[0];
                
                // Check if fan has reached the front position
                if (frontFan.isNearTarget(5)) {
                    // Start waiting if not already
                    if (!frontFan.waitStartTime) {
                        frontFan.waitStartTime = Date.now();
                        frontFan.state = 'idle';
                    }
                    
                    // Check if wait time is complete
                    if (Date.now() - frontFan.waitStartTime >= this.config.FOOD_WAIT_TIME) {
                        // Decrease hunger and remove from queue
                        frontFan.hunger = Math.max(0, frontFan.hunger - this.config.HUNGER_DECREASE_AMOUNT);
                        this.removeFromQueue(frontFan);
                        
                        // Move to a random position after eating
                        const targetX = Math.random() * width;
                        const targetY = Math.random() * height * 0.7;
                        frontFan.setTarget(targetX, targetY);
                    }
                }
            }
        });
    }

    /**
     * Update all fans in queue with their positions
     * @param {number} width - Canvas width for bounds
     * @param {number} height - Canvas height for bounds
     */
    updateQueuePositions(width, height) {
        // Update left queue
        this.leftQueue.forEach((fan, index) => {
            const targetPos = this.getQueueTargetPosition(index, 'left');
            
            // Only update target if fan isn't at front or hasn't started waiting
            if (index > 0 || !fan.waitStartTime) {
                if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                    Math.abs(fan.targetY - targetPos.y) > 5) {
                    fan.setTarget(targetPos.x, targetPos.y);
                }
                // Ensure fans in queue have proper state
                if (fan.state !== 'in_queue') {
                    fan.state = 'in_queue';
                }
            }
        });
        
        // Update right queue
        this.rightQueue.forEach((fan, index) => {
            const targetPos = this.getQueueTargetPosition(index, 'right');
            
            // Only update target if fan isn't at front or hasn't started waiting
            if (index > 0 || !fan.waitStartTime) {
                if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                    Math.abs(fan.targetY - targetPos.y) > 5) {
                    fan.setTarget(targetPos.x, targetPos.y);
                }
                // Ensure fans in queue have proper state
                if (fan.state !== 'in_queue') {
                    fan.state = 'in_queue';
                }
            }
        });
    }

    /**
     * Draw the food stall
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        ctx.fillStyle = this.config.COLORS.FOOD_STALL;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = this.config.COLORS.TEXT;
        ctx.font = '10px Arial';
        ctx.fillText('FOOD', this.x + 1, this.y + 18);
    }
}
