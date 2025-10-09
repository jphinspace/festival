// EventManager class for handling festival events
import { Fan } from './fan.js';
import { SecurityQueue } from './securityQueue.js';
import { FoodStall } from './foodStall.js';
import { Obstacles } from './obstacles.js';

export class EventManager {
    constructor(config, width, height) {
        this.config = config;
        this.width = width;
        this.height = height;
        this.leftConcertActive = false;
        this.rightConcertActive = false;
        this.leftConcertStartTime = null;
        this.rightConcertStartTime = null;
        this.leftConcertPrepStartTime = null;
        this.rightConcertPrepStartTime = null;
        this.showDuration = 1200000; // 1200 seconds at 20x speed = 60 seconds realtime at 1x perceived
        this.simulationTime = 0; // Track simulation time
        this.securityQueue = new SecurityQueue(config, width, height);
        this.obstacles = new Obstacles(config, width, height);
        this.foodStalls = [];
        this.createFoodStalls();
        this.pendingLeftConcertAgents = null;
        this.pendingRightConcertAgents = null;
    }

    createFoodStalls() {
        // Create 4 food stalls vertically in the center, dividing the two stages
        this.foodStalls = [];
        const stallCount = this.config.FOOD_STALL_COUNT;
        const stallX = this.width * this.config.FOOD_STALL_X;
        
        // Position stalls vertically between y: 0.25 and y: 0.7 of height
        const startY = this.height * 0.25;
        const endY = this.height * 0.7;
        const spacing = (endY - startY) / (stallCount + 1);
        
        for (let i = 0; i < stallCount; i++) {
            const stallY = startY + spacing * (i + 1);
            this.foodStalls.push(new FoodStall(stallX, stallY, this.config));
        }
        
        // Update obstacles with food stalls
        this.obstacles.setFoodStalls(this.foodStalls);
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.securityQueue.updateDimensions(width, height);
        this.obstacles.updateDimensions(width, height);
        this.createFoodStalls(); // Recreate stalls with new dimensions
    }
    
    /**
     * Update food stalls and their queues
     * @param {number} simulationTime - Current simulation time in milliseconds
     */
    updateFoodStalls(simulationTime) {
        this.foodStalls.forEach(stall => {
            stall.processQueue(this.width, this.height, simulationTime);
            stall.updateQueuePositions(this.width, this.height);
        });
    }
    
    /**
     * Find the shortest queue among food stalls
     * @returns {FoodStall} The food stall with shortest total queue length
     */
    getShortestQueue() {
        return this.foodStalls.reduce((shortest, stall) => {
            const stallTotal = stall.leftQueue.length + stall.rightQueue.length;
            const shortestTotal = shortest.leftQueue.length + shortest.rightQueue.length;
            return stallTotal < shortestTotal ? stall : shortest;
        });
    }
    
