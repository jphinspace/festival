# GitHub Copilot Instructions for Festival Simulation

## Project Overview
This is an HTML5-based agent simulation of a music festival featuring agent-based modeling. The simulation runs in real-time with interactive controls for various festival events. The codebase uses pure vanilla JavaScript (ES6 modules) with no external runtime dependencies.

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
- **simulation.js**: Simulation engine managing frame rate and delta time
- **renderer.js**: Canvas rendering with visual feedback (timers, borders)
- **eventManager.js**: Event handling, show management, and agent instantiation
- **securityQueue.js**: Queue processing for security checks
- **foodStall.js**: Food stall queue management
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

## Resources
- Main docs: `README.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- Test examples: `__tests__/*.test.js`
- Canvas API: MDN Web Docs
