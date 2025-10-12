// EventManager class for handling festival events
import { Fan } from '../core/fan.js';
import { SecurityQueue } from '../components/securityQueue.js';
import { FoodStall } from '../components/foodStall.js';
import { Obstacles } from '../components/obstacles.js';
import { AgentState, StagePreference } from '../utils/enums.js';
import * as TimeUtils from '../utils/timeUtils.js';
import * as AgentUtils from '../utils/agentUtils.js';
import * as StateChecks from '../utils/stateChecks.js';

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
        this.showDuration = 1200000; // 1200 seconds at 40x speed = 30 seconds realtime at 1x perceived
        this.simulationTime = 0; // Track simulation time
        this.obstacles = new Obstacles(config, width, height);
        this.securityQueue = new SecurityQueue(config, width, height);
        this.securityQueue.setObstacles(this.obstacles); // Pass obstacles for pathfinding
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
            const stall = new FoodStall(stallX, stallY, this.config, i + 1); // Pass ID (1-4)
            stall.setObstacles(this.obstacles); // Pass obstacles for pathfinding
            this.foodStalls.push(stall);
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
     * @param {Agent[]} agents - Array of all agents in the simulation
     */
    updateFoodStalls(simulationTime, agents) {
        this.foodStalls.forEach(stall => {
            stall.processQueue(this.width, this.height, simulationTime)
            stall.updateQueuePositions(this.width, this.height, false, simulationTime)
            
            // Check for fans being processed at this stall
            for (const fan of agents) {
                if (fan.processingAtStall === stall) {
                    stall.checkAndProcessFan(fan, this.width, this.height, simulationTime)
                }
            }
        })
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
            if (TimeUtils.hasElapsed(simulationTime, this.leftConcertPrepStartTime, this.config.CONCERT_PREP_TIME)) {
                // Start the left concert (fans are already at the stage)
                this.leftConcertStartTime = simulationTime;
            }
        }
        
        // Handle right concert preparation and start
        if (this.rightConcertPrepStartTime !== null && !this.rightConcertStartTime) {
            if (TimeUtils.hasElapsed(simulationTime, this.rightConcertPrepStartTime, this.config.CONCERT_PREP_TIME)) {
                // Start the right concert (fans are already at the stage)
                this.rightConcertStartTime = simulationTime;
            }
        }
        
        // Handle left concert end
        if (this.leftConcertStartTime !== null) {
            if (TimeUtils.hasElapsed(simulationTime, this.leftConcertStartTime, this.showDuration)) {
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
                        agent.setTarget(targetX, targetY, this.obstacles, simulationTime);
                    }
                });
            }
        }
        
        // Handle right concert end
        if (this.rightConcertStartTime !== null) {
            if (TimeUtils.hasElapsed(simulationTime, this.rightConcertStartTime, this.showDuration)) {
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
                        agent.setTarget(targetX, targetY, this.obstacles, simulationTime);
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
        const targetX = this.width * (stage === StagePreference.LEFT ? this.config.STAGE_LEFT_X : this.config.STAGE_RIGHT_X);
        
        agents.forEach(agent => {
            if (agent.type !== 'fan' || StateChecks.isLeaving(agent.state)) return;
            
            // Skip fans who are in food queue - they must finish getting food first
            if (agent.inQueue) return;
            
            // Skip fans who haven't passed security yet
            if (!StateChecks.hasPassedSecurity(agent.state)) return;
            
            // Determine if fan should attend this show
            const shouldAttend = AgentUtils.shouldAttendStage(agent.stagePreference, stage, agent.currentShow);
            
            if (shouldAttend) {
                agent.currentShow = stage;
                
                // Small percentage go up front (cluster tightly)
                const upFront = AgentUtils.shouldBeUpFront();
                agent.isUpFront = upFront;
                agent.goal = upFront ? `${stage} stage (up front)` : `${stage} stage`;
                
                const position = AgentUtils.calculateStagePosition(
                    targetX,
                    this.height * (upFront ? 0.20 : 0.25),
                    150,
                    this.height * (upFront ? 0.15 : 0.3),
                    upFront
                );
                agent.setTarget(position.x, position.y, this.obstacles);
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
                // Check if fan should get food
                if (AgentUtils.shouldGetFood(agent.hunger, agent.hungerThreshold, agent.inQueue, agent.currentShow, agent.state)) {
                    // Choose a food stall randomly (d4 roll) - each stall has different food
                    // Fans should distribute across all 4 stalls rather than all using one
                    // Roll d4 (0-3) to pick one of the 4 food stalls each time they get hungry
                    const stallIndex = Math.floor(Math.random() * this.foodStalls.length);
                    agent.preferredFoodStall = this.foodStalls[stallIndex];
                    
                    const targetStall = agent.preferredFoodStall;
                    
                    // Find the stall with this ID
                    const stall = this.foodStalls.find(s => s.id === targetStall.id);
                    if (stall) {
                        agent.goal = `food stall ${stall.id}`;
                        stall.addToQueue(agent);
                    }
                }
            }
        });
    }

    handleLeftConcert(agents) {
        this.leftConcertActive = true;
        this.leftConcertPrepStartTime = this.simulationTime;
        // Move fans to stage immediately when prep starts
        this.moveAgentsToStage(agents, 'left');
        this.pendingLeftConcertAgents = null;
    }

    handleRightConcert(agents) {
        this.rightConcertActive = true;
        this.rightConcertPrepStartTime = this.simulationTime;
        // Move fans to stage immediately when prep starts
        this.moveAgentsToStage(agents, 'right');
        this.pendingRightConcertAgents = null;
    }

    handleBusArrival(agents) {
        const busX = this.width * this.config.BUS_X;
        const busY = this.height * this.config.BUS_Y;
        const newAgents = [];
        
        for (let i = 0; i < this.config.BUS_ATTENDEE_COUNT; i++) {
            const offsetX = (Math.random() - 0.5) * 50;
            // Only spawn fans in front of or on the bus, never behind it (positive offset only)
            const offsetY = -Math.random() * 15; // 0 to -15, always above the bus
            const fan = new Fan(busX + offsetX, busY + offsetY, this.config);
            
            // Add fan to security queue - this will direct them toward the queue ends
            this.securityQueue.addToQueue(fan);
            
            newAgents.push(fan);
        }
        
        return newAgents;
    }

    handleCarArrival(agents) {
        const busX = this.width * this.config.BUS_X;
        const busY = this.height * this.config.BUS_Y;
        const newAgents = [];
        
        // Spawn single fan
        const offsetX = (Math.random() - 0.5) * 50;
        // Only spawn fans in front of or on the bus, never behind it (positive offset only)
        const offsetY = -Math.random() * 15; // 0 to -15, always above the bus
        const fan = new Fan(busX + offsetX, busY + offsetY, this.config);
        
        // Add fan to security queue - this will direct them toward the queue ends
        this.securityQueue.addToQueue(fan);
        
        newAgents.push(fan);
        
        return newAgents;
    }

    handleBusDeparture(agents) {
        // Select fans who can leave
        const leavingAgents = [];
        
        for (const agent of agents) {
            if (agent.type === 'fan' && 
                AgentUtils.canLeaveFestival(agent.hasSeenShow, agent.hasEatenFood, agent.inQueue, agent.state)) {
                
                agent.markAsLeaving();
                const busX = this.width * this.config.BUS_X;
                const busY = this.height * this.config.BUS_Y;
                agent.setTarget(busX + (Math.random() - 0.5) * 40, busY, this.obstacles);
                leavingAgents.push(agent);
            }
        }
        
        // Schedule removal of agents after 3 seconds
        setTimeout(() => {
            const busY = this.height * this.config.BUS_Y;
            for (let i = agents.length - 1; i >= 0; i--) {
                const agent = agents[i];
                if (agent.state === AgentState.LEAVING && Math.abs(agent.y - busY) <= 10) {
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
        this.updateFoodStalls(simulationTime, agents);
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
            return {
                isPrep: true,
                progress: TimeUtils.calculateProgress(this.simulationTime, this.leftConcertPrepStartTime, this.config.CONCERT_PREP_TIME)
            };
        }
        
        // Check if show is running
        if (this.leftConcertStartTime !== null) {
            return {
                isPrep: false,
                progress: TimeUtils.calculateProgress(this.simulationTime, this.leftConcertStartTime, this.showDuration)
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
            return {
                isPrep: true,
                progress: TimeUtils.calculateProgress(this.simulationTime, this.rightConcertPrepStartTime, this.config.CONCERT_PREP_TIME)
            };
        }
        
        // Check if show is running
        if (this.rightConcertStartTime !== null) {
            return {
                isPrep: false,
                progress: TimeUtils.calculateProgress(this.simulationTime, this.rightConcertStartTime, this.showDuration)
            };
        }
        
        return { isPrep: false, progress: 0 };
    }
}
