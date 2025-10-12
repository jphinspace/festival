import {
    calculateOverlayPosition,
    calculateMaxTextWidth,
    calculateOverlayDimensions,
    calculateStackedItemY,
    calculateCenteredX,
    calculateCenteredY,
    calculateDistributedPositions,
    calculateTextLinePositions,
    clampPosition
} from '../src/utils/positioning.js'

describe('Positioning Utilities', () => {
    describe('calculateOverlayPosition', () => {
        test('places overlay at offset from mouse', () => {
            const result = calculateOverlayPosition(100, 100, 50, 30, 800, 600)
            expect(result.x).toBe(115)
            expect(result.y).toBe(115)
        })

        test('flips overlay left when too close to right edge', () => {
            const result = calculateOverlayPosition(750, 100, 100, 30, 800, 600)
            expect(result.x).toBe(635) // 750 - 100 - 15
            expect(result.y).toBe(115)
        })

        test('flips overlay up when too close to bottom edge', () => {
            const result = calculateOverlayPosition(100, 570, 50, 50, 800, 600)
            expect(result.x).toBe(115)
            expect(result.y).toBe(505) // 570 - 50 - 15
        })

        test('flips both directions when in corner', () => {
            const result = calculateOverlayPosition(750, 570, 100, 50, 800, 600)
            expect(result.x).toBe(635)
            expect(result.y).toBe(505)
        })

        test('respects custom offset', () => {
            const result = calculateOverlayPosition(100, 100, 50, 30, 800, 600, 20)
            expect(result.x).toBe(120)
            expect(result.y).toBe(120)
        })
    })

    describe('calculateMaxTextWidth', () => {
        test('returns maximum width from array', () => {
            const mockCtx = {
                measureText: (text) => ({ width: text.length * 10 })
            }
            const lines = ['short', 'a bit longer', 'tiny']
            expect(calculateMaxTextWidth(mockCtx, lines)).toBe(120)
        })

        test('handles empty array', () => {
            const mockCtx = {
                measureText: (text) => ({ width: text.length * 10 })
            }
            expect(calculateMaxTextWidth(mockCtx, [])).toBe(-Infinity)
        })

        test('handles single line', () => {
            const mockCtx = {
                measureText: (text) => ({ width: text.length * 10 })
            }
            expect(calculateMaxTextWidth(mockCtx, ['hello'])).toBe(50)
        })
    })

    describe('calculateOverlayDimensions', () => {
        test('calculates dimensions with padding', () => {
            const result = calculateOverlayDimensions(100, 5, 10, 14)
            expect(result.width).toBe(120) // 100 + 10*2
            expect(result.height).toBe(90) // 5*14 + 10*2
        })

        test('handles zero padding', () => {
            const result = calculateOverlayDimensions(100, 5, 0, 14)
            expect(result.width).toBe(100)
            expect(result.height).toBe(70)
        })

        test('handles zero lines', () => {
            const result = calculateOverlayDimensions(100, 0, 10, 14)
            expect(result.width).toBe(120)
            expect(result.height).toBe(20)
        })
    })

    describe('calculateStackedItemY', () => {
        test('calculates Y position for stacked items', () => {
            expect(calculateStackedItemY(100, 0, 20)).toBe(100)
            expect(calculateStackedItemY(100, 1, 20)).toBe(120)
            expect(calculateStackedItemY(100, 5, 20)).toBe(200)
        })

        test('handles zero spacing', () => {
            expect(calculateStackedItemY(100, 3, 0)).toBe(100)
        })

        test('handles negative spacing', () => {
            expect(calculateStackedItemY(100, 2, -10)).toBe(80)
        })
    })

    describe('calculateCenteredX', () => {
        test('calculates centered X position', () => {
            expect(calculateCenteredX(0, 100, 20)).toBe(40)
            expect(calculateCenteredX(50, 100, 20)).toBe(90)
        })

        test('handles element wider than container', () => {
            expect(calculateCenteredX(0, 100, 150)).toBe(-25)
        })

        test('handles zero width container', () => {
            expect(calculateCenteredX(0, 0, 20)).toBe(-10)
        })
    })

    describe('calculateCenteredY', () => {
        test('calculates centered Y position', () => {
            expect(calculateCenteredY(0, 100, 20)).toBe(40)
            expect(calculateCenteredY(50, 100, 20)).toBe(90)
        })

        test('handles element taller than container', () => {
            expect(calculateCenteredY(0, 100, 150)).toBe(-25)
        })
    })

    describe('calculateDistributedPositions', () => {
        test('distributes items evenly', () => {
            const result = calculateDistributedPositions(0, 100, 3)
            expect(result).toHaveLength(3)
            expect(result[0]).toBe(25)
            expect(result[1]).toBe(50)
            expect(result[2]).toBe(75)
        })

        test('handles single item', () => {
            const result = calculateDistributedPositions(0, 100, 1)
            expect(result).toHaveLength(1)
            expect(result[0]).toBe(50)
        })

        test('handles zero items', () => {
            const result = calculateDistributedPositions(0, 100, 0)
            expect(result).toEqual([])
        })

        test('handles negative count', () => {
            const result = calculateDistributedPositions(0, 100, -1)
            expect(result).toEqual([])
        })

        test('handles non-zero start position', () => {
            const result = calculateDistributedPositions(50, 150, 2)
            expect(result).toHaveLength(2)
            expect(result[0]).toBeCloseTo(83.33, 1)
            expect(result[1]).toBeCloseTo(116.67, 1)
        })
    })

    describe('calculateTextLinePositions', () => {
        test('calculates positions for multiple lines', () => {
            const result = calculateTextLinePositions(100, 10, 14, 3)
            expect(result).toHaveLength(3)
            expect(result[0]).toBe(124) // 100 + 10 + 14
            expect(result[1]).toBe(138) // 100 + 10 + 28
            expect(result[2]).toBe(152) // 100 + 10 + 42
        })

        test('handles zero lines', () => {
            const result = calculateTextLinePositions(100, 10, 14, 0)
            expect(result).toEqual([])
        })

        test('handles single line', () => {
            const result = calculateTextLinePositions(100, 10, 14, 1)
            expect(result).toHaveLength(1)
            expect(result[0]).toBe(124)
        })
    })

    describe('clampPosition', () => {
        test('clamps position within bounds', () => {
            const result = clampPosition(5, 5, 0, 0, 10, 10)
            expect(result.x).toBe(5)
            expect(result.y).toBe(5)
        })

        test('clamps X to minimum', () => {
            const result = clampPosition(-5, 5, 0, 0, 10, 10)
            expect(result.x).toBe(0)
            expect(result.y).toBe(5)
        })

        test('clamps X to maximum', () => {
            const result = clampPosition(15, 5, 0, 0, 10, 10)
            expect(result.x).toBe(10)
            expect(result.y).toBe(5)
        })

        test('clamps Y to minimum', () => {
            const result = clampPosition(5, -5, 0, 0, 10, 10)
            expect(result.x).toBe(5)
            expect(result.y).toBe(0)
        })

        test('clamps Y to maximum', () => {
            const result = clampPosition(5, 15, 0, 0, 10, 10)
            expect(result.x).toBe(5)
            expect(result.y).toBe(10)
        })

        test('clamps both coordinates', () => {
            const result = clampPosition(-5, 15, 0, 0, 10, 10)
            expect(result.x).toBe(0)
            expect(result.y).toBe(10)
        })
    })
})
