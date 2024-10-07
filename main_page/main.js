import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

// Test sat 3d model 

Module.onRuntimeInitialized = async () => {

    globeController = Module._createGlobeController();
    
    // Load the satellite model using GLTFLoader
    
    const loader = new GLTFLoader();

    loader.load('textures/satellite.glb', (gltf) => {
        const satelliteModel = gltf.scene;
        // Change the material of the model to have a faint blue glow
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x50c5db, 
                    emissive: 0xADD8E6, 
                    emissiveIntensity: 0.1, 
                    roughness: 0.5,
                    metalness: 0.2
                });
            }
        });
        for (let i = 0; i < 3; i++) {  // Assuming 3 satellites
            const satelliteMesh = satelliteModel.clone();  // Clone the loaded satellite model
            scene.add(satelliteMesh);
            satelliteMeshes.push(satelliteMesh);
        }
    }, undefined, (error) => {
        console.error('An error happened while loading the satellite model', error);
    });
    
};

let globeRotation = new THREE.Euler(0, 0, 0, 'XYZ');
const defaultRotationSpeed = 0.001; 
// Interaction
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function updateSatellitePositions() {
    const positionsPtr = Module._malloc(9 * 8);  // 9 doubles (3 satellites * 3 coordinates)
    Module._getSatellitePositions(globeController, positionsPtr);
    const positions = new Float64Array(Module.HEAPF64.buffer, positionsPtr, 9);
    
    for (let i = 0; i < satelliteMeshes.length; i++) {
        const pos = new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2]);
        
        // Apply globe rotation to satellite position
        pos.applyEuler(globeRotation);
        
        satelliteMeshes[i].position.copy(pos);
    }
    
    Module._free(positionsPtr);
}

function animate() {
    requestAnimationFrame(animate);

    if (globeController) {
        Module._updateSatellites(globeController, 0.016);
        
        if (!isDragging) {
            // Apply default rotation when not dragging
            globeRotation.y += defaultRotationSpeed;
            globe.rotation.copy(globeRotation);
        }
        
        updateSatellitePositions();
    }
    
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});



document.getElementById('globe-canvas'). addEventListener('mousedown', (e) => {
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

        // Update globe rotation
        globeRotation.y += deltaMove.x * 0.01;
        globeRotation.x += deltaMove.y * 0.01;

        // Apply rotation to the globe mesh
        globe.rotation.copy(globeRotation);

        // Update satellite positions
        updateSatellitePositions();
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