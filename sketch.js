let paintLayer;
let shibaModel; // 3D Shiba Inu model
let shibaTexture; // Texture image
let exploredRegions = [];
let discoveryMessage = "";
let discoveryTimer = 0;

let previousPosition;
let movedDistance = 0;
let currentAzimuth = 0;
let currentRegion = 'desert';

let simulatedPosition = { latitude: 0, longitude: 0 };
let isSimulating = false;

// Shiba Inu's position (initially centered)
let shibaX = 0;
let shibaY = 0;

// Movement threshold to prevent jitter (in meters)
const MOVE_THRESHOLD = 0.5;

// Margin to prevent Shiba Inu from moving off-screen
let marginX, marginY;

// Define allowed gradient colors
const gradientColors = [
  color(255, 255, 0, 150),    // Yellow
  color(255, 165, 0, 150),    // Orange
  color(255, 0, 0, 150),      // Red
  color(255, 105, 180, 150),  // Hot Pink
  color(128, 0, 128, 150),    // Purple
  color(30, 144, 255, 150),   // Blue
  color(34, 139, 34, 150),    // Green
  color(50, 205, 50, 150),    // Lime
  color(255, 20, 147, 150)    // Pink
];

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function preload() {
  // Load 3D model and texture with error handling
  shibaModel = loadModel('Shiba.obj', true, modelLoaded, modelLoadError);
  shibaTexture = loadImage('shiba_texture.png', textureLoaded, textureLoadError);
}

function modelLoaded() {
  console.log("Shiba model loaded successfully.");
}

function modelLoadError(err) {
  console.error("Failed to load Shiba model:", err);
}

function textureLoaded() {
  console.log("Shiba texture loaded successfully.");
}

function textureLoadError(err) {
  console.error("Failed to load Shiba texture:", err);
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  angleMode(RADIANS);

  // Initialize paintLayer (2D graphics layer)
  paintLayer = createGraphics(windowWidth, windowHeight);
  paintLayer.clear();

  // Calculate margins based on canvas size
  marginX = width / 2 - 50; // 50 pixels margin
  marginY = height / 2 - 50;

  // Load previously explored regions
  if (localStorage.getItem('exploredRegions')) {
    exploredRegions = JSON.parse(localStorage.getItem('exploredRegions'));
  }

  // Detect device type and set up location tracking
  if (isMobileDevice()) {
    // For mobile devices, add a button to request sensor access
    let button = createButton('Allow Device Sensors');
    button.position(width / 2 - 100, height / 2 - 25);
    button.style('padding', '15px 30px');
    button.style('font-size', '18px');
    button.mousePressed(requestDeviceOrientation);

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      });
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  } else {
    // For desktop, enable movement simulation
    isSimulating = true;
    console.log("Desktop environment: Movement simulation enabled.");
  }

  // Set up lighting
  ambientLight(150);
  directionalLight(255, 255, 255, 0, -1, 0);
}

function draw() {
  background(255); // White background

  // Draw natural elements on paintLayer
  drawNaturalElements();

  // Draw current location indicator on paintLayer
  drawCurrentLocation();

  // Draw the Shiba Inu model
  push();
  translate(shibaX, shibaY, 0); // Move to current position

  // Rotate model to face the current azimuth direction
  rotateX(HALF_PI); // Rotate model to face upwards
  rotateY(radians(currentAzimuth)); // Rotate based on current azimuth

  scale(0.5); // Adjust model size

  // Apply texture if loaded
  if (shibaTexture && shibaModel) {
    texture(shibaTexture);
    noStroke();
    model(shibaModel);
  } else {
    // If model or texture fails to load, display a box as a placeholder
    fill(150, 0, 0);
    box(50);
  }
  pop();

  // Display paintLayer (2D layer) after drawing the model to ensure gradients and flowers are visible
  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  image(paintLayer, 0, 0);
  pop();

  // Display discovery message if any
  if (discoveryTimer > 0) {
    push();
    resetMatrix();
    translate(-width / 2 + 20, -height / 2 + 20, 0);
    fill(0);
    textSize(32);
    textAlign(LEFT, TOP);
    text(`New Area Discovered: ${discoveryMessage}`, 0, 0);
    pop();
    discoveryTimer--;
  }

  // Update exploration records
  if (!exploredRegions.includes(currentRegion)) {
    exploredRegions.push(currentRegion);
    localStorage.setItem('exploredRegions', JSON.stringify(exploredRegions));
    showDiscoveryAnimation(currentRegion);
  }
}

