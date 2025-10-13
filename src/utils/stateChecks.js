/**
 * Agent state checking utilities
 * Pure functions for agent state conditions
 */
import { AgentState } from './enums.js'

/**
 * Check if agent is in a moving state
 * @param {string} state - Agent state
 * @returns {boolean} True if agent is moving
 */
export function isMovingState(state) {
    return state === AgentState.MOVING || 
           state === AgentState.APPROACHING_QUEUE || 
           state === AgentState.IN_QUEUE_ADVANCING || 
           state === AgentState.RETURNING_TO_QUEUE
}

/**
 * Check if agent needs pathfinding based on state
 * @param {string} state - Agent state
 * @returns {boolean} True if pathfinding is needed
 */
export function needsPathfinding(state) {
    return state === AgentState.MOVING || 
           state === AgentState.APPROACHING_QUEUE || 
           state === AgentState.IDLE
}

/**
 * Check if agent should transition to idle when reaching target
 * @param {string} state - Agent state
 * @returns {boolean} True if should transition to idle
 */
export function shouldTransitionToIdle(state) {
    return state === AgentState.MOVING
}

/**
 * Check if agent is allowed to move (not in restricted state)
 * @param {string} state - Agent state
 * @returns {boolean} True if movement is allowed
 */
export function canMove(state) {
    return isMovingState(state)
}

/**
 * Check if agent should use personal space buffer (for obstacle avoidance)
 * @param {string} state - Agent state
 * @returns {boolean} True if personal space buffer should be used
 */
export function shouldUsePersonalSpaceBuffer(state) {
    return state === AgentState.APPROACHING_QUEUE || 
           state === AgentState.MOVING
}

/**
 * Check if agent has passed security
 * @param {string} state - Agent state
 * @returns {boolean} True if agent has passed security
 */
export function hasPassedSecurity(state) {
    return state === AgentState.PASSED_SECURITY || 
           state === AgentState.IDLE || 
           state === AgentState.MOVING
}

/**
 * Check if agent is leaving the festival
 * @param {string} state - Agent state
 * @returns {boolean} True if agent is leaving
 */
export function isLeaving(state) {
    return state === AgentState.LEAVING
}

/**
 * Check if agent should wander when idle
 * @param {string} state - Agent state
 * @param {boolean} hasCurrentShow - Whether watching a show
 * @param {boolean} inQueue - Whether in a queue
 * @returns {boolean} True if should wander
 */
export function shouldWander(state, hasCurrentShow, inQueue) {
    return state === AgentState.IDLE && 
           !hasCurrentShow && 
           !inQueue && 
           !isLeaving(state)
}
