// Test for Simulation class
import { Simulation } from '../src/core/simulation.js'
import { jest } from '@jest/globals'

const mockConfig = {
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    DEFAULT_SIMULATION_SPEED: 1.0,
    MIN_SIMULATION_SPEED: 0.1,
    MAX_SIMULATION_SPEED: 10.0,
    MAX_FPS: 60,
    COLORS: {
        BACKGROUND: '#0a0a0a',
        GROUND: '#1a3a1a',
        ROAD: '#3a3a3a',
        STAGE_INACTIVE: '#4a4a4a',
        STAGE_ACTIVE: '#ff6b6b',
        BUS_AREA: '#6b6bff',
        SECURITY_QUEUE: '#9b6bff',
        SECURITY_BORDER: '#ff00ff',
        SECURITY_BOUNDARY: '#8B0000',
        TEXT: '#fff'
    },
    GROUND_HEIGHT: 0.7,
    ROAD_START: 0.85,
    QUEUE_LEFT_X: 0.45,
    QUEUE_RIGHT_X: 0.55,
    FOOD_STALL_COUNT: 4,
    FOOD_STALL_X: 0.5
}

describe('Simulation', () => {
    let simulation
    let mockCanvas
    let mockCtx
    let mockParentElement

    beforeEach(() => {
        mockCtx = {
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            stroke: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            setLineDash: jest.fn(),
            strokeRect: jest.fn(),
            fillText: jest.fn(),
            measureText: (text) => ({ width: text.length * 7 }),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            textAlign: 'left'
        }

        mockParentElement = {
            clientWidth: 800,
            clientHeight: 600
        }

        mockCanvas = {
            getContext: jest.fn(() => mockCtx),
            width: 800,
            height: 600,
            parentElement: mockParentElement,
            addEventListener: jest.fn()
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

    test('should initialize with event handlers setup', () => {
        simulation.initialize()
        
        expect(simulation.eventManager).toBeDefined()
        // Mouse handlers should be registered
        expect(mockCanvas.addEventListener).toHaveBeenCalled()
    })

    test('should resize renderer and event manager', () => {
        simulation.initialize()
        
        const resizeSpy = jest.spyOn(simulation.renderer, 'resize')
        const updateDimensionsSpy = jest.spyOn(simulation.eventManager, 'updateDimensions')
        
        simulation.resize()
        
        expect(resizeSpy).toHaveBeenCalledWith(800, 600)
        expect(updateDimensionsSpy).toHaveBeenCalledWith(800, 600)
    })

    test('should handle resize when event manager not initialized', () => {
        const resizeSpy = jest.spyOn(simulation.renderer, 'resize')
        simulation.eventManager = null
        
        expect(() => {
            simulation.resize()
        }).not.toThrow()
        
        expect(resizeSpy).toHaveBeenCalled()
    })

    test('should find fan under mouse cursor', () => {
        simulation.initialize()
        
        const mockFan = {
            x: 100,
            y: 100,
            radius: 5,
            type: 'fan'
        }
        
        simulation.agents = [mockFan]
        
        const found = simulation.findFanUnderMouse(105, 105)
        expect(found).toBe(mockFan)
    })

    test('should return null when no fan is under mouse', () => {
        simulation.initialize()
        
        const mockFan = {
            x: 100,
            y: 100,
            radius: 5,
            type: 'fan'
        }
        
        simulation.agents = [mockFan]
        
        const found = simulation.findFanUnderMouse(200, 200)
        expect(found).toBeNull()
    })

    test('should skip non-fan agents when finding fan under mouse', () => {
        simulation.initialize()
        
        const mockAgent = {
            x: 100,
            y: 100,
            radius: 5,
            type: 'other'
        }
        
        simulation.agents = [mockAgent]
        
        const found = simulation.findFanUnderMouse(100, 100)
        expect(found).toBeNull()
    })

    test('should trigger left concert', () => {
        simulation.initialize()
        
        const handleLeftConcertSpy = jest.spyOn(simulation.eventManager, 'handleLeftConcert')
        
        simulation.triggerLeftConcert()
        
        expect(handleLeftConcertSpy).toHaveBeenCalledWith(simulation.agents)
    })

    test('should trigger right concert', () => {
        simulation.initialize()
        
        const handleRightConcertSpy = jest.spyOn(simulation.eventManager, 'handleRightConcert')
        
        simulation.triggerRightConcert()
        
        expect(handleRightConcertSpy).toHaveBeenCalledWith(simulation.agents)
    })

    test('should trigger bus arrival and add agents', () => {
        simulation.initialize()
        
        const newAgents = [
            { type: 'fan', x: 100, y: 100 },
            { type: 'fan', x: 110, y: 110 }
        ]
        
        jest.spyOn(simulation.eventManager, 'handleBusArrival').mockReturnValue(newAgents)
        
        const initialCount = simulation.agents.length
        simulation.triggerBusArrival()
        
        expect(simulation.agents.length).toBe(initialCount + 2)
    })

    test('should trigger car arrival and add agents', () => {
        simulation.initialize()
        
        const newAgents = [
            { type: 'fan', x: 100, y: 100 }
        ]
        
        jest.spyOn(simulation.eventManager, 'handleCarArrival').mockReturnValue(newAgents)
        
        const initialCount = simulation.agents.length
        simulation.triggerCarArrival()
        
        expect(simulation.agents.length).toBe(initialCount + 1)
    })

    test('should trigger bus departure', () => {
        simulation.initialize()
        
        const handleBusDepartureSpy = jest.spyOn(simulation.eventManager, 'handleBusDeparture')
        
        simulation.triggerBusDeparture()
        
        expect(handleBusDepartureSpy).toHaveBeenCalledWith(simulation.agents)
    })

    test('should render with event manager data', () => {
        simulation.initialize()
        
        const renderSpy = jest.spyOn(simulation.renderer, 'render')
        const setHoveredFanSpy = jest.spyOn(simulation.renderer, 'setHoveredFan')
        
        simulation.render()
        
        expect(setHoveredFanSpy).toHaveBeenCalled()
        expect(renderSpy).toHaveBeenCalled()
    })

    test('should clamp simulation speed to min', () => {
        simulation.setSimulationSpeed(0.05)
        
        expect(simulation.simulationSpeed).toBe(mockConfig.MIN_SIMULATION_SPEED)
    })

    test('should clamp simulation speed to max', () => {
        simulation.setSimulationSpeed(20.0)
        
        expect(simulation.simulationSpeed).toBe(mockConfig.MAX_SIMULATION_SPEED)
    })

    test('should set simulation speed within bounds', () => {
        simulation.setSimulationSpeed(2.5)
        
        expect(simulation.simulationSpeed).toBe(2.5)
    })

    test('should update agents during update cycle', () => {
        simulation.initialize()
        
        const mockAgent = {
            update: jest.fn()
        }
        
        simulation.agents = [mockAgent]
        simulation.paused = false
        
        simulation.update(0.016)
        
        expect(mockAgent.update).toHaveBeenCalled()
    })

    test('should animate with frame rate limiting', () => {
        simulation.initialize()
        
        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn()
        
        // First frame should set up timing
        simulation.animate(0)
        expect(simulation.lastFrameTime).toBe(0)
        
        // Second frame within target frame time should skip rendering
        simulation.animate(10) // 10ms later (below 16.67ms for 60fps)
        
        expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    test('should render when enough time has passed', () => {
        simulation.initialize()
        
        const renderSpy = jest.spyOn(simulation, 'render')
        global.requestAnimationFrame = jest.fn()
        
        // First frame
        simulation.animate(0)
        
        // Second frame after target frame time
        simulation.animate(20) // 20ms later (above 16.67ms)
        
        expect(renderSpy).toHaveBeenCalled()
    })

    test('should update FPS counter', () => {
        simulation.initialize()
        
        global.requestAnimationFrame = jest.fn()
        const onStatsUpdate = jest.fn()
        simulation.onStatsUpdate = onStatsUpdate
        
        // First frame
        simulation.animate(0)
        
        // Render several frames to increment frameCount
        simulation.animate(20)
        simulation.animate(40)
        simulation.animate(60)
        
        // After 1 second, stats should be updated
        simulation.animate(1100)
        
        expect(onStatsUpdate).toHaveBeenCalled()
        expect(onStatsUpdate.mock.calls[0][0]).toHaveProperty('attendeeCount')
        expect(onStatsUpdate.mock.calls[0][0]).toHaveProperty('fps')
    })

    test('should not call onStatsUpdate if not set', () => {
        simulation.initialize()
        
        global.requestAnimationFrame = jest.fn()
        simulation.onStatsUpdate = null
        
        // First frame
        simulation.animate(0)
        
        // After 1 second
        simulation.animate(1100)
        
        // Should not throw
        expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    test('should start animation loop', () => {
        simulation.initialize()
        
        const animateSpy = jest.spyOn(simulation, 'animate')
        
        simulation.start()
        
        expect(animateSpy).toHaveBeenCalledWith(0)
    })

    test('should setup mouse move handler', () => {
        simulation.initialize()
        
        // Get the mousemove handler
        const mouseMoveCall = mockCanvas.addEventListener.mock.calls.find(call => call[0] === 'mousemove')
        expect(mouseMoveCall).toBeDefined()
        
        // Call the handler
        const handler = mouseMoveCall[1]
        const mockEvent = {
            clientX: 150,
            clientY: 250
        }
        
        mockCanvas.getBoundingClientRect = () => ({ left: 50, top: 100 })
        
        handler(mockEvent)
        
        expect(simulation.mouseX).toBe(100)
        expect(simulation.mouseY).toBe(150)
    })

    test('should setup mouse leave handler', () => {
        simulation.initialize()
        
        // Get the mouseleave handler
        const mouseLeaveCall = mockCanvas.addEventListener.mock.calls.find(call => call[0] === 'mouseleave')
        expect(mouseLeaveCall).toBeDefined()
        
        const setHoveredFanSpy = jest.spyOn(simulation.renderer, 'setHoveredFan')
        
        // Call the handler
        const handler = mouseLeaveCall[1]
        handler()
        
        expect(setHoveredFanSpy).toHaveBeenCalledWith(null, 0, 0)
    })
})
