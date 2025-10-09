/**
 * Obstacles class - manages collision detection with static festival objects
 * Includes stages, food stalls, bus area, and security lines
 */
export class Obstacles {
    constructor(config, width, height) {
        this.config = config;
        this.width = width;
        this.height = height;
        this.updateObstacles();
    }

    /**
     * Update obstacle boundaries when canvas resizes
     */
    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.updateObstacles();
    }

    /**
     * Calculate all obstacle boundaries
     */
    updateObstacles() {
        this.obstacles = [];

        // Left stage
        this.obstacles.push({
            type: 'stage',
            x: this.width * 0.05,
            y: this.height * 0.15,
            width: this.width * 0.1,
            height: this.height * 0.3
        });

        // Right stage
        this.obstacles.push({
            type: 'stage',
            x: this.width * 0.85,
            y: this.height * 0.15,
            width: this.width * 0.1,
            height: this.height * 0.3
        });

        // Bus area
        this.obstacles.push({
            type: 'bus',
            x: this.width * 0.4,
            y: this.height * 0.88,
            width: this.width * 0.2,
            height: this.height * 0.05
        });

        // Security queue areas (left and right)
        const queueWidth = this.width * 0.04;
        const queueHeight = this.height * 0.15;
        const queueY = this.height * 0.7;

        this.obstacles.push({
            type: 'security',
            x: this.width * this.config.QUEUE_LEFT_X - queueWidth / 2,
            y: queueY,
            width: queueWidth,
            height: queueHeight
        });

        this.obstacles.push({
            type: 'security',
            x: this.width * this.config.QUEUE_RIGHT_X - queueWidth / 2,
            y: queueY,
            width: queueWidth,
            height: queueHeight
        });

        // Security boundaries behind stages (prevent fans from going behind)
        // Left stage back boundary
        this.obstacles.push({
            type: 'boundary',
            x: 0,
            y: this.height * 0.15,
            width: this.width * 0.05,
            height: this.height * 0.3
        });

        // Right stage back boundary
        this.obstacles.push({
            type: 'boundary',
            x: this.width * 0.95,
            y: this.height * 0.15,
            width: this.width * 0.05,
            height: this.height * 0.3
        });
    }

    /**
     * Add food stall obstacles
     * @param {FoodStall[]} foodStalls - Array of food stalls
     */
    setFoodStalls(foodStalls) {
        // Remove old food stall obstacles
        this.obstacles = this.obstacles.filter(obs => obs.type !== 'foodStall');

        // Add new food stall obstacles
        foodStalls.forEach(stall => {
            this.obstacles.push({
                type: 'foodStall',
                x: stall.x,
                y: stall.y,
                width: stall.width,
                height: stall.height
            });
        });
    }

    /**
     * Check if a point collides with any obstacle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Agent radius
     * @param {string} agentState - Agent state (some states allow through security)
     * @returns {boolean} True if collision detected
     */
    checkCollision(x, y, radius, agentState = 'idle') {
        for (const obs of this.obstacles) {
            // Allow fans in security queue or approaching to pass through security obstacles
            if (obs.type === 'security' && (agentState === 'in_queue' || agentState === 'being_checked' || agentState === 'approaching_queue')) {
                continue;
            }

            // Skip bus collision - fans can pass through bus area
            if (obs.type === 'bus') {
                continue;
            }

            // Check if circle (agent) intersects with rectangle (obstacle)
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));

            const distanceX = x - closestX;
            const distanceY = y - closestY;
            const distanceSquared = distanceX * distanceX + distanceY * distanceY;

            if (distanceSquared < (radius * radius)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Push an agent away from obstacles if they're colliding
     * @param {Agent} agent - Agent to check and push
     */
    resolveCollision(agent) {
        for (const obs of this.obstacles) {
            // Allow fans in security queue or approaching to pass through security obstacles
            if (obs.type === 'security' && (agent.state === 'in_queue' || agent.state === 'being_checked' || agent.state === 'approaching_queue')) {
                continue;
            }

            // Skip bus collision - fans can pass through bus area
            if (obs.type === 'bus') {
                continue;
            }

            // Find closest point on rectangle to circle
            const closestX = Math.max(obs.x, Math.min(agent.x, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(agent.y, obs.y + obs.height));

            const distanceX = agent.x - closestX;
            const distanceY = agent.y - closestY;
            const distanceSquared = distanceX * distanceX + distanceY * distanceY;

            if (distanceSquared < (agent.radius * agent.radius)) {
                // Collision detected - push agent away
                const distance = Math.sqrt(distanceSquared);
                if (distance > 0) {
                    const pushDistance = agent.radius - distance;
                    agent.x += (distanceX / distance) * pushDistance;
                    agent.y += (distanceY / distance) * pushDistance;
                } else {
                    // Agent is exactly at closest point - push in a default direction
                    agent.x += agent.radius;
                }
            }
        }
    }

    /**
     * Get all security line boundaries for drawing
     * @returns {Array} Array of security boundary rectangles
     */
    getSecurityBoundaries() {
        return this.obstacles.filter(obs => obs.type === 'security' || obs.type === 'boundary');
    }
}
