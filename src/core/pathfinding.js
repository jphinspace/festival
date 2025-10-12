/**
 * Pathfinding module for calculating and managing static waypoints
 * Handles obstacle avoidance with randomized waypoint placement to reduce crowding
 */
import { AgentState } from '../utils/enums.js';

/**
 * Calculate static waypoints from current position to target
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} targetX - Final target X position
 * @param {number} targetY - Final target Y position
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @param {Object} config - Configuration object
 * @returns {Array} Array of {x, y} waypoints ending with exact target position
 */
export function calculateStaticWaypoints(startX, startY, targetX, targetY, obstacles, radius, personalSpaceBuffer, config) {
    // Check if direct path is clear
    if (isPathClear(startX, startY, targetX, targetY, obstacles, radius, personalSpaceBuffer)) {
        // Direct path is clear - return single waypoint at target
        return [{ x: targetX, y: targetY }]
    }
    
    // Path is blocked - generate waypoints around obstacles
    const maxWaypoints = config.MAX_STATIC_WAYPOINTS || 6
    const waypoints = []
    
    // Use A* pathfinding to find route around obstacles
    const path = findPathAroundObstacles(startX, startY, targetX, targetY, obstacles, radius, personalSpaceBuffer, maxWaypoints, config)
    
    // Add randomization to all waypoints except the final destination
    for (let i = 0; i < path.length; i++) {
        const isDestination = (i === path.length - 1)
        const waypoint = path[i]
        
        if (isDestination) {
            // Final waypoint is always exactly at target destination
            waypoints.push({ x: targetX, y: targetY })
        } else {
            // Apply randomization with increasing radius for earlier waypoints
            // Radius calculation: 0 for destination, 1*diameter for previous, 2*diameter for one before, etc.
            const waypointsFromEnd = path.length - 1 - i
            const randomRadius = waypointsFromEnd * (radius * 2) // diameter = radius * 2
            
            const randomPoint = findRandomPointNearWaypoint(
                waypoint.x, 
                waypoint.y, 
                randomRadius,
                i > 0 ? path[i-1] : { x: startX, y: startY },
                i < path.length - 1 ? path[i+1] : { x: targetX, y: targetY },
                obstacles,
                radius,
                personalSpaceBuffer
            )
            
            waypoints.push(randomPoint || waypoint) // Fall back to original if can't find valid random point
        }
    }
    
    return waypoints
}

/**
 * Find a path around obstacles using simplified A* algorithm
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position  
 * @param {number} targetX - Target X position
 * @param {number} targetY - Target Y position
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @param {number} maxWaypoints - Maximum waypoints to generate
 * @param {Object} config - Configuration object
 * @returns {Array} Array of {x, y} waypoint positions
 */
