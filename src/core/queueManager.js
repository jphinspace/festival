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
     * @param {boolean} useProximityLock - If true, use locked positions (for food stalls). If false, recalculate based on distance (for security)
     */
    static updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles = null, useProximityLock = false) {
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
        
        // For approaching fans, update their targets
        approaching.forEach((fan) => {
            if (useProximityLock) {
                // Food stalls: use locked position (assigned once in addToQueue)
                if (fan.queuePosition === null || fan.queuePosition === undefined) {
                    // Fallback: assign position at end of queue
                    fan.queuePosition = queue.length + approaching.indexOf(fan);
                }
            } else {
                // Security queues: recalculate based on distance (original behavior)
                const fanDist = Math.sqrt(Math.pow(fan.x - frontPosition.x, 2) + Math.pow(fan.y - frontPosition.y, 2));
                
                // Find where this fan fits based on distance
                let insertPosition = queue.length; // Default to end
                for (let i = 0; i < queue.length; i++) {
                    const queueFanDist = Math.sqrt(Math.pow(queue[i].x - frontPosition.x, 2) + Math.pow(queue[i].y - frontPosition.y, 2));
                    if (fanDist < queueFanDist) {
                        insertPosition = i;
                        break;
                    }
                }
                fan.queuePosition = insertPosition;
            }
            
            const targetPos = getTargetPosition(fan.queuePosition);
            fan.setTarget(targetPos.x, targetPos.y, obstacles);
            fan.inQueue = false;
            if (fan.state !== 'approaching_queue') {
                fan.state = 'approaching_queue';
            }
        });
    }
    
    /**
     * Find the best position for a fan joining the approaching queue
     * This is called ONCE when a fan first joins, not every frame
     * @param {Fan} fan - Fan joining the queue
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Fans already approaching
     * @param {Object} frontPosition - {x, y} position of queue front
     * @returns {number} The position this fan should target
     */
    static findApproachingPosition(fan, queue, approaching, frontPosition) {
        // Calculate distance to front for this fan
        const fanDistToFront = Math.sqrt(
            Math.pow(fan.x - frontPosition.x, 2) + 
            Math.pow(fan.y - frontPosition.y, 2)
        );
        
        // Combine all fans in the queue (both in_queue and approaching_queue)
        const allFansInQueue = [...queue, ...approaching.filter(f => f !== fan)];
        
        // Find nearby fans within a reasonable proximity
        const proximityThreshold = 60; // pixels - reduced from 80 to be more conservative
        const nearbyFans = [];
        
        allFansInQueue.forEach((otherFan) => {
            const otherDistToFront = Math.sqrt(
                Math.pow(otherFan.x - frontPosition.x, 2) + 
                Math.pow(otherFan.y - frontPosition.y, 2)
            );
            const distToOther = Math.sqrt(
                Math.pow(fan.x - otherFan.x, 2) + 
                Math.pow(fan.y - otherFan.y, 2)
            );
            
            if (distToOther <= proximityThreshold) {
                nearbyFans.push({
                    fan: otherFan,
                    distToFront: otherDistToFront,
                    distToSelf: distToOther
                });
            }
        });
        
        // If we have nearby fans, try to position based on them
        if (nearbyFans.length > 0) {
            // Sort by distance to front
            nearbyFans.sort((a, b) => a.distToFront - b.distToFront);
            
            // Find the closest fan who is ahead of us (closer to front)
            const fansAhead = nearbyFans.filter(f => f.distToFront < fanDistToFront);
            
            if (fansAhead.length > 0) {
                // Position after the closest fan ahead
                const closestAhead = fansAhead[fansAhead.length - 1].fan;
                if (closestAhead.queuePosition !== null && closestAhead.queuePosition !== undefined) {
                    return closestAhead.queuePosition + 1;
                }
            }
        }
        
        // Default: go to the back of the queue (no nearby fans or too far)
        return queue.length + approaching.filter(f => f !== fan).length;
    }
    
    /**
     * Common logic for adding a fan to a queue with proximity-based positioning
     * @param {Fan} fan - Fan to add to queue
     * @param {Object} options - Configuration options
     * @param {Array} options.queue - Main queue array
     * @param {Array} options.approachingList - Approaching fans array
     * @param {Object} options.frontPosition - {x, y} position of queue front
     * @param {Function} options.getTargetPosition - Function to get target position from queue position
     * @param {Object} options.fanProperties - Properties to set on the fan
     * @param {boolean} options.setInQueue - Whether to set fan.inQueue to true (default: true)
     * @param {Obstacles} options.obstacles - Obstacles manager for pathfinding (optional but recommended)
     * @returns {number} The assigned position
     */
    static addFanToQueue(fan, options) {
        const { queue, approachingList, frontPosition, getTargetPosition, fanProperties = {}, setInQueue = true, obstacles = null } = options;
        
        // Use proximity-based positioning
        const position = this.findApproachingPosition(
            fan,
            queue,
            approachingList,
            frontPosition
        );
        
        // Add to approaching list
        approachingList.push(fan);
        
        // Set common fan properties
        if (setInQueue) {
            fan.inQueue = true; // Mark as in queue process
        }
        fan.queuePosition = position; // Assign the calculated position
        
        // Set any additional properties passed in
        Object.assign(fan, fanProperties);
        
        // CRITICAL: Set state to approaching_queue BEFORE setTarget
        // so that setTarget() knows to generate waypoints
        fan.state = 'approaching_queue';
        
        // Set target based on calculated position WITH obstacles for pathfinding
        const targetPos = getTargetPosition(position);
        fan.setTarget(targetPos.x, targetPos.y, obstacles);
        
        return position;
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
