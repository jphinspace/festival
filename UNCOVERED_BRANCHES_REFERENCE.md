# Uncovered Branches - Detailed Reference

This document provides the exact line-by-line analysis of every uncovered branch in the codebase, with specific code context and test requirements.

## Summary Table

| File | Branch Coverage | Uncovered Branches (Est.) | Difficulty |
|------|----------------|---------------------------|------------|
| pathfinding.js | 89.28% | ~15 branches | Very Hard |
| queuedProcessor.js | 79.16% | ~5 branches | Hard |
| securityQueue.js | 86.95% | ~3 branches | Medium |
| agent.js | 97.19% | ~2 branches | Medium |
| fan.js | 97.61% | ~1 branch | Easy |
| eventManager.js | 91.13% | ~3 branches | Hard (async) |
| queueManager.js | 95.23% | ~2 branches | Easy |
| metricsCollector.js | 97.91% | ~1 branch | Hard |

**Total Estimated Uncovered Branches: ~32**

---

## pathfinding.js (89.28% coverage)

### Branch 1: Line 51 - Ternary for next waypoint

**Code**:
```javascript
const nextWaypoint = i < path.length - 1 ? path[i+1] : { x: targetX, y: targetY }
```

**Uncovered Branch**: False case (`i >= path.length - 1`)

**Context**: This is inside the loop that randomizes waypoints. When `i` is the last index, we use the final target instead of looking ahead.

**Why Uncovered**: Tests always create paths with multiple waypoints, so `i < path.length - 1` is always true except on the last iteration. But on the last iteration (line 39-41), we take the `if (isDestination)` branch which doesn't use `nextWaypoint` at all.

**How to Cover**: Need a scenario where:
1. Path has exactly 1 waypoint (the destination)
2. Loop runs once with i=0
3. i=0 is also path.length-1, so condition is false

**Test Scenario**:
```javascript
test('should use final target when last waypoint', () => {
    // Create scenario with minimal waypoints
    mockObstacles.obstacles = []
    
    const waypoints = calculateStaticWaypoints(100, 100, 150, 150, mockObstacles, 3, 0, mockConfig)
    
    // Direct path should create single waypoint
    expect(waypoints.length).toBe(1)
    expect(waypoints[0]).toEqual({ x: 150, y: 150 })
})
```

**Challenge**: When path is clear (no obstacles), the function returns early at line 22-24, never entering the loop. Need a path that requires waypoints but only generates one.

---

### Branch 2: Line 64 - Fallback to original waypoint

**Code**:
```javascript
waypoints.push(randomPoint || waypoint) // Fall back to original if can't find valid random point
```

**Uncovered Branch**: When `randomPoint` is falsy (null/undefined)

**Context**: After trying to find a randomized point near the waypoint, if none found, use original.

**Why Uncovered**: `findRandomPointNearWaypoint` has 50 attempts and always succeeds in test scenarios. Returns original waypoint if all attempts fail (line 290), which is truthy.

**How to Cover**: Need all 50 randomization attempts to fail. This happens when:
- Area around waypoint is completely filled with obstacles
- Or paths from/to random points are always blocked

**Test Scenario**:
```javascript
test('should fallback to original waypoint when randomization completely fails', () => {
    // Create complete obstacle coverage
    const obstacles = []
    for (let x = 0; x < 400; x += 10) {
        for (let y = 0; y < 400; y += 10) {
            obstacles.push({ x, y, width: 9, height: 9, type: 'stage' })
        }
    }
    mockObstacles.obstacles = obstacles
    
    // Small gaps between obstacles for path but random points hit obstacles
    const waypoints = calculateStaticWaypoints(5, 5, 395, 395, mockObstacles, 3, 0, mockConfig)
    
    // Should still return waypoints (using fallback)
    expect(waypoints.length).toBeGreaterThan(0)
})
```

