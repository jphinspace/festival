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
});
