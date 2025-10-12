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
     * Set obstacles reference for pathfinding
     * @param {Obstacles} obstacles - Obstacles manager
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
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
            for (let i = entering.length - 1; i >= 0; i--) {
                const fan = entering[i]
                
                // Check if fan has reached the entry point
                if (fan.isNearTarget(5)) {
                    // Move from entering to actual queue
                    entering.splice(i, 1)
                    queue.push(fan)
                    fan.state = 'in_queue'
                    // inQueue is already true from addToQueue - consistent with food queues
                    // Update all queue positions and sort since someone joined
                    this.updateQueuePositions(queueIndex, true, simulationTime)
                }
            }
            
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
            if (this.processing[queueIndex] === null && queue.length > 0) {
                const fan = queue[0]
                
                // Check if fan has reached the front of the queue (position 0)
                if (fan.isNearTarget(5)) {
                    // Remove from queue and start processing
                    queue.shift()
                    this.processing[queueIndex] = fan
                    this.processingStartTime[queueIndex] = simulationTime
                    
                    // Set up processing position - walk up to security guard
                    const queueX = this.width * (queueIndex === 0 ? this.config.QUEUE_LEFT_X : this.config.QUEUE_RIGHT_X)
                    const startY = this.height * this.config.QUEUE_START_Y
                    const processingY = startY - this.config.QUEUE_SPACING // One space in front of queue
                    
                    fan.state = 'processing'
                    fan.inQueue = false
                    fan.setTarget(queueX, processingY, this.obstacles, simulationTime)
                    
                    // Update remaining fans' positions after removing front fan
                    this.updateQueuePositions(queueIndex, true, simulationTime)
                }
            }
            
            // If someone is being processed, check if their time is up
            if (this.processing[queueIndex] !== null) {
                const fan = this.processing[queueIndex]
                
                // Skip if fan is returning to queue
                if (fan.returningToQueue !== undefined) continue
                
                const elapsedTime = simulationTime - this.processingStartTime[queueIndex]
                const requiredTime = fan.enhancedSecurity ? 
                    this.config.ENHANCED_SECURITY_TIME : 
                    this.config.REGULAR_SECURITY_TIME
                
                // Check if fan has reached processing position AND time has elapsed
                if (fan.isNearTarget(5) && elapsedTime >= requiredTime) {
                    if (fan.enhancedSecurity) {
                        // Send to back of the line - fan needs to walk to end
                        fan.enhancedSecurity = false // Only enhanced once
                        fan.goal = 'security (re-check)'
                        
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
                        fan.state = 'returning_to_queue'
                        fan.returningToQueue = queueIndex
                        
                        // Keep fan in processing until they reach end of line
                        // Don't clear processing here - will be cleared when fan reaches end
                    } else {
                        // Allow into festival - move straight ahead to CENTER of festival
                        // All fans should converge to center regardless of which queue they came from
                        const targetX = this.width * 0.5 // Center of festival
                        const targetY = this.height * 0.3 // Move to festival area (30% down from top)
                        fan.goal = 'exploring festival'
                        fan.setTarget(targetX, targetY, this.obstacles, simulationTime)
                        fan.state = 'passed_security'
                        fan.inQueue = false
                        fan.justPassedSecurity = true // Mark to prevent immediate wandering
                        
                        // Clear processing
                        this.processing[queueIndex] = null
                        this.processingStartTime[queueIndex] = null
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