**Challenge**: Actually, `findRandomPointNearWaypoint` returns `{ x: waypointX, y: waypointY }` on failure (line 290), which is truthy. So `randomPoint || waypoint` always uses `randomPoint`. This branch may be **impossible to cover** without changing the code.

---

### Branch 3: Line 103 - Zero distance to target

**Code**:
```javascript
if (toTargetDist > 0) {
    // Calculate direction bonus
}
```

**Uncovered Branch**: Else case (`toTargetDist <= 0`)

**Context**: In `calculateCornerScore`, calculating direction bonus only if not already at target.

**Why Uncovered**: Tests never call pathfinding from exact target position.

**How to Cover**: Start pathfinding from target position.

**Test Scenario**:
```javascript
test('should handle agent starting at target position', () => {
    mockObstacles.obstacles = [
        { x: 195, y: 195, width: 10, height: 10, type: 'stage' }
    ]
    
    // Start and end at same position (with obstacle nearby to trigger pathfinding)
    const waypoints = calculateStaticWaypoints(200, 200, 200, 200, mockObstacles, 3, 0, mockConfig)
    
    expect(waypoints).toEqual([{ x: 200, y: 200 }])
})
```

**Challenge**: When start equals target, we return early (line 22-24) if path is clear, or potentially get stuck in pathfinding. Need to ensure this scenario is handled gracefully.

---

### Branch 4: Line 135 - Corner inside obstacle

**Code**:
```javascript
if (isPointInsideObstacle(corner.x, corner.y, obstacles, radius, personalSpaceBuffer)) {
    continue
}
```

**Uncovered Branch**: True case (corner IS inside an obstacle)

**Context**: When evaluating corners around an obstacle, skip if corner lands inside another obstacle.

**Why Uncovered**: Tests use simple obstacle layouts where corners don't overlap.

**How to Cover**: Create overlapping or adjacent obstacles where corner of one is inside another.

**Test Scenario**:
```javascript
test('should skip corners that are inside obstacles', () => {
    // Create obstacles where corners overlap
    mockObstacles.obstacles = [
        { x: 100, y: 100, width: 50, height: 50, type: 'stage' },
        { x: 140, y: 100, width: 50, height: 50, type: 'foodStall' }, // Overlaps first
        { x: 180, y: 100, width: 50, height: 50, type: 'stage' } // Overlaps second
    ]
    
    const waypoints = calculateStaticWaypoints(50, 125, 250, 125, mockObstacles, 3, 5, mockConfig)
    
    // Should find path around, skipping invalid corners
    expect(waypoints.length).toBeGreaterThan(0)
    expect(waypoints[waypoints.length - 1]).toEqual({ x: 250, y: 125 })
})
```

**Difficulty**: Medium - requires careful obstacle placement.

---

### Branch 5: Line 205 - No blocking obstacles

**Code**:
```javascript
if (blockingObstacles.length === 0) {
    break // No obstacles in the way
}
```

**Uncovered Branch**: True case (no obstacles found)

**Context**: After checking if we can go straight to target (line 197), if path isn't clear but we also find no blocking obstacles, break the loop.

**Why Uncovered**: This is a defensive check. If `isPathClear` returns false (line 197), then `findBlockingObstacles` should find at least one obstacle. This branch catches inconsistencies.

**How to Cover**: Create a scenario where `isPathClear` and `findBlockingObstacles` disagree. This could happen with:
- Edge detection edge cases
- Floating-point precision issues
- Buffer zone mismatches

**Test Scenario**: This may be **impossible to cover** without artificially creating an inconsistent state or finding a geometric edge case where the two functions disagree.

---

### Branch 6: Lines 226-231 - Midpoint fallback

**Code**:
```javascript
for (const midPoint of midPoints) {
    if (!isPointInsideObstacle(midPoint.x, midPoint.y, obstacles, radius, personalSpaceBuffer) &&
        isPathClear(currentX, currentY, midPoint.x, midPoint.y, obstacles, radius, personalSpaceBuffer)) {
        waypoints.push(midPoint)
        currentX = midPoint.x
        currentY = midPoint.y
        break
    }
}
```

