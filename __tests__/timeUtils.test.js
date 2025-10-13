import {
    calculateDeltaTime,
    calculateSimulationTimeIncrement,
    calculateMovementDistance,
    hasElapsed,
    calculateProgress,
    shouldTriggerRandomInterval,
    shouldSkipFrame,
    shouldUpdateFPS
} from '../src/utils/timeUtils.js'

describe('Time Utilities', () => {
    describe('calculateDeltaTime', () => {
        test('calculates delta time in seconds', () => {
            expect(calculateDeltaTime(1500, 1000)).toBe(0.5)
            expect(calculateDeltaTime(2000, 1000)).toBe(1)
        })

        test('handles zero delta', () => {
            expect(calculateDeltaTime(1000, 1000)).toBe(0)
        })

        test('handles small deltas', () => {
            expect(calculateDeltaTime(1016, 1000)).toBeCloseTo(0.016, 5)
        })
    })

    describe('calculateSimulationTimeIncrement', () => {
        test('calculates scaled time increment', () => {
            expect(calculateSimulationTimeIncrement(1, 1)).toBe(1000)
            expect(calculateSimulationTimeIncrement(0.5, 2)).toBe(1000)
        })

        test('handles different speeds', () => {
            expect(calculateSimulationTimeIncrement(1, 10)).toBe(10000)
            expect(calculateSimulationTimeIncrement(0.016, 20)).toBeCloseTo(320, 1)
        })

        test('handles zero delta', () => {
            expect(calculateSimulationTimeIncrement(0, 1)).toBe(0)
        })
    })

    describe('calculateMovementDistance', () => {
        test('calculates frame-independent distance', () => {
            expect(calculateMovementDistance(100, 1, 1)).toBe(100)
            expect(calculateMovementDistance(100, 0.5, 1)).toBe(50)
        })

        test('handles simulation speed multiplier', () => {
            expect(calculateMovementDistance(100, 1, 2)).toBe(200)
            expect(calculateMovementDistance(50, 0.5, 4)).toBe(100)
        })

        test('handles zero values', () => {
            expect(calculateMovementDistance(0, 1, 1)).toBe(0)
            expect(calculateMovementDistance(100, 0, 1)).toBe(0)
            expect(calculateMovementDistance(100, 1, 0)).toBe(0)
        })
    })

    describe('hasElapsed', () => {
        test('returns true when duration has elapsed', () => {
            expect(hasElapsed(2000, 1000, 1000)).toBe(true)
            expect(hasElapsed(2500, 1000, 1000)).toBe(true)
        })

        test('returns false when duration has not elapsed', () => {
            expect(hasElapsed(1500, 1000, 1000)).toBe(false)
        })

        test('handles exact threshold', () => {
            expect(hasElapsed(2000, 1000, 1000)).toBe(true)
        })

        test('handles zero duration', () => {
            expect(hasElapsed(1000, 1000, 0)).toBe(true)
        })
    })

    describe('calculateProgress', () => {
        test('calculates progress ratio', () => {
            expect(calculateProgress(1500, 1000, 1000)).toBe(0.5)
            expect(calculateProgress(1750, 1000, 1000)).toBe(0.75)
        })

        test('clamps progress to 1.0', () => {
            expect(calculateProgress(3000, 1000, 1000)).toBe(1)
        })

        test('clamps progress to 0', () => {
            expect(calculateProgress(500, 1000, 1000)).toBe(0)
        })

        test('handles zero duration', () => {
            expect(calculateProgress(2000, 1000, 0)).toBe(1)
        })

        test('handles exact completion', () => {
            expect(calculateProgress(2000, 1000, 1000)).toBe(1)
        })
    })

    describe('shouldTriggerRandomInterval', () => {
        test('returns false when not enough time has passed', () => {
            // Uses minInterval deterministically
            expect(shouldTriggerRandomInterval(1400, 1000, 1000, 2000)).toBe(false)
        })

        test('returns true when enough time has passed (min interval)', () => {
            // Uses minInterval deterministically
            expect(shouldTriggerRandomInterval(2001, 1000, 1000, 2000)).toBe(true)
        })

        test('handles exact threshold', () => {
            // Uses minInterval deterministically
            expect(shouldTriggerRandomInterval(2000, 1000, 1000, 2000)).toBe(false)
            expect(shouldTriggerRandomInterval(2001, 1000, 1000, 2000)).toBe(true)
        })
    })

    describe('shouldSkipFrame', () => {
        test('returns true when not enough time since last render', () => {
            expect(shouldSkipFrame(1010, 1000, 16.67)).toBe(true)
        })

        test('returns false when enough time has passed', () => {
            expect(shouldSkipFrame(1020, 1000, 16.67)).toBe(false)
        })

        test('handles exact threshold', () => {
            expect(shouldSkipFrame(1017, 1000, 16.67)).toBe(false)
        })

        test('handles zero target frame time', () => {
            expect(shouldSkipFrame(1001, 1000, 0)).toBe(false)
        })
    })

    describe('shouldUpdateFPS', () => {
        test('returns true when interval has passed', () => {
            expect(shouldUpdateFPS(2000, 1000)).toBe(true)
            expect(shouldUpdateFPS(2500, 1000)).toBe(true)
        })

        test('returns false when interval has not passed', () => {
            expect(shouldUpdateFPS(1500, 1000)).toBe(false)
        })

        test('handles exact threshold', () => {
            expect(shouldUpdateFPS(2000, 1000, 1000)).toBe(true)
        })

        test('handles custom interval', () => {
            expect(shouldUpdateFPS(1500, 1000, 500)).toBe(true)
            expect(shouldUpdateFPS(1400, 1000, 500)).toBe(false)
        })
    })
})
