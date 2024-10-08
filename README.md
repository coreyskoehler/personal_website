# Personal Website with Interactive 3D Globe

This project creates a personal website featuring an interactive 3D globe using Three.js and WebAssembly. The globe displays rotating satellite markers that link to different pages or external sites.
See the final product: https://coreyskoehler.com/
## Structure

```
personal_website/
├── index.html
├── styles.css
├── main.js
├── globe.cpp
├── textures/
├── [compiled WASM files]
└── resume/
    └── index.html
```
## Key Features

- Interactive 3D Earth globe with orbiting satellites
- WebAssembly integration for efficient satellite position calculations
- Clickable satellite markers linking to various pages
- Responsive design with gradient background

## Technologies Used

- Three.js for 3D rendering
- WebAssembly (compiled from C++) for performance-critical calculations
- HTML5 and CSS3 for structure and styling
- JavaScript for interactivity and WebAssembly integration

## Setup

1. Compile the WebAssembly module from `globe.cpp`
- emcc command used: emcc globe.cpp -o globe.out.js -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "UTF8ToString"]' -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_createGlobeController", "_destroyGlobeController", "_updateSatellites", "_mouseDragSatellites", "_getSatellitePositions", "_getSatelliteLetters", "_getSatelliteCount", "_createSatellitesFromString", "_getSatelliteRotations", "_getWordStartIndices", "_getWordLinkByIndex"]' -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 -O3 --bind -s ASSERTIONS=1
2. Ensure all textures are in the `textures/` directory
3. Host the project on a web server that supports WebAssembly

## Usage

Navigate the 3D globe by dragging with your mouse or touchscreen. Click on visible satellite markers near the center of the screen to follow their associated links.