**Uncovered Branch**: True case (entire if condition)

**Context**: When all corners around an obstacle are invalid, try midpoints along edges.

**Why Uncovered**: `findBestCorner` always finds a valid corner in test scenarios.

**How to Cover**: Create obstacle configuration where all 4 corners are blocked but midpoints are accessible.

**Test Scenario**:
```javascript
test('should use midpoint when all corners are blocked', () => {
    // Create main obstacle
    const mainObs = { x: 150, y: 150, width: 40, height: 40, type: 'stage' }
    
    // Block all 4 corners with smaller obstacles
    const buffer = 20
    mockObstacles.obstacles = [
        mainObs,
        // Block corners
        { x: mainObs.x - buffer - 5, y: mainObs.y - buffer - 5, width: 10, height: 10, type: 'stage' }, // TL
        { x: mainObs.x + mainObs.width + buffer - 5, y: mainObs.y - buffer - 5, width: 10, height: 10, type: 'stage' }, // TR
        { x: mainObs.x - buffer - 5, y: mainObs.y + mainObs.height + buffer - 5, width: 10, height: 10, type: 'stage' }, // BL
        { x: mainObs.x + mainObs.width + buffer - 5, y: mainObs.y + mainObs.height + buffer - 5, width: 10, height: 10, type: 'stage' } // BR
    ]
    
    const waypoints = calculateStaticWaypoints(100, 170, 250, 170, mockObstacles, 3, 0, mockConfig)
    
    // Should find path using midpoints
    expect(waypoints.length).toBeGreaterThanOrEqual(1)
})
```

**Difficulty**: Very Hard - requires precise obstacle placement and may need multiple attempts.

---

### Branch 7: Line 258 - Zero random radius

**Code**:
```javascript
if (randomRadius === 0) {
    return { x: waypointX, y: waypointY } // No randomization for destination
}
```

**Uncovered Branch**: True case

**Context**: Early return if no randomization requested.

**Why Uncovered**: In the main loop (line 35-66), final waypoint takes the `if (isDestination)` branch (line 39-41) and never calls `findRandomPointNearWaypoint`. Non-final waypoints always have non-zero `randomRadius` (line 46).

**How to Cover**: Would need to call `findRandomPointNearWaypoint` directly with `randomRadius = 0`, or modify the waypoint generation logic.

**Test Scenario**:
```javascript
// This would require testing the internal function directly
// Current test infrastructure doesn't export internal functions
```

**Difficulty**: Hard - function is not exported. Would need to either:
1. Export it for testing
2. Create a scenario in main flow that calls it with 0 (currently impossible)
3. Accept this branch as defensive code

---

### Branch 8: Line 277 - Random point blocks path from previous

**Code**:
```javascript
if (!isPathClear(prevWaypoint.x, prevWaypoint.y, randomX, randomY, obstacles, radius, personalSpaceBuffer)) {
    continue
}
```

**Uncovered Branch**: True case (path is NOT clear)

**Context**: When testing a random point, verify path from previous waypoint is clear.

**Why Uncovered**: Random points in tests always land in clear areas.

**How to Cover**: Dense obstacle field where many random positions block paths.

**Test Scenario**: Similar to Branch 2 - need dense obstacles. Difficult because randomization has 50 attempts.

---

### Branch 9: Line 364 - Very close to target

**Code**:
```javascript
if (distToTarget < radius * 2) {
    continue // Very close to target
}
```

**Uncovered Branch**: True case

**Context**: When target is near an obstacle but we're very close to target, don't treat obstacle as blocking.

**Why Uncovered**: Tests don't create scenarios with agent within 2*radius of target with obstacle nearby.

**How to Cover**: Position agent 5 pixels from target with obstacle adjacent to target.

