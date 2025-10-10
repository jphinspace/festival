/**
 * QueueManager - Shared queue management logic for both security and food queues
 * This ensures consistent behavior across all queue types
 */
export class QueueManager {
    /**
     * Sort queues and approaching arrays by actual distance to target
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Fans approaching the queue  
     * @param {Object} frontPosition - {x, y} position of queue front
     */
    static sortByDistance(queue, approaching, frontPosition) {
        const { x: frontX, y: frontY } = frontPosition;
        
        // Sort main queue by distance to front
        queue.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - frontX, 2) + Math.pow(a.y - frontY, 2));
            const distB = Math.sqrt(Math.pow(b.x - frontX, 2) + Math.pow(b.y - frontY, 2));
            return distA - distB;
        });
        
        // Sort approaching fans by distance to front
        approaching.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - frontX, 2) + Math.pow(a.y - frontY, 2));
            const distB = Math.sqrt(Math.pow(b.x - frontX, 2) + Math.pow(b.y - frontY, 2));
            return distA - distB;
        });
    }

    /**
     * Update queue positions - call every frame for responsive movement
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Fans approaching the queue
     * @param {Function} getTargetPosition - Function(index) that returns {x, y} for a position
     * @param {Object} frontPosition - {x, y} position of queue front for sorting
     * @param {Obstacles} obstacles - Obstacles for pathfinding (pass to setTarget)
     */
    static updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles = null) {
        // Sort main queue by distance to front
        queue.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - frontPosition.x, 2) + Math.pow(a.y - frontPosition.y, 2));
            const distB = Math.sqrt(Math.pow(b.x - frontPosition.x, 2) + Math.pow(b.y - frontPosition.y, 2));
            return distA - distB;
        });
        
        // Update main queue fans with consecutive positions starting from 0
        queue.forEach((fan, index) => {
            fan.queuePosition = index;
            const targetPos = getTargetPosition(index);
            fan.setTarget(targetPos.x, targetPos.y, obstacles);
            fan.inQueue = true;
            if (fan.state !== 'being_checked' && !fan.waitStartTime) {
                fan.state = 'in_queue';
            }
        });
        
        // For approaching fans, find their natural insertion point based on distance
        // This prevents them from always going to the back
        approaching.forEach((fan) => {
            const fanDist = Math.sqrt(Math.pow(fan.x - frontPosition.x, 2) + Math.pow(fan.y - frontPosition.y, 2));
            
            // Find where this fan would fit in the queue based on distance
            let insertPosition = queue.length; // Default to end
            for (let i = 0; i < queue.length; i++) {
                const queueFanDist = Math.sqrt(Math.pow(queue[i].x - frontPosition.x, 2) + Math.pow(queue[i].y - frontPosition.y, 2));
                if (fanDist < queueFanDist) {
                    insertPosition = i;
                    break;
                }
            }
            
            // Set fan's position and target based on where they naturally fit
            fan.queuePosition = insertPosition;
            const targetPos = getTargetPosition(insertPosition);
            fan.setTarget(targetPos.x, targetPos.y, obstacles);
            fan.inQueue = false;
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });
    }

    /**
     * Process fans transitioning from approaching to queue
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Approaching fans array
     * @param {Function} updateCallback - Function to call after promotion (for resorting)
     * @param {number} threshold - Distance threshold for joining (default 10)
     */
    static processApproaching(queue, approaching, updateCallback, threshold = 10) {
        for (let i = approaching.length - 1; i >= 0; i--) {
            const fan = approaching[i];
            if (this.shouldJoinQueue(fan, threshold)) {
                this.promoteFanToQueue(fan, approaching, queue);
                if (updateCallback) {
                    updateCallback();
                }
            }
        }
    }

    /**
     * Check if a fan should be promoted from approaching to queue
     * @param {Fan} fan - Fan to check
     * @param {number} threshold - Distance threshold (default 5)
     * @returns {boolean}
     */
    static shouldJoinQueue(fan, threshold = 5) {
        return fan.isNearTarget(threshold);
    }

    /**
     * Process a fan joining the queue
     * @param {Fan} fan - Fan joining
     * @param {Array} approaching - Approaching array to remove from
     * @param {Array} queue - Queue array to add to
     */
    static promoteFanToQueue(fan, approaching, queue) {
        const index = approaching.indexOf(fan);
        if (index !== -1) {
            approaching.splice(index, 1);
            queue.push(fan);
            fan.state = 'in_queue';
            fan.inQueue = true;
            return true;
        }
        return false;
    }
}
