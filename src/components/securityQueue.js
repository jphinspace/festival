/**
 * SecurityQueue class for managing fans entering the festival through security
 * Maintains two queues with processing logic for regular and enhanced security
 */
import { QueueManager } from '../core/queueManager.js'
import { QueuedProcessor } from '../core/queuedProcessor.js'
import { AgentState, FanGoal } from '../utils/enums.js'

export class SecurityQueue extends QueuedProcessor {
    /**
     * Create a new security queue
     * @param {Object} config - Configuration object
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(config, width, height) {
        super(config)
        this.width = width
        this.height = height
        
        // Two queues for the two lines
        this.queues = [[], []]
        
        // Track which fans are currently being processed at the front
        this.processing = [null, null]
        
        // Track when processing started for each queue
        this.processingStartTime = [null, null]
        
        // Track fans moving to the entry point (not yet in queue)
        this.entering = [[], []]
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
     * Get adjusted queue position for entering fans to prevent position 0 when queue is empty
     * @param {number} position - Calculated position
     * @param {number} queueIndex - Index of the queue (0 or 1)
     * @returns {number} Adjusted position
     */
    getAdjustedQueuePosition(position, queueIndex) {
        // For entering fans, ensure they don't get position 0 when queue is empty
        return (this.queues[queueIndex].length === 0 && position === 0) ? 
            Math.max(1, position) : position;
    }

    /**
     * Add a fan to one of the queues (fan chooses closest queue)
     * @param {Fan} fan - Fan to add to queue
     */
    addToQueue(fan) {
        // Fan chooses the queue closest to their current position
        // This is a fan decision, not a queue property
        const leftQueueX = this.width * this.config.QUEUE_LEFT_X;
        const rightQueueX = this.width * this.config.QUEUE_RIGHT_X;
        const distToLeft = Math.abs(fan.x - leftQueueX);
        const distToRight = Math.abs(fan.x - rightQueueX);
        const queueIndex = distToLeft <= distToRight ? 0 : 1;
        
        // Get queue and approaching list for chosen side
        const queue = this.queues[queueIndex];
        const approachingList = this.entering[queueIndex];
        
        // Calculate front position for this queue
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        
        // Determine if enhanced security
        const enhancedSecurity = Math.random() < this.config.ENHANCED_SECURITY_PERCENTAGE;
        
        // Use QueueManager common method to add fan
        // Security queues now use same inQueue behavior as food stalls
        const position = QueueManager.addFanToQueue(fan, {
            queue: queue,
            approachingList: approachingList,
            frontPosition: { x: queueX, y: startY },
            getTargetPosition: (pos) => {
                const adjustedPos = this.getAdjustedQueuePosition(pos, queueIndex);
                return {
                    x: queueX,
                    y: startY + (adjustedPos * spacing)
                };
            },
            fanProperties: {
                queueIndex: queueIndex,
                enhancedSecurity: enhancedSecurity
            },
            obstacles: this.obstacles
            // setInQueue defaults to true - same behavior as food stalls
        });
        
        return position;
    }

    /**
     * Update positions for all fans in a specific queue
     * @param {number} queueIndex - Index of the queue to update (0 or 1)
     * @param {boolean} sortNeeded - Whether to sort the queue (only on join/leave events)
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    updateQueuePositions(queueIndex, sortNeeded = false, simulationTime = 0) {
        // Use shared QueueManager for consistent behavior
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X);
        const startY = this.height * this.config.QUEUE_START_Y;
        const spacing = this.config.QUEUE_SPACING;
        
        // Update using QueueManager - pass obstacles for pathfinding
        QueueManager.updatePositions(
            this.queues[queueIndex],
            this.entering[queueIndex],
            (position) => {
                const adjustedPosition = this.getAdjustedQueuePosition(position, queueIndex);
                return {
                    x: queueX,
                    y: startY + (adjustedPosition * spacing)
                };
            },
            { x: queueX, y: startY },
            this.obstacles,  // Pass obstacles for pathfinding
            sortNeeded,       // Force update when sort is needed (fan joined/left)
            simulationTime
        );
    }
    
    /**
     * Implement abstract method to check if security processing is complete
     * @param {Fan} fan - Fan being processed
     * @param {number} simulationTime - Current simulation time
     * @param {number} processingStartTime - When processing started
     * @returns {Object} {completed: boolean, action: string, data: Object}
     */
    checkProcessingComplete(fan, simulationTime, processingStartTime) {
        const elapsedTime = simulationTime - processingStartTime
        const requiredTime = fan.enhancedSecurity ? 
            this.config.ENHANCED_SECURITY_TIME : 
            this.config.REGULAR_SECURITY_TIME
        
        if (elapsedTime >= requiredTime) {
            if (fan.enhancedSecurity) {
                return {
                    completed: true,
                    action: 'return_to_queue',
                    data: { queueIndex: fan.queueIndex }
                }
            } else {
                return {
                    completed: true,
                    action: 'release',
                    data: {}
                }
            }
        }
        
        return { completed: false, action: null, data: {} }
    }

