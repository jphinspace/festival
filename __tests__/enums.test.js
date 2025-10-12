/**
 * Tests for enums.js
 */
import { AgentState, StagePreference, QueueSide, FanGoal } from '../src/utils/enums.js';

describe('Enum immutability', () => {
    test('all enums should be frozen (immutable)', () => {
        expect(Object.isFrozen(AgentState)).toBe(true);
        expect(Object.isFrozen(StagePreference)).toBe(true);
        expect(Object.isFrozen(QueueSide)).toBe(true);
        expect(Object.isFrozen(FanGoal)).toBe(true);
    });

    test('enum values should not allow modification', () => {
        expect(() => { AgentState.IDLE = 'modified'; }).toThrow();
        expect(() => { StagePreference.LEFT = 'modified'; }).toThrow();
        expect(() => { QueueSide.LEFT = 'modified'; }).toThrow();
        expect(() => { FanGoal.EXPLORING = 'modified'; }).toThrow();
    });

    test('enums should not allow adding new properties', () => {
        expect(() => { AgentState.NEW_STATE = 'new_state'; }).toThrow();
        expect(() => { StagePreference.CENTER = 'center'; }).toThrow();
        expect(() => { QueueSide.CENTER = 'center'; }).toThrow();
        expect(() => { FanGoal.NEW_GOAL = 'new_goal'; }).toThrow();
    });

    test('enums should not allow deleting properties', () => {
        expect(() => { delete AgentState.IDLE; }).toThrow();
        expect(() => { delete StagePreference.LEFT; }).toThrow();
        expect(() => { delete QueueSide.LEFT; }).toThrow();
        expect(() => { delete FanGoal.EXPLORING; }).toThrow();
    });

    test('all enums should have unique values', () => {
        const allEnums = [AgentState, StagePreference, QueueSide, FanGoal];
        allEnums.forEach(enumObj => {
            const values = Object.values(enumObj);
            const uniqueValues = [...new Set(values)];
            expect(values.length).toBe(uniqueValues.length);
        });
    });
});

describe('AgentState enum', () => {
    test('should have all expected state values', () => {
        expect(AgentState.IDLE).toBe('idle');
        expect(AgentState.MOVING).toBe('moving');
        expect(AgentState.LEAVING).toBe('leaving');
        expect(AgentState.IN_QUEUE_WAITING).toBe('in_queue_waiting');
        expect(AgentState.IN_QUEUE_ADVANCING).toBe('in_queue_advancing');
        expect(AgentState.APPROACHING_QUEUE).toBe('approaching_queue');
        expect(AgentState.PROCESSING).toBe('processing');
        expect(AgentState.RETURNING_TO_QUEUE).toBe('returning_to_queue');
        expect(AgentState.IN_QUEUE).toBe('in_queue');
        expect(AgentState.BEING_CHECKED).toBe('being_checked');
        expect(AgentState.PASSED_SECURITY).toBe('passed_security');
    });

    test('should have exactly 11 state values', () => {
        expect(Object.keys(AgentState).length).toBe(11);
    });
});

describe('StagePreference enum', () => {
    test('should have all expected preference values', () => {
        expect(StagePreference.LEFT).toBe('left');
        expect(StagePreference.RIGHT).toBe('right');
        expect(StagePreference.NONE).toBe('none');
    });

    test('should have exactly 3 preference values', () => {
        expect(Object.keys(StagePreference).length).toBe(3);
    });
});

describe('QueueSide enum', () => {
    test('should have all expected side values', () => {
        expect(QueueSide.LEFT).toBe('left');
        expect(QueueSide.RIGHT).toBe('right');
    });

    test('should have exactly 2 side values', () => {
        expect(Object.keys(QueueSide).length).toBe(2);
    });
});

describe('FanGoal enum', () => {
    test('should have all expected goal values', () => {
        expect(FanGoal.EXPLORING).toBe('exploring');
        expect(FanGoal.SECURITY).toBe('security (re-check)');
        expect(FanGoal.EXPLORING_FESTIVAL).toBe('exploring festival');
    });

    test('should have exactly 3 goal values', () => {
        expect(Object.keys(FanGoal).length).toBe(3);
    });
});

describe('Enum value compatibility', () => {
    test('enum values should work with string comparisons', () => {
        // Verify enums work seamlessly with existing string comparisons
        expect(AgentState.IDLE === 'idle').toBe(true);
        expect(StagePreference.LEFT === 'left').toBe(true);
        expect(QueueSide.LEFT === 'left').toBe(true);
        expect(FanGoal.EXPLORING === 'exploring').toBe(true);
    });

    test('StagePreference and QueueSide intentionally share left/right values', () => {
        const preferenceValues = Object.values(StagePreference);
        const sideValues = Object.values(QueueSide);
        
        const overlap = preferenceValues.filter(v => sideValues.includes(v));
        // 'left' and 'right' ARE in both, which is intentional
        expect(overlap.length).toBe(2);
        expect(overlap).toContain('left');
        expect(overlap).toContain('right');
    });
});
