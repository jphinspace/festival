/**
 * QueueManager - Shared queue management logic for both security and food queues
 * This ensures consistent behavior across all queue types
 */
export class QueueManager {
    /**
     * Sort a queue by physical position relative to target
     * @param {Array} queue - Array of fans to sort
     * @param {Function} distanceFunc - Function that returns distance to target for a fan
     */
    static sortByPosition(queue, distanceFunc) {
        queue.sort((a, b) => distanceFunc(a) - distanceFunc(b));
    }

    /**
     * Update queue positions with proper movement logic
     * Fans move in two stages:
     * 1. Move to the Y position of the queue (vertical movement)
     * 2. Move to the X position in the queue (lateral movement)
     * This prevents diagonal movement from the bus
     * 
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Fans approaching the queue
     * @param {Function} getTargetPosition - Function that returns {x, y} for a position index
     * @param {Function} shouldSort - Function that determines if sorting is needed (optional)
     */
    static updatePositions(queue, approaching, getTargetPosition, shouldSort = null) {
        // Only sort if explicitly requested (e.g., when someone joins/leaves)
        // Don't sort every frame to avoid jittering
        if (shouldSort && shouldSort()) {
            // Sort approaching by distance to their current target
            approaching.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.x - a.targetX, 2) + Math.pow(a.y - a.targetY, 2));
                const distB = Math.sqrt(Math.pow(b.x - b.targetX, 2) + Math.pow(b.y - b.targetY, 2));
                return distA - distB;
            });
        }

        // Update approaching fans
        approaching.forEach((fan, index) => {
            const position = queue.length + index;
            const targetPos = getTargetPosition(position);
            
            // Only update if position changed significantly (>5 pixels)
            if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                Math.abs(fan.targetY - targetPos.y) > 5) {
                fan.setTarget(targetPos.x, targetPos.y);
            }
            
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });

        // Update queue fans
        queue.forEach((fan, index) => {
            const targetPos = getTargetPosition(index);
            
            // Only update if position changed significantly
            if (Math.abs(fan.targetX - targetPos.x) > 5 || 
                Math.abs(fan.targetY - targetPos.y) > 5) {
                fan.setTarget(targetPos.x, targetPos.y);
            }
            
            // Ensure proper state (unless being checked/waiting)
            if (fan.state !== 'being_checked' && !fan.waitStartTime) {
                fan.state = 'in_queue';
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
