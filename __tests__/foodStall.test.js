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
        expect(foodStall.leftQueue.length + foodStall.rightQueue.length).toBe(1);
        expect(fan.inQueue).toBe(true);
        expect(fan.targetFoodStall).toBe(foodStall);
        expect(fan.queueSide).toBeTruthy();
    });

    test('should not add same fan twice', () => {
        const fan = new Fan(50, 50, mockConfig);
        foodStall.addToQueue(fan);
        const position = foodStall.addToQueue(fan);
        
        expect(position).toBe(-1);
        expect(foodStall.leftQueue.length + foodStall.rightQueue.length).toBe(1);
    });

    test('should remove fan from queue', () => {
        const fan = new Fan(50, 50, mockConfig);
        foodStall.addToQueue(fan);
        foodStall.removeFromQueue(fan);
        
        expect(foodStall.leftQueue).toHaveLength(0);
        expect(foodStall.rightQueue).toHaveLength(0);
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
        
        foodStall.addToQueue(fan1);
        foodStall.addToQueue(fan2);
        
        expect(foodStall.isAtFront(fan1)).toBe(true);
        // fan2 may be at front of other queue, so just check fan1
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
        const fan = new Fan(138, 110, mockConfig); // Position near front of queue
        fan.hunger = 0.8;
        fan.targetX = 138;
        fan.targetY = 110;
        fan.state = 'idle';
        
        foodStall.addToQueue(fan);
        
        // Simulate fan reaching front and starting wait
        const now = Date.now();
        fan.waitStartTime = now - 1001; // 1001ms ago (past wait time)
        
        foodStall.processQueue(800, 600);
        
        expect(fan.hunger).toBeLessThan(0.8);
        expect(fan.inQueue).toBe(false);
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

    test('should respect simulation speed for hunger increase', () => {
        const fan1 = new Fan(100, 100, mockConfig);
        const fan2 = new Fan(200, 200, mockConfig);
        fan1.hunger = 0.3;
        fan2.hunger = 0.3;
        
        fan1.update(1.0, 1.0, []);
        fan2.update(1.0, 2.0, []);
        
        expect(fan2.hunger).toBeGreaterThan(fan1.hunger);
    });
});
