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

    describe('checkCollision with all agent states', () => {
        test('should use default agentState when not provided', () => {
            // Call with only x, y, radius (uses default agentState='idle')
            const result = obstacles.checkCollision(400, 300, 5);
            expect(result).toBe(false); // Open space, no collision
        });

        test('should use default personalSpaceBuffer when not provided', () => {
            const foodStalls = [{
                x: 200,
                y: 200,
                width: 30,
                height: 30
            }];
            obstacles.setFoodStalls(foodStalls);
            
            // Call without personalSpaceBuffer parameter (uses default 0)
            const result = obstacles.checkCollision(195, 215, 3, 'approaching_queue');
            expect(result).toBe(false); // Should not collide without buffer
        });

        test('should allow being_checked state through security obstacles', () => {
            obstacles.obstacles.push({
                type: 'security',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            });
            
            const result = obstacles.checkCollision(125, 125, 3, 'being_checked');
            expect(result).toBe(false);
        });

        test('should allow approaching_queue state through security obstacles', () => {
            obstacles.obstacles.push({
                type: 'security',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            });
            
            const result = obstacles.checkCollision(125, 125, 3, 'approaching_queue');
            expect(result).toBe(false);
        });

        test('should allow passed_security state through security obstacles', () => {
            obstacles.obstacles.push({
                type: 'security',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            });
            
            const result = obstacles.checkCollision(125, 125, 3, 'passed_security');
            expect(result).toBe(false);
        });

        test('should skip bus collision for any state', () => {
            const result = obstacles.checkCollision(400, 528, 3, 'idle');
            expect(result).toBe(false); // Bus area should not collide
        });

        test('should apply personal space buffer for food stalls in approaching_queue state', () => {
            const foodStalls = [{
                x: 200,
                y: 200,
                width: 30,
                height: 30
            }];
            obstacles.setFoodStalls(foodStalls);
            
            // Position just outside food stall but within buffer
            const result = obstacles.checkCollision(195, 215, 3, 'approaching_queue', 10);
            expect(result).toBe(true); // Should collide due to buffer
        });

        test('should apply personal space buffer for food stalls in moving state', () => {
            const foodStalls = [{
                x: 200,
                y: 200,
                width: 30,
                height: 30
            }];
            obstacles.setFoodStalls(foodStalls);
            
            const result = obstacles.checkCollision(195, 215, 3, 'moving', 10);
            expect(result).toBe(true); // Should collide due to buffer
        });

        test('should not apply personal space buffer for food stalls in other states', () => {
            const foodStalls = [{
                x: 200,
                y: 200,
                width: 30,
                height: 30
            }];
            obstacles.setFoodStalls(foodStalls);
            
            // Position just outside food stall - no buffer applied
            const result = obstacles.checkCollision(195, 215, 3, 'idle', 10);
            expect(result).toBe(false); // Should not collide without buffer
        });
    });

    describe('resolveCollision with different agent states', () => {
        test('should allow security states to pass through security obstacles', () => {
            obstacles.obstacles.push({
                type: 'security',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            });
            
            // Test all security-allowed states
            const securityStates = ['being_checked', 'approaching_queue', 'passed_security', 'in_queue'];
            
            securityStates.forEach(state => {
                const agent = {
                    x: 125,
                    y: 125,
                    radius: 3,
                    state: state
                };
                
                const originalX = agent.x;
                obstacles.resolveCollision(agent);
                expect(agent.x).toBe(originalX); // Should not be pushed
            });
        });

        test('should skip bus collision during resolveCollision', () => {
            const agent = {
                x: 400,
                y: 528,
                radius: 3,
                state: 'idle'
            };
            
            const originalX = agent.x;
            obstacles.resolveCollision(agent);
            expect(agent.x).toBe(originalX); // Should not be pushed
        });

        test('should handle agent exactly at closest point (distance = 0)', () => {
            // Create a custom obstacle where agent is exactly at closest point
            obstacles.obstacles = [{
                type: 'stage',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            }];
            
            const agent = {
                x: 125, // Exactly inside the obstacle
                y: 125,
                radius: 30, // Large radius to ensure collision
                state: 'idle'
            };
            
            const originalX = agent.x;
            obstacles.resolveCollision(agent);
            expect(agent.x).not.toBe(originalX); // Should be pushed
        });

        test('should push agent in default direction when distance is exactly 0', () => {
            // Create obstacle and position agent such that:
            // closestX = agent.x and closestY = agent.y (distanceX = distanceY = 0)
            // This happens when agent is exactly on the rectangle
            obstacles.obstacles = [{
                type: 'stage',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            }];
            
            const agent = {
                x: 100, // Exactly at left edge of obstacle
                y: 125, // In the middle vertically
                radius: 10,
                state: 'idle'
            };
            
            obstacles.resolveCollision(agent);
            // Agent should be pushed by its radius in X direction (default)
            expect(agent.x).toBe(110); // 100 + 10
        });

        test('should handle distance > 0 branch in resolveCollision', () => {
            obstacles.obstacles = [{
                type: 'stage',
                x: 100,
                y: 100,
                width: 50,
                height: 50
            }];
            
            const agent = {
                x: 98, // Close but not exactly at edge
                y: 125,
                radius: 10,
                state: 'idle'
            };
            
            const originalX = agent.x;
            obstacles.resolveCollision(agent);
            // Agent should be pushed away (distance > 0 branch)
            expect(agent.x).not.toBe(originalX);
            expect(agent.x).toBeLessThan(originalX); // Pushed to the left
        });
    });

    describe('isValidPosition with all obstacle types', () => {
        test('should return false for position inside boundary', () => {
            const result = obstacles.isValidPosition(20, 180, 0);
            expect(result).toBe(false); // Inside left boundary
        });

        test('should return true for position inside security obstacle', () => {
            obstacles.obstacles.push({
                type: 'security',
                x: 300,
                y: 300,
                width: 50,
                height: 50
            });
            
            const result = obstacles.isValidPosition(325, 325, 0);
            expect(result).toBe(true); // Security obstacles are not checked
        });

        test('should return true for position inside bus area', () => {
            const result = obstacles.isValidPosition(400, 528, 0);
            expect(result).toBe(true); // Bus area is not checked
        });

        test('should return false for position within buffer of food stall', () => {
            const foodStalls = [{
                x: 200,
                y: 200,
                width: 30,
                height: 30
            }];
            obstacles.setFoodStalls(foodStalls);
            
            const result = obstacles.isValidPosition(195, 200, 10);
            expect(result).toBe(false); // Within buffer
        });
    });
});
