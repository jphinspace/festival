/**
 * Time and timing utilities for simulation
 * Pure functions for time-related calculations
 */

/**
 * Calculate frame delta time in seconds
 * @param {number} currentTime - Current timestamp in milliseconds
 * @param {number} lastTime - Last frame timestamp in milliseconds
 * @returns {number} Delta time in seconds
 */
export function calculateDeltaTime(currentTime, lastTime) {
    return (currentTime - lastTime) / 1000
}

/**
 * Calculate scaled simulation time increment
 * @param {number} deltaTime - Delta time in seconds
 * @param {number} simulationSpeed - Speed multiplier
 * @returns {number} Scaled time increment in milliseconds
 */
export function calculateSimulationTimeIncrement(deltaTime, simulationSpeed) {
    return deltaTime * 1000 * simulationSpeed
}

/**
 * Calculate frame-independent movement distance
 * @param {number} speed - Base speed in pixels per second
 * @param {number} deltaTime - Delta time in seconds
 * @param {number} simulationSpeed - Speed multiplier
 * @returns {number} Movement distance in pixels
 */
export function calculateMovementDistance(speed, deltaTime, simulationSpeed) {
    return speed * deltaTime * simulationSpeed
}

/**
 * Check if enough time has elapsed since a timestamp
 * @param {number} currentTime - Current timestamp
 * @param {number} startTime - Start timestamp
 * @param {number} duration - Duration threshold
 * @returns {boolean} True if duration has elapsed
 */
export function hasElapsed(currentTime, startTime, duration) {
    return (currentTime - startTime) >= duration
}

/**
 * Calculate progress ratio for a timed event
 * @param {number} currentTime - Current timestamp
 * @param {number} startTime - Start timestamp
 * @param {number} duration - Total duration
 * @returns {number} Progress from 0 to 1 (clamped)
 */
export function calculateProgress(currentTime, startTime, duration) {
    if (duration <= 0) return 1
    const elapsed = currentTime - startTime
    return Math.min(1.0, Math.max(0, elapsed / duration))
}

/**
 * Check if a timer should trigger (random interval)
 * @param {number} currentTime - Current timestamp
 * @param {number} lastTriggerTime - Last trigger timestamp
 * @param {number} minInterval - Minimum interval
 * @param {number} maxInterval - Maximum interval
 * @returns {boolean} True if should trigger
 */
export function shouldTriggerRandomInterval(currentTime, lastTriggerTime, minInterval, maxInterval) {
    const interval = minInterval + Math.random() * (maxInterval - minInterval)
    return (currentTime - lastTriggerTime) > interval
}

/**
 * Check if frame rate limiting should skip this frame
 * @param {number} currentTime - Current timestamp
 * @param {number} lastRenderTime - Last render timestamp
 * @param {number} targetFrameTime - Target time between frames in milliseconds
 * @returns {boolean} True if should skip this frame
 */
export function shouldSkipFrame(currentTime, lastRenderTime, targetFrameTime) {
    const timeSinceLastRender = currentTime - lastRenderTime
    return timeSinceLastRender < targetFrameTime
}

/**
 * Check if FPS counter should update
 * @param {number} currentTime - Current timestamp
 * @param {number} lastUpdateTime - Last FPS update timestamp
 * @param {number} updateInterval - Update interval in milliseconds (typically 1000)
 * @returns {boolean} True if should update FPS
 */
export function shouldUpdateFPS(currentTime, lastUpdateTime, updateInterval = 1000) {
    return (currentTime - lastUpdateTime) >= updateInterval
}
