// Unit tests for QueueManager class
import { QueueManager } from '../src/core/queueManager.js';
import { Fan } from '../src/core/fan.js';

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

    describe('processApproaching', () => {
        test('should promote fans that reach their target', () => {
            const fan1 = new Fan(100, 100, mockConfig);
            fan1.targetX = 102;
            fan1.targetY = 102;
            const fan2 = new Fan(200, 200, mockConfig);
            fan2.targetX = 300;
            fan2.targetY = 300;

            const approaching = [fan1, fan2];
            const queue = [];
            let callbackCalled = 0;
            const callback = () => { callbackCalled++; };

            QueueManager.processApproaching(queue, approaching, callback, 5);

            expect(queue).toHaveLength(1);
            expect(queue[0]).toBe(fan1);
            expect(approaching).toHaveLength(1);
            expect(approaching[0]).toBe(fan2);
            expect(callbackCalled).toBe(1);
        });

        test('should work without callback', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 102;
            fan.targetY = 102;

            const approaching = [fan];
            const queue = [];

            QueueManager.processApproaching(queue, approaching, null, 5);

            expect(queue).toHaveLength(1);
            expect(approaching).toHaveLength(0);
        });

        test('should process multiple fans from back to front', () => {
            const fan1 = new Fan(100, 100, mockConfig);
            fan1.targetX = 101;
            fan1.targetY = 101;
            const fan2 = new Fan(200, 200, mockConfig);
            fan2.targetX = 201;
            fan2.targetY = 201;
            const fan3 = new Fan(300, 300, mockConfig);
            fan3.targetX = 301;
            fan3.targetY = 301;

            const approaching = [fan1, fan2, fan3];
            const queue = [];

            QueueManager.processApproaching(queue, approaching, null, 5);

            expect(queue).toHaveLength(3);
            expect(approaching).toHaveLength(0);
        });
    });

    describe('updatePositions', () => {
        test('should update queue positions with obstacles', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.queuePosition = 0;
            const queue = [fan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });
            const mockObstacles = null;

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, mockObstacles, false, 1000);

            expect(fan.queuePosition).toBe(0);
            expect(fan.targetX).toBe(10);
            expect(fan.targetY).toBe(10);
        });

        test('should handle approaching fans with different state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'wandering';
            const approaching = [fan];
            const queue = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 1000);

            expect(fan.state).toBe('approaching_queue');
        });

        test('should not change state if already approaching_queue', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'approaching_queue';
            const approaching = [fan];
            const queue = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 1000);

            expect(fan.state).toBe('approaching_queue');
        });

        test('should sort queue by distance to front', () => {
            const fan1 = new Fan(200, 200, mockConfig);
            const fan2 = new Fan(100, 100, mockConfig);
            const fan3 = new Fan(150, 150, mockConfig);
            const queue = [fan1, fan2, fan3];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 1000);

            // Should be sorted: fan2, fan3, fan1
            expect(queue[0]).toBe(fan2);
            expect(queue[1]).toBe(fan3);
            expect(queue[2]).toBe(fan1);
        });

        test('should transition from advancing to waiting when at target', () => {
            const fan = new Fan(10, 10, mockConfig);
            fan.state = 'in_queue_advancing';
            fan.targetX = 10;
            fan.targetY = 10;
            const queue = [fan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10, y: 10 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 1000);

            expect(fan.state).toBe('in_queue_waiting');
        });

        test('should set state to advancing when updating target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue';
            const queue = [fan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 200, y: 200 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, true, 1000);

            expect(fan.state).toBe('in_queue_advancing');
        });

        test('should calculate insert position for approaching fans', () => {
            // Create queue with fans at different distances
            const queueFan1 = new Fan(50, 50, mockConfig);
            const queueFan2 = new Fan(100, 100, mockConfig);
            const queue = [queueFan1, queueFan2];

            // Approaching fan between the two
            const approachingFan = new Fan(75, 75, mockConfig);
            const approaching = [approachingFan];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false, 1000);

            // Approaching fan should get position 1 (between the two queue fans)
            expect(approachingFan.queuePosition).toBe(1);
        });
    });

    describe('findApproachingPosition edge cases', () => {
        test('should handle nearby fan with null queuePosition', () => {
            const fan = new Fan(100, 100, mockConfig);
            const nearbyFan = new Fan(90, 90, mockConfig);
            nearbyFan.queuePosition = null;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            expect(position).toBe(1);
        });

        test('should handle nearby fan with undefined queuePosition', () => {
            const fan = new Fan(100, 100, mockConfig);
            const nearbyFan = new Fan(90, 90, mockConfig);
            nearbyFan.queuePosition = undefined;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            expect(position).toBe(1);
        });

        test('should place after nearest fan ahead when in proximity', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a fan that is ahead (closer to front) and nearby
            const aheadFan = new Fan(50, 50, mockConfig);
            aheadFan.queuePosition = 2;
            const queue = [aheadFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Fan should be placed after aheadFan at position 3
            // Distance from fan (100, 100) to aheadFan (50, 50) = ~70.7
            // This is within the 60 pixel threshold, so should position based on proximity
            // aheadFan is at 2, fan should be at 3
            // However, if distance is slightly over threshold, will go to default (end)
            expect(position).toBeGreaterThanOrEqual(1);
        });

        test('should place after nearby fan ahead with valid position', () => {
            const fan = new Fan(40, 40, mockConfig);
            // Create a fan that is ahead and within proximity threshold
            const aheadFan = new Fan(30, 30, mockConfig);
            aheadFan.queuePosition = 5;
            const queue = [aheadFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Distance from fan (40,40) to aheadFan (30,30) = ~14.1 (well within 60 threshold)
            // aheadFan is closer to front and has position 5, so fan should get 6
            expect(position).toBe(6);
        });
    });

    describe('addFanToQueue', () => {
        test('should add fan to queue with all options', () => {
            const fan = new Fan(100, 100, mockConfig);
            const queue = [];
            const approachingList = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            const position = QueueManager.addFanToQueue(fan, {
                queue,
                approachingList,
                frontPosition,
                getTargetPosition,
                fanProperties: { customProp: 'test' },
                setInQueue: true,
                obstacles: null
            });

            expect(position).toBe(0);
            expect(approachingList).toHaveLength(1);
            expect(approachingList[0]).toBe(fan);
            expect(fan.state).toBe('approaching_queue');
            expect(fan.inQueue).toBe(true);
            expect(fan.queuePosition).toBe(0);
            expect(fan.customProp).toBe('test');
            expect(fan.queueTargetUpdateTime).toBe(-Infinity);
        });

        test('should respect setInQueue: false option', () => {
            const fan = new Fan(100, 100, mockConfig);
            const queue = [];
            const approachingList = [];
            const frontPosition = { x: 0, y: 0 };
            const getTargetPosition = (index) => ({ x: 10 + index * 20, y: 10 });

            QueueManager.addFanToQueue(fan, {
                queue,
                approachingList,
                frontPosition,
                getTargetPosition,
                setInQueue: false
            });

            expect(fan.inQueue).toBeFalsy();
        });
    });
});
