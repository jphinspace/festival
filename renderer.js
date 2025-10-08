// Renderer class for drawing the simulation
export class Renderer {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.width = 0;
        this.height = 0;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    drawBackground() {
        // Background
        this.ctx.fillStyle = this.config.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Ground/grass area
        this.ctx.fillStyle = this.config.COLORS.GROUND;
        this.ctx.fillRect(0, 0, this.width, this.height * this.config.GROUND_HEIGHT);
        
        // Road/path at bottom
        this.ctx.fillStyle = this.config.COLORS.ROAD;
        this.ctx.fillRect(0, this.height * this.config.ROAD_START, this.width, this.height * 0.15);
    }

    drawStage(x, y, width, height, label, isActive) {
        this.ctx.fillStyle = isActive ? this.config.COLORS.STAGE_ACTIVE : this.config.COLORS.STAGE_INACTIVE;
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.fillStyle = this.config.COLORS.TEXT;
        this.ctx.font = '12px Arial';
        this.ctx.fillText(label, x + width * 0.15, y + height * 0.5);
    }

    drawStages(leftActive, rightActive) {
        // Left stage - rotated 90 degrees, now vertical with front facing right (towards center)
        this.drawStage(
            this.width * 0.05,
            this.height * 0.15,
            this.width * 0.1,  // Narrower width (was height)
            this.height * 0.3,  // Taller height (was width)
            'LEFT',
            leftActive
        );
        
        // Right stage - rotated 90 degrees, now vertical with front facing left (towards center)
        this.drawStage(
            this.width * 0.85,
            this.height * 0.15,
            this.width * 0.1,  // Narrower width (was height)
            this.height * 0.3,  // Taller height (was width)
            'RIGHT',
            rightActive
        );
    }

    drawBusArea() {
        this.ctx.fillStyle = this.config.COLORS.BUS_AREA;
        this.ctx.fillRect(
            this.width * 0.4,
            this.height * 0.88,
            this.width * 0.2,
            this.height * 0.05
        );
        
        this.ctx.fillStyle = this.config.COLORS.TEXT;
        this.ctx.font = '12px Arial';
        this.ctx.fillText('BUS', this.width * 0.48, this.height * 0.91);
    }

    drawSecurityQueues() {
        // Draw security queue areas (two lines)
        const queueWidth = this.width * 0.04;
        const queueHeight = this.height * 0.15;
        const queueY = this.height * 0.7;
        
        // Left queue
        this.ctx.fillStyle = this.config.COLORS.SECURITY_QUEUE;
        this.ctx.fillRect(
            this.width * this.config.QUEUE_LEFT_X - queueWidth / 2,
            queueY,
            queueWidth,
            queueHeight
        );
        
        // Right queue
        this.ctx.fillRect(
            this.width * this.config.QUEUE_RIGHT_X - queueWidth / 2,
            queueY,
            queueWidth,
            queueHeight
        );
        
        // Label
        this.ctx.fillStyle = this.config.COLORS.TEXT;
        this.ctx.font = '10px Arial';
        this.ctx.fillText('SECURITY', this.width * 0.47, this.height * 0.68);
    }

    drawAgents(agents) {
        agents.forEach(agent => agent.draw(this.ctx));
    }
    
    drawFoodStalls(foodStalls) {
        foodStalls.forEach(stall => stall.draw(this.ctx));
    }

    render(agents, leftConcertActive, rightConcertActive, foodStalls = []) {
        this.drawBackground();
        this.drawStages(leftConcertActive, rightConcertActive);
        this.drawSecurityQueues();
        this.drawFoodStalls(foodStalls);
        this.drawBusArea();
        this.drawAgents(agents);
    }
}
