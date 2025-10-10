/**
 * Configuration file for Festival Agent Simulation
 * 
 * This file contains all constants used throughout the application.
 * Modify these values to adjust simulation behavior without touching code.
 */
export const CONFIG = {
    // Agent settings
    AGENT_RADIUS: 3,
    AGENT_SPEED: 0.75,
    PERSONAL_SPACE: 12, // Buffer zone around agents where they avoid getting too close
    CONCERT_PERSONAL_SPACE: 4, // Reduced personal space during concerts (packed crowd)
    
    // Event settings
    BUS_ATTENDEE_COUNT: 50,
    INITIAL_ATTENDEE_COUNT: 100,
    CONCERT_PREP_TIME: 100000, // 100 seconds at 40x speed = 2.5 seconds realtime at 1x perceived
    
    // Security queue settings
    REGULAR_SECURITY_TIME: 20000, // 20 seconds at 40x speed = 0.5 realtime second at 1x perceived
    ENHANCED_SECURITY_TIME: 60000, // 60 seconds at 40x speed = 1.5 realtime seconds at 1x perceived
    ENHANCED_SECURITY_PERCENTAGE: 0.05, // 5% of fans get enhanced security
    QUEUE_LEFT_X: 0.45, // X position of left security queue
    QUEUE_RIGHT_X: 0.55, // X position of right security queue
    QUEUE_START_Y: 0.72, // Y position where queue starts (front of line, near festival)
    QUEUE_SPACING: 8, // Spacing between people in queue
    
    // Hunger settings - VERY VERY slowly
    HUNGER_MIN_INITIAL: 0.1,  // Start with very low hunger
    HUNGER_MAX_INITIAL: 0.2,  // Reduced even more
    HUNGER_INCREASE_RATE: 0.001, // Halved from 0.002 to maintain same rate at new 1x (which is 2x faster)
    HUNGER_DECREASE_AMOUNT: 1.0,  // Reset hunger completely
    HUNGER_THRESHOLD_BASE: 0.7, // Base threshold for getting food
    HUNGER_THRESHOLD_VARIANCE: 0.1, // ±10% randomness
    FOOD_WAIT_TIME: 20000, // 20 seconds at 40x speed = 0.5 realtime second at 1x perceived
    FOOD_STALL_COUNT: 4,
    FOOD_STALL_X: 0.5, // Center between the two stages
    
    // Performance settings
    MAX_FPS: 60,
    DEFAULT_SIMULATION_SPEED: 40.0, // Rescaled: old 20x is now 1x, so 40x is new default
    MIN_SIMULATION_SPEED: 4.0, // Rescaled: 0.1x * 40 = 4.0x
    MAX_SIMULATION_SPEED: 80.0, // Rescaled: 2x * 40 = 80x
    
    // Visual settings
    COLORS: {
        BACKGROUND: '#0a0a0a',
        GROUND: '#1a3a1a',
        ROAD: '#3a3a3a',
        AGENT_ACTIVE: '#4a90e2',
        AGENT_LEAVING: '#e24a4a',
        AGENT_IN_QUEUE: '#f0ad4e',
        AGENT_BEING_CHECKED: '#5bc0de',
        AGENT_ENHANCED_SECURITY: '#d9534f',
        STAGE_INACTIVE: '#4a4a4a',
        STAGE_ACTIVE: '#ff6b6b',
        BUS_AREA: '#6b6bff',
        SECURITY_QUEUE: '#9b6bff',
        SECURITY_BORDER: '#ff00ff',
        FOOD_STALL: '#8b4513',
        TEXT: '#fff'
    },
    
    // Layout settings
    STAGE_LEFT_X: 0.10,  // Center of left stage
    STAGE_RIGHT_X: 0.90, // Center of right stage
    STAGE_Y: 0.30,       // Center Y of stages
    STAGE_WIDTH: 0.1,    // Stage width (after rotation)
    STAGE_HEIGHT: 0.3,   // Stage height (after rotation)
    BUS_X: 0.5,
    BUS_Y: 0.95,         // Moved further down to give fans more space
    BUS_WIDTH: 0.2,
    BUS_HEIGHT: 0.05,
    GROUND_HEIGHT: 0.7,
    ROAD_START: 0.85
};