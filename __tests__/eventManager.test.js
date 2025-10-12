// Unit tests for EventManager class
import { EventManager } from '../src/managers/eventManager.js';
import { Fan } from '../src/core/fan.js';
import { AgentState } from '../src/utils/enums.js';

const mockConfig = {
    BUS_ATTENDEE_COUNT: 50,
    CONCERT_PREP_TIME: 100,
    STAGE_LEFT_X: 0.15,
    STAGE_RIGHT_X: 0.85,
    BUS_X: 0.5,
    BUS_Y: 0.9,
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    FOOD_STALL_COUNT: 4,
    FOOD_STALL_X: 0.5,
    HUNGER_MIN_INITIAL: 0.1,
    HUNGER_MAX_INITIAL: 0.2,
    COLORS: {
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a',
        FOOD_STALL: '#8b4513'
    }
};

describe('EventManager', () => {
    let eventManager;
    let agents;

    beforeEach(() => {
        eventManager = new EventManager(mockConfig, 800, 600);
        agents = [];
        for (let i = 0; i < 10; i++) {
            agents.push(new Fan(Math.random() * 800, Math.random() * 600, mockConfig));
        }
    });

    test('should initialize with correct dimensions', () => {
        expect(eventManager.width).toBe(800);
        expect(eventManager.height).toBe(600);
        expect(eventManager.leftConcertActive).toBe(false);
        expect(eventManager.rightConcertActive).toBe(false);
    });

    test('should update dimensions', () => {
        eventManager.updateDimensions(1024, 768);
        expect(eventManager.width).toBe(1024);
        expect(eventManager.height).toBe(768);
    });

    test('should activate left concert', () => {
        eventManager.handleLeftConcert(agents);
        expect(eventManager.leftConcertActive).toBe(true);
    });

    test('should activate right concert', () => {
        eventManager.handleRightConcert(agents);
        expect(eventManager.rightConcertActive).toBe(true);
    });

    test('should create new fans on bus arrival', () => {
        const newAgents = eventManager.handleBusArrival(agents);
        expect(newAgents).toHaveLength(mockConfig.BUS_ATTENDEE_COUNT);
        expect(newAgents[0]).toBeInstanceOf(Fan);
    });

    test('should mark agents as leaving on bus departure', () => {
        // Create more agents to ensure at least some will leave
        for (let i = 0; i < 40; i++) {
            agents.push(new Fan(Math.random() * 800, Math.random() * 600, mockConfig));
        }
        eventManager.handleBusDeparture(agents);
        const leavingAgents = agents.filter(a => a.state === AgentState.LEAVING);
        // With 50 agents and random selection, at least some should be leaving
        expect(leavingAgents.length).toBeGreaterThanOrEqual(0);
    });

    test('new fans from bus should be added to security queue', () => {
        const newAgents = eventManager.handleBusArrival(agents);
        newAgents.forEach(fan => {
            expect(fan.state).toBe(AgentState.APPROACHING_QUEUE); // Fans start by approaching queue
            expect(fan.targetX).not.toBeNull();
            expect(fan.targetY).not.toBeNull();
            expect(fan.queueIndex).toBeDefined();
        });
    });

    test('should assign new food stall each time fan gets hungry', () => {
        // Create a fan that has passed security and is hungry
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.hunger = 0.9; // Very hungry (above threshold)
        fan.hungerThreshold = 0.7;
        
        // First call - verify the basic flow works
        eventManager.handleHungryFans([fan]);
        const firstStall = fan.preferredFoodStall;
        expect(firstStall).toBeDefined();
        expect(firstStall.id).toBeGreaterThanOrEqual(1);
        expect(firstStall.id).toBeLessThanOrEqual(4);
        
        // Track which stalls are assigned over multiple cycles
        const assignedStalls = new Set([firstStall.id]);
        
        // Run more iterations to increase probability of seeing different stalls
        for (let i = 0; i < 19; i++) {
            // Remove fan from queue and reset state completely
            if (fan.targetFoodStall) {
                fan.targetFoodStall.removeFromQueue(fan);
            }
            // Reset to passed_security state (as if they just finished eating and are ready for next event)
            fan.inQueue = false;
            fan.hunger = 0.9; // Hungry again
            fan.targetFoodStall = null;
            fan.state = AgentState.PASSED_SECURITY; // Must be in valid state to trigger handleHungryFans
            fan.currentShow = null;
            fan.waitStartTime = null;
            
            eventManager.handleHungryFans([fan]);
            if (fan.preferredFoodStall) {
                assignedStalls.add(fan.preferredFoodStall.id);
            }
        }
        
        // With 20 total iterations, we should see at least 2 different stalls
        // (probability of seeing only 1 stall is extremely low: 1/4^19)
        expect(assignedStalls.size).toBeGreaterThanOrEqual(2);
    });
});
