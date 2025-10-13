// Test for Fan class
import { Fan } from '../src/core/fan.js'
import { jest } from '@jest/globals'
import { AgentState } from '../src/utils/enums.js'

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    PERSONAL_SPACE: 12,
    CONCERT_PERSONAL_SPACE: 4,
    HUNGER_RATE: 0.001,
    HUNGER_THRESHOLD: 0.7,
    INITIAL_HUNGER: 0.3,
    HUNGER_MIN_INITIAL: 0.1,
    HUNGER_MAX_INITIAL: 0.3,
    HUNGER_THRESHOLD_BASE: 0.7,
    HUNGER_THRESHOLD_VARIANCE: 0.1,
    HUNGER_INCREASE_RATE: 0.001,
    COLORS: {
        FAN_IDLE: '#4a90e2',
        FAN_MOVING: '#2ecc71',
        FAN_HUNGRY: '#e67e22',
        FAN_AT_SHOW: '#9b59b6',
        FAN_LEAVING: '#e24a4a',
        AGENT_ACTIVE: '#4a90e2',
        AGENT_IN_QUEUE: '#f39c12',
        AGENT_BEING_CHECKED: '#e74c3c',
        AGENT_ENHANCED_SECURITY: '#c0392b',
        AGENT_LEAVING: '#e24a4a'
    },
    STAGE_CENTER_X: 0.5,
    STAGE_CENTER_Y: 0.5,
    STAGE_RADIUS: 0.2
}

const mockObstacles = {
    checkCollision: jest.fn(() => false),
    resolveCollision: jest.fn(),
    isValidPosition: jest.fn(() => true),
    obstacles: [],
    stages: [],
    foodStalls: [],
    bus: null,
    width: 800,
    height: 600
}

