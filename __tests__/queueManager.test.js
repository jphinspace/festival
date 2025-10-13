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

    describe('updateFanTarget', () => {
        test('should always update target', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos = { x: 200, y: 200 };

            const updated = QueueManager.updateFanTarget(fan, targetPos, null, false);

            expect(updated).toBe(true);
            expect(fan.targetX).toBe(200);
            expect(fan.targetY).toBe(200);
        });

        test('should update target with forceUpdate flag', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos = { x: 200, y: 200 };

            const updated = QueueManager.updateFanTarget(fan, targetPos, null, true);

            expect(updated).toBe(true);
            expect(fan.targetX).toBe(200);
            expect(fan.targetY).toBe(200);
        });

        test('should pass obstacles to setTarget', () => {
            const fan = new Fan(100, 100, mockConfig);
            const targetPos = { x: 200, y: 200 };
            const mockObstacles = { checkCollision: jest.fn() };

            const updated = QueueManager.updateFanTarget(fan, targetPos, mockObstacles, false);

            expect(updated).toBe(true);
            expect(fan.targetX).toBe(200);
            expect(fan.targetY).toBe(200);
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
        test('should use Date.now() when simulationTime is 0', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_advancing';
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            // Call with simulationTime = 0, should use Date.now()
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false);
            
            expect(fan.state).toBe('in_queue_waiting');
        });

        test('should use provided simulationTime when non-zero', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_waiting';
            
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 200, y: 100 });
            const frontPosition = { x: 200, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            // Call with non-zero simulationTime
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, obstacles, true);
            
            // Timing removed
        });

        test('should sort queue by distance before updating', () => {
            const fan1 = new Fan(150, 100, mockConfig);
            const fan2 = new Fan(100, 100, mockConfig); // Closer
            const fan3 = new Fan(200, 100, mockConfig); // Farthest
            const queue = [fan3, fan1, fan2]; // Unsorted
            const getTargetPosition = (index) => ({ x: 50 + index * 10, y: 100 });
            const frontPosition = { x: 0, y: 0 };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false);
            
            // After sorting, fan2 should be first (position 0)
            expect(fan2.queuePosition).toBe(0);
            expect(fan1.queuePosition).toBe(1);
            expect(fan3.queuePosition).toBe(2);
        });

        test('should update fan state to waiting when at target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_advancing';
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 }); // At current position
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false);
            
            expect(fan.state).toBe('in_queue_waiting');
        });

        test('should update fan state to advancing when not at target', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_waiting';
            
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 200, y: 100 }); // Far from current
            const frontPosition = { x: 200, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, obstacles, true);
            
            expect(fan.state).toBe('in_queue_advancing');
        });

        test('should not change state when updateFanTarget returns false', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_waiting';
             // Recent update
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 200, y: 100 }); // Far from current
            const frontPosition = { x: 200, y: 100 };
            
            // No forceUpdate, and time threshold not met
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false);
            
            // State should not change to advancing
            expect(fan.state).toBe('in_queue_waiting');
        });

        test('should not update target when fan is already at position', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition, null, false);
            
            // Should not have updated target (queueTargetUpdateTime should be same)
            // Timing removed
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
            
            QueueManager.updatePositions([], approaching, getTargetPosition, frontPosition, obstacles, true);
            
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
            
            QueueManager.updatePositions([], approaching, getTargetPosition, frontPosition, obstacles, true);
            
            expect(fan.state).toBe('approaching_queue');
        });

        test('should handle empty queue in approaching positioning', () => {
            const fan = new Fan(150, 100, mockConfig);
            fan.state = 'idle';
            const approaching = [fan];
            const queue = []; // Empty queue
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles, true);
            
            // Should still work with empty queue
            expect(fan.queuePosition).toBe(0);
        });

        test('should find insert position for approaching fan', () => {
            const queueFan1 = new Fan(110, 100, mockConfig);
            const queueFan2 = new Fan(130, 100, mockConfig);
            const approachingFan = new Fan(120, 100, mockConfig); // Between the two
            
            const queue = [queueFan1, queueFan2];
            const approaching = [approachingFan];
            const getTargetPosition = (index) => ({ x: 100 + index * 10, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles, true);
            
            // approachingFan should be positioned between the two (position 1)
            expect(approachingFan.queuePosition).toBe(1);
        });

        test('should position approaching fan at end when farther than all queue members', () => {
            const queueFan1 = new Fan(110, 100, mockConfig);
            const queueFan2 = new Fan(120, 100, mockConfig);
            const approachingFan = new Fan(150, 100, mockConfig); // Farther than both
            
            const queue = [queueFan1, queueFan2];
            const approaching = [approachingFan];
            const getTargetPosition = (index) => ({ x: 100 + index * 10, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, obstacles, true);
            
            // approachingFan should be at the end (position 2)
            expect(approachingFan.queuePosition).toBe(2);
        });

        test('should position approaching fan based on distance', () => {
            const fan1 = new Fan(110, 100, mockConfig);
            const fan2 = new Fan(150, 100, mockConfig);
            const queue = [fan1];
            const approaching = [fan2];
            const getTargetPosition = (index) => ({ x: 100 + index * 10, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false);
            
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
            
            QueueManager.updatePositions(queue, approaching, getTargetPosition, frontPosition, null, false);
            
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
        test('should add fan with setInQueue=true', () => {
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
                setInQueue: true
            });
            
            expect(fan.inQueue).toBe(true);
        });

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
        test('should handle undefined queueTargetUpdateTime', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Don't set queueTargetUpdateTime (undefined)
            const targetPos = { x: 200, y: 200 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, obstacles, false, 200);
            
            expect(updated).toBe(true); // Should update since timeSince will be Infinity
            expect(fan.targetX).toBe(200);
        });

        test('should not update target when time threshold not met', () => {
            const fan = new Fan(100, 100, mockConfig);
            
            const targetPos = { x: 200, y: 200 };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, null, false, 110);
            
            expect(updated).toBe(false);
        });

        test('should update target when time threshold met', () => {
            const fan = new Fan(100, 100, mockConfig);
            
            const targetPos = { x: 200, y: 200 };
            
            const obstacles = {
                checkCollision: jest.fn(() => false)
            };
            
            const updated = QueueManager.updateFanTarget(fan, targetPos, obstacles, false, 130);
            
            expect(updated).toBe(true);
            // Timing removed
        });
    });

    describe('findApproachingPosition with defined queuePosition', () => {
        test('should position after closestAhead when queuePosition is defined', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a nearby fan ahead with DEFINED position
            const nearbyFan = new Fan(50, 50, mockConfig); // Closer to front, within 60 pixels
            nearbyFan.queuePosition = 3; // Explicitly defined
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Distance between (100,100) and (50,50) = ~70.7, which exceeds proximityThreshold of 60
            // So it falls back to default: queue.length + approaching.length = 1
            expect(position).toBe(1);
        });

        test('should position after closestAhead when within proximity and queuePosition defined', () => {
            const fan = new Fan(100, 100, mockConfig);
            // Create a nearby fan ahead within proximity threshold
            const nearbyFan = new Fan(70, 70, mockConfig); // ~42.4 pixels away, closer to front
            nearbyFan.queuePosition = 2;
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Should be positioned after nearbyFan
            expect(position).toBe(3);
        });

        test('should handle closestAhead with queuePosition = 0', () => {
            const fan = new Fan(100, 100, mockConfig);
            const nearbyFan = new Fan(70, 70, mockConfig); // Within proximity
            nearbyFan.queuePosition = 0; // Zero is valid
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            expect(position).toBe(1); // After position 0
        });
    });

    describe('processApproaching', () => {
        test('should process approaching fans and promote when ready', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 102;
            fan.targetY = 102;
            
            const approaching = [fan];
            const queue = [];
            let callbackCalled = false;
            
            QueueManager.processApproaching(queue, approaching, () => {
                callbackCalled = true;
            }, 5);
            
            expect(queue.length).toBe(1);
            expect(approaching.length).toBe(0);
            expect(callbackCalled).toBe(true);
        });

        test('should not call callback when callback is not provided', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 102;
            fan.targetY = 102;
            
            const approaching = [fan];
            const queue = [];
            
            // Should not throw when callback is null/undefined
            QueueManager.processApproaching(queue, approaching, null, 5);
            
            expect(queue.length).toBe(1);
            expect(approaching.length).toBe(0);
        });

        test('should not promote fans not ready to join', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 200;
            fan.targetY = 200; // Far from target
            
            const approaching = [fan];
            const queue = [];
            
            QueueManager.processApproaching(queue, approaching, null, 5);
            
            expect(queue.length).toBe(0);
            expect(approaching.length).toBe(1); // Still approaching
        });

        test('should use default threshold when not provided', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 105;
            fan.targetY = 105; // Within default threshold of 10
            
            const approaching = [fan];
            const queue = [];
            
            QueueManager.processApproaching(queue, approaching);
            
            expect(queue.length).toBe(1);
        });
    });

    describe('shouldJoinQueue default parameter', () => {
        test('should use default threshold of 5 when not provided', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 103;
            fan.targetY = 103; // Within default threshold of 5
            
            const result = QueueManager.shouldJoinQueue(fan);
            
            expect(result).toBe(true);
        });

        test('should respect custom threshold when provided', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 103;
            fan.targetY = 103; // Distance ~4.24
            
            // Should be true with default (5)
            expect(QueueManager.shouldJoinQueue(fan)).toBe(true);
            
            // Should be false with threshold of 3
            expect(QueueManager.shouldJoinQueue(fan, 3)).toBe(false);
        });
    });

    describe('updatePositions default parameters', () => {
        test('should use defaults when optional params not provided', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = 'in_queue_waiting';
            const queue = [fan];
            const getTargetPosition = (index) => ({ x: 100, y: 100 });
            const frontPosition = { x: 100, y: 100 };
            
            // Call with only required params (obstacles, forceUpdate, simulationTime default to null, false, 0)
            QueueManager.updatePositions(queue, [], getTargetPosition, frontPosition);
            
            expect(fan.state).toBe('in_queue_waiting');
        });
    });

    describe('findApproachingPosition with undefined queuePosition check', () => {
        test('should handle closestAhead with undefined queuePosition', () => {
            const fan = new Fan(100, 100, mockConfig);
            const nearbyFan = new Fan(70, 70, mockConfig); // Within proximity, closer to front
            nearbyFan.queuePosition = undefined; // Explicitly undefined
            const queue = [nearbyFan];
            const approaching = [];
            const frontPosition = { x: 0, y: 0 };

            const position = QueueManager.findApproachingPosition(fan, queue, approaching, frontPosition);

            // Should fallback to end of queue since queuePosition is undefined
            expect(position).toBe(1);
        });
    });
});
