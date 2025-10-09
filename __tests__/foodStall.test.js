// Unit tests for FoodStall class
import { FoodStall } from '../foodStall.js';
import { Fan } from '../fan.js';

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    HUNGER_MIN_INITIAL: 0.5,
    HUNGER_MAX_INITIAL: 0.8,
    HUNGER_INCREASE_RATE: 0.02,
    HUNGER_DECREASE_AMOUNT: 0.5,
    FOOD_WAIT_TIME: 1000,
    COLORS: {
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a',
        FOOD_STALL: '#8b4513',
        TEXT: '#fff'
    }
};

describe('FoodStall', () => {
    let foodStall;

    beforeEach(() => {
        foodStall = new FoodStall(100, 100, mockConfig);
    });

    test('should initialize with correct properties', () => {
        expect(foodStall.x).toBe(100);
        expect(foodStall.y).toBe(100);
        expect(foodStall.leftQueue).toEqual([]);
        expect(foodStall.rightQueue).toEqual([]);
        expect(foodStall.width).toBe(20);
        expect(foodStall.height).toBe(30);
    });

    test('should add fan to queue', () => {
        const fan = new Fan(50, 50, mockConfig);
        const position = foodStall.addToQueue(fan);
        
        expect(position).toBe(0);
        // Fan is initially in approaching list, not actual queue
        const totalInSystem = foodStall.leftQueue.length + foodStall.rightQueue.length +
                             foodStall.leftApproaching.length + foodStall.rightApproaching.length;
        expect(totalInSystem).toBe(1);
        expect(fan.inQueue).toBe(true);
        expect(fan.targetFoodStall).toBe(foodStall);
        expect(fan.queueSide).toBeTruthy();
    });

    test('should not add same fan twice', () => {
        const fan = new Fan(50, 50, mockConfig);
        foodStall.addToQueue(fan);
        const position = foodStall.addToQueue(fan);
        
        expect(position).toBe(-1);
        const totalInSystem = foodStall.leftQueue.length + foodStall.rightQueue.length +
                             foodStall.leftApproaching.length + foodStall.rightApproaching.length;
        expect(totalInSystem).toBe(1);
    });

    test('should remove fan from queue', () => {
        const fan = new Fan(50, 50, mockConfig);
        foodStall.addToQueue(fan);
        foodStall.removeFromQueue(fan);
        
        expect(foodStall.leftQueue).toHaveLength(0);
        expect(foodStall.rightQueue).toHaveLength(0);
        expect(foodStall.leftApproaching).toHaveLength(0);
        expect(foodStall.rightApproaching).toHaveLength(0);
        expect(fan.inQueue).toBe(false);
        expect(fan.targetFoodStall).toBeNull();
    });

    test('should get queue position', () => {
        const fan1 = new Fan(50, 50, mockConfig);
        const fan2 = new Fan(60, 60, mockConfig);
        
        foodStall.addToQueue(fan1);
        foodStall.addToQueue(fan2);
        
        expect(foodStall.getQueuePosition(fan1)).toBeGreaterThanOrEqual(0);
        expect(foodStall.getQueuePosition(fan2)).toBeGreaterThanOrEqual(0);
    });

    test('should check if fan is at front', () => {
        const fan1 = new Fan(50, 50, mockConfig);
        const fan2 = new Fan(60, 60, mockConfig);
        
        // Manually add fan1 directly to queue to simulate having reached position
        foodStall.leftQueue.push(fan1);
        fan1.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan1.queueSide = 'left';
        
        // Add fan2 normally (will be in approaching)
        foodStall.addToQueue(fan2);
        
        expect(foodStall.isAtFront(fan1)).toBe(true);
        expect(foodStall.isAtFront(fan2)).toBe(false); // fan2 is still approaching
    });

    test('should get queue target position for left side', () => {
        const pos0 = foodStall.getQueueTargetPosition(0, 'left');
        const pos1 = foodStall.getQueueTargetPosition(1, 'left');
        
        expect(pos0.x).toBeLessThan(foodStall.x);
        expect(pos1.x).toBeLessThan(pos0.x);
        expect(pos0.y).toBe(foodStall.y + foodStall.height / 2);
    });
    
    test('should get queue target position for right side', () => {
        const pos0 = foodStall.getQueueTargetPosition(0, 'right');
        const pos1 = foodStall.getQueueTargetPosition(1, 'right');
        
        expect(pos0.x).toBeGreaterThan(foodStall.x + foodStall.width);
        expect(pos1.x).toBeGreaterThan(pos0.x);
        expect(pos0.y).toBe(foodStall.y + foodStall.height / 2);
    });

    test('should process queue and decrease hunger after wait time', () => {
        const fan = new Fan(92, 115, mockConfig); // Position at front of left queue
        fan.hunger = 0.8;
        fan.targetX = 92;
        fan.targetY = 115;
        fan.state = 'idle';
        
        foodStall.addToQueue(fan);
        
        // Simulate fan reaching front and starting wait
        const simulationTime = 2000; // 2000ms simulation time
        fan.waitStartTime = simulationTime - 1001; // 1001ms ago (past wait time)
        
        foodStall.processQueue(800, 600, simulationTime);
        
        expect(fan.hunger).toBeLessThan(0.8);
        expect(fan.inQueue).toBe(false);
    });

    test('should set fan state to moving after getting food', () => {
        const fan = new Fan(92, 115, mockConfig); // Position at front of left queue
        fan.hunger = 0.8;
        fan.targetX = 92;
        fan.targetY = 115;
        fan.state = 'idle';
        
        foodStall.addToQueue(fan);
        
        // Simulate fan reaching front and starting wait
        const simulationTime = 2000;
        fan.waitStartTime = simulationTime - 1001; // Past wait time
        
        foodStall.processQueue(800, 600, simulationTime);
        
        // Fan should have state set to 'moving' so they leave the food stall area
        expect(fan.state).toBe('moving');
        expect(fan.targetX).toBeDefined();
        expect(fan.targetY).toBeDefined();
    });

    test('should not reserve slots - fans join at end of current queue', () => {
        // Add first fan
        const fan1 = new Fan(50, 50, mockConfig);
        foodStall.addToQueue(fan1);
        
        // Fan1 is approaching, hasn't reached queue yet
        expect(foodStall.leftApproaching.length + foodStall.rightApproaching.length).toBe(1);
        expect(foodStall.leftQueue.length + foodStall.rightQueue.length).toBe(0);
        
        // Add second fan while first is still approaching
        const fan2 = new Fan(60, 60, mockConfig);
        foodStall.addToQueue(fan2);
        
        // Both should be approaching (likely on different sides due to load balancing)
        expect(foodStall.leftApproaching.length + foodStall.rightApproaching.length).toBe(2);
        expect(foodStall.leftQueue.length + foodStall.rightQueue.length).toBe(0);
        
        // Simulate fan1 reaching their position
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        foodStall.processQueue(800, 600, 1000);
        
        // Now fan1 should be in queue, fan2 still approaching
        expect(foodStall.leftQueue.length + foodStall.rightQueue.length).toBe(1);
        expect(foodStall.leftApproaching.length + foodStall.rightApproaching.length).toBe(1);
        
        // Add third fan - should go to end even though line grew
        const fan3 = new Fan(70, 70, mockConfig);
        foodStall.addToQueue(fan3);
        
        // fan3's position depends on which side they joined
        // If they joined the same side as fan1, they should be at position 1 (after fan1)
        // If they joined the same side as fan2, they should be at position 1 (after fan2)
        const fan3Position = foodStall.getQueuePosition(fan3);
        expect(fan3Position).toBeGreaterThanOrEqual(0);
        
        // The key point: fan3 should have a target at the END of whatever queue they joined
        // Not a reserved spot from when they first decided to join
        const fan3Side = fan3.queueSide;
        const queueLength = fan3Side === 'left' ? foodStall.leftQueue.length : foodStall.rightQueue.length;
        const approachingLength = fan3Side === 'left' ? foodStall.leftApproaching.length : foodStall.rightApproaching.length;
        
        // fan3 should be in approaching, and their position should account for current queue state
        expect(approachingLength).toBeGreaterThanOrEqual(1);
    });

    test('should only process fans who are geographically at front', () => {
        const fan1 = new Fan(50, 50, mockConfig);
        const fan2 = new Fan(60, 60, mockConfig);
        
        // Manually add both to the actual queue
        foodStall.leftQueue.push(fan1, fan2);
        fan1.inQueue = true;
        fan2.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan2.targetFoodStall = foodStall;
        fan1.queueSide = 'left';
        fan2.queueSide = 'left';
        
        // Set fan1 as first in queue
        foodStall.updateQueuePositions(800, 600);
        
        // fan1 is far from target, fan2 is also far
        fan1.hunger = 0.8;
        fan2.hunger = 0.8;
        
        const simulationTime = 1000;
        foodStall.processQueue(800, 600, simulationTime);
        
        // Neither should have started waiting since they're not at target
        expect(fan1.waitStartTime).toBeFalsy();
        expect(fan2.waitStartTime).toBeFalsy();
        
        // Now move fan1 to their target position
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        
        foodStall.processQueue(800, 600, simulationTime + 100);
        
        // fan1 should start waiting
        expect(fan1.waitStartTime).toBeTruthy();
        expect(fan2.waitStartTime).toBeFalsy();
    });
});

