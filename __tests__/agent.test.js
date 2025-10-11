// Unit tests for Agent class
import { Agent } from '../src/core/agent.js';
import { Fan } from '../src/core/fan.js';

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    PERSONAL_SPACE: 12,
    CONCERT_PERSONAL_SPACE: 4,
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
    
    test('should not generate wrong-direction waypoints when target is near obstacle buffer', () => {
        // Simulate the bug scenario from the issue:
        // Fan is approaching a food stall queue position
        // The queue position is within the personal space buffer of the food stall
        // There should be NO waypoints generated because path is clear
        
        // Create a mock Obstacles object with a food stall
        const mockObstacles = {
            obstacles: [
                {
                    type: 'foodStall',
                    x: 300,
                    y: 200,
                    width: 40,
                    height: 40
                }
            ],
            width: 800,
            height: 600,
            checkCollision: () => false,
            isValidPosition: () => true
        };
        
        // Fan is to the LEFT of the food stall
        fan.x = 200;
        fan.y = 220;
        fan.state = 'approaching_queue';
        
        // Target is the LEFT queue position (within personal space buffer of food stall)
        // Queue positions are spacing * (position + 1) away from the stall
        const targetX = 300 - 8; // 8 pixels to the left of stall
        const targetY = 220;
        
        // Calculate waypoints
        const waypoints = fan.calculateStaticWaypoints(targetX, targetY, mockObstacles);
        
        // The path should be clear - no waypoints needed
        // The bug was: waypoints were generated going around the food stall
        // even though the target (queue position) is BEFORE the obstacle
        expect(waypoints.length).toBe(0);
    });
});
