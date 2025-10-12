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
            textAlign: 'left',
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            moveTo: () => {},
            lineTo: () => {},
            setLineDash: () => {},
            measureText: (text) => ({ width: text.length * 7 })
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

    test('should draw show timer in prep mode', () => {
        renderer.resize(800, 600);
        let arcCalls = [];
        let strokeCalls = 0;
        let fillTextCalls = [];
        
        ctx.arc = (...args) => arcCalls.push(args);
        ctx.stroke = () => strokeCalls++;
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        renderer.drawShowTimer(100, 100, true, 0.5);
        
        // Should have drawn background circle and progress arc
        expect(arcCalls.length).toBe(2);
        expect(strokeCalls).toBe(2);
        expect(fillTextCalls[0]).toBe('PREP');
        expect(ctx.textAlign).toBe('left'); // Should be reset
    });

    test('should draw show timer in active mode', () => {
        renderer.resize(800, 600);
        let fillTextCalls = [];
        
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        renderer.drawShowTimer(100, 100, false, 0.75);
        
        // Should show percentage
        expect(fillTextCalls[0]).toBe('75%');
    });

    test('should draw single stage with label', () => {
        renderer.resize(800, 600);
        let fillRectCalls = [];
        let fillTextCalls = [];
        
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        ctx.fillText = (label) => fillTextCalls.push(label);
        
        renderer.drawStage(10, 20, 100, 50, 'TEST', true);
        
        expect(fillRectCalls.length).toBe(1);
        expect(fillTextCalls[0]).toBe('TEST');
        expect(ctx.fillStyle).toBe(mockConfig.COLORS.TEXT);
    });

    test('should draw stage as inactive', () => {
        renderer.resize(800, 600);
        
        renderer.drawStage(10, 20, 100, 50, 'TEST', false);
        
        // fillStyle is set to inactive color, then text color
        // Just verify it completes without error
        expect(renderer.width).toBe(800);
    });

    test('should draw security queues with borders', () => {
        renderer.resize(800, 600);
        let fillRectCalls = [];
        let strokeRectCalls = [];
        let fillTextCalls = [];
        
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        ctx.strokeRect = (...args) => strokeRectCalls.push(args);
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        renderer.drawSecurityQueues();
        
        // Should draw 2 queue areas
        expect(fillRectCalls.length).toBe(2);
        // Should draw 2 borders
        expect(strokeRectCalls.length).toBe(2);
        // Should draw label
        expect(fillTextCalls[0]).toBe('SECURITY');
    });

    test('should draw agents by calling their draw methods', () => {
        renderer.resize(800, 600);
        let drawCalls = 0;
        
        const mockAgents = [
            { draw: (ctx) => drawCalls++, targetX: null, targetY: null },
            { draw: (ctx) => drawCalls++, targetX: null, targetY: null },
            { draw: (ctx) => drawCalls++, targetX: null, targetY: null }
        ];
        
        renderer.drawAgents(mockAgents);
        
        expect(drawCalls).toBe(3);
    });

    test('should draw all paths when showAllPaths is enabled', () => {
        renderer.resize(800, 600);
        let drawPathsCalls = 0;
        
        renderer.showAllPaths = true;
        
        const mockAgents = [
            { 
                draw: () => {},
                targetX: 100,
                targetY: 100,
                x: 50,
                y: 50,
                staticWaypoints: [],
                dynamicWaypoint: null
            },
            { 
                draw: () => {},
                targetX: 200,
                targetY: 200,
                x: 150,
                y: 150,
                staticWaypoints: [],
                dynamicWaypoint: null
            }
        ];
        
        // Mock drawing functions to count calls
        let lineDrawCalls = 0;
        ctx.stroke = () => lineDrawCalls++;
        
        renderer.drawAgents(mockAgents);
        
        // Should draw paths for both agents
        expect(lineDrawCalls).toBeGreaterThan(0);
    });

    test('should not draw paths when showAllPaths is disabled', () => {
        renderer.resize(800, 600);
        
        renderer.showAllPaths = false;
        
        const mockAgents = [
            { 
                draw: () => {},
                targetX: 100,
                targetY: 100
            }
        ];
        
        // Just verify it completes without error
        renderer.drawAgents(mockAgents);
        expect(renderer.showAllPaths).toBe(false);
    });

    test('should draw fan paths with static waypoints', () => {
        renderer.resize(800, 600);
        let arcCalls = [];
        let strokeCalls = 0;
        
        ctx.arc = (...args) => arcCalls.push(args);
        ctx.stroke = () => strokeCalls++;
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 300,
            targetY: 300,
            staticWaypoints: [
                { x: 150, y: 150 },
                { x: 200, y: 200 },
                { x: 250, y: 250 }
            ],
            dynamicWaypoint: null
        };
        
        renderer.drawFanPaths(mockFan);
        
        // Should draw circles at waypoints and destination
        expect(arcCalls.length).toBeGreaterThan(0);
        expect(strokeCalls).toBeGreaterThan(0);
    });

    test('should draw fan paths with dynamic waypoint', () => {
        renderer.resize(800, 600);
        let arcCalls = [];
        
        ctx.arc = (...args) => arcCalls.push(args);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 300,
            targetY: 300,
            staticWaypoints: [],
            dynamicWaypoint: { x: 200, y: 200 }
        };
        
        renderer.drawFanPaths(mockFan);
        
        // Should draw circle at dynamic waypoint
        expect(arcCalls.length).toBeGreaterThan(0);
    });

    test('should draw food stalls by calling their draw methods', () => {
        renderer.resize(800, 600);
        let drawCalls = 0;
        
        const mockStalls = [
            { draw: (ctx) => drawCalls++ },
            { draw: (ctx) => drawCalls++ }
        ];
        
        renderer.drawFoodStalls(mockStalls);
        
        expect(drawCalls).toBe(2);
    });

    test('should draw debug overlay with fan information', () => {
        renderer.resize(800, 600);
        let fillRectCalls = [];
        let strokeRectCalls = [];
        let fillTextCalls = [];
        
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        ctx.strokeRect = (...args) => strokeRectCalls.push(args);
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 200,
            targetY: 200,
            state: 'moving',
            goal: 'exploring',
            hunger: 0.5,
            inQueue: false,
            queuePosition: null,
            staticWaypoints: [{ x: 150, y: 150 }],
            dynamicWaypoint: null,
            enhancedSecurity: false,
            waitStartTime: null,
            stagePreference: 'left',
            currentShow: 'Rock Band'
        };
        
        renderer.drawDebugOverlay(mockFan, 300, 300);
        
        // Should draw background and border
        expect(fillRectCalls.length).toBeGreaterThan(0);
        expect(strokeRectCalls.length).toBeGreaterThan(0);
        // Should draw text lines
        expect(fillTextCalls.length).toBeGreaterThan(0);
    });

    test('should position debug overlay to stay on screen', () => {
        renderer.resize(800, 600);
        let fillRectCalls = [];
        
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 200,
            targetY: 200,
            state: 'moving',
            goal: 'exploring',
            hunger: 0.5,
            inQueue: false,
            queuePosition: null,
            staticWaypoints: [],
            dynamicWaypoint: null,
            enhancedSecurity: false,
            waitStartTime: null,
            stagePreference: 'none',
            currentShow: null
        };
        
        // Try to position near right edge
        renderer.drawDebugOverlay(mockFan, 750, 550);
        
        // Should draw the overlay (position adjusted to stay on screen)
        expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    test('should set and retrieve hovered fan', () => {
        const mockFan = { x: 100, y: 100 };
        
        renderer.setHoveredFan(mockFan, 150, 150);
        
        expect(renderer.hoveredFan).toBe(mockFan);
        expect(renderer.mouseX).toBe(150);
        expect(renderer.mouseY).toBe(150);
    });

    test('should render scene with show info timers', () => {
        renderer.resize(800, 600);
        let arcCalls = [];
        
        ctx.arc = (...args) => arcCalls.push(args);
        
        const leftShowInfo = { progress: 0.5, isPrep: true };
        const rightShowInfo = { progress: 0.75, isPrep: false };
        
        renderer.render([], true, true, [], leftShowInfo, rightShowInfo);
        
        // Should draw timers
        expect(arcCalls.length).toBeGreaterThan(0);
    });

    test('should not draw show timers when progress is 0', () => {
        renderer.resize(800, 600);
        let arcCalls = [];
        
        ctx.arc = (...args) => arcCalls.push(args);
        
        const leftShowInfo = { progress: 0, isPrep: false };
        const rightShowInfo = { progress: 0, isPrep: false };
        
        renderer.render([], false, false, [], leftShowInfo, rightShowInfo);
        
        // Should not draw timers (only for security queues, no show timers)
        // Arc calls should be minimal
        expect(arcCalls.length).toBe(0);
    });

    test('should render complete scene with hovered fan', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 200,
            targetY: 200,
            state: 'moving',
            goal: 'exploring',
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
        
        renderer.setHoveredFan(mockFan, 300, 300);
        
        let fillRectCalls = [];
        ctx.fillRect = (...args) => fillRectCalls.push(args);
        
        renderer.render([mockFan], false, false);
        
        // Should render the debug overlay
        expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    test('should handle null show info gracefully', () => {
        renderer.resize(800, 600);
        
        // Should not throw
        expect(() => {
            renderer.render([], false, false, [], null, null);
        }).not.toThrow();
    });

    test('should handle empty agents array', () => {
        renderer.resize(800, 600);
        
        expect(() => {
            renderer.drawAgents([]);
        }).not.toThrow();
    });

    test('should handle empty food stalls array', () => {
        renderer.resize(800, 600);
        
        expect(() => {
            renderer.drawFoodStalls([]);
        }).not.toThrow();
    });

    test('should handle fan with no waypoints', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 200,
            targetY: 200,
            staticWaypoints: null,
            dynamicWaypoint: null
        };
        
        expect(() => {
            renderer.drawFanPaths(mockFan);
        }).not.toThrow();
    });

    test('should reset text alignment after drawing show timer', () => {
        renderer.resize(800, 600);
        
        renderer.drawShowTimer(100, 100, true, 0.5);
        
        expect(ctx.textAlign).toBe('left');
    });

    test('should skip drawing paths for agents without targets in showAllPaths mode', () => {
        renderer.resize(800, 600);
        renderer.showAllPaths = true;
        
        let drawPathCalls = 0;
        const originalDrawFanPaths = renderer.drawFanPaths.bind(renderer);
        renderer.drawFanPaths = (fan) => {
            drawPathCalls++;
            return originalDrawFanPaths(fan);
        };
        
        const mockAgents = [
            { 
                draw: () => {},
                targetX: null,  // No target
                targetY: null
            },
            { 
                draw: () => {},
                targetX: 100,
                targetY: 100,
                x: 50,
                y: 50,
                staticWaypoints: [],
                dynamicWaypoint: null
            }
        ];
        
        renderer.drawAgents(mockAgents);
        
        // Only one agent has a target, so drawFanPaths should be called once
        expect(drawPathCalls).toBe(1);
    });

    test('should draw debug overlay with fan having no target', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: null,
            targetY: null,
            state: 'idle',
            goal: null,
            hunger: 0.25,
            inQueue: true,
            queuePosition: 0,
            staticWaypoints: null,
            dynamicWaypoint: { x: 150, y: 150 },
            enhancedSecurity: true,
            waitStartTime: 12345,
            stagePreference: 'right',
            currentShow: null
        };
        
        let fillTextCalls = [];
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        renderer.drawDebugOverlay(mockFan, 300, 300);
        
        // Should still draw overlay with appropriate values
        expect(fillTextCalls.length).toBeGreaterThan(0);
    });

    test('should use undefined queuePosition in debug overlay', () => {
        renderer.resize(800, 600);
        
        const mockFan = {
            x: 100,
            y: 100,
            targetX: 200,
            targetY: 200,
            state: 'moving',
            goal: 'exploring',
            hunger: 0.5,
            inQueue: false,
            queuePosition: undefined,  // undefined
            staticWaypoints: [],
            dynamicWaypoint: null,
            enhancedSecurity: false,
            waitStartTime: null,
            stagePreference: 'none',
            currentShow: 'Test Show'
        };
        
        let fillTextCalls = [];
        ctx.fillText = (text) => fillTextCalls.push(text);
        
        renderer.drawDebugOverlay(mockFan, 300, 300);
        
        // Should handle undefined queuePosition
        expect(fillTextCalls.length).toBeGreaterThan(0);
    });
});
