// Unit tests for SecurityQueue class
import { SecurityQueue } from '../securityQueue.js';
import { Fan } from '../fan.js';

const mockConfig = {
    REGULAR_SECURITY_TIME: 1000,
    ENHANCED_SECURITY_TIME: 3000,
    ENHANCED_SECURITY_PERCENTAGE: 0.1, // 10% for testing
    QUEUE_LEFT_X: 0.45,
    QUEUE_RIGHT_X: 0.55,
    QUEUE_START_Y: 0.85,
    QUEUE_SPACING: 8,
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    COLORS: {
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a',
        AGENT_IN_QUEUE: '#f0ad4e',
        AGENT_BEING_CHECKED: '#5bc0de',
        AGENT_ENHANCED_SECURITY: '#d9534f'
    }
};

describe('SecurityQueue', () => {
    let securityQueue;

    beforeEach(() => {
        securityQueue = new SecurityQueue(mockConfig, 800, 600);
    });

    test('should initialize with two empty queues', () => {
        expect(securityQueue.queues).toHaveLength(2);
        expect(securityQueue.queues[0]).toHaveLength(0);
        expect(securityQueue.queues[1]).toHaveLength(0);
        expect(securityQueue.getTotalCount()).toBe(0);
    });

    test('should update dimensions', () => {
        securityQueue.updateDimensions(1024, 768);
        expect(securityQueue.width).toBe(1024);
        expect(securityQueue.height).toBe(768);
    });

    test('should add fan to queue', () => {
        const fan = new Fan(400, 540, mockConfig);
        securityQueue.addToQueue(fan);
        
        expect(securityQueue.getTotalCount()).toBe(1);
        expect(fan.state).toBe('in_queue');
        expect(fan.queueIndex).toBeDefined();
        expect(fan.enhancedSecurity).toBeDefined();
    });

    test('should distribute fans to shorter queue', () => {
        // Add 3 fans
        const fan1 = new Fan(400, 540, mockConfig);
        const fan2 = new Fan(400, 540, mockConfig);
        const fan3 = new Fan(400, 540, mockConfig);
        
        securityQueue.addToQueue(fan1);
        securityQueue.addToQueue(fan2);
        securityQueue.addToQueue(fan3);
        
        // With load balancing, queues should be relatively balanced
        const queue0Count = securityQueue.queues[0].length;
        const queue1Count = securityQueue.queues[1].length;
        
        expect(Math.abs(queue0Count - queue1Count)).toBeLessThanOrEqual(1);
    });

    test('should set target positions for fans in queue', () => {
        const fan = new Fan(400, 540, mockConfig);
        securityQueue.addToQueue(fan);
        
        expect(fan.targetX).toBeDefined();
        expect(fan.targetY).toBeDefined();
        expect(fan.state).toBe('in_queue');
    });

    test('should get all fans from both queues', () => {
        const fan1 = new Fan(400, 540, mockConfig);
        const fan2 = new Fan(400, 540, mockConfig);
        const fan3 = new Fan(400, 540, mockConfig);
        
        securityQueue.addToQueue(fan1);
        securityQueue.addToQueue(fan2);
        securityQueue.addToQueue(fan3);
        
        const allFans = securityQueue.getAllFans();
        expect(allFans).toHaveLength(3);
        expect(allFans).toContain(fan1);
        expect(allFans).toContain(fan2);
        expect(allFans).toContain(fan3);
    });

    test('should process fan through security after regular time', () => {
        const fan = new Fan(360, 510, mockConfig); // Position at queue entrance
        fan.enhancedSecurity = false; // Ensure regular security
        securityQueue.addToQueue(fan);
        
        // Manually set fan at front of queue position
        fan.x = fan.targetX;
        fan.y = fan.targetY;
        
        const startTime = 1000;
        
        // First update - should start processing
        securityQueue.update(startTime);
        expect(fan.state).toBe('being_checked');
        
        // Second update after regular security time - should pass
        securityQueue.update(startTime + mockConfig.REGULAR_SECURITY_TIME + 100);
        expect(fan.state).toBe('passed_security');
    });

    test('should send enhanced security fan to back of queue', () => {
        // Add two fans to the same queue by adding to queue 0 first
        const fan1 = new Fan(360, 510, mockConfig);
        const fan2 = new Fan(360, 510, mockConfig);
        
        // Add both fans
        securityQueue.addToQueue(fan1);
        const queueIndex = fan1.queueIndex;
        
        // Force fan2 into the same queue as fan1
        securityQueue.queues[queueIndex].push(fan2);
        fan2.queueIndex = queueIndex;
        securityQueue.updateQueuePositions(queueIndex);
        
        // Set enhanced security AFTER adding to queue
        fan1.enhancedSecurity = true; // Force enhanced security for first fan
        fan2.enhancedSecurity = false; // Regular security for second fan
        
        // Manually set fan1 at front of queue position
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        
        const startTime = 1000;
        
        // Verify initial state - fan1 should be at position 0, fan2 at position 1
        expect(securityQueue.queues[queueIndex][0]).toBe(fan1);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan2);
        
        // Start processing fan1
        securityQueue.update(startTime);
        expect(fan1.state).toBe('being_checked');
        
        // After enhanced security time - fan1 should be sent to back
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 100);
        
        // Fan should be back in queue
        expect(fan1.state).toBe('in_queue');
        expect(fan1.enhancedSecurity).toBe(false); // Should not be enhanced again
        expect(securityQueue.queues[queueIndex]).toContain(fan1);
        
        // Now fan2 should be at front (position 0) and fan1 at back (position 1)
        expect(securityQueue.queues[queueIndex][0]).toBe(fan2);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan1);
    });
});