describe('Fan hunger', () => {
    let fan;

    beforeEach(() => {
        fan = new Fan(100, 100, mockConfig);
    });

    test('should initialize with hunger in correct range', () => {
        expect(fan.hunger).toBeGreaterThanOrEqual(mockConfig.HUNGER_MIN_INITIAL);
        expect(fan.hunger).toBeLessThanOrEqual(mockConfig.HUNGER_MAX_INITIAL);
    });

    test('should have queue properties initialized', () => {
        expect(fan.inQueue).toBe(false);
        expect(fan.queuedAt).toBeNull();
        expect(fan.waitStartTime).toBeNull();
        expect(fan.targetFoodStall).toBeNull();
    });

    test('should increase hunger over time', () => {
        const initialHunger = fan.hunger;
        fan.update(1.0, 1.0, []); // 1 second
        expect(fan.hunger).toBeGreaterThan(initialHunger);
    });

    test('should not increase hunger past 1.0', () => {
        fan.hunger = 0.99;
        fan.update(10.0, 1.0, []); // 10 seconds
        expect(fan.hunger).toBe(1.0);
    });

    test('should not increase hunger while waiting at food stall', () => {
        fan.hunger = 0.5;
        fan.waitStartTime = Date.now();
        
        fan.update(1.0, 1.0, []);
        
        expect(fan.hunger).toBe(0.5);
    });

    test('should scale hunger increase with simulation speed', () => {
        const fan1 = new Fan(100, 100, mockConfig);
        const fan2 = new Fan(200, 200, mockConfig);
        fan1.hunger = 0.3;
        fan2.hunger = 0.3;
        
        fan1.update(1.0, 1.0, []);
        fan2.update(1.0, 2.0, []);
        
        // Hunger should increase twice as fast at 2x simulation speed
        const expectedFan1Hunger = 0.3 + mockConfig.HUNGER_INCREASE_RATE * 1.0 * 1.0;
        const expectedFan2Hunger = 0.3 + mockConfig.HUNGER_INCREASE_RATE * 1.0 * 2.0;
        
        expect(fan1.hunger).toBeCloseTo(expectedFan1Hunger, 5);
        expect(fan2.hunger).toBeCloseTo(expectedFan2Hunger, 5);
        expect(fan2.hunger).toBeGreaterThan(fan1.hunger);
    });
});
