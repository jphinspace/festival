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
        
        // For approaching fans, find their position based on proximity to other fans in the same queue
        // This creates natural queue formation instead of everyone heading to the front
        approaching.forEach((fan) => {
            // Combine queue and approaching fans to find where this fan fits geographically
            const allFansInQueue = [...queue, ...approaching];
            
            // Calculate distance to front for this fan
            const fanDistToFront = Math.sqrt(Math.pow(fan.x - frontPosition.x, 2) + Math.pow(fan.y - frontPosition.y, 2));
            
            // Find all fans that are geographically close and determine who's ahead/behind
            const nearbyFans = [];
            const proximityThreshold = 80; // pixels - fans within this distance are considered "nearby"
            
            allFansInQueue.forEach((otherFan) => {
                if (otherFan === fan) return; // Skip self
                
                const otherDistToFront = Math.sqrt(Math.pow(otherFan.x - frontPosition.x, 2) + Math.pow(otherFan.y - frontPosition.y, 2));
                const distToOther = Math.sqrt(Math.pow(fan.x - otherFan.x, 2) + Math.pow(fan.y - otherFan.y, 2));
                
                // Only consider fans within proximity
                if (distToOther <= proximityThreshold) {
                    nearbyFans.push({
                        fan: otherFan,
                        distToFront: otherDistToFront,
                        distToSelf: distToOther,
                        isAhead: otherDistToFront < fanDistToFront
                    });
                }
            });
            
            // Sort nearby fans by distance to front
            nearbyFans.sort((a, b) => a.distToFront - b.distToFront);
            
            // Find the closest fan ahead (if any)
            const fansAhead = nearbyFans.filter(f => f.isAhead);
            const closestAhead = fansAhead.length > 0 ? fansAhead[fansAhead.length - 1].fan : null; // Last in sorted list = closest to us but still ahead
            
            // Determine position based on where we fit
            let insertPosition;
            if (closestAhead && closestAhead.queuePosition !== null && closestAhead.queuePosition !== undefined) {
                // Position ourselves right after the closest fan ahead
                insertPosition = closestAhead.queuePosition + 1;
            } else if (nearbyFans.length > 0 && fansAhead.length > 0) {
                // We have fans ahead but they don't have positions yet
                // Find where the closest ahead fan would fit in the queue
                const closestAheadDistToFront = fansAhead[fansAhead.length - 1].distToFront;
                insertPosition = queue.length; // Default to end
                for (let i = 0; i < queue.length; i++) {
                    const queueFanDist = Math.sqrt(Math.pow(queue[i].x - frontPosition.x, 2) + Math.pow(queue[i].y - frontPosition.y, 2));
                    if (closestAheadDistToFront < queueFanDist) {
                        insertPosition = i;
                        break;
                    }
                }
                insertPosition += 1; // One position after the closest ahead
            } else {
                // No nearby fans or no fans ahead - use distance-based positioning
                insertPosition = queue.length; // Default to end
                for (let i = 0; i < queue.length; i++) {
                    const queueFanDist = Math.sqrt(Math.pow(queue[i].x - frontPosition.x, 2) + Math.pow(queue[i].y - frontPosition.y, 2));
                    if (fanDistToFront < queueFanDist) {
                        insertPosition = i;
                        break;
                    }
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
