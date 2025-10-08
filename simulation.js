// Simulation class managing the entire simulation state and loop
import { Fan } from './fan.js';
import { Renderer } from './renderer.js';
import { EventManager } from './eventManager.js';

export class Simulation {
    constructor(canvas, config) {
        this.config = config;
        this.canvas = canvas;
        this.renderer = new Renderer(canvas, config);
        this.agents = [];
        this.paused = false;
        this.simulationSpeed = config.DEFAULT_SIMULATION_SPEED;
        
        // Frame timing
        this.lastFrameTime = 0;
        this.lastRenderTime = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.currentFPS = 0;
        this.targetFrameTime = 1000 / config.MAX_FPS;
        
        // Event manager
        this.eventManager = null;
        
        // Callbacks
        this.onStatsUpdate = null;
    }

    initialize() {
        this.resize();
        this.eventManager = new EventManager(this.config, this.renderer.width, this.renderer.height);
        
        // Create initial fans
        for (let i = 0; i < this.config.INITIAL_ATTENDEE_COUNT; i++) {
            const x = Math.random() * this.renderer.width;
            const y = Math.random() * this.renderer.height;
            this.agents.push(new Fan(x, y, this.config));
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.renderer.resize(width, height);
        if (this.eventManager) {
            this.eventManager.updateDimensions(width, height);
        }
    }

    togglePause() {
        this.paused = !this.paused;
        return this.paused;
    }

    setSimulationSpeed(speed) {
        this.simulationSpeed = Math.max(
            this.config.MIN_SIMULATION_SPEED,
            Math.min(this.config.MAX_SIMULATION_SPEED, speed)
        );
    }

    // Event handlers
    triggerLeftConcert() {
        this.eventManager.handleLeftConcert(this.agents);
    }

    triggerRightConcert() {
        this.eventManager.handleRightConcert(this.agents);
    }

    triggerBusArrival() {
        const newAgents = this.eventManager.handleBusArrival(this.agents);
        this.agents.push(...newAgents);
    }

    triggerBusDeparture() {
        this.eventManager.handleBusDeparture(this.agents);
    }

    // Update simulation state
    update(deltaTime) {
        if (!this.paused) {
            // Update event manager (process security queue and food stalls)
            this.eventManager.update(performance.now(), this.agents);
            
            // Pass all agents to each agent's update for collision detection
            this.agents.forEach(agent => agent.update(deltaTime, this.simulationSpeed, this.agents));
        }
    }

    // Render the current state
    render() {
        this.renderer.render(
            this.agents,
            this.eventManager.leftConcertActive,
            this.eventManager.rightConcertActive,
            this.eventManager.foodStalls
        );
    }

    // Main animation loop
    animate(currentTime) {
        // Calculate delta time in seconds
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            this.lastRenderTime = currentTime;
            this.fpsUpdateTime = currentTime;
        }
        
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        // Cap frame rate to MAX_FPS
        const timeSinceLastRender = currentTime - this.lastRenderTime;
        if (timeSinceLastRender < this.targetFrameTime) {
            requestAnimationFrame(this.animate.bind(this));
            return;
        }
        
        this.lastRenderTime = currentTime;
        
        // Update and render
        this.update(deltaTime);
        this.render();
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
            
            if (this.onStatsUpdate) {
                this.onStatsUpdate({
                    attendeeCount: this.agents.length,
                    fps: this.currentFPS
                });
            }
        }
        
        requestAnimationFrame(this.animate.bind(this));
    }

    start() {
        this.animate(0);
    }
}
