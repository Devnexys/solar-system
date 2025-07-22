/*
   3D Solar System Visualization using Three.js
   Features: Realistic orbits, rotation, lighting, interactive controls
*/

class SolarSystem {
  constructor() {
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = null;
    this.mouse = null;

    // Animation and timing
    this.clock = new THREE.Clock();
    this.animationId = null;
    this.isPaused = false;
    this.globalSpeedMultiplier = 1.0;

    // Solar system objects
    this.sun = null;
    this.planets = {};
    this.planetMeshes = [];
    this.starField = null;

    // UI references
    this.loadingScreen = document.getElementById("loading-screen");
    this.canvas = document.getElementById("solar-system-canvas");

    // Planet data with enhanced sizes and distinctive colors for better visibility
    this.planetData = {
      mercury: {
        name: "Mercury",
        radius: 1.2,
        distance: 12,
        orbitalSpeed: 0.02,
        rotationSpeed: 0.005,
        color: 0x8c7853,
        info: "Closest planet to the Sun. Day temperature: 427°C",
      },
      venus: {
        name: "Venus",
        radius: 1.8,
        distance: 18,
        orbitalSpeed: 0.015,
        rotationSpeed: 0.002,
        color: 0xffc649,
        info: "Hottest planet with thick atmosphere. Temperature: 462°C",
      },
      earth: {
        name: "Earth",
        radius: 2.0,
        distance: 24,
        orbitalSpeed: 0.01,
        rotationSpeed: 0.02,
        color: 0x6b93d6,
        info: "Our home planet. 71% covered by water. Perfect for life.",
      },
      mars: {
        name: "Mars",
        radius: 1.5,
        distance: 30,
        orbitalSpeed: 0.008,
        rotationSpeed: 0.018,
        color: 0xcd5c5c,
        info: "The Red Planet. Has the largest volcano in the solar system.",
      },
      jupiter: {
        name: "Jupiter",
        radius: 5.5,
        distance: 40,
        orbitalSpeed: 0.005,
        rotationSpeed: 0.04,
        color: 0xd8ca9d,
        info: "Largest planet. Has a Great Red Spot storm larger than Earth.",
      },
      saturn: {
        name: "Saturn",
        radius: 4.8,
        distance: 52,
        orbitalSpeed: 0.003,
        rotationSpeed: 0.035,
        color: 0xfad5a5,
        info: "Famous for its beautiful ring system. Less dense than water.",
      },
      uranus: {
        name: "Uranus",
        radius: 3.2,
        distance: 64,
        orbitalSpeed: 0.002,
        rotationSpeed: 0.025,
        color: 0x4fd0e4,
        info: "Ice giant that rotates on its side. Very cold: -224°C",
      },
      neptune: {
        name: "Neptune",
        radius: 3.0,
        distance: 76,
        orbitalSpeed: 0.001,
        rotationSpeed: 0.022,
        color: 0x4b70dd,
        info: "Windiest planet with speeds up to 2,100 km/h",
      },
    };

    this.init();
  }

  /*
     Initialize the entire solar system
  */
  async init() {
    try {
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupLighting();
      this.setupRaycaster();

      await this.createSolarSystem();
      this.setupEventListeners();
      this.setupUI();

      this.hideLoadingScreen();
      this.animate();
    } catch (error) {
      console.error("Failed to initialize solar system:", error);
    }
  }

