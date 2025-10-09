// Renderer class for drawing the simulation
export class Renderer {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.width = 0;
        this.height = 0;
        this.hoveredFan = null; // Track which fan is being hovered
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
    
    drawShowTimer(x, y, isPrep, progress) {
        // Draw a circular progress indicator
        const centerX = x;
        const centerY = y;
        const radius = 15;
        
        // Background circle
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Progress arc - different color for prep vs show
        this.ctx.strokeStyle = isPrep ? '#ffaa00' : '#ff6b6b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2));
        this.ctx.stroke();
        
        // Progress text
        this.ctx.fillStyle = this.config.COLORS.TEXT;
        this.ctx.font = '8px Arial';
        this.ctx.textAlign = 'center';
        const label = isPrep ? 'PREP' : Math.floor(progress * 100) + '%';
        this.ctx.fillText(label, centerX, centerY + 3);
        this.ctx.textAlign = 'left'; // Reset
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
        
        // Draw borders around security queues
        this.ctx.strokeStyle = this.config.COLORS.SECURITY_BORDER;
        this.ctx.lineWidth = 2;
        
        // Left queue border
        this.ctx.strokeRect(
            this.width * this.config.QUEUE_LEFT_X - queueWidth / 2,
            queueY,
            queueWidth,
            queueHeight
        );
        
        // Right queue border
        this.ctx.strokeRect(
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

    drawDebugOverlay(fan, mouseX, mouseY) {
        // Draw debug information for a hovered fan
        const padding = 10;
        const lineHeight = 14;
        const lines = [
            `State: ${fan.state}`,
            `Hunger: ${(fan.hunger * 100).toFixed(1)}%`,
            `Target: (${fan.targetX ? fan.targetX.toFixed(0) : 'none'}, ${fan.targetY ? fan.targetY.toFixed(0) : 'none'})`,
            `Position: (${fan.x.toFixed(0)}, ${fan.y.toFixed(0)})`,
            `In Queue: ${fan.inQueue ? 'Yes' : 'No'}`,
            `Queue Position: ${fan.queuePosition !== null ? fan.queuePosition : 'N/A'}`,
            `Enhanced Security: ${fan.enhancedSecurity ? 'Yes' : 'No'}`,
            `Wait Start: ${fan.waitStartTime ? 'Yes' : 'No'}`,
            `Stage Pref: ${fan.stagePreference}`,
            `Current Show: ${fan.currentShow || 'None'}`
        ];
        
        // Calculate overlay dimensions
        const maxWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const overlayWidth = maxWidth + padding * 2;
        const overlayHeight = lines.length * lineHeight + padding * 2;
        
        // Position overlay near mouse, but keep it on screen
        let overlayX = mouseX + 15;
        let overlayY = mouseY + 15;
        
        if (overlayX + overlayWidth > this.width) {
            overlayX = mouseX - overlayWidth - 15;
        }
        if (overlayY + overlayHeight > this.height) {
            overlayY = mouseY - overlayHeight - 15;
        }
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
        
        // Draw border
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
        
        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '11px monospace';
        lines.forEach((line, index) => {
            this.ctx.fillText(line, overlayX + padding, overlayY + padding + (index + 1) * lineHeight);
        });
        
        // Draw line from fan to overlay
        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(fan.x, fan.y);
        this.ctx.lineTo(overlayX, overlayY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    render(agents, leftConcertActive, rightConcertActive, foodStalls = [], leftShowInfo = null, rightShowInfo = null) {
        this.drawBackground();
        this.drawStages(leftConcertActive, rightConcertActive);
        
        // Draw show timers if concerts are active or in prep
        if (leftShowInfo && leftShowInfo.progress > 0) {
            this.drawShowTimer(this.width * 0.10, this.height * 0.12, leftShowInfo.isPrep, leftShowInfo.progress);
        }
        if (rightShowInfo && rightShowInfo.progress > 0) {
            this.drawShowTimer(this.width * 0.90, this.height * 0.12, rightShowInfo.isPrep, rightShowInfo.progress);
        }
        
        this.drawSecurityQueues();
        this.drawFoodStalls(foodStalls);
        this.drawBusArea();
        this.drawAgents(agents);
        
        // Draw debug overlay if a fan is hovered
        if (this.hoveredFan && this.mouseX !== undefined && this.mouseY !== undefined) {
            this.drawDebugOverlay(this.hoveredFan, this.mouseX, this.mouseY);
        }
    }
    
    setHoveredFan(fan, mouseX, mouseY) {
        this.hoveredFan = fan;
        this.mouseX = mouseX;
        this.mouseY = mouseY;
    }
}
