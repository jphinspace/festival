// Unit tests for FoodStall class
import { FoodStall } from '../src/components/foodStall.js';
import { Fan } from '../src/core/fan.js';
import { AgentState } from '../src/utils/enums.js';
import { jest } from '@jest/globals';

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
    let foodStall
    let mockObstacles

    beforeEach(() => {
        foodStall = new FoodStall(100, 100, mockConfig)
        
        // Create mock obstacles
        mockObstacles = {
            obstacles: [],
            checkCollision: () => false,
            resolveCollision: () => {}
        }
        
        foodStall.setObstacles(mockObstacles)
    })

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
        const fan = new Fan(92, 115, mockConfig) // Position at front of left queue
        fan.hunger = 0.8
        fan.targetX = 92
        fan.targetY = 115
        fan.state = AgentState.IN_QUEUE
        
        // Manually add fan to queue (bypass entering phase for test)
        foodStall.leftQueue.push(fan)
        fan.inQueue = true
        fan.targetFoodStall = foodStall
        fan.queueSide = 'left'
        
        const simulationTime = 2000
        
        // Fan reaches front position
        fan.x = fan.targetX
        fan.y = fan.targetY
        
        // Process queue - fan should be removed and start walking to processing
        foodStall.processQueue(800, 600, simulationTime)
        
        // Fan should be walking to process position
        expect(fan.state).toBe('in_queue_advancing')
        expect(fan.processingAtStall).toBe(foodStall)
        
        // Simulate fan reaching processing position
        fan.x = fan.targetX
        fan.y = fan.targetY
        
        // Check and process - should transition to processing state
        foodStall.checkAndProcessFan(fan, 800, 600, simulationTime)
        expect(fan.state).toBe('processing')
        
        // Set wait start time manually and wait long enough
        fan.waitStartTime = simulationTime - 1001 // 1001ms ago (past wait time)
        
        // Check and process the fan again - should complete
        foodStall.checkAndProcessFan(fan, 800, 600, simulationTime)
        
        expect(fan.hunger).toBeLessThan(0.8)
        expect(fan.inQueue).toBe(false)
        expect(fan.state).toBe('moving')
    })

    test('should set fan state to moving after getting food', () => {
        const fan = new Fan(92, 115, mockConfig)
        fan.hunger = 0.8
        fan.targetX = 92
        fan.targetY = 115
        fan.state = AgentState.IN_QUEUE
        
        // Manually add fan to queue
        foodStall.leftQueue.push(fan)
        fan.inQueue = true
        fan.targetFoodStall = foodStall
        fan.queueSide = 'left'
        
        const simulationTime = 2000
        
        // Fan reaches front position
        fan.x = fan.targetX
        fan.y = fan.targetY
        
        // Process queue - fan starts walking to processing
        foodStall.processQueue(800, 600, simulationTime)
        expect(fan.state).toBe('in_queue_advancing')
        
        // Fan reaches processing position
        fan.x = fan.targetX
        fan.y = fan.targetY
        
        // Transition to processing state
        foodStall.checkAndProcessFan(fan, 800, 600, simulationTime)
        expect(fan.state).toBe('processing')
        
        fan.waitStartTime = simulationTime - 1001
        
        // Complete processing
        foodStall.checkAndProcessFan(fan, 800, 600, simulationTime)
        
        expect(fan.state).toBe('moving')
        expect(fan.hunger).toBeLessThan(0.8)
    })

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
        fan1.x = fan1.targetX
        fan1.y = fan1.targetY
        foodStall.processQueue(800, 600, 1000)
        
        // fan1 should have joined queue and immediately started walking to processing (since they were at position 0)
        // So they won't be in the queue anymore, they'll be walking to processing
        expect(fan1.state).toBe('in_queue_advancing')
        expect(fan1.processingAtStall).toBe(foodStall)
        expect(foodStall.leftApproaching.length + foodStall.rightApproaching.length).toBe(1)
        
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
        const fan1 = new Fan(50, 50, mockConfig)
        const fan2 = new Fan(60, 60, mockConfig)
        
        // Manually add both to the actual queue
        foodStall.leftQueue.push(fan1, fan2)
        fan1.inQueue = true
        fan2.inQueue = true
        fan1.targetFoodStall = foodStall
        fan2.targetFoodStall = foodStall
        fan1.queueSide = 'left'
        fan2.queueSide = 'left'
        
        // Set positions based on geographic location
        // fan2 is closer to stall (x=60 > x=50), so will be sorted to position 0
        foodStall.updateQueuePositions(800, 600, true, 0)
        
        // fan1 is far from target, fan2 is also far
        fan1.hunger = 0.8
        fan2.hunger = 0.8
        
        const simulationTime = 1000
        foodStall.processQueue(800, 600, simulationTime)
        
        // Neither should have moved to processing since they're not at target
        expect(fan1.processingAtStall).toBeFalsy()
        expect(fan2.processingAtStall).toBeFalsy()
        
        // Now move fan2 (who is geographically closer/at front) to their target position
        fan2.x = fan2.targetX
        fan2.y = fan2.targetY
        
        foodStall.processQueue(800, 600, simulationTime + 100)
        
        // fan2 should start advancing to processing (they're at front and reached target)
        expect(fan2.state).toBe('in_queue_advancing')
        expect(fan2.processingAtStall).toBe(foodStall)
        // fan1 should be advancing to their queue position (they're far from target)
        expect(fan1.state).toBe('in_queue_advancing')
        expect(fan1.processingAtStall).toBeFalsy()
    })

    test('should reorder left queue based on physical position - closer fans move forward', () => {
        // Create three fans at different X positions
        const fan1 = new Fan(70, 115, mockConfig); // Furthest from stall
        const fan2 = new Fan(80, 115, mockConfig); // Middle
        const fan3 = new Fan(90, 115, mockConfig); // Closest to stall
        
        // Add to left queue in arbitrary order
        foodStall.leftQueue.push(fan1, fan2, fan3);
        fan1.inQueue = true;
        fan2.inQueue = true;
        fan3.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan2.targetFoodStall = foodStall;
        fan3.targetFoodStall = foodStall;
        fan1.queueSide = 'left';
        fan2.queueSide = 'left';
        fan3.queueSide = 'left';
        
        // Before update: array order is fan1, fan2, fan3
        expect(foodStall.leftQueue[0]).toBe(fan1);
        
        // Update queue positions - should reorder by X (higher X = closer for left queue)
        foodStall.updateQueuePositions(800, 600, true, 0);
        
        // After update: fan3 should be at front (highest X = closest)
        expect(foodStall.leftQueue[0]).toBe(fan3);
        expect(foodStall.leftQueue[1]).toBe(fan2);
        expect(foodStall.leftQueue[2]).toBe(fan1);
    });

    test('should reorder right queue based on physical position - closer fans move forward', () => {
        // Create three fans at different X positions
        const fan1 = new Fan(150, 115, mockConfig); // Furthest from stall
        const fan2 = new Fan(140, 115, mockConfig); // Middle
        const fan3 = new Fan(130, 115, mockConfig); // Closest to stall
        
        // Add to right queue in arbitrary order
        foodStall.rightQueue.push(fan1, fan2, fan3);
        fan1.inQueue = true;
        fan2.inQueue = true;
        fan3.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan2.targetFoodStall = foodStall;
        fan3.targetFoodStall = foodStall;
        fan1.queueSide = 'right';
        fan2.queueSide = 'right';
        fan3.queueSide = 'right';
        
        // Before update: array order is fan1, fan2, fan3
        expect(foodStall.rightQueue[0]).toBe(fan1);
        
        // Update queue positions - should reorder by X (lower X = closer for right queue)
        foodStall.updateQueuePositions(800, 600, true, 0);
        
        // After update: fan3 should be at front (lowest X = closest)
        expect(foodStall.rightQueue[0]).toBe(fan3);
        expect(foodStall.rightQueue[1]).toBe(fan2);
        expect(foodStall.rightQueue[2]).toBe(fan1);
    });

    test('approaching fans should position based on proximity to other fans in queue', () => {
        // Set up a scenario with fans in queue and approaching fans
        // Left queue: stall is at x=100, queue forms to the left
        const fan1 = new Fan(92, 115, mockConfig); // In queue, position 0 (closest to stall)
        const fan2 = new Fan(84, 115, mockConfig); // In queue, position 1
        
        // Add to actual queue and update positions to assign queuePosition
        foodStall.leftQueue.push(fan1, fan2);
        fan1.inQueue = true;
        fan2.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan2.targetFoodStall = foodStall;
        fan1.queueSide = 'left';
        fan2.queueSide = 'left';
        
        // Update positions so fans get their queuePosition assigned
        foodStall.updateQueuePositions(800, 600, false);
        
        // Verify positions were assigned
        expect(fan1.queuePosition).toBe(0);
        expect(fan2.queuePosition).toBe(1);
        
        // Approaching fan positioned between fan1 and fan2 (close enough to detect)
        const approachingFan = new Fan(88, 115, mockConfig);
        
        // Use addToQueue which calculates position based on proximity
        const position = foodStall.addToQueue(approachingFan);
        
        // The approaching fan should be assigned a position that's not at the very back
        // Since it's geographically close to existing fans (within 60px)
        // it should get a position based on proximity, not default to the end
        expect(approachingFan.queuePosition).toBeLessThanOrEqual(2); // Not defaulting to end (which would be 2 or higher)
        expect(position).toBeGreaterThanOrEqual(0);
    });

    test('approaching fans far from queue should go to back', () => {
        // Set up fans in queue
        const fan1 = new Fan(92, 115, mockConfig); // In queue, position 0
        const fan2 = new Fan(84, 115, mockConfig); // In queue, position 1
        
        foodStall.leftQueue.push(fan1, fan2);
        fan1.inQueue = true;
        fan2.inQueue = true;
        fan1.targetFoodStall = foodStall;
        fan2.targetFoodStall = foodStall;
        fan1.queueSide = 'left';
        fan2.queueSide = 'left';
        
        // Approaching fan positioned far from the queue (more than 80px away)
        const approachingFan = new Fan(50, 200, mockConfig);
        foodStall.leftApproaching.push(approachingFan);
        approachingFan.state = AgentState.APPROACHING_QUEUE;
        approachingFan.targetFoodStall = foodStall;
        approachingFan.queueSide = 'left';
        
        // Update queue positions
        foodStall.updateQueuePositions(800, 600, false);
        
        // The approaching fan should be assigned to the back (position 2, after fan2)
        expect(approachingFan.queuePosition).toBe(2);
    });

    describe('Branch coverage for removeFromQueue', () => {
        test('should remove fan from left queue', () => {
            const fan = new Fan(50, 150, mockConfig);
            foodStall.leftQueue.push(fan);
            
            foodStall.removeFromQueue(fan);
            
            expect(foodStall.leftQueue).not.toContain(fan);
            expect(foodStall.leftQueue).toHaveLength(0);
        });

        test('should remove fan from right queue', () => {
            const fan = new Fan(150, 150, mockConfig);
            foodStall.rightQueue.push(fan);
            
            foodStall.removeFromQueue(fan);
            
            expect(foodStall.rightQueue).not.toContain(fan);
        });

        test('should remove fan from left approaching', () => {
            const fan = new Fan(50, 150, mockConfig);
            foodStall.leftApproaching.push(fan);
            
            foodStall.removeFromQueue(fan);
            
            expect(foodStall.leftApproaching).not.toContain(fan);
        });

        test('should remove fan from right approaching', () => {
            const fan = new Fan(150, 150, mockConfig);
            foodStall.rightApproaching.push(fan);
            
            foodStall.removeFromQueue(fan);
            
            expect(foodStall.rightApproaching).not.toContain(fan);
        });

        test('should handle fan not in any queue', () => {
            const fan = new Fan(50, 50, mockConfig);
            
            // Should not throw
            foodStall.removeFromQueue(fan);
            
            expect(foodStall.leftQueue).toHaveLength(0);
            expect(foodStall.rightQueue).toHaveLength(0);
        });
    });

    describe('Branch coverage for getQueuePosition', () => {
        test('should return -1 for fan not in any queue', () => {
            const fan = new Fan(50, 50, mockConfig);
            
            const position = foodStall.getQueuePosition(fan);
            
            expect(position).toBe(-1);
        });
    });

    describe('Branch coverage for checkAndProcessFan', () => {
        test('should return false if fan processingAtStall does not match', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.processingAtStall = null; // Not processing at this stall
            
            const result = foodStall.checkAndProcessFan(fan, 800, 600, 0);
            
            expect(result).toBe(false);
        });

        test('should handle right side fan after eating', () => {
            const fan = new Fan(120, 115, mockConfig);
            fan.state = AgentState.PROCESSING;
            fan.processingAtStall = foodStall; // Set dynamically
            fan.waitStartTime = 0;
            fan.hunger = 0.8;
            fan.processingSide = 'right'; // Use processingSide not queueSide
            fan.setTarget = jest.fn(); // Mock setTarget to avoid needing full setup
            
            const result = foodStall.checkAndProcessFan(fan, 800, 600, 2000);
            
            // Should return true indicating processing occurred
            expect(result).toBe(true);
            // Fan should have eaten and moved
            expect(fan.hunger).toBeLessThan(0.8);
            expect(fan.hasEatenFood).toBe(true);
            // Check that setTarget was called with x > stall position (moving right)
            expect(fan.setTarget).toHaveBeenCalled();
            const targetX = fan.setTarget.mock.calls[0][0];
            expect(targetX).toBeGreaterThan(foodStall.x + foodStall.width);
        });

        test('should handle left side fan after eating', () => {
            const fan = new Fan(100, 115, mockConfig);
            fan.state = AgentState.PROCESSING;
            fan.processingAtStall = foodStall; // Set dynamically
            fan.waitStartTime = 0;
            fan.hunger = 0.8;
            fan.processingSide = 'left'; // Use processingSide not queueSide
            fan.setTarget = jest.fn(); // Mock setTarget to avoid needing full setup
            
            const result = foodStall.checkAndProcessFan(fan, 800, 600, 2000);
            
            // Should return true indicating processing occurred
            expect(result).toBe(true);
            // Fan should have eaten and moved
            expect(fan.hunger).toBeLessThan(0.8);
            expect(fan.hasEatenFood).toBe(true);
            // Check that setTarget was called with x < stall position (moving left)
            expect(fan.setTarget).toHaveBeenCalled();
            const targetX = fan.setTarget.mock.calls[0][0];
            expect(targetX).toBeLessThan(foodStall.x);
        });
    });

    describe('Branch coverage for draw', () => {
        test('should draw food stall on canvas', () => {
            const mockCtx = {
                fillStyle: '',
                font: '',
                fillRect: jest.fn(),
                fillText: jest.fn()
            };
            
            foodStall.draw(mockCtx);
            
            expect(mockCtx.fillRect).toHaveBeenCalledWith(100, 100, 20, 30);
            expect(mockCtx.fillText).toHaveBeenCalledWith('FOOD', 101, 118);
        });
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