  /**
   * Setup the Three.js scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
  }

  /**
   * Setup camera with optimal viewing angle for larger solar system
   */
  setupCamera() {
    const container = document.getElementById("scene-container");
    const aspect = container.clientWidth / container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
    this.camera.position.set(0, 50, 120);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Setup WebGL renderer with optimal settings
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });

    this.renderer.setSize(
      this.canvas.parentElement.clientWidth,
      this.canvas.parentElement.clientHeight
    );
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Setup orbit controls for camera movement
   */
  setupControls() {
    // Use our local OrbitControls implementation
    try {
      if (typeof OrbitControls !== "undefined") {
        this.controls = new OrbitControls(
          this.camera,
          this.renderer.domElement
        );
      } else if (typeof THREE.OrbitControls !== "undefined") {
        this.controls = new THREE.OrbitControls(
          this.camera,
          this.renderer.domElement
        );
      } else if (typeof window.OrbitControls !== "undefined") {
        this.controls = new window.OrbitControls(
          this.camera,
          this.renderer.domElement
        );
      } else {
        console.warn("OrbitControls not found, implementing basic controls");
        this.setupBasicControls();
        return;
      }

      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 10;
      this.controls.maxDistance = 400;
      this.controls.autoRotate = false;
      this.controls.autoRotateSpeed = 0.5;

      console.log("OrbitControls initialized successfully");
    } catch (error) {
      console.warn(
        "Failed to initialize OrbitControls, using fallback:",
        error
      );
      this.setupBasicControls();
    }
  }

  /**
   * Setup basic mouse controls as fallback
   */
  setupBasicControls() {
    this.isMouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.cameraDistance = 120;
    this.cameraAngleX = 0;
    this.cameraAngleY = 0;

    // Create a mock controls object
    this.controls = {
      update: () => {},
      target: new THREE.Vector3(0, 0, 0),
    };

    // Mouse event listeners
    this.canvas.addEventListener("mousedown", (event) => {
      this.isMouseDown = true;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });

    this.canvas.addEventListener("mouseup", () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener("mousemove", (event) => {
      if (!this.isMouseDown) return;

      const deltaX = event.clientX - this.mouseX;
      const deltaY = event.clientY - this.mouseY;

      this.cameraAngleY += deltaX * 0.01;
      this.cameraAngleX += deltaY * 0.01;

      // Limit vertical rotation
      this.cameraAngleX = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.cameraAngleX)
      );

      this.updateCameraPosition();

      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    });

    // Wheel event for zooming
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.cameraDistance += event.deltaY * 0.2;
      this.cameraDistance = Math.max(20, Math.min(400, this.cameraDistance));
      this.updateCameraPosition();
    });

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        this.isMouseDown = true;
        this.mouseX = event.touches[0].clientX;
        this.mouseY = event.touches[0].clientY;
      }
    });

    this.canvas.addEventListener("touchend", () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (!this.isMouseDown || event.touches.length !== 1) return;

      const deltaX = event.touches[0].clientX - this.mouseX;
      const deltaY = event.touches[0].clientY - this.mouseY;

      this.cameraAngleY += deltaX * 0.01;
      this.cameraAngleX += deltaY * 0.01;

      this.cameraAngleX = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.cameraAngleX)
      );

      this.updateCameraPosition();

      this.mouseX = event.touches[0].clientX;
      this.mouseY = event.touches[0].clientY;
    });
  }

  /**
   * Update camera position for basic controls
   */
  updateCameraPosition() {
    const x =
      this.cameraDistance *
      Math.cos(this.cameraAngleX) *
      Math.sin(this.cameraAngleY);
    const y = this.cameraDistance * Math.sin(this.cameraAngleX);
    const z =
      this.cameraDistance *
      Math.cos(this.cameraAngleX) *
      Math.cos(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Setup enhanced lighting system for larger solar system
   */
  setupLighting() {
    // Main sun light with increased range
    const sunLight = new THREE.PointLight(0xffffff, 3, 500);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 500;
    this.scene.add(sunLight);

    // Ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(ambientLight);

    // Additional directional light for better planet illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  /**
   * Setup raycaster for mouse interactions
   */
  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * Create the complete solar system
   */
  async createSolarSystem() {
    // Create star field background
    this.createStarField();

    // Create the Sun
    this.createSun();

    // Create all planets
    for (const [key, data] of Object.entries(this.planetData)) {
      this.createPlanet(key, data);
    }
  }

  /**
   * Create animated star field background
   */
  createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 400;
      starPositions[i + 1] = (Math.random() - 0.5) * 400;
      starPositions[i + 2] = (Math.random() - 0.5) * 400;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8,
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  /**
   * Create the Sun with enhanced glow effect
   */
  createSun() {
    const sunGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 1.0,
    });

    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.name = "sun";
    this.scene.add(this.sun);

    // Add multiple glow layers for better effect
    const glowGeometry1 = new THREE.SphereGeometry(7.5, 16, 16);
    const glowMaterial1 = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
    });
    const sunGlow1 = new THREE.Mesh(glowGeometry1, glowMaterial1);
    this.sun.add(sunGlow1);

    const glowGeometry2 = new THREE.SphereGeometry(9, 16, 16);
    const glowMaterial2 = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.15,
    });
    const sunGlow2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
    this.sun.add(sunGlow2);

    this.planetMeshes.push(this.sun);
  }

  /**
   * Create a planet with enhanced materials and orbit path
   */
  createPlanet(key, data) {
    // Create planet geometry with higher detail
    const planetGeometry = new THREE.SphereGeometry(data.radius, 64, 64);

    // Create enhanced material based on planet type
    let planetMaterial;
    if (key === "earth") {
      planetMaterial = new THREE.MeshPhongMaterial({
        color: data.color,
        shininess: 30,
        specular: 0x111111,
      });
    } else if (key === "jupiter" || key === "saturn") {
      planetMaterial = new THREE.MeshLambertMaterial({
        color: data.color,
        transparent: true,
        opacity: 0.9,
      });
    } else {
      planetMaterial = new THREE.MeshLambertMaterial({
        color: data.color,
      });
    }

    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.name = key;
    planet.castShadow = true;
    planet.receiveShadow = true;

    // Create orbit group
    const orbitGroup = new THREE.Group();
    orbitGroup.add(planet);

    // Add special features for specific planets
    if (key === "saturn") {
      this.addSaturnRings(planet, data.radius);
    } else if (key === "earth") {
      this.addEarthMoon(planet, data.radius);
    }

    // Position planet at orbital distance
    planet.position.x = data.distance;

    // Create orbit path visualization
    this.createOrbitPath(data.distance);

    // Store planet data
    this.planets[key] = {
      mesh: planet,
      orbitGroup: orbitGroup,
      data: data,
      angle: Math.random() * Math.PI * 2, // Random starting position
      individualSpeed: 1.0, // Individual speed multiplier
    };

    this.scene.add(orbitGroup);
    this.planetMeshes.push(planet);
  }

  /**
   * Add Saturn's iconic rings
   */
  addSaturnRings(planet, planetRadius) {
    // Inner ring
    const innerRingGeometry = new THREE.RingGeometry(
      planetRadius * 1.2,
      planetRadius * 1.8,
      64
    );
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = Math.PI / 2;
    planet.add(innerRing);

    // Outer ring
    const outerRingGeometry = new THREE.RingGeometry(
      planetRadius * 2.0,
      planetRadius * 2.4,
      64
    );
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    outerRing.rotation.x = Math.PI / 2;
    planet.add(outerRing);
  }

  /**
   * Add Earth's moon
   */
  addEarthMoon(planet, planetRadius) {
    const moonGeometry = new THREE.SphereGeometry(planetRadius * 0.27, 16, 16);
    const moonMaterial = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
    });

    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(planetRadius * 3, 0, 0);
    moon.name = "moon";
    planet.add(moon);

    // Store moon for animation
    if (!this.moons) this.moons = {};
    this.moons.earth = {
      mesh: moon,
      angle: 0,
      distance: planetRadius * 3,
      speed: 0.05,
    };
  }

  /**
   * Create orbital path visualization
   */
  createOrbitPath(distance) {
    const orbitGeometry = new THREE.RingGeometry(
      distance - 0.2,
      distance + 0.2,
      64
    );
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    this.scene.add(orbitRing);
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener("resize", () => this.onWindowResize());

    // Mouse interactions
    this.canvas.addEventListener("click", (event) => this.onMouseClick(event));
    this.canvas.addEventListener("mousemove", (event) =>
      this.onMouseMove(event)
    );

    // UI controls
    document
      .getElementById("pause-resume")
      .addEventListener("click", () => this.togglePause());
    document
      .getElementById("theme-toggle")
      .addEventListener("click", () => this.toggleTheme());
    document
      .getElementById("toggle-panel")
      .addEventListener("click", () => this.togglePanel());

    // Global speed control
    const globalSpeedSlider = document.getElementById("global-speed");
    globalSpeedSlider.addEventListener("input", (e) => {
      this.globalSpeedMultiplier = parseFloat(e.target.value);
      document.getElementById(
        "global-speed-value"
      ).textContent = `${this.globalSpeedMultiplier.toFixed(1)}x`;
    });

    // Camera controls
    document.querySelectorAll(".camera-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        this.focusOnObject(target);
      });
    });
  }

  /**
   * Setup UI controls for individual planets
   */
  setupUI() {
    const planetControlsContainer = document.getElementById("planet-controls");

    Object.entries(this.planetData).forEach(([key, data]) => {
      const controlDiv = document.createElement("div");
      controlDiv.className = "planet-control";
      controlDiv.innerHTML = `
                <h4>${data.name}</h4>
                <div class="speed-control">
                    <input type="range" id="speed-${key}" min="0" max="3" step="0.1" value="1">
                    <span class="speed-value" id="speed-value-${key}">1.0x</span>
                </div>
            `;

      planetControlsContainer.appendChild(controlDiv);

      // Add event listener for individual planet speed
      const slider = document.getElementById(`speed-${key}`);
      slider.addEventListener("input", (e) => {
        const speed = parseFloat(e.target.value);
        this.planets[key].individualSpeed = speed;
        document.getElementById(
          `speed-value-${key}`
        ).textContent = `${speed.toFixed(1)}x`;
      });
    });
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    const container = document.getElementById("scene-container");
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Handle mouse click for planet selection
   */
  onMouseClick(event) {
    this.updateMousePosition(event);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      this.focusOnObject(clickedObject.name);
      this.showPlanetInfo(clickedObject.name);
    }
  }

  /**
   * Handle mouse move for hover effects
   */
  onMouseMove(event) {
    this.updateMousePosition(event);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);

    // Change cursor on hover
    this.canvas.style.cursor = intersects.length > 0 ? "pointer" : "default";
  }

  /**
   * Update mouse position for raycasting
   */
  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Focus camera on specific object
   */
  focusOnObject(objectName) {
    let targetPosition;
    let distance = 20;

    if (objectName === "sun") {
      targetPosition = new THREE.Vector3(0, 0, 0);
      distance = 15;
    } else if (this.planets[objectName]) {
      const planet = this.planets[objectName];
      targetPosition = planet.mesh.getWorldPosition(new THREE.Vector3());
      distance = planet.data.radius * 8;
    } else {
      return;
    }

    // Animate camera to target
    const startPosition = this.camera.position.clone();
    const endPosition = targetPosition
      .clone()
      .add(new THREE.Vector3(distance, distance * 0.5, distance));

    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      this.controls.target.lerp(targetPosition, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  /**
   * Show information about selected planet
   */
  showPlanetInfo(objectName) {
    const nameElement = document.getElementById("planet-name");
    const infoElement = document.getElementById("planet-info");

    if (objectName === "sun") {
      nameElement.textContent = "The Sun";
      infoElement.innerHTML = `
                <p>The center of our solar system. A massive ball of hot plasma.</p>
                <p><strong>Temperature:</strong> 5,778K (surface)</p>
                <p><strong>Mass:</strong> 99.86% of the solar system</p>
                <p><strong>Composition:</strong> 73% Hydrogen, 25% Helium</p>
            `;
    } else if (this.planets[objectName]) {
      const planetData = this.planets[objectName].data;
      nameElement.textContent = planetData.name;
      infoElement.innerHTML = `
                <p>${planetData.info}</p>
                <p><strong>Distance from Sun:</strong> ${
                  planetData.distance
                } AU (scaled)</p>
                <p><strong>Orbital Speed:</strong> ${(
                  planetData.orbitalSpeed * 1000
                ).toFixed(1)} units</p>
                <p><strong>Rotation Speed:</strong> ${(
                  planetData.rotationSpeed * 1000
                ).toFixed(1)} units</p>
            `;
    }
  }

  /**
   * Toggle animation pause/resume
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    const button = document.getElementById("pause-resume");
    button.innerHTML = this.isPaused ? "▶️ Resume" : "⏸️ Pause";
  }

  /**
   * Toggle dark/light theme
   */
  toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById("theme-icon");

    if (body.dataset.theme === "light") {
      body.dataset.theme = "dark";
      themeIcon.textContent = "🌙";
    } else {
      body.dataset.theme = "light";
      themeIcon.textContent = "☀️";
    }
  }

  /**
   * Toggle control panel visibility
   */
  togglePanel() {
    const panel = document.getElementById("control-panel");
    panel.classList.toggle("collapsed");
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    setTimeout(() => {
      this.loadingScreen.classList.add("hidden");
    }, 1000);
  }

  /**
   * Main animation loop
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (!this.isPaused) {
      const deltaTime = this.clock.getDelta();
      this.updatePlanets(deltaTime);
      this.updateStarField();
    }

    if (this.controls && this.controls.update) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update planet positions and rotations
   */
  updatePlanets(deltaTime) {
    // Rotate the Sun
    if (this.sun) {
      this.sun.rotation.y += 0.005 * this.globalSpeedMultiplier;
    }

    // Update each planet
    Object.values(this.planets).forEach((planet) => {
      const data = planet.data;
      const speedMultiplier =
        this.globalSpeedMultiplier * planet.individualSpeed;

      // Orbital motion
      planet.angle += data.orbitalSpeed * speedMultiplier;
      planet.orbitGroup.rotation.y = planet.angle;

      // Planet rotation
      planet.mesh.rotation.y += data.rotationSpeed * speedMultiplier;
    });

    // Update moons
    if (this.moons) {
      Object.values(this.moons).forEach((moon) => {
        moon.angle += moon.speed * this.globalSpeedMultiplier;
        moon.mesh.position.x = Math.cos(moon.angle) * moon.distance;
        moon.mesh.position.z = Math.sin(moon.angle) * moon.distance;
        moon.mesh.rotation.y += 0.02 * this.globalSpeedMultiplier;
      });
    }
  }

  /**
   * Subtle star field animation
   */
  updateStarField() {
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    // Remove event listeners
    window.removeEventListener("resize", this.onWindowResize);
  }
}

// Initialize the solar system when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.solarSystem = new SolarSystem();
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.solarSystem) {
    window.solarSystem.destroy();
  }
});