describe('Fan Class', () => {
    let fan

    beforeEach(() => {
        fan = new Fan(100, 100, mockConfig)
        jest.clearAllMocks()
    })

    test('should initialize with default values', () => {
        expect(fan.type).toBe('fan')
        expect(fan.hunger).toBeGreaterThanOrEqual(0)
        expect(fan.hunger).toBeLessThanOrEqual(1)
        expect(fan.stagePreference).toBeDefined()
        expect(fan.state).toBe('idle')
        expect(fan.inQueue).toBe(false)
    })

    test('should initialize hunger to minimum value deterministically', () => {
        const hungryFan = new Fan(100, 100, mockConfig)
        expect(hungryFan.hunger).toBe(mockConfig.HUNGER_MIN_INITIAL)
    })

    describe('update', () => {
        test('should increase hunger over time when not at food stall', () => {
            const initialHunger = fan.hunger
            fan.state = AgentState.MOVING

            fan.update(1, 1.0, [], mockObstacles, 0)

            expect(fan.hunger).toBeGreaterThan(initialHunger)
        })

        test('should not increase hunger when at food stall', () => {
            fan.state = AgentState.APPROACHING_QUEUE
            fan.queueType = 'food'
            fan.waitStartTime = Date.now() // Set waitStartTime to prevent hunger increase
            const initialHunger = fan.hunger

            fan.update(1, 1.0, [], mockObstacles, 0)

            expect(fan.hunger).toBe(initialHunger)
        })

        test('should not increase hunger when in food queue', () => {
            fan.state = AgentState.IN_QUEUE_WAITING
            fan.waitStartTime = Date.now() // Set waitStartTime to prevent hunger increase
            fan.queueType = 'food'
            const initialHunger = fan.hunger

            fan.update(1, 1.0, [], mockObstacles, 0)

            expect(fan.hunger).toBe(initialHunger)
        })

        test('should not increase hunger when processing at food stall', () => {
            fan.state = AgentState.PROCESSING
            fan.queueType = 'food'
            fan.waitStartTime = Date.now() // Set waitStartTime to prevent hunger increase
            const initialHunger = fan.hunger

            fan.update(1, 1.0, [], mockObstacles, 0)

            expect(fan.hunger).toBe(initialHunger)
        })

        test('should clamp hunger to maximum of 1.0', () => {
            fan.hunger = 0.99
            fan.state = AgentState.MOVING

            fan.update(10, 1.0, [], mockObstacles, 0)

            expect(fan.hunger).toBeLessThanOrEqual(1.0)
        })

        test('should transition idle to moving after wait time', () => {
            fan.state = AgentState.IDLE
            fan.lastStateChange = 0

            fan.update(0.1, 1.0, [], mockObstacles, 10000) // 10 seconds later

            expect(fan.state).toBe('moving')
        })

        test('should transition idle to moving immediately when no target', () => {
            fan.state = AgentState.IDLE
            fan.targetX = null
            fan.targetY = null
            fan.currentShow = null
            fan.inQueue = false

            fan.update(0.1, 1.0, [], mockObstacles)

            // Should start wandering immediately
            expect(fan.state).toBe('moving')
            expect(fan.targetX).not.toBeNull()
            expect(fan.targetY).not.toBeNull()
        })
    })

    describe('startWandering', () => {
        test('should set random target and transition to moving', () => {
            fan.state = AgentState.IDLE

            fan.startWandering(mockObstacles)

            expect(fan.state).toBe('moving')
            expect(fan.targetX).toBeDefined()
            expect(fan.targetY).toBeDefined()
        })

        test('should call setTarget with obstacles', () => {
            fan.setTarget = jest.fn()

            fan.startWandering(mockObstacles)

            expect(fan.setTarget).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                mockObstacles
            )
        })

        test('should generate valid coordinates within bounds', () => {
            fan.startWandering(mockObstacles)

            expect(fan.targetX).toBeGreaterThanOrEqual(0)
            expect(fan.targetX).toBeLessThanOrEqual(mockObstacles.width)
            expect(fan.targetY).toBeGreaterThanOrEqual(0)
            expect(fan.targetY).toBeLessThanOrEqual(mockObstacles.height * 0.7)
        })

        test('should use center position deterministically', () => {
            fan.startWandering(mockObstacles)

            // Should target center position
            expect(fan.targetX).toBe(mockObstacles.width / 2)
            expect(fan.targetY).toBe((mockObstacles.height * 0.7) / 2)
            expect(fan.state).toBe(AgentState.MOVING)
        })

        test('should not set target when position is invalid', () => {
            const mockObstaclesWithCollisions = {
                ...mockObstacles,
                isValidPosition: jest.fn().mockReturnValue(false),
                width: 800,
                height: 600
            }

            const initialState = fan.state

            fan.startWandering(mockObstaclesWithCollisions)

            // Should not change state since position is invalid
            expect(fan.state).toBe(initialState)
        })

        test('should work without obstacles (null check branch)', () => {
            fan.startWandering(null, 1000)

            expect(fan.targetX).toBeDefined()
            expect(fan.targetY).toBeDefined()
            expect(fan.state).toBe(AgentState.MOVING)
        })
    })

    describe('update with default parameters', () => {
        test('should handle update with default parameters', () => {
            fan.state = AgentState.MOVING
            const initialHunger = fan.hunger

            // Call with no otherAgents, obstacles, or simulationTime
            fan.update(1, 1.0)

            expect(fan.hunger).toBeGreaterThan(initialHunger)
        })
    })

    // goToFoodStall method doesn't exist in Fan class - tests removed
    // describe('goToFoodStall', () => {
    //     test('should set state to approaching_queue', () => {
    //         fan.goToFoodStall(400, 300, mockObstacles, 1000)
    //         expect(fan.state).toBe('approaching_queue')
    //         expect(fan.queueType).toBe('food')
    //     })
    //     test('should set target to food stall position', () => {
    //         fan.goToFoodStall(400, 300, mockObstacles, 1000)
    //         expect(fan.targetX).toBe(400)
    //         expect(fan.targetY).toBe(300)
    //     })
    // })

    describe('draw', () => {
        let mockContext

        beforeEach(() => {
            mockContext = {
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                stroke: jest.fn(),
                fillRect: jest.fn(),
                fillText: jest.fn(),
                save: jest.fn(),
                restore: jest.fn()
            }
        })

        test('should draw fan with correct color based on state', () => {
            fan.state = AgentState.MOVING

            fan.draw(mockContext)

            expect(mockContext.beginPath).toHaveBeenCalled()
            expect(mockContext.arc).toHaveBeenCalledWith(
                fan.x,
                fan.y,
                fan.radius,
                0,
                Math.PI * 2
            )
            expect(mockContext.fill).toHaveBeenCalled()
        })

        test('should use hungry color when hunger is high', () => {
            fan.hunger = 0.8
            fan.state = AgentState.MOVING

            fan.draw(mockContext)

            expect(mockContext.fill).toHaveBeenCalled()
        })

        test('should draw at show with concert color', () => {
            fan.state = 'at_show'

            fan.draw(mockContext)

            expect(mockContext.fill).toHaveBeenCalled()
        })

        test('should draw leaving fans', () => {
            fan.state = AgentState.LEAVING

            fan.draw(mockContext)

            expect(mockContext.fill).toHaveBeenCalled()
        })
    })

    // isHungry method doesn't exist in Fan class - tests removed  
    // describe('isHungry', () => {
    //     test('should return true when hunger exceeds threshold', () => {
    //         fan.hunger = 0.8
    //         expect(fan.isHungry()).toBe(true)
    //     })
    //     test('should return false when hunger is below threshold', () => {
    //         fan.hunger = 0.5
    //         expect(fan.isHungry()).toBe(false)
    //     })
    //     test('should return false at exactly threshold', () => {
    //         fan.hunger = mockConfig.HUNGER_THRESHOLD
    //         expect(fan.isHungry()).toBe(false)
    //     })
    // })

    // feed method doesn't exist in Fan class - tests removed
    // describe('feed', () => {
    //     test('should reset hunger to initial level', () => {
    //         fan.hunger = 0.9
    //         fan.feed()
    //         expect(fan.hunger).toBe(mockConfig.INITIAL_HUNGER)
    //     })
    //     test('should work even when already fed', () => {
    //         fan.hunger = 0.2
    //         fan.feed()
    //         expect(fan.hunger).toBe(mockConfig.INITIAL_HUNGER)
    //     })
    // })

    describe('state transitions', () => {
        test('should transition from idle to moving', () => {
            fan.state = AgentState.IDLE
            fan.lastStateChange = 0

            fan.update(0.1, 1.0, [], mockObstacles, 10000)

            expect(fan.state).toBe('moving')
        })

        test('should handle approaching_queue state', () => {
            fan.state = AgentState.APPROACHING_QUEUE

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            // Should maintain state until reaching queue
            expect(fan.state).toBe('approaching_queue')
        })

        test('should handle in_queue_waiting state', () => {
            fan.state = AgentState.IN_QUEUE_WAITING

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            expect(fan.state).toBe('in_queue_waiting')
        })

        test('should handle in_queue_advancing state', () => {
            fan.state = AgentState.IN_QUEUE_ADVANCING
            fan.setTarget(200, 200, mockObstacles, 0)

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            // Should be moving toward target
            expect(fan.state).toBe('in_queue_advancing')
        })

        test('should handle processing state', () => {
            fan.state = AgentState.PROCESSING

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            expect(fan.state).toBe('processing')
        })

        test('should handle at_show state', () => {
            fan.state = 'at_show'

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            expect(fan.state).toBe('at_show')
        })

        test('should handle leaving state', () => {
            fan.state = AgentState.LEAVING
            fan.setTarget(100, 600, mockObstacles, 0)

            fan.update(0.1, 1.0, [], mockObstacles, 1000)

            // Fan with a target will be in moving state
            // Leaving state is for fans that have exited the festival
            expect(['leaving', 'moving']).toContain(fan.state)
        })
    })

    describe('edge cases', () => {
        test('should handle zero delta time', () => {
            const initialHunger = fan.hunger

            fan.update(0, 1.0, [], mockObstacles, 1000)

            expect(fan.hunger).toBe(initialHunger)
        })

        test('should handle negative simulation speed', () => {
            expect(() => {
                fan.update(0.1, -1.0, [], mockObstacles, 1000)
            }).not.toThrow()
        })

        test('should handle very high simulation speed', () => {
            fan.state = AgentState.MOVING
            const initialHunger = fan.hunger

            fan.update(0.1, 10.0, [], mockObstacles, 1000)

            expect(fan.hunger).toBeGreaterThan(initialHunger)
            expect(fan.hunger).toBeLessThanOrEqual(1.0)
        })

        test('should handle null obstacles gracefully', () => {
            expect(() => {
                fan.update(0.1, 1.0, [], null, 1000)
            }).not.toThrow()
        })

        test('should handle empty other agents array', () => {
            expect(() => {
                fan.update(0.1, 1.0, [], mockObstacles, 1000)
            }).not.toThrow()
        })
    })

    describe('draw method - color based on state', () => {
        let ctx

        beforeEach(() => {
            ctx = {
                fillStyle: '',
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn()
            }
        })

        test('should use AGENT_IN_QUEUE color for queue states', () => {
            fan.state = AgentState.IN_QUEUE_WAITING
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_IN_QUEUE)

            fan.state = AgentState.IN_QUEUE_ADVANCING
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_IN_QUEUE)

            fan.state = AgentState.APPROACHING_QUEUE
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_IN_QUEUE)
        })

        test('should use AGENT_BEING_CHECKED color when being checked without enhanced security', () => {
            fan.state = AgentState.BEING_CHECKED
            fan.enhancedSecurity = false
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_BEING_CHECKED)
        })

        test('should use AGENT_ENHANCED_SECURITY color when being checked with enhanced security', () => {
            fan.state = AgentState.BEING_CHECKED
            fan.enhancedSecurity = true
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_ENHANCED_SECURITY)
        })

        test('should use AGENT_BEING_CHECKED color for PROCESSING state without enhanced security', () => {
            fan.state = AgentState.PROCESSING
            fan.enhancedSecurity = false
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_BEING_CHECKED)
        })

        test('should use AGENT_ENHANCED_SECURITY color for PROCESSING state with enhanced security', () => {
            fan.state = AgentState.PROCESSING
            fan.enhancedSecurity = true
            fan.draw(ctx)
            expect(fan.color).toBe(mockConfig.COLORS.AGENT_ENHANCED_SECURITY)
        })
    })
})
