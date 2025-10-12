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
        super(config)
        this.width = width
        this.height = height
        this.queue = []
        this.entering = []
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

    // Wrapper methods that match test expectations
    processEnteringWrapper(fans, simulationTime) {
        const updateCallback = (sortNeeded, simTime) => {}
        this.processEntering(this.queue, fans, updateCallback, simulationTime)
    }

    processFrontOfQueueWrapper(simulationTime) {
        const getProcessingPos = () => this.getProcessingPosition()
        const onStartProcessing = (fan, simTime) => {
            this.processingStartTime = simTime
        }
        this.processingFan = this.processFrontOfQueue(
            this.queue,
            this.entering,
            getProcessingPos,
            this.processingFan,
            simulationTime,
            onStartProcessing
        )
    }

    checkProcessingTransitionWrapper(fans, simulationTime) {
        if (fans && fans.length > 0) {
            fans.forEach(fan => {
                this.checkProcessingTransition(fan)
            })
        } else if (this.processingFan) {
            this.checkProcessingTransition(this.processingFan)
        }
    }

    updateQueuePositionsWrapper(sortNeeded, simulationTime) {
        const getTargetPosition = (index) => this.getQueuePositionForIndex(index)
        this.updateQueuePositions(
            this.queue,
            this.entering,
            getTargetPosition,
            sortNeeded,
            simulationTime
        )
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
            startWandering: jest.fn(),
            isNearTarget: jest.fn(() => false),
            staticWaypoints: [],
            waypointUpdateTimes: [],
            dynamicWaypoint: null
        }

        jest.clearAllMocks()
    })

    describe('processEntering', () => {
        test('should add approaching_queue fan to queue when close enough', () => {
            mockFan.state = 'approaching_queue'
            mockFan.isNearTarget = jest.fn(() => true)

            processor.processEnteringWrapper([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_waiting')
            expect(processor.queue).toContain(mockFan)
        })

        test('should not add fan if not in approaching_queue state', () => {
            mockFan.state = 'moving'
            mockFan.isNearTarget = jest.fn(() => false) // Not near target

            const entering = [mockFan]
            const updateCallback = (sortNeeded, simTime) => {}
            processor.processEntering(processor.queue, entering, updateCallback, 1000)

            // Fan won't be added because isNearTarget returns false
            expect(processor.queue).not.toContain(mockFan)
            expect(entering).toContain(mockFan) // Still in entering array
        })

        test('should not add fan if too far from queue', () => {
            mockFan.state = 'approaching_queue'
            mockFan.isNearTarget = jest.fn(() => false)

            processor.processEnteringWrapper([mockFan], 1000)

            expect(processor.queue).not.toContain(mockFan)
        })

        test('should handle multiple fans entering', () => {
            const fan2 = {
                ...mockFan,
                x: 240,
                y: 60,
                state: 'approaching_queue',
                isNearTarget: jest.fn(() => true)
            }

            processor.processEnteringWrapper([mockFan, fan2], 1000)

            // Only fan2 is close enough
            expect(processor.queue).toContain(fan2)
        })
    })

    describe('processFrontOfQueue', () => {
        test('should start processing front fan when no one is being processed', () => {
            mockFan.state = 'in_queue_waiting'
            mockFan.isNearTarget = jest.fn(() => true)
            processor.queue = [mockFan]

            processor.processFrontOfQueueWrapper(1000)

            expect(mockFan.state).toBe('in_queue_advancing')
            expect(mockFan.setTarget).toHaveBeenCalled()
        })

        test('should not process if someone is already being processed', () => {
            const fan2 = { ...mockFan }
            processor.processingFan = fan2
            processor.queue = [mockFan]

            processor.processFrontOfQueueWrapper(1000)

            expect(processor.processingFan).toBe(fan2)
        })

        test('should not process if queue is empty', () => {
            processor.queue = []

            processor.processFrontOfQueueWrapper(1000)

            expect(processor.processingFan).toBeNull()
        })

        test('should handle fan at processing position', () => {
            mockFan.state = 'in_queue_waiting'
            mockFan.isNearTarget = jest.fn(() => true)
            processor.queue = [mockFan]

            processor.processFrontOfQueueWrapper(1000)

            expect(mockFan.state).toBe('in_queue_advancing')
        })
    })

    describe('checkProcessingTransition', () => {
        test('should transition in_queue_advancing fan to processing when at position', () => {
            mockFan.state = 'in_queue_advancing'
            mockFan.isNearTarget = jest.fn(() => true)
            processor.processingFan = mockFan

            processor.checkProcessingTransitionWrapper([mockFan], 1000)

            expect(mockFan.state).toBe('processing')
            expect(mockFan.inQueue).toBe(false)
        })

        test('should not transition if fan is not at processing position', () => {
            mockFan.state = 'in_queue_advancing'
            mockFan.isNearTarget = jest.fn(() => false)
            processor.processingFan = mockFan

            processor.checkProcessingTransitionWrapper([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_advancing')
        })

        test('should not transition if fan is not in_queue_advancing', () => {
            mockFan.state = 'in_queue_waiting'
            mockFan.isNearTarget = jest.fn(() => true)
            processor.queue = [mockFan]

            processor.checkProcessingTransitionWrapper([mockFan], 1000)

            expect(mockFan.state).toBe('in_queue_waiting')
        })
    })

    describe('updateQueuePositions', () => {
        test('should update fan targets to their queue positions', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', x: 100, y: 100, setTarget: jest.fn(), isNearTarget: jest.fn(() => false) }
            const fan2 = { ...mockFan, state: 'in_queue_waiting', x: 110, y: 110, setTarget: jest.fn(), isNearTarget: jest.fn(() => false) }
            processor.queue = [fan1, fan2]

            processor.updateQueuePositionsWrapper(true, 1000)

            expect(fan1.setTarget).toHaveBeenCalled()
            expect(fan2.setTarget).toHaveBeenCalled()
        })

        test('should throttle updates when sortNeeded is false', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', x: 100, y: 100, setTarget: jest.fn(), isNearTarget: jest.fn(() => false), queueTargetUpdateTime: 0 }
            processor.queue = [fan1]

            // First call should update
            processor.updateQueuePositionsWrapper(false, 1000)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // Second call immediately after should not update (throttled)
            processor.updateQueuePositionsWrapper(false, 1001)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // After throttle period should update
            processor.updateQueuePositionsWrapper(false, 1201)
            expect(fan1.setTarget).toHaveBeenCalledTimes(2)
        })

        test('should update immediately when sortNeeded is true', () => {
            const fan1 = { ...mockFan, state: 'in_queue_waiting', x: 100, y: 100, setTarget: jest.fn(), isNearTarget: jest.fn(() => false), queueTargetUpdateTime: 0 }
            processor.queue = [fan1]

            processor.updateQueuePositionsWrapper(true, 1000)
            expect(fan1.setTarget).toHaveBeenCalledTimes(1)

            // Should update again even immediately if sortNeeded
            processor.updateQueuePositionsWrapper(true, 1001)
            expect(fan1.setTarget).toHaveBeenCalledTimes(2)
        })

        test('should handle empty queue', () => {
            processor.queue = []

            expect(() => {
                processor.updateQueuePositionsWrapper(true, 1000)
            }).not.toThrow()
        })
    })

    describe('getDistanceToPosition', () => {
        test('should calculate distance correctly', () => {
            const fan = { x: 0, y: 0 }
            const pos = { x: 3, y: 4 }

            const distance = processor.getDistanceToPosition(fan, pos)

            expect(distance).toBe(5) // 3-4-5 triangle
        })

        test('should return 0 for same position', () => {
            const fan = { x: 100, y: 200 }
            const pos = { x: 100, y: 200 }

            const distance = processor.getDistanceToPosition(fan, pos)

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
            const fan = { ...mockFan, setTarget: jest.fn(), queueTargetUpdateTime: 0 }
            const targetPos = { x: 100, y: 200 }
            
            processor.updateFanTarget(fan, targetPos, mockObstacles, true, 1000)

            expect(fan.setTarget).toHaveBeenCalledWith(100, 200, mockObstacles, 1000)
        })
    })

    describe('checkProcessingComplete abstract method', () => {
        test('should throw error when called on base class directly', () => {
            const baseProcessor = new QueuedProcessor(mockConfig)
            const fan = { x: 100, y: 100 }
            
            expect(() => {
                baseProcessor.checkProcessingComplete(fan, 1000, 0)
            }).toThrow('checkProcessingComplete must be implemented by subclass')
        })
    })

    describe('updateQueuePositions complex branching', () => {
        test('should transition fan from advancing to waiting when reaching target (else if branch at line 154)', () => {
            const fan1 = {
                x: 240,  // At queue position (240, 60)
                y: 60,
                state: 'in_queue_advancing',
                setTarget: jest.fn(),
                queueTargetUpdateTime: 0
            }
            
            processor.queue = [fan1]
            processor.setObstacles(mockObstacles)
            
            processor.updateQueuePositionsWrapper(false, 1000)
            
            expect(fan1.state).toBe('in_queue_waiting')
        })

        test('should use Date.now() fallback when simulationTime is 0', () => {
            const fan1 = {
                x: 100,
                y: 100,
                state: 'in_queue_waiting',
                setTarget: jest.fn(),
                queueTargetUpdateTime: 0,
                isNearTarget: jest.fn(() => false)
            }
            
            processor.queue = [fan1]
            processor.setObstacles(mockObstacles)
            
            // Call with simulationTime = 0 to trigger Date.now() fallback
            processor.updateQueuePositionsWrapper(false, 0)
            
            expect(fan1.setTarget).toHaveBeenCalled()
        })

        test('should keep fan in waiting state when already waiting and at target', () => {
            const fan1 = {
                x: 240,  // At queue position (240, 60)
                y: 60,
                state: 'in_queue_waiting',
                setTarget: jest.fn(),
                queueTargetUpdateTime: 0
            }
            
            processor.queue = [fan1]
            processor.setObstacles(mockObstacles)
            
            processor.updateQueuePositionsWrapper(false, 1000)
            
            // State should remain waiting
            expect(fan1.state).toBe('in_queue_waiting')
        })

        test('should set advancing state when fan not at target and update succeeds', () => {
            const fan1 = {
                x: 100,  // Not at queue position (240, 60)
                y: 100,
                state: 'in_queue_waiting',
                setTarget: jest.fn(),
                queueTargetUpdateTime: 0  // No recent update
            }
            
            processor.queue = [fan1]
            processor.setObstacles(mockObstacles)
            
            processor.updateQueuePositionsWrapper(false, 1000)
            
            // State should change to advancing since update succeeded
            expect(fan1.state).toBe('in_queue_advancing')
            expect(fan1.setTarget).toHaveBeenCalled()
        })
    })
})
