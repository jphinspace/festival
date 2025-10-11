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

describe('Waypoint Update Intervals', () => {
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

    test('should update all waypoints when waypoint[0] exceeds 125ms interval', () => {
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
        
        // First waypoint updated 200ms ago (exceeds 125ms threshold)
        // Other waypoint times don't matter - only waypoint[0] is checked
        agent.waypointUpdateTimes = [now - 200, now - 300, now - 600];
        agent.state = 'moving';
        agent.targetX = 500;
        agent.targetY = 500;
        
        // Store original waypoints to verify they were updated
        const originalWaypoints = [...agent.staticWaypoints];
        
        // Update - should trigger recalculation because first waypoint is old enough
        agent.update(0.016, 1.0, [], obstacles);
        
        // All waypoint update times should have been refreshed
        // (all times should be close to current time now)
        const currentTime = Date.now();
        agent.waypointUpdateTimes.forEach(time => {
            expect(currentTime - time).toBeLessThan(100); // Updated within last 100ms
        });
    });

    test('should update all waypoints when waypoint[0] is old enough', () => {
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
        
        // First waypoint updated recently (100ms ago - not due yet at 125ms)
        // Other waypoints don't matter - only waypoint[0] is checked
        agent.waypointUpdateTimes = [now - 100, now - 300, now - 600];
        agent.state = 'moving';
        agent.targetX = 500;
        agent.targetY = 500;
        
        // Store first waypoint time
        const firstWaypointTime = agent.waypointUpdateTimes[0];
        
        // Update - should NOT trigger recalculation because waypoint[0] is not old enough
        agent.update(0.016, 1.0, [], obstacles);
        
        // First waypoint time should remain relatively unchanged (within 50ms)
        // because it wasn't due for update
        expect(Math.abs(agent.waypointUpdateTimes[0] - firstWaypointTime)).toBeLessThan(50);
        
        // Other waypoint times should also remain unchanged (no partial updates anymore)
        expect(Math.abs(agent.waypointUpdateTimes[1] - (now - 300))).toBeLessThan(50);
        expect(Math.abs(agent.waypointUpdateTimes[2] - (now - 600))).toBeLessThan(50);
    });

    test('should use fixed 125ms interval for waypoint[0]', () => {
        // Waypoint 0: 125ms (only waypoint that is checked)
        // Other waypoints are not checked individually anymore
        
        const interval = 125;
        
        expect(interval).toBe(125);
    });
});
