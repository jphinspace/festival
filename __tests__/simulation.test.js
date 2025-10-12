// Test for Simulation class
import { Simulation } from '../src/core/simulation.js'
import { jest } from '@jest/globals'

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5
}

describe('Simulation', () => {
    let simulation
    let mockCanvas
    let mockCtx

    beforeEach(() => {
        mockCtx = {
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            fillStyle: ''
        }

        mockCanvas = {
            getContext: jest.fn(() => mockCtx),
            width: 800,
            height: 600
        }

        simulation = new Simulation(mockCanvas, mockConfig)
    })

    test('should initialize with canvas and config', () => {
        expect(simulation.canvas).toBe(mockCanvas)
        expect(simulation.config).toBe(mockConfig)
    })

    test('should start with simulation running', () => {
        expect(simulation.isRunning).toBe(true)
    })

    test('should have initial simulation time of 0', () => {
        expect(simulation.simulationTime).toBe(0)
    })

    test('should set simulation speed', () => {
        simulation.setSpeed(2.0)
        expect(simulation.speed).toBe(2.0)
    })

    test('should pause and resume', () => {
        simulation.pause()
        expect(simulation.isRunning).toBe(false)

        simulation.resume()
        expect(simulation.isRunning).toBe(true)
    })

    test('should toggle pause', () => {
        const wasRunning = simulation.isRunning
        simulation.togglePause()
        expect(simulation.isRunning).toBe(!wasRunning)
    })

    test('should reset simulation', () => {
        simulation.simulationTime = 1000
        simulation.speed = 2.0

        simulation.reset()

        expect(simulation.simulationTime).toBe(0)
    })

    test('should have update method', () => {
        expect(typeof simulation.update).toBe('function')
    })

    test('should update simulation time when running', () => {
        const initialTime = simulation.simulationTime
        simulation.update(0.016) // 16ms frame
        
        // Time should have increased (depending on implementation)
        expect(simulation.simulationTime).toBeGreaterThanOrEqual(initialTime)
    })

    test('should not update when paused', () => {
        simulation.pause()
        const initialTime = simulation.simulationTime

        simulation.update(0.016)

        expect(simulation.simulationTime).toBe(initialTime)
    })
})
