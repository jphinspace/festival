/**
 * QueuedProcessor - Base class for services that process fans one at a time in queues
 * Provides common queue management logic for security checkpoints and food stalls
 */
import { QueueManager } from './queueManager.js'
import { AgentState } from '../utils/enums.js'

export class QueuedProcessor {
    /**
     * Create a new queued processor
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        this.config = config
        this.obstacles = null
    }

    /**
     * Set obstacles reference for pathfinding
     * @param {Obstacles} obstacles - Obstacles manager
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles
    }

    /**
     * Process fans entering the queue - transitions from approaching to in_queue
     * @param {Array} queue - Queue array
     * @param {Array} entering - Entering fans array
     * @param {Function} updatePositionsCallback - Callback to update queue positions after fan joins
     * @param {number} simulationTime - Current simulation time
     */
    processEntering(queue, entering, updatePositionsCallback, simulationTime) {
        for (let i = entering.length - 1; i >= 0; i--) {
            const fan = entering[i]
            
            // Check if fan has reached the entry point
            if (fan.isNearTarget(5)) {
                // Move from entering to actual queue
                entering.splice(i, 1)
                queue.push(fan)
                fan.state = AgentState.IN_QUEUE_WAITING
                // Update all queue positions since someone joined
                updatePositionsCallback(true, simulationTime)
            }
        }
    }

    /**
     * Process front of queue - start processing fan if they've reached front position
     * @param {Array} queue - Queue array
     * @param {Array} entering - Entering fans array
     * @param {Function} getProcessingPosition - Function that returns {x, y} for processing position
     * @param {any} currentProcessing - Currently processing value (fan or null)
     * @param {number} simulationTime - Current simulation time
     * @param {Function} onStartProcessing - Callback when processing starts with fan
     * @returns {any} New processing value (fan if started, null otherwise)
     */
    processFrontOfQueue(queue, entering, getProcessingPosition, currentProcessing, simulationTime, onStartProcessing) {
        // If no one is being processed and queue has people, start processing
        if (currentProcessing === null && queue.length > 0) {
            const fan = queue[0]
            
            // Check if fan has reached the front of the queue (position 0)
            if (fan.isNearTarget(5)) {
                // Remove from queue
                queue.shift()
                
                // Get processing position from callback
                const processingPos = getProcessingPosition()
                
                // Fan advances to processing position (still moving in queue)
                fan.state = AgentState.IN_QUEUE_ADVANCING
                fan.inQueue = true // Still in queue, just advancing to processing
                fan.setTarget(processingPos.x, processingPos.y, this.obstacles)
                
                // Call callback to set processor-specific state
                onStartProcessing(fan, simulationTime)
                
                return fan
            }
        }
        
        return currentProcessing
    }

    /**
     * Check if fan has reached processing position and transition to processing state
     * @param {Fan} fan - Fan to check
     * @returns {boolean} True if fan transitioned to processing
     */
    checkProcessingTransition(fan) {
        if (fan && fan.state === AgentState.IN_QUEUE_ADVANCING && fan.isNearTarget(5)) {
            fan.state = AgentState.PROCESSING
            fan.inQueue = false // No longer in queue, now being processed
            // Clear waypoints - fan is now stationary
            fan.staticWaypoints = []
            fan.waypointUpdateTimes = []
            fan.dynamicWaypoint = null
            return true
        }
        return false
    }

    /**
     * Abstract method for processing completion - must be implemented by subclasses
     * @param {Fan} fan - Fan being processed
     * @param {number} simulationTime - Current simulation time
     * @param {number} processingStartTime - When processing started
     * @returns {Object} {completed: boolean, action: string} - Whether processing is complete and what action to take
     */
    checkProcessingComplete(fan, simulationTime, processingStartTime) {
        throw new Error('checkProcessingComplete must be implemented by subclass')
    }

    /**
     * Update queue positions for all fans
     * @param {Array} queue - Queue array
     * @param {Array} approaching - Approaching fans array
     * @param {Function} getTargetPosition - Function that takes index and returns {x, y}
     * @param {boolean} forceUpdate - Force position update
     * @param {number} simulationTime - Current simulation time
     */
    updateQueuePositions(queue, approaching, getTargetPosition, forceUpdate, simulationTime = null) {
        // Process approaching fans first
        QueueManager.processApproaching(
            queue,
            approaching,
            () => {}, // No-op callback since we'll handle position updates separately
            10,  // Threshold
            simulationTime
        )

        // Update main queue fans with consecutive positions starting from 0
        queue.forEach((fan, index) => {
            fan.queuePosition = index
            const targetPos = getTargetPosition(index)
            
            // Check if fan has reached their queue position
            const distToTarget = this.getDistanceToPosition(fan, targetPos)
            const isAtTarget = distToTarget < 5 // Within 5 pixels
            
            // Only set target if fan is not at target already
            if (!isAtTarget) {
                const updated = this.updateFanTarget(
                    fan, targetPos, this.obstacles, forceUpdate
                )
                if (updated) {
                    fan.state = AgentState.IN_QUEUE_ADVANCING
                }
            } else if (fan.state === AgentState.IN_QUEUE_ADVANCING) {
                // Fan reached target, switch to waiting
                fan.state = AgentState.IN_QUEUE_WAITING
            }
        })
    }

    /**
     * Helper to get distance between fan and position
     * @param {Fan} fan - Fan object
     * @param {Object} pos - Position with x, y
     * @returns {number} Distance
     */
    getDistanceToPosition(fan, pos) {
        const dx = fan.x - pos.x
        const dy = fan.y - pos.y
        return Math.sqrt(dx * dx + dy * dy)
    }

    /**
     * Helper to update fan target
     * @param {Fan} fan - Fan to update
     * @param {Object} targetPos - Target position {x, y}
     * @param {Obstacles} obstacles - Obstacles manager
     * @param {boolean} forceUpdate - Force update (kept for API compatibility but ignored)
     * @returns {boolean} True if target was updated
     */
    updateFanTarget(fan, targetPos, obstacles, forceUpdate) {
        fan.setTarget(targetPos.x, targetPos.y, obstacles)
        return true
    }
}
