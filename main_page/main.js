import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const DEBUG = true;

let isModuleReady = false;
let isAnimationStarted = false;

  function waitForModule() {
    return new Promise((resolve) => {
      if (Module.calledRun) {
        resolve();
      } else {
        Module.onRuntimeInitialized = resolve;
      }
    });
  }
  
  async function initializeApp() {
    await waitForModule();
    
    // Your initialization code goes here
    console.log("Module is ready");
    if (DEBUG) console.log("WebAssembly module initialized");
    initializeGlobeController();
    isModuleReady = true;
    
    // Load the satellite model using GLTFLoader
    const loader = new GLTFLoader();
    loader.load('textures/compressed_sat.glb', 
        (gltf) => {
            if (DEBUG) console.log("Satellite model loaded successfully");
            const satelliteModel = gltf.scene;
            
            // Change the material of the model to have a faint blue glow
            satelliteModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x27636e
                    });
                }
            });
            satelliteModel.scale.set(0.6, 0.6, 0.6);
            createSatelliteMeshes(satelliteModel);
            
            // Start the animation only after everything is loaded
            if (!isAnimationStarted) {
                isAnimationStarted = true;
                animate();
            }
        },
        (progress) => {
            if (DEBUG) console.log(`Loading satellite model: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error('Error loading satellite model:', error);
        }
    );
    console.log("Initialization complete, app is ready");
  }
  
  initializeApp();

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
const sunLight1 = new THREE.DirectionalLight(0xfab157, 2.0);
sunLight1.position.set(10, 0, -10);
const sunLight2 = new THREE.DirectionalLight(0xfab157, 0.75);
sunLight2.position.set(10, 3, -10);
scene.add(sunLight1);
scene.add(sunLight2);
camera.position.set(0, 0, 15);

// WebAssembly integration
let globeController;
let satelliteMeshes = [];


function checkModuleLoaded() {
    if (Module && Module.cwrap) {
        if (DEBUG) console.log("Module loaded successfully");
        return true;
    }
    console.warn("Module not loaded yet");
    return false;
}
// Wrap the initialization in a function
function initializeGlobeController() {
    if (!checkModuleLoaded()) {
        console.error("Cannot initialize GlobeController: Module not loaded");
        return;
    }

    try {
        if (DEBUG) console.log("Attempting to create GlobeController");
        const createGlobeController = Module.cwrap('createGlobeController', 'number', []);
        globeController = createGlobeController();
        
        if (globeController) {
            if (DEBUG) console.log("GlobeController created successfully, pointer:", globeController);
            
            // Test the creation of satellites
            const createSatellitesFromString = Module.cwrap('createSatellitesFromString', null, ['number', 'string']);
            createSatellitesFromString(globeController, "RESUME");
            
            if (DEBUG) console.log("Satellites created, getting count");
            const getSatelliteCount = Module.cwrap('getSatelliteCount', 'number', ['number']);
            const count = getSatelliteCount(globeController);
            if (DEBUG) console.log("Number of satellites:", count);
        } else {
            console.error("Failed to create GlobeController");
        }
    } catch (error) {
        console.error("Error during GlobeController initialization:", error);
    }
}





function createSatelliteMeshes(satelliteModel) {
    if (!globeController) {
        console.error("Cannot create satellite meshes: GlobeController not initialized");
        return;
    }

    const getSatelliteCount = Module.cwrap('getSatelliteCount', 'number', ['number']);
    const satelliteCount = getSatelliteCount(globeController);
    if (DEBUG) console.log(`Creating ${satelliteCount} satellite meshes`);

    for (let i = 0; i < satelliteCount; i++) {
        const satelliteMesh = satelliteModel.clone();
        scene.add(satelliteMesh);
        satelliteMeshes.push(satelliteMesh);
    }
    if (DEBUG) console.log(`${satelliteMeshes.length} satellite meshes created`);
}



let globeRotation = new THREE.Euler(0, 0, 0, 'XYZ');
let defaultRotationSpeed = 0.001; 
// Interaction
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function calculateOrbitalFrame(position) {
    const radialVector = position.clone().normalize();
    const tangentialVector = new THREE.Vector3(-position.y, position.x, 0).normalize();
    const normalVector = new THREE.Vector3().crossVectors(radialVector, tangentialVector);
    
    return new THREE.Matrix4().makeBasis(tangentialVector, normalVector, radialVector);
}
function updateSatellitePositions() {
    if (!globeController) {
        console.warn("GlobeController not initialized");
        return;
    }

    const satelliteCount = Module._getSatelliteCount(globeController);
    if (satelliteCount === 0) {
        console.warn("No satellites to update");
        return;
    }

    const positionsPtr = Module._malloc(satelliteCount * 3 * 8);  // 3 doubles per satellite
    const rotationsPtr = Module._malloc(satelliteCount * 8);  // 1 double per satellite for rotation
    
    Module._getSatellitePositions(globeController, positionsPtr);
    Module._getSatelliteRotations(globeController, rotationsPtr);
    
    const positions = new Float64Array(Module.HEAPF64.buffer, positionsPtr, satelliteCount * 3);
    const rotations = new Float64Array(Module.HEAPF64.buffer, rotationsPtr, satelliteCount);
    
    for (let i = 0; i < satelliteCount; i++) {
        if (!satelliteMeshes[i]) {
            console.warn(`Satellite mesh ${i} not found`);
            continue;
        }

        const originalPos = new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2]);
        
        // Calculate the orbital frame before applying globe rotation
        const orbitalFrame = calculateOrbitalFrame(originalPos);
        
        // Apply globe rotation to satellite position
        const rotatedPos = originalPos.applyEuler(globeRotation);
        satelliteMeshes[i].position.copy(rotatedPos);
        
        // Apply globe rotation to orbital frame
        orbitalFrame.premultiply(new THREE.Matrix4().makeRotationFromEuler(globeRotation));
        
        // Set satellite orientation based on rotated orbital frame
        satelliteMeshes[i].quaternion.setFromRotationMatrix(orbitalFrame);
        
        // Adjust rotation to ensure the "front" of the satellite faces the Earth
        satelliteMeshes[i].rotateOnAxis(new THREE.Vector3(-1, 0, 0), Math.PI / 2);

        // Apply individual satellite rotation
        const rotationAxis = rotatedPos.clone().normalize();
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotations[i]);
        satelliteMeshes[i].quaternion.premultiply(rotationQuaternion);
    }
    
    Module._free(positionsPtr);
    Module._free(rotationsPtr);
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = 'Bold 60px Arial';
    context.fillStyle = 'rgba(255,255,255,1)';
    context.fillText(text, 0, 60);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 1);
    return sprite;
}
function animate() {
    requestAnimationFrame(animate);

    if (globeController) {
        try {
            if (!isDragging) {
                const updateSatellites = Module.cwrap('updateSatellites', null, ['number', 'number']);
                updateSatellites(globeController, 0.016);
                globeRotation.y += defaultRotationSpeed;
                globe.rotation.copy(globeRotation);
            }
            
            updateSatellitePositions();
        } catch (error) {
            console.error("Error in animate function:", error);
        }
    } else {
        console.warn("GlobeController not initialized in animate function");
    }
    
    renderer.render(scene, camera);
}


if (DEBUG) console.log("main.js loaded");

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
let hasInteracted = false;

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
        if (!hasInteracted) {
            defaultRotationSpeed = 0.00005;
            hasInteracted = true;
        }
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