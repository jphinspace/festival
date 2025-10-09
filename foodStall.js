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
        this.leftApproaching = [];  // Fans approaching left queue
        this.rightApproaching = []; // Fans approaching right queue
    }

    /**
     * Add a fan to the queue (left or right side, whichever is shorter)
     * @param {Fan} fan - Fan to add to queue
     */
    addToQueue(fan) {
        // Check if already in either queue or approaching
        if (this.leftQueue.includes(fan) || this.rightQueue.includes(fan) ||
            this.leftApproaching.includes(fan) || this.rightApproaching.includes(fan)) {
            return -1;
        }
        
        // Choose side based on total count (queue + approaching)
        const leftTotal = this.leftQueue.length + this.leftApproaching.length;
        const rightTotal = this.rightQueue.length + this.rightApproaching.length;
        const side = leftTotal <= rightTotal ? 'left' : 'right';
        
        // Add to approaching list first
        const approachingList = side === 'left' ? this.leftApproaching : this.rightApproaching;
        approachingList.push(fan);
        
        fan.inQueue = true; // Mark as in queue process
        fan.queuedAt = null; // Not used for timing anymore
        fan.targetFoodStall = this;
        fan.queueSide = side; // Track which side of the stall
        
        // Set target to END of current queue (not reserving a spot)
        const queue = side === 'left' ? this.leftQueue : this.rightQueue;
        const position = queue.length + approachingList.length - 1;
        const targetPos = this.getQueueTargetPosition(position, side);
        fan.setTarget(targetPos.x, targetPos.y);
        fan.state = 'approaching_queue';
        
        return position;
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
            } else {
                // Check approaching lists
                index = this.leftApproaching.indexOf(fan);
                if (index !== -1) {
                    this.leftApproaching.splice(index, 1);
                } else {
                    index = this.rightApproaching.indexOf(fan);
                    if (index !== -1) {
                        this.rightApproaching.splice(index, 1);
                    }
                }
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
        
        // Check left approaching - they are after the actual queue
        index = this.leftApproaching.indexOf(fan);
        if (index !== -1) return this.leftQueue.length + index;
        
        index = this.rightQueue.indexOf(fan);
        if (index !== -1) return index;
        
        // Check right approaching - they are after the actual queue
        index = this.rightApproaching.indexOf(fan);
        if (index !== -1) return this.rightQueue.length + index;
        
        return -1;
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
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    processQueue(width, height, simulationTime) {
        // First, process fans approaching each queue
        [
            { queue: this.leftQueue, approaching: this.leftApproaching, side: 'left' },
            { queue: this.rightQueue, approaching: this.rightApproaching, side: 'right' }
        ].forEach(({ queue, approaching, side }) => {
            // Move fans from approaching to queue when they reach their position
            for (let i = approaching.length - 1; i >= 0; i--) {
                const fan = approaching[i];
                if (fan.isNearTarget(5)) {
                    // Fan has reached their position, move to actual queue
                    approaching.splice(i, 1);
                    queue.push(fan);
                    fan.state = 'in_queue';
                    // Update all queue positions since someone joined
                    this.updateQueuePositions(width, height);
                }
            }
            
            // Process the fan at the front of the queue
            if (queue.length > 0) {
                const frontFan = queue[0];
                
                // Check if fan has reached the front position
                if (frontFan.isNearTarget(5)) {
                    // Start waiting if not already
                    if (!frontFan.waitStartTime) {
                        frontFan.waitStartTime = simulationTime;
                        frontFan.state = 'idle';
                    }
                    
                    // Check if wait time is complete
                    if (simulationTime - frontFan.waitStartTime >= this.config.FOOD_WAIT_TIME) {
                        // Decrease hunger and remove from queue
                        frontFan.hunger = Math.max(0, frontFan.hunger - this.config.HUNGER_DECREASE_AMOUNT);
                        frontFan.hasEatenFood = true; // Mark as having eaten
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
        // Update left approaching fans - they go to the end of the current queue
        this.leftApproaching.forEach((fan, approachIndex) => {
            const position = this.leftQueue.length + approachIndex;
            const targetPos = this.getQueueTargetPosition(position, 'left');
            if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                Math.abs(fan.targetY - targetPos.y) > 5) {
                fan.setTarget(targetPos.x, targetPos.y);
            }
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });
        
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
        
        // Update right approaching fans - they go to the end of the current queue
        this.rightApproaching.forEach((fan, approachIndex) => {
            const position = this.rightQueue.length + approachIndex;
            const targetPos = this.getQueueTargetPosition(position, 'right');
            if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                Math.abs(fan.targetY - targetPos.y) > 5) {
                fan.setTarget(targetPos.x, targetPos.y);
            }
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
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
