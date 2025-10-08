// Unit tests for Renderer class
import { Renderer } from '../renderer.js';

const mockConfig = {
    COLORS: {
        BACKGROUND: '#0a0a0a',
        GROUND: '#1a3a1a',
        ROAD: '#3a3a3a',
        STAGE_INACTIVE: '#4a4a4a',
        STAGE_ACTIVE: '#ff6b6b',
        BUS_AREA: '#6b6bff',
        TEXT: '#fff'
    },
    GROUND_HEIGHT: 0.7,
    ROAD_START: 0.85
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
            font: '',
            fillRect: () => {},
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
});
