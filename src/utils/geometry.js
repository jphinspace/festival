/**
 * Geometry utilities for distance and position calculations
 * Pure functions for reusable geometric operations
 */

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - First point X coordinate
 * @param {number} y1 - First point Y coordinate
 * @param {number} x2 - Second point X coordinate
 * @param {number} y2 - Second point Y coordinate
 * @returns {number} Distance between the points
 */
export function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate distance between two points given as delta values
 * @param {number} dx - Delta X
 * @param {number} dy - Delta Y
 * @returns {number} Distance
 */
export function calculateDistanceFromDeltas(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Normalize a 2D vector
 * @param {number} dx - X component
 * @param {number} dy - Y component
 * @returns {{x: number, y: number}} Normalized vector, or {x: 0, y: 0} if input is zero vector
 */
export function normalizeVector(dx, dy) {
    const distance = calculateDistanceFromDeltas(dx, dy)
    if (distance === 0) {
        return { x: 0, y: 0 }
    }
    return {
        x: dx / distance,
        y: dy / distance
    }
}

/**
 * Calculate perpendicular vector (rotated 90 degrees counter-clockwise)
 * @param {number} dx - X component
 * @param {number} dy - Y component
 * @returns {{x: number, y: number}} Perpendicular vector
 */
export function calculatePerpendicularVector(dx, dy) {
    return {
        x: -dy,
        y: dx
    }
}

/**
 * Calculate position moved from a point in a direction by a distance
 * @param {number} x - Starting X position
 * @param {number} y - Starting Y position
 * @param {number} dirX - Direction X (should be normalized)
 * @param {number} dirY - Direction Y (should be normalized)
 * @param {number} distance - Distance to move
 * @returns {{x: number, y: number}} New position
 */
export function moveInDirection(x, y, dirX, dirY, distance) {
    return {
        x: x + dirX * distance,
        y: y + dirY * distance
    }
}

/**
 * Check if a point is within a threshold distance of a target
 * @param {number} x - Point X coordinate
 * @param {number} y - Point Y coordinate
 * @param {number} targetX - Target X coordinate
 * @param {number} targetY - Target Y coordinate
 * @param {number} threshold - Distance threshold
 * @returns {boolean} True if within threshold
 */
export function isWithinDistance(x, y, targetX, targetY, threshold) {
    const distance = calculateDistance(x, y, targetX, targetY)
    return distance < threshold
}

/**
 * Calculate position along a line segment at a given distance from start
 * @param {number} startX - Start X coordinate
 * @param {number} startY - Start Y coordinate
 * @param {number} endX - End X coordinate
 * @param {number} endY - End Y coordinate
 * @param {number} distance - Distance from start
 * @returns {{x: number, y: number}} Position along the line
 */
export function positionAlongLine(startX, startY, endX, endY, distance) {
    const dx = endX - startX
    const dy = endY - startY
    const lineLength = calculateDistanceFromDeltas(dx, dy)
    
    if (lineLength === 0) {
        return { x: startX, y: startY }
    }
    
    const t = Math.min(1, distance / lineLength)
    return {
        x: startX + dx * t,
        y: startY + dy * t
    }
}

/**
 * Calculate angle position on a circle (for avoidance strategies)
 * @param {number} centerX - Circle center X
 * @param {number} centerY - Circle center Y
 * @param {number} radius - Circle radius
 * @param {number} angleDegrees - Angle in degrees (0 = right, 90 = up)
 * @returns {{x: number, y: number}} Position on circle
 */
export function positionOnCircle(centerX, centerY, radius, angleDegrees) {
    const angleRadians = (angleDegrees * Math.PI) / 180
    return {
        x: centerX + radius * Math.cos(angleRadians),
        y: centerY + radius * Math.sin(angleRadians)
    }
}

/**
 * Calculate position with angular offset from a direction
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} dirX - Base direction X (normalized)
 * @param {number} dirY - Base direction Y (normalized)
 * @param {number} distance - Distance to move
 * @param {number} angleOffsetDegrees - Angle offset in degrees (positive = counter-clockwise)
 * @returns {{x: number, y: number}} New position
 */
export function positionWithAngularOffset(startX, startY, dirX, dirY, distance, angleOffsetDegrees) {
    const angleRadians = (angleOffsetDegrees * Math.PI) / 180
    const cosAngle = Math.cos(angleRadians)
    const sinAngle = Math.sin(angleRadians)
    
    // Rotate direction vector
    const rotatedDirX = dirX * cosAngle - dirY * sinAngle
    const rotatedDirY = dirX * sinAngle + dirY * cosAngle
    
    return moveInDirection(startX, startY, rotatedDirX, rotatedDirY, distance)
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}
