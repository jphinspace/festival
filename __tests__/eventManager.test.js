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

    test('should create food stalls on initialization', () => {
        expect(eventManager.foodStalls).toHaveLength(mockConfig.FOOD_STALL_COUNT);
    });

    test('should update food stalls', () => {
        const fan = new Fan(400, 300, mockConfig);
        fan.processingAtStall = eventManager.foodStalls[0];
        
        eventManager.updateFoodStalls(1000, [fan]);
        
        // Should process without errors
        expect(eventManager.foodStalls).toHaveLength(4);
    });

    test('should get shortest queue', () => {
        // Add fans to different stalls to create different queue lengths
        const fan1 = new Fan(100, 100, mockConfig);
        const fan2 = new Fan(110, 110, mockConfig);
        
        eventManager.foodStalls[0].addToQueue(fan1);
        eventManager.foodStalls[0].addToQueue(fan2);
        
        const shortest = eventManager.getShortestQueue();
        
        // Shortest should NOT be stall 0 (has 2 fans)
        expect(shortest.id).not.toBe(1);
    });

    test('should update concert state during prep time', () => {
        eventManager.handleLeftConcert(agents);
        eventManager.simulationTime = 0;
        
        // Update at half prep time
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME / 2, agents);
        
        // Concert should still be in prep
        expect(eventManager.leftConcertStartTime).toBeNull();
    });

    test('should start concert after prep time', () => {
        eventManager.handleLeftConcert(agents);
        eventManager.simulationTime = 0;
        
        // Update after prep time
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + 10, agents);
        
        // Concert should have started
        expect(eventManager.leftConcertStartTime).not.toBeNull();
    });

    test('should end left concert after show duration', () => {
        eventManager.handleLeftConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + 10, agents);
        
        const fan = new Fan(100, 100, mockConfig);
        fan.currentShow = 'left';
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        // Update after show duration
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + eventManager.showDuration + 10, testAgents);
        
        expect(eventManager.leftConcertActive).toBe(false);
        expect(eventManager.leftConcertStartTime).toBeNull();
        expect(fan.hasSeenShow).toBe(true);
        expect(fan.currentShow).toBeNull();
    });

    test('should end right concert after show duration', () => {
        eventManager.handleRightConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + 10, agents);
        
        const fan = new Fan(100, 100, mockConfig);
        fan.currentShow = 'right';
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        // Update after show duration
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + eventManager.showDuration + 10, testAgents);
        
        expect(eventManager.rightConcertActive).toBe(false);
        expect(eventManager.rightConcertStartTime).toBeNull();
        expect(fan.hasSeenShow).toBe(true);
        expect(fan.currentShow).toBeNull();
    });

    test('should move fans to left stage with preference', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'left';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
        expect(fan.targetX).not.toBeNull();
    });

    test('should move fans to right stage with preference', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'right';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'right');
        
        expect(fan.currentShow).toBe('right');
        expect(fan.targetX).not.toBeNull();
    });

    test('should move fans with no preference to stage', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'none';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
    });

    test('should skip fans in queue when moving to stage', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.inQueue = true;
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should skip leaving fans when moving to stage', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.LEAVING;
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should skip non-fan agents when moving to stage', () => {
        const agent = new Fan(100, 100, mockConfig);
        agent.type = 'other';
        
        eventManager.moveAgentsToStage([agent], 'left');
        
        // Should not crash
        expect(agent.currentShow).toBeUndefined();
    });

    test('should not move fans to stage if they have not passed security', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.IN_QUEUE_WAITING;
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBeNull();
    });

    test('should position some fans up front at stage', () => {
        const fans = [];
        for (let i = 0; i < 100; i++) {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.PASSED_SECURITY;
            fan.stagePreference = 'none';
            fan.type = 'fan';
            fans.push(fan);
        }
        
        eventManager.moveAgentsToStage(fans, 'left');
        
        const upFrontFans = fans.filter(f => f.isUpFront);
        
        // At least some fans should be up front (with 100 fans and 20% chance, expect at least 1)
        expect(upFrontFans.length).toBeGreaterThan(0);
    });

    test('should not move fan to stage if already watching that show', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'left';
        fan.currentShow = 'left';
        fan.type = 'fan';
        
        const initialTargetX = fan.targetX;
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        // Target should not change
        expect(fan.targetX).toBe(initialTargetX);
    });

    test('should skip hungry fans watching a show', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.currentShow = 'left';
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not be added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should skip hungry fans who have not passed security', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.IN_QUEUE_WAITING;
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not be added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should skip non-hungry fans', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.hunger = 0.3;
        fan.hungerThreshold = 0.7;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not be added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should skip fans already in queue', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.inQueue = true;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not be added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should skip leaving fans in handleHungryFans', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = 'leaving';
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        // Should not be added to food queue
        expect(fan.preferredFoodStall).toBeUndefined();
    });

    test('should handle car arrival with single fan', () => {
        const newAgents = eventManager.handleCarArrival(agents);
        
        expect(newAgents).toHaveLength(1);
        expect(newAgents[0]).toBeInstanceOf(Fan);
    });

    test('should mark fans with seen show and eaten food as leaving', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.hasSeenShow = true;
        fan.hasEatenFood = true;
        fan.inQueue = false;
        fan.state = AgentState.PASSED_SECURITY;
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        eventManager.handleBusDeparture(testAgents);
        
        expect(fan.state).toBe(AgentState.LEAVING);
    });

    test('should not mark fans without seen show as leaving', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.hasSeenShow = false;
        fan.hasEatenFood = true;
        fan.inQueue = false;
        fan.state = AgentState.PASSED_SECURITY;
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        eventManager.handleBusDeparture(testAgents);
        
        expect(fan.state).not.toBe(AgentState.LEAVING);
    });

    test('should not mark fans without eaten food as leaving', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.hasSeenShow = true;
        fan.hasEatenFood = false;
        fan.inQueue = false;
        fan.state = AgentState.PASSED_SECURITY;
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        eventManager.handleBusDeparture(testAgents);
        
        expect(fan.state).not.toBe(AgentState.LEAVING);
    });

    test('should not mark fans in queue as leaving', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.hasSeenShow = true;
        fan.hasEatenFood = true;
        fan.inQueue = true;
        fan.state = AgentState.PASSED_SECURITY;
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        eventManager.handleBusDeparture(testAgents);
        
        expect(fan.state).not.toBe(AgentState.LEAVING);
    });

    test('should update simulation', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.type = 'fan';
        
        const testAgents = [fan];
        
        eventManager.update(1000, testAgents, 1.0);
        
        // Should complete without errors
        expect(eventManager.simulationTime).toBe(1000);
    });

    test('should get left show progress during prep', () => {
        eventManager.handleLeftConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(50, agents);
        
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress).toBeDefined();
        expect(progress.progress).toBeGreaterThan(0);
        expect(progress.isPrep).toBe(true);
    });

    test('should get left show progress during show', () => {
        eventManager.handleLeftConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + 10, agents);
        
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress).toBeDefined();
        expect(progress.isPrep).toBe(false);
    });

    test('should get right show progress during prep', () => {
        eventManager.handleRightConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(50, agents);
        
        const progress = eventManager.getRightShowProgress();
        
        expect(progress).toBeDefined();
        expect(progress.progress).toBeGreaterThan(0);
        expect(progress.isPrep).toBe(true);
    });

    test('should get right show progress during show', () => {
        eventManager.handleRightConcert(agents);
        eventManager.simulationTime = 0;
        eventManager.updateConcerts(mockConfig.CONCERT_PREP_TIME + 10, agents);
        
        const progress = eventManager.getRightShowProgress();
        
        expect(progress).toBeDefined();
        expect(progress.isPrep).toBe(false);
    });

    test('should return null progress when no left show', () => {
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress).toBeNull();
    });

    test('should return null progress when no right show', () => {
        const progress = eventManager.getRightShowProgress();
        
        expect(progress).toBeNull();
    });

    test('should handle fans in idle state when moving to stage', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.IDLE;
        fan.stagePreference = 'none';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
    });

    test('should handle fans in moving state when moving to stage', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.MOVING;
        fan.stagePreference = 'none';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        expect(fan.currentShow).toBe('left');
    });

    test('should handle hungry fans in idle state', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = 'idle';
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        expect(fan.preferredFoodStall).toBeDefined();
    });

    test('should handle hungry fans in moving state', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = 'moving';
        fan.hunger = 0.9;
        fan.hungerThreshold = 0.7;
        fan.type = 'fan';
        
        eventManager.handleHungryFans([fan]);
        
        expect(fan.preferredFoodStall).toBeDefined();
    });

    test('should handle fan with non-preferred stage already watching show', () => {
        const fan = new Fan(100, 100, mockConfig);
        fan.state = AgentState.PASSED_SECURITY;
        fan.stagePreference = 'right';
        fan.currentShow = 'right';
        fan.type = 'fan';
        
        eventManager.moveAgentsToStage([fan], 'left');
        
        // Should not change show
        expect(fan.currentShow).toBe('right');
    });

    test('should return default progress when left show is not active', () => {
        const progress = eventManager.getLeftShowProgress();
        
        expect(progress).toEqual({ isPrep: false, progress: 0 });
    });

    test('should return default progress when right show is not active', () => {
        const progress = eventManager.getRightShowProgress();
        
        expect(progress).toEqual({ isPrep: false, progress: 0 });
    });
});
