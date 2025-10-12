/**
 * Tests for enums.js
 */
import { AgentState, StagePreference, QueueSide, FanGoal } from '../src/utils/enums.js';

describe('AgentState enum', () => {
    test('should be frozen (immutable)', () => {
        expect(Object.isFrozen(AgentState)).toBe(true);
    });

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

    test('should not allow modification of values', () => {
        expect(() => {
            AgentState.IDLE = 'modified';
        }).toThrow();
    });

    test('should not allow adding new properties', () => {
        expect(() => {
            AgentState.NEW_STATE = 'new_state';
        }).toThrow();
    });

    test('should not allow deleting properties', () => {
        expect(() => {
            delete AgentState.IDLE;
        }).toThrow();
    });

    test('should have exactly 11 state values', () => {
        expect(Object.keys(AgentState).length).toBe(11);
    });

    test('should have all unique values', () => {
        const values = Object.values(AgentState);
        const uniqueValues = [...new Set(values)];
        expect(values.length).toBe(uniqueValues.length);
    });
});

describe('StagePreference enum', () => {
    test('should be frozen (immutable)', () => {
        expect(Object.isFrozen(StagePreference)).toBe(true);
    });

    test('should have all expected preference values', () => {
        expect(StagePreference.LEFT).toBe('left');
        expect(StagePreference.RIGHT).toBe('right');
        expect(StagePreference.NONE).toBe('none');
    });

    test('should not allow modification of values', () => {
        expect(() => {
            StagePreference.LEFT = 'modified';
        }).toThrow();
    });

    test('should not allow adding new properties', () => {
        expect(() => {
            StagePreference.CENTER = 'center';
        }).toThrow();
    });

    test('should not allow deleting properties', () => {
        expect(() => {
            delete StagePreference.LEFT;
        }).toThrow();
    });

    test('should have exactly 3 preference values', () => {
        expect(Object.keys(StagePreference).length).toBe(3);
    });

    test('should have all unique values', () => {
        const values = Object.values(StagePreference);
        const uniqueValues = [...new Set(values)];
        expect(values.length).toBe(uniqueValues.length);
    });
});

describe('QueueSide enum', () => {
    test('should be frozen (immutable)', () => {
        expect(Object.isFrozen(QueueSide)).toBe(true);
    });

    test('should have all expected side values', () => {
        expect(QueueSide.LEFT).toBe('left');
        expect(QueueSide.RIGHT).toBe('right');
    });

    test('should not allow modification of values', () => {
        expect(() => {
            QueueSide.LEFT = 'modified';
        }).toThrow();
    });

    test('should not allow adding new properties', () => {
        expect(() => {
            QueueSide.CENTER = 'center';
        }).toThrow();
    });

    test('should not allow deleting properties', () => {
        expect(() => {
            delete QueueSide.LEFT;
        }).toThrow();
    });

    test('should have exactly 2 side values', () => {
        expect(Object.keys(QueueSide).length).toBe(2);
    });

    test('should have all unique values', () => {
        const values = Object.values(QueueSide);
        const uniqueValues = [...new Set(values)];
        expect(values.length).toBe(uniqueValues.length);
    });
});

describe('FanGoal enum', () => {
    test('should be frozen (immutable)', () => {
        expect(Object.isFrozen(FanGoal)).toBe(true);
    });

    test('should have all expected goal values', () => {
        expect(FanGoal.EXPLORING).toBe('exploring');
        expect(FanGoal.SECURITY).toBe('security (re-check)');
        expect(FanGoal.EXPLORING_FESTIVAL).toBe('exploring festival');
    });

    test('should not allow modification of values', () => {
        expect(() => {
            FanGoal.EXPLORING = 'modified';
        }).toThrow();
    });

    test('should not allow adding new properties', () => {
        expect(() => {
            FanGoal.NEW_GOAL = 'new_goal';
        }).toThrow();
    });

    test('should not allow deleting properties', () => {
        expect(() => {
            delete FanGoal.EXPLORING;
        }).toThrow();
    });

    test('should have exactly 3 goal values', () => {
        expect(Object.keys(FanGoal).length).toBe(3);
    });

    test('should have all unique values', () => {
        const values = Object.values(FanGoal);
        const uniqueValues = [...new Set(values)];
        expect(values.length).toBe(uniqueValues.length);
    });
});

describe('Enum cross-compatibility', () => {
    test('should not have overlapping values between AgentState and StagePreference', () => {
        const stateValues = Object.values(AgentState);
        const preferenceValues = Object.values(StagePreference);
        
        const overlap = stateValues.filter(v => preferenceValues.includes(v));
        // Note: 'left' and 'right' are NOT in AgentState, so no overlap expected
        expect(overlap.length).toBe(0);
    });

    test('should not have overlapping values between StagePreference and QueueSide', () => {
        const preferenceValues = Object.values(StagePreference);
        const sideValues = Object.values(QueueSide);
        
        const overlap = preferenceValues.filter(v => sideValues.includes(v));
        // Note: 'left' and 'right' ARE in both, which is expected and acceptable
        // as they represent similar concepts in different contexts
        expect(overlap.length).toBe(2);
        expect(overlap).toContain('left');
        expect(overlap).toContain('right');
    });

    test('AgentState values should be compatible with string comparisons', () => {
        // This tests that the enum values work seamlessly with existing string comparisons
        expect(AgentState.IDLE === 'idle').toBe(true);
        expect(AgentState.MOVING === 'moving').toBe(true);
        expect(AgentState.LEAVING === 'leaving').toBe(true);
    });

    test('StagePreference values should be compatible with string comparisons', () => {
        expect(StagePreference.LEFT === 'left').toBe(true);
        expect(StagePreference.RIGHT === 'right').toBe(true);
        expect(StagePreference.NONE === 'none').toBe(true);
    });

    test('QueueSide values should be compatible with string comparisons', () => {
        expect(QueueSide.LEFT === 'left').toBe(true);
        expect(QueueSide.RIGHT === 'right').toBe(true);
    });
});