function findPathAroundObstacles(startX, startY, targetX, targetY, obstacles, radius, personalSpaceBuffer, maxWaypoints, config) {
    const waypoints = []
    const bufferDistance = config.WAYPOINT_BUFFER_DISTANCE || 5
    const totalBuffer = radius + personalSpaceBuffer + bufferDistance
    
    let currentX = startX
    let currentY = startY
    
    // Iteratively find waypoints around obstacles
    for (let iteration = 0; iteration < maxWaypoints - 1; iteration++) { // -1 because last waypoint is always target
        // Check if we can go straight to target now
        if (isPathClear(currentX, currentY, targetX, targetY, obstacles, radius, personalSpaceBuffer)) {
            break // Can reach target directly now
        }
        
        // Find blocking obstacles
        const blockingObstacles = findBlockingObstacles(currentX, currentY, targetX, targetY, obstacles, radius, personalSpaceBuffer)
        
        if (blockingObstacles.length === 0) {
            break // No obstacles in the way
        }
        
        // Route around the first blocking obstacle
        const obstacle = blockingObstacles[0]
        
        // Calculate corner points around obstacle (with buffer)
        const corners = [
            { x: obstacle.x - totalBuffer, y: obstacle.y - totalBuffer }, // Top-left
            { x: obstacle.x + obstacle.width + totalBuffer, y: obstacle.y - totalBuffer }, // Top-right
            { x: obstacle.x - totalBuffer, y: obstacle.y + obstacle.height + totalBuffer }, // Bottom-left
            { x: obstacle.x + obstacle.width + totalBuffer, y: obstacle.y + obstacle.height + totalBuffer } // Bottom-right
        ]
        
        // Find best corner that provides clear path to and from it
        let bestCorner = null
        let bestScore = Infinity
        
        const toTargetDx = targetX - currentX
        const toTargetDy = targetY - currentY
        const toTargetDist = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy)
        
        for (const corner of corners) {
            // Check if corner is valid (not inside obstacle)
            if (isPointInsideObstacle(corner.x, corner.y, obstacles, radius, personalSpaceBuffer)) {
                continue
            }
            
            // Check if we can reach this corner from current position
            if (!isPathClear(currentX, currentY, corner.x, corner.y, obstacles, radius, personalSpaceBuffer)) {
                continue
            }
            
            // Calculate score (distance + direction bonus)
            const distToCorner = Math.sqrt(Math.pow(corner.x - currentX, 2) + Math.pow(corner.y - currentY, 2))
            const distFromCorner = Math.sqrt(Math.pow(targetX - corner.x, 2) + Math.pow(targetY - corner.y, 2))
            
            // Direction bonus: prefer corners that move us toward target
            let directionBonus = 0
            if (toTargetDist > 0) {
                const toCornerDx = corner.x - currentX
                const toCornerDy = corner.y - currentY
                const toCornerDist = Math.sqrt(toCornerDx * toCornerDx + toCornerDy * toCornerDy)
                
                if (toCornerDist > 0) {
                    const alignment = (toCornerDx * toTargetDx + toCornerDy * toTargetDy) / (toCornerDist * toTargetDist)
                    directionBonus = (1 - alignment) * 100 // Penalty for going backward
                }
            }
            
            const score = distToCorner + distFromCorner + directionBonus
            
            if (score < bestScore) {
                bestScore = score
                bestCorner = corner
            }
        }
        
        if (bestCorner) {
            waypoints.push(bestCorner)
            currentX = bestCorner.x
            currentY = bestCorner.y
        } else {
            // No valid corner found - try mid-points along obstacle edges
            const midPoints = [
                { x: (obstacle.x + obstacle.x + obstacle.width) / 2, y: obstacle.y - totalBuffer }, // Top middle
                { x: (obstacle.x + obstacle.x + obstacle.width) / 2, y: obstacle.y + obstacle.height + totalBuffer }, // Bottom middle
                { x: obstacle.x - totalBuffer, y: (obstacle.y + obstacle.y + obstacle.height) / 2 }, // Left middle
                { x: obstacle.x + obstacle.width + totalBuffer, y: (obstacle.y + obstacle.y + obstacle.height) / 2 } // Right middle
            ]
            
            for (const midPoint of midPoints) {
                if (!isPointInsideObstacle(midPoint.x, midPoint.y, obstacles, radius, personalSpaceBuffer) &&
                    isPathClear(currentX, currentY, midPoint.x, midPoint.y, obstacles, radius, personalSpaceBuffer)) {
                    waypoints.push(midPoint)
                    currentX = midPoint.x
                    currentY = midPoint.y
                    break
                }
            }
            break // If still no waypoint, give up
        }
    }
    
    // Always add final target as last waypoint
    waypoints.push({ x: targetX, y: targetY })
    
    return waypoints
}

/**
 * Find a random point within radius of waypoint that satisfies path constraints
 * @param {number} waypointX - Waypoint X position
 * @param {number} waypointY - Waypoint Y position
 * @param {number} randomRadius - Radius for random placement
 * @param {Object} prevWaypoint - Previous waypoint {x, y}
 * @param {Object} nextWaypoint - Next waypoint {x, y}
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @returns {Object|null} Random point {x, y} or null if none found
 */
