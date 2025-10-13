// Main application entry point
import { Simulation } from './core/simulation.js';
import { CONFIG } from './utils/config.js';

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
            carArriveBtn: document.getElementById('carArriveBtn'),
            busArriveBtn: document.getElementById('busArriveBtn'),
            busLeaveBtn: document.getElementById('busLeaveBtn'),
            showPathsBtn: document.getElementById('showPathsBtn'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            attendeeCount: document.getElementById('attendeeCount'),
            fps: document.getElementById('fps'),
            // Metrics elements
            inQueueAvg: document.getElementById('inQueueAvg'),
            inQueueMedian: document.getElementById('inQueueMedian'),
            inQueueMax: document.getElementById('inQueueMax'),
            approachingAvg: document.getElementById('approachingAvg'),
            approachingMedian: document.getElementById('approachingMedian'),
            approachingMax: document.getElementById('approachingMax'),
            reenteringAvg: document.getElementById('reenteringAvg'),
            reenteringMedian: document.getElementById('reenteringMedian'),
            reenteringMax: document.getElementById('reenteringMax'),
            fansInQueue: document.getElementById('fansInQueue'),
            fansApproachingQueue: document.getElementById('fansApproachingQueue'),
            fansAtMaxHunger: document.getElementById('fansAtMaxHunger'),
            stuckFans: document.getElementById('stuckFans'),
            hungerAvg: document.getElementById('hungerAvg'),
            hungerMedian: document.getElementById('hungerMedian')
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

        // Car button
        this.elements.carArriveBtn.addEventListener('click', () => {
            this.simulation.triggerCarArrival();
        });

        // Bus buttons
        this.elements.busArriveBtn.addEventListener('click', () => {
            this.simulation.triggerBusArrival();
        });

        this.elements.busLeaveBtn.addEventListener('click', () => {
            this.simulation.triggerBusDeparture();
        });

        // Show All Paths toggle button
        this.elements.showPathsBtn.addEventListener('click', () => {
            this.simulation.renderer.showAllPaths = !this.simulation.renderer.showAllPaths;
            const isShowing = this.simulation.renderer.showAllPaths;
            this.elements.showPathsBtn.textContent = isShowing ? 'Hide All Paths' : 'Show All Paths';
            this.elements.showPathsBtn.setAttribute('aria-pressed', isShowing);
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
        
        // Update metrics if available
        if (stats.metrics) {
            this.elements.inQueueAvg.textContent = stats.metrics.inQueueAvg;
            this.elements.inQueueMedian.textContent = stats.metrics.inQueueMedian;
            this.elements.inQueueMax.textContent = stats.metrics.inQueueMax;
            this.elements.approachingAvg.textContent = stats.metrics.approachingAvg;
            this.elements.approachingMedian.textContent = stats.metrics.approachingMedian;
            this.elements.approachingMax.textContent = stats.metrics.approachingMax;
            this.elements.reenteringAvg.textContent = stats.metrics.reenteringAvg;
            this.elements.reenteringMedian.textContent = stats.metrics.reenteringMedian;
            this.elements.reenteringMax.textContent = stats.metrics.reenteringMax;
            this.elements.fansInQueue.textContent = stats.metrics.fansInQueue;
            this.elements.fansApproachingQueue.textContent = stats.metrics.fansApproachingQueue;
            this.elements.fansAtMaxHunger.textContent = stats.metrics.fansAtMaxHunger;
            this.elements.stuckFans.textContent = stats.metrics.stuckFans;
            this.elements.hungerAvg.textContent = stats.metrics.hungerAvg;
            this.elements.hungerMedian.textContent = stats.metrics.hungerMedian;
        }
    }
}

// Start the application immediately - ES6 modules are deferred so DOM is ready
const app = new FestivalApp();
app.initialize();
