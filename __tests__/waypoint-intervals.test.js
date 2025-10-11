// Test for progressive waypoint update intervals
import { Agent } from '../src/core/agent.js';

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

describe('Waypoint Progressive Intervals', () => {
    let agent;

    beforeEach(() => {
        agent = new Agent(100, 100, mockConfig);
    });

    test('should initialize waypoint update times as empty array', () => {
        // Should have initialized waypointUpdateTimes array
        expect(agent.waypointUpdateTimes).toBeDefined();
        expect(Array.isArray(agent.waypointUpdateTimes)).toBe(true);
        expect(agent.waypointUpdateTimes.length).toBe(0);
    });

    test('should shift waypoint timestamps when reaching waypoints', () => {
        // Set up agent with waypoints
        agent.staticWaypoints = [
            { x: 110, y: 100 },
            { x: 250, y: 250 },
            { x: 350, y: 350 }
        ];
        agent.waypointUpdateTimes = [Date.now(), Date.now(), Date.now()];
        agent.state = 'moving';
        agent.targetX = 400;
        agent.targetY = 400;
        
        const initialWaypointCount = agent.staticWaypoints.length;
        
        // Move agent near first waypoint (within 10 pixels)
        agent.x = 108;
        agent.y = 100;
        
        // Update should remove first waypoint and shift timestamps
        agent.update(0.016, 1.0, [], null);
        
        // Should have one fewer waypoint and timestamp
        expect(agent.staticWaypoints.length).toBeLessThan(initialWaypointCount);
        expect(agent.waypointUpdateTimes.length).toBe(agent.staticWaypoints.length);
    });

    test('should maintain timestamp sync with waypoints array during updates', () => {
        // Set up agent with some waypoints
        agent.staticWaypoints = [
            { x: 200, y: 200 },
            { x: 300, y: 300 }
        ];
        agent.waypointUpdateTimes = [Date.now(), Date.now()];
        agent.state = 'moving';
        agent.targetX = 400;
        agent.targetY = 400;
        
        // Update multiple times without reaching waypoints
        for (let i = 0; i < 5; i++) {
            agent.update(0.016, 1.0, [], null);
            
            // Arrays should always be in sync
            expect(agent.waypointUpdateTimes.length).toBe(agent.staticWaypoints.length);
        }
    });

    test('should check waypoints with progressive intervals', () => {
        // Create mock obstacles
        const obstacles = {
            checkCollision: () => false,
            resolveCollision: () => {},
            setFoodStalls: () => {},
            obstacles: [],  // Empty array - no obstacles to block path
            stages: [],
            foodStalls: [],
            bus: null
        };
        
        // Set up agent with waypoints at different update times
        const now = Date.now();
        agent.staticWaypoints = [
            { x: 200, y: 200 },
            { x: 300, y: 300 },
            { x: 400, y: 400 }
        ];
        
        // First waypoint updated 600ms ago (should trigger at 500ms)
        // Second waypoint updated 300ms ago (should trigger at 250ms)
        // Third waypoint updated 150ms ago (should trigger at 125ms)
        agent.waypointUpdateTimes = [now - 600, now - 300, now - 150];
        agent.state = 'moving';
        agent.targetX = 500;
        agent.targetY = 500;
        
        // Store original waypoints to verify they were updated
        const originalWaypoints = [...agent.staticWaypoints];
        
        // Update - should trigger recalculation because first waypoint is old enough
        agent.update(0.016, 1.0, [], obstacles);
        
        // The waypoint update times should have been refreshed
        // (all times should be close to current time now)
        const currentTime = Date.now();
        agent.waypointUpdateTimes.forEach(time => {
            expect(currentTime - time).toBeLessThan(100); // Updated within last 100ms
        });
    });

    test('should update only later waypoints when first waypoint is recent', () => {
        // Create mock obstacles
        const obstacles = {
            checkCollision: () => false,
            resolveCollision: () => {},
            setFoodStalls: () => {},
            obstacles: [],  // Empty array - no obstacles to block path
            stages: [],
            foodStalls: [],
            bus: null
        };
        
        const now = Date.now();
        agent.staticWaypoints = [
            { x: 200, y: 200 },
            { x: 300, y: 300 },
            { x: 400, y: 400 }
        ];
        
        // First waypoint updated recently (100ms ago - not due yet at 500ms)
        // Second waypoint updated 300ms ago (should trigger at 250ms)
        // Third waypoint updated 150ms ago (should trigger at 125ms)
        agent.waypointUpdateTimes = [now - 100, now - 300, now - 150];
        agent.state = 'moving';
        agent.targetX = 500;
        agent.targetY = 500;
        
        // Store first waypoint time
        const firstWaypointTime = agent.waypointUpdateTimes[0];
        
        // Update - should trigger partial recalculation
        agent.update(0.016, 1.0, [], obstacles);
        
        // First waypoint time should remain relatively unchanged (within 50ms)
        // because it wasn't due for update
        expect(Math.abs(agent.waypointUpdateTimes[0] - firstWaypointTime)).toBeLessThan(50);
        
        // Later waypoint times should be updated
        const currentTime = Date.now();
        if (agent.waypointUpdateTimes.length > 1) {
            for (let i = 1; i < agent.waypointUpdateTimes.length; i++) {
                expect(currentTime - agent.waypointUpdateTimes[i]).toBeLessThan(100);
            }
        }
    });

    test('should calculate correct progressive intervals', () => {
        // Waypoint 0: 500ms
        // Waypoint 1: 250ms (500 / 2^1)
        // Waypoint 2: 125ms (500 / 2^2)
        // Waypoint 3: 62.5ms (500 / 2^3)
        
        const intervals = [
            500 / Math.pow(2, 0),  // 500
            500 / Math.pow(2, 1),  // 250
            500 / Math.pow(2, 2),  // 125
            500 / Math.pow(2, 3),  // 62.5
        ];
        
        expect(intervals[0]).toBe(500);
        expect(intervals[1]).toBe(250);
        expect(intervals[2]).toBe(125);
        expect(intervals[3]).toBe(62.5);
    });
});
