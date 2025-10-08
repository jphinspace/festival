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
        this.width = 30;
        this.height = 20;
        this.queue = []; // Array of fans in queue
    }

    /**
     * Add a fan to the queue
     * @param {Fan} fan - Fan to add to queue
     */
    addToQueue(fan) {
        if (!this.queue.includes(fan)) {
            this.queue.push(fan);
            fan.inQueue = true;
            fan.queuedAt = Date.now();
            fan.targetFoodStall = this;
            return this.queue.length - 1; // Return position in queue
        }
        return -1;
    }

    /**
     * Remove a fan from the queue
     * @param {Fan} fan - Fan to remove
     */
    removeFromQueue(fan) {
        const index = this.queue.indexOf(fan);
        if (index !== -1) {
            this.queue.splice(index, 1);
            fan.inQueue = false;
            fan.queuedAt = null;
            fan.waitStartTime = null;
            fan.targetFoodStall = null;
        }
    }

    /**
     * Get the position of a fan in the queue
     * @param {Fan} fan - Fan to check
     * @returns {number} Position in queue (-1 if not in queue)
     */
    getQueuePosition(fan) {
        return this.queue.indexOf(fan);
    }

    /**
     * Get the target position for a fan in the queue
     * @param {number} position - Position in queue
     * @returns {Object} {x, y} coordinates
     */
    getQueueTargetPosition(position) {
        // Queue forms horizontally to the right of the stall
        const spacing = 8;
        return {
            x: this.x + this.width + spacing * (position + 1),
            y: this.y + this.height / 2
        };
    }

    /**
     * Check if fan is at front of queue
     * @param {Fan} fan - Fan to check
     * @returns {boolean}
     */
    isAtFront(fan) {
        return this.queue[0] === fan;
    }

    /**
     * Process the queue, moving fans forward
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    processQueue(width, height) {
        // The front fan waits for FOOD_WAIT_TIME, then leaves
        if (this.queue.length > 0) {
            const frontFan = this.queue[0];
            
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
    }

    /**
     * Update all fans in queue with their positions
     * @param {number} width - Canvas width for bounds
     * @param {number} height - Canvas height for bounds
     */
    updateQueuePositions(width, height) {
        this.queue.forEach((fan, index) => {
            const targetPos = this.getQueueTargetPosition(index);
            
            // Only update target if fan isn't at front or hasn't started waiting
            if (index > 0 || !fan.waitStartTime) {
                if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                    Math.abs(fan.targetY - targetPos.y) > 5) {
                    fan.setTarget(targetPos.x, targetPos.y);
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
        ctx.fillText('FOOD', this.x + 4, this.y + 13);
    }
}
