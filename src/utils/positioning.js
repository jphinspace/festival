/**
 * Positioning utilities for UI elements
 * Pure functions for calculating overlay and UI element positions
 */

/**
 * Calculate overlay position that stays within bounds
 * @param {number} mouseX - Mouse X position
 * @param {number} mouseY - Mouse Y position
 * @param {number} overlayWidth - Overlay width
 * @param {number} overlayHeight - Overlay height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} offset - Offset from mouse position (default 15)
 * @returns {{x: number, y: number}} Overlay position
 */
export function calculateOverlayPosition(mouseX, mouseY, overlayWidth, overlayHeight, canvasWidth, canvasHeight, offset = 15) {
    let overlayX = mouseX + offset
    let overlayY = mouseY + offset
    
    // Keep overlay within canvas bounds (flip to left/top if needed)
    if (overlayX + overlayWidth > canvasWidth) {
        overlayX = mouseX - overlayWidth - offset
    }
    if (overlayY + overlayHeight > canvasHeight) {
        overlayY = mouseY - overlayHeight - offset
    }
    
    return { x: overlayX, y: overlayY }
}

/**
 * Calculate maximum text width from array of strings
 * @param {CanvasRenderingContext2D} ctx - Canvas context (for text measurement)
 * @param {string[]} lines - Array of text lines
 * @returns {number} Maximum width
 */
export function calculateMaxTextWidth(ctx, lines) {
    return Math.max(...lines.map(line => ctx.measureText(line).width))
}

/**
 * Calculate overlay dimensions based on content
 * @param {number} maxTextWidth - Maximum text width
 * @param {number} lineCount - Number of lines
 * @param {number} padding - Padding around content
 * @param {number} lineHeight - Height per line
 * @returns {{width: number, height: number}} Overlay dimensions
 */
export function calculateOverlayDimensions(maxTextWidth, lineCount, padding, lineHeight) {
    return {
        width: maxTextWidth + padding * 2,
        height: lineCount * lineHeight + padding * 2
    }
}

/**
 * Calculate position for a vertically stacked item
 * @param {number} baseY - Base Y position
 * @param {number} index - Item index (0-based)
 * @param {number} spacing - Spacing between items
 * @returns {number} Y position for item
 */
export function calculateStackedItemY(baseY, index, spacing) {
    return baseY + (index * spacing)
}

/**
 * Calculate center position for an element
 * @param {number} containerX - Container X position
 * @param {number} containerWidth - Container width
 * @param {number} elementWidth - Element width
 * @returns {number} Centered X position
 */
export function calculateCenteredX(containerX, containerWidth, elementWidth) {
    return containerX + (containerWidth - elementWidth) / 2
}

/**
 * Calculate center position for an element (Y axis)
 * @param {number} containerY - Container Y position
 * @param {number} containerHeight - Container height
 * @param {number} elementHeight - Element height
 * @returns {number} Centered Y position
 */
export function calculateCenteredY(containerY, containerHeight, elementHeight) {
    return containerY + (containerHeight - elementHeight) / 2
}

/**
 * Calculate evenly distributed positions along a range
 * @param {number} startPos - Start position
 * @param {number} endPos - End position
 * @param {number} count - Number of items
 * @returns {number[]} Array of positions
 */
export function calculateDistributedPositions(startPos, endPos, count) {
    if (count <= 0) return []
    if (count === 1) return [(startPos + endPos) / 2]
    
    const spacing = (endPos - startPos) / (count + 1)
    const positions = []
    for (let i = 0; i < count; i++) {
        positions.push(startPos + spacing * (i + 1))
    }
    return positions
}

/**
 * Calculate text line positions within a container
 * @param {number} containerY - Container Y position
 * @param {number} padding - Container padding
 * @param {number} lineHeight - Height per line
 * @param {number} lineCount - Number of lines
 * @returns {number[]} Array of Y positions for each line
 */
export function calculateTextLinePositions(containerY, padding, lineHeight, lineCount) {
    const positions = []
    for (let i = 0; i < lineCount; i++) {
        positions.push(containerY + padding + (i + 1) * lineHeight)
    }
    return positions
}

/**
 * Clamp position within bounds
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} minX - Minimum X
 * @param {number} minY - Minimum Y
 * @param {number} maxX - Maximum X
 * @param {number} maxY - Maximum Y
 * @returns {{x: number, y: number}} Clamped position
 */
export function clampPosition(x, y, minX, minY, maxX, maxY) {
    return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y))
    }
}
