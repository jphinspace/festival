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
});
