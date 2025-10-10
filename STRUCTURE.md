# Project Structure

This document explains the reorganized directory structure of the Festival Simulation project.

## Directory Layout

```
festival/
├── src/                    # Source code
│   ├── core/              # Core simulation logic
│   │   ├── agent.js       # Base Agent class
│   │   ├── fan.js         # Fan subclass with behavior logic
│   │   ├── simulation.js  # Main simulation loop
│   │   └── queueManager.js # Shared queue management logic
│   ├── components/        # Visual and interactive components
│   │   ├── renderer.js    # Canvas rendering
│   │   ├── obstacles.js   # Collision detection for static objects
│   │   ├── securityQueue.js # Security queue management
│   │   └── foodStall.js   # Food stall queue management
│   ├── managers/          # State and event management
│   │   └── eventManager.js # Event handling (bus, concerts, etc.)
│   ├── utils/             # Utilities and configuration
│   │   └── config.js      # Centralized configuration constants
│   └── app.js             # Application entry point
├── public/                # Static assets served to browser
│   ├── index.html         # Main HTML file
│   └── styles.css         # CSS styles
├── __tests__/             # Test files (Jest)
│   ├── agent.test.js
│   ├── fan.test.js
│   ├── securityQueue.test.js
│   ├── foodStall.test.js
│   ├── obstacles.test.js
│   ├── renderer.test.js
│   └── eventManager.test.js
└── Configuration files
    ├── package.json       # NPM dependencies and scripts
    ├── jest.config.js     # Jest configuration
    └── .gitignore         # Git ignore rules
```

## Module Organization

### Core Modules (`src/core/`)
Contains the fundamental simulation logic that is framework-agnostic:

- **agent.js**: Base class for all moving entities with collision detection
- **fan.js**: Festival attendee with hunger, preferences, and behavior
- **simulation.js**: Main game loop, manages state and timing
- **queueManager.js**: Shared queue logic used by both security and food queues

### Components (`src/components/`)
Contains visual and interactive elements:

- **renderer.js**: Handles all canvas drawing operations
- **obstacles.js**: Manages static objects (stages, stalls, bus) for collision
- **securityQueue.js**: Security checkpoint queues with two-stage movement
- **foodStall.js**: Food stall queues with side-based processing

### Managers (`src/managers/`)
Contains high-level coordinators:

- **eventManager.js**: Handles major events (bus arrivals/departures, concerts)

### Utils (`src/utils/`)
Contains configuration and helpers:

- **config.js**: All constants and configuration values in one place

## Import Patterns

### Within the same directory:
```javascript
import { Agent } from './agent.js';
```

### From a subdirectory:
```javascript
import { Fan } from '../core/fan.js';
```

### From app.js (root of src):
```javascript
import { Simulation } from './core/simulation.js';
import { CONFIG } from './utils/config.js';
```

## Running the Application

### Development Server
Navigate to the `public/` directory when serving:
```bash
cd /path/to/festival
python3 -m http.server 8080
# Then open http://localhost:8080/public/
```

### Running Tests
Tests automatically resolve imports from the new structure:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## Key Design Decisions

1. **Separation of Concerns**: Core logic is separate from rendering and UI
2. **Shared Queue Logic**: `queueManager.js` ensures consistent behavior across queue types
3. **Two-Stage Movement**: Security queues use vertical-then-lateral movement for cleaner visual flow
4. **Minimal Sorting**: Queues only sort when fans join/leave, not every frame, to prevent jitter
5. **Consistent State**: Both security and food queues use `inQueue` boolean property

## Adding New Features

### New Agent Type
1. Create class in `src/core/` extending `Agent`
2. Add configuration to `src/utils/config.js`
3. Instantiate in `src/managers/eventManager.js`
4. Add tests in `__tests__/`

### New Component
1. Create in `src/components/`
2. Import in required managers/renderers
3. Add visual representation in `renderer.js`
4. Add tests in `__tests__/`

### New Event
1. Add handler method in `src/managers/eventManager.js`
2. Wire UI button in `public/index.html`
3. Connect in `src/app.js`
