let paintLayer;
let shibaModel; 
let shibaTexture; 
let exploredRegions = [];
let discoveryMessage = "";
let discoveryTimer = 0;

let previousPosition;
let movedDistance = 0;
let currentAzimuth = 0;
let currentRegion = 'desert';

let simulatedPosition = { latitude: 0, longitude: 0 };
let isSimulating = false;

let shibaX = 0;
let shibaY = 0;


const MOVE_THRESHOLD = 0.5;


let marginX, marginY;

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

  paintLayer = createGraphics(windowWidth, windowHeight);
  paintLayer.clear();

  marginX = width / 2 - 50; 
  marginY = height / 2 - 50;


  if (localStorage.getItem('exploredRegions')) {
    exploredRegions = JSON.parse(localStorage.getItem('exploredRegions'));
  }


  if (isMobileDevice()) {
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
    isSimulating = true;
    console.log("Desktop environment: Movement simulation enabled.");
  }

  ambientLight(150);
  directionalLight(255, 255, 255, 0, -1, 0);
}

function draw() {
  background(255); 

  drawNaturalElements();

  drawCurrentLocation();

  push();
  translate(shibaX, shibaY, 0); 


  rotateX(HALF_PI);
  rotateY(radians(currentAzimuth)); 

  scale(0.5); 

  
  if (shibaTexture && shibaModel) {
    texture(shibaTexture);
    noStroke();
    model(shibaModel);
  } else {
    fill(150, 0, 0);
    box(50);
  }
  pop();

  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  image(paintLayer, 0, 0);
  pop();

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


  currentAzimuth = alpha;

  currentAzimuth = (currentAzimuth + 360) % 360;

  if (isMobileDevice() && previousPosition) {
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, previousPosition.latitude + 0.001, previousPosition.longitude + 0.001); // Example distance calculation

    if (distance > MOVE_THRESHOLD) {
      movedDistance += distance;


      let moveX = cos(radians(currentAzimuth)) * (distance / 10); 
      let moveY = sin(radians(currentAzimuth)) * (distance / 10);
      shibaX += moveX;
      shibaY += moveY;

     
      shibaX = constrain(shibaX, -marginX, marginX);
      shibaY = constrain(shibaY, -marginY, marginY);

      applyGradientEffect(distance, currentAzimuth);
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

      currentAzimuth = (currentAzimuth + 360) % 360;

      let moveX = cos(radians(currentAzimuth)) * (distance / 10); 
      let moveY = sin(radians(currentAzimuth)) * (distance / 10);
      shibaX += moveX;
      shibaY += moveY;

      shibaX = constrain(shibaX, -marginX, marginX);
      shibaY = constrain(shibaY, -marginY, marginY);

      applyGradientEffect(distance, currentAzimuth);
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

  let R = 6371e3; 
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

function applyGradientEffect(distance, azimuth) {
  let currentColor;

  if (currentRegion === 'forest') {
    currentColor = color(34, 139, 34, 150);
  } else if (currentRegion === 'sea') {
    currentColor = color(30, 144, 255, 150); 
  } else if (currentRegion === 'desert') {
    currentColor = color(50, 205, 50, 150); 
  } else {
    currentColor = color(200, 200, 200, 150); 
  }

  
  let gradientSize = map(distance, 0, 500, 0, 300);
  gradientSize = constrain(gradientSize, 0, 300); 

  
  let directionRadians = radians(azimuth - 90);
  let xOffset = cos(directionRadians) * gradientSize;
  let yOffset = sin(directionRadians) * gradientSize;

  console.log(`Drawing gradient at (${width / 2 + xOffset + shibaX}, ${height / 2 + yOffset + shibaY}) with size ${gradientSize}`);

  
  for (let i = 0; i < 10; i++) {
    let size = map(i, 0, 10, gradientSize / 10, gradientSize);
    let alphaVal = map(i, 0, 10, 200, 0); 
    paintLayer.fill(red(currentColor), green(currentColor), blue(currentColor), alphaVal);
    paintLayer.ellipse(width / 2 + xOffset + shibaX, height / 2 + yOffset + shibaY, size, size);
  }
}

function getCurrentRegion() {
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

    for (let i = 0; i < 5; i++) {
      paintLayer.fill(34, 139, 34, 150); 
      let treeX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let treeY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let treeWidth = random(20, 40);
      let treeHeight = random(100, 150);
      paintLayer.rect(treeX, treeY, treeWidth, treeHeight);
    }
  } else if (currentRegion === 'sea') {
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(30, 144, 255, 150); 
      let waveX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let waveY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let waveWidth = random(50, 100);
      let waveHeight = random(20, 40);
      paintLayer.ellipse(waveX, waveY, waveWidth, waveHeight);
    }
  } else if (currentRegion === 'desert') {
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(50, 205, 50, 150); 
      let cactusX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let cactusY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let cactusWidth = random(15, 25);
      let cactusHeight = random(60, 100);
      paintLayer.rect(cactusX, cactusY, cactusWidth, cactusHeight);
    }
  }
}

function drawCurrentLocation() {
  let currentLocationColor;

  if (currentRegion === 'forest') {
    currentLocationColor = color(34, 139, 34, 200);
  } else if (currentRegion === 'sea') {
    currentLocationColor = color(30, 144, 255, 200); 
  } else if (currentRegion === 'desert') {
    currentLocationColor = color(50, 205, 50, 200); 
  } else {
    currentLocationColor = color(200, 200, 200, 200); 
  }


  paintLayer.noStroke();
  paintLayer.fill(currentLocationColor);
  paintLayer.ellipse(width / 2 + shibaX, height / 2 + shibaY, 50, 50); 
}

function showDiscoveryAnimation(region) {
  discoveryMessage = region;
  discoveryTimer = 120; 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight, WEBGL);
  paintLayer.resizeCanvas(windowWidth, windowHeight);
  console.log(`Canvas resized to: ${windowWidth}x${windowHeight}`);


  marginX = width / 2 - 50; 
  marginY = height / 2 - 50;
}

function keyPressed() {
  if (isSimulating) {
    let moveStep = 10; 
    let azimuth = currentAzimuth; 
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

    
    currentAzimuth = (currentAzimuth + 360) % 360;

    currentRegion = getCurrentRegion();

    
    let moveX = cos(radians(currentAzimuth)) * (moveStep / 10); 
    let moveY = sin(radians(currentAzimuth)) * (moveStep / 10);
    shibaX += moveX;
    shibaY += moveY;

   
    shibaX = constrain(shibaX, -marginX, marginX);
    shibaY = constrain(shibaY, -marginY, marginY);

    
    applyGradientEffect(moveStep, currentAzimuth);

    console.log(`Moved Distance: ${movedDistance}, Current Azimuth: ${currentAzimuth}`);
  }
}

function requestDeviceOrientation() {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          select('button').remove(); 
        }
      })
      .catch(console.error);
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
    select('button').remove(); 
  }
}
