// Test for config module
import { CONFIG } from '../src/utils/config.js'

describe('Config Module', () => {
    test('should export CONFIG object', () => {
        expect(CONFIG).toBeDefined()
        expect(typeof CONFIG).toBe('object')
    })

    test('should have required agent properties', () => {
        expect(CONFIG).toHaveProperty('AGENT_RADIUS')
        expect(CONFIG).toHaveProperty('AGENT_SPEED')
        expect(CONFIG).toHaveProperty('PERSONAL_SPACE')
    })

    test('should have required color properties', () => {
        expect(CONFIG).toHaveProperty('COLORS')
        expect(CONFIG.COLORS).toHaveProperty('AGENT_ACTIVE')
        expect(CONFIG.COLORS).toHaveProperty('AGENT_LEAVING')
    })

    test('should have pathfinding properties', () => {
        expect(CONFIG).toHaveProperty('MAX_STATIC_WAYPOINTS')
        expect(CONFIG).toHaveProperty('WAYPOINT_REACH_DISTANCE')
        expect(CONFIG).toHaveProperty('BASE_WAYPOINT_UPDATE_INTERVAL')
    })

    test('should have hunger system properties', () => {
        expect(CONFIG).toHaveProperty('HUNGER_INCREASE_RATE')
        expect(CONFIG).toHaveProperty('HUNGER_THRESHOLD_BASE')
        expect(CONFIG).toHaveProperty('HUNGER_MIN_INITIAL')
        expect(CONFIG).toHaveProperty('HUNGER_MAX_INITIAL')
    })

    test('should have queue properties', () => {
        expect(CONFIG).toHaveProperty('QUEUE_SPACING')
        expect(CONFIG).toHaveProperty('QUEUE_START_Y')
    })
})