function findRandomPointNearWaypoint(waypointX, waypointY, randomRadius, prevWaypoint, nextWaypoint, obstacles, radius, personalSpaceBuffer) {
    if (randomRadius === 0) {
        return { x: waypointX, y: waypointY } // No randomization for destination
    }
    
    const maxAttempts = 50 // Limit attempts to avoid infinite loop
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random point within circle
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * randomRadius
        const randomX = waypointX + Math.cos(angle) * distance
        const randomY = waypointY + Math.sin(angle) * distance
        
        // Check if point is inside obstacle
        if (isPointInsideObstacle(randomX, randomY, obstacles, radius, personalSpaceBuffer)) {
            continue
        }
        
        // Check if path from previous waypoint to this point is clear
        if (!isPathClear(prevWaypoint.x, prevWaypoint.y, randomX, randomY, obstacles, radius, personalSpaceBuffer)) {
            continue
        }
        
        // Check if path from this point to next waypoint is clear
        if (!isPathClear(randomX, randomY, nextWaypoint.x, nextWaypoint.y, obstacles, radius, personalSpaceBuffer)) {
            continue
        }
        
        // Valid point found
        return { x: randomX, y: randomY }
    }
    
    // No valid random point found, return original waypoint
    return { x: waypointX, y: waypointY }
}

/**
 * Check if straight path between two points is clear of obstacles
 * @param {number} x1 - Start X position
 * @param {number} y1 - Start Y position
 * @param {number} x2 - End X position
 * @param {number} y2 - End Y position
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @returns {boolean} True if path is clear
 */
function isPathClear(x1, y1, x2, y2, obstacles, radius, personalSpaceBuffer) {
    if (!obstacles) return true
    
    const blocking = findBlockingObstacles(x1, y1, x2, y2, obstacles, radius, personalSpaceBuffer)
    return blocking.length === 0
}

/**
 * Find obstacles that block the direct path from start to target
 * @param {number} startX - Start X position
 * @param {number} startY - Start Y position
 * @param {number} targetX - Target X position
 * @param {number} targetY - Target Y position
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @returns {Array} Array of blocking obstacles with expanded bounds
 */
function findBlockingObstacles(startX, startY, targetX, targetY, obstacles, radius, personalSpaceBuffer) {
    const blocking = []
    
    if (!obstacles || !obstacles.obstacles) return blocking
    
    for (const obs of obstacles.obstacles) {
        // Skip security and bus obstacles
        if (obs.type === 'security' || obs.type === 'bus') continue
        
        // Expand obstacle bounds by buffer
        let effectiveBuffer = 0
        if (obs.type === 'foodStall') {
            effectiveBuffer = personalSpaceBuffer
        }
        
        const obsLeft = obs.x - effectiveBuffer
        const obsRight = obs.x + obs.width + effectiveBuffer
        const obsTop = obs.y - effectiveBuffer
        const obsBottom = obs.y + obs.height + effectiveBuffer
        
        // Check if target is within buffer zone (approaching queue)
        const targetNearObstacle = targetX >= obsLeft && targetX <= obsRight && 
                                    targetY >= obsTop && targetY <= obsBottom
        const startNearObstacle = startX >= obsLeft && startX <= obsRight && 
                                   startY >= obsTop && startY <= obsBottom
        
        if (targetNearObstacle && startNearObstacle) {
            continue // Both near same obstacle - not blocking
        }
        
        if (targetNearObstacle) {
            // Target is near obstacle - check if obstacle is between start and target
            const distToTarget = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2))
            const obsCenterX = (obsLeft + obsRight) / 2
            const obsCenterY = (obsTop + obsBottom) / 2
            const distToObs = Math.sqrt(Math.pow(obsCenterX - startX, 2) + Math.pow(obsCenterY - startY, 2))
            
            if (distToTarget < distToObs) {
                continue // Target closer than obstacle - not blocking
            }
            
            if (distToTarget < radius * 2) {
                continue // Very close to target
            }
            
            // Check if obstacle is in path direction
            const toTargetX = targetX - startX
            const toTargetY = targetY - startY
            const toObsX = obsCenterX - startX
            const toObsY = obsCenterY - startY
            
            if (distToTarget > 0 && distToObs > 0) {
                const dotProduct = (toObsX * toTargetX + toObsY * toTargetY) / (distToObs * distToTarget)
                if (dotProduct < 0.5) {
                    continue // Obstacle not in path forward
                }
            }
        }
        
        // Check if line intersects obstacle rectangle
        if (lineIntersectsRectangle(startX, startY, targetX, targetY, obsLeft, obsTop, obsRight, obsBottom)) {
            blocking.push({
                ...obs,
                x: obsLeft,
                y: obsTop,
                width: obsRight - obsLeft,
                height: obsBottom - obsTop
            })
        }
    }
    
    return blocking
}