    /**
     * Process queues - handle fans at the front and those entering
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    update(simulationTime) {
        for (let queueIndex = 0; queueIndex < 2; queueIndex++) {
            const queue = this.queues[queueIndex]
            const entering = this.entering[queueIndex]
            
            // Process fans entering the queue FIRST (before updating positions)
            this.processEntering(queue, entering, (forceUpdate, simTime) => {
                this.updateQueuePositions(queueIndex, forceUpdate, simTime)
            }, simulationTime)
            
            // Update positions for all fans after processing enters
            this.updateQueuePositions(queueIndex, false, simulationTime)
            
            // Check if any returning fans have reached the end of line
            if (this.processing[queueIndex] !== null) {
                const processingFan = this.processing[queueIndex]
                if (processingFan.returningToQueue === queueIndex) {
                    // Calculate current end of line position
                    const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
                    const startY = this.height * this.config.QUEUE_START_Y
                    const spacing = this.config.QUEUE_SPACING
                    const currentEndPosition = queue.length + entering.length
                    const currentEndY = startY + (currentEndPosition * spacing)
                    
                    // Check if line has changed since fan started returning
                    const distToCurrentEnd = Math.sqrt(
                        Math.pow(processingFan.targetX - queueX, 2) +
                        Math.pow(processingFan.targetY - currentEndY, 2)
                    )
                    
                    if (distToCurrentEnd > 10) {
                        // Line has changed, update target to new end
                        processingFan.setTarget(queueX, currentEndY, this.obstacles, simulationTime)
                    } else if (processingFan.isNearTarget(10)) {
                        // Reached end of line, add to entering list
                        delete processingFan.returningToQueue
                        entering.push(processingFan)
                        processingFan.state = 'approaching_queue'
                        processingFan.inQueue = true
                        
                        // Clear processing
                        this.processing[queueIndex] = null
                        this.processingStartTime[queueIndex] = null
                        
                        // Update positions for all fans
                        this.updateQueuePositions(queueIndex, true, simulationTime)
                    }
                }
            }
            
            // If no one is being processed and queue has people, start processing
            const newProcessing = this.processFrontOfQueue(
                queue,
                entering,
                () => {
                    const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
                    const startY = this.height * this.config.QUEUE_START_Y
                    const processingY = startY - this.config.QUEUE_SPACING // One space in front of queue
                    return { x: queueX, y: processingY }
                },
                this.processing[queueIndex],
                simulationTime,
                (fan, simTime) => {
                    // Set processor-specific state
                    this.processing[queueIndex] = fan
                    this.processingStartTime[queueIndex] = simTime
                }
            )
            
            // Update queue positions if we started processing someone
            if (newProcessing !== this.processing[queueIndex]) {
                this.processing[queueIndex] = newProcessing
                if (newProcessing !== null) {
                    this.updateQueuePositions(queueIndex, true, simulationTime)
                }
            }
            
            // If someone is advancing to or being processed, update their state
            if (this.processing[queueIndex] !== null) {
                const fan = this.processing[queueIndex]
                
                // Skip if fan is returning to queue
                if (fan.returningToQueue !== undefined) continue
                
                // Use base class to check for processing transition
                this.checkProcessingTransition(fan)
                
                // Only check processing completion if fan is actually in processing state (not advancing)
                if (fan.state === AgentState.PROCESSING) {
                    const result = this.checkProcessingComplete(fan, simulationTime, this.processingStartTime[queueIndex])
                    
                    if (result.completed) {
                        if (result.action === 'return_to_queue') {
                            // Send to back of the line - fan needs to walk to end
                            fan.enhancedSecurity = false // Only enhanced once
                            fan.goal = FanGoal.SECURITY
                            
                            // Calculate end of line position
                            const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
                            const startY = this.height * this.config.QUEUE_START_Y
                            const spacing = this.config.QUEUE_SPACING
                            const endPosition = queue.length + entering.length
                            const endY = startY + (endPosition * spacing)
                            
                            // Set target first (which might change state to moving)
                            fan.inQueue = false
                            fan.setTarget(queueX, endY, this.obstacles, simulationTime)
                            
                            // Then override state to returning_to_queue
                            fan.state = AgentState.RETURNING_TO_QUEUE
                            fan.returningToQueue = queueIndex
                            
                            // Keep fan in processing until they reach end of line
                            // Don't clear processing here - will be cleared when fan reaches end
                        } else if (result.action === 'release') {
                            // Allow into festival - fan wanders naturally using shared logic
                            fan.goal = FanGoal.EXPLORING_FESTIVAL
                            fan.inQueue = false
                            
                            // Start wandering immediately using shared function
                            fan.startWandering(this.obstacles, simulationTime)
                            
                            // Clear processing
                            this.processing[queueIndex] = null
                            this.processingStartTime[queueIndex] = null
                        }
                    }
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
