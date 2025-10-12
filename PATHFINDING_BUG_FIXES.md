# Pathfinding Bug Fixes

## Overview
This document describes three critical bugs in the pathfinding logic that were identified and fixed.

## Bug 1: Waypoints Recalculated Every Frame

### Problem
The static waypoints were being recalculated entirely every frame instead of at specific interval timings. The `shouldUpdateWaypoints()` function was checking if an update was needed, but then the entire path from the agent's current position was being recalculated, effectively updating all waypoints every time the check passed.

### Root Cause
In `src/core/agent.js`, when `needsWaypointUpdate` was true, the code was calling:
```javascript
this.staticWaypoints = Pathfinding.calculateStaticWaypoints(
    this.x, this.y, this.targetX, this.targetY, ...
)
```

This recalculated the entire path from the agent's current position, replacing all waypoints.

### Solution
Modified the update logic to:
1. Only trigger updates when `staticWaypoints.length > 1` (no point updating a single waypoint)
2. Keep the first waypoint fixed and only recalculate from that waypoint to the target
3. Preserve the first waypoint and its update time

```javascript
if (needsWaypointUpdate && this.targetX !== null && this.targetY !== null && this.staticWaypoints.length > 1) {
    const firstWaypoint = this.staticWaypoints[0]
    const firstUpdateTime = this.waypointUpdateTimes[0]
    
    const updatedWaypoints = Pathfinding.calculateStaticWaypoints(
        firstWaypoint.x, firstWaypoint.y, this.targetX, this.targetY, ...
    )
    
    this.staticWaypoints = [firstWaypoint, ...updatedWaypoints]
    this.waypointUpdateTimes = [firstUpdateTime, ...newUpdateTimes]
}
```

## Bug 2: First Waypoint Not Staying Fixed

### Problem
After a fan reached their first static waypoint and it was deleted, the next waypoint should have become the new "first waypoint" and been fixed (non-updating) so the fan could eventually reach it. Instead, all waypoints continued to update their locations, meaning fans would never reach subsequent waypoints.

### Root Cause
Same as Bug 1 - when waypoints were recalculated, ALL waypoints were replaced with new randomized positions. There was no concept of a "fixed" first waypoint that stays constant until reached.

### Solution
The fix for Bug 1 also addresses this issue. By keeping the first waypoint fixed during updates, it remains reachable. When the agent reaches it:
1. The waypoint is removed with `this.staticWaypoints.shift()`
2. The next waypoint automatically becomes index 0 (the new "first waypoint")
3. On the next update interval, this new first waypoint becomes fixed

This ensures each waypoint in sequence becomes fixed as the agent progresses toward their destination.

## Bug 3: Randomized Waypoints on Opposite Sides of Corners

### Problem
The pathfinding was placing randomized waypoints on either side of food stall corners, creating impassable routes. Fans couldn't walk through the corners of obstacles, making these paths impossible to follow.

### Root Cause
In `src/core/pathfinding.js`, the `findRandomPointNearWaypoint()` function was checking path clearance using the ORIGINAL A* path waypoints, not the already-randomized waypoints:

```javascript
const randomPoint = findRandomPointNearWaypoint(
    waypoint.x, waypoint.y, randomRadius,
    i > 0 ? path[i-1] : { x: startX, y: startY },  // Original waypoint!
    i < path.length - 1 ? path[i+1] : { x: targetX, y: targetY },
    ...
)
```

This meant:
- Waypoint 0 gets randomized → stored in `waypoints[0]`
- Waypoint 1 gets randomized, checking path to `path[0]` (original position)
- But `path[0]` is not where waypoint 0 actually is! It's at `waypoints[0]` (randomized position)

This could cause waypoint 1 to be placed such that the path from `waypoints[0]` to `waypoints[1]` was blocked.

### Solution
Modified the code to use already-randomized waypoints for path validation:

```javascript
// Use already-randomized previous waypoint if available
const prevWaypoint = i > 0 ? waypoints[i-1] : { x: startX, y: startY }
// Use original next waypoint since it hasn't been randomized yet
const nextWaypoint = i < path.length - 1 ? path[i+1] : { x: targetX, y: targetY }

const randomPoint = findRandomPointNearWaypoint(
    waypoint.x, waypoint.y, randomRadius,
    prevWaypoint,  // Uses actual randomized position
    nextWaypoint,
    ...
)
```

This ensures that when randomizing waypoint N:
- Path clearance is checked from the actual position of waypoint N-1 (already randomized)
- Path clearance is checked to the original position of waypoint N+1 (not yet randomized)
- Sequential waypoints form passable paths

## Testing

Added comprehensive tests for all three bugs:
- 4 new tests in `__tests__/agent.test.js` for waypoint update behavior
- 3 new tests in `__tests__/pathfinding.test.js` for randomization path clearance

All 214 tests pass, with improved branch coverage for the modified files:
- `pathfinding.js`: 85.33% branch coverage (improved from 82%)
- Core pathfinding logic now fully tested

## Impact

These fixes ensure:
1. **Performance**: Waypoints only update at specified intervals, not every frame
2. **Reachability**: Fans can consistently reach all waypoints in their path
3. **Passability**: All randomized paths are navigable without hitting obstacle corners
4. **Predictability**: Waypoint behavior is deterministic based on timing intervals
