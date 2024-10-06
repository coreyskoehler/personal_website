
// Fading effect
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    const scrollPosition = window.scrollY;
    const maxScroll = 500; // Adjust this value to control when the header fully fades out

    if (scrollPosition <= maxScroll) {
        const opacity = 1 - (scrollPosition / maxScroll);
        header.style.opacity = opacity;
    } else {
        header.style.opacity = 0;
    }
});

// Set up Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('globe-canvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Create globe geometry
const globeGeometry = new THREE.SphereGeometry(5, 32, 32);
const globeMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('textures/earth_lights_lrg.jpg'),
    bumpMap: new THREE.TextureLoader().load('textures/earth_black_white.jpg'),
    bumpScale: 0.1,
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

camera.position.z = 15;

// WebAssembly integration
let globeController;
let satelliteMeshes = [];

Module.onRuntimeInitialized = async () => {

    globeController = Module._createGlobeController();
    
    // Create satellite meshes
    const satelliteGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    for (let i = 0; i < 3; i++) {  // Assuming 3 satellites
        const satelliteMesh = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
        scene.add(satelliteMesh);
        satelliteMeshes.push(satelliteMesh);
    }
    
    // Load the satellite model using GLTFLoader
    /*
    const loader = new THREE.GLTFLoader();

    loader.load('textures/satellite.gltf', (gltf) => {
        const satelliteModel = gltf.scene;

        for (let i = 0; i < 3; i++) {  // Assuming 3 satellites
            const satelliteMesh = satelliteModel.clone();  // Clone the loaded satellite model
            scene.add(satelliteMesh);
            satelliteMeshes.push(satelliteMesh);
        }
    }, undefined, (error) => {
        console.error('An error happened while loading the satellite model', error);
    });
    */
};

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (globeController) {
        Module._updateSatellites(globeController, 0.016);  // Assuming 60 FPS
        
        const positionsPtr = Module._malloc(9 * 8);  // 9 doubles (3 satellites * 3 coordinates)
        Module._getSatellitePositions(globeController, positionsPtr);
        const positions = new Float64Array(Module.HEAPF64.buffer, positionsPtr, 9);
        
        for (let i = 0; i < satelliteMeshes.length; i++) {
            satelliteMeshes[i].position.set(positions[i*3], positions[i*3+1], positions[i*3+2]);
        }
        
        Module._free(positionsPtr);
    }
    
    globe.rotation.y += 0.001;
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Interaction
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

document.getElementById('globe-canvas').addEventListener('mousedown', (e) => {
    isDragging = true;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        globe.rotation.y += deltaMove.x * 0.01;
        globe.rotation.x += deltaMove.y * 0.01;
    }

    previousMousePosition = {
        x: e.clientX,
        y: e.clientY
    };
});

// Clean up when the page is unloaded
window.addEventListener('unload', () => {
    if (globeController) {
        Module._destroyGlobeController(globeController);
    }
});