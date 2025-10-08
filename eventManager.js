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
        this.showDuration = 1200000; // 1200 seconds at 20x speed = 60 seconds perceived (1 simulated hour)
        this.securityQueue = new SecurityQueue(config, width, height);
        this.obstacles = new Obstacles(config, width, height);
        this.foodStalls = [];
        this.createFoodStalls();
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
     */
    updateFoodStalls() {
        this.foodStalls.forEach(stall => {
            stall.processQueue(this.width, this.height);
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
     * Handle hungry fans seeking food
     * @param {Agent[]} agents - All agents in simulation
     */
    handleHungryFans(agents) {
        const currentTime = Date.now();
        
        agents.forEach(agent => {
            if (agent.type === 'fan' && !agent.inQueue && agent.state !== 'leaving') {
                // Check if fan is hungry enough
                if (agent.hunger > agent.hungerThreshold) {
                    // Check if fan can leave for food based on show rules
                    let canLeaveForFood = true;
                    
                    // Fans with no preference won't get food until all shows end
                    if (agent.stagePreference === 'none' && (this.leftConcertActive || this.rightConcertActive)) {
                        canLeaveForFood = false;
                    }
                    
                    // Fans at their preferred show
                    if (agent.currentShow === agent.stagePreference) {
                        // VIP and up-front fans won't leave until show is 90% over
                        if (agent.isVIP || agent.isUpFront) {
                            const showStartTime = agent.currentShow === 'left' ? this.leftConcertStartTime : this.rightConcertStartTime;
                            if (showStartTime) {
                                const elapsed = currentTime - showStartTime;
                                const progress = elapsed / this.showDuration;
                                if (progress < 0.9) {
                                    canLeaveForFood = false;
                                }
                            }
                        }
                    }
                    
                    if (canLeaveForFood) {
                        const stall = this.getShortestQueue();
                        stall.addToQueue(agent);
                        // Clear show status when leaving for food
                        agent.currentShow = null;
                        agent.isUpFront = false;
                    }
                }
            }
        });
    }

    handleLeftConcert(agents) {
        this.leftConcertActive = true;
        
        // Schedule show start after CONCERT_PREP_TIME
        setTimeout(() => {
            if (this.leftConcertActive) {
                this.leftConcertStartTime = Date.now();
                
                // Schedule show end
                setTimeout(() => {
                    this.leftConcertActive = false;
                    this.leftConcertStartTime = null;
                    // Fans disperse after show
                    agents.forEach(agent => {
                        if (agent.type === 'fan' && agent.currentShow === 'left' && !agent.isVIP) {
                            // Mark as having seen preferred show if applicable
                            if (agent.stagePreference === 'left') {
                                agent.hasSeenPreferredShow = true;
                            }
                            agent.currentShow = null;
                            agent.isUpFront = false;
                            // Wander to random position
                            const targetX = Math.random() * this.width;
                            const targetY = Math.random() * this.height * 0.7;
                            agent.setTarget(targetX, targetY);
                        }
                    });
                }, this.showDuration);
                
                // Move fans to left stage based on preferences
                const targetX = this.width * this.config.STAGE_LEFT_X;
                agents.forEach(agent => {
                    if (agent.type !== 'fan' || agent.state === 'leaving' || agent.isVIP) return;
                    
                    const shouldAttend = 
                        agent.stagePreference === 'left' || // Preferred stage
                        (agent.stagePreference === 'none' && !agent.inQueue) || // No preference and not in queue
                        (agent.currentShow === 'right' && agent.stagePreference === 'left'); // Leave non-preferred for preferred
                    
                    if (shouldAttend) {
                        // Leave food queue if going to preferred stage
                        if (agent.stagePreference === 'left' && agent.inQueue && agent.targetFoodStall) {
                            agent.targetFoodStall.removeFromQueue(agent);
                        }
                        
                        agent.currentShow = 'left';
                        
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
        }, this.config.CONCERT_PREP_TIME);
    }

    handleRightConcert(agents) {
        this.rightConcertActive = true;
        
        // Schedule show start after CONCERT_PREP_TIME
        setTimeout(() => {
            if (this.rightConcertActive) {
                this.rightConcertStartTime = Date.now();
                
                // Schedule show end
                setTimeout(() => {
                    this.rightConcertActive = false;
                    this.rightConcertStartTime = null;
                    // Fans disperse after show
                    agents.forEach(agent => {
                        if (agent.type === 'fan' && agent.currentShow === 'right' && !agent.isVIP) {
                            // Mark as having seen preferred show if applicable
                            if (agent.stagePreference === 'right') {
                                agent.hasSeenPreferredShow = true;
                            }
                            agent.currentShow = null;
                            agent.isUpFront = false;
                            // Wander to random position
                            const targetX = Math.random() * this.width;
                            const targetY = Math.random() * this.height * 0.7;
                            agent.setTarget(targetX, targetY);
                        }
                    });
                }, this.showDuration);
                
                // Move fans to right stage based on preferences
                const targetX = this.width * this.config.STAGE_RIGHT_X;
                agents.forEach(agent => {
                    if (agent.type !== 'fan' || agent.state === 'leaving' || agent.isVIP) return;
                    
                    const shouldAttend = 
                        agent.stagePreference === 'right' || // Preferred stage
                        (agent.stagePreference === 'none' && !agent.inQueue) || // No preference and not in queue
                        (agent.currentShow === 'left' && agent.stagePreference === 'right'); // Leave non-preferred for preferred
                    
                    if (shouldAttend) {
                        // Leave food queue if going to preferred stage
                        if (agent.stagePreference === 'right' && agent.inQueue && agent.targetFoodStall) {
                            agent.targetFoodStall.removeFromQueue(agent);
                        }
                        
                        agent.currentShow = 'right';
                        
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
        }, this.config.CONCERT_PREP_TIME);
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
        // Select fans who have seen their preferred show and are not in food queue
        const leavingAgents = [];
        
        for (const agent of agents) {
            if (agent.type === 'fan' && 
                agent.hasSeenPreferredShow && 
                !agent.inQueue &&
                agent.state !== 'leaving') {
                agent.markAsLeaving();
                const busX = this.width * this.config.BUS_X;
                const busY = this.height * this.config.BUS_Y;
                agent.setTarget(busX + (Math.random() - 0.5) * 40, busY);
                leavingAgents.push(agent);
            }
        }
        
        // If no one qualifies, select some random fans
        if (leavingAgents.length === 0) {
            const leavingCount = Math.floor(Math.random() * 30) + 20;
            let count = 0;
            for (let i = 0; i < agents.length && count < leavingCount; i++) {
                if (Math.random() > 0.5 && agents[i].type === 'fan') {
                    const agent = agents[i];
                    agent.markAsLeaving();
                    const busX = this.width * this.config.BUS_X;
                    const busY = this.height * this.config.BUS_Y;
                    agent.setTarget(busX + (Math.random() - 0.5) * 40, busY);
                    leavingAgents.push(agent);
                    count++;
                }
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
     * @param {number} currentTime - Current timestamp in milliseconds
     * @param {Agent[]} agents - All agents in simulation
     */
    update(currentTime, agents) {
        this.securityQueue.update(currentTime);
        this.updateFoodStalls();
        this.handleHungryFans(agents);
    }

    /**
     * Get show progress for left stage
     * @returns {number} Progress from 0 to 1
     */
    getLeftShowProgress() {
        if (!this.leftConcertActive || !this.leftConcertStartTime) return 0;
        const elapsed = Date.now() - this.leftConcertStartTime;
        return Math.min(1.0, elapsed / this.showDuration);
    }
    
    /**
     * Get show progress for right stage
     * @returns {number} Progress from 0 to 1
     */
    getRightShowProgress() {
        if (!this.rightConcertActive || !this.rightConcertStartTime) return 0;
        const elapsed = Date.now() - this.rightConcertStartTime;
        return Math.min(1.0, elapsed / this.showDuration);
    }
}
