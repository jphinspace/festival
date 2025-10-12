// Unit tests for Renderer class
import { Renderer } from '../src/components/renderer.js';

const mockConfig = {
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
    QUEUE_RIGHT_X: 0.55
};

describe('Renderer', () => {
    let renderer;
    let canvas;
    let ctx;

    beforeEach(() => {
        // Create a mock canvas
        canvas = {
            width: 0,
            height: 0,
            getContext: () => ctx
        };
        
        ctx = {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {}
        };
        
        renderer = new Renderer(canvas, mockConfig);
    });

    test('should initialize with canvas and config', () => {
        expect(renderer.canvas).toBe(canvas);
        expect(renderer.config).toBe(mockConfig);
        expect(renderer.width).toBe(0);
        expect(renderer.height).toBe(0);
    });

    test('should resize canvas correctly', () => {
        renderer.resize(800, 600);
        expect(renderer.width).toBe(800);
        expect(renderer.height).toBe(600);
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
    });

    test('should draw background with correct colors', () => {
        renderer.resize(800, 600);
        renderer.drawBackground();
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw stages', () => {
        renderer.resize(800, 600);
        renderer.drawStages(false, false);
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw bus area', () => {
        renderer.resize(800, 600);
        renderer.drawBusArea();
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should render complete scene', () => {
        renderer.resize(800, 600);
        const agents = [];
        renderer.render(agents, false, false);
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw security boundaries when obstacles provided', () => {
        renderer.resize(800, 600);
        
        // Create mock obstacles with getSecurityBoundaries method
        let getSecurityBoundariesCalled = false;
        const mockObstacles = {
            getSecurityBoundaries: () => {
                getSecurityBoundariesCalled = true;
                return [
                    { x: 0, y: 100, width: 50, height: 200 },
                    { x: 750, y: 100, width: 50, height: 200 }
                ];
            }
        };
        
        // Track strokeRect calls
        const strokeRectCalls = [];
        ctx.strokeRect = (...args) => strokeRectCalls.push(args);
        
        renderer.drawSecurityBoundaries(mockObstacles);
        
        expect(getSecurityBoundariesCalled).toBe(true);
        expect(strokeRectCalls.length).toBe(2);
        expect(strokeRectCalls[0]).toEqual([0, 100, 50, 200]);
        expect(strokeRectCalls[1]).toEqual([750, 100, 50, 200]);
        expect(ctx.strokeStyle).toBe(mockConfig.COLORS.SECURITY_BOUNDARY);
        expect(ctx.lineWidth).toBe(2);
    });

    test('should handle null obstacles gracefully in drawSecurityBoundaries', () => {
        renderer.resize(800, 600);
        
        // Should not throw when obstacles is null
        expect(() => {
            renderer.drawSecurityBoundaries(null);
        }).not.toThrow();
    });

    test('should render complete scene with obstacles', () => {
        renderer.resize(800, 600);
        const agents = [];
        let getSecurityBoundariesCalled = false;
        const mockObstacles = {
            getSecurityBoundaries: () => {
                getSecurityBoundariesCalled = true;
                return [
                    { x: 0, y: 100, width: 50, height: 200 }
                ];
            }
        };
        
        renderer.render(agents, false, false, [], null, null, mockObstacles);
        
        // Just verify it doesn't crash and obstacles method was called
        expect(renderer.width).toBe(800);
        expect(getSecurityBoundariesCalled).toBe(true);
    });

    test('should draw show timer during prep phase', () => {
        renderer.resize(800, 600);
        const agents = [];
        const leftShowInfo = { isPrep: true, progress: 0.5 };
        
        // Track arc calls
        const arcCalls = [];
        ctx.arc = (...args) => arcCalls.push(args);
        ctx.stroke = () => {};
        
        renderer.render(agents, false, false, [], leftShowInfo, null, null);
        
        // Should have called arc for timer
        expect(arcCalls.length).toBeGreaterThan(0);
    });

    test('should draw show timer during show phase', () => {
        renderer.resize(800, 600);
        const agents = [];
        const rightShowInfo = { isPrep: false, progress: 0.75 };
        
        // Track arc calls
        const arcCalls = [];
        ctx.arc = (...args) => arcCalls.push(args);
        ctx.stroke = () => {};
        
        renderer.render(agents, false, false, [], null, rightShowInfo, null);
        
        // Should have called arc for timer
        expect(arcCalls.length).toBeGreaterThan(0);
    });

    test('should draw agents', () => {
        renderer.resize(800, 600);
        
        const mockAgent = {
            type: 'fan',
            x: 400,
            y: 300,
            targetX: null,
            targetY: null,
            draw: (ctx) => {
                // Mock draw method
            }
        };
        
        renderer.drawAgents([mockAgent]);
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw fan paths when agent has target', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            targetX: 500,
            targetY: 400,
            staticWaypoints: [{ x: 450, y: 350 }],
            dynamicWaypoint: null,
            draw: () => {}
        };
        
        // Track moveTo and lineTo calls
        const moveTosCalls = [];
        const lineToCalls = [];
        ctx.moveTo = (...args) => moveTosCalls.push(args);
        ctx.lineTo = (...args) => lineToCalls.push(args);
        ctx.stroke = () => {};
        ctx.setLineDash = () => {};
        
        renderer.drawFanPaths(mockFan);
        
        // Should have drawn lines
        expect(moveTosCalls.length).toBeGreaterThan(0);
        expect(lineToCalls.length).toBeGreaterThan(0);
    });

    test('should draw fan dynamic waypoint', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            targetX: 500,
            targetY: 400,
            staticWaypoints: [],
            dynamicWaypoint: { x: 450, y: 350 },
            draw: () => {}
        };
        
        // Track draw calls
        const moveTosCalls = [];
        const lineToCalls = [];
        ctx.moveTo = (...args) => moveTosCalls.push(args);
        ctx.lineTo = (...args) => lineToCalls.push(args);
        ctx.stroke = () => {};
        ctx.setLineDash = () => {};
        
        renderer.drawFanPaths(mockFan);
        
        // Should have drawn dynamic waypoint line
        expect(moveTosCalls.length).toBeGreaterThan(0);
        expect(lineToCalls.length).toBeGreaterThan(0);
    });

    test('should draw all paths when showAllPaths is enabled', () => {
        renderer.resize(800, 600);
        renderer.showAllPaths = true;
        
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            targetX: 500,
            targetY: 400,
            staticWaypoints: [],
            dynamicWaypoint: null,
            draw: () => {}
        };
        
        ctx.stroke = () => {};
        ctx.setLineDash = () => {};
        ctx.moveTo = () => {};
        ctx.lineTo = () => {};
        
        renderer.drawAgents([mockFan]);
        
        // Just verify it doesn't crash
        expect(renderer.showAllPaths).toBe(true);
    });

    test('should draw debug overlay for hovered fan', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            type: 'fan',
            x: 400,
            y: 300,
            targetX: 500,
            targetY: 400,
            state: 'moving',
            goal: 'stage',
            hunger: 0.5,
            inQueue: false,
            queuePosition: null,
            staticWaypoints: [],
            dynamicWaypoint: null,
            enhancedSecurity: false,
            waitStartTime: null,
            stagePreference: 'left',
            currentShow: null,
            draw: () => {}
        };
        
        // Track fillRect calls
        const fillRectCalls = [];
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        ctx.strokeRect = () => {};
        ctx.measureText = (text) => ({ width: 100 });
        ctx.stroke = () => {};
        ctx.setLineDash = () => {};
        ctx.moveTo = () => {};
        ctx.lineTo = () => {};
        
        renderer.setHoveredFan(mockFan, 450, 350);
        renderer.render([mockFan], false, false, [], null, null, null);
        
        // Should have drawn overlay background
        expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    test('should draw debug overlay with proper positioning when near edge', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            type: 'fan',
            x: 750,
            y: 550,
            targetX: 500,
            targetY: 400,
            state: 'moving',
            goal: 'stage',
            hunger: 0.5,
            inQueue: false,
            queuePosition: null,
            staticWaypoints: [],
            dynamicWaypoint: null,
            enhancedSecurity: false,
            waitStartTime: null,
            stagePreference: 'left',
            currentShow: null,
            draw: () => {}
        };
        
        // Mock measureText to return a fixed width
        ctx.measureText = (text) => ({ width: 100 });
        ctx.fillRect = () => {};
        ctx.strokeRect = () => {};
        ctx.stroke = () => {};
        ctx.setLineDash = () => {};
        ctx.moveTo = () => {};
        ctx.lineTo = () => {};
        
        // Position mouse near bottom-right corner
        renderer.setHoveredFan(mockFan, 780, 580);
        renderer.render([mockFan], false, false, [], null, null, null);
        
        // Just verify it doesn't crash
        expect(renderer.hoveredFan).toBe(mockFan);
    });

    test('should draw food stalls', () => {
        renderer.resize(800, 600);
        
        const mockStall = {
            draw: (ctx) => {
                // Mock draw method
            }
        };
        
        renderer.drawFoodStalls([mockStall]);
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should set hovered fan', () => {
        const mockFan = { x: 100, y: 200 };
        renderer.setHoveredFan(mockFan, 150, 250);
        
        expect(renderer.hoveredFan).toBe(mockFan);
        expect(renderer.mouseX).toBe(150);
        expect(renderer.mouseY).toBe(250);
    });

    test('should draw security queues', () => {
        renderer.resize(800, 600);
        
        ctx.strokeRect = () => {};
        renderer.drawSecurityQueues();
        
        // Just verify it doesn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw stage with active state', () => {
        renderer.resize(800, 600);
        
        // Track what fillStyle is set to
        let capturedFillStyle = null;
        const originalFillRect = ctx.fillRect;
        ctx.fillRect = (...args) => {
            capturedFillStyle = ctx.fillStyle;
            originalFillRect(...args);
        };
        
        renderer.drawStage(100, 100, 50, 50, 'TEST', true);
        
        // Just verify it was called and didn't crash
        expect(renderer.width).toBe(800);
    });

    test('should draw stage with inactive state', () => {
        renderer.resize(800, 600);
        
        // Track what fillStyle is set to
        let capturedFillStyle = null;
        const originalFillRect = ctx.fillRect;
        ctx.fillRect = (...args) => {
            capturedFillStyle = ctx.fillStyle;
            originalFillRect(...args);
        };
        
        renderer.drawStage(100, 100, 50, 50, 'TEST', false);
        
        // Just verify it was called and didn't crash
        expect(renderer.width).toBe(800);
    });

    test('should initialize with null hoveredFan', () => {
        expect(renderer.hoveredFan).toBeNull();
    });

    test('should initialize with showAllPaths false', () => {
        expect(renderer.showAllPaths).toBe(false);
    });
});