    /**
     * Update concert states based on simulation time
     * @param {number} simulationTime - Current simulation time in milliseconds
     * @param {Agent[]} agents - All agents in simulation
     */
    updateConcerts(simulationTime, agents) {
        // Handle left concert preparation and start
        if (this.leftConcertPrepStartTime !== null && !this.leftConcertStartTime) {
            const prepElapsed = simulationTime - this.leftConcertPrepStartTime;
            if (prepElapsed >= this.config.CONCERT_PREP_TIME) {
                // Start the left concert
                this.leftConcertStartTime = simulationTime;
                
                // Move fans to left stage based on preferences
                if (this.pendingLeftConcertAgents) {
                    this.moveAgentsToStage(this.pendingLeftConcertAgents, 'left');
                    this.pendingLeftConcertAgents = null;
                }
            }
        }
        
        // Handle right concert preparation and start
        if (this.rightConcertPrepStartTime !== null && !this.rightConcertStartTime) {
            const prepElapsed = simulationTime - this.rightConcertPrepStartTime;
            if (prepElapsed >= this.config.CONCERT_PREP_TIME) {
                // Start the right concert
                this.rightConcertStartTime = simulationTime;
                
                // Move fans to right stage based on preferences
                if (this.pendingRightConcertAgents) {
                    this.moveAgentsToStage(this.pendingRightConcertAgents, 'right');
                    this.pendingRightConcertAgents = null;
                }
            }
        }
        
        // Handle left concert end
        if (this.leftConcertStartTime !== null) {
            const elapsed = simulationTime - this.leftConcertStartTime;
            if (elapsed >= this.showDuration) {
                this.leftConcertActive = false;
                this.leftConcertStartTime = null;
                this.leftConcertPrepStartTime = null;
                
                // Fans disperse after show
                agents.forEach(agent => {
                    if (agent.type === 'fan' && agent.currentShow === 'left') {
                        // Mark as having seen a show
                        agent.hasSeenShow = true;
                        agent.currentShow = null;
                        agent.isUpFront = false;
                        // Wander to random position
                        const targetX = Math.random() * this.width;
                        const targetY = Math.random() * this.height * 0.7;
                        agent.setTarget(targetX, targetY);
                    }
                });
            }
        }
        
        // Handle right concert end
        if (this.rightConcertStartTime !== null) {
            const elapsed = simulationTime - this.rightConcertStartTime;
            if (elapsed >= this.showDuration) {
                this.rightConcertActive = false;
                this.rightConcertStartTime = null;
                this.rightConcertPrepStartTime = null;
                
                // Fans disperse after show
                agents.forEach(agent => {
                    if (agent.type === 'fan' && agent.currentShow === 'right') {
                        // Mark as having seen a show
                        agent.hasSeenShow = true;
                        agent.currentShow = null;
                        agent.isUpFront = false;
                        // Wander to random position
                        const targetX = Math.random() * this.width;
                        const targetY = Math.random() * this.height * 0.7;
                        agent.setTarget(targetX, targetY);
                    }
                });
            }
        }
    }

    /**
     * Move agents to a specific stage
     * @param {Agent[]} agents - All agents in simulation
     * @param {string} stage - 'left' or 'right'
     */
    moveAgentsToStage(agents, stage) {
        const targetX = this.width * (stage === 'left' ? this.config.STAGE_LEFT_X : this.config.STAGE_RIGHT_X);
        
        agents.forEach(agent => {
            if (agent.type !== 'fan' || agent.state === 'leaving') return;
            
            // Skip fans who are in food queue - they must finish getting food first
            if (agent.inQueue) return;
            
            // Skip fans who haven't passed security yet
            if (agent.state !== 'passed_security' && agent.state !== 'idle' && agent.state !== 'moving') return;
            
            // Determine if fan should attend this show
            let shouldAttend = false;
            
            if (agent.stagePreference === stage) {
                // Preferred stage - always attend if not in food queue
                shouldAttend = agent.currentShow !== stage;
            } else if (agent.stagePreference === 'none' && !agent.currentShow) {
                // No preference, not watching another show
                shouldAttend = true;
            }
            
            if (shouldAttend) {
                agent.currentShow = stage;
                
                // Small percentage go up front (cluster tightly)
                if (Math.random() < 0.2) {
                    agent.isUpFront = true;
                    const targetY = this.height * 0.20 + Math.random() * this.height * 0.15;
                    agent.setTarget(targetX + (Math.random() - 0.5) * 40, targetY);
                } else {
                    // Others watch from farther away, more spaced
                    agent.isUpFront = false;
                    const targetY = this.height * 0.25 + Math.random() * this.height * 0.3;
                    agent.setTarget(targetX + (Math.random() - 0.5) * 150, targetY);
                }
            }
        });
    }
    
    /**
     * Handle hungry fans seeking food
     * @param {Agent[]} agents - All agents in simulation
     */
    handleHungryFans(agents) {
        agents.forEach(agent => {
            if (agent.type === 'fan' && !agent.inQueue && agent.state !== 'leaving') {
                // Check if fan is hungry enough
                if (agent.hunger > agent.hungerThreshold) {
                    // Fans won't leave a show to get food - they must wait until the show ends
                    if (agent.currentShow) {
                        return; // Don't get food while watching a show
                    }
                    
                    // Skip fans who haven't passed security
                    if (agent.state !== 'passed_security' && agent.state !== 'idle' && agent.state !== 'moving') {
                        return;
                    }
                    
                    const stall = this.getShortestQueue();
                    stall.addToQueue(agent);
                }
            }
        });
    }

