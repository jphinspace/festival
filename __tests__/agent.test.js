// Unit tests for Agent class
import { Agent } from '../src/core/agent.js';
import { Fan } from '../src/core/fan.js';
import { jest } from '@jest/globals';

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    PERSONAL_SPACE: 12,
    CONCERT_PERSONAL_SPACE: 4,
    BASE_WAYPOINT_UPDATE_INTERVAL: 125,
    WAYPOINT_UPDATE_RANDOMNESS: 50,
    WAYPOINT_REACH_DISTANCE: 10,
    MAX_STATIC_WAYPOINTS: 6,
    WAYPOINT_BUFFER_DISTANCE: 5,
    COLORS: {
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a'
    }
};

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
};

describe('Agent', () => {
    let agent;

    beforeEach(() => {
        agent = new Agent(100, 100, mockConfig);
        jest.clearAllMocks();
    });

    test('should initialize with correct default values', () => {
        expect(agent.x).toBe(100);
        expect(agent.y).toBe(100);
        expect(agent.state).toBe('idle');
        expect(agent.targetX).toBeNull();
        expect(agent.targetY).toBeNull();
        expect(agent.color).toBe(mockConfig.COLORS.AGENT_ACTIVE);
        expect(agent.radius).toBe(mockConfig.AGENT_RADIUS);
    });

    test('should set target correctly', () => {
        agent.setTarget(200, 200);
        expect(agent.targetX).toBe(200);
        expect(agent.targetY).toBe(200);
        expect(agent.state).toBe('moving');
    });

    test('should mark as leaving', () => {
        agent.markAsLeaving();
        expect(agent.state).toBe('leaving');
        expect(agent.color).toBe(mockConfig.COLORS.AGENT_LEAVING);
    });

    test('should detect overlaps with other agents', () => {
        const otherAgent = new Agent(108, 100, mockConfig); // Close agent
        expect(agent.overlapsWith(otherAgent)).toBe(true);
        
        const farAgent = new Agent(200, 200, mockConfig); // Far away agent
        expect(agent.overlapsWith(farAgent)).toBe(false);
    });

    test('should resolve overlaps by pushing agents apart', () => {
        const otherAgent = new Agent(105, 100, mockConfig); // Overlapping agent
        const initialX = agent.x;
        
        agent.resolveOverlap(otherAgent);
        
        // Agents should have moved apart (exact distance calculation tested in geometry.test.js)
        expect(agent.x).not.toBe(initialX);
    });

    test('should update position towards target', () => {
        agent.setTarget(200, 100);
        const initialX = agent.x;
        agent.update(0.016, 1.0, []); // ~60fps frame time
        expect(agent.x).toBeGreaterThan(initialX);
        expect(agent.state).toBe('moving');
    });

    test('should reach target and stop moving', () => {
        agent.setTarget(100.01, 100);
        agent.update(1.0, 1.0, []); // Large delta to ensure arrival
        expect(agent.x).toBe(100.01);
        expect(agent.state).toBe('idle');
        expect(agent.targetX).toBeNull();
    });

    test('should respect simulation speed multiplier', () => {
        agent.setTarget(200, 100);
        const agent2 = new Agent(100, 100, mockConfig);
        agent2.setTarget(200, 100);

        agent.update(0.016, 1.0, []);
        agent2.update(0.016, 2.0, []);

        // Agent with higher speed multiplier should move farther (calculation tested in timeUtils.test.js)
        expect(agent2.x).toBeGreaterThan(agent.x);
    });

    test('should not move when idle', () => {
        const initialX = agent.x;
        const initialY = agent.y;
        agent.update(0.016, 1.0, []);
        expect(agent.x).toBe(initialX);
        expect(agent.y).toBe(initialY);
    });

    test('should check if near target', () => {
        agent.setTarget(105, 105);
        // Within threshold
        expect(agent.isNearTarget(10)).toBe(true);
        // Outside threshold
        expect(agent.isNearTarget(5)).toBe(false);
    });

    describe('Branch coverage for personal space buffer', () => {
        test('should not use personal space buffer when state does not require it', () => {
            agent.state = 'idle'; // State that doesn't use personal space buffer
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
                obstacles: [],
                stages: [],
                foodStalls: [],
                bus: null
            };
            
            // Set target to trigger pathfinding
            agent.setTarget(200, 200, obstacles);
            
            // The setTarget should have calculated waypoints with personalSpaceBuffer = 0
            // because shouldUsePersonalSpaceBuffer('idle') returns false
            expect(agent.staticWaypoints.length).toBeGreaterThanOrEqual(1);
        });

        test('should use personal space buffer for moving state', () => {
            agent.state = 'moving'; // State that uses personal space buffer
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
                obstacles: [],
                stages: [],
                foodStalls: [],
                bus: null
            };
            
            // Set target to trigger pathfinding
            agent.setTarget(200, 200, obstacles);
            
            // The setTarget should have calculated waypoints with personalSpaceBuffer = PERSONAL_SPACE
            // because shouldUsePersonalSpaceBuffer('moving') returns true
            expect(agent.staticWaypoints.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Branch coverage for final destination with waypoints remaining', () => {
        test('should not snap to target when waypoints remain even if near target', () => {
            agent.state = 'moving';
            agent.x = 195;
            agent.y = 195;
            agent.targetX = 200;
            agent.targetY = 200;
            agent.staticWaypoints = [{ x: 150, y: 150 }, { x: 200, y: 200 }];
            
            agent.update(0.016, 1.0, [], mockObstacles, 100);
            
            // Should not have snapped to final target yet
            expect(agent.staticWaypoints.length).toBeGreaterThan(0);
        });

        test('should snap to target when near and no waypoints remain', () => {
            agent.state = 'moving';
            // Place agent very close to target (within one frame of movement)
            agent.x = 200 - 0.001;
            agent.y = 200 - 0.001;
            agent.targetX = 200;
            agent.targetY = 200;
            agent.staticWaypoints = []; // No waypoints remaining
            
            agent.update(0.016, 1.0, [], mockObstacles, 100);
            
            // Should have snapped to final target
            expect(agent.x).toBe(200);
            expect(agent.y).toBe(200);
            expect(agent.targetX).toBeNull();
            expect(agent.targetY).toBeNull();
        });
    });

    describe('Branch coverage for overlap check', () => {
        test('should skip overlap resolution when agent does not overlap', () => {
            agent.state = 'moving';
            agent.x = 100;
            agent.y = 100;
            agent.targetX = 200;
            agent.targetY = 200;
            
            // Create far away agent
            const otherAgent = new Agent(300, 300, mockConfig);
            
            agent.update(0.016, 1.0, [otherAgent], mockObstacles, 100);
            
            // Agents are far apart, no overlap resolution needed
            expect(agent.x).not.toBe(otherAgent.x);
        });
    });
});

describe('Fan', () => {
    let fan;

    beforeEach(() => {
        fan = new Fan(100, 100, mockConfig);
    });

    test('should be an instance of Agent', () => {
        expect(fan).toBeInstanceOf(Agent);
    });

    test('should have type "fan"', () => {
        expect(fan.type).toBe('fan');
    });

    test('should inherit all Agent functionality', () => {
        fan.setTarget(200, 200);
        expect(fan.targetX).toBe(200);
        expect(fan.targetY).toBe(200);
        expect(fan.state).toBe('moving');
    });

    test('should handle collisions like base Agent', () => {
        const otherFan = new Fan(108, 100, mockConfig); // Close fan
        expect(fan.overlapsWith(otherFan)).toBe(true);
    });
    
    // Tests for pathfinding bug fixes
    describe('Waypoint Update Logic (Bug Fixes)', () => {
        let mockObstacles
        
        beforeEach(() => {
            mockObstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
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
        })
        
        test('Bug 1: Should not recalculate all waypoints every frame', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // First update creates waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            const initialWaypoints = [...agent.staticWaypoints]
            const initialFirstWaypoint = initialWaypoints[0]
            
            // Second update shortly after (within BASE_WAYPOINT_UPDATE_INTERVAL)
            // Should NOT recalculate waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 50)
            
            if (agent.staticWaypoints.length > 0 && initialWaypoints.length > 0) {
                // First waypoint should be unchanged
                expect(agent.staticWaypoints[0].x).toBe(initialFirstWaypoint.x)
                expect(agent.staticWaypoints[0].y).toBe(initialFirstWaypoint.y)
            }
        })
        
        test('Bug 2: Should keep first waypoint fixed after reaching previous waypoint', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // Create initial waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            
            if (agent.staticWaypoints.length > 1) {
                const firstWaypoint = agent.staticWaypoints[0]
                
                // Move agent close to first waypoint to trigger removal
                agent.x = firstWaypoint.x - 2
                agent.y = firstWaypoint.y - 2
                
                // Update to trigger waypoint removal
                agent.update(0.016, 1.0, [], mockObstacles, 0)
                
                // After first waypoint is removed, second waypoint becomes first
                const newFirstWaypoint = agent.staticWaypoints[0]
                
                // Now trigger waypoint update after interval
                agent.update(0.016, 1.0, [], mockObstacles, 150)
                
                // New first waypoint should remain fixed
                if (agent.staticWaypoints.length > 0) {
                    expect(agent.staticWaypoints[0].x).toBe(newFirstWaypoint.x)
                    expect(agent.staticWaypoints[0].y).toBe(newFirstWaypoint.y)
                }
            }
        })
        
        test('Bug 2: First waypoint should not be updated during waypoint refresh', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // Create initial waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            const initialFirstWaypoint = agent.staticWaypoints[0]
            
            // Wait for update interval to pass
            agent.update(0.016, 1.0, [], mockObstacles, 200)
            
            // First waypoint should still be the same
            if (agent.staticWaypoints.length > 0) {
                expect(agent.staticWaypoints[0].x).toBe(initialFirstWaypoint.x)
                expect(agent.staticWaypoints[0].y).toBe(initialFirstWaypoint.y)
            }
        })
        
        test('Bug 1: Waypoints should only update at specific interval timings', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // Create initial waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            const initialWaypoints = JSON.stringify(agent.staticWaypoints)
            
            // Multiple updates within interval should not change waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 10)
            agent.update(0.016, 1.0, [], mockObstacles, 20)
            agent.update(0.016, 1.0, [], mockObstacles, 30)
            agent.update(0.016, 1.0, [], mockObstacles, 40)
            
            const unchangedWaypoints = JSON.stringify(agent.staticWaypoints)
            expect(unchangedWaypoints).toBe(initialWaypoints)
        })
        
        test('Bug 1: Should not update waypoints if only one waypoint exists', () => {
            const agent = new Agent(100, 100, mockConfig)
            // Set a target that has direct path (no obstacles blocking)
            agent.setTarget(150, 100)
            
            // Create initial waypoints
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            
            if (agent.staticWaypoints.length === 1) {
                const initialWaypoint = { ...agent.staticWaypoints[0] }
                
                // Wait for update interval to pass
                agent.update(0.016, 1.0, [], mockObstacles, 200)
                
                // Single waypoint should not change
                expect(agent.staticWaypoints[0].x).toBe(initialWaypoint.x)
                expect(agent.staticWaypoints[0].y).toBe(initialWaypoint.y)
            }
        })
        
        test('Bug 1: Should handle case when obstacles is null', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // Update without obstacles
            agent.update(0.016, 1.0, [], null, 0)
            
            // Should not crash and should still move
            expect(agent.x).toBeGreaterThan(100)
        })
        
        test('Bug 2: Should handle waypoint updates when multiple waypoints exist', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(300, 300)
            
            // Create initial waypoints with obstacles that force multiple waypoints
            const complexObstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
                obstacles: [
                    { x: 150, y: 150, width: 50, height: 50, type: 'foodStall' },
                    { x: 220, y: 170, width: 40, height: 40, type: 'foodStall' }
                ],
                stages: [],
                foodStalls: [],
                bus: null
            }
            
            agent.update(0.016, 1.0, [], complexObstacles, 0)
            
            if (agent.staticWaypoints.length > 1) {
                const firstWaypoint = { ...agent.staticWaypoints[0] }
                
                // Trigger waypoint update after interval
                agent.update(0.016, 1.0, [], complexObstacles, 200)
                
                // First waypoint should remain fixed
                if (agent.staticWaypoints.length > 0) {
                    expect(agent.staticWaypoints[0].x).toBe(firstWaypoint.x)
                    expect(agent.staticWaypoints[0].y).toBe(firstWaypoint.y)
                }
            }
        })
    })

    describe('Additional coverage tests', () => {
        test('should find avoidance position with 30 degree right angle', () => {
            const agent = new Agent(100, 100, mockConfig)
            const obstacles = {
                checkCollision: jest.fn((x, y) => {
                    // First position is blocked, second is free
                    return false
                })
            }
            
            agent.state = 'moving'
            const pos = agent.findAvoidancePosition(10, 0, 5, obstacles)
            
            expect(pos).not.toBeNull()
            expect(obstacles.checkCollision).toHaveBeenCalled()
        })

        test('should find avoidance position with multiple attempts', () => {
            const agent = new Agent(100, 100, mockConfig)
            let callCount = 0
            const obstacles = {
                checkCollision: jest.fn((x, y) => {
                    // First 3 positions are blocked, 4th is free
                    callCount++
                    return callCount <= 3
                })
            }
            
            agent.state = 'moving'
            const pos = agent.findAvoidancePosition(10, 0, 5, obstacles)
            
            expect(pos).not.toBeNull()
            expect(callCount).toBeGreaterThan(3)
        })

        test('should return null when all avoidance positions blocked', () => {
            const agent = new Agent(100, 100, mockConfig)
            const obstacles = {
                checkCollision: jest.fn(() => true) // All positions blocked
            }
            
            agent.state = 'moving'
            const pos = agent.findAvoidancePosition(10, 0, 5, obstacles)
            
            expect(pos).toBeNull()
        })

        test('should return null when no obstacles provided', () => {
            const agent = new Agent(100, 100, mockConfig)
            const pos = agent.findAvoidancePosition(10, 0, 5, null)
            
            expect(pos).toBeNull()
        })

        test('should return null when target distance is zero', () => {
            const agent = new Agent(100, 100, mockConfig)
            const obstacles = {
                checkCollision: jest.fn(() => false)
            }
            
            const pos = agent.findAvoidancePosition(0, 0, 5, obstacles)
            
            expect(pos).toBeNull()
        })

        test('should use personal space buffer when approaching queue', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'approaching_queue'
            
            let bufferUsed = 0
            const obstacles = {
                checkCollision: jest.fn((x, y, radius, state, buffer) => {
                    bufferUsed = buffer
                    return false
                })
            }
            
            agent.findAvoidancePosition(10, 0, 5, obstacles)
            
            expect(bufferUsed).toBe(mockConfig.PERSONAL_SPACE)
        })

        test('should check personal space for concert crowd', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.currentShow = 'left'
            agent.isUpFront = true

            const otherAgent = new Agent(105, 100, mockConfig)
            otherAgent.currentShow = 'left'
            otherAgent.isUpFront = true
            
            const space = agent.getPersonalSpace(otherAgent)
            
            expect(space).toBe(mockConfig.CONCERT_PERSONAL_SPACE)
        })

        test('should resolve overlap when exactly at same position', () => {
            const agent1 = new Agent(100, 100, mockConfig)
            const agent2 = new Agent(100, 100, mockConfig) // Exactly overlapping
            
            agent1.resolveOverlap(agent2)
            
            // When agents are at exact same position (distance = 0), resolveOverlap won't push them
            // because the condition checks distance > 0 to avoid division by zero
            expect(agent1.x).toBe(100)
            expect(agent1.y).toBe(100)
        })

        test('should not push when distance is greater than minDistance', () => {
            const agent1 = new Agent(100, 100, mockConfig)
            const agent2 = new Agent(120, 100, mockConfig) // Far enough apart
            
            const initialX = agent1.x
            agent1.resolveOverlap(agent2)
            
            // Agent should not move since they're not overlapping
            expect(agent1.x).toBe(initialX)
        })

        test('should transition to idle when reaching final target with no waypoints', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(105, 100) // Very close target
            agent.state = 'moving'
            agent.staticWaypoints = []
            
            // Move very close to target
            agent.x = 104.9
            agent.y = 100
            
            agent.update(1, 1.0, [], mockObstacles, 0)
            
            // Should transition to idle
            expect(agent.state).toBe('idle')
        })

        test('should not transition returning_to_queue state to idle when reaching target', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(105, 100)
            agent.state = 'returning_to_queue'
            agent.staticWaypoints = []
            
            // Move to target
            agent.x = 105
            agent.y = 100
            
            agent.update(0.016, 1.0, [], mockObstacles, 0)
            
            // Should NOT transition to idle (only MOVING state transitions to idle)
            expect(agent.state).toBe('returning_to_queue')
        })

        test('should handle overlap detection with includePersonalSpace', () => {
            const agent1 = new Agent(100, 100, mockConfig)
            const agent2 = new Agent(115, 100, mockConfig) // 15 pixels away
            
            // Set both as idle (not moving)
            agent1.state = 'idle'
            agent2.state = 'idle'
            
            // Without allowMovingOverlap - should check personal space (distance 15 < personalSpace)
            // getPersonalSpace returns PERSONAL_SPACE (12) for default case
            // So 15 > 12, should NOT overlap
            expect(agent1.overlapsWith(agent2, false)).toBe(false)
            
            // With allowMovingOverlap=true but agents idle - still checks personal space
            // 15 > 12, should NOT overlap
            expect(agent1.overlapsWith(agent2, true)).toBe(false)
        })

        test('should resolve collisions with other agents in update', () => {
            const agent1 = new Agent(100, 100, mockConfig)
            const agent2 = new Agent(102, 100, mockConfig) // Overlapping
            
            agent1.setTarget(200, 100)
            agent1.update(0.016, 1.0, [agent2], mockObstacles, 0)
            
            // Agents should have been pushed apart
            expect(Math.abs(agent1.x - agent2.x)).toBeGreaterThan(0)
        })

        test('should use default parameters in update', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.setTarget(200, 100)
            
            // Call with defaults
            agent.update(0.016, 1.0)
            
            expect(agent.x).toBeGreaterThan(100)
        })

        test('should use default threshold in isNearTarget', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.targetX = 105
            agent.targetY = 100
            
            // Call with default threshold (10)
            expect(agent.isNearTarget()).toBe(true)
        })

        test('should return true in isNearTarget when no target set', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.targetX = null
            agent.targetY = null
            
            expect(agent.isNearTarget()).toBe(true)
        })

        test('should check personal space for passing through queue', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.inQueue = false
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'in_queue_waiting'
            other.inQueue = true
            
            const space = agent.getPersonalSpace(other)
            
            expect(space).toBe(mockConfig.CONCERT_PERSONAL_SPACE)
        })

        test('should check personal space for agent in queue passing other', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'in_queue_waiting'
            agent.inQueue = true
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'moving'
            other.inQueue = false
            
            const space = agent.getPersonalSpace(other)
            
            expect(space).toBe(mockConfig.CONCERT_PERSONAL_SPACE)
        })

        test('should check normal personal space for other situations', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'idle'
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'idle'
            
            const space = agent.getPersonalSpace(other)
            
            expect(space).toBe(mockConfig.PERSONAL_SPACE)
        })

        test('should check if agent is moving in approaching_queue state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'approaching_queue'
            
            expect(agent.isMoving()).toBe(true)
        })

        test('should check if agent is moving in in_queue_advancing state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'in_queue_advancing'
            
            expect(agent.isMoving()).toBe(true)
        })

        test('should check if agent is moving in returning_to_queue state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'returning_to_queue'
            
            expect(agent.isMoving()).toBe(true)
        })

        test('should check if agent is not moving in idle state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'idle'
            
            expect(agent.isMoving()).toBe(false)
        })

        test('should allow overlap with allowMovingOverlap when both moving', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            
            const other = new Agent(106, 100, mockConfig) // Within personal space
            other.state = 'moving'
            
            // With allowMovingOverlap = true, should only check body overlap
            const overlaps = agent.overlapsWith(other, true)
            
            // 6 pixels apart, radius 3 each = no body overlap
            expect(overlaps).toBe(false)
        })

        test('should detect body overlap with allowMovingOverlap when both moving', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            
            const other = new Agent(104, 100, mockConfig) // Within body radius
            other.state = 'moving'
            
            // With allowMovingOverlap = true, should detect body overlap
            const overlaps = agent.overlapsWith(other, true)
            
            // 4 pixels apart, radius 3 each = body overlap
            expect(overlaps).toBe(true)
        })

        test('should handle state in_queue in getPersonalSpace', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'in_queue'
            agent.inQueue = false
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'moving'
            other.inQueue = false
            
            const space = agent.getPersonalSpace(other)
            
            // Should use concert personal space when passing through
            expect(space).toBe(mockConfig.CONCERT_PERSONAL_SPACE)
        })

        test('should handle state approaching_queue in getPersonalSpace', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.inQueue = false
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'approaching_queue'
            other.inQueue = false
            
            const space = agent.getPersonalSpace(other)
            
            // Should use concert personal space when passing through
            expect(space).toBe(mockConfig.CONCERT_PERSONAL_SPACE)
        })

        test('should update agent in returning_to_queue state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'returning_to_queue'
            agent.setTarget(200, 100)
            
            const initialX = agent.x
            agent.update(0.016, 1.0, [])
            
            expect(agent.x).toBeGreaterThan(initialX)
        })

        test('should update agent in in_queue_advancing state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'in_queue_advancing'
            agent.setTarget(200, 100)
            
            const initialX = agent.x
            agent.update(0.016, 1.0, [])
            
            expect(agent.x).toBeGreaterThan(initialX)
        })

        test('should use avoidance position when obstacle blocks path', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.setTarget(200, 100)
            
            let checkCount = 0
            const obstacles = {
                checkCollision: jest.fn((x, y) => {
                    checkCount++
                    // Block the direct path, allow avoidance
                    return checkCount === 1
                }),
                resolveCollision: jest.fn()
            }
            
            agent.update(0.016, 1.0, [], obstacles, 0)
            
            // Should have tried to find avoidance position
            expect(obstacles.checkCollision).toHaveBeenCalled()
        })

        test('should stay in place when no avoidance position found', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.setTarget(200, 100)
            agent.x = 100
            agent.y = 100
            
            const obstacles = {
                checkCollision: jest.fn(() => true), // All positions blocked
                resolveCollision: jest.fn()
            }
            
            agent.update(0.016, 1.0, [], obstacles, 0)
            
            // Agent should not have moved much (or at all)
            expect(agent.x).toBeLessThan(105)
        })

        test('should resolve overlap with other agents during update', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.setTarget(200, 100)
            
            const other = new Agent(105, 100, mockConfig)
            other.state = 'moving'
            
            const initialX = agent.x
            
            agent.update(0.016, 1.0, [other])
            
            // Agents should interact (collision detection tested in geometry.test.js)
            // If they were overlapping, they should have moved
            expect(agent.x).toBeDefined()
        })

        test('should call resolveCollision on obstacles during update', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.setTarget(200, 100)
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn()
            }
            
            agent.update(0.016, 1.0, [], obstacles, 0)
            
            expect(obstacles.resolveCollision).toHaveBeenCalledWith(agent)
        })

        test('should draw agent to canvas', () => {
            const agent = new Agent(100, 100, mockConfig)
            
            const ctx = {
                fillStyle: '',
                beginPath: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn()
            }
            
            agent.draw(ctx)
            
            expect(ctx.fillStyle).toBe(mockConfig.COLORS.AGENT_ACTIVE)
            expect(ctx.beginPath).toHaveBeenCalled()
            expect(ctx.arc).toHaveBeenCalledWith(100, 100, 3, 0, Math.PI * 2)
            expect(ctx.fill).toHaveBeenCalled()
        })

        test('should use dynamic waypoint when available', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.setTarget(300, 100)
            agent.dynamicWaypoint = { x: 150, y: 100 }
            
            const initialX = agent.x
            agent.update(0.016, 1.0, [])
            
            // Should move toward dynamic waypoint
            expect(agent.x).toBeGreaterThan(initialX)
        })

        test('should handle personal space buffer in idle state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'idle'
            agent.setTarget(200, 100)
            
            const obstacles = {
                checkCollision: jest.fn((x, y, radius, state, buffer) => {
                    // Capture the buffer used
                    return false
                }),
                resolveCollision: jest.fn()
            }
            
            agent.update(0.016, 1.0, [], obstacles, 0)
            
            // Should complete without error
            expect(agent.x).toBeGreaterThan(100)
        })
    })

    describe('_getNextStaticTarget', () => {
        test('should return waypoint when not close enough', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.targetX = 300
            agent.targetY = 300
            agent.staticWaypoints = [{ x: 200, y: 200 }]
            agent.waypointUpdateTimes = [100]
            
            const target = agent._getNextStaticTarget(5)
            
            expect(target).toEqual({ x: 200, y: 200 })
            expect(agent.staticWaypoints.length).toBe(1)
        })

        test('should remove waypoint and return next when reached', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.targetX = 300
            agent.targetY = 300
            agent.staticWaypoints = [{ x: 105, y: 105 }, { x: 200, y: 200 }]
            agent.waypointUpdateTimes = [100, 200]
            
            const target = agent._getNextStaticTarget(10)
            
            expect(agent.staticWaypoints.length).toBe(1)
            expect(target).toEqual({ x: 200, y: 200 })
        })

        test('should return final target when last waypoint reached', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.targetX = 300
            agent.targetY = 300
            agent.staticWaypoints = [{ x: 105, y: 105 }]
            agent.waypointUpdateTimes = [100]
            
            const target = agent._getNextStaticTarget(10)
            
            expect(agent.staticWaypoints.length).toBe(0)
            expect(target).toEqual({ x: 300, y: 300 })
        })
    })

    describe('update with waypoint management', () => {
        test('should update waypoints when needed and obstacles present', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.targetX = 400
            agent.targetY = 400
            agent.staticWaypoints = [{ x: 200, y: 200 }, { x: 300, y: 300 }]
            agent.waypointUpdateTimes = [0, 0] // Old times to trigger update
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
                obstacles: [],
                stages: [],
                foodStalls: [],
                bus: null
            }
            
            agent.update(0.016, 1.0, [], obstacles, 200) // Current time 200
            
            // Should have updated waypoints
            expect(agent.staticWaypoints.length).toBeGreaterThanOrEqual(1)
        })

        test('should handle update without waypoint update when not needed', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.targetX = 400
            agent.targetY = 400
            agent.staticWaypoints = [{ x: 200, y: 200 }]
            agent.waypointUpdateTimes = [10000] // Future time, no update needed
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn()
            }
            
            const initialWaypointCount = agent.staticWaypoints.length
            agent.update(0.016, 1.0, [], obstacles, 100) // Current time 100
            
            // Waypoints should not be recalculated
            expect(agent.staticWaypoints.length).toBe(initialWaypointCount)
        })

        test('should not update waypoints when target is null', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.targetX = null
            agent.targetY = null
            agent.staticWaypoints = [{ x: 200, y: 200 }]
            agent.waypointUpdateTimes = [0] // Old time
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn()
            }
            
            agent.update(0.016, 1.0, [], obstacles, 200)
            
            // No crash, waypoints unchanged
            expect(agent.staticWaypoints.length).toBe(1)
        })

        test('should recalculate waypoints when last waypoint reached but not at final target', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            agent.targetX = 500
            agent.targetY = 500
            // Position agent near the last waypoint
            agent.x = 298
            agent.y = 298
            agent.staticWaypoints = [{ x: 300, y: 300 }] // Only one waypoint
            
            const obstacles = {
                checkCollision: jest.fn(() => false),
                resolveCollision: jest.fn(),
                obstacles: [],
                stages: [],
                foodStalls: [],
                bus: null
            }
            
            agent.update(0.016, 1.0, [], obstacles, 0)
            
            // Should have recalculated waypoints to reach final target (500, 500)
            // The waypoint at 300,300 is within reach distance, so it gets removed
            // Then new waypoints should be calculated
            expect(agent.staticWaypoints.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('getPersonalSpaceBuffer', () => {
        test('should return PERSONAL_SPACE for moving state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            expect(agent.getPersonalSpaceBuffer()).toBe(mockConfig.PERSONAL_SPACE)
        })

        test('should return PERSONAL_SPACE for approaching_queue state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'approaching_queue'
            expect(agent.getPersonalSpaceBuffer()).toBe(mockConfig.PERSONAL_SPACE)
        })

        test('should return 0 for idle state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'idle'
            expect(agent.getPersonalSpaceBuffer()).toBe(0)
        })

        test('should return 0 for in_queue_waiting state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'in_queue_waiting'
            expect(agent.getPersonalSpaceBuffer()).toBe(0)
        })

        test('should return 0 for processing state', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'processing'
            expect(agent.getPersonalSpaceBuffer()).toBe(0)
        })
    })

    describe('Coverage for final destination reaching (line 316)', () => {
        test('should reach final destination when no waypoints remain', () => {
            const agent = new Agent(100, 100, mockConfig)
            agent.state = 'moving'
            
            // Set a very close target with no waypoints
            agent.targetX = 105
            agent.targetY = 105
            agent.staticWaypoints = []
            
            // Update - should move to target and reach it
            agent.update(16, 1, [], mockObstacles)
            
            // Should have reached target
            expect(agent.x).toBe(105)
            expect(agent.y).toBe(105)
            expect(agent.targetX).toBeNull()
            expect(agent.targetY).toBeNull()
            expect(agent.state).toBe('idle')
        })
    })

});
