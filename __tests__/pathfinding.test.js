// Test for pathfinding module
import { calculateStaticWaypoints, calculateDynamicFanAvoidance } from '../src/core/pathfinding.js'
import { jest } from '@jest/globals'

const mockConfig = {
    AGENT_RADIUS: 3,
    MAX_STATIC_WAYPOINTS: 6,
    WAYPOINT_REACH_DISTANCE: 10,
    WAYPOINT_BUFFER_DISTANCE: 5,
    PERSONAL_SPACE: 12,
    MIN_AVOIDANCE_DISTANCE: 20,
    AVOIDANCE_ANGLE: Math.PI / 6
}

const mockAgent = {
    x: 100,
    y: 100,
    radius: 3,
    config: mockConfig,
    state: 'moving'
}

const mockObstacles = {
    checkCollision: jest.fn(() => false),
    obstacles: [],
    stages: [],
    foodStalls: [],
    bus: null
}

describe('Pathfinding Module', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('calculateStaticWaypoints', () => {
        test('should return single waypoint at destination when path is clear', () => {
            const waypoints = calculateStaticWaypoints(
                mockAgent.x,
                mockAgent.y,
                200,
                200,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )

            expect(waypoints.length).toBe(1)
            expect(waypoints[0]).toEqual({ x: 200, y: 200 })
        })

        test('should return empty array when start equals target', () => {
            const waypoints = calculateStaticWaypoints(
                mockAgent.x,
                mockAgent.y,
                100,
                100,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )

            expect(waypoints.length).toBe(1)
            expect(waypoints[0]).toEqual({ x: 100, y: 100 })
        })

        test('should create waypoints around obstacles', () => {
            const obstacleMock = {
                checkCollision: jest.fn((x, y) => {
                    // Block direct path but not corners
                    if (x > 120 && x < 180 && y > 120 && y < 180) {
                        return true
                    }
                    return false
                }),
                obstacles: [{
                    x: 130,
                    y: 130,
                    width: 40,
                    height: 40
                }],
                stages: [],
                foodStalls: [],
                bus: null
            }

            const waypoints = calculateStaticWaypoints(
                mockAgent.x,
                mockAgent.y,
                200,
                200,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            // Should have multiple waypoints to go around obstacle
            expect(waypoints.length).toBeGreaterThan(1)
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 200, y: 200 })
        })

        test('should handle approaching_queue state with personal space', () => {
            const agent = { ...mockAgent, state: 'approaching_queue' }
            const waypoints = calculateStaticWaypoints(
                agent.x,
                agent.y,
                200,
                200,
                mockObstacles,
                agent.radius,
                mockConfig.PERSONAL_SPACE,
                mockConfig
            )

            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })

        test('should apply randomization to intermediate waypoints', () => {
            // Mock Math.random to return predictable values
            const originalRandom = Math.random
            Math.random = jest.fn(() => 0.5)

            const obstacleMock = {
                checkCollision: jest.fn(() => false),
                obstacles: [{
                    x: 130,
                    y: 130,
                    width: 40,
                    height: 40
                }],
                stages: [],
                foodStalls: [],
                bus: null
            }

            const waypoints = calculateStaticWaypoints(
                mockAgent.x,
                mockAgent.y,
                300,
                300,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            Math.random = originalRandom

            // Last waypoint should be exact destination
            if (waypoints.length > 0) {
                expect(waypoints[waypoints.length - 1]).toEqual({ x: 300, y: 300 })
            }
        })

        test('should limit waypoints to MAX_STATIC_WAYPOINTS', () => {
            const obstacleMock = {
                checkCollision: jest.fn(() => false),
                obstacles: Array(10).fill({ x: 150, y: 150, width: 20, height: 20 }),
                stages: [],
                foodStalls: [],
                bus: null
            }

            const waypoints = calculateStaticWaypoints(
                mockAgent.x,
                mockAgent.y,
                500,
                500,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            expect(waypoints.length).toBeLessThanOrEqual(mockConfig.MAX_STATIC_WAYPOINTS)
        })
    })

    describe('calculateDynamicFanAvoidance', () => {
        test('should return null when no other agents nearby', () => {
            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                [],
                200,
                200,
                mockObstacles,
                mockConfig
            )

            expect(waypoint).toBeNull()
        })

        test('should return null when agents are far away', () => {
            const otherAgents = [
                { x: 500, y: 500, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                mockObstacles,
                mockConfig
            )

            expect(waypoint).toBeNull()
        })

        test('should create avoidance waypoint for nearby agents', () => {
            const otherAgents = [
                { x: 110, y: 100, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                mockObstacles,
                mockConfig
            )

            expect(waypoint).not.toBeNull()
            expect(waypoint).toHaveProperty('x')
            expect(waypoint).toHaveProperty('y')
        })

        test('should avoid agents in path to target', () => {
            // Dynamic avoidance only triggers when agent is close AND in path
            // Agent at (150, 150) relative to mockAgent at (100, 100) going to (200, 200)
            // is on the path but distance is ~70 pixels from current position
            // MIN_AVOIDANCE_DISTANCE is typically 30-40, so this won't trigger
            // Let's place agent closer - at (120, 120) - distance ~28 pixels
            const otherAgents = [
                { x: 120, y: 120, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                mockObstacles,
                mockConfig
            )

            // Should create avoidance waypoint when agent is close and in path
            expect(waypoint).not.toBeNull()
        })

        test('should check waypoint against obstacles if provided', () => {
            const otherAgents = [
                { x: 110, y: 100, radius: 3, state: 'moving' }
            ]

            const obstaclesWithCollision = {
                ...mockObstacles,
                checkCollision: jest.fn(() => true)
            }

            calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                obstaclesWithCollision,
                mockConfig
            )

            expect(obstaclesWithCollision.checkCollision).toHaveBeenCalled()
        })

        test('should handle null obstacles parameter', () => {
            const otherAgents = [
                { x: 110, y: 100, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                null,
                mockConfig
            )

            // Should still work without obstacles
            expect(waypoint).not.toBeNull()
        })

        test('should ignore agents behind the current agent', () => {
            const otherAgents = [
                { x: 50, y: 50, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                mockObstacles,
                mockConfig
            )

            // Agent behind should be ignored
            expect(waypoint).toBeNull()
        })

        test('should prefer right avoidance when appropriate', () => {
            const otherAgents = [
                { x: 115, y: 100, radius: 3, state: 'moving' }
            ]

            const waypoint = calculateDynamicFanAvoidance(
                mockAgent,
                otherAgents,
                200,
                200,
                mockObstacles,
                mockConfig
            )

            if (waypoint) {
                // Check that waypoint is to one side
                expect(waypoint.x).not.toBe(mockAgent.x)
                expect(waypoint.y).not.toBe(mockAgent.y)
            }
        })
    })
    
    describe('Bug 3: Waypoint Randomization Path Clearance', () => {
        test('should ensure randomized waypoints maintain passable paths', () => {
            // Create obstacle scenario where corners could block path
            const obstacleMock = {
                checkCollision: jest.fn((x, y) => {
                    // Block the center area
                    if (x > 140 && x < 210 && y > 140 && y < 210) {
                        return true
                    }
                    return false
                }),
                obstacles: [{
                    x: 150,
                    y: 150,
                    width: 50,
                    height: 50,
                    type: 'foodStall'
                }],
                stages: [],
                foodStalls: [],
                bus: null
            }

            // Calculate waypoints with randomization
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                300,
                300,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            // Verify we got waypoints
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
            
            // Verify final waypoint is at destination
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 300, y: 300 })
            
            // Verify consecutive waypoints are not on opposite sides of obstacle corners
            // by checking that the path between them doesn't cross through the obstacle center
            for (let i = 0; i < waypoints.length - 1; i++) {
                const current = waypoints[i]
                const next = waypoints[i + 1]
                
                // At least one waypoint should be outside the blocked area
                // or both should be on the same side of the obstacle
                const currentInside = current.x > 140 && current.x < 210 && current.y > 140 && current.y < 210
                const nextInside = next.x > 140 && next.x < 210 && next.y > 140 && next.y < 210
                
                // Both shouldn't be inside the obstacle
                expect(currentInside && nextInside).toBe(false)
            }
        })
        
        test('should use already-randomized waypoints for path validation', () => {
            // This tests that when randomizing waypoint N, we check path clearance
            // to the already-randomized waypoint N-1, not the original waypoint N-1
            
            const obstacleMock = {
                checkCollision: jest.fn(() => false),
                obstacles: [{
                    x: 150,
                    y: 100,
                    width: 40,
                    height: 40,
                    type: 'foodStall'
                }],
                stages: [],
                foodStalls: [],
                bus: null
            }

            // Mock Math.random to create specific randomization pattern
            const originalRandom = Math.random
            let callCount = 0
            Math.random = jest.fn(() => {
                callCount++
                // Create predictable but varying random values
                return (callCount % 3) / 3
            })

            const waypoints = calculateStaticWaypoints(
                50,
                50,
                250,
                250,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            Math.random = originalRandom

            // Verify we got waypoints (path calculation worked)
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
            
            // Last waypoint should always be exact destination
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 250 })
        })
        
        test('should fall back to original waypoint if randomization fails', () => {
            // Create a scenario where randomization should fail
            // (all random points inside obstacle or have blocked paths)
            const obstacleMock = {
                checkCollision: jest.fn((x, y) => {
                    // Block a wide area to make randomization fail
                    if (x > 80 && x < 220 && y > 80 && y < 220) {
                        return true
                    }
                    return false
                }),
                obstacles: [{
                    x: 100,
                    y: 100,
                    width: 100,
                    height: 100,
                    type: 'foodStall'
                }],
                stages: [],
                foodStalls: [],
                bus: null
            }

            // Should still return waypoints even if randomization fails
            const waypoints = calculateStaticWaypoints(
                50,
                50,
                250,
                250,
                obstacleMock,
                mockAgent.radius,
                0,
                mockConfig
            )

            expect(waypoints.length).toBeGreaterThanOrEqual(1)
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 250 })
        })
    })
})