    handleLeftConcert(agents) {
        this.leftConcertActive = true;
        this.leftConcertPrepStartTime = this.simulationTime;
        this.pendingLeftConcertAgents = agents;
    }

    handleRightConcert(agents) {
        this.rightConcertActive = true;
        this.rightConcertPrepStartTime = this.simulationTime;
        this.pendingRightConcertAgents = agents;
    }

    handleBusArrival(agents) {
        const busX = this.width * this.config.BUS_X;
        const busY = this.height * this.config.BUS_Y;
        const newAgents = [];
        
        for (let i = 0; i < this.config.BUS_ATTENDEE_COUNT; i++) {
            const offsetX = (Math.random() - 0.5) * 50;
            const offsetY = (Math.random() - 0.5) * 30;
            const fan = new Fan(busX + offsetX, busY + offsetY, this.config);
            
            // Add fan to security queue instead of directly to festival
            this.securityQueue.addToQueue(fan);
            
            newAgents.push(fan);
        }
        
        return newAgents;
    }

    handleBusDeparture(agents) {
        // Select fans who have BOTH seen a show AND eaten food
        const leavingAgents = [];
        
        for (const agent of agents) {
            if (agent.type === 'fan' && 
                agent.hasSeenShow && 
                agent.hasEatenFood &&
                !agent.inQueue &&
                agent.state !== 'leaving') {
                
                agent.markAsLeaving();
                const busX = this.width * this.config.BUS_X;
                const busY = this.height * this.config.BUS_Y;
                agent.setTarget(busX + (Math.random() - 0.5) * 40, busY);
                leavingAgents.push(agent);
            }
        }
        
        // Schedule removal of agents after 3 seconds
        setTimeout(() => {
            const busY = this.height * this.config.BUS_Y;
            for (let i = agents.length - 1; i >= 0; i--) {
                const agent = agents[i];
                if (agent.state === 'leaving' && Math.abs(agent.y - busY) <= 10) {
                    agents.splice(i, 1);
                }
            }
        }, 3000);
    }

    /**
     * Update event manager state (processes security queue and food stalls)
     * @param {number} simulationTime - Current simulation time in milliseconds
     * @param {Agent[]} agents - All agents in simulation
     * @param {number} simulationSpeed - Current simulation speed multiplier
     */
    update(simulationTime, agents, simulationSpeed) {
        this.simulationTime = simulationTime;
        this.securityQueue.update(simulationTime);
        this.updateFoodStalls(simulationTime);
        this.handleHungryFans(agents);
        this.updateConcerts(simulationTime, agents);
    }

    /**
     * Get show progress for left stage (0-1 during show, returns prep progress if in prep)
     * @returns {Object} {isPrep: boolean, progress: number}
     */
    getLeftShowProgress() {
        // Check if in prep phase
        if (this.leftConcertPrepStartTime !== null && this.leftConcertStartTime === null) {
            const elapsed = this.simulationTime - this.leftConcertPrepStartTime;
            return {
                isPrep: true,
                progress: Math.min(1.0, elapsed / this.config.CONCERT_PREP_TIME)
            };
        }
        
        // Check if show is running
        if (this.leftConcertStartTime !== null) {
            const elapsed = this.simulationTime - this.leftConcertStartTime;
            return {
                isPrep: false,
                progress: Math.min(1.0, elapsed / this.showDuration)
            };
        }
        
        return { isPrep: false, progress: 0 };
    }
    
    /**
     * Get show progress for right stage (0-1 during show, returns prep progress if in prep)
     * @returns {Object} {isPrep: boolean, progress: number}
     */
    getRightShowProgress() {
        // Check if in prep phase
        if (this.rightConcertPrepStartTime !== null && this.rightConcertStartTime === null) {
            const elapsed = this.simulationTime - this.rightConcertPrepStartTime;
            return {
                isPrep: true,
                progress: Math.min(1.0, elapsed / this.config.CONCERT_PREP_TIME)
            };
        }
        
        // Check if show is running
        if (this.rightConcertStartTime !== null) {
            const elapsed = this.simulationTime - this.rightConcertStartTime;
            return {
                isPrep: false,
                progress: Math.min(1.0, elapsed / this.showDuration)
            };
        }
        
        return { isPrep: false, progress: 0 };
    }
}
