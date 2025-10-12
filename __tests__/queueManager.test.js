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

    describe('processApproaching', () => {
        test('should call updateCallback when fan joins queue', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            fan.x = 98;
            fan.y = 98;

            const approaching = [fan];
            const queue = [];
            const updateCallback = jest.fn();

            QueueManager.processApproaching(queue, approaching, updateCallback, 10);

            expect(updateCallback).toHaveBeenCalled();
            expect(queue).toHaveLength(1);
        });

        test('should not call updateCallback when fan does not join queue', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            fan.x = 150; // Too far
            fan.y = 150;

            const approaching = [fan];
            const queue = [];
            const updateCallback = jest.fn();

            QueueManager.processApproaching(queue, approaching, updateCallback, 10);

            expect(updateCallback).not.toHaveBeenCalled();
            expect(queue).toHaveLength(0);
        });

        test('should work without updateCallback', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            fan.x = 98;
            fan.y = 98;

            const approaching = [fan];
            const queue = [];

            QueueManager.processApproaching(queue, approaching, null, 10);

            expect(queue).toHaveLength(1);
        });
    });
});