/**
 * Check if point is inside any obstacle
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Obstacles} obstacles - Obstacles manager
 * @param {number} radius - Agent radius
 * @param {number} personalSpaceBuffer - Personal space buffer
 * @returns {boolean} True if point is inside obstacle
 */
function isPointInsideObstacle(x, y, obstacles, radius, personalSpaceBuffer) {
    if (!obstacles || !obstacles.obstacles) return false
    
    for (const obs of obstacles.obstacles) {
        if (obs.type === 'security' || obs.type === 'bus') continue
        
        let effectiveBuffer = 0
        if (obs.type === 'foodStall') {
            effectiveBuffer = personalSpaceBuffer
        }
        
        const obsLeft = obs.x - effectiveBuffer
        const obsRight = obs.x + obs.width + effectiveBuffer
        const obsTop = obs.y - effectiveBuffer
        const obsBottom = obs.y + obs.height + effectiveBuffer
        
        if (x >= obsLeft && x <= obsRight && y >= obsTop && y <= obsBottom) {
            return true
        }
    }
    
    return false
}

/**
 * Check if line segment intersects rectangle
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @param {number} left - Rectangle left edge
 * @param {number} top - Rectangle top edge
 * @param {number} right - Rectangle right edge
 * @param {number} bottom - Rectangle bottom edge
 * @returns {boolean} True if line intersects rectangle
 */
function lineIntersectsRectangle(x1, y1, x2, y2, left, top, right, bottom) {
    // Check if either endpoint is inside rectangle
    if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
        (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
        return true
    }
    
    // Check if line intersects any of the four edges
    return lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||  // Top edge
           lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) || // Right edge
           lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) || // Bottom edge
           lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom)  // Left edge
}

/**
 * Check if two line segments intersect
 * @param {number} x1 - First line start X
 * @param {number} y1 - First line start Y
 * @param {number} x2 - First line end X
 * @param {number} y2 - First line end Y
 * @param {number} x3 - Second line start X
 * @param {number} y3 - Second line start Y
 * @param {number} x4 - Second line end X
 * @param {number} y4 - Second line end Y
 * @returns {boolean} True if lines intersect
 */
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
    if (denom === 0) return false // Parallel lines
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

/**
 * Initialize waypoint update times for a set of waypoints
 * @param {Array} waypoints - Array of waypoints
 * @param {number} currentTime - Current simulation time
 * @param {Object} config - Configuration object
 * @returns {Array} Array of update times with randomization
 */
export function initializeWaypointUpdateTimes(waypoints, currentTime, config) {
    const updateTimes = []
    const baseInterval = config.BASE_WAYPOINT_UPDATE_INTERVAL || 125
    const randomness = config.WAYPOINT_UPDATE_RANDOMNESS || 50
    
    for (let i = 0; i < waypoints.length; i++) {
        // Add random delay to prevent all fans updating simultaneously
        const randomDelay = Math.random() * randomness
        updateTimes.push(currentTime + randomDelay)
    }
    
    return updateTimes
}

/**
 * Check if waypoints need updating based on elapsed time
 * Only checks the first waypoint (current target) at base interval
 * Updates all subsequent waypoints at doubled intervals
 * @param {Array} waypointUpdateTimes - Array of last update times
 * @param {number} currentTime - Current simulation time
 * @param {Object} config - Configuration object
 * @returns {boolean} True if waypoints need updating
 */
export function shouldUpdateWaypoints(waypointUpdateTimes, currentTime, config) {
    if (!waypointUpdateTimes || waypointUpdateTimes.length === 0) {
        return false
    }
    
    const baseInterval = config.BASE_WAYPOINT_UPDATE_INTERVAL || 125
    const timeSinceUpdate = currentTime - waypointUpdateTimes[0]
    
    return timeSinceUpdate >= baseInterval
}

