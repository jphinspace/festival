# festival
Agent based modeling example

## Description
An HTML5 simulation game featuring agent-based modeling of attendees at a music festival. The simulation runs in real-time with the ability to pause, adjust speed, and includes four interactive controls to simulate different festival events.

## Features
- **Modular Architecture**: Separated concerns with base Agent class and Fan subclass for extensibility
- **Collision Detection**: Agents maintain personal space and cannot pass through obstacles (stages, food stalls, bus, security)
- **Obstacle System**: Fans cannot walk through stages, food stalls, bus area, or security lines
- **Visual Security Boundaries**: Pink borders around security queues and behind stages
- **Fan Hunger System**: Fans have hunger that increases over time with randomized thresholds
- **Food Stall Queuing**: Four food stalls positioned between stages where fans form queues
- **Stage Preference System**: Each fan has a preferred stage (left/right/none) that determines their behavior
- **Priority-Based Behavior**: Fans prioritize preferred stage > food > non-preferred stage
- **Show Timers**: Circular progress indicators show how much of a show has elapsed (60 seconds = 1 simulated hour)
- **Smart Crowd Behavior**: 20% of fans cluster tightly at the front of stages, others spread out farther back
- **Spread-Out Wandering**: When idle, fans wander to spread out across the festival grounds
- **Smart Bus Departure**: Bus takes fans who have seen a full show at their preferred stage
- **Lightweight**: Optimized for minimal RAM usage and fast loading
- **Real-time simulation**: Runs at capped 60 FPS with pause/resume capability  
- **Variable Speed**: Adjustable simulation speed - default 1x (internal 20x), max 2x (internal 40x)
- **Frame-independent Movement**: Smooth animation regardless of frame rate
- **Agent-based modeling**: Each attendee is an independent agent with movement behaviors
- **Interactive controls**: Buttons to trigger different festival events
- **Accessible**: WCAG 2.1 compliant with ARIA labels and keyboard navigation
- **Tested**: Unit tests with Jest (62 tests passing)

## Project Structure
```
festival/
├── index.html           # Main HTML file
├── styles.css           # Separated CSS for caching
├── config.js            # Configuration constants
├── agent.js             # Base Agent class with collision detection
├── fan.js               # Fan subclass extending Agent with hunger and preferences
├── renderer.js          # Rendering logic with show timers
├── simulation.js        # Simulation engine
├── eventManager.js      # Event handling and show management
├── securityQueue.js     # Security queue processing
├── foodStall.js         # Food stall queue management
├── obstacles.js         # Collision detection for static objects
├── app.js               # Application entry point
├── __tests__/           # Unit tests (62 tests)
│   ├── agent.test.js
│   ├── fan.test.js
│   ├── renderer.test.js
│   ├── eventManager.test.js
│   ├── foodStall.test.js
│   ├── securityQueue.test.js
│   └── obstacles.test.js
├── test_selenium.py     # Selenium UI tests
├── package.json         # NPM dependencies
└── jest.config.js       # Jest configuration
```

## How to Use

### Running the Simulation
1. Open `index.html` in a web browser, or
2. Start a local web server:
   ```bash
   python3 -m http.server 8000
   ```
   Then navigate to `http://localhost:8000`

### Controls
- **Pause/Resume**: Pause or resume the simulation
- **Speed Slider**: Adjust simulation speed from 0.1x to 2.0x (internally 2x to 40x). Default: 1.0x (internally 20x)
- **Left Concert (5 min)**: Announces a concert starting on the left stage. After 5 seconds (representing 5 minutes), fans move to the left stage. Show lasts 60 seconds (1 simulated hour).
- **Right Concert (5 min)**: Same as above, but for the right stage
- **Bus Arrives**: A bus arrives with 50 new attendees who go through security and then disperse into the festival grounds
- **Bus Leaving**: Announces bus departure - fans who have seen their preferred show leave. Others may randomly leave as well.

### Visual Elements
- **Blue dots**: Active festival attendees
- **Orange dots**: Attendees in food queue
- **Cyan dots**: Attendees being checked by security
- **Red dots**: Attendees leaving the festival
- **Green area**: Main festival grounds
- **Gray/Red rectangles**: Stage areas (gray when inactive, red when concert is active)
- **Circular progress indicators**: Show timers above active stages (0-100%)
- **Blue rectangle**: Bus loading/unloading area
- **Purple rectangles with pink borders**: Security queue areas
- **Brown rectangles**: Food stalls (attendees queue here when hungry)
- **Dark area**: Road/path at the bottom

### Fan Behavior
- Each fan has a stage preference (40% prefer left, 40% prefer right, 20% have no preference)
- Fans prioritize: **Preferred stage** > Food (if hungry) > **Non-preferred stage**
- During shows, 20% of fans cluster tightly at the front, 80% watch from farther back
- When idle, fans wander around to spread out
- Fans won't leave their preferred show for food unless the show is >90% complete
- Fans with no preference won't get food until all shows have ended
- Very hungry fans seek food stalls (threshold randomized ±10% per fan)
- Fans cannot walk through stages, food stalls, bus area, or security lines

## Development

### Running Tests
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run Selenium tests (requires Chrome/Chromium and server running)
python3 test_selenium.py http://localhost:8000
```

### Adding New Agent Types
The modular architecture makes it easy to extend with inheritance:

1. Create a new agent class extending `Agent` (like `Fan` extends `Agent`)
2. Add configuration in `config.js` for the new agent type
3. Update `EventManager` to instantiate and handle new agent types
4. Add UI controls in `index.html` if needed
5. Wire up event handlers in `app.js`

Example:
```javascript
// vendor.js
import { Agent } from './agent.js';

export class Vendor extends Agent {
    constructor(x, y, config) {
        super(x, y, config);
        this.type = 'vendor';
        this.color = config.COLORS.VENDOR; // Add to config
    }
    
    // Vendors stay in one place
    update(deltaTime, simulationSpeed, otherAgents = []) {
        // Only handle collisions, no movement
        for (const other of otherAgents) {
            if (other !== this && this.overlapsWith(other)) {
                this.resolveOverlap(other);
            }
        }
    }
}
```

## Technical Details
- **Pure HTML5, CSS3, and vanilla JavaScript** (ES6 modules)
- **Canvas-based rendering** for performance
- **Frame-independent movement** using delta time
- **60 FPS cap** to prevent excessive CPU usage
- **No physics engine** (lightweight movement only)
- **Optimized for minimal RAM** usage and fast loading
- **Accessibility features**: ARIA labels, keyboard support, high contrast mode
- **Separate CSS file** for browser caching optimization

## Performance Optimizations
1. **Cached Resources**: CSS in separate file for browser caching
2. **Frame Rate Limiting**: Capped at 60 FPS to avoid burning CPU
3. **Delta Time Movement**: Frame-independent for consistent speed
4. **Minimal Dependencies**: Zero external libraries in production
5. **Efficient Rendering**: Canvas API with batched draw calls

## Browser Compatibility
- Modern browsers with ES6 module support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires JavaScript enabled

## License
MIT License - See LICENSE file for details