**Test Scenario**:
```javascript
test('should not treat obstacle as blocking when very close to target', () => {
    const radius = 3
    mockObstacles.obstacles = [
        { x: 200, y: 195, width: 20, height: 20, type: 'stage' } // Next to target
    ]
    
    // Agent 5 pixels from target (less than radius * 2 = 6)
    const waypoints = calculateStaticWaypoints(195, 200, 200, 200, mockObstacles, radius, 0, mockConfig)
    
    expect(waypoints).toBeDefined()
})
```

**Difficulty**: Medium - requires precise positioning.

---

### Branch 10: Lines 373-377 - Obstacle direction check

**Code**:
```javascript
if (distToTarget > 0 && distToObs > 0) {
    const dotProduct = (toObsX * toTargetX + toObsY * toTargetY) / (distToObs * distToTarget)
    if (dotProduct < 0.5) {
        continue // Obstacle not in path forward
    }
}
```

**Uncovered Branches**: 
- Line 373 else: When `distToTarget <= 0 || distToObs <= 0`
- Line 375 true: When `dotProduct < 0.5`

**Context**: Check if obstacle is in the direction we're traveling.

**Why Uncovered**: 
- Else: Zero distance scenarios rare
- True: Tests don't create obstacles behind or to the side of path

**How to Cover**: 
- Else: Agent at target or at obstacle center (geometry edge case)
- True: Obstacle perpendicular to path direction

**Difficulty**: Hard - requires specific geometric arrangements.

---

### Branch 11: Line 511 - Self-comparison

**Code**:
```javascript
if (other === agent) continue
```

**Uncovered Branch**: True case

**Context**: When checking other agents for avoidance, skip self.

**Why Uncovered**: Tests never include agent in its own `otherAgents` array.

**How to Cover**: Pass agent in its own `otherAgents` array.

**Test Scenario**:
```javascript
test('should skip self when in other agents list', () => {
    const agent = new Agent(100, 100, mockConfig)
    agent.targetX = 200
    agent.targetY = 200
    
    // Include agent in its own list (defensive check)
    const otherAgents = [agent, new Agent(150, 150, mockConfig)]
    
    const waypoint = calculateDynamicFanAvoidance(agent, otherAgents, 200, 200, mockObstacles, mockConfig)
    
    // Should not crash or create weird avoidance for self
    expect(waypoint).toBeDefined()
})
```

**Difficulty**: Easy - this is a defensive check that should be trivial to cover.

---

### Branch 12: Line 545 - Avoid left vs right

**Code**:
```javascript
const angle = avoidRight ? -AVOIDANCE_ANGLE : AVOIDANCE_ANGLE
```

**Uncovered Branch**: True case (`avoidRight` is false, so avoid left)

**Context**: When avoiding another agent, turn left or right based on cross product.

**Why Uncovered**: Cross product calculation (line 533) always results in same direction in tests.

**How to Cover**: Position agents so cross product is negative (other agent on right side).

**Test Scenario**:
```javascript
test('should avoid left when other agent is on right', () => {
    const agent = new Agent(100, 100, mockConfig)
    agent.targetX = 200
    agent.targetY = 100 // Moving right
    agent.state = 'moving'
    
    // Other agent ahead and to the right
    const otherAgent = new Agent(150, 90, mockConfig)
    
    const waypoint = calculateDynamicFanAvoidance(agent, [otherAgent], 200, 100, mockObstacles, mockConfig)
    
    // Should create waypoint to the left (positive Y adjustment)
    if (waypoint) {
        expect(waypoint.y).toBeGreaterThan(100)
    }
})
```

**Difficulty**: Medium - requires understanding of cross product and precise positioning.

---

### Branch 13: Line 560 - Personal space buffer ternary

**Code**:
```javascript
const personalSpaceBuffer = (agent.state === AgentState.APPROACHING_QUEUE || agent.state === AgentState.MOVING) ? 
    config.PERSONAL_SPACE : 0
```

**Uncovered Branch**: False case (return 0)

