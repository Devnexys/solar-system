/**
 * Standalone OrbitControls implementation for Three.js
 * Simplified version to avoid CDN loading issues
 */
class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.enabled = true;
    this.target = new THREE.Vector3();

    this.enableDamping = false;
    this.dampingFactor = 0.05;

    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.minZoom = 0;
    this.maxZoom = Infinity;

    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;

    this.state = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
    this.currentState = this.state.NONE;

    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();

    this.panOffset = new THREE.Vector3();
    this.zoomChanged = false;

    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();

    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panDelta = new THREE.Vector2();

    this.dollyStart = new THREE.Vector2();
    this.dollyEnd = new THREE.Vector2();
    this.dollyDelta = new THREE.Vector2();

    this.scale = 1;

    this.lastPosition = new THREE.Vector3();
    this.lastQuaternion = new THREE.Quaternion();

    this.update = this.update.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.update();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.domElement.addEventListener(
      "contextmenu",
      this.onContextMenu.bind(this)
    );
    this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.domElement.addEventListener("wheel", this.onMouseWheel.bind(this));

    this.domElement.addEventListener(
      "touchstart",
      this.onTouchStart.bind(this)
    );
    this.domElement.addEventListener("touchend", this.onTouchEnd.bind(this));
    this.domElement.addEventListener("touchmove", this.onTouchMove.bind(this));
  }

  onContextMenu(event) {
    if (!this.enabled) return;
    event.preventDefault();
  }

  onMouseDown(event) {
    if (!this.enabled) return;
    event.preventDefault();

    switch (event.button) {
      case 0:
        this.currentState = this.state.ROTATE;
        this.rotateStart.set(event.clientX, event.clientY);
        break;
      case 1:
        this.currentState = this.state.DOLLY;
        this.dollyStart.set(event.clientX, event.clientY);
        break;
      case 2:
        this.currentState = this.state.PAN;
        this.panStart.set(event.clientX, event.clientY);
        break;
    }

    if (this.currentState !== this.state.NONE) {
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("mouseup", this.onMouseUp);
    }
  }

  onMouseMove(event) {
    if (!this.enabled) return;
    event.preventDefault();

    switch (this.currentState) {
      case this.state.ROTATE:
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta
          .subVectors(this.rotateEnd, this.rotateStart)
          .multiplyScalar(0.01);

        this.rotateLeft(
          (2 * Math.PI * this.rotateDelta.x) / this.domElement.clientHeight
        );
        this.rotateUp(
          (2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight
        );

        this.rotateStart.copy(this.rotateEnd);
        break;

      case this.state.DOLLY:
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

        if (this.dollyDelta.y > 0) {
          this.dollyIn(this.getZoomScale());
        } else if (this.dollyDelta.y < 0) {
          this.dollyOut(this.getZoomScale());
        }

        this.dollyStart.copy(this.dollyEnd);
        break;

      case this.state.PAN:
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta
          .subVectors(this.panEnd, this.panStart)
          .multiplyScalar(0.01);
        this.pan(this.panDelta.x, this.panDelta.y);
        this.panStart.copy(this.panEnd);
        break;
    }

    this.update();
  }

  onMouseUp() {
    if (!this.enabled) return;

    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);

    this.currentState = this.state.NONE;
  }

  onMouseWheel(event) {
    if (!this.enabled) return;

    event.preventDefault();

    if (event.deltaY < 0) {
      this.dollyOut(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.update();
  }

  onTouchStart(event) {
    if (!this.enabled) return;

    switch (event.touches.length) {
      case 1:
        this.currentState = this.state.ROTATE;
        this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        break;
      case 2:
        this.currentState = this.state.DOLLY;
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.dollyStart.set(0, distance);
        break;
    }
  }

  onTouchMove(event) {
    if (!this.enabled) return;
    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        this.rotateDelta
          .subVectors(this.rotateEnd, this.rotateStart)
          .multiplyScalar(0.01);

        this.rotateLeft(
          (2 * Math.PI * this.rotateDelta.x) / this.domElement.clientHeight
        );
        this.rotateUp(
          (2 * Math.PI * this.rotateDelta.y) / this.domElement.clientHeight
        );

        this.rotateStart.copy(this.rotateEnd);
        break;

      case 2:
        const dx = event.touches[0].pageX - event.touches[1].pageX;
        const dy = event.touches[0].pageY - event.touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.dollyEnd.set(0, distance);
        this.dollyDelta.set(
          0,
          Math.pow(this.dollyEnd.y / this.dollyStart.y, 0.1)
        );

        this.dollyIn(this.dollyDelta.y);
        this.dollyStart.copy(this.dollyEnd);
        break;
    }
  }

  onTouchEnd() {
    if (!this.enabled) return;
    this.currentState = this.state.NONE;
  }

  getZoomScale() {
    return Math.pow(0.95, 1);
  }

  rotateLeft(angle) {
    this.sphericalDelta.theta -= angle;
  }

  rotateUp(angle) {
    this.sphericalDelta.phi -= angle;
  }

  dollyIn(dollyScale) {
    this.scale /= dollyScale;
    this.zoomChanged = true;
  }

  dollyOut(dollyScale) {
    this.scale *= dollyScale;
    this.zoomChanged = true;
  }

  pan(deltaX, deltaY) {
    const offset = new THREE.Vector3();
    const targetDistance = this.camera.position.distanceTo(this.target);
    const panDistance =
      2 * targetDistance * Math.tan(((this.camera.fov / 2) * Math.PI) / 180);

    offset.copy(this.camera.position).sub(this.target).normalize();
    offset.crossVectors(this.camera.up, offset);
    offset.multiplyScalar(
      (-deltaX * panDistance) / this.domElement.clientHeight
    );
    this.panOffset.add(offset);

    offset.copy(this.camera.up).normalize();
    offset.multiplyScalar(
      (deltaY * panDistance) / this.domElement.clientHeight
    );
    this.panOffset.add(offset);
  }

  update() {
    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      this.camera.up,
      new THREE.Vector3(0, 1, 0)
    );
    const quatInverse = quat.clone().invert();

    offset.copy(this.camera.position).sub(this.target);
    offset.applyQuaternion(quat);

    this.spherical.setFromVector3(offset);

    if (this.autoRotate && this.currentState === this.state.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }

    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.phi = Math.max(
      0.000001,
      Math.min(Math.PI - 0.000001, this.spherical.phi)
    );
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );
    this.target.add(this.panOffset);

    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    if (this.enableDamping) {
      this.sphericalDelta.theta *= 1 - this.dampingFactor;
      this.sphericalDelta.phi *= 1 - this.dampingFactor;
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    this.scale = 1;
  }

  getAutoRotationAngle() {
    return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
  }

  dispose() {
    this.domElement.removeEventListener("contextmenu", this.onContextMenu);
    this.domElement.removeEventListener("mousedown", this.onMouseDown);
    this.domElement.removeEventListener("wheel", this.onMouseWheel);
    this.domElement.removeEventListener("touchstart", this.onTouchStart);
    this.domElement.removeEventListener("touchend", this.onTouchEnd);
    this.domElement.removeEventListener("touchmove", this.onTouchMove);

    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}

if (typeof window !== "undefined") {
  window.OrbitControls = OrbitControls;
  if (typeof THREE !== "undefined") {
    THREE.OrbitControls = OrbitControls;
  }
}
