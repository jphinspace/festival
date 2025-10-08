# festival
Agent based modeling example

## Description
An HTML5 simulation game featuring agent-based modeling of attendees at a music festival. The simulation runs in real-time with the ability to pause and includes four interactive controls to simulate different festival events.

## Features
- **Lightweight**: Single HTML file with no external dependencies
- **Real-time simulation**: Runs at 60 FPS with pause/resume capability
- **Agent-based modeling**: Each attendee is an independent agent with movement behaviors
- **Interactive controls**: Four buttons to trigger different festival events

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
- **Left Concert (5 min)**: Announces a concert starting on the left stage in 5 minutes. After 5 seconds (demo timing), attendees move to the left stage area.
- **Right Concert (5 min)**: Same as above, but for the right stage
- **Bus Arrives**: A bus arrives with 50 new attendees who disperse into the festival grounds
- **Bus Leaving**: Announces bus departure - random attendees (20-50) turn red and move to the bus area to leave

### Visual Elements
- **Blue dots**: Active festival attendees
- **Red dots**: Attendees leaving the festival
- **Green area**: Main festival grounds
- **Gray rectangles**: Stage areas (turn red when a concert is active)
- **Blue rectangle**: Bus loading/unloading area
- **Dark area**: Road/path at the bottom

## Technical Details
- Pure HTML5, CSS3, and vanilla JavaScript
- Canvas-based rendering for performance
- No physics engine (lightweight movement only)
- Optimized for minimal RAM usage and fast loading
