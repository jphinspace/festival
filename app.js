// Main application entry point
import { Simulation } from './simulation.js';
import { CONFIG } from './config.js';

class FestivalApp {
    constructor() {
        this.simulation = null;
        this.elements = {};
    }

    initialize() {
        // Get DOM elements
        this.elements = {
            canvas: document.getElementById('canvas'),
            pauseBtn: document.getElementById('pauseBtn'),
            leftConcertBtn: document.getElementById('leftConcertBtn'),
            rightConcertBtn: document.getElementById('rightConcertBtn'),
            busArriveBtn: document.getElementById('busArriveBtn'),
            busLeaveBtn: document.getElementById('busLeaveBtn'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            attendeeCount: document.getElementById('attendeeCount'),
            fps: document.getElementById('fps')
        };

        // Initialize simulation
        this.simulation = new Simulation(this.elements.canvas, CONFIG);
        this.simulation.onStatsUpdate = this.updateStats.bind(this);
        this.simulation.initialize();

        // Setup event listeners
        this.setupEventListeners();

        // Start simulation
        this.simulation.start();

        // Handle window resize
        window.addEventListener('resize', () => this.simulation.resize());
    }

    setupEventListeners() {
        // Pause/Resume button
        this.elements.pauseBtn.addEventListener('click', () => {
            const isPaused = this.simulation.togglePause();
            this.elements.pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
            this.elements.pauseBtn.className = isPaused ? '' : 'pause';
            this.elements.pauseBtn.setAttribute('aria-pressed', !isPaused);
        });

        // Concert buttons
        this.elements.leftConcertBtn.addEventListener('click', () => {
            this.simulation.triggerLeftConcert();
        });

        this.elements.rightConcertBtn.addEventListener('click', () => {
            this.simulation.triggerRightConcert();
        });

        // Bus buttons
        this.elements.busArriveBtn.addEventListener('click', () => {
            this.simulation.triggerBusArrival();
        });

        this.elements.busLeaveBtn.addEventListener('click', () => {
            this.simulation.triggerBusDeparture();
        });

        // Speed slider
        this.elements.speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.simulation.setSimulationSpeed(speed);
            // Display rescaled speed (divide by 40 to show perceived speed)
            const displaySpeed = (speed / 40.0).toFixed(1);
            this.elements.speedValue.textContent = displaySpeed + 'x';
        });
    }

    updateStats(stats) {
        this.elements.attendeeCount.textContent = `Attendees: ${stats.attendeeCount}`;
        this.elements.fps.textContent = `FPS: ${stats.fps}`;
    }
}

// Start the application immediately - ES6 modules are deferred so DOM is ready
const app = new FestivalApp();
app.initialize();
