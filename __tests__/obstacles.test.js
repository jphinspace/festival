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

    test('should not create security obstacles (fence removed)', () => {
        const securityObstacles = obstacles.obstacles.filter(obs => obs.type === 'security');
        expect(securityObstacles.length).toBe(0); // Security fence has been removed
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
        
        // Should include boundary types (security fence obstacles were removed)
        const hasBoundaryType = boundaries.some(b => b.type === 'boundary');
        expect(hasBoundaryType).toBe(true);
    });

    test('should validate positions not inside food stalls or stages', () => {
        // Add a food stall
        const mockFoodStalls = [
            { x: 400, y: 150, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls);
        
        // Position inside food stall should be invalid
        expect(obstacles.isValidPosition(410, 165)).toBe(false);
        
        // Position in open space should be valid
        expect(obstacles.isValidPosition(300, 300)).toBe(true);
        
        // Position inside stage should be invalid
        expect(obstacles.isValidPosition(40, 90)).toBe(false);
    });

    test('should allow fans being checked through security obstacles', () => {
        const collision = obstacles.checkCollision(360, 420, 5, 'being_checked');
        expect(collision).toBe(false);
    });

    test('should allow fans approaching queue through security obstacles', () => {
        const collision = obstacles.checkCollision(360, 420, 5, 'approaching_queue');
        expect(collision).toBe(false);
    });

    test('should allow fans who passed security through security obstacles', () => {
        const collision = obstacles.checkCollision(360, 420, 5, 'passed_security');
        expect(collision).toBe(false);
    });

    test('should allow fans through bus area', () => {
        // Bus area position
        const busX = width * 0.5;
        const busY = height * 0.9;
        const collision = obstacles.checkCollision(busX, busY, 5, 'idle');
        expect(collision).toBe(false);
    });

    test('should apply personal space buffer for food stalls when approaching queue', () => {
        const mockFoodStalls = [
            { x: 400, y: 150, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls);
        
        // Position just outside food stall with buffer should collide
        const collision = obstacles.checkCollision(390, 165, 5, 'approaching_queue', 15);
        expect(collision).toBe(true);
    });

    test('should apply personal space buffer for food stalls when moving', () => {
        const mockFoodStalls = [
            { x: 400, y: 150, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls);
        
        // Position just outside food stall with buffer should collide
        const collision = obstacles.checkCollision(390, 165, 5, 'moving', 15);
        expect(collision).toBe(true);
    });

    test('should resolve collision for agent in security queue', () => {
        const mockAgent = {
            x: 360,
            y: 420,
            radius: 5,
            state: 'in_queue'
        };

        const initialX = mockAgent.x;
        const initialY = mockAgent.y;

        obstacles.resolveCollision(mockAgent);

        // Agent should not be pushed away since they're in security queue
        expect(mockAgent.x).toBe(initialX);
        expect(mockAgent.y).toBe(initialY);
    });

    test('should resolve collision for agent being checked', () => {
        const mockAgent = {
            x: 360,
            y: 420,
            radius: 5,
            state: 'being_checked'
        };

        const initialX = mockAgent.x;

        obstacles.resolveCollision(mockAgent);

        // Agent should not be pushed away since they're being checked
        expect(mockAgent.x).toBe(initialX);
    });

    test('should resolve collision for agent approaching queue', () => {
        const mockAgent = {
            x: 360,
            y: 420,
            radius: 5,
            state: 'approaching_queue'
        };

        const initialX = mockAgent.x;

        obstacles.resolveCollision(mockAgent);

        // Agent should not be pushed away since they're approaching queue
        expect(mockAgent.x).toBe(initialX);
    });

    test('should resolve collision for agent who passed security', () => {
        const mockAgent = {
            x: 360,
            y: 420,
            radius: 5,
            state: 'passed_security'
        };

        const initialX = mockAgent.x;

        obstacles.resolveCollision(mockAgent);

        // Agent should not be pushed away since they passed security
        expect(mockAgent.x).toBe(initialX);
    });

    test('should handle agent at exact closest point', () => {
        const mockAgent = {
            x: 40,
            y: 90,
            radius: 5,
            state: 'idle'
        };

        // Position agent exactly at obstacle edge
        mockAgent.x = 40;
        mockAgent.y = 90;

        obstacles.resolveCollision(mockAgent);

        // Agent should be pushed in default direction
        expect(mockAgent.x).toBeGreaterThan(40);
    });

    test('should handle agent at zero distance from obstacle', () => {
        const mockAgent = {
            x: 40,
            y: 90,
            radius: 10,
            state: 'idle'
        };

        obstacles.resolveCollision(mockAgent);

        // Agent should be pushed away
        expect(mockAgent.x).not.toBe(40);
    });

    test('should validate position with custom buffer', () => {
        const mockFoodStalls = [
            { x: 400, y: 150, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls);
        
        // Position just outside food stall (within default buffer) should be invalid
        expect(obstacles.isValidPosition(390, 165, 20)).toBe(false);
        
        // Position outside buffer should be valid
        expect(obstacles.isValidPosition(370, 165, 10)).toBe(true);
    });

    test('should ignore bus obstacles in isValidPosition', () => {
        // Bus area should not affect validity
        const busX = width * 0.5;
        const busY = height * 0.9;
        expect(obstacles.isValidPosition(busX, busY)).toBe(true);
    });

    test('should replace old food stalls when setting new ones', () => {
        const mockFoodStalls1 = [
            { x: 400, y: 150, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls1);
        
        expect(obstacles.obstacles.filter(obs => obs.type === 'foodStall').length).toBe(1);
        
        const mockFoodStalls2 = [
            { x: 400, y: 150, width: 20, height: 30 },
            { x: 400, y: 250, width: 20, height: 30 }
        ];
        obstacles.setFoodStalls(mockFoodStalls2);
        
        expect(obstacles.obstacles.filter(obs => obs.type === 'foodStall').length).toBe(2);
    });
});
