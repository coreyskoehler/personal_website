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
    loader.load('textures/super_dishless_sat-opt.glb', 
        (gltf) => {
            if (DEBUG) console.log("Satellite model loaded successfully");
            const satelliteModel = gltf.scene;
            
            // Change the material of the model to have a faint blue glow
            satelliteModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x27636e,
                        emissive: 0x27636e,
                        emissiveIntensity: 0,
                        shininess: 30
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

// Create moon geometry
const moonGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const moonMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('textures/moon_map2_color.jpg'),
    bumpMap: new THREE.TextureLoader().load('textures/moon_map2.jpg'),
    bumpScale: 0.03,
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);

// Position the moon relative to the globe
//moon.position.set(-1.5, 1.0, 12); // Adjust these values as needed
moon.rotation.y += 2.5;
moon.rotation.x += 0.5;
// Add the moon to the scene
scene.add(moon);


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
            const createSatellitesFromString = Module.cwrap('createSatellitesFromString', null, ['number', 'string', 'number', 'number']);
            createSatellitesFromString(globeController, "RESUME", 0, 0);

            createSatellitesFromString(globeController, "SEE", 0, 1);

            createSatellitesFromString(globeController, "SEE", 0, 2);
            createSatellitesFromString(globeController, "SEE", 0, 3);
            createSatellitesFromString(globeController, "SEE", 0, 4);

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

    function cloneModelWithNewMaterials(originalModel) {
        const clone = originalModel.clone();

        clone.traverse((node) => {
            if (node.isMesh) {
                // Create a new material instance for each mesh
                node.material = new THREE.MeshPhongMaterial().copy(node.material);
                
                // Ensure emissiveIntensity is set to 0 initially
                node.material.emissiveIntensity = 0;
            }
        });

        return clone;
    }

    for (let i = 0; i < satelliteCount; i++) {
        const satelliteMesh = cloneModelWithNewMaterials(satelliteModel);
        scene.add(satelliteMesh);
        satelliteMeshes.push(satelliteMesh);
    }

    if (DEBUG) console.log(`${satelliteMeshes.length} satellite meshes created`);
}



let globeRotation = new THREE.Euler(0, 0, 0, 'XYZ');
let defaultRotationSpeed = 0.001; 
//let defaultRotationSpeed = 0.0;
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

        // Calculate visibility based on position
        const visibilityFactor = calculateVisibilityFactor(rotatedPos);
        
        // Apply visibility factor to satellite material
        satelliteMeshes[i].traverse((child) => {
            if (child.isMesh) {
                /*
                if (!child.material.originalColor) {
                    child.material.originalColor = child.material.color.clone();
                }
                const brightColor = child.material.originalColor.clone().multiplyScalar(1 + visibilityFactor);
                child.material.color.copy(brightColor);
                */
                //if visibilityFactor > 0
                child.material.emissiveIntensity = visibilityFactor;
            }
        });


    }
    
    Module._free(positionsPtr);
    Module._free(rotationsPtr);
}

function calculateVisibilityFactor(position) {
    // Normalize the position
    const normalizedPos = position.clone();
    //const pos = position.clone();
    // Calculate how much the satellite is facing the camera
    // 1 means directly facing, 0 means perpendicular, -1 means facing away
    const facingFactor = normalizedPos.z;
    
    // Calculate distance from the (0, 0) point in the xy-plane
    const xyDistance = Math.sqrt((normalizedPos.x) * (normalizedPos.x) + normalizedPos.y * normalizedPos.y);
    
    // Combine these factors
    // We want high visibility when z is positive (facing camera) and xy distance is small (near center)
    let visibilityFactor = 0.0;
    if (normalizedPos.z > 0){
        visibilityFactor = (3.0 - xyDistance);
    }
    // Clamp the value between 0 and 1, and apply a power to enhance the effect
    visibilityFactor = Math.pow(Math.max(0, Math.min(1, visibilityFactor)), 2);

    return visibilityFactor*2;
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
let moonOrbitRadius = 9; // Distance from Earth's center
let moonOrbitSpeed = defaultRotationSpeed/2; // Speed of orbit
let moonAngle = -0.75; // Current angle of the moon's orbit

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
            // Update moon's position
            moonAngle += moonOrbitSpeed;
            moon.position.x = Math.sin(moonAngle) * moonOrbitRadius;
            moon.position.z = Math.cos(moonAngle) * moonOrbitRadius;
            moon.position.y = Math.cos(moonAngle) * 2
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

//let isDragging = false;
let hasInteracted = false;
let previousPosition = { x: 0, y: 0 };

// Helper function to get position from either mouse or touch event
function getEventPosition(event) {
    if (event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else {
        return { x: event.clientX, y: event.clientY };
    }
}

// Function to handle both mouse and touch move events
function handleMove(event) {
    if (isDragging) {
        const currentPosition = getEventPosition(event);
        //console.log('Current position:', currentPosition); // Debugging line

        const deltaMove = {
            x: currentPosition.x - previousPosition.x,
            y: currentPosition.y - previousPosition.y
        };
        //console.log('Delta move:', deltaMove); // Debugging line

        // Update globe rotation
        globeRotation.y += deltaMove.x * 0.01;
        globeRotation.x += deltaMove.y * 0.01;

        // Apply rotation to the globe mesh
        globe.rotation.copy(globeRotation);

        // Update satellite positions
        updateSatellitePositions();

        if (!hasInteracted) {
            defaultRotationSpeed = 0.00005;
            //defaultRotationSpeed = 0.0;
            hasInteracted = true;
        }

        previousPosition = currentPosition;
    }
}

// Mouse events
document.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousPosition = getEventPosition(e);
    //console.log('Mouse down at:', previousPosition); // Debugging line
});

document.addEventListener('mousemove', (e) => {
    handleMove(e);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    //console.log('Mouse up'); // Debugging line
});

// Touch events
document.addEventListener('touchstart', (e) => {
    isDragging = true;
    previousPosition = getEventPosition(e);
    //console.log('Touch start at:', previousPosition); // Debugging line
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling while dragging
    handleMove(e);
}, {passive:false});

document.addEventListener('touchend', () => {
    isDragging = false;
    //console.log('Touch end'); // Debugging line
});


// Clean up when the page is unloaded
window.addEventListener('unload', () => {
    if (globeController) {
        Module._destroyGlobeController(globeController);
    }
});