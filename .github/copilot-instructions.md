# GitHub Copilot Instructions for Festival Simulation

## CRITICAL: Instruction Compliance

**EXECUTE ALL INSTRUCTIONS COMPLETELY ON FIRST ATTEMPT**

When given instructions:
1. **Execute ALL parts immediately** - Do not ask for confirmation, clarification, or express concerns about complexity
2. **Verify completion of EVERY component** - Check that each part of multi-part instructions is addressed
3. **Update these instructions when told** - If instructed to modify `.github/copilot-instructions.md`, do so immediately
4. **Never waste resources with back-and-forth** - User can undo changes if needed; proceed with confidence
5. **No hedging or uncertainty** - Implement what is requested; user will provide feedback if changes is needed
6. **No verbose filler** - Never use phrases like "Given the time constraints", "Due to complexity", "Let me create a comprehensive", etc.
7. **Never defer work** - Do not use phrases like "follow-up work", "future updates", "addressed later", etc. Complete ALL work immediately
8. **Be concise** - Get straight to the point without unnecessary preamble or justifications

### Why This Matters
- Unnecessary confirmation requests waste user time
- Follow-up questions waste API request limits
- Hesitation wastes tokens and increases costs
- Back-and-forth delays project progress
- Verbose filler wastes token budget without adding value
- Deferring work means instructions are not followed completely

### Verification Checklist (Use Every Time)
Before responding to ANY instruction:
- [ ] Have I completed EVERY part of the instruction?
- [ ] If told to update copilot instructions, did I do it?
- [ ] Did I ask unnecessary confirmation questions?
- [ ] Did I express uncertainty instead of implementing?
- [ ] Did I make ALL the changes requested, not just some?
- [ ] Did I use verbose filler phrases that waste tokens?
- [ ] Did I defer any work to "follow-up" or "future"?

## Project Overview
This is an HTML5-based agent simulation of a music festival featuring agent-based modeling. The simulation runs in real-time with interactive controls for various festival events. The codebase uses pure vanilla JavaScript (ES6 modules) with no external runtime dependencies.

## MANDATORY: Test Coverage Standards

**NON-NEGOTIABLE REQUIREMENTS**

All code changes MUST meet these minimum coverage thresholds:
- **Line Coverage**: ≥80% (MANDATORY)
- **Branch Coverage**: 100% (MANDATORY)  
- **Function Coverage**: ≥70% (target)
- **Statement Coverage**: ≥80% (MANDATORY)

### Enforcement Rules
1. **No Exceptions**: Copilot cannot set lower coverage targets or make justifications for insufficient coverage
2. **No Subjective Standards**: Terms like "excellent" or "good" coverage below 80%/100% are NOT acceptable
3. **All Changes**: Every code change must include comprehensive tests meeting these standards
4. **Pull Request Requirement**: Cannot merge without meeting coverage thresholds
5. **No Workarounds**: Cannot skip tests, comment out coverage checks, or reduce thresholds

### When Adding New Code
- Write tests FIRST or immediately after implementation
- Cover ALL code paths including edge cases and error conditions
- Test boundary conditions and invalid inputs
- Verify all branches (if/else, switch cases, ternaries, logical operators)
- Mock external dependencies properly

### Coverage Verification
Run `npm test -- --coverage` to check coverage. The command will fail if thresholds are not met.

### Why These Standards
- 80% line coverage ensures most code is executed in tests
- 100% branch coverage ensures all decision paths are tested
- High coverage prevents regressions and catches bugs early
- Comprehensive tests serve as documentation
- Makes refactoring safer and faster

**REMEMBER**: These are MINIMUM standards. Strive for higher coverage when practical.

## Debugging Philosophy

### Finding Mechanical/System Issues
When debugging movement or collision issues in agent simulations:

1. **Check State-Based Permissions First**: Before investigating complex behavior logic, verify that agents in different states have the correct permissions to pass through obstacles or interact with systems
   - Example: If agents are being pushed sideways after passing through an area, check if their state allows them to pass through that area's obstacles
   - Check BOTH collision detection (`checkCollision()`) AND collision resolution (`resolveCollision()`)

2. **Trace the Full Data Flow**: Issues often stem from state management inconsistencies
   - Check what state an agent is in at each stage of a process
   - Verify state transitions happen at the right time
   - Look for missing state values in conditional logic

3. **Test Isolated Systems**: When multiple systems interact (collision + movement + queuing), test each in isolation
   - Does collision detection work correctly for each state?
   - Does movement logic set correct targets?
   - Do queue systems update positions frequently enough?

