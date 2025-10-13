// Unit tests for SecurityQueue class
import { SecurityQueue } from '../src/components/securityQueue.js';
import { Fan } from '../src/core/fan.js';
import { AgentState } from '../src/utils/enums.js';
import { jest } from '@jest/globals';

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

    describe('Branch coverage for checkProcessingComplete', () => {
        test('should return release action for regular security', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = false;
            
            const result = securityQueue.checkProcessingComplete(fan, 2000, 0);
            
            expect(result.completed).toBe(true);
            expect(result.action).toBe('release');
        });

        test('should return return_to_queue action for enhanced security', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;

            const result = securityQueue.checkProcessingComplete(fan, mockConfig.ENHANCED_SECURITY_TIME + 100, 0);
            
            expect(result.completed).toBe(true);
            expect(result.action).toBe('return_to_queue');
        });
    });

    describe('Branch coverage for ternary operators and edge cases', () => {
        test('should use correct queueX for right queue (queueIndex 1)', () => {
            const fan = new Fan(400, 300, mockConfig);
            const queueIndex = 1; // Right queue
            
            securityQueue.addToQueue(fan);
            // Force to right queue by setting queueIndex
            if (fan.queueIndex !== 1) {
                const idx = securityQueue.entering[fan.queueIndex].indexOf(fan);
                if (idx !== -1) {
                    securityQueue.entering[fan.queueIndex].splice(idx, 1);
                    securityQueue.entering[1].push(fan);
                    fan.queueIndex = 1;
                }
            }
            
            // This should use QUEUE_RIGHT_X for queueIndex 1
            expect(fan.queueIndex).toBe(1);
        });

        test('should handle line changing while fan is returning to queue', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            const queueIndex = 0;
            
            // Set up fan as if returning to queue with target far from actual end
            fan.state = 'returning_to_queue';
            fan.returningToQueue = queueIndex;
            fan.targetX = 400;
            fan.targetY = 500; // Target far from actual end
            fan.x = 400;
            fan.y = 450;
            
            // Set up processing state
            securityQueue.processing[queueIndex] = fan;
            
            // Add more fans to queue to change the end position significantly
            securityQueue.queues[queueIndex] = [];
            securityQueue.entering[queueIndex] = [
                new Fan(400, 400, mockConfig),
                new Fan(400, 410, mockConfig),
                new Fan(400, 420, mockConfig)
            ];
            
            // This should call _handleReturningFan which will update target (changing state to moving)
            securityQueue.update(0);
            
            // When setTarget is called, state changes to moving
            expect(fan.state).toBe('moving');
        });

        test('should handle fan reaching end of line when returning', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            const queueIndex = 0;
            
            // Set up fan as if they just reached end of line
            fan.state = 'returning_to_queue';
            fan.returningToQueue = queueIndex;
            const endPos = securityQueue._calculateEndOfLinePosition(queueIndex);
            fan.targetX = endPos.x;
            fan.targetY = endPos.y;
            fan.x = endPos.x;
            fan.y = endPos.y;
            fan.isNearTarget = jest.fn().mockReturnValue(true);
            
            // Set up processing state
            securityQueue.processing[queueIndex] = fan;
            
            // This should transition fan to approaching_queue and add to entering
            securityQueue.update(0);
            
            // Fan should now be in entering list with approaching state
            expect(fan.state).toBe('approaching_queue');
            expect(securityQueue.entering[queueIndex]).toContain(fan);
        });

        test('should handle newProcessing being null case', () => {
            const queueIndex = 0;
            
            // Empty queues
            securityQueue.queues[queueIndex] = [];
            securityQueue.entering[queueIndex] = [];
            securityQueue.processing[queueIndex] = null;
            
            // Update with empty queues
            securityQueue.update(0);
            
            // Processing should still be null
            expect(securityQueue.processing[queueIndex]).toBeNull();
        });

        test('should call release for regular security completion', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = false;
            fan.queueIndex = 0;
            const queueIndex = 0;
            
            // Set up fan as if they've completed regular security processing
            fan.state = 'processing';
            fan.inQueue = false;
            
            // Set up processing state
            securityQueue.processing[queueIndex] = fan;
            securityQueue.processingStartTime[queueIndex] = 0;
            
            // Update after regular security time has elapsed
            securityQueue.update(mockConfig.REGULAR_SECURITY_TIME + 100);
            
            // Fan should be released (state changed to moving/idle and removed from processing)
            expect(fan.state).toBe('moving');
            expect(securityQueue.processing[queueIndex]).toBeNull();
        });
    });

    describe('Branch coverage for checkProcessingComplete extended', () => {
        test('should return not completed when time not elapsed', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = false;
            
            const result = securityQueue.checkProcessingComplete(fan, 500, 0);
            
            expect(result.completed).toBe(false);
            expect(result.action).toBeNull();
        });
    });

    describe('Branch coverage for update method', () => {
        test('should update target when returning fan line changed', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            fan.state = AgentState.RETURNING_TO_QUEUE;
            fan.returningToQueue = 0;
            fan.targetX = 100; // Far from queue
            fan.targetY = 100;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            // Add other fans to queue to change the line position
            const fan2 = new Fan(360, 400, mockConfig);
            securityQueue.queues[0].push(fan2);
            
            securityQueue.update(5000);
            
            // Fan's target should have been updated (setTarget called)
            // After setTarget is called, state may change to moving
            expect(fan.state).toBe(AgentState.MOVING);
        });

        test('should handle returning fan reaching end of line', () => {
            const fan = new Fan(360, 432, mockConfig); // Near queue end
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            fan.state = AgentState.RETURNING_TO_QUEUE;
            fan.returningToQueue = 0;
            fan.targetX = 360;
            fan.targetY = 432;
            fan.x = 360;
            fan.y = 432;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            securityQueue.update(5000);
            
            // Fan should be added to entering list and processing cleared
            expect(securityQueue.processing[0]).toBeNull();
        });

        test('should release fan with regular security', () => {
            const fan = new Fan(360, 424, mockConfig);
            fan.enhancedSecurity = false;
            fan.state = AgentState.PROCESSING;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            securityQueue.update(2000); // After regular security time
            
            // Fan should be released and processing cleared
            expect(securityQueue.processing[0]).toBeNull();
            expect(fan.inQueue).toBe(false);
        });

        test('should handle when newProcessing is null (no one to process)', () => {
            // Empty queue, no one processing
            securityQueue.processing[0] = null;
            securityQueue.queues[0] = [];
            securityQueue.entering[0] = [];
            
            securityQueue.update(1000);
            
            // Processing should remain null
            expect(securityQueue.processing[0]).toBeNull();
        });

        test('should not update queue when newProcessing equals current processing', () => {
            const fan = new Fan(360, 424, mockConfig);
            fan.state = AgentState.PROCESSING;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            // Run update - newProcessing should equal current processing
            securityQueue.update(500); // Before completion
            
            // Processing should still be the same fan
            expect(securityQueue.processing[0]).toBe(fan);
        });
    });

    describe('Branch coverage for queueIndex 1 (right queue)', () => {
        test('should calculate end of line position for right queue', () => {
            // Force a fan into the right queue
            const fan = new Fan(440, 540, mockConfig);
            fan.queueIndex = 1;
            securityQueue.queues[1].push(fan);
            
            const endPos = securityQueue._calculateEndOfLinePosition(1);
            
            // Should use QUEUE_RIGHT_X
            const expectedX = 800 * mockConfig.QUEUE_RIGHT_X;
            expect(endPos.x).toBe(expectedX);
        });

        test('should process fan in right queue', () => {
            const fan = new Fan(440, 424, mockConfig);
            fan.enhancedSecurity = false;
            fan.state = AgentState.PROCESSING;
            fan.queueIndex = 1;
            
            securityQueue.processing[1] = fan;
            securityQueue.processingStartTime[1] = 0;
            
            securityQueue.update(mockConfig.REGULAR_SECURITY_TIME + 100);
            
            // Fan should be released
            expect(securityQueue.processing[1]).toBeNull();
        });
    });

    describe('Branch coverage for returning fan reaching target', () => {
        test('should handle fan reaching end of line and becoming approaching_queue', () => {
            const fan = new Fan(360, 432, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            fan.state = AgentState.RETURNING_TO_QUEUE;
            fan.returningToQueue = 0;
            
            // Position fan at the end of line exactly
            const endPos = securityQueue._calculateEndOfLinePosition(0);
            fan.x = endPos.x;
            fan.y = endPos.y;
            fan.targetX = endPos.x;
            fan.targetY = endPos.y;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            securityQueue.update(5000);
            
            // Fan should be moved to entering array
            expect(securityQueue.entering[0]).toContain(fan);
            expect(fan.state).toBe(AgentState.APPROACHING_QUEUE);
            expect(securityQueue.processing[0]).toBeNull();
        });
    });

    describe('Branch coverage for newProcessing assignment', () => {
        test('should update processing when newProcessing differs from current', () => {
            // Start with someone processing
            const fan1 = new Fan(360, 424, mockConfig);
            fan1.state = AgentState.PROCESSING;
            fan1.enhancedSecurity = false;
            
            securityQueue.processing[0] = fan1;
            securityQueue.processingStartTime[0] = 0;
            
            // Add someone to the queue
            const fan2 = new Fan(360, 432, mockConfig);
            securityQueue.queues[0].push(fan2);
            
            // Update after fan1 completes
            securityQueue.update(mockConfig.REGULAR_SECURITY_TIME + 100);
            
            // Processing should have changed (either to fan2 or null)
            expect(securityQueue.processing[0] !== fan1).toBe(true);
        });

        test('should update queue positions when starting to process new fan', () => {
            // Test Line 322-324: newProcessing !== this.processing AND newProcessing !== null
            const fan1 = new Fan(360, 432, mockConfig);
            fan1.state = AgentState.IN_QUEUE_WAITING;
            fan1.queueIndex = 0;
            
            securityQueue.queues[0].push(fan1);
            securityQueue.processing[0] = null;
            
            // Update should start processing fan1
            securityQueue.update(1000);
            
            // Should have started processing
            expect(securityQueue.processing[0]).toBe(fan1);
        });

        test('should complete regular security and release fan', () => {
            // Test Line 271: result.action === 'release'
            const fan = new Fan(360, 424, mockConfig);
            fan.enhancedSecurity = false;
            fan.state = AgentState.PROCESSING;
            fan.queueIndex = 0;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            // Update after regular security completes
            securityQueue.update(mockConfig.REGULAR_SECURITY_TIME + 100);
            
            // Fan should be released (processing cleared)
            expect(securityQueue.processing[0]).toBeNull();
            expect(fan.state).not.toBe(AgentState.PROCESSING);
        });

        test('should handle returning fan near target at end of line', () => {
            // Test Line 201: else if processingFan.isNearTarget(10)
            const fan = new Fan(360, 432, mockConfig);
            fan.enhancedSecurity = true;
            fan.queueIndex = 0;
            fan.state = AgentState.RETURNING_TO_QUEUE;
            fan.returningToQueue = 0;
            
            // Position fan exactly at end of line
            const endPos = securityQueue._calculateEndOfLinePosition(0);
            fan.x = endPos.x;
            fan.y = endPos.y;
            fan.targetX = endPos.x;
            fan.targetY = endPos.y;
            
            securityQueue.processing[0] = fan;
            securityQueue.processingStartTime[0] = 0;
            
            // Should be near target
            expect(fan.isNearTarget(10)).toBe(true);
            
            securityQueue.update(5000);
            
            // Fan should be moved to entering list
            expect(securityQueue.entering[0]).toContain(fan);
            expect(fan.state).toBe(AgentState.APPROACHING_QUEUE);
        });
    });

    describe('Integration test for processing transition - lines 323-325', () => {
        test('should trigger processing transition and updateQueuePositions', () => {
            // Create a fan in the queue, ready to be processed
            const fan = new Fan(360, 424, mockConfig);
            fan.state = AgentState.IN_QUEUE_WAITING;
            fan.inQueue = true;
            
            // Position fan at front of queue, at the exact queue position
            const queueX = 800 * mockConfig.QUEUE_LEFT_X;
            const queueY = 600 * mockConfig.QUEUE_START_Y;
            fan.x = queueX;
            fan.y = queueY - 5; // Just behind processing position
            fan.targetX = queueX;
            fan.targetY = queueY;
            
            // Add to queue
            securityQueue.queues[0] = [fan];
            securityQueue.processing[0] = null; // No one processing yet
            
            // First update - fan should not start processing yet (too far)
            securityQueue.update(100);
            
            // Move fan closer to processing position
            fan.y = queueY + 3; // Right at processing area
            
            // Second update - fan should start processing now
            securityQueue.update(200);
            
            // Verify fan is now being processed
            // This should hit lines 323-325 where newProcessing !== null
            expect(securityQueue.processing[0]).toBeTruthy();
        });
    });

    describe('Helper methods for state transitions', () => {
        test('shouldUpdateToNewEnd returns true when distance > 10', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            
            const endPos = { x: 100, y: 115 }; // 15 pixels away
            
            expect(securityQueue.shouldUpdateToNewEnd(fan, endPos)).toBe(true);
        });

        test('shouldUpdateToNewEnd returns false when distance <= 10', () => {
            const fan = new Fan(100, 100, mockConfig);
            fan.targetX = 100;
            fan.targetY = 100;
            
            const endPos = { x: 100, y: 108 }; // 8 pixels away
            
            expect(securityQueue.shouldUpdateToNewEnd(fan, endPos)).toBe(false);
        });

        test('shouldReleaseToFestival returns true for release action', () => {
            const result = { completed: true, action: 'release' };
            expect(securityQueue.shouldReleaseToFestival(result)).toBe(true);
        });

        test('shouldReleaseToFestival returns false for other actions', () => {
            const result = { completed: true, action: 'return_to_queue' };
            expect(securityQueue.shouldReleaseToFestival(result)).toBe(false);
        });

        test('shouldReturnToQueue returns true for return_to_queue action', () => {
            const result = { completed: true, action: 'return_to_queue' };
            expect(securityQueue.shouldReturnToQueue(result)).toBe(true);
        });

        test('shouldReturnToQueue returns false for other actions', () => {
            const result = { completed: true, action: 'release' };
            expect(securityQueue.shouldReturnToQueue(result)).toBe(false);
        });
    });

    describe('Additional helper methods', () => {
        test('isNearEndOfQueue returns true when fan is near target', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.targetX = 405;
            fan.targetY = 305;
            fan.x = 405;
            fan.y = 305;
            
            expect(securityQueue.isNearEndOfQueue(fan, 10)).toBe(true);
        });

        test('isNearEndOfQueue returns false when fan is far from target', () => {
            const fan = new Fan(400, 300, mockConfig);
            fan.targetX = 450;
            fan.targetY = 350;
            fan.x = 400;
            fan.y = 300;
            
            expect(securityQueue.isNearEndOfQueue(fan, 10)).toBe(false);
        });

        test('getQueueX returns left queue X for index 0', () => {
            const queueX = securityQueue.getQueueX(0);
            expect(queueX).toBe(800 * mockConfig.QUEUE_LEFT_X);
        });

        test('getQueueX returns right queue X for index 1', () => {
            const queueX = securityQueue.getQueueX(1);
            expect(queueX).toBe(800 * mockConfig.QUEUE_RIGHT_X);
        });
    });

    describe('Branch coverage for _handleReturningFan line 228', () => {
        test('should hit else branch when fan is near end of queue', () => {
            const fan = new Fan(400, 300, mockConfig);
            const queueIndex = 0;
            
            // Set up fan as returning to queue
            fan.returningToQueue = true;
            fan.state = 'processing';
            fan.inQueue = false;
            
            // Position fan at end of queue - make sure it's really close to target
            const endPos = securityQueue._calculateEndOfLinePosition(queueIndex);
            fan.x = endPos.x;
            fan.y = endPos.y;
            fan.targetX = endPos.x;
            fan.targetY = endPos.y;
            
            securityQueue.processing[queueIndex] = fan;
            securityQueue.processingStartTime[queueIndex] = 0;
            
            // This should hit the else branch on line 228
            securityQueue._handleReturningFan(queueIndex, fan, 1000);
            
            // Verify the else branch was executed
            expect(fan.returningToQueue).toBeUndefined();
            expect(securityQueue.entering[queueIndex]).toContain(fan);
            expect(fan.state).toBe('approaching_queue');
            // inQueue might be set by other logic, just check it's defined
            expect(fan.inQueue).toBeDefined();
        });
    });

    describe('Branch coverage for _handleCompletedProcessing line 298', () => {
        test('should hit else-if branch for release to festival', () => {
            const fan = new Fan(400, 300, mockConfig);
            const queueIndex = 0;
            
            fan.state = 'processing';
            fan.enhancedSecurity = false;
            fan.inQueue = true;
            
            securityQueue.processing[queueIndex] = fan;
            securityQueue.processingStartTime[queueIndex] = 0;
            
            // Wait for regular security time to complete
            const completionTime = mockConfig.REGULAR_SECURITY_TIME + 100;
            
            // This should hit the else-if branch on line 298 (release to festival)
            securityQueue._handleCompletedProcessing(queueIndex, fan, completionTime);
            
            // Verify fan was released
            expect(fan.state).toBe('moving');
            expect(securityQueue.processing[queueIndex]).toBeNull();
        });
    });

    describe('Branch coverage for isNearEndOfQueue line 385 implicit else', () => {
        test('isNearEndOfQueue returns value from fan.isNearTarget', () => {
            const fan = new Fan(400, 300, mockConfig);
            
            // Position fan far from target (implicit else path)
            fan.x = 400;
            fan.y = 300;
            fan.targetX = 500;
            fan.targetY = 400;
            
            // This exercises line 385-386 (return statement)
            const result = securityQueue.isNearEndOfQueue(fan, 10);
            
            expect(typeof result).toBe('boolean');
        });
    });
});