**Context**: When validating dynamic waypoint, use personal space buffer for certain states.

**Why Uncovered**: Tests only create agents in APPROACHING_QUEUE or MOVING states.

**How to Cover**: Call `calculateDynamicFanAvoidance` with agent in different state (IDLE, WAITING, etc.).

**Test Scenario**:
```javascript
test('should use zero buffer for non-moving states', () => {
    const agent = new Agent(100, 100, mockConfig)
    agent.targetX = 200
    agent.targetY = 100
    agent.state = AgentState.IDLE // Not moving
    
    const otherAgent = new Agent(150, 100, mockConfig)
    
    const waypoint = calculateDynamicFanAvoidance(agent, [otherAgent], 200, 100, mockObstacles, mockConfig)
    
    // Should still compute waypoint without error
    expect(waypoint).toBeDefined()
})
```

**Difficulty**: Easy

---

## queuedProcessor.js (79.16% coverage)

### Branch 1: Line 150 - Fan reaches target while advancing

**Code**:
```javascript
} else if (fan.state === AgentState.IN_QUEUE_ADVANCING && isAtTarget) {
    fan.state = AgentState.IN_QUEUE_WAITING
}
```

**Uncovered Branch**: True case (entire condition)

**Context**: When fan is advancing in queue and reaches target position, switch to waiting.

**Why Uncovered**: Tests transition fan states before they physically reach target positions. Line 148-149 transition to ADVANCING, but tests don't let enough time pass for fan to actually reach target.

**How to Cover**: Create fan in ADVANCING state, position at target, then update.

**Test Scenario**:
```javascript
test('should transition from ADVANCING to WAITING when reaching target', () => {
    const fan = new Fan(360, 430, mockConfig)
    fan.state = AgentState.IN_QUEUE_ADVANCING
    fan.queueIndex = 0
    fan.inQueue = true
    fan.targetX = 360
    fan.targetY = 430
    fan.x = 360
    fan.y = 430 // Exactly at target
    
    queueProcessor.queues[0].push(fan)
    queueProcessor.update(1000)
    
    expect(fan.state).toBe(AgentState.IN_QUEUE_WAITING)
})
```

**Difficulty**: Medium - requires careful state setup.

---

## securityQueue.js (86.95% coverage)

### Branch 1: Lines 322-326 - Processing state changes

**Code**:
```javascript
// Update queue positions if we started processing someone
if (newProcessing !== this.processing[queueIndex]) {
    this.processing[queueIndex] = newProcessing
    if (newProcessing !== null) {
        this.updateQueuePositions(queueIndex, true)
    }
}
```

**Uncovered Branches**:
- Line 322 false: `newProcessing === this.processing[queueIndex]` (no change)
- Line 324 false: `newProcessing === null` (cleared processing)

**Context**: After trying to process next fan, update state if changed.

**Why Uncovered**:
- Line 322 false: Tests always have state changes
- Line 324 false: Complex nested condition - line 322 must be true (state changed) but new state is null

**How to Cover**:
- Line 322 false: Update when no fans are ready to process
- Line 324 false: Transition from processing someone to processing nobody (while still satisfying line 322)

**Test Scenario for Line 322 false**:
```javascript
test('should not update positions when processing state unchanged', () => {
    securityQueue.processing[0] = null // No one processing
    
    securityQueue.update(1000) // Update with no fans in queue
    
    // updateQueuePositions should not be called
    expect(securityQueue.processing[0]).toBeNull()
})
```

**Test Scenario for Line 324 false**:
```javascript
test('should handle processing transition to null', () => {
    const fan = new Fan(360, 424, mockConfig)
    fan.state = AgentState.PROCESSING
    securityQueue.processing[0] = fan
    
    // Complete processing - this transitions to null
    securityQueue.update(mockConfig.REGULAR_SECURITY_TIME + 100)
    
    // After release, processing should be null
    expect(securityQueue.processing[0]).toBeNull()
})
```

