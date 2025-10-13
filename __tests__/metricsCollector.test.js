/**
 * Tests for MetricsCollector
 */
import { MetricsCollector } from '../src/utils/metricsCollector.js';
import { Fan } from '../src/core/fan.js';
import { AgentState } from '../src/utils/enums.js';

// Mock config
const mockConfig = {
    AGENT_SPEED: 50,
    AGENT_RADIUS: 3,
    PERSONAL_SPACE: 20,
    HUNGER_MIN_INITIAL: 0.1,
    HUNGER_MAX_INITIAL: 0.3,
    HUNGER_THRESHOLD_BASE: 0.7,
    HUNGER_THRESHOLD_VARIANCE: 0.1,
    HUNGER_INCREASE_RATE: 0.0001,
    COLORS: {
        FAN_IDLE: '#4a90e2',
        FAN_MOVING: '#2ecc71',
        FAN_HUNGRY: '#e67e22',
        FAN_AT_SHOW: '#9b59b6',
        FAN_LEAVING: '#e24a4a',
        AGENT_ACTIVE: '#4a90e2',
        AGENT_IN_QUEUE: '#f39c12'
    }
};

describe('MetricsCollector', () => {
    describe('Statistical functions', () => {
        test('average should calculate correctly', () => {
            expect(MetricsCollector.average([1, 2, 3, 4, 5])).toBe(3);
            expect(MetricsCollector.average([10, 20, 30])).toBe(20);
        });

        test('average should return 0 for empty array', () => {
            expect(MetricsCollector.average([])).toBe(0);
        });

        test('median should calculate correctly for odd length', () => {
            expect(MetricsCollector.median([1, 2, 3, 4, 5])).toBe(3);
            expect(MetricsCollector.median([5, 1, 3])).toBe(3);
        });

        test('median should calculate correctly for even length', () => {
            expect(MetricsCollector.median([1, 2, 3, 4])).toBe(2.5);
            expect(MetricsCollector.median([10, 20])).toBe(15);
        });

        test('median should return 0 for empty array', () => {
            expect(MetricsCollector.median([])).toBe(0);
        });

        test('max should return maximum value', () => {
            expect(MetricsCollector.max([1, 5, 3, 2])).toBe(5);
            expect(MetricsCollector.max([10, 20, 15])).toBe(20);
        });

        test('max should return 0 for empty array', () => {
            expect(MetricsCollector.max([])).toBe(0);
        });
    });

    describe('collectMetrics', () => {
        test('should return zero metrics for empty fan array', () => {
            const metrics = MetricsCollector.collectMetrics([], 1000);
            
            expect(metrics.inQueueTimes.average).toBe(0);
            expect(metrics.inQueueTimes.median).toBe(0);
            expect(metrics.inQueueTimes.maximum).toBe(0);
            expect(metrics.approachingQueueTimes.average).toBe(0);
            expect(metrics.approachingQueueTimes.median).toBe(0);
            expect(metrics.approachingQueueTimes.maximum).toBe(0);
            expect(metrics.hunger.average).toBe(0);
            expect(metrics.hunger.median).toBe(0);
            expect(metrics.reenteringQueueTimes.average).toBe(0);
            expect(metrics.reenteringQueueTimes.median).toBe(0);
            expect(metrics.reenteringQueueTimes.maximum).toBe(0);
            expect(metrics.fansInQueue).toBe(0);
            expect(metrics.fansApproachingQueue).toBe(0);
            expect(metrics.fansAtMaxHunger).toBe(0);
            expect(metrics.stuckFans).toBe(0);
        });

        test('should count fans in queue states correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig),
                new Fan(300, 300, mockConfig)
            ];
            
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            fans[1].state = AgentState.IN_QUEUE_ADVANCING;
            fans[2].state = AgentState.IN_QUEUE;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.fansInQueue).toBe(3);
        });

        test('should count fans approaching queue correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            fans[0].state = AgentState.APPROACHING_QUEUE;
            fans[1].state = AgentState.MOVING;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.fansApproachingQueue).toBe(1);
        });

        test('should calculate in_queue times correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            const currentTime = 10000;
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            fans[0].inQueueStartTime = 8000; // 2000ms in queue
            fans[1].state = AgentState.IN_QUEUE_ADVANCING;
            fans[1].inQueueStartTime = 6000; // 4000ms in queue
            
            const metrics = MetricsCollector.collectMetrics(fans, currentTime);
            expect(metrics.inQueueTimes.average).toBe(3000);
            expect(metrics.inQueueTimes.median).toBe(3000);
            expect(metrics.inQueueTimes.maximum).toBe(4000);
        });

        test('should calculate approaching_queue times correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            const currentTime = 5000;
            fans[0].state = AgentState.APPROACHING_QUEUE;
            fans[0].approachingStartTime = 4000; // 1000ms approaching
            fans[1].state = AgentState.APPROACHING_QUEUE;
            fans[1].approachingStartTime = 2000; // 3000ms approaching
            
            const metrics = MetricsCollector.collectMetrics(fans, currentTime);
            expect(metrics.approachingQueueTimes.average).toBe(2000);
            expect(metrics.approachingQueueTimes.median).toBe(2000);
            expect(metrics.approachingQueueTimes.maximum).toBe(3000);
        });

        test('should calculate hunger metrics correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig),
                new Fan(300, 300, mockConfig)
            ];
            
            fans[0].hunger = 0.2;
            fans[1].hunger = 0.5;
            fans[2].hunger = 0.8;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.hunger.average).toBeCloseTo(0.5);
            expect(metrics.hunger.median).toBe(0.5);
        });

        test('should calculate percentage of fans at max hunger', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig),
                new Fan(300, 300, mockConfig),
                new Fan(400, 400, mockConfig)
            ];
            
            fans[0].hunger = 1.0;
            fans[1].hunger = 0.5;
            fans[2].hunger = 1.0;
            fans[3].hunger = 0.8;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.fansAtMaxHunger).toBe(50); // 2 out of 4
        });

        test('should calculate returning_to_queue times correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            const currentTime = 8000;
            fans[0].state = AgentState.RETURNING_TO_QUEUE;
            fans[0].reenteringStartTime = 7000; // 1000ms re-entering
            fans[1].state = AgentState.RETURNING_TO_QUEUE;
            fans[1].reenteringStartTime = 5000; // 3000ms re-entering
            
            const metrics = MetricsCollector.collectMetrics(fans, currentTime);
            expect(metrics.reenteringQueueTimes.average).toBe(2000);
            expect(metrics.reenteringQueueTimes.median).toBe(2000);
            expect(metrics.reenteringQueueTimes.maximum).toBe(3000);
        });

        test('should not count fans without timestamps', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            // No inQueueStartTime set
            fans[1].state = AgentState.APPROACHING_QUEUE;
            // No approachingStartTime set
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.inQueueTimes.average).toBe(0);
            expect(metrics.approachingQueueTimes.average).toBe(0);
        });

        test('should count fans in idle state as not stuck', () => {
            const fans = [
                new Fan(100, 100, mockConfig)
            ];
            
            fans[0].state = AgentState.IDLE;
            fans[0].targetX = null;
            fans[0].targetY = null;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.stuckFans).toBe(0);
        });

        test('should count fans in processing state as not stuck', () => {
            const fans = [
                new Fan(100, 100, mockConfig)
            ];
            
            fans[0].state = AgentState.PROCESSING;
            fans[0].targetX = null;
            fans[0].targetY = null;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.stuckFans).toBe(0);
        });
    });

    describe('formatTime', () => {
        test('should format milliseconds correctly', () => {
            expect(MetricsCollector.formatTime(500)).toBe('500ms');
            expect(MetricsCollector.formatTime(999)).toBe('999ms');
        });

        test('should format seconds correctly', () => {
            expect(MetricsCollector.formatTime(1000)).toBe('1.0s');
            expect(MetricsCollector.formatTime(5500)).toBe('5.5s');
            expect(MetricsCollector.formatTime(59999)).toBe('60.0s');
        });

        test('should format minutes correctly', () => {
            expect(MetricsCollector.formatTime(60000)).toBe('1m 0s');
            expect(MetricsCollector.formatTime(65000)).toBe('1m 5s');
            expect(MetricsCollector.formatTime(125000)).toBe('2m 5s');
        });

        test('should handle zero', () => {
            expect(MetricsCollector.formatTime(0)).toBe('0ms');
        });
    });

    describe('formatMetrics', () => {
        test('should format all metrics correctly', () => {
            const metrics = {
                inQueueTimes: {
                    average: 1500,
                    median: 1200,
                    maximum: 2000
                },
                approachingQueueTimes: {
                    average: 500,
                    median: 450,
                    maximum: 800
                },
                hunger: {
                    average: 0.45,
                    median: 0.5
                },
                reenteringQueueTimes: {
                    average: 300,
                    median: 250,
                    maximum: 400
                },
                fansInQueue: 10,
                fansApproachingQueue: 5,
                fansAtMaxHunger: 25.5,
                stuckFans: 2
            };
            
            const formatted = MetricsCollector.formatMetrics(metrics);
            
            expect(formatted.inQueueAvg).toBe('1.5s');
            expect(formatted.inQueueMedian).toBe('1.2s');
            expect(formatted.inQueueMax).toBe('2.0s');
            expect(formatted.approachingAvg).toBe('500ms');
            expect(formatted.approachingMedian).toBe('450ms');
            expect(formatted.approachingMax).toBe('800ms');
            expect(formatted.hungerAvg).toBe('45.0%');
            expect(formatted.hungerMedian).toBe('50.0%');
            expect(formatted.reenteringAvg).toBe('300ms');
            expect(formatted.reenteringMedian).toBe('250ms');
            expect(formatted.reenteringMax).toBe('400ms');
            expect(formatted.fansInQueue).toBe(10);
            expect(formatted.fansApproachingQueue).toBe(5);
            expect(formatted.fansAtMaxHunger).toBe('25.5%');
            expect(formatted.stuckFans).toBe(2);
        });

        test('should format zero values correctly', () => {
            const metrics = {
                inQueueTimes: { average: 0, median: 0, maximum: 0 },
                approachingQueueTimes: { average: 0, median: 0, maximum: 0 },
                hunger: { average: 0, median: 0 },
                reenteringQueueTimes: { average: 0, median: 0, maximum: 0 },
                fansInQueue: 0,
                fansApproachingQueue: 0,
                fansAtMaxHunger: 0,
                stuckFans: 0
            };
            
            const formatted = MetricsCollector.formatMetrics(metrics);
            
            expect(formatted.inQueueAvg).toBe('0ms');
            expect(formatted.hungerAvg).toBe('0.0%');
            expect(formatted.fansInQueue).toBe(0);
        });
    });

    describe('isFanStuck', () => {
        test('should return false for fans in idle state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.IDLE;
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });

        test('should return false for fans in in_queue_waiting state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.IN_QUEUE_WAITING;
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });

        test('should return false for fans in processing state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.PROCESSING;
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });

        test('should return false for fans in being_checked state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.BEING_CHECKED;
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });

        test('should return false for fans with targets (assumed moving)', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.MOVING;
            fan.targetX = 200;
            fan.targetY = 200;
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });

        test('should return false for fans without targets in moving state', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.state = AgentState.MOVING;
            fan.targetX = null;
            fan.targetY = null;
            // Conservative approach - we don't flag as stuck without more state tracking
            expect(MetricsCollector.isFanStuck(fan)).toBe(false);
        });
    });

    describe('Edge cases and boundary conditions', () => {
        test('should handle single fan correctly', () => {
            const fans = [new Fan(100, 100, mockConfig)];
            fans[0].hunger = 0.5;
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            fans[0].inQueueStartTime = 500;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            
            expect(metrics.hunger.average).toBe(0.5);
            expect(metrics.hunger.median).toBe(0.5);
            expect(metrics.fansInQueue).toBe(1);
            expect(metrics.inQueueTimes.average).toBe(500);
            expect(metrics.inQueueTimes.median).toBe(500);
            expect(metrics.inQueueTimes.maximum).toBe(500);
        });

        test('should handle all fans at max hunger', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig)
            ];
            
            fans[0].hunger = 1.0;
            fans[1].hunger = 1.0;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.fansAtMaxHunger).toBe(100);
        });

        test('should handle mixed states correctly', () => {
            const fans = [
                new Fan(100, 100, mockConfig),
                new Fan(200, 200, mockConfig),
                new Fan(300, 300, mockConfig),
                new Fan(400, 400, mockConfig)
            ];
            
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            fans[1].state = AgentState.APPROACHING_QUEUE;
            fans[2].state = AgentState.MOVING;
            fans[3].state = AgentState.IDLE;
            
            const metrics = MetricsCollector.collectMetrics(fans, 1000);
            expect(metrics.fansInQueue).toBe(1);
            expect(metrics.fansApproachingQueue).toBe(1);
        });

        test('should handle negative time differences gracefully', () => {
            const fans = [new Fan(100, 100, mockConfig)];
            fans[0].state = AgentState.IN_QUEUE_WAITING;
            fans[0].inQueueStartTime = 10000; // Future timestamp
            
            const metrics = MetricsCollector.collectMetrics(fans, 5000);
            // Should result in negative time, which is included in calculation
            expect(metrics.inQueueTimes.average).toBe(-5000);
        });
    });
});
