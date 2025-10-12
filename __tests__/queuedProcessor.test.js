// Test for QueuedProcessor base class
import { QueuedProcessor } from '../src/core/queuedProcessor.js'
import { jest } from '@jest/globals'

const mockConfig = {
    AGENT_RADIUS: 3,
    QUEUE_SPACING: 20,
    QUEUE_START_Y: 0.1,
    QUEUE_LEFT_X: 0.3,
    QUEUE_RIGHT_X: 0.7
}

const mockObstacles = {
    checkCollision: jest.fn(() => false)
}

class TestQueuedProcessor extends QueuedProcessor {
    constructor(width, height, config) {
        super(width, height, config)
        this.queue = []
        this.processingFan = null
        this.processingStartTime = 0
        this.testProcessingTime = 1000
    }

    checkProcessingComplete(fan, simulationTime) {
        if (simulationTime - this.processingStartTime >= this.testProcessingTime) {
            return { action: 'release' }
        }
        return null
    }

    getProcessingPosition() {
        return { x: this.width * 0.5, y: this.height * 0.2 }
    }

    getQueuePositionForIndex(index) {
        const queueX = this.width * this.config.QUEUE_LEFT_X
        const startY = this.height * this.config.QUEUE_START_Y
        const spacing = this.config.QUEUE_SPACING
        return {
            x: queueX,
            y: startY + (index * spacing)
        }
    }
}

describe('QueuedProcessor Base Class', () => {
    let processor
    let mockFan

    beforeEach(() => {
        processor = new TestQueuedProcessor(800, 600, mockConfig)
        processor.setObstacles(mockObstacles)

        mockFan = {
            x: 100,
            y: 100,
            state: 'approaching_queue',
            inQueue: false,
            queueIndex: 0,
            setTarget: jest.fn(),
            startWandering: jest.fn()
        }

        jest.clearAllMocks()
    })

    describe('processEntering', () => {
        test('should add approaching_queue fan to queue when close enough', () => {
            mockFan.x = 240
            mockFan.y = 60
            mockFan.state = 'approaching_queue'

            processor.processEntering([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_waiting')
            expect(mockFan.inQueue).toBe(true)
            expect(processor.queue).toContain(mockFan)
        })

        test('should not add fan if not in approaching_queue state', () => {
            mockFan.state = 'moving'

            processor.processEntering([mockFan], 1000)

            expect(processor.queue).not.toContain(mockFan)
        })

        test('should not add fan if too far from queue', () => {
            mockFan.x = 100
            mockFan.y = 100
            mockFan.state = 'approaching_queue'

            processor.processEntering([mockFan], 1000)

            expect(processor.queue).not.toContain(mockFan)
        })

        test('should handle multiple fans entering', () => {
            const fan2 = {
                ...mockFan,
                x: 240,
                y: 60,
                setTarget: jest.fn()
            }

            processor.processEntering([mockFan, fan2], 1000)

            // Only fan2 is close enough
            expect(processor.queue).toContain(fan2)
        })
    })

    describe('processFrontOfQueue', () => {
        test('should start processing front fan when no one is being processed', () => {
            mockFan.state = 'in_queue_waiting'
            processor.queue = [mockFan]

            processor.processFrontOfQueue(1000)

            expect(mockFan.state).toBe('in_queue_advancing')
            expect(mockFan.setTarget).toHaveBeenCalled()
        })

        test('should not process if someone is already being processed', () => {
            mockFan.state = 'in_queue_waiting'
            processor.queue = [mockFan]
            processor.processingFan = { state: 'processing' }

            processor.processFrontOfQueue(1000)

            expect(mockFan.state).toBe('in_queue_waiting')
        })

        test('should not process if queue is empty', () => {
            processor.queue = []

            processor.processFrontOfQueue(1000)

            expect(processor.processingFan).toBeNull()
        })

        test('should handle fan at processing position', () => {
            mockFan.state = 'in_queue_waiting'
            mockFan.x = 400
            mockFan.y = 120
            processor.queue = [mockFan]

            processor.processFrontOfQueue(1000)

            // Fan is already at position, should start processing immediately
            expect(mockFan.state).toBe('in_queue_advancing')
        })
    })

    describe('checkProcessingTransition', () => {
        test('should transition in_queue_advancing fan to processing when at position', () => {
            mockFan.state = 'in_queue_advancing'
            mockFan.x = 400
            mockFan.y = 120
            processor.queue = [mockFan]

            processor.checkProcessingTransition([mockFan], 1000)

            expect(mockFan.state).toBe('processing')
            expect(mockFan.inQueue).toBe(false)
            expect(processor.processingFan).toBe(mockFan)
            expect(processor.queue).not.toContain(mockFan)
        })

        test('should not transition if fan is not at processing position', () => {
            mockFan.state = 'in_queue_advancing'
            mockFan.x = 240
            mockFan.y = 80
            processor.queue = [mockFan]

            processor.checkProcessingTransition([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_advancing')
            expect(processor.processingFan).toBeNull()
        })

        test('should not transition if fan is not in_queue_advancing', () => {
            mockFan.state = 'in_queue_waiting'
            mockFan.x = 400
            mockFan.y = 120

            processor.checkProcessingTransition([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_waiting')
        })
    })

    describe('updateQueuePositions', () => {
        test('should update fan targets to their queue positions', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', setTarget: jest.fn() }
            const fan2 = { ...mockFan, state: 'in_queue_waiting', setTarget: jest.fn() }
            processor.queue = [fan1, fan2]

            processor.updateQueuePositions(true, 1000)

            expect(fan1.setTarget).toHaveBeenCalled()
            expect(fan2.setTarget).toHaveBeenCalled()
        })

        test('should throttle updates when sortNeeded is false', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', setTarget: jest.fn() }
            processor.queue = [fan1]

            // First call should update
            processor.updateQueuePositions(false, 1000)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // Second call immediately after should not update (throttled)
            processor.updateQueuePositions(false, 1001)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // After throttle period should update
            processor.updateQueuePositions(false, 1201)
            expect(fan1.setTarget).toHaveBeenCalledTimes(2)
        })

        test('should update immediately when sortNeeded is true', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', setTarget: jest.fn() }
            processor.queue = [fan1]

            processor.updateQueuePositions(true, 1000)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // Should update again even immediately if sortNeeded
            processor.updateQueuePositions(true, 1001)
            expect(fan1.setTarget).toHaveBeenCalledTimes(2)
        })

        test('should handle empty queue', () => {
            processor.queue = []

            expect(() => {
                processor.updateQueuePositions(true, 1000)
            }).not.toThrow()
        })
    })

    describe('getDistanceToPosition', () => {
        test('should calculate distance correctly', () => {
            const distance = processor.getDistanceToPosition(0, 0, 3, 4)

            expect(distance).toBe(5) // 3-4-5 triangle
        })

        test('should return 0 for same position', () => {
            const distance = processor.getDistanceToPosition(100, 200, 100, 200)

            expect(distance).toBe(0)
        })
    })

    describe('setObstacles', () => {
        test('should set obstacles reference', () => {
            const newObstacles = { checkCollision: jest.fn() }

            processor.setObstacles(newObstacles)

            expect(processor.obstacles).toBe(newObstacles)
        })
    })

    describe('updateFanTarget', () => {
        test('should call setTarget with obstacles and time', () => {
            const targetPos = { x: 100, y: 200 }
            processor.updateFanTarget(mockFan, targetPos, 1000)

            expect(mockFan.setTarget).toHaveBeenCalledWith(100, 200, mockObstacles, 1000)
        })
    })
})
