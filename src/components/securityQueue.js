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
     * @param {number} simulationTime - Current simulation time for timestamp tracking
     */
    addToQueue(fan, simulationTime = null) {
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
        
        // No enhanced security (deterministic - all fans get regular security)
        const enhancedSecurity = false;
        
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
            obstacles: this.obstacles,
            simulationTime: simulationTime
            // setInQueue defaults to true - same behavior as food stalls
        });
        
        return position;
    }

    /**
     * Update positions for all fans in a specific queue
     * @param {number} queueIndex - Index of the queue to update (0 or 1)
     * @param {boolean} sortNeeded - Whether to sort the queue (only on join/leave events)
     */
    updateQueuePositions(queueIndex, sortNeeded = false) {
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
            sortNeeded       // Force update when sort is needed (fan joined/left)
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
     * Calculate the end-of-line position for a queue
     * @param {number} queueIndex - Index of the queue (0 or 1)
     * @returns {{x: number, y: number}} Position at end of line
     */
    _calculateEndOfLinePosition(queueIndex) {
        const queue = this.queues[queueIndex]
        const entering = this.entering[queueIndex]
        const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
        const startY = this.height * this.config.QUEUE_START_Y
        const spacing = this.config.QUEUE_SPACING
        const endPosition = queue.length + entering.length
        const endY = startY + (endPosition * spacing)
        return { x: queueX, y: endY }
    }

    /**
     * Check if fan should update target to new end position
     * @param {Fan} processingFan - Fan being processed
     * @param {Object} endPos - End position {x, y}
     * @returns {boolean} True if target should be updated
     */
    shouldUpdateToNewEnd(processingFan, endPos) {
        const distToCurrentEnd = Math.sqrt(
            Math.pow(processingFan.targetX - endPos.x, 2) +
            Math.pow(processingFan.targetY - endPos.y, 2)
        )
        return distToCurrentEnd > 10
    }

    /**
     * Check if fan should be released to festival
     * @param {Object} result - Result from checkProcessingComplete
     * @returns {boolean} True if fan should be released
     */
    shouldReleaseToFestival(result) {
        return result.action === 'release'
    }

    /**
     * Check if fan should return to back of queue
     * @param {Object} result - Result from checkProcessingComplete
     * @returns {boolean} True if fan should return to queue
     */
    shouldReturnToQueue(result) {
        return result.action === 'return_to_queue'
    }

    /**
     * Handle a fan returning to the back of the queue after enhanced security
     * @param {number} queueIndex - Index of the queue
     * @param {Fan} processingFan - The fan returning to queue
     * @param {number} simulationTime - Current simulation time
     */
    _handleReturningFan(queueIndex, processingFan, simulationTime) {
        const endPos = this._calculateEndOfLinePosition(queueIndex)
        
        // Check if line has changed since fan started returning
        if (this.shouldUpdateToNewEnd(processingFan, endPos)) {
            // Line has changed, update target to new end
            processingFan.setTarget(endPos.x, endPos.y, this.obstacles)
        } else if (this.isNearEndOfQueue(processingFan, 10)) {
            // Reached end of line, add to entering list
            delete processingFan.returningToQueue
            this.entering[queueIndex].push(processingFan)
            processingFan.state = AgentState.APPROACHING_QUEUE
            processingFan.inQueue = true
            
            // Clear processing
            this.processing[queueIndex] = null
            this.processingStartTime[queueIndex] = null
            
            // Update positions for all fans
            this.updateQueuePositions(queueIndex, true)
        }
    }

    /**
     * Send a fan to the back of the queue after enhanced security check
     * @param {number} queueIndex - Index of the queue
     * @param {Fan} fan - The fan to send back
     * @param {number} simulationTime - Current simulation time
     */
    _sendFanToBackOfQueue(queueIndex, fan, simulationTime) {
        fan.enhancedSecurity = false // Only enhanced once
        fan.goal = FanGoal.SECURITY
        
        const endPos = this._calculateEndOfLinePosition(queueIndex)
        
        // Set target first (which might change state to moving)
        fan.inQueue = false
        fan.setTarget(endPos.x, endPos.y, this.obstacles)
        
        // Then override state to returning_to_queue
        fan.state = AgentState.RETURNING_TO_QUEUE
        fan.returningToQueue = queueIndex
        
        // Keep fan in processing until they reach end of line
        // Don't clear processing here - will be cleared when fan reaches end
    }

    /**
     * Release a fan into the festival after passing security
     * @param {number} queueIndex - Index of the queue
     * @param {Fan} fan - The fan to release
     * @param {number} simulationTime - Current simulation time
     */
    _releaseFanIntoFestival(queueIndex, fan, simulationTime) {
        fan.goal = FanGoal.EXPLORING_FESTIVAL
        fan.inQueue = false
        
        // Start wandering immediately using shared function
        fan.startWandering(this.obstacles)
        
        // Clear processing
        this.processing[queueIndex] = null
        this.processingStartTime[queueIndex] = null
    }

    /**
     * Process a fan who has completed security checking
     * @param {number} queueIndex - Index of the queue
     * @param {Fan} fan - The fan being processed
     * @param {number} simulationTime - Current simulation time
     */
    _handleCompletedProcessing(queueIndex, fan, simulationTime) {
        const result = this.checkProcessingComplete(fan, simulationTime, this.processingStartTime[queueIndex])
        
        if (result.completed) {
            if (this.shouldReturnToQueue(result)) {
                this._sendFanToBackOfQueue(queueIndex, fan, simulationTime)
            } else if (this.shouldReleaseToFestival(result)) {
                this._releaseFanIntoFestival(queueIndex, fan, simulationTime)
            }
        }
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
                this.updateQueuePositions(queueIndex, forceUpdate)
            }, simulationTime)
            
            // Update positions for all fans after processing enters
            this.updateQueuePositions(queueIndex, false)
            
            // Check if any returning fans have reached the end of line
            if (this.processing[queueIndex] !== null) {
                const processingFan = this.processing[queueIndex]
                if (processingFan.returningToQueue === queueIndex) {
                    this._handleReturningFan(queueIndex, processingFan, simulationTime)
                }
            }
            
            // If no one is being processed and queue has people, start processing
            const newProcessing = this.processFrontOfQueue(
                queue,
                entering,
                () => {
                    const queueX = this.getQueueX(queueIndex)
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
            
            // newProcessing is always equal to this.processing[queueIndex] at this point
            // because the callback already set it, so the check below is always false
            // Lines 322-326 are dead code
            
            // If someone is advancing to or being processed, update their state
            if (this.processing[queueIndex] !== null) {
                const fan = this.processing[queueIndex]
                
                // Skip if fan is returning to queue
                if (fan.returningToQueue !== undefined) continue
                
                // Use base class to check for processing transition
                this.checkProcessingTransition(fan)
                
                // Only check processing completion if fan is actually in processing state (not advancing)
                if (fan.state === AgentState.PROCESSING) {
                    this._handleCompletedProcessing(queueIndex, fan, simulationTime)
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
     * Check if fan is near end of queue (extracted for testability)
     * @param {Fan} fan - Fan to check
     * @param {number} threshold - Distance threshold
     * @returns {boolean} True if near end of queue
     */
    isNearEndOfQueue(fan, threshold = 10) {
        return fan.isNearTarget(threshold)
    }

    /**
     * Get queue X position based on queue index (extracted for testability)
     * @param {number} queueIndex - Queue index (0 or 1)
     * @returns {number} X position for queue
     */
    getQueueX(queueIndex) {
        return this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
    }

    /**
     * Get all fans currently in queues (including those entering)
     * @returns {Fan[]} Array of all fans in queues
     */
    getAllFans() {
        return [...this.queues[0], ...this.queues[1], ...this.entering[0], ...this.entering[1]];
    }
}
