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

describe('Agent', () => {
    let agent;

    beforeEach(() => {
        agent = new Agent(100, 100, mockConfig);
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
        const otherAgent = new Agent(108, 100, mockConfig); // Within personal space (8 pixels away, < 12)
        expect(agent.overlapsWith(otherAgent)).toBe(true);
        
        const farAgent = new Agent(200, 200, mockConfig); // Far away
        expect(agent.overlapsWith(farAgent)).toBe(false);
    });

    test('should resolve overlaps by pushing agents apart', () => {
        // Place agents so their bodies overlap (radius + radius = 6 pixels)
        const otherAgent = new Agent(105, 100, mockConfig); // 5 pixels away (bodies overlap since radius=3 each)
        const initialDistance = Math.sqrt((agent.x - otherAgent.x) ** 2 + (agent.y - otherAgent.y) ** 2);
        
        agent.resolveOverlap(otherAgent);
        
        const finalDistance = Math.sqrt((agent.x - otherAgent.x) ** 2 + (agent.y - otherAgent.y) ** 2);
        expect(finalDistance).toBeGreaterThan(initialDistance);
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

        const distanceMoved1 = agent.x - 100;
        const distanceMoved2 = agent2.x - 100;

        expect(distanceMoved2).toBeGreaterThan(distanceMoved1);
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
        expect(agent.isNearTarget(10)).toBe(true);
        expect(agent.isNearTarget(5)).toBe(false);
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
        const otherFan = new Fan(108, 100, mockConfig); // Within personal space (8 pixels away)
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

});
