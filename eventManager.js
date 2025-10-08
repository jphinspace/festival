// EventManager class for handling festival events
import { Fan } from './fan.js';
import { SecurityQueue } from './securityQueue.js';
import { FoodStall } from './foodStall.js';

export class EventManager {
    constructor(config, width, height) {
        this.config = config;
        this.width = width;
        this.height = height;
        this.leftConcertActive = false;
        this.rightConcertActive = false;
        this.securityQueue = new SecurityQueue(config, width, height);
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
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.securityQueue.updateDimensions(width, height);
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
        agents.forEach(agent => {
            if (agent.type === 'fan' && !agent.inQueue && agent.state !== 'leaving') {
                // If fan is very hungry (using their individual threshold), send them to food
                if (agent.hunger > agent.hungerThreshold) {
                    const stall = this.getShortestQueue();
                    stall.addToQueue(agent);
                }
            }
        });
    }

    handleLeftConcert(agents) {
        this.leftConcertActive = true;
        
        // Schedule agent movement after CONCERT_PREP_TIME
        setTimeout(() => {
            if (this.leftConcertActive) {
                const targetX = this.width * this.config.STAGE_LEFT_X;
                agents.forEach(agent => {
                    if (agent.state !== 'leaving') {
                        const targetY = this.height * 0.3 + Math.random() * this.height * 0.4;
                        agent.setTarget(targetX + (Math.random() - 0.5) * 100, targetY);
                    }
                });
            }
        }, this.config.CONCERT_PREP_TIME);
    }

    handleRightConcert(agents) {
        this.rightConcertActive = true;
        
        // Schedule agent movement after CONCERT_PREP_TIME
        setTimeout(() => {
            if (this.rightConcertActive) {
                const targetX = this.width * this.config.STAGE_RIGHT_X;
                agents.forEach(agent => {
                    if (agent.state !== 'leaving') {
                        const targetY = this.height * 0.3 + Math.random() * this.height * 0.4;
                        agent.setTarget(targetX + (Math.random() - 0.5) * 100, targetY);
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
        const leavingCount = Math.floor(Math.random() * 30) + 20;
        let count = 0;
        const leavingAgents = [];
        
        for (let i = 0; i < agents.length && count < leavingCount; i++) {
            if (Math.random() > 0.5) {
                const agent = agents[i];
                agent.markAsLeaving();
                const busX = this.width * this.config.BUS_X;
                const busY = this.height * this.config.BUS_Y;
                agent.setTarget(busX + (Math.random() - 0.5) * 40, busY);
                leavingAgents.push(agent);
                count++;
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
}
