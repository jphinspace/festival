# Reorganization Plan

## New Directory Structure
```
festival/
├── src/
│   ├── core/           # Core simulation logic
│   │   ├── agent.js
│   │   ├── fan.js
│   │   ├── simulation.js
│   │   └── queueManager.js  # NEW: Shared queue logic
│   ├── components/     # Visual/UI components
│   │   ├── renderer.js
│   │   ├── obstacles.js
│   │   ├── securityQueue.js
│   │   └── foodStall.js
│   ├── managers/       # Event and state management
│   │   └── eventManager.js
│   ├── utils/          # Utilities and config
│   │   └── config.js
│   └── app.js          # Main entry point
├── public/             # Static assets
│   ├── index.html
│   └── styles.css
├── __tests__/          # Tests (keep as is)
└── ...config files
```

## Import Path Updates Needed
All imports will need to be updated with relative paths.

## Steps
1. Create directory structure
2. Create shared queueManager.js with common logic
3. Move files to new locations
4. Update all imports
5. Update HTML to reference new paths
6. Run tests to verify
7. Fix queue issues with new shared code
