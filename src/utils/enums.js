/**
 * Enums for festival simulation
 * Provides type-safe values for agent states, stage preferences, and other string properties
 */

/**
 * Agent state values
 * Represents the various states an agent can be in during the simulation
 */
export const AgentState = Object.freeze({
    IDLE: 'idle',
    MOVING: 'moving',
    LEAVING: 'leaving',
    IN_QUEUE_WAITING: 'in_queue_waiting',
    IN_QUEUE_ADVANCING: 'in_queue_advancing',
    APPROACHING_QUEUE: 'approaching_queue',
    PROCESSING: 'processing',
    RETURNING_TO_QUEUE: 'returning_to_queue',
    IN_QUEUE: 'in_queue',
    BEING_CHECKED: 'being_checked',
    PASSED_SECURITY: 'passed_security'
});

/**
 * Stage preference values
 * Represents which stage a fan prefers to watch
 */
export const StagePreference = Object.freeze({
    LEFT: 'left',
    RIGHT: 'right',
    NONE: 'none'
});

/**
 * Queue side values for food stalls
 * Represents which side of a food stall a fan is queuing on
 */
export const QueueSide = Object.freeze({
    LEFT: 'left',
    RIGHT: 'right'
});

/**
 * Goal values for fan intent tracking
 * Represents what a fan is trying to accomplish (used in debug tooltips)
 */
export const FanGoal = Object.freeze({
    EXPLORING: 'exploring',
    SECURITY: 'security (re-check)',
    EXPLORING_FESTIVAL: 'exploring festival'
});