4. **Visual Debugging is Critical**: In spatial/movement bugs, visual inspection often reveals the issue faster than code review
   - Take screenshots showing the problem
   - Compare expected vs actual positions
   - Look for patterns (e.g., "always moves right" = check perpendicular collision avoidance)

### Postmortem: Security Queue Rightward Drift Issue
**Problem**: Fans drifted to the right after passing through security, despite fixes to wandering behavior, state transitions, and target positioning.

**Root Cause**: The `passed_security` state was not included in the list of allowed states to pass through security obstacles in `obstacles.js`. When fans moved toward the center, they collided with security obstacles and the collision avoidance code pushed them perpendicular (to the right).

**Why Previous Attempts Failed**:
1. Initially focused on behavioral issues (wandering, state transitions)
2. Checked target positioning logic
3. Did not systematically check obstacle permissions for the specific state
4. Did not check BOTH `checkCollision()` AND `resolveCollision()` methods

**Lesson Learned**: For movement/collision issues, always check state-based permissions in ALL collision-related methods before investigating complex behavior logic.

## Architecture

### Core Principles
- **Modular Design**: Separation of concerns with dedicated files for each component
- **Object-Oriented**: Base `Agent` class with `Fan` subclass for extensibility
- **Canvas Rendering**: High-performance 2D canvas rendering
- **Frame Independence**: Delta time-based movement for consistent behavior across frame rates
- **Test-Driven**: Comprehensive Jest test suite with 62 passing tests

### Key Components
- **agent.js**: Base Agent class with collision detection and movement
- **fan.js**: Fan subclass with hunger system, stage preferences, and behavior logic
- **pathfinding.js**: Static waypoint calculation and obstacle avoidance
- **simulation.js**: Simulation engine managing frame rate and delta time
- **renderer.js**: Canvas rendering with visual feedback (timers, borders)
- **eventManager.js**: Event handling, show management, and agent instantiation
- **securityQueue.js**: Queue processing for security checks with walk-up-to-process model
- **foodStall.js**: Food stall queue management with walk-up-to-process model
- **obstacles.js**: Collision detection for static objects (stages, stalls, bus)
- **config.js**: Centralized configuration constants
- **app.js**: Application entry point and UI event wiring

### File Organization
The project uses a flat structure for simplicity. All source files are in the root directory, tests are in `__tests__/`.

## Coding Standards

### JavaScript Style
- Use ES6 modules (`import`/`export`)
- Follow existing naming conventions (camelCase for variables/functions, UPPER_SNAKE_CASE for constants)
- No semicolons (existing code style)
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Keep functions focused and single-purpose

### Classes
- Constructor parameters: `(x, y, config)` pattern for agents
- Always call `super()` in subclass constructors
- Use `this.type` to identify agent types
- Implement `update(deltaTime, simulationSpeed, otherAgents)` for behavior
- Keep state in instance properties

### Configuration
- All magic numbers should be defined in `config.js`
- Use `CONFIG` object for all constants
- Position values are relative (0-1 range) for responsive layout
- Time values are in milliseconds
- Color values use hex format

### Performance Considerations
- Maintain 40+ FPS with 100 agents
- Use efficient collision detection (O(n) per agent)
- Avoid creating objects in update loops
- Cache frequently accessed values
- Keep draw calls minimal

## Testing

### Test Framework
- Jest with jsdom environment
- Test files in `__tests__/` directory
- Naming: `[component].test.js`
- 70% coverage threshold (branches, functions, lines, statements)

### Test Patterns
- Mock canvas context with jest.fn()
- Mock config imports
- Test edge cases and error conditions
- Use descriptive test names
- Group related tests with `describe()`

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Common Tasks

### Adding a New Agent Type
1. Create class extending `Agent` (see `fan.js` as example)
2. Add colors and settings to `config.js`
3. Update `EventManager` to instantiate new type
4. Add UI controls in `index.html` if needed
5. Wire event handlers in `app.js`
6. Create test file in `__tests__/`

### Adding a New Feature
1. Define constants in `config.js` first
2. Implement logic in appropriate module
3. Add visual feedback in `renderer.js` if needed
4. Update `README.md` documentation
5. Add tests with edge cases
6. Verify performance impact

### Modifying Movement Behavior
- Movement is in `agent.js` base class
- Behavior logic is in `fan.js` subclass
- Use delta time for frame independence
- Consider collision detection with obstacles
- Test at different simulation speeds

## Important Constraints

