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
     * @param {Object} options - Optional settings {skipWaypoints: boolean}
     */
    static updatePositions(queue, approaching, getTargetPosition, frontPosition, options = {}) {
        // Sort every frame by actual distance to ensure accurate positions
        this.sortByDistance(queue, approaching, frontPosition);
        
        // Update main queue fans
        queue.forEach((fan, index) => {
            fan.queuePosition = index;
            const targetPos = getTargetPosition(index);
            // Pass null to skip waypoint recalculation for queue movement
            fan.setTarget(targetPos.x, targetPos.y, options.skipWaypoints ? null : undefined);
            fan.inQueue = true;
            if (fan.state !== 'being_checked' && !fan.waitStartTime) {
                fan.state = 'in_queue';
            }
        });
        
        // Update approaching fans
        approaching.forEach((fan, index) => {
            const position = queue.length + index;
            fan.queuePosition = position;
            const targetPos = getTargetPosition(position);
            // Pass null to skip waypoint recalculation for queue movement
            fan.setTarget(targetPos.x, targetPos.y, options.skipWaypoints ? null : undefined);
            fan.inQueue = false;
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });
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
