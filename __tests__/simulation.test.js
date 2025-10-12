// Test for Simulation class
import { Simulation } from '../src/core/simulation.js'
import { jest } from '@jest/globals'

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    DEFAULT_SIMULATION_SPEED: 1.0,
    MIN_SIMULATION_SPEED: 0.1,
    MAX_SIMULATION_SPEED: 10.0,
    MAX_FPS: 60
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

    test('should start with simulation not paused', () => {
        expect(simulation.paused).toBe(false)
    })

    test('should have initial simulation time of 0', () => {
        expect(simulation.simulationTime).toBe(0)
    })

    test('should set simulation speed', () => {
        simulation.setSimulationSpeed(2.0)
        expect(simulation.simulationSpeed).toBe(2.0)
    })

    test('should toggle pause state', () => {
        const wasPaused = simulation.paused
        simulation.togglePause()
        expect(simulation.paused).toBe(!wasPaused)
        
        // Toggle back
        simulation.togglePause()
        expect(simulation.paused).toBe(wasPaused)
    })

    test('should have update method', () => {
        expect(typeof simulation.update).toBe('function')
    })

    test('should update simulation time when not paused', () => {
        simulation.paused = false
        simulation.simulationTime = 0
        simulation.simulationSpeed = 1.0
        
        // Mock event manager so update doesn't fail
        simulation.eventManager = {
            update: jest.fn()
        }
        
        simulation.update(0.016) // 16ms frame
        
        // Time should have increased
        expect(simulation.simulationTime).toBeGreaterThan(0)
    })

    test('should not update simulation time when paused', () => {
        simulation.paused = true
        const initialTime = simulation.simulationTime

        // Mock event manager
        simulation.eventManager = {
            update: jest.fn()
        }

        simulation.update(0.016)

        // Time should not have changed while paused
        expect(simulation.simulationTime).toBe(initialTime)
    })
})