/**
 * Calculate dynamic waypoint for avoiding other agents
 * Uses local knowledge and 30-degree avoidance angle
 * Updated every frame for responsive agent avoidance
 * @param {Object} agent - The agent doing the avoiding
 * @param {Array} otherAgents - Array of other agents to avoid
 * @param {number} nextTargetX - Next waypoint or final target X
 * @param {number} nextTargetY - Next waypoint or final target Y
 * @param {Obstacles} obstacles - Obstacles manager for validation
 * @param {Object} config - Configuration object
 * @returns {Object|null} Single waypoint object {x, y} or null
 */
export function calculateDynamicFanAvoidance(agent, otherAgents, nextTargetX, nextTargetY, obstacles, config) {
    const MAX_DETECTION_DISTANCE = 100 // Local knowledge limit
    const AVOIDANCE_ANGLE = Math.PI / 6 // 30 degrees - small angle for mostly straight paths
    const MIN_AVOIDANCE_DISTANCE = 20 // Minimum distance to create waypoint
    
    // Direction to next target
    const toTargetDx = nextTargetX - agent.x
    const toTargetDy = nextTargetY - agent.y
    const distToTarget = Math.sqrt(toTargetDx * toTargetDx + toTargetDy * toTargetDy)
    
    if (distToTarget < 5) return null // Already at target
    
    const targetDirX = toTargetDx / distToTarget
    const targetDirY = toTargetDy / distToTarget
    
    // Find agents in the way
    let needsAvoidance = false
    let avoidRight = false
    
    for (const other of otherAgents) {
        if (other === agent) continue
        
        const dx = other.x - agent.x
        const dy = other.y - agent.y
        const distToOther = Math.sqrt(dx * dx + dy * dy)
        
        // Only consider nearby agents (local knowledge)
        if (distToOther > MAX_DETECTION_DISTANCE) continue
        
        // Check if other agent is roughly in our path to target
        const dotProduct = (dx * targetDirX + dy * targetDirY) / distToOther
        
        // Agent is in our way if they're ahead of us (dotProduct > 0.5 means within ~60 degrees)
        // OR if they're very close (within personal space * 2) at any angle
        const inOurPath = dotProduct > 0.5 && distToOther < config.PERSONAL_SPACE * 3
        const veryClose = distToOther < config.PERSONAL_SPACE * 2
        
        if (inOurPath || veryClose) {
            needsAvoidance = true
            
            // Determine if we should avoid right or left
            // Cross product tells us if other agent is to our left or right
            const crossProduct = targetDirX * dy - targetDirY * dx
            
            // Both agents avoid to their right (positive cross = agent on left, avoid right)
            avoidRight = crossProduct > 0
            break
        }
    }
    
    if (!needsAvoidance) return null
    
    // Create a waypoint to the side using 30-degree angle
    const avoidDistance = MIN_AVOIDANCE_DISTANCE
    const angle = avoidRight ? -AVOIDANCE_ANGLE : AVOIDANCE_ANGLE
    
    // Rotate direction vector by avoidance angle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const avoidDirX = targetDirX * cos - targetDirY * sin
    const avoidDirY = targetDirX * sin + targetDirY * cos
    
    // Create waypoint
    const waypointX = agent.x + avoidDirX * avoidDistance
    const waypointY = agent.y + avoidDirY * avoidDistance
    
    // Validate dynamic waypoint isn't inside an obstacle
    if (obstacles) {
        const personalSpaceBuffer = (agent.state === AgentState.APPROACHING_QUEUE || agent.state === AgentState.MOVING) ? 
            config.PERSONAL_SPACE : 0
        
        // Check if waypoint is inside an obstacle
        if (obstacles.checkCollision(waypointX, waypointY, agent.radius, agent.state, personalSpaceBuffer)) {
            return null // Waypoint is inside an obstacle, don't use it
        }
    }
    
    return { x: waypointX, y: waypointY }
}