function handleOrientation(event) {
  let alpha = event.alpha;
  let beta = event.beta;
  let gamma = event.gamma;

  // Calculate azimuth (compass direction)
  currentAzimuth = alpha;

  // Normalize currentAzimuth to [0, 360)
  currentAzimuth = (currentAzimuth + 360) % 360;

  // Apply gradient and add flower on mobile devices if movement exceeds threshold
  if (isMobileDevice() && previousPosition) {
    // Calculate distance (여기서는 예시로 고정된 거리 사용)
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, previousPosition.latitude + 0.001, previousPosition.longitude + 0.001); // 실제 계산 필요

    if (distance > MOVE_THRESHOLD) {
      movedDistance += distance;

      // Update Shiba Inu's position based on azimuth
      let moveX = cos(radians(currentAzimuth)) * (distance / 10); // 스케일 조정 필요
      let moveY = sin(radians(currentAzimuth)) * (distance / 10);
      shibaX += moveX;
      shibaY += moveY;

      // Clamp position to prevent moving off-screen
      shibaX = constrain(shibaX, -marginX, marginX);
      shibaY = constrain(shibaY, -marginY, marginY);

      // Apply gradient effect on paintLayer
      applyGradientEffect(distance, currentAzimuth);

      // **꽃 트레일 추가** (paintLayer에 꽃을 추가)
      drawFlower(width / 2 + shibaX, height / 2 + shibaY, currentAzimuth);
    }
  }
}

function updatePosition(position) {
  let latitude = position.coords.latitude;
  let longitude = position.coords.longitude;

  if (previousPosition) {
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, latitude, longitude);

    if (distance > MOVE_THRESHOLD) {
      movedDistance += distance;
      currentAzimuth = calculateBearing(previousPosition.latitude, previousPosition.longitude, latitude, longitude);

      // Normalize currentAzimuth to [0, 360)
      currentAzimuth = (currentAzimuth + 360) % 360;

      // Update Shiba Inu's position based on azimuth
      let moveX = cos(radians(currentAzimuth)) * (distance / 10); // 스케일 조정 필요
      let moveY = sin(radians(currentAzimuth)) * (distance / 10);
      shibaX += moveX;
      shibaY += moveY;

      // Clamp position to prevent moving off-screen
      shibaX = constrain(shibaX, -marginX, marginX);
      shibaY = constrain(shibaY, -marginY, marginY);

      // Apply gradient effect on paintLayer
      applyGradientEffect(distance, currentAzimuth);

      // **꽃 트레일 추가** (paintLayer에 꽃을 추가)
      drawFlower(width / 2 + shibaX, height / 2 + shibaY, currentAzimuth);
    }
  }

  previousPosition = {
    latitude: latitude,
    longitude: longitude
  };

  currentRegion = getCurrentRegion();
}

function handleError(error) {
  console.error("Geolocation error:", error);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) {
    return x * Math.PI / 180;
  }

  let R = 6371e3; // Earth radius in meters
  let φ1 = toRad(lat1);
  let φ2 = toRad(lat2);
  let Δφ = toRad(lat2 - lat1);
  let Δλ = toRad(lon2 - lon1);

  let a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  let d = R * c;
  return d;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  function toRad(x) {
    return x * Math.PI / 180;
  }

  function toDeg(x) {
    return x * 180 / Math.PI;
  }

  let φ1 = toRad(lat1);
  let φ2 = toRad(lat2);
  let Δλ = toRad(lon2 - lon1);

  let y = Math.sin(Δλ) * Math.cos(φ2);
  let x = Math.cos(φ1) * Math.sin(φ2) -
          Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  let bearing = (toDeg(θ) + 360) % 360;
  return bearing;
}

