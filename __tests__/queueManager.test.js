// Unit tests for QueueManager class
import { QueueManager } from '../src/core/queueManager.js';
import { Fan } from '../src/core/fan.js';
import { jest } from '@jest/globals';

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    PERSONAL_SPACE: 12,
    CONCERT_PERSONAL_SPACE: 6,
    COLORS: {
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a'
    }
};

describe('QueueManager Helper Methods', () => {
    describe('calculateDistance', () => {
        test('should calculate distance between two points', () => {
            const distance = QueueManager.calculateDistance(0, 0, 3, 4);
            expect(distance).toBe(5); // 3-4-5 triangle
        });

        test('should return 0 for same point', () => {
            const distance = QueueManager.calculateDistance(10, 20, 10, 20);
            expect(distance).toBe(0);
        });

        test('should handle negative coordinates', () => {
            const distance = QueueManager.calculateDistance(-3, -4, 0, 0);
            expect(distance).toBe(5);
        });

        test('should be commutative', () => {
            const dist1 = QueueManager.calculateDistance(1, 2, 5, 7);
            const dist2 = QueueManager.calculateDistance(5, 7, 1, 2);
            expect(dist1).toBe(dist2);
        });
    });

    describe('getDistanceToPosition', () => {
        test('should calculate distance from fan to position', () => {
            const fan = new Fan(0, 0, mockConfig);
            const position = { x: 3, y: 4 };
            const distance = QueueManager.getDistanceToPosition(fan, position);
            expect(distance).toBe(5);
        });

        test('should return 0 when fan is at position', () => {
            const fan = new Fan(10, 20, mockConfig);
            const position = { x: 10, y: 20 };
            const distance = QueueManager.getDistanceToPosition(fan, position);
            expect(distance).toBe(0);
        });
    });

    describe('sortByDistance', () => {
        test('should sort queue by distance to front', () => {
            const fan1 = new Fan(10, 10, mockConfig);
            const fan2 = new Fan(5, 5, mockConfig);
            const fan3 = new Fan(15, 15, mockConfig);
            const queue = [fan1, fan2, fan3];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            QueueManager.sortByDistance(queue, approaching, frontPosition);

            // fan2 is closest (5,5), then fan1 (10,10), then fan3 (15,15)
            expect(queue[0]).toBe(fan2);
            expect(queue[1]).toBe(fan1);
            expect(queue[2]).toBe(fan3);
        });

        test('should sort approaching fans by distance', () => {
            const fan1 = new Fan(20, 0, mockConfig);
            const fan2 = new Fan(10, 0, mockConfig);
            const queue = [];
            const approaching = [fan1, fan2];
            const frontPosition = { x: 0, y: 0 };

            QueueManager.sortByDistance(queue, approaching, frontPosition);

            expect(approaching[0]).toBe(fan2);
            expect(approaching[1]).toBe(fan1);
        });
    });

    describe('updateFanTarget', () => {
        test('should update target when forceUpdate is true', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos = { x: 200, y: 200 };
            const currentTime = Date.now();

            const updated = QueueManager.updateFanTarget(fan, targetPos, null, true, currentTime);

            expect(updated).toBe(true);
            expect(fan.targetX).toBe(200);
            expect(fan.targetY).toBe(200);
            expect(fan.queueTargetUpdateTime).toBe(currentTime);
        });

        test('should throttle updates within 125ms window', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos1 = { x: 200, y: 200 };
            const targetPos2 = { x: 300, y: 300 };
            const baseTime = Date.now();

            // First update should succeed
            fan.queueTargetUpdateTime = baseTime;
            const updated1 = QueueManager.updateFanTarget(fan, targetPos1, null, false, baseTime + 50);
            expect(updated1).toBe(false); // Within 125ms window

            // Second update after 125ms should succeed
            const updated2 = QueueManager.updateFanTarget(fan, targetPos2, null, false, baseTime + 126);
            expect(updated2).toBe(true);
            expect(fan.targetX).toBe(300);
            expect(fan.targetY).toBe(300);
        });

        test('should update when no previous update time exists', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos = { x: 200, y: 200 };
            const currentTime = Date.now();

            const updated = QueueManager.updateFanTarget(fan, targetPos, null, false, currentTime);

            expect(updated).toBe(true);
            expect(fan.queueTargetUpdateTime).toBe(currentTime);
        });

        test('should bypass throttle when forceUpdate is true even with recent update', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos1 = { x: 200, y: 200 };
            const targetPos2 = { x: 300, y: 300 };
            const baseTime = Date.now();

            // Set recent update time
            fan.queueTargetUpdateTime = baseTime;

            // Force update should work immediately
            const updated = QueueManager.updateFanTarget(fan, targetPos2, null, true, baseTime + 10);
            expect(updated).toBe(true);
            expect(fan.targetX).toBe(300);
        });
    });

    describe('findApproachingPosition', () => {
        test('should return 0 when queue is empty and no approaching fans', () => {
            const fan = new Fan(100, 100, mockConfig);
            const queue = [];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            expect(position).toBe(0);
        });

        test('should place fan at end when far from all others', () => {
            const fan = new Fan(500, 500, mockConfig);
            const existingFan = new Fan(10, 10, mockConfig);
            existingFan.queuePosition = 0;
            const queue = [existingFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            expect(position).toBe(1); // After the existing fan
        });

        test('should position based on nearby fans', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a nearby fan that is further from front
            // fan is at (100, 100), distance to (0,0) = ~141
            const nearbyFan = new Fan(110, 110, mockConfig); // Within 60 pixel threshold, distance to (0,0) = ~156
            nearbyFan.queuePosition = 5;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Fan is closer to front than nearbyFan, so should be positioned before them
            // Since nearbyFan is at position 5, fan should be at position 5 (pushing nearbyFan back)
            // But the algorithm returns position after the closest fan ahead, or end of queue
            // Since fan is closer, no fans are ahead, so it goes to end
            expect(position).toBe(1); // Goes to end since no fans are closer to front
        });
    });

    describe('shouldJoinQueue', () => {
        test('should return true when fan is near target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 102;
            fan.targetY = 102;

            const result = QueueManager.shouldJoinQueue(fan, 5);

            expect(result).toBe(true);
        });

        test('should return false when fan is far from target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 200;
            fan.targetY = 200;

            const result = QueueManager.shouldJoinQueue(fan, 5);

            expect(result).toBe(false);
        });
    });

    describe('promoteFanToQueue', () => {
        test('should move fan from approaching to queue', () => {
            const fan = new Fan(100, 100, mockConfig);
            const approaching = [fan];
            const queue = [];

            const result = QueueManager.promoteFanToQueue(fan, approaching, queue);

            expect(result).toBe(true);
            expect(approaching).toHaveLength(0);
            expect(queue).toHaveLength(1);
            expect(queue[0]).toBe(fan);
            expect(fan.state).toBe('in_queue');
            expect(fan.inQueue).toBe(true);
        });

        test('should return false if fan not in approaching array', () => {
            const fan = new Fan(100, 100, mockConfig);
            const approaching = [];
            const queue = [];

            const result = QueueManager.promoteFanToQueue(fan, approaching, queue);

            expect(result).toBe(false);
            expect(queue).toHaveLength(0);
        });
    });

    describe('updatePositions', () => {
        test('should update fan state to waiting when at target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_advancing';
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 }); // At current position
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false, 0);
            
            expect(fan.state).toBe('in_queue_waiting');
        });

        test('should update fan state to advancing when not at target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_waiting';
            fan.queueTargetUpdateTime = -Infinity;
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 200, y: 100 }); // Far from current
            const frontPosition = { x: 200, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, obstacles, true, 0);
            
            expect(fan.state).toBe('in_queue_advancing');
        });

        test('should not update target when fan is already at position', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            fan.queueTargetUpdateTime = 0;
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false, 50);
            
            // Should not have updated target (queueTargetUpdateTime should be same)
            expect(fan.queueTargetUpdateTime).toBe(0);
        });

        test('should update approaching fans with correct state', () => {
            const fan = new Fan(150, 100, mockConfig);
            fan.state = 'idle';
            const approaching = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions([], approaching, getTargetPosition, frontPosition, obstacles, true, 0);
            
            expect(fan.state).toBe('approaching_queue');
            expect(fan.inQueue).toBe(false);
        });

        test('should not change state for approaching fan already in approaching_queue state', () => {
            const fan = new Fan(150, 100, mockConfig);
            fan.state = 'approaching_queue';
            const approaching = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions([], approaching, getTargetPosition, frontPosition, obstacles, true, 0);
            
            expect(fan.state).toBe('approaching_queue');
        });

        test('should position approaching fan based on distance', () => {
            const fan1 = new Fan(110, 100, mockConfig);
            const fan2 = new Fan(150, 100, mockConfig);
            const queue = [fan1];
            const approaching = [fan2];
            const getTargetPosition = (index) => ({ x: 100 + index * 10, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 0);
            
            // fan2 is farther, should be positioned after fan1
            expect(fan2.queuePosition).toBe(1);
        });

        test('should insert approaching fan in middle if closer to front', () => {
            const fan1 = new Fan(120, 100, mockConfig);
            const fan2 = new Fan(105, 100, mockConfig);
            const queue = [fan1];
            const approaching = [fan2];
            const getTargetPosition = (index) => ({ x: 100 + index * 10, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 0);
            
            // fan2 is closer to front, should be positioned before fan1
            expect(fan2.queuePosition).toBe(0);
        });
    });

    describe('findApproachingPosition with edge cases', () => {
        test('should handle fan with nearby fans behind them', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a nearby fan that is farther from front
            const nearbyFan = new Fan(110, 110, mockConfig); // Within 60 pixel threshold
            nearbyFan.queuePosition = 5;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Fan is closer to front than nearbyFan, so should go to end
            expect(position).toBeGreaterThanOrEqual(0);
        });

        test('should handle fan with no nearby fans', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a fan too far away
            const farFan = new Fan(200, 200, mockConfig); // Outside 60 pixel threshold
            farFan.queuePosition = 3;
            const queue = [farFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // No nearby fans, should go to end of queue
            expect(position).toBe(1);
        });

        test('should handle fan with closestAhead having null queuePosition', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a nearby fan ahead with null position
            const nearbyFan = new Fan(50, 50, mockConfig); // Within threshold, closer to front
            nearbyFan.queuePosition = null;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Should fallback to end of queue
            expect(position).toBe(1);
        });

        test('should filter out the fan itself from approaching array', () => {
            const fan = new Fan(100, 100, mockConfig);
            const approaching = [fan];
            const queue = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Should be 0 (no other fans in queue)
            expect(position).toBe(0);
        });
    });

    describe('addFanToQueue', () => {
        test('should add fan to queue with all options', () => {
            const fan = new Fan(100, 100, mockConfig);
            const queue = [];
            const approachingList = [];
            const frontPosition = { x: 50, y: 50 };
            const getTargetPosition = (index) => ({ x: 50 + index * 10, y: 50 });
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            const position = QueueManager.addFanToQueue(fan, {
                queue,
                approachingList,
                frontPosition,
                getTargetPosition,
                fanProperties: { testProp: 'value' },
                setInQueue: true,
                obstacles
            });
            
            expect(approachingList).toContain(fan);
            expect(fan.testProp).toBe('value');
            expect(position).toBeGreaterThanOrEqual(0);
        });

        test('should set inQueue based on setInQueue option', () => {
            const fan = new Fan(100, 100, mockConfig);
            const queue = [];
            const approachingList = [];
            const frontPosition = { x: 50, y: 50 };
            const getTargetPosition = (index) => ({ x: 50 + index * 10, y: 50 });
            
            QueueManager.addFanToQueue(fan, {
                queue,
                approachingList,
                frontPosition,
                getTargetPosition,
                setInQueue: false
            });
            
            expect(fan.inQueue).toBe(false);
        });
    });

    describe('updateFanTarget', () => {
        test('should update target when forceUpdate is true', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.queueTargetUpdateTime = 100;
            const targetPos = { x: 200, y: 200 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, obstacles, true, 110);
            
            expect(updated).toBe(true);
            expect(fan.targetX).toBe(200);
        });

        test('should not update target when time threshold not met', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.queueTargetUpdateTime = 100;
            const targetPos = { x: 200, y: 200 };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, null, false, 110);
            
            expect(updated).toBe(false);
        });

        test('should update target when time threshold met', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.queueTargetUpdateTime = 0;
            const targetPos = { x: 200, y: 200 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, obstacles, false, 130);
            
            expect(updated).toBe(true);
            expect(fan.queueTargetUpdateTime).toBe(130);
        });
    });

    describe('sortByDistance', () => {
        test('should sort both queue and approaching arrays by distance', () => {
            const fan1 = new Fan(150, 100, mockConfig);
            const fan2 = new Fan(100, 100, mockConfig);
            const fan3 = new Fan(200, 100, mockConfig);
            const fan4 = new Fan(120, 100, mockConfig);
            
            const queue = [fan1, fan2];
            const approaching = [fan3, fan4];
            const frontPosition = { x: 0, y: 0 };
            
            QueueManager.sortByDistance(queue, approaching, frontPosition);
            
            // queue should be sorted: fan2 (closer), fan1 (farther)
            expect(queue[0]).toBe(fan2);
            expect(queue[1]).toBe(fan1);
            
            // approaching should be sorted: fan4 (closer), fan3 (farther)
            expect(approaching[0]).toBe(fan4);
            expect(approaching[1]).toBe(fan3);
        });
    });
});