**Difficulty**: Hard - nested conditionals require specific state sequences.

---

## agent.js (97.19% coverage)

### Branch 1: Line 248 - Path recalculation

**Code**:
```javascript
// Recalculate path from current position to final target
if (this.staticWaypoints.length === 0 && this.targetX !== null && this.targetY !== null) {
    // No more waypoints, but we haven't reached final target yet
    // Recalculate path from current position
    if (obstacles && StateChecks.needsPathfinding(this.state)) {
        this.staticWaypoints = Pathfinding.calculateStaticWaypoints(
            this.x, this.y, this.targetX, this.targetY, 
            obstacles, this.radius, personalSpaceBuffer, this.config
        )
    }
}
```

**Uncovered Branch**: Specific nested condition combination

**Context**: When all waypoints exhausted but target not reached, recalculate path.

**Why Uncovered**: Tests don't create scenario where agent exhausts waypoints mid-journey.

**How to Cover**: Agent with target, no waypoints, in moving state.

**Test Scenario**:
```javascript
test('should recalculate path when waypoints exhausted', () => {
    agent.state = 'moving'
    agent.x = 150
    agent.y = 150
    agent.targetX = 300
    agent.targetY = 300
    agent.staticWaypoints = [] // Exhausted all waypoints
    
    // Add obstacle so path needs recalculation
    mockObstacles.obstacles = [
        { x: 200, y: 200, width: 50, height: 50, type: 'stage' }
    ]
    
    agent.update(0.016, 1.0, [], mockObstacles, 100)
    
    expect(agent.staticWaypoints.length).toBeGreaterThan(0)
})
```

**Difficulty**: Medium

---

## fan.js (97.61% coverage)

### Branch 1: Line 114 - Start wandering

**Code**:
```javascript
if (StateChecks.shouldWander(this.state, this.currentShow, this.inQueue)) {
    // If fan has no target (reached previous wander target), pick a new one
    if (this.targetX === null && this.targetY === null) {
        this.startWandering(obstacles)
    }
}
```

**Uncovered Branch**: Inner if condition (lines 114)

**Context**: When in wandering-eligible state with no target, start wandering.

**Why Uncovered**: Tests set targets when putting fans in wandering states.

**How to Cover**: Fan in IDLE state with no target.

**Test Scenario**:
```javascript
test('should start wandering when idle with no target', () => {
    fan.state = AgentState.IDLE
    fan.targetX = null
    fan.targetY = null
    fan.currentShow = null
    fan.inQueue = false
    
    fan.update(0.016, 1.0, [], mockObstacles, 100, 1000)
    
    // Should have set new wander target
    expect(fan.targetX).not.toBeNull()
    expect(fan.targetY).not.toBeNull()
})
```

**Difficulty**: Easy

---

## eventManager.js (91.13% coverage)

### Branch 1: Lines 303-307 - setTimeout cleanup

**Code**:
```javascript
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
```

**Uncovered Branch**: Line 306 true case

**Context**: After bus departure timeout, remove agents that are LEAVING and near bus.

**Why Uncovered**: setTimeout is hard to test, especially with real timers.

**How to Cover**: Use Jest fake timers.

**Test Scenario**:
```javascript
test('should remove leaving agents after timeout', () => {
    jest.useFakeTimers()
    
    const agents = []
    const fan = new Fan(500, busY, mockConfig)
    fan.state = AgentState.LEAVING
    agents.push(fan)
    
    eventManager.handleBusDeparture(agents, mockConfig, 100, 100)
    
    // Fast-forward time
    jest.advanceTimersByTime(3000)
    
    // Agent should be removed
    expect(agents.length).toBe(0)
    
    jest.useRealTimers()
})
```

**Difficulty**: Hard - asynchronous code with timers

---

## queueManager.js (95.23% coverage)

### Branch 1: Line 256 - Timestamp not null