// Function to draw a star (used in gradient effect)
function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  paintLayer.beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius1;
    let sy = y + sin(a) * radius1;
    paintLayer.vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius2;
    sy = y + sin(a + halfAngle) * radius2;
    paintLayer.vertex(sx, sy);
  }
  paintLayer.endShape(CLOSE);
}

// **새로 추가된 함수: 꽃 그리기 (paintLayer에 그림)**
function drawFlower(x, y, azimuth) {
  let petals = 5;
  let radius = 10;
  let petalLength = 20;
  let petalWidth = 10;
  let angleOffset = radians(azimuth);

  paintLayer.push();
  paintLayer.translate(x, y);
  paintLayer.rotate(angleOffset); // Rotate flower based on azimuth

  paintLayer.fill(255, 192, 203, 150); // Hot Pink color for flowers
  paintLayer.noStroke();

  for (let i = 0; i < petals; i++) {
    let angle = TWO_PI / petals * i;
    paintLayer.push();
    paintLayer.rotate(angle);
    paintLayer.ellipse(0, -radius, petalWidth, petalLength);
    paintLayer.pop();
  }

  // Draw the center of the flower
  paintLayer.fill(255, 215, 0, 150); // Gold color
  paintLayer.ellipse(0, 0, radius, radius);
  paintLayer.pop();
}

function applyGradientEffect(distance, azimuth) {
  // Select a random color from the allowed gradient colors
  let currentColor = random(gradientColors);

  // Set gradient size based on distance (adjusted: 0-500 -> 0-300)
  let gradientSize = map(distance, 0, 500, 0, 300);
  gradientSize = constrain(gradientSize, 0, 300); // Limit to maximum 300

  // Calculate gradient position based on azimuth (compass 0 degrees is upward)
  let directionRadians = radians(azimuth - 90);
  let xOffset = cos(directionRadians) * gradientSize;
  let yOffset = sin(directionRadians) * gradientSize;

  console.log(`Drawing gradient at (${width / 2 + xOffset + shibaX}, ${height / 2 + yOffset + shibaY}) with size ${gradientSize}`);

  // Draw gradient shapes (ellipse and star) on paintLayer
  for (let i = 0; i < 10; i++) {
    let size = map(i, 0, 10, gradientSize / 10, gradientSize / 2); // Smaller sizes
    let alphaVal = map(i, 0, 10, 200, 0); // Fade out gradually

    paintLayer.fill(red(currentColor), green(currentColor), blue(currentColor), alphaVal);

    // Randomly decide to draw an ellipse or a star
    let shapeType = random(['ellipse', 'star']);

    if (shapeType === 'star') {
      let npoints = 5; // 5-pointed star
      drawStar(width / 2 + xOffset + shibaX, height / 2 + yOffset + shibaY, size / 2, size, npoints);
    } else {
      paintLayer.ellipse(width / 2 + xOffset + shibaX, height / 2 + yOffset + shibaY, size, size);
    }
  }
}

function getCurrentRegion() {
  // Determine region based on azimuth
  if (currentAzimuth >= 0 && currentAzimuth < 120) {
    return 'forest';
  } else if (currentAzimuth >= 120 && currentAzimuth < 240) {
    return 'sea';
  } else {
    return 'desert';
  }
}

