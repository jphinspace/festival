import {
    calculatePersonalSpace,
    shouldAllowMovingOverlap,
    calculateHungerIncrease,
    shouldGetFood,
    shouldAttendStage,
    shouldBeUpFront,
    calculateStagePosition,
    canLeaveFestival
} from '../src/utils/agentUtils.js'

describe('Agent Utilities', () => {
    const mockConfig = {
        CONCERT_PERSONAL_SPACE: 10,
        PERSONAL_SPACE: 20
    }

    describe('calculatePersonalSpace', () => {
        test('returns concert spacing for up-front fans', () => {
            const agent1 = { currentShow: 'left', isUpFront: true, state: 'idle', inQueue: false }
            const agent2 = { currentShow: 'left', isUpFront: true, state: 'idle', inQueue: false }
            expect(calculatePersonalSpace(agent1, agent2, mockConfig)).toBe(10)
        })

        test('returns normal spacing when not both up-front', () => {
            const agent1 = { currentShow: 'left', isUpFront: false, state: 'idle', inQueue: false }
            const agent2 = { currentShow: 'left', isUpFront: true, state: 'idle', inQueue: false }
            expect(calculatePersonalSpace(agent1, agent2, mockConfig)).toBe(20)
        })

        test('returns concert spacing when one passing through queue', () => {
            const agent1 = { state: 'moving', inQueue: false, currentShow: null, isUpFront: false }
            const agent2 = { state: 'in_queue', inQueue: true, currentShow: null, isUpFront: false }
            expect(calculatePersonalSpace(agent1, agent2, mockConfig)).toBe(10)
        })

        test('returns normal spacing in normal situation', () => {
            const agent1 = { state: 'moving', inQueue: false, currentShow: null, isUpFront: false }
            const agent2 = { state: 'moving', inQueue: false, currentShow: null, isUpFront: false }
            expect(calculatePersonalSpace(agent1, agent2, mockConfig)).toBe(20)
        })
    })

    describe('shouldAllowMovingOverlap', () => {
        test('returns true when both agents moving', () => {
            const agent1 = { state: 'moving' }
            const agent2 = { state: 'moving' }
            expect(shouldAllowMovingOverlap(agent1, agent2)).toBe(true)
        })

        test('returns false when one agent stationary', () => {
            const agent1 = { state: 'moving' }
            const agent2 = { state: 'idle' }
            expect(shouldAllowMovingOverlap(agent1, agent2)).toBe(false)
        })

        test('returns false when both agents stationary', () => {
            const agent1 = { state: 'idle' }
            const agent2 = { state: 'idle' }
            expect(shouldAllowMovingOverlap(agent1, agent2)).toBe(false)
        })
    })

    describe('calculateHungerIncrease', () => {
        test('calculates hunger increase', () => {
            expect(calculateHungerIncrease(0.01, 1, 1)).toBeCloseTo(0.01, 5)
            expect(calculateHungerIncrease(0.01, 2, 1)).toBeCloseTo(0.02, 5)
        })

        test('scales with simulation speed', () => {
            expect(calculateHungerIncrease(0.01, 1, 2)).toBeCloseTo(0.02, 5)
            expect(calculateHungerIncrease(0.01, 0.5, 4)).toBeCloseTo(0.02, 5)
        })

        test('handles zero values', () => {
            expect(calculateHungerIncrease(0, 1, 1)).toBe(0)
            expect(calculateHungerIncrease(0.01, 0, 1)).toBe(0)
        })
    })

    describe('shouldGetFood', () => {
        test('returns true when hungry and conditions met', () => {
            expect(shouldGetFood(0.9, 0.8, false, false, 'passed_security')).toBe(true)
            expect(shouldGetFood(0.9, 0.8, false, false, 'idle')).toBe(true)
            expect(shouldGetFood(0.9, 0.8, false, false, 'moving')).toBe(true)
        })

        test('returns false when in queue', () => {
            expect(shouldGetFood(0.9, 0.8, true, false, 'passed_security')).toBe(false)
        })

        test('returns false when watching show', () => {
            expect(shouldGetFood(0.9, 0.8, false, true, 'passed_security')).toBe(false)
        })

        test('returns false when not hungry enough', () => {
            expect(shouldGetFood(0.7, 0.8, false, false, 'passed_security')).toBe(false)
        })

        test('returns false when not in valid state', () => {
            expect(shouldGetFood(0.9, 0.8, false, false, 'being_checked')).toBe(false)
        })
    })

    describe('shouldAttendStage', () => {
        test('returns true for preferred stage not currently watching', () => {
            expect(shouldAttendStage('left', 'left', null)).toBe(true)
            expect(shouldAttendStage('right', 'right', null)).toBe(true)
        })

        test('returns false for preferred stage already watching', () => {
            expect(shouldAttendStage('left', 'left', 'left')).toBe(false)
        })

        test('returns true for no preference and not watching', () => {
            expect(shouldAttendStage('none', 'left', null)).toBe(true)
            expect(shouldAttendStage('none', 'right', null)).toBe(true)
        })

        test('returns false for no preference but watching another show', () => {
            expect(shouldAttendStage('none', 'left', 'right')).toBe(false)
        })

        test('returns false for non-preferred stage', () => {
            expect(shouldAttendStage('left', 'right', null)).toBe(false)
            expect(shouldAttendStage('right', 'left', null)).toBe(false)
        })
    })

    describe('shouldBeUpFront', () => {
        test('returns boolean based on probability', () => {
            const originalRandom = Math.random
            
            Math.random = () => 0.1
            expect(shouldBeUpFront(0.2)).toBe(true)
            
            Math.random = () => 0.3
            expect(shouldBeUpFront(0.2)).toBe(false)
            
            Math.random = originalRandom
        })

        test('uses default probability if not provided', () => {
            const originalRandom = Math.random
            
            Math.random = () => 0.15
            expect(shouldBeUpFront()).toBe(true)
            
            Math.random = originalRandom
        })
    })

    describe('calculateStagePosition', () => {
        test('calculates up-front position with smaller spread', () => {
            const originalRandom = Math.random
            Math.random = () => 0.5
            
            const result = calculateStagePosition(100, 50, 100, true)
            expect(result.x).toBe(100) // 100 + (0.5 - 0.5) * 40
            expect(result.y).toBe(100) // 50 + 0.5 * 100
            
            Math.random = originalRandom
        })

        test('calculates back position with larger spread', () => {
            const originalRandom = Math.random
            Math.random = () => 0.5
            
            const result = calculateStagePosition(100, 50, 100, false)
            expect(result.x).toBe(100) // 100 + (0.5 - 0.5) * 150
            expect(result.y).toBe(100) // 50 + 0.5 * 100
            
            Math.random = originalRandom
        })
    })

    describe('canLeaveFestival', () => {
        test('returns true when all conditions met', () => {
            expect(canLeaveFestival(true, true, false, 'idle')).toBe(true)
        })

        test('returns false when not seen show', () => {
            expect(canLeaveFestival(false, true, false, 'idle')).toBe(false)
        })

        test('returns false when not eaten', () => {
            expect(canLeaveFestival(true, false, false, 'idle')).toBe(false)
        })

        test('returns false when in queue', () => {
            expect(canLeaveFestival(true, true, true, 'idle')).toBe(false)
        })

        test('returns false when already leaving', () => {
            expect(canLeaveFestival(true, true, false, 'leaving')).toBe(false)
        })
    })
})
