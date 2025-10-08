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
        expect(fan.state).toBe('approaching_queue'); // Initially approaching
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
        
        // With load balancing, total fans (entering + in queue) should be relatively balanced
        const queue0Count = securityQueue.queues[0].length + securityQueue.entering[0].length;
        const queue1Count = securityQueue.queues[1].length + securityQueue.entering[1].length;
        
        expect(Math.abs(queue0Count - queue1Count)).toBeLessThanOrEqual(1);
    });

    test('should set target positions for fans approaching queue', () => {
        const fan = new Fan(400, 540, mockConfig);
        securityQueue.addToQueue(fan);
        
        expect(fan.targetX).toBeDefined();
        expect(fan.targetY).toBeDefined();
        expect(fan.state).toBe('approaching_queue'); // Initially approaching
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
        const fan = new Fan(360, 420, mockConfig); // Position at queue entrance (y=0.7 * 600)
        fan.enhancedSecurity = false; // Ensure regular security
        securityQueue.addToQueue(fan);
        
        // Manually set fan at entry point and trigger entering logic
        fan.x = fan.targetX;
        fan.y = fan.targetY;
        
        const startTime = 1000;
        
        // First update - should move fan from entering to queue
        securityQueue.update(startTime);
        expect(fan.state).toBe('in_queue');
        
        // Move fan to front of queue position
        fan.x = fan.targetX;
        fan.y = fan.targetY;
        
        // Second update - should start processing
        securityQueue.update(startTime + 10);
        expect(fan.state).toBe('being_checked');
        
        // Keep fan at target during processing
        fan.x = fan.targetX;
        fan.y = fan.targetY;
        
        // Third update after regular security time - should pass
        securityQueue.update(startTime + mockConfig.REGULAR_SECURITY_TIME + 100);
        expect(fan.state).toBe('passed_security');
    });

    test('should send enhanced security fan to back of queue', () => {
        // Create two fans - add them manually to same queue to control order
        const fan1 = new Fan(360, 420, mockConfig);
        const fan2 = new Fan(360, 420, mockConfig);
        const queueIndex = 0;
        
        // Set enhanced security before adding
        fan1.enhancedSecurity = true;
        fan2.enhancedSecurity = false;
        fan1.queueIndex = queueIndex;
        fan2.queueIndex = queueIndex;
        
        // Manually add to queue (bypass entering)
        securityQueue.queues[queueIndex].push(fan1);
        securityQueue.queues[queueIndex].push(fan2);
        securityQueue.updateQueuePositions(queueIndex);
        fan1.state = 'in_queue';
        fan2.state = 'in_queue';
        
        // Verify initial state
        expect(securityQueue.queues[queueIndex][0]).toBe(fan1);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan2);
        
        // Move fan1 to their target position
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        
        const startTime = 1000;
        
        // Start processing fan1
        securityQueue.update(startTime);
        expect(fan1.state).toBe('being_checked');
        
        // Keep fan at position during check
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        
        // After enhanced security time - fan1 should be sent to back (entering list)
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 100);
        
        // Fan should be approaching queue again
        expect(fan1.state).toBe('approaching_queue');
        expect(fan1.enhancedSecurity).toBe(false); // Should not be enhanced again
        expect(securityQueue.entering[queueIndex]).toContain(fan1);
        
        // Now fan2 should be at front (position 0)
        expect(securityQueue.queues[queueIndex][0]).toBe(fan2);
    });
});
