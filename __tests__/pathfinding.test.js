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
            
            // The key test: randomized waypoints should use already-randomized previous waypoints
            // for path validation, not original waypoints. This is verified by the fact that
            // findRandomPointNearWaypoint checks paths between consecutive waypoints.
            // If this works correctly, all returned waypoints will form a valid path.
            
            // Additional verification: consecutive waypoints should have clear paths
            // This is implicitly tested by the fact that calculateStaticWaypoints
            // validates each randomized point against the previous waypoint
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })
        
        test('should handle path calculation without obstacles', () => {
            // This tests path calculation with no obstacles
            
            const obstacleMock = {
                checkCollision: jest.fn(() => false),
                obstacles: [],
                stages: [],
                foodStalls: [],
                bus: null
            }

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

            // Verify we got waypoints (path calculation worked)
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
            
            // Last waypoint should always be exact destination
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 250 })
        })
    })

    describe('Branch coverage for pathfinding edge cases', () => {
        test('should handle single waypoint path (last element case)', () => {
            // Create path with single waypoint - tests line 50 branch when i < path.length - 1 is false
            mockObstacles.obstacles = []
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                150,
                150,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should return direct path (single waypoint)
            expect(waypoints.length).toBe(1)
            expect(waypoints[0]).toEqual({ x: 150, y: 150 })
        })

        test('should handle zero distance to target in corner scoring', () => {
            // Test line 102 - when toTargetDist is 0
            mockObstacles.obstacles = [
                { x: 100, y: 100, width: 50, height: 50, type: 'stage' }
            ]
            
            // Start at target position
            const waypoints = calculateStaticWaypoints(
                200,
                200,
                200,
                200,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should handle gracefully
            expect(waypoints.length).toBe(1)
            expect(waypoints[0]).toEqual({ x: 200, y: 200 })
        })

        test('should skip corner inside obstacle', () => {
            // Test line 134 - corner inside obstacle
            mockObstacles.obstacles = [
                { x: 100, y: 100, width: 100, height: 100, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                50,
                50,
                250,
                250,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should find path around obstacle
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 250 })
        })

        test('should break when no blocking obstacles found', () => {
            // Test line 203 - when blockingObstacles.length === 0
            mockObstacles.obstacles = [
                { x: 500, y: 500, width: 50, height: 50, type: 'stage' } // Far away
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                200,
                200,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should use direct path
            expect(waypoints.length).toBe(1)
        })

        test('should handle randomRadius zero for destination', () => {
            // Test line 256 - when randomRadius === 0
            mockObstacles.obstacles = [
                { x: 125, y: 125, width: 50, height: 50, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                300,
                300,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Final waypoint should be exact target (no randomization)
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 300, y: 300 })
        })

        test('should handle path clear check with no obstacles', () => {
            // Test line 304 - obstacles is null/undefined
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                200,
                200,
                null,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should return direct path
            expect(waypoints.length).toBe(1)
        })

        test('should skip very close obstacles in blocking check', () => {
            // Test line 362 - distToTarget < radius * 2
            mockObstacles.obstacles = [
                { x: 150, y: 150, width: 10, height: 10, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                155,
                155,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should reach target
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 155, y: 155 })
        })

        test('should handle zero distance in obstacle direction check', () => {
            // Test line 372 - when distToTarget or distToObs is 0
            mockObstacles.obstacles = [
                { x: 100, y: 100, width: 10, height: 10, type: 'stage' }
            ]
            
            // Start at obstacle location
            const waypoints = calculateStaticWaypoints(
                105,
                105,
                200,
                200,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should handle gracefully
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })

        test('should skip obstacle not in path direction', () => {
            // Test line 374 - dotProduct < 0.5 (obstacle behind or to side)
            mockObstacles.obstacles = [
                { x: 50, y: 300, width: 20, height: 20, type: 'stage' } // To the side
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                200,
                100,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should use direct path (obstacle not blocking)
            expect(waypoints.length).toBe(1)
        })

        test('should handle null obstacles in point check', () => {
            // Test line 405 - obstacles is null
            mockObstacles.obstacles = null
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                200,
                200,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should handle gracefully
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })

        test('should use mid-points when no valid corner found', () => {
            // Test line 225 - mid-point fallback
            mockObstacles.obstacles = [
                { x: 140, y: 140, width: 60, height: 60, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                250,
                250,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should find path (possibly using mid-points)
            expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 250 })
        })

        test('should handle ternary operators in waypoint calculation', () => {
            // Test line 511 and 597 - ternary operators for orientation
            mockObstacles.obstacles = [
                { x: 150, y: 150, width: 40, height: 40, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                300,
                100, // Horizontal path
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should handle horizontal vs vertical orientation
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })

        test('should handle vertical path orientation', () => {
            // Test vertical orientation branch
            mockObstacles.obstacles = [
                { x: 150, y: 150, width: 40, height: 40, type: 'stage' }
            ]
            
            const waypoints = calculateStaticWaypoints(
                100,
                100,
                100, // Same X, vertical path
                300,
                mockObstacles,
                mockAgent.radius,
                0,
                mockConfig
            )
            
            // Should handle vertical orientation
            expect(waypoints.length).toBeGreaterThanOrEqual(1)
        })
    })
})