### What NOT to Change
- Flat file structure (don't create subdirectories)
- ES6 module system (no bundlers)
- Pure vanilla JavaScript (no frameworks)
- Canvas rendering approach
- Frame rate limiting (60 FPS cap)
- Delta time movement system

### Dependencies
- **Production**: Zero runtime dependencies
- **Development**: Jest and jest-environment-jsdom only
- Don't add new dependencies without strong justification

## Accessibility
- WCAG 2.1 compliant
- ARIA labels on all interactive elements
- Keyboard navigation support
- Minimum 44px touch targets
- High contrast mode support
- Reduced motion support

## Browser Compatibility
- Modern browsers with ES6 module support
- Chrome, Firefox, Safari, Edge (latest versions)
- No polyfills or transpilation
- JavaScript must be enabled

## Documentation
- Update `README.md` for user-facing changes
- Add JSDoc comments for public methods
- Keep comments minimal and meaningful
- Document "why" not "what"
- Update tests when changing behavior

## Performance Targets
- 40+ FPS with 100 agents
- Minimal memory allocation in update loops
- No memory leaks
- Responsive controls (<100ms latency)
- Fast initial load (<1s)

## Git Workflow
- Keep commits focused and atomic
- Write descriptive commit messages
- Update tests with code changes
- Verify tests pass before committing
- Don't commit `node_modules/` or `coverage/`

## Visual Design
- Dark theme (#0a0a0a background)
- Color-coded agents by state
- Minimal UI with clear labels
- Visual feedback for all interactions
- Responsive canvas sizing

## Common Pitfalls to Avoid
- Don't use synchronous operations in update loops
- Don't create new objects per frame
- Don't bypass collision detection
- Don't hardcode positions (use config)
- Don't break frame independence
- Don't remove or modify tests without good reason
- Don't add features that degrade performance
- **Don't leave duplicate code** - Always refactor shared logic into reusable modules
- **Don't leave broken features** - If waypoint pathfinding is implemented, ensure it actually works
- **Don't accept "mostly working"** - Queue positioning must be accurate, not approximate
- **Always verify fixes visually** - Code that looks correct may still have bugs

## Critical Implementation Rules
1. **Shared Logic Must Be Truly Shared**: When told to refactor duplicate code, move ALL shared logic to the shared module, not just sorting
2. **Pathfinding System**: All static waypoint logic lives in pathfinding.js module. Agent.js imports and uses it via pure function calls
3. **Queue Processing Model**: Queues use walk-up-to-process model where fans move to processing position after reaching queue front
4. **Complete the Work**: When instructed to fix something, fix it completely - don't leave it "partially working"

## Pathfinding System

### Overview
The simulation uses a two-tiered waypoint system:
- **Static waypoints**: Route around fixed obstacles (stages, food stalls). Calculated when setting new target.
- **Dynamic waypoints**: Avoid other moving fans. Recalculated every frame.

### Static Waypoints (pathfinding.js)
- Generated when fan starts moving to new destination
- Always includes final destination as last waypoint (minimum 1 waypoint)
- Uses up to 6 waypoints to navigate around obstacles
- Randomization applied to prevent all fans taking identical routes:
  - Radius increases for waypoints further from destination
  - Final waypoint: 0 radius (exact destination)
  - Previous waypoint: 1 fan diameter radius
  - Earlier waypoints: 2, 3, 4... fan diameters
- Progressive updates: First waypoint updated every 125 ticks at 1x speed
- Waypoint removal: When fan reaches waypoint (within 10 pixels), remove it from list

### States and Pathfinding
- **Moving fans**: Use pathfinding (moving, approaching_queue, passed_security)
- **Stationary fans**: No pathfinding (idle, in_queue, processing)
- **Queue movement**: Uses simplified 1-waypoint pathfinding (straight to position)

### Dynamic Waypoints (agent.js)
- Calculated every frame for responsive fan avoidance
- Uses 30-degree avoidance angle
- Local knowledge limit (100 pixels detection distance)
- Takes precedence over static waypoints when active

### Walk-up-to-Process Model
- **Security Queue**: Fan reaches queue front → walks to processing position → gets processed → either passes or returns to end of line
- **Food Stalls**: Fan reaches queue front → walks to stall counter → gets processed → leaves
- **Processing state**: Fans in 'processing' state are not in queue, have specific target positions
- **Enhanced security**: Fans flagged for enhanced security walk to end of line after initial processing, using dynamic waypoints to avoid queued fans

## Resources
- Main docs: `README.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- Test examples: `__tests__/*.test.js`
- Canvas API: MDN Web Docs
