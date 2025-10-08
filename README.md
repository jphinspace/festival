# festival
Agent based modeling example

## Description
An HTML5 simulation game featuring agent-based modeling of attendees at a music festival. The simulation runs in real-time with the ability to pause, adjust speed, and includes four interactive controls to simulate different festival events.

## Features
- **Modular Architecture**: Separated concerns (Agent, Renderer, Simulation, EventManager, Config)
- **Lightweight**: Optimized for minimal RAM usage and fast loading
- **Real-time simulation**: Runs at capped 60 FPS with pause/resume capability  
- **Variable Speed**: Adjustable simulation speed from 0.1x to 5.0x
- **Frame-independent Movement**: Smooth animation regardless of frame rate
- **Agent-based modeling**: Each attendee is an independent agent with movement behaviors
- **Interactive controls**: Four buttons to trigger different festival events
- **Accessible**: WCAG 2.1 compliant with ARIA labels and keyboard navigation
- **Tested**: Unit tests with Jest and Selenium UI tests

## Project Structure
```
festival/
├── index.html           # Main HTML file
├── styles.css           # Separated CSS for caching
├── config.js            # Configuration constants
├── agent.js             # Agent class
├── renderer.js          # Rendering logic
├── simulation.js        # Simulation engine
├── eventManager.js      # Event handling
├── app.js               # Application entry point
├── __tests__/           # Unit tests
│   ├── agent.test.js
│   ├── renderer.test.js
│   └── eventManager.test.js
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
- **Speed Slider**: Adjust simulation speed from 0.1x to 5.0x (default: 1.0x)
- **Left Concert (5 min)**: Announces a concert starting on the left stage. After 5 seconds (representing 5 minutes), attendees move to the left stage area.
- **Right Concert (5 min)**: Same as above, but for the right stage
- **Bus Arrives**: A bus arrives with 50 new attendees who disperse into the festival grounds
- **Bus Leaving**: Announces bus departure - random attendees (20-50) turn red and move to the bus area to leave, then are removed after 3 seconds

### Visual Elements
- **Blue dots**: Active festival attendees
- **Red dots**: Attendees leaving the festival
- **Green area**: Main festival grounds
- **Gray/Red rectangles**: Stage areas (turn red when a concert is active)
- **Blue rectangle**: Bus loading/unloading area
- **Dark area**: Road/path at the bottom

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
The modular architecture makes it easy to extend:

1. Create a new agent class extending or similar to `Agent`
2. Add configuration in `config.js`
3. Update `EventManager` to handle new events
4. Add UI controls in `index.html`
5. Wire up event handlers in `app.js`

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
