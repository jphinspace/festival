// Unit tests for SecurityQueue class
import { SecurityQueue } from '../src/components/securityQueue.js';
import { Fan } from '../src/core/fan.js';
import { AgentState } from '../src/utils/enums.js';

const mockConfig = {
    REGULAR_SECURITY_TIME: 1000,
    ENHANCED_SECURITY_TIME: 3000,
    ENHANCED_SECURITY_PERCENTAGE: 0.1, // 10% for testing
    QUEUE_LEFT_X: 0.45,
    QUEUE_RIGHT_X: 0.55,
    QUEUE_START_Y: 0.72, // Updated to match new config
    QUEUE_SPACING: 8,
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.75, // Updated to match new config (50% faster)
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

    test('should distribute fans to closest queue based on position', () => {
        // Add fans at different positions - fan on left should go to left queue, fan on right should go to right queue
        const leftQueueX = 800 * mockConfig.QUEUE_LEFT_X; // 800 * 0.3 = 240
        const rightQueueX = 800 * mockConfig.QUEUE_RIGHT_X; // 800 * 0.7 = 560
        
        const fanLeft = new Fan(200, 540, mockConfig); // Closer to left queue
        const fanRight = new Fan(600, 540, mockConfig); // Closer to right queue
        const fanCenter = new Fan(400, 540, mockConfig); // Equidistant
        
        securityQueue.addToQueue(fanLeft);
        securityQueue.addToQueue(fanRight);
        securityQueue.addToQueue(fanCenter);
        
        // fanLeft should be in queue 0 (left)
        expect(fanLeft.queueIndex).toBe(0);
        
        // fanRight should be in queue 1 (right)
        expect(fanRight.queueIndex).toBe(1);
        
        // fanCenter can be in either queue (equidistant)
        expect([0, 1]).toContain(fanCenter.queueIndex);
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
        fan1.state = AgentState.IN_QUEUE;
        fan2.state = AgentState.IN_QUEUE;
        
        // Verify initial state
        expect(securityQueue.queues[queueIndex][0]).toBe(fan1);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan2);
        
        // Move fan1 to their target position
        fan1.x = fan1.targetX;
        fan1.y = fan1.targetY;
        
        const startTime = 1000;
        
        // Start processing fan1 - should be walking to process position
        securityQueue.update(startTime)
        expect(fan1.state).toBe('in_queue_advancing')
        
        // Move fan to processing position and update - should transition to processing
        fan1.x = fan1.targetX
        fan1.y = fan1.targetY
        securityQueue.update(startTime + 10)
        expect(fan1.state).toBe('processing')
        
        // After enhanced security time - fan1 should be sent to back (starts walking there)
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 100)
        
        // Fan should be returning to queue (walking to end of line)
        expect(fan1.state).toBe('returning_to_queue')
        expect(fan1.enhancedSecurity).toBe(false) // Should not be enhanced again
        expect(fan1.returningToQueue).toBe(queueIndex)
        
        // Simulate fan reaching end of line
        fan1.x = fan1.targetX
        fan1.y = fan1.targetY
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 200)
        
        // Now fan should be in entering list
        expect(fan1.state).toBe('approaching_queue')
        expect(securityQueue.entering[queueIndex]).toContain(fan1)
        
        // Now fan2 should be at front (position 0)
        expect(securityQueue.queues[queueIndex][0]).toBe(fan2)
    });

    test('should ensure enhanced security fan moves away from front when queue becomes empty', () => {
        // Test case: only one fan in queue with enhanced security
        const fan = new Fan(360, 420, mockConfig);
        const queueIndex = 0;
        
        fan.enhancedSecurity = true;
        fan.queueIndex = queueIndex;
        
        // Manually add to queue (bypass entering)
        securityQueue.queues[queueIndex].push(fan);
        securityQueue.updateQueuePositions(queueIndex);
        fan.state = AgentState.IN_QUEUE;
        
        // Store initial front position
        const frontX = fan.targetX;
        const frontY = fan.targetY;
        
        // Move fan to front position
        fan.x = frontX;
        fan.y = frontY;
        
        const startTime = 1000;
        
        // Start processing - should be walking to process position
        securityQueue.update(startTime)
        expect(fan.state).toBe('in_queue_advancing')
        
        // Fan should now have a processing position target
        // Move fan to their NEW processing position
        fan.x = fan.targetX
        fan.y = fan.targetY
        
        // Update to transition to processing state
        securityQueue.update(startTime + 10)
        expect(fan.state).toBe('processing')
        
        // After enhanced security time - fan should be sent to back
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 100)
        
        // Fan should be returning to queue (walking to end of line)
        expect(fan.state).toBe('returning_to_queue')
        expect(fan.returningToQueue).toBe(queueIndex)
        
        // Simulate fan reaching end of line
        fan.x = fan.targetX
        fan.y = fan.targetY
        securityQueue.update(startTime + mockConfig.ENHANCED_SECURITY_TIME + 200)
        
        // Now fan should be in entering list with approaching_queue state
        expect(fan.state).toBe('approaching_queue')
        expect(securityQueue.entering[queueIndex]).toContain(fan)
        expect(securityQueue.queues[queueIndex]).not.toContain(fan)
        
        // Critical test: fan's target should be different from front position
        // even though queue is now empty (to ensure they move away)
        expect(fan.targetY).toBeGreaterThan(frontY);
    });

    test('should position queue correctly with entry at bottom and exit at top', () => {
        const fan1 = new Fan(400, 540, mockConfig);
        const fan2 = new Fan(400, 540, mockConfig);
        const queueIndex = 0;
        
        // Add fans manually to queue to ensure they're in the same queue
        fan1.queueIndex = queueIndex;
        fan2.queueIndex = queueIndex;
        
        // Manually add to queue (bypass entering)
        securityQueue.queues[queueIndex].push(fan1);
        securityQueue.queues[queueIndex].push(fan2);
        
        // Update positions
        securityQueue.updateQueuePositions(queueIndex);
        
        // Fan at position 0 (front) should have lower Y value (closer to festival/top)
        // Fan at position 1 (back) should have higher Y value (closer to bus/bottom)
        const frontY = fan1.targetY;
        const backY = fan2.targetY;
        
        // Front should be at QUEUE_START_Y (0.72 * 600 = 432)
        expect(frontY).toBeCloseTo(432, 0);
        
        // Back should be further down (432 + spacing = 440)
        expect(backY).toBeGreaterThan(frontY);
        expect(backY).toBeCloseTo(432 + mockConfig.QUEUE_SPACING, 0);
    });

    test('should prevent slot reservation - fans join at actual end of queue', () => {
        // Add first fan
        const fan1 = new Fan(400, 540, mockConfig);
        securityQueue.addToQueue(fan1);
        const queueIndex = fan1.queueIndex;
        
        // Fan1 is approaching, not in actual queue yet
        expect(securityQueue.entering[queueIndex]).toContain(fan1);
        expect(securityQueue.queues[queueIndex]).not.toContain(fan1);
        
        // Add second fan - it should go to the other queue naturally
        const fan2 = new Fan(400, 540, mockConfig);
        securityQueue.addToQueue(fan2);
        
        // Force fan2 to same queue for testing
        if (fan2.queueIndex !== queueIndex) {
            // Move fan2 to same queue as fan1
            const otherIndex = fan2.queueIndex;
            const idx = securityQueue.entering[otherIndex].indexOf(fan2);
            if (idx !== -1) {
                securityQueue.entering[otherIndex].splice(idx, 1);
                securityQueue.entering[queueIndex].push(fan2);
                fan2.queueIndex = queueIndex;
            }
        }
        
        // Both should be in entering for same queue
        expect(securityQueue.entering[queueIndex]).toContain(fan1);
        expect(securityQueue.entering[queueIndex]).toContain(fan2);
        
        // Simulate fan1 reaching their position and joining queue
        fan1.x = fan1.targetX
        fan1.y = fan1.targetY
        securityQueue.update(1000)
        
        // Fan1 should now be in actual queue (since they're not at position 0 yet)
        // OR if they were at position 0, they'd be immediately put into processing
        const fan1InQueue = securityQueue.queues[queueIndex].includes(fan1)
        const fan1Processing = securityQueue.processing[queueIndex] === fan1
        expect(fan1InQueue || fan1Processing).toBe(true)
        expect(securityQueue.entering[queueIndex]).not.toContain(fan1)
        
        // Fan2 should still be approaching
        expect(securityQueue.entering[queueIndex]).toContain(fan2)
        
        // Update queue positions - fan2's target should be after fan1
        securityQueue.updateQueuePositions(queueIndex);
        
        // Fan2's target should be at position 1 (after fan1 at position 0)
        const fan1Y = securityQueue.queues[queueIndex][0].targetY;
        expect(fan2.targetY).toBeGreaterThan(fan1Y);
    });

    test('should reorder queue based on physical position - closer fans move forward', () => {
        const queueIndex = 0;
        
        // Create three fans and manually add them to queue
        const fan1 = new Fan(360, 500, mockConfig);
        const fan2 = new Fan(360, 480, mockConfig);
        const fan3 = new Fan(360, 460, mockConfig);
        
        fan1.queueIndex = queueIndex;
        fan2.queueIndex = queueIndex;
        fan3.queueIndex = queueIndex;
        
        // Add in reverse order of position (fan1, then fan2, then fan3)
        securityQueue.queues[queueIndex].push(fan1, fan2, fan3);
        
        // Before update: array order is fan1, fan2, fan3
        expect(securityQueue.queues[queueIndex][0]).toBe(fan1);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan2);
        expect(securityQueue.queues[queueIndex][2]).toBe(fan3);
        
        // Update queue positions - should reorder by Y position (lower Y = closer to front)
        securityQueue.updateQueuePositions(queueIndex, true);
        
        // After update: array order should be fan3, fan2, fan1 (sorted by Y)
        expect(securityQueue.queues[queueIndex][0]).toBe(fan3);
        expect(securityQueue.queues[queueIndex][1]).toBe(fan2);
        expect(securityQueue.queues[queueIndex][2]).toBe(fan1);
    });
});
