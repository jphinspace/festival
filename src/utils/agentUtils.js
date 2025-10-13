/**
 * Agent behavior utilities
 * Pure functions for agent-related calculations and decisions
 */

/**
 * Calculate personal space between two agents based on context
 * @param {Object} agent1 - First agent
 * @param {Object} agent2 - Second agent
 * @param {Object} config - Configuration object
 * @returns {number} Personal space distance in pixels
 */
export function calculatePersonalSpace(agent1, agent2, config) {
    // Both agents watching concert and up front (packed crowd)
    if (agent1.currentShow && agent2.currentShow && 
        agent1.isUpFront && agent2.isUpFront) {
        return config.CONCERT_PERSONAL_SPACE
    }
    
    // One agent passing through while other is in queue
    const agent1PassingThrough = (agent1.state === 'moving' || agent1.state === 'idle') && !agent1.inQueue
    const agent2InQueue = agent2.inQueue || agent2.state === 'in_queue' || agent2.state === 'approaching_queue'
    const agent2PassingThrough = (agent2.state === 'moving' || agent2.state === 'idle') && !agent2.inQueue
    const agent1InQueue = agent1.inQueue || agent1.state === 'in_queue' || agent1.state === 'approaching_queue'
    
    if ((agent1PassingThrough && agent2InQueue) || (agent2PassingThrough && agent1InQueue)) {
        return config.CONCERT_PERSONAL_SPACE
    }
    
    return config.PERSONAL_SPACE
}

/**
 * Determine if agents should allow temporary overlap while moving
 * @param {Object} agent1 - First agent
 * @param {Object} agent2 - Second agent
 * @returns {boolean} True if temporary overlap is allowed
 */
export function shouldAllowMovingOverlap(agent1, agent2) {
    const agent1Moving = isAgentMoving(agent1)
    const agent2Moving = isAgentMoving(agent2)
    return agent1Moving && agent2Moving
}

/**
 * Check if agent is currently moving (helper for overlap check)
 * @param {Object} agent - Agent to check
 * @returns {boolean} True if agent is moving
 */
function isAgentMoving(agent) {
    return agent.state === 'moving' || 
           agent.state === 'approaching_queue' || 
           agent.state === 'in_queue_advancing' || 
           agent.state === 'returning_to_queue'
}

/**
 * Calculate hunger increase amount
 * @param {number} baseRate - Base hunger increase rate
 * @param {number} deltaTime - Time delta in seconds
 * @param {number} simulationSpeed - Simulation speed multiplier
 * @returns {number} Hunger increase amount
 */
export function calculateHungerIncrease(baseRate, deltaTime, simulationSpeed) {
    return baseRate * deltaTime * simulationSpeed
}

/**
 * Determine if fan should get food
 * @param {number} hunger - Current hunger level (0-1)
 * @param {number} hungerThreshold - Hunger threshold
 * @param {boolean} inQueue - Whether in a queue
 * @param {boolean} hasCurrentShow - Whether watching a show
 * @param {string} state - Current state
 * @returns {boolean} True if should get food
 */
export function shouldGetFood(hunger, hungerThreshold, inQueue, hasCurrentShow, state) {
    if (inQueue || hasCurrentShow) return false
    if (state !== 'passed_security' && state !== 'idle' && state !== 'moving') return false
    return hunger > hungerThreshold
}

/**
 * Determine if fan should attend a stage
 * @param {string} fanPreference - Fan's stage preference ('left', 'right', 'none')
 * @param {string} stageName - Stage name ('left' or 'right')
 * @param {string} currentShow - Fan's current show (if any)
 * @returns {boolean} True if should attend
 */
export function shouldAttendStage(fanPreference, stageName, currentShow) {
    if (fanPreference === stageName) {
        // Preferred stage - attend if not already watching it
        return currentShow !== stageName
    } else if (fanPreference === 'none' && !currentShow) {
        // No preference and not watching another show
        return true
    }
    return false
}

/**
 * Determine if fan should be positioned up front at stage
 * Always returns false (deterministic behavior - no fans go up front)
 * @returns {boolean} Always false
 */
export function shouldBeUpFront() {
    return false
}

/**
 * Calculate target position for stage attendance (deterministic - center position)
 * @param {number} stageX - Stage X position
 * @param {number} baseY - Base Y position
 * @param {number} spreadY - Y spread range
 * @param {boolean} isUpFront - Whether fan is up front
 * @returns {{x: number, y: number}} Target position
 */
export function calculateStagePosition(stageX, baseY, spreadY, isUpFront) {
    const x = stageX // Center position, no randomization
    const y = baseY + (spreadY / 2) // Middle of spread range
    return { x, y }
}

/**
 * Determine if fan can leave festival
 * @param {boolean} hasSeenShow - Whether fan has seen a show
 * @param {boolean} hasEatenFood - Whether fan has eaten
 * @param {boolean} inQueue - Whether in a queue
 * @param {string} state - Current state
 * @returns {boolean} True if can leave
 */
export function canLeaveFestival(hasSeenShow, hasEatenFood, inQueue, state) {
    return hasSeenShow && hasEatenFood && !inQueue && state !== 'leaving'
}


