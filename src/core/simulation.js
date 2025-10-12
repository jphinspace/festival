// Simulation class managing the entire simulation state and loop
import { Fan } from './fan.js';
import { Renderer } from '../components/renderer.js';
import { EventManager } from '../managers/eventManager.js';
import * as TimeUtils from '../utils/timeUtils.js';
import * as Geometry from '../utils/geometry.js';

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
        
        // Simulation time (scales with simulation speed)
        this.simulationTime = 0;
        
        // Event manager
        this.eventManager = null;
        
        // Callbacks
        this.onStatsUpdate = null;
        
        // Mouse tracking for debug overlay
        this.mouseX = 0;
        this.mouseY = 0;
    }

    initialize() {
        this.resize();
        this.eventManager = new EventManager(this.config, this.renderer.width, this.renderer.height);
        
        // Don't spawn initial fans randomly - they will come via bus/security
        // This prevents fans from spawning inside stages or other obstacles
        
        // Setup mouse event handlers for debug overlay
        this.setupMouseHandlers();
    }
    
    setupMouseHandlers() {
        // Track mouse movement on canvas
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        // Clear hover when mouse leaves canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.renderer.setHoveredFan(null, 0, 0);
        });
    }
    
    findFanUnderMouse(x, y) {
        // Find fan under mouse cursor (closest within radius)
        const threshold = 10; // Pixels around the fan
        for (let i = this.agents.length - 1; i >= 0; i--) {
            const agent = this.agents[i];
            if (agent.type === 'fan') {
                const distance = Geometry.calculateDistance(agent.x, agent.y, x, y);
                if (distance <= agent.radius + threshold) {
                    return agent;
                }
            }
        }
        return null;
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
        this.simulationSpeed = Geometry.clamp(
            speed,
            this.config.MIN_SIMULATION_SPEED,
            this.config.MAX_SIMULATION_SPEED
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

    triggerCarArrival() {
        const newAgents = this.eventManager.handleCarArrival(this.agents);
        this.agents.push(...newAgents);
    }

    triggerBusDeparture() {
        this.eventManager.handleBusDeparture(this.agents);
    }

    // Update simulation state
    update(deltaTime) {
        if (!this.paused) {
            // Update simulation time (in milliseconds, scaled by simulation speed)
            this.simulationTime += TimeUtils.calculateSimulationTimeIncrement(deltaTime, this.simulationSpeed);
            
            // Update event manager (process security queue and food stalls)
            this.eventManager.update(this.simulationTime, this.agents, this.simulationSpeed);
            
            // Pass all agents, obstacles, and simulation time to each agent's update for collision detection
            this.agents.forEach(agent => agent.update(deltaTime, this.simulationSpeed, this.agents, this.eventManager.obstacles, this.simulationTime));
        }
    }

    // Render the current state
    render() {
        const leftProgress = this.eventManager.getLeftShowProgress();
        const rightProgress = this.eventManager.getRightShowProgress();
        
        // Check if mouse is over any fan
        const hoveredFan = this.findFanUnderMouse(this.mouseX, this.mouseY);
        this.renderer.setHoveredFan(hoveredFan, this.mouseX, this.mouseY);
        
        this.renderer.render(
            this.agents,
            this.eventManager.leftConcertActive,
            this.eventManager.rightConcertActive,
            this.eventManager.foodStalls,
            leftProgress,
            rightProgress,
            this.eventManager.obstacles
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
        
        const deltaTime = TimeUtils.calculateDeltaTime(currentTime, this.lastFrameTime);
        this.lastFrameTime = currentTime;
        
        // Cap frame rate to MAX_FPS
        if (TimeUtils.shouldSkipFrame(currentTime, this.lastRenderTime, this.targetFrameTime)) {
            requestAnimationFrame(this.animate.bind(this));
            return;
        }
        
        this.lastRenderTime = currentTime;
        
        // Update and render
        this.update(deltaTime);
        this.render();
        
        // Update FPS counter
        this.frameCount++;
        if (TimeUtils.shouldUpdateFPS(currentTime, this.fpsUpdateTime)) {
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
