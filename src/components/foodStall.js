/**
 * FoodStall class - represents a food stall where fans can queue
 */
import { QueueManager } from '../core/queueManager.js'
import { QueuedProcessor } from '../core/queuedProcessor.js'
import { AgentState, QueueSide } from '../utils/enums.js'

export class FoodStall extends QueuedProcessor {
    /**
     * Create a new food stall
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Configuration object
     * @param {number} id - Unique identifier for this stall (1, 2, 3, 4)
     */
    constructor(x, y, config, id = 0) {
        super(config)
        this.x = x
        this.y = y
        this.id = id // Unique identifier for this stall
        this.width = 20  // Narrower for vertical orientation
        this.height = 30 // Taller for vertical orientation
        this.leftQueue = []  // Queue on left side
        this.rightQueue = [] // Queue on right side
        this.leftApproaching = []  // Fans approaching left queue
        this.rightApproaching = [] // Fans approaching right queue
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
            },
            obstacles: this.obstacles
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
     * Implement abstract method to check if food processing is complete
     * @param {Fan} fan - Fan being processed
     * @param {number} simulationTime - Current simulation time
     * @param {number} processingStartTime - When processing started (fan.waitStartTime in this case)
     * @returns {Object} {completed: boolean, action: string, data: Object}
     */
    checkProcessingComplete(fan, simulationTime, processingStartTime) {
        // Check if fan has waited long enough
        if (processingStartTime && 
            simulationTime - processingStartTime >= this.config.FOOD_WAIT_TIME) {
            return {
                completed: true,
                action: 'release',
                data: { side: fan.processingSide }
            }
        }
        
        return { completed: false, action: null, data: {} }
    }

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
            // Process fans entering the queue
            this.processEntering(queue, approaching, (forceUpdate, simTime) => {
                this.updateQueuePositions(width, height, forceUpdate)
            }, simulationTime)
            
            // Process the fan at the front of the queue
            this.processFrontOfQueue(
                queue,
                approaching,
                () => {
                    // Calculate processing position (walk up to stall counter)
                    const spacing = 8
                    const processingX = side === 'left' ? 
                        this.x - (spacing * 0.5) :  // Half spacing from stall
                        this.x + this.width + (spacing * 0.5)
                    const processingY = this.y + this.height / 2
                    return { x: processingX, y: processingY }
                },
                null, // No tracking of current processing fan
                simulationTime,
                (fan, simTime) => {
                    // Set processor-specific state
                    fan.waitStartTime = simTime
                    fan.processingAtStall = this // Keep reference to this stall
                    fan.processingSide = side
                    // Update remaining fans' positions
                    this.updateQueuePositions(width, height, true)
                }
            )
        })
        
        // Check for fans currently being processed (not in queue anymore)
        // We need to find them by checking all fans for processingAtStall === this
        // This will be handled in the main simulation loop or we track them separately
    }
    
    /**
     * Check if a fan is done processing and handle their completion
     * @param {Fan} fan - Fan to check
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} simulationTime - Current simulation time
     * @returns {boolean} True if fan was processed
     */
    checkAndProcessFan(fan, width, height, simulationTime) {
        if (fan.processingAtStall !== this) {
            return false
        }
        
        // Use base class to check for processing transition
        this.checkProcessingTransition(fan)
        
        // Only check processing completion if fan is actually in processing state (not advancing)
        if (fan.state === AgentState.PROCESSING) {
            const result = this.checkProcessingComplete(fan, simulationTime, fan.waitStartTime)
            
            if (result.completed && result.action === 'release') {
                // Decrease hunger and complete processing
                fan.hunger = Math.max(0, fan.hunger - this.config.HUNGER_DECREASE_AMOUNT)
                fan.hasEatenFood = true // Mark as having eaten
                
                // Move to the side after eating (using shared wandering logic but with custom position)
                const side = result.data.side
                const moveDistance = 80 + Math.random() * 50 // Move 80-130 pixels to the side
                let targetX, targetY
                
                if (side === 'left') {
                    // If on left queue, move further left
                    targetX = this.x - moveDistance
                    targetY = this.y + (Math.random() - 0.5) * 60
                } else {
                    // If on right queue, move further right
                    targetX = this.x + this.width + moveDistance
                    targetY = this.y + (Math.random() - 0.5) * 60
                }
                
                // Clamp to canvas bounds
                targetX = Math.max(20, Math.min(width - 20, targetX))
                targetY = Math.max(20, Math.min(height * 0.7, targetY))
                
                // Set target and transition directly to moving state
                fan.setTarget(targetX, targetY, this.obstacles)
                fan.state = AgentState.MOVING
                
                // Clean up processing references
                delete fan.processingAtStall
                delete fan.processingSide
                delete fan.waitStartTime
                
                return true
            }
        }
        
        return false
    }

    /**
     * Update all fans in queue with their positions
     * @param {number} width - Canvas width for bounds
     * @param {number} height - Canvas height for bounds
     * @param {boolean} sortNeeded - Whether to sort queues (only on join/leave events)
     * @param {number} simulationTime - Current simulation time in milliseconds
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
            this.obstacles,
            sortNeeded,
            simulationTime
        );
        
        // Update right queue using QueueManager - pass obstacles for pathfinding
        QueueManager.updatePositions(
            this.rightQueue,
            this.rightApproaching,
            (position) => this.getQueueTargetPosition(position, 'right'),
            { x: frontRightX, y: frontY },
            this.obstacles,
            sortNeeded,
            simulationTime
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
