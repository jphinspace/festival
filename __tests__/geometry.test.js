import {
    calculateDistance,
    calculateDistanceFromDeltas,
    normalizeVector,
    calculatePerpendicularVector,
    moveInDirection,
    isWithinDistance,
    positionWithAngularOffset,
    clamp
} from '../src/utils/geometry.js'

describe('Geometry Utilities', () => {
    describe('calculateDistance', () => {
        test('calculates distance between two points', () => {
            expect(calculateDistance(0, 0, 3, 4)).toBe(5)
            expect(calculateDistance(0, 0, 0, 0)).toBe(0)
            expect(calculateDistance(-5, -5, -2, -1)).toBeCloseTo(5, 5)
        })

        test('handles negative coordinates', () => {
            expect(calculateDistance(-3, -4, 0, 0)).toBe(5)
        })
    })

    describe('calculateDistanceFromDeltas', () => {
        test('calculates distance from delta values', () => {
            expect(calculateDistanceFromDeltas(3, 4)).toBe(5)
            expect(calculateDistanceFromDeltas(0, 0)).toBe(0)
            expect(calculateDistanceFromDeltas(-3, 4)).toBe(5)
        })
    })

    describe('normalizeVector', () => {
        test('normalizes non-zero vector', () => {
            const result = normalizeVector(3, 4)
            expect(result.x).toBeCloseTo(0.6, 5)
            expect(result.y).toBeCloseTo(0.8, 5)
        })

        test('handles zero vector', () => {
            const result = normalizeVector(0, 0)
            expect(result.x).toBe(0)
            expect(result.y).toBe(0)
        })

        test('normalizes unit vector', () => {
            const result = normalizeVector(1, 0)
            expect(result.x).toBeCloseTo(1, 5)
            expect(result.y).toBeCloseTo(0, 5)
        })
    })

    describe('calculatePerpendicularVector', () => {
        test('calculates perpendicular vector', () => {
            const result = calculatePerpendicularVector(1, 0)
            expect(result.x).toBeCloseTo(0, 5)
            expect(result.y).toBe(1)
        })

        test('handles vertical vector', () => {
            const result = calculatePerpendicularVector(0, 1)
            expect(result.x).toBe(-1)
            expect(result.y).toBeCloseTo(0, 5)
        })

        test('handles zero vector', () => {
            const result = calculatePerpendicularVector(0, 0)
            expect(result.x).toBeCloseTo(0, 5)
            expect(result.y).toBeCloseTo(0, 5)
        })
    })

    describe('moveInDirection', () => {
        test('moves point in normalized direction', () => {
            const result = moveInDirection(0, 0, 1, 0, 10)
            expect(result.x).toBe(10)
            expect(result.y).toBe(0)
        })

        test('moves point in diagonal direction', () => {
            const result = moveInDirection(0, 0, 0.6, 0.8, 5)
            expect(result.x).toBeCloseTo(3, 5)
            expect(result.y).toBeCloseTo(4, 5)
        })

        test('handles negative distance', () => {
            const result = moveInDirection(5, 5, 1, 0, -3)
            expect(result.x).toBe(2)
            expect(result.y).toBe(5)
        })
    })

    describe('isWithinDistance', () => {
        test('returns true when within threshold', () => {
            expect(isWithinDistance(0, 0, 3, 4, 10)).toBe(true)
            expect(isWithinDistance(0, 0, 3, 4, 5)).toBe(false)
        })

        test('handles exact threshold distance', () => {
            expect(isWithinDistance(0, 0, 3, 4, 5)).toBe(false)
        })

        test('handles zero distance', () => {
            expect(isWithinDistance(5, 5, 5, 5, 0)).toBe(false)
            expect(isWithinDistance(5, 5, 5, 5, 1)).toBe(true)
        })
    })

    describe('positionWithAngularOffset', () => {
        test('calculates position with no offset', () => {
            const result = positionWithAngularOffset(0, 0, 1, 0, 10, 0)
            expect(result.x).toBeCloseTo(10, 5)
            expect(result.y).toBeCloseTo(0, 5)
        })

        test('calculates position with 90 degree offset', () => {
            const result = positionWithAngularOffset(0, 0, 1, 0, 10, 90)
            expect(result.x).toBeCloseTo(0, 5)
            expect(result.y).toBeCloseTo(10, 5)
        })

        test('calculates position with negative offset', () => {
            const result = positionWithAngularOffset(0, 0, 1, 0, 10, -90)
            expect(result.x).toBeCloseTo(0, 5)
            expect(result.y).toBeCloseTo(-10, 5)
        })

        test('calculates position with 45 degree offset', () => {
            const result = positionWithAngularOffset(0, 0, 1, 0, 10, 45)
            expect(result.x).toBeCloseTo(7.071, 2)
            expect(result.y).toBeCloseTo(7.071, 2)
        })
    })

    describe('clamp', () => {
        test('clamps value above max', () => {
            expect(clamp(15, 0, 10)).toBe(10)
        })

        test('clamps value below min', () => {
            expect(clamp(-5, 0, 10)).toBe(0)
        })

        test('returns value within range', () => {
            expect(clamp(5, 0, 10)).toBe(5)
        })

        test('handles value equal to min', () => {
            expect(clamp(0, 0, 10)).toBe(0)
        })

        test('handles value equal to max', () => {
            expect(clamp(10, 0, 10)).toBe(10)
        })

        test('handles negative range', () => {
            expect(clamp(-5, -10, -2)).toBe(-5)
            expect(clamp(-15, -10, -2)).toBe(-10)
            expect(clamp(0, -10, -2)).toBe(-2)
        })
    })
})
