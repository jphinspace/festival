/**
 * QueueManager - Shared queue management logic for both security and food queues
 * This ensures consistent behavior across all queue types
 */
import { AgentState } from '../utils/enums.js';
import * as Geometry from '../utils/geometry.js';
import { CONFIG } from '../utils/config.js';

export class QueueManager {
    /**
     * Get distance from a fan to a position
     * @param {Fan} fan - Fan object with x, y coordinates
     * @param {Object} position - Position object with x, y coordinates
     * @returns {number} Distance from fan to position
     */
    static getDistanceToPosition(fan, position) {
        return Geometry.calculateDistance(fan.x, fan.y, position.x, position.y);
    }

    /**
     * Update a fan's target position
     * @param {Fan} fan - Fan to update
     * @param {Object} targetPos - Target position {x, y}
     * @param {Obstacles} obstacles - Obstacles for pathfinding
     * @param {boolean} forceUpdate - Whether to bypass throttling (kept for API compatibility)
     * @returns {boolean} Whether the target was updated
     */
    static updateFanTarget(fan, targetPos, obstacles, forceUpdate) {
        fan.setTarget(targetPos.x, targetPos.y, obstacles);
        return true;
    }

    /**
     * Update queue positions - call every frame for responsive movement
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Fans approaching the queue
     * @param {Function} getTargetPosition - Function(index) that returns {x, y} for a position
     * @param {Object} frontPosition - {x, y} position of queue front for sorting
     * @param {Obstacles} obstacles - Obstacles for pathfinding (pass to setTarget)
     * @param {boolean} forceUpdate - If true, bypass throttling and update all targets immediately
     */
    static updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles = null, forceUpdate = false) {
        // Sort main queue by distance to front
        queue.sort((a, b) => {
            const distA = this.getDistanceToPosition(a, frontPosition);
            const distB = this.getDistanceToPosition(b, frontPosition);
            return distA - distB;
        });
        
        // Update main queue fans with consecutive positions starting from 0
        const currentTime = simulationTime || Date.now(); // Use simulationTime if available
        queue.forEach((fan, index) => {
            fan.queuePosition = index;
            const targetPos = getTargetPosition(index);
            
            // Check if fan has reached their queue position
            const distToTarget = this.getDistanceToPosition(fan, targetPos);
            const isAtTarget = distToTarget < 5; // Within 5 pixels
            
            // Only set target if fan is not at target already
            if (!isAtTarget) {
                const updated = this.updateFanTarget(fan, targetPos, obstacles, forceUpdate);
                if (updated) {
                    fan.state = AgentState.IN_QUEUE_ADVANCING;
                }
            } else if (fan.state === AgentState.IN_QUEUE_ADVANCING) {
                // Fan reached their position, now waiting
                fan.state = AgentState.IN_QUEUE_WAITING;
            }
            
            fan.inQueue = true;
        });
        
        // For approaching fans, always use distance-based ordering (same as security queues)
        approaching.forEach((fan) => {
            const fanDist = this.getDistanceToPosition(fan, frontPosition);
            
            // Find where this fan fits based on distance
            let insertPosition = queue.length; // Default to end
            for (let i = 0; i < queue.length; i++) {
                const queueFanDist = this.getDistanceToPosition(queue[i], frontPosition);
                if (fanDist < queueFanDist) {
                    insertPosition = i;
                    break;
                }
            }
            fan.queuePosition = insertPosition;
            
            const targetPos = getTargetPosition(fan.queuePosition);
            
            this.updateFanTarget(fan, targetPos, obstacles, forceUpdate);
            
            fan.inQueue = false;
            if (fan.state !== AgentState.APPROACHING_QUEUE) {
                fan.state = AgentState.APPROACHING_QUEUE;
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
        const fanDistToFront = this.getDistanceToPosition(fan, frontPosition);
        
        // Combine all fans in the queue (both in_queue and approaching_queue)
        const allFansInQueue = [...queue, ...approaching.filter(f => f !== fan)];
        
        // Find nearby fans within a reasonable proximity
        const proximityThreshold = CONFIG.QUEUE_PROXIMITY_THRESHOLD;
        const nearbyFans = [];
        
        allFansInQueue.forEach((otherFan) => {
            const otherDistToFront = this.getDistanceToPosition(otherFan, frontPosition);
            const distToOther = Geometry.calculateDistance(fan.x, fan.y, otherFan.x, otherFan.y);
            
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
        fan.state = AgentState.APPROACHING_QUEUE;
        
        // Set target based on calculated position WITH obstacles for pathfinding
        const targetPos = getTargetPosition(position);
        fan.setTarget(targetPos.x, targetPos.y, obstacles);
        
        // Initialize queue target update time to ensure first update will work
        // Use -Infinity to guarantee first update will pass throttle check regardless of timing
        fan.queueTargetUpdateTime = -Infinity;
        
        return position;
    }

    /**
     * Process fans transitioning from approaching to queue
     * @param {Array} queue - Main queue array
     * @param {Array} approaching - Approaching fans array
     * @param {Function} updateCallback - Function to call after promotion (for resorting)
     * @param {number} threshold - Distance threshold for joining (default from CONFIG)
     */
    static processApproaching(queue, approaching, updateCallback, threshold = CONFIG.QUEUE_JOIN_THRESHOLD) {
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
            fan.state = AgentState.IN_QUEUE;
            fan.inQueue = true;
            return true;
        }
        return false;
    }
}
