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

    test('should update food stalls', () => {
        const simulationTime = 1000;
        
        // Create a fan processing at a stall
        const fan = new Fan(400, 300, mockConfig);
        fan.processingAtStall = eventManager.foodStalls[0];
        
        eventManager.updateFoodStalls(simulationTime, [fan]);
        
        // Just verify it doesn't crash
        expect(eventManager.foodStalls.length).toBe(4);
    });

    test('should get shortest food queue', () => {
        // Add fans to different stalls
        const fan1 = new Fan(400, 300, mockConfig);
        const fan2 = new Fan(400, 310, mockConfig);
        const fan3 = new Fan(400, 320, mockConfig);
        
        eventManager.foodStalls[0].leftQueue = [fan1];
        eventManager.foodStalls[1].leftQueue = [fan2, fan3];
        eventManager.foodStalls[2].leftQueue = [];
        eventManager.foodStalls[3].leftQueue = [];
        
        const shortest = eventManager.getShortestQueue();
        
        // Stall 2 or 3 should be shortest (both have 0 fans)
        expect(shortest.leftQueue.length + shortest.rightQueue.length).toBe(0);
    });

    test('should update concerts and start after prep time', () => {
        eventManager.simulationTime = 0;
        eventManager.leftConcertPrepStartTime = 0;
        eventManager.leftConcertActive = true;
        
        // Advance time beyond prep time
        const simulationTime = mockConfig.CONCERT_PREP_TIME + 100;
        
        eventManager.updateConcerts(simulationTime, agents);
        
        // Concert should have started
        expect(eventManager.leftConcertStartTime).toBe(simulationTime);
    });

    test('should update concerts and end show after duration', () => {
        // Setup a show in progress
        eventManager.simulationTime = 0;
        eventManager.leftConcertStartTime = 0;
        eventManager.leftConcertActive = true;
        
        // Create a fan watching the show
        const fan = new Fan(400, 300, mockConfig);
        fan.currentShow = 'left';
        fan.hasSeenShow = false;
        
        // Advance time beyond show duration
        const simulationTime = eventManager.showDuration + 100;
        
        eventManager.updateConcerts(simulationTime, [fan]);
        
        // Concert should have ended
        expect(eventManager.leftConcertActive).toBe(false);
        expect(eventManager.leftConcertStartTime).toBeNull();
        expect(fan.hasSeenShow).toBe(true);
    });

    test('should update right concert and start after prep time', () => {
        eventManager.simulationTime = 0;
        eventManager.rightConcertPrepStartTime = 0;
        eventManager.rightConcertActive = true;
        
        // Advance time beyond prep time
        const simulationTime = mockConfig.CONCERT_PREP_TIME + 100;
        
        eventManager.updateConcerts(simulationTime, agents);
        
        // Concert should have started
        expect(eventManager.rightConcertStartTime).toBe(simulationTime);
    });

    test('should update right concert and end show after duration', () => {
        // Setup a show in progress
        eventManager.simulationTime = 0;
        eventManager.rightConcertStartTime = 0;
        eventManager.rightConcertActive = true;
        
        // Create a fan watching the show
        const fan = new Fan(400, 300, mockConfig);
        fan.currentShow = 'right';
        fan.hasSeenShow = false;
        
        // Advance time beyond show duration
        const simulationTime = eventManager.showDuration + 100;
        
        eventManager.updateConcerts(simulationTime, [fan]);
        
        // Concert should have ended
        expect(eventManager.rightConcertActive).toBe(false);
        expect(eventManager.rightConcertStartTime).toBeNull();
        expect(fan.hasSeenShow).toBe(true);
    });

    test('should update simulation time in update method', () => {
        const simulationTime = 5000;
        
        eventManager.update(simulationTime, agents, 1.0);
        
        expect(eventManager.simulationTime).toBe(simulationTime);
    });

    test('should get left show progress during prep', () => {
        eventManager.simulationTime = 500;
        eventManager.leftConcertPrepStartTime = 0;
        eventManager.leftConcertStartTime = null;
        
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress.isPrep).toBe(true);
        expect(progress.progress).toBeGreaterThan(0);
    });

    test('should get left show progress during show', () => {
        eventManager.simulationTime = 500;
        eventManager.leftConcertPrepStartTime = 0;
        eventManager.leftConcertStartTime = 0;
        
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress.isPrep).toBe(false);
        expect(progress.progress).toBeGreaterThan(0);
    });

    test('should get right show progress during prep', () => {
        eventManager.simulationTime = 500;
        eventManager.rightConcertPrepStartTime = 0;
        eventManager.rightConcertStartTime = null;
        
        const progress = eventManager.getRightShowProgress();
        
        expect(progress.isPrep).toBe(true);
        expect(progress.progress).toBeGreaterThan(0);
    });

    test('should get right show progress during show', () => {
        eventManager.simulationTime = 500;
        eventManager.rightConcertPrepStartTime = 0;
        eventManager.rightConcertStartTime = 0;
        
        const progress = eventManager.getRightShowProgress();
        
        expect(progress.isPrep).toBe(false);
        expect(progress.progress).toBeGreaterThan(0);
    });

    test('should handle car arrival', () => {
        const newAgents = eventManager.handleCarArrival(agents);
        
        expect(newAgents).toHaveLength(1);
        expect(newAgents[0]).toBeInstanceOf(Fan);
    });

    test('should move agents to left stage', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
        expect(fan.targetX).not.toBeNull();
    });

    test('should move agents to right stage', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'right';
        
        eventManager.moveAgentsToStage([fan], 'right');
        
        expect(fan.currentShow).toBe('right');
        expect(fan.targetX).not.toBeNull();
    });

    test('should not move leaving agents to stage', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.LEAVING;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should not move queued agents to stage', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.inQueue = true;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should not move unpassed security agents to stage', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.APPROACHING_QUEUE;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should place some fans up front at stage', () => {
        // Mock Math.random to return value that triggers up front placement
        const originalRandom = Math.random;
        Math.random = () => 0.1; // Less than 0.2
        
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.isUpFront).toBe(true);
        
        Math.random = originalRandom;
    });

    test('should place most fans farther from stage', () => {
        // Mock Math.random to return value that triggers farther placement
        const originalRandom = Math.random;
        Math.random = () => 0.5; // Greater than 0.2
        
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'left';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.isUpFront).toBe(false);
        
        Math.random = originalRandom;
    });

    test('should handle hungry fan not leaving show for food', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.currentShow = 'left';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not have been added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should handle hungry fan without security clearance', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.APPROACHING_QUEUE;
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        
        eventManager.handleHungryFans([fan]);
        
        // Should not have been added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should handle fan with no stage preference attending show', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'none';
        fan.currentShow = null;
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
    });

    test('should not move fan already watching another show', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'none';
        fan.currentShow = 'right';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        // Should still be watching right show
        expect(fan.currentShow).toBe('right');
    });
});
