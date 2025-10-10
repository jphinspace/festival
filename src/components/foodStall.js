/**
 * FoodStall class - represents a food stall where fans can queue
 */
import { QueueManager } from '../core/queueManager.js';

export class FoodStall {
    /**
     * Create a new food stall
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Configuration object
     * @param {number} id - Unique identifier for this stall (1, 2, 3, 4)
     */
    constructor(x, y, config, id = 0) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.id = id; // Unique identifier for this stall
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
        
        // Get queue and approaching list for chosen side
        const queue = side === 'left' ? this.leftQueue : this.rightQueue;
        const approachingList = side === 'left' ? this.leftApproaching : this.rightApproaching;
        
        // Calculate front position for this side
        const spacing = 8;
        const frontY = this.y + this.height / 2;
        const frontX = side === 'left' ? this.x - spacing : this.x + this.width + spacing;
        
        // Use QueueManager common method to add fan
        const position = QueueManager.addFanToQueue(fan, {
            queue: queue,
            approachingList: approachingList,
            frontPosition: { x: frontX, y: frontY },
            getTargetPosition: (pos) => this.getQueueTargetPosition(pos, side),
            fanProperties: {
                queuedAt: null, // Not used for timing anymore
                targetFoodStall: this,
                queueSide: side
            }
        });
        
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
    /**
     * Process queue - handle fans at front and those entering
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} simulationTime - Current simulation time
     */
    processQueue(width, height, simulationTime) {
        // Update positions every frame for responsive movement
        this.updateQueuePositions(width, height, false);
        
        // Use QueueManager to process both queues
        [
            { queue: this.leftQueue, approaching: this.leftApproaching, side: 'left' },
            { queue: this.rightQueue, approaching: this.rightApproaching, side: 'right' }
        ].forEach(({ queue, approaching, side }) => {
            // Use QueueManager to handle approaching->queue transitions
            QueueManager.processApproaching(
                queue,
                approaching,
                () => this.updateQueuePositions(width, height, true),
                10  // Threshold
            );
            
            // Process the fan at the front of the queue
            if (queue.length > 0) {
                const frontFan = queue[0];
                
                // Check if fan has reached the front position
                if (frontFan.isNearTarget(5)) {
                    // Start waiting if not already
                    if (!frontFan.waitStartTime) {
                        frontFan.waitStartTime = simulationTime;
                        // Keep state as 'in_queue' NOT 'idle' - idle state breaks queue processing
                        frontFan.state = 'in_queue';
                    }
                    
                    // Check if wait time is complete
                    if (simulationTime - frontFan.waitStartTime >= this.config.FOOD_WAIT_TIME) {
                        // Decrease hunger and remove from queue
                        frontFan.hunger = Math.max(0, frontFan.hunger - this.config.HUNGER_DECREASE_AMOUNT);
                        frontFan.hasEatenFood = true; // Mark as having eaten
                        this.removeFromQueue(frontFan);
                        
                        // Move to the side after eating (perpendicular to stall)
                        // Determine which side based on queue side
                        const moveDistance = 50 + Math.random() * 30; // Move 50-80 pixels to the side
                        let targetX, targetY;
                        
                        if (side === 'left') {
                            // If on left queue, move further left
                            targetX = this.x - moveDistance;
                            targetY = this.y + (Math.random() - 0.5) * 40; // Some vertical randomness
                        } else {
                            // If on right queue, move further right
                            targetX = this.x + this.width + moveDistance;
                            targetY = this.y + (Math.random() - 0.5) * 40; // Some vertical randomness
                        }
                        
                        // Clamp to canvas bounds
                        targetX = Math.max(20, Math.min(width - 20, targetX));
                        targetY = Math.max(20, Math.min(height * 0.7, targetY));
                        
                        frontFan.setTarget(targetX, targetY);
                        frontFan.state = 'moving'; // Set state to moving so they leave
                    }
                }
            }
        });
    }

    /**
     * Update all fans in queue with their positions
     * @param {number} width - Canvas width for bounds
     * @param {number} height - Canvas height for bounds
     * @param {boolean} sortNeeded - Whether to sort queues (only on join/leave events)
     */
    updateQueuePositions(width, height, sortNeeded = false) {
        // Use shared QueueManager for consistent behavior
        // The "front" position should match where position 0 fans actually stand
        const spacing = 8;
        const frontY = this.y + this.height / 2;
        
        // For left queue, position 0 is at: this.x - spacing * 1
        const frontLeftX = this.x - spacing;
        
        // For right queue, position 0 is at: this.x + this.width + spacing * 1
        const frontRightX = this.x + this.width + spacing;
        
        // Update left queue using QueueManager - pass obstacles for pathfinding
        QueueManager.updatePositions(
            this.leftQueue,
            this.leftApproaching,
            (position) => this.getQueueTargetPosition(position, 'left'),
            { x: frontLeftX, y: frontY },
            this.obstacles,  // Pass obstacles for pathfinding
            true  // Use proximity lock for food stalls
        );
        
        // Update right queue using QueueManager - pass obstacles for pathfinding
        QueueManager.updatePositions(
            this.rightQueue,
            this.rightApproaching,
            (position) => this.getQueueTargetPosition(position, 'right'),
            { x: frontRightX, y: frontY },
            this.obstacles,  // Pass obstacles for pathfinding
            true  // Use proximity lock for food stalls
        );
    }
    
    /**
     * Set obstacles reference for pathfinding
     * @param {Obstacles} obstacles - Obstacles manager
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
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