function drawNaturalElements() {
  if (currentRegion === 'forest') {
    // Draw various sizes and shapes of trees
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(34, 139, 34, 150); // Green
      let treeX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let treeY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let treeWidth = random(20, 40);
      let treeHeight = random(100, 150);
      paintLayer.rect(treeX, treeY, treeWidth, treeHeight);
    }
  } else if (currentRegion === 'sea') {
    // Draw various sizes and shapes of waves
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(30, 144, 255, 150); // Blue
      let waveX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let waveY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let waveWidth = random(50, 100);
      let waveHeight = random(20, 40);
      paintLayer.ellipse(waveX, waveY, waveWidth, waveHeight);
    }
  } else if (currentRegion === 'desert') {
    // Draw various sizes and shapes of cacti
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(50, 205, 50, 150); // Lime
      let cactusX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let cactusY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let cactusWidth = random(15, 25);
      let cactusHeight = random(60, 100);
      paintLayer.rect(cactusX, cactusY, cactusWidth, cactusHeight);
    }
  }
}

function drawCurrentLocation() {
  // Set color based on current region
  let currentLocationColor;

  if (currentRegion === 'forest') {
    currentLocationColor = color(34, 139, 34, 200); // Dark green
  } else if (currentRegion === 'sea') {
    currentLocationColor = color(30, 144, 255, 200); // Dark blue
  } else if (currentRegion === 'desert') {
    currentLocationColor = color(50, 205, 50, 200); // Dark lime
  } else {
    currentLocationColor = color(200, 200, 200, 200); // Gray
  }

  // Display current location indicator at Shiba Inu's position on paintLayer
  paintLayer.noStroke();
  paintLayer.fill(currentLocationColor);
  paintLayer.ellipse(width / 2 + shibaX, height / 2 + shibaY, 50, 50); // Adjustable size
}

function showDiscoveryAnimation(region) {
  discoveryMessage = region;
  discoveryTimer = 120; // Display for approximately 2 seconds (assuming 60 FPS)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight, WEBGL);
  paintLayer.resizeCanvas(windowWidth, windowHeight);
  console.log(`Canvas resized to: ${windowWidth}x${windowHeight}`);

  // Recalculate margins based on new canvas size
  marginX = width / 2 - 50; // 50 pixels margin
  marginY = height / 2 - 50;
}

// Handle keyboard input for movement simulation and gradient effect
function keyPressed() {
  if (isSimulating) {
    let moveStep = 10; // Distance to move (assuming in meters)
    let azimuth = currentAzimuth; // Maintain current direction
    switch (keyCode) {
      case LEFT_ARROW:
        azimuth = 270;
        movedDistance += moveStep;
        break;
      case RIGHT_ARROW:
        azimuth = 90;
        movedDistance += moveStep;
        break;
      case UP_ARROW:
        azimuth = 0;
        movedDistance += moveStep;
        break;
      case DOWN_ARROW:
        azimuth = 180;
        movedDistance += moveStep;
        break;
    }
    currentAzimuth = azimuth;

    // Normalize currentAzimuth to [0, 360)
    currentAzimuth = (currentAzimuth + 360) % 360;

    currentRegion = getCurrentRegion();

    // Update Shiba Inu's position based on azimuth
    let moveX = cos(radians(currentAzimuth)) * (moveStep / 10); // Adjust scaling as needed
    let moveY = sin(radians(currentAzimuth)) * (moveStep / 10);
    shibaX += moveX;
    shibaY += moveY;

    // Clamp position to prevent moving off-screen
    shibaX = constrain(shibaX, -marginX, marginX);
    shibaY = constrain(shibaY, -marginY, marginY);

    // Apply gradient effect on paintLayer
    applyGradientEffect(moveStep, currentAzimuth);

    // **꽃 트레일 추가** (paintLayer에 꽃을 추가)
    drawFlower(width / 2 + shibaX, height / 2 + shibaY, currentAzimuth);

    console.log(`Moved Distance: ${movedDistance}, Current Azimuth: ${currentAzimuth}`);
  }
}

function requestDeviceOrientation() {
  // Request permission for device orientation on iOS
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          select('button').remove(); // Remove the button after permission is granted
        }
      })
      .catch(console.error);
  } else {
    // For non-iOS devices, add event listener directly
    window.addEventListener('deviceorientation', handleOrientation);
    select('button').remove(); // Remove the button after adding the event listener
  }
}