**Code**:
```javascript
// Track timestamp for metrics (when fan enters queue)
if (simulationTime !== null) {
    fan.inQueueStartTime = simulationTime;
    // Clear approaching timestamp since they're now in queue
    fan.approachingStartTime = null;
}
```

**Uncovered Branch**: False case (`simulationTime === null`)

**Context**: Set timestamp when adding fan to queue.

**Why Uncovered**: Tests always provide simulationTime.

**How to Cover**: Call with null simulationTime.

**Test Scenario**:
```javascript
test('should handle null simulationTime', () => {
    const fan = new Fan(360, 450, mockConfig)
    
    const result = queueManager.addToQueue(fan, null)
    
    expect(result).toBe(true)
    expect(fan.inQueue).toBe(true)
    // inQueueStartTime should not be set
})
```

**Difficulty**: Easy

---

## metricsCollector.js (97.91% coverage)

### Branch 1: Line 130 - isFanStuck returns true

**Code**:
```javascript
// Metric 8: Count stuck fans (stationary while not idle or in_queue_waiting)
if (this.isFanStuck(fan)) {
    stuckFans++
}
```

**Uncovered Branch**: True case

**Context**: Count fans that appear stuck.

**Why Uncovered**: `isFanStuck` implementation is conservative and returns false for most states:
- Returns false for IDLE, IN_QUEUE_WAITING, PROCESSING, PASSED_SECURITY
- Returns false for fans without targets
- Currently doesn't have logic that returns true

**How to Cover**: Would need to modify `isFanStuck` to actually detect stuck fans, or create a scenario where it returns true.

**Test Scenario**: This requires understanding what "stuck" means:

```javascript
test('should detect stuck fans', () => {
    const fan = new Fan(100, 100, mockConfig)
    fan.state = AgentState.MOVING
    fan.targetX = 200
    fan.targetY = 200
    fan.previousX = 100
    fan.previousY = 100
    // Fan hasn't moved for several frames while trying to move
    
    const metrics = MetricsCollector.collectMetrics([fan], 1000)
    
    expect(metrics.stuckFans).toBeGreaterThan(0)
})
```

**Difficulty**: Hard - requires defining and implementing stuck detection logic.

---

## Summary of Difficulty Levels

### Easy (Can complete in 1-2 hours)
- fan.js line 114
- queueManager.js line 256
- pathfinding.js line 511 (self-comparison)
- pathfinding.js line 560 (state ternary)

### Medium (Can complete in 3-6 hours)
- agent.js line 248
- pathfinding.js line 103 (zero distance)
- pathfinding.js line 135 (corner in obstacle)
- pathfinding.js line 364 (close to target)
- pathfinding.js line 545 (avoid left)
- queuedProcessor.js line 150

### Hard (Requires 8-12 hours)
- eventManager.js lines 303-307 (async)
- securityQueue.js lines 322-326 (nested conditions)
- pathfinding.js line 373-377 (geometry)
- metricsCollector.js line 130 (needs implementation)
- pathfinding.js line 277 (dense obstacles)

### Very Hard / May Be Impossible (16+ hours or code changes required)
- pathfinding.js line 64 (fallback - always returns truthy)
- pathfinding.js line 205 (defensive check - logic inconsistency)
- pathfinding.js lines 226-231 (midpoint fallback)
- pathfinding.js line 258 (not called with 0 in normal flow)

---

## Conclusion

To reach 100% branch coverage would require:

1. **Easy wins** (5-8 branches): 2-4 hours
2. **Medium complexity** (8-10 branches): 8-16 hours
3. **Hard cases** (6-8 branches): 16-32 hours
4. **Very hard/impossible** (6-8 branches): 40+ hours or code refactoring

**Total estimated effort**: 60-100+ hours

**Realistic target**: 95-97% coverage (covering easy and medium branches) - approximately 10-20 hours of focused work.

**Recommended approach**: Accept 95% as "complete" and document remaining branches as edge cases, defensive programming, or requiring refactoring to test.
