// Unit tests for Obstacles class
import { Obstacles } from '../src/components/obstacles.js';

const mockConfig = {
    QUEUE_LEFT_X: 0.45,
    QUEUE_RIGHT_X: 0.55,
    STAGE_LEFT_X: 0.10,
    STAGE_RIGHT_X: 0.90,
    STAGE_Y: 0.30,
    STAGE_WIDTH: 0.1,
    STAGE_HEIGHT: 0.3,
    BUS_X: 0.5,
    BUS_Y: 0.9
};

describe('Obstacles', () => {
    let obstacles;
    const width = 800;
    const height = 600;

    beforeEach(() => {
        obstacles = new Obstacles(mockConfig, width, height);
    });

    test('should initialize with correct dimensions', () => {
        expect(obstacles.width).toBe(width);
        expect(obstacles.height).toBe(height);
        expect(obstacles.obstacles).toBeDefined();
        expect(obstacles.obstacles.length).toBeGreaterThan(0);
    });

    test('should create stage obstacles', () => {
        const stageObstacles = obstacles.obstacles.filter(obs => obs.type === 'stage');
        expect(stageObstacles.length).toBe(2); // Left and right stages
    });

    test('should create bus obstacle', () => {
        const busObstacles = obstacles.obstacles.filter(obs => obs.type === 'bus');
        expect(busObstacles.length).toBe(1);
    });

    test('should create security obstacles', () => {
        const securityObstacles = obstacles.obstacles.filter(obs => obs.type === 'security');
        expect(securityObstacles.length).toBe(2); // Left and right security lines
    });

    test('should create boundary obstacles', () => {
        const boundaryObstacles = obstacles.obstacles.filter(obs => obs.type === 'boundary');
        expect(boundaryObstacles.length).toBe(2); // Behind both stages
    });

    test('should detect collision with obstacle', () => {
        // Test collision with left stage (at x=40, y=90, size 80x180)
        const collision = obstacles.checkCollision(40, 90, 5, 'idle');
        expect(collision).toBe(true);
    });

    test('should not detect collision when far from obstacles', () => {
        // Test position in open space
        const collision = obstacles.checkCollision(400, 300, 5, 'idle');
        expect(collision).toBe(false);
    });

    test('should allow fans in security queue through security obstacles', () => {
        // Position in security area but with in_queue state
        const collision = obstacles.checkCollision(360, 420, 5, 'in_queue');
        expect(collision).toBe(false);
    });

    test('should update dimensions correctly', () => {
        obstacles.updateDimensions(1000, 800);
        expect(obstacles.width).toBe(1000);
        expect(obstacles.height).toBe(800);
        // Obstacles should be recalculated
        expect(obstacles.obstacles.length).toBeGreaterThan(0);
    });

    test('should add food stalls as obstacles', () => {
        const mockFoodStalls = [
            { x: 400, y: 150, width: 20, height: 30 },
            { x: 400, y: 250, width: 20, height: 30 }
        ];

        obstacles.setFoodStalls(mockFoodStalls);
        
        const foodStallObstacles = obstacles.obstacles.filter(obs => obs.type === 'foodStall');
        expect(foodStallObstacles.length).toBe(2);
    });

    test('should resolve collision by pushing agent away', () => {
        const mockAgent = {
            x: 40,
            y: 90,
            radius: 5,
            state: 'idle'
        };

        const initialX = mockAgent.x;
        const initialY = mockAgent.y;

        obstacles.resolveCollision(mockAgent);

        // Agent should be pushed away from obstacle
        const moved = mockAgent.x !== initialX || mockAgent.y !== initialY;
        expect(moved).toBe(true);
    });

    test('should get security boundaries for drawing', () => {
        const boundaries = obstacles.getSecurityBoundaries();
        expect(boundaries.length).toBeGreaterThan(0);
        
        // Should include security and boundary types
        const hasSecurityType = boundaries.some(b => b.type === 'security');
        const hasBoundaryType = boundaries.some(b => b.type === 'boundary');
        
        expect(hasSecurityType).toBe(true);
        expect(hasBoundaryType).toBe(true);
    });
});
