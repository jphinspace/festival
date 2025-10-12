import {
    isMovingState,
    isStationaryState,
    isInQueueState,
    isProcessingState,
    needsPathfinding,
    shouldTransitionToIdle,
    canMove,
    shouldUsePersonalSpaceBuffer,
    hasPassedSecurity,
    isLeaving,
    canAttendShow,
    shouldWander
} from '../src/utils/stateChecks.js'
import { AgentState } from '../src/utils/enums.js'

describe('State Checking Utilities', () => {
    describe('isMovingState', () => {
        test('returns true for moving states', () => {
            expect(isMovingState(AgentState.MOVING)).toBe(true)
            expect(isMovingState(AgentState.APPROACHING_QUEUE)).toBe(true)
            expect(isMovingState(AgentState.IN_QUEUE_ADVANCING)).toBe(true)
            expect(isMovingState(AgentState.RETURNING_TO_QUEUE)).toBe(true)
        })

        test('returns false for stationary states', () => {
            expect(isMovingState(AgentState.IDLE)).toBe(false)
            expect(isMovingState(AgentState.IN_QUEUE_WAITING)).toBe(false)
            expect(isMovingState(AgentState.PROCESSING)).toBe(false)
        })
    })

    describe('isStationaryState', () => {
        test('returns true for stationary states', () => {
            expect(isStationaryState(AgentState.IN_QUEUE_WAITING)).toBe(true)
            expect(isStationaryState(AgentState.PROCESSING)).toBe(true)
            expect(isStationaryState(AgentState.IDLE)).toBe(true)
            expect(isStationaryState(AgentState.BEING_CHECKED)).toBe(true)
        })

        test('returns false for moving states', () => {
            expect(isStationaryState(AgentState.MOVING)).toBe(false)
            expect(isStationaryState(AgentState.APPROACHING_QUEUE)).toBe(false)
        })
    })

    describe('isInQueueState', () => {
        test('returns true for queue states', () => {
            expect(isInQueueState(AgentState.IN_QUEUE_WAITING)).toBe(true)
            expect(isInQueueState(AgentState.IN_QUEUE_ADVANCING)).toBe(true)
            expect(isInQueueState(AgentState.APPROACHING_QUEUE)).toBe(true)
        })

        test('returns false for non-queue states', () => {
            expect(isInQueueState(AgentState.IDLE)).toBe(false)
            expect(isInQueueState(AgentState.MOVING)).toBe(false)
            expect(isInQueueState(AgentState.PROCESSING)).toBe(false)
        })
    })

    describe('isProcessingState', () => {
        test('returns true for processing states', () => {
            expect(isProcessingState(AgentState.PROCESSING)).toBe(true)
            expect(isProcessingState(AgentState.BEING_CHECKED)).toBe(true)
        })

        test('returns false for non-processing states', () => {
            expect(isProcessingState(AgentState.IDLE)).toBe(false)
            expect(isProcessingState(AgentState.MOVING)).toBe(false)
            expect(isProcessingState(AgentState.IN_QUEUE_WAITING)).toBe(false)
        })
    })

    describe('needsPathfinding', () => {
        test('returns true for states needing pathfinding', () => {
            expect(needsPathfinding(AgentState.MOVING)).toBe(true)
            expect(needsPathfinding(AgentState.APPROACHING_QUEUE)).toBe(true)
            expect(needsPathfinding(AgentState.IDLE)).toBe(true)
        })

        test('returns false for states not needing pathfinding', () => {
            expect(needsPathfinding(AgentState.IN_QUEUE_WAITING)).toBe(false)
            expect(needsPathfinding(AgentState.PROCESSING)).toBe(false)
            expect(needsPathfinding(AgentState.BEING_CHECKED)).toBe(false)
        })
    })

    describe('shouldTransitionToIdle', () => {
        test('returns true for MOVING state', () => {
            expect(shouldTransitionToIdle(AgentState.MOVING)).toBe(true)
        })

        test('returns false for other states', () => {
            expect(shouldTransitionToIdle(AgentState.IDLE)).toBe(false)
            expect(shouldTransitionToIdle(AgentState.IN_QUEUE_WAITING)).toBe(false)
            expect(shouldTransitionToIdle(AgentState.APPROACHING_QUEUE)).toBe(false)
        })
    })

    describe('canMove', () => {
        test('returns true for moving states', () => {
            expect(canMove(AgentState.MOVING)).toBe(true)
            expect(canMove(AgentState.APPROACHING_QUEUE)).toBe(true)
            expect(canMove(AgentState.IN_QUEUE_ADVANCING)).toBe(true)
        })

        test('returns false for stationary states', () => {
            expect(canMove(AgentState.IDLE)).toBe(false)
            expect(canMove(AgentState.IN_QUEUE_WAITING)).toBe(false)
        })
    })

    describe('shouldUsePersonalSpaceBuffer', () => {
        test('returns true for states needing buffer', () => {
            expect(shouldUsePersonalSpaceBuffer(AgentState.APPROACHING_QUEUE)).toBe(true)
            expect(shouldUsePersonalSpaceBuffer(AgentState.MOVING)).toBe(true)
        })

        test('returns false for states not needing buffer', () => {
            expect(shouldUsePersonalSpaceBuffer(AgentState.IDLE)).toBe(false)
            expect(shouldUsePersonalSpaceBuffer(AgentState.IN_QUEUE_WAITING)).toBe(false)
        })
    })

    describe('hasPassedSecurity', () => {
        test('returns true for post-security states', () => {
            expect(hasPassedSecurity(AgentState.PASSED_SECURITY)).toBe(true)
            expect(hasPassedSecurity(AgentState.IDLE)).toBe(true)
            expect(hasPassedSecurity(AgentState.MOVING)).toBe(true)
        })

        test('returns false for pre-security states', () => {
            expect(hasPassedSecurity(AgentState.IN_QUEUE_WAITING)).toBe(false)
            expect(hasPassedSecurity(AgentState.APPROACHING_QUEUE)).toBe(false)
            expect(hasPassedSecurity(AgentState.BEING_CHECKED)).toBe(false)
        })
    })

    describe('isLeaving', () => {
        test('returns true for LEAVING state', () => {
            expect(isLeaving(AgentState.LEAVING)).toBe(true)
        })

        test('returns false for other states', () => {
            expect(isLeaving(AgentState.IDLE)).toBe(false)
            expect(isLeaving(AgentState.MOVING)).toBe(false)
        })
    })

    describe('canAttendShow', () => {
        test('returns true when conditions are met', () => {
            expect(canAttendShow(AgentState.PASSED_SECURITY, false)).toBe(true)
            expect(canAttendShow(AgentState.IDLE, false)).toBe(true)
            expect(canAttendShow(AgentState.MOVING, false)).toBe(true)
        })

        test('returns false when in queue', () => {
            expect(canAttendShow(AgentState.PASSED_SECURITY, true)).toBe(false)
        })

        test('returns false when leaving', () => {
            expect(canAttendShow(AgentState.LEAVING, false)).toBe(false)
        })

        test('returns false when not passed security', () => {
            expect(canAttendShow(AgentState.IN_QUEUE_WAITING, false)).toBe(false)
            expect(canAttendShow(AgentState.BEING_CHECKED, false)).toBe(false)
        })
    })

    describe('shouldWander', () => {
        test('returns true when all conditions met', () => {
            expect(shouldWander(AgentState.IDLE, false, false)).toBe(true)
        })

        test('returns false when not idle', () => {
            expect(shouldWander(AgentState.MOVING, false, false)).toBe(false)
        })

        test('returns false when watching show', () => {
            expect(shouldWander(AgentState.IDLE, true, false)).toBe(false)
        })

        test('returns false when in queue', () => {
            expect(shouldWander(AgentState.IDLE, false, true)).toBe(false)
        })

        test('returns false when leaving', () => {
            expect(shouldWander(AgentState.LEAVING, false, false)).toBe(false)
        })
    })
})
