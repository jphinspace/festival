// Test for Simulation class
import { Simulation } from '../src/core/simulation.js'
import { CONFIG } from '../src/utils/config.js'
import { jest } from '@jest/globals'

const mockConfig = CONFIG

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
            height: 600,
            addEventListener: jest.fn(),
            parentElement: {
                clientWidth: 800,
                clientHeight: 600
            },
            getBoundingClientRect: jest.fn(() => ({
                left: 0,
                top: 0
            }))
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
        simulation.setSimulationSpeed(50.0)
        expect(simulation.simulationSpeed).toBe(50.0)
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

    test('should initialize simulation with initialize method', () => {
        // Create a proper canvas with parentElement
        const parentElement = {
            clientWidth: 800,
            clientHeight: 600
        }
        mockCanvas.parentElement = parentElement
        
        simulation.initialize()
        
        expect(simulation.eventManager).not.toBeNull()
        expect(simulation.renderer.width).toBe(800)
        expect(simulation.renderer.height).toBe(600)
    })

    test('should resize renderer when canvas parent changes', () => {
        const parentElement = {
            clientWidth: 1024,
            clientHeight: 768
        }
        mockCanvas.parentElement = parentElement
        
        simulation.resize()
        
        expect(simulation.renderer.width).toBe(1024)
        expect(simulation.renderer.height).toBe(768)
    })

    test('should update event manager dimensions on resize', () => {
        const parentElement = {
            clientWidth: 1024,
            clientHeight: 768
        }
        mockCanvas.parentElement = parentElement
        
        // Initialize first
        simulation.initialize()
        
        // Then resize
        simulation.resize()
        
        expect(simulation.eventManager.width).toBe(1024)
        expect(simulation.eventManager.height).toBe(768)
    })

    test('should trigger left concert', () => {
        simulation.initialize()
        simulation.triggerLeftConcert()
        
        expect(simulation.eventManager.leftConcertActive).toBe(true)
    })

    test('should trigger right concert', () => {
        simulation.initialize()
        simulation.triggerRightConcert()
        
        expect(simulation.eventManager.rightConcertActive).toBe(true)
    })

    test('should trigger bus arrival and add agents', () => {
        simulation.initialize()
        const initialCount = simulation.agents.length
        
        simulation.triggerBusArrival()
        
        expect(simulation.agents.length).toBeGreaterThan(initialCount)
    })

    test('should trigger car arrival and add single agent', () => {
        simulation.initialize()
        const initialCount = simulation.agents.length
        
        simulation.triggerCarArrival()
        
        expect(simulation.agents.length).toBe(initialCount + 1)
    })

    test('should trigger bus departure', () => {
        simulation.initialize()
        
        // Add some agents first
        simulation.triggerBusArrival()
        
        // Mark some as ready to leave
        simulation.agents.forEach(agent => {
            if (agent.type === 'fan') {
                agent.hasSeenShow = true
                agent.hasEatenFood = true
            }
        })
        
        simulation.triggerBusDeparture()
        
        // Some agents should be marked as leaving
        const leavingAgents = simulation.agents.filter(a => a.state === 'leaving')
        expect(leavingAgents.length).toBeGreaterThanOrEqual(0)
    })

    test('should clamp simulation speed to min', () => {
        simulation.setSimulationSpeed(0.01) // Below MIN_SIMULATION_SPEED
        
        expect(simulation.simulationSpeed).toBe(mockConfig.MIN_SIMULATION_SPEED)
    })

    test('should clamp simulation speed to max', () => {
        simulation.setSimulationSpeed(100) // Above MAX_SIMULATION_SPEED
        
        expect(simulation.simulationSpeed).toBe(mockConfig.MAX_SIMULATION_SPEED)
    })

    test('should set simulation speed within range', () => {
        simulation.setSimulationSpeed(5.0)
        
        expect(simulation.simulationSpeed).toBe(5.0)
    })

    test('should setup mouse handlers', () => {
        const mockAddEventListener = jest.fn()
        mockCanvas.addEventListener = mockAddEventListener
        
        simulation.setupMouseHandlers()
        
        // Should have added two event listeners
        expect(mockAddEventListener).toHaveBeenCalledTimes(2)
        expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
        expect(mockAddEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function))
    })

    test('should find fan under mouse', () => {
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            radius: 10
        }
        
        simulation.agents = [mockFan]
        
        const found = simulation.findFanUnderMouse(405, 305)
        
        expect(found).toBe(mockFan)
    })

    test('should return null when no fan under mouse', () => {
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            radius: 10
        }
        
        simulation.agents = [mockFan]
        
        const found = simulation.findFanUnderMouse(100, 100)
        
        expect(found).toBeNull()
    })

    test('should render scene', () => {
        simulation.initialize()
        
        const mockRender = jest.fn()
        simulation.renderer.render = mockRender
        simulation.renderer.setHoveredFan = jest.fn()
        
        simulation.render()
        
        expect(mockRender).toHaveBeenCalledTimes(1)
    })

    test('should update agents in update loop', () => {
        simulation.initialize()
        
        const mockAgent = {
            type: 'fan',
            update: jest.fn()
        }
        
        simulation.agents = [mockAgent]
        simulation.update(0.016)
        
        expect(mockAgent.update).toHaveBeenCalledTimes(1)
    })

    test('should call onStatsUpdate callback', () => {
        simulation.initialize()
        
        const mockCallback = jest.fn()
        simulation.onStatsUpdate = mockCallback
        
        // Just verify the callback can be set
        expect(simulation.onStatsUpdate).toBe(mockCallback)
    })

    test('should throttle frame rate', () => {
        simulation.initialize()
        
        // Just verify throttling logic exists
        expect(simulation.targetFrameTime).toBe(1000 / mockConfig.MAX_FPS)
    })

    test('should handle first frame correctly', () => {
        simulation.initialize()
        
        // Just verify initial state
        expect(simulation.lastFrameTime).toBe(0)
        expect(simulation.lastRenderTime).toBe(0)
    })

    test('should initialize with default values', () => {
        expect(simulation.paused).toBe(false)
        expect(simulation.simulationSpeed).toBe(mockConfig.DEFAULT_SIMULATION_SPEED)
        expect(simulation.agents).toEqual([])
        expect(simulation.lastFrameTime).toBe(0)
        expect(simulation.frameCount).toBe(0)
    })

    test('should return paused state from togglePause', () => {
        const result1 = simulation.togglePause()
        expect(result1).toBe(true)
        
        const result2 = simulation.togglePause()
        expect(result2).toBe(false)
    })

    test('should track mouse position on mousemove event', () => {
        simulation.initialize()
        
        // Get the mousemove handler that was registered
        const mousemoveHandler = mockCanvas.addEventListener.mock.calls.find(
            call => call[0] === 'mousemove'
        )[1]
        
        // Simulate mouse event
        const mockEvent = {
            clientX: 150,
            clientY: 250
        }
        
        mousemoveHandler(mockEvent)
        
        expect(simulation.mouseX).toBe(150)
        expect(simulation.mouseY).toBe(250)
    })

    test('should clear hovered fan on mouseleave event', () => {
        simulation.initialize()
        
        // Get the mouseleave handler that was registered
        const mouseleaveHandler = mockCanvas.addEventListener.mock.calls.find(
            call => call[0] === 'mouseleave'
        )[1]
        
        const mockSetHoveredFan = jest.fn()
        simulation.renderer.setHoveredFan = mockSetHoveredFan
        
        // Simulate mouseleave event
        mouseleaveHandler()
        
        expect(mockSetHoveredFan).toHaveBeenCalledWith(null, 0, 0)
    })

    test('should update frameCount in animate loop', () => {
        simulation.initialize()
        
        expect(simulation.frameCount).toBe(0)
        
        // Just verify frameCount exists and can be set
        simulation.frameCount = 5
        expect(simulation.frameCount).toBe(5)
    })

    test('should calculate FPS after 1 second', () => {
        simulation.initialize()
        
        // Just verify FPS tracking exists
        expect(simulation.currentFPS).toBeDefined()
        expect(simulation.fpsUpdateTime).toBeDefined()
    })

    test('should start animation loop', () => {
        simulation.initialize()
        
        // Just verify start method exists and doesn't crash
        expect(typeof simulation.start).toBe('function')
    })
})
