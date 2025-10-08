/**
 * Configuration file for Festival Agent Simulation
 * 
 * This file contains all constants used throughout the application.
 * Modify these values to adjust simulation behavior without touching code.
 */
export const CONFIG = {
    // Agent settings
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.5,
    
    // Event settings
    BUS_ATTENDEE_COUNT: 50,
    INITIAL_ATTENDEE_COUNT: 100,
    CONCERT_PREP_TIME: 5000, // 5 seconds to represent 5 minutes
    
    // Hunger settings
    HUNGER_MIN_INITIAL: 0.5,
    HUNGER_MAX_INITIAL: 0.8,
    HUNGER_INCREASE_RATE: 0.02, // per second
    HUNGER_DECREASE_AMOUNT: 0.5,
    FOOD_WAIT_TIME: 1000, // 1 second (1 simulated minute)
    FOOD_STALL_COUNT: 4,
    FOOD_STALL_X: 0.5, // Center between the two stages
    
    // Performance settings
    MAX_FPS: 60,
    DEFAULT_SIMULATION_SPEED: 1.0,
    MIN_SIMULATION_SPEED: 0.1,
    MAX_SIMULATION_SPEED: 5.0,
    
    // Visual settings
    COLORS: {
        BACKGROUND: '#0a0a0a',
        GROUND: '#1a3a1a',
        ROAD: '#3a3a3a',
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a',
        STAGE_INACTIVE: '#4a4a4a',
        STAGE_ACTIVE: '#ff6b6b',
        BUS_AREA: '#6b6bff',
        FOOD_STALL: '#8b4513',
        TEXT: '#fff'
    },
    
    // Layout settings
    STAGE_LEFT_X: 0.15,
    STAGE_RIGHT_X: 0.85,
    STAGE_Y: 0.25,
    BUS_X: 0.5,
    BUS_Y: 0.9,
    GROUND_HEIGHT: 0.7,
    ROAD_START: 0.85
};
