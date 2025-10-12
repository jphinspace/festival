/**
 * QueuedProcessor - Base class for services that process fans one at a time in queues
 * Provides common queue management logic for security checkpoints and food stalls
 */
import { QueueManager } from './queueManager.js'

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
     * Start processing a fan from the front of a queue
     * @param {Array} queue - Queue array
     * @param {Array} entering - Entering fans array
     * @param {Function} getProcessingPosition - Function that returns {x, y} for processing position
     * @param {Fan|null} currentProcessing - Currently processing fan (or null)
     * @param {number} simulationTime - Current simulation time
     * @returns {Object} {shouldStartProcessing: boolean, fanToProcess: Fan|null}
     */
    startProcessingFan(queue, entering, getProcessingPosition, currentProcessing, simulationTime) {
        const result = {
            shouldStartProcessing: false,
            fanToProcess: null
        }

        // Process the fan at the front of the queue if not already processing
        if (queue.length > 0 && !currentProcessing) {
            const frontFan = queue[0]
            
            // Check if fan has reached the front position
            if (frontFan.isNearTarget(5)) {
                // Remove from queue and send to processing position
                queue.shift()
                
                // Get processing position from callback
                const processingPos = getProcessingPosition()
                
                // Fan advances to processing position (still moving in queue)
                frontFan.state = 'in_queue_advancing'
                frontFan.inQueue = true // Still in queue, just advancing to processing
                frontFan.setTarget(processingPos.x, processingPos.y, this.obstacles, simulationTime)
                
                result.shouldStartProcessing = true
                result.fanToProcess = frontFan
            }
        }

        return result
    }

    /**
     * Check if fan has reached processing position and transition to processing state
     * @param {Fan} fan - Fan to check
     * @returns {boolean} True if fan transitioned to processing
     */
    checkProcessingTransition(fan) {
        if (fan && fan.state === 'in_queue_advancing' && fan.isNearTarget(5)) {
            fan.state = 'processing'
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
     * Update queue positions for all fans
     * @param {Array} queue - Queue array
     * @param {Array} approaching - Approaching fans array
     * @param {Function} getTargetPosition - Function that takes index and returns {x, y}
     * @param {boolean} forceUpdate - Force position update
     * @param {number} simulationTime - Current simulation time
     */
    updateQueuePositions(queue, approaching, getTargetPosition, forceUpdate, simulationTime) {
        // Process approaching fans first
        QueueManager.processApproaching(
            queue,
            approaching,
            () => {}, // No-op callback since we'll handle position updates separately
            10  // Threshold
        )

        // Update main queue fans with consecutive positions starting from 0
        const currentTime = simulationTime || Date.now()
        queue.forEach((fan, index) => {
            fan.queuePosition = index
            const targetPos = getTargetPosition(index)
            
            // Check if fan has reached their queue position
            const distToTarget = QueueManager.prototype.getDistanceToPosition.call(this, fan, targetPos)
            const isAtTarget = distToTarget < 5 // Within 5 pixels
            
            // Throttle setTarget calls to once every 125ms per fan (unless forceUpdate is true)
            // But only set target if fan is not at target already
            if (!isAtTarget) {
                const updated = QueueManager.prototype.updateFanTarget.call(
                    this, fan, targetPos, this.obstacles, forceUpdate, currentTime
                )
                if (updated) {
                    fan.state = 'in_queue_advancing'
                } else if (fan.state === 'in_queue_advancing' && isAtTarget) {
                    fan.state = 'in_queue_waiting'
                }
            } else if (fan.state === 'in_queue_advancing') {
                // Fan reached target, switch to waiting
                fan.state = 'in_queue_waiting'
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
     * Helper to update fan target with throttling
     * @param {Fan} fan - Fan to update
     * @param {Object} targetPos - Target position {x, y}
     * @param {Obstacles} obstacles - Obstacles manager
     * @param {boolean} forceUpdate - Force update even if throttled
     * @param {number} currentTime - Current time
     * @returns {boolean} True if target was updated
     */
    updateFanTarget(fan, targetPos, obstacles, forceUpdate, currentTime) {
        const timeSinceLastUpdate = currentTime - (fan.queueTargetUpdateTime || 0)
        const shouldUpdate = forceUpdate || timeSinceLastUpdate >= 125

        if (shouldUpdate) {
            fan.setTarget(targetPos.x, targetPos.y, obstacles, currentTime)
            fan.queueTargetUpdateTime = currentTime
            return true
        }
        return false
    }
}
