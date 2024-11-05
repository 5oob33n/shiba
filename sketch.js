let paintLayer;
let shibaModel; // 3D 시바견 모델
let shibaTexture; // 텍스처 이미지
let alpha = 0;
let beta = 0;
let gamma = 0;
let exploredRegions = [];
let discoveryMessage = "";
let discoveryTimer = 0;

let previousPosition;
let movedDistance = 0;
let currentAzimuth = 0;
let currentRegion = 'desert';

let simulatedPosition = { latitude: 0, longitude: 0 };
let isSimulating = false;

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function preload() {
  // 3D 모델과 텍스처 이미지 로드
  shibaModel = loadModel('Shiba.obj', true); 
  shibaTexture = loadImage('shiba_texture.png'); 
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  angleMode(RADIANS);
  
  // paintLayer 초기화 (2D 그래픽 레이어)
  paintLayer = createGraphics(windowWidth, windowHeight);
  paintLayer.clear();
  
  // 이전에 탐험한 지역 로드
  if (localStorage.getItem('exploredRegions')) {
    exploredRegions = JSON.parse(localStorage.getItem('exploredRegions'));
  }
  
  // 위치 초기화
  previousPosition = null;
  
  // 디바이스 유형 감지 및 위치 추적
  if (isMobileDevice()) {
    // 모바일 기기인 경우 센서 사용 허용 버튼 추가
    let button = createButton('장치 센서 사용 허용');
    button.position(width / 2 - 75, height / 2);
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
    // 데스크탑인 경우 이동 시뮬레이션 활성화
    isSimulating = true;
    console.log("데스크탑 환경: 이동 시뮬레이션 활성화");
  }
  
  // 조명 설정
  ambientLight(150);
  directionalLight(255, 255, 255, 0, -1, 0);
}

function draw() {
  background(255); // 하얀 배경
  
  // 탑뷰 카메라 설정
  camera(0, 500, 0, 0, 0, 0, 0, 0, -1);
  
  // paintLayer 표시 (2D 레이어)
  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  image(paintLayer, 0, 0);
  pop();
  
  // 그라데이션 효과 적용
  applyGradientEffect();
  
  // 자연 요소 그리기
  drawNaturalElements();
  
  // 현재 위치 표시
  drawCurrentLocation();
  
  // 3D 시바견 모델 그리기
  push();
  translate(0, 0, 0); // 중앙에 배치
  
  // 모델의 방향 수정 (나침반 방향에 따라 Y축 회전)
  rotateY(radians(currentAzimuth));
  
  scale(0.5); // 모델 크기 조절
  
  // 텍스처 적용
  if (shibaTexture) {
    texture(shibaTexture);
  }
  
  noStroke();
  model(shibaModel);
  pop();
  
  // 발견 메시지 표시
  if (discoveryTimer > 0) {
    push();
    resetMatrix();
    translate(-width / 2 + 20, -height / 2 + 20, 0);
    fill(0);
    textSize(32);
    textAlign(LEFT, TOP);
    text(`새로운 지역 발견: ${discoveryMessage}`, 0, 0);
    pop();
    discoveryTimer--;
  }
  
  // 탐험 기록 업데이트
  if (!exploredRegions.includes(currentRegion)) {
    exploredRegions.push(currentRegion);
    localStorage.setItem('exploredRegions', JSON.stringify(exploredRegions));
    showDiscoveryAnimation(currentRegion);
  }
}

function handleOrientation(event) {
  alpha = event.alpha;
  beta = event.beta;
  gamma = event.gamma;
  
  // 방위각 계산 (간단한 예시)
  currentAzimuth = alpha;
}

function updatePosition(position) {
  let latitude = position.coords.latitude;
  let longitude = position.coords.longitude;
  
  if (previousPosition) {
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, latitude, longitude);
    movedDistance += distance;
    currentAzimuth = calculateBearing(previousPosition.latitude, previousPosition.longitude, latitude, longitude);
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
  
  let R = 6371e3; // 지구 반지름 (미터)
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

function applyGradientEffect() {
  if (currentRegion !== 'forest' && currentRegion !== 'sea' && currentRegion !== 'desert') {
    return;
  }

  // 현재 지역에 맞는 색상 선택
  let currentColor;
  
  if (currentRegion === 'forest') {
    currentColor = color(34, 139, 34, 150); // 초록색
  } else if (currentRegion === 'sea') {
    currentColor = color(30, 144, 255, 150); // 파란색
  } else if (currentRegion === 'desert') {
    currentColor = color(50, 205, 50, 150); // 라임색
  }

  // 이동 거리에 따른 그라데이션 크기 설정
  let gradientSize = map(movedDistance, 0, 1000, 0, sqrt(sq(width) + sq(height)));
  
  // 방위각을 이용해 그라데이션 위치 계산
  let directionRadians = radians(currentAzimuth);
  let xOffset = cos(directionRadians) * gradientSize;
  let yOffset = sin(directionRadians) * gradientSize;

  // 여러 개의 반투명 원을 그려 그라데이션 효과 구현
  for (let i = 0; i < 10; i++) {
    let size = map(i, 0, 10, gradientSize / 10, gradientSize);
    let alphaVal = map(i, 0, 10, 50, 0); // 점점 투명해지도록 설정
    paintLayer.fill(red(currentColor), green(currentColor), blue(currentColor), alphaVal);
    paintLayer.ellipse(xOffset + width / 2, yOffset + height / 2, size, size);
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
    // 다양한 크기와 형태의 나무 그리기
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(34, 139, 34, 150); // 초록색
      let treeX = random(width / 2 - 150, width / 2 + 150);
      let treeY = random(height / 2 - 150, height / 2 + 150);
      let treeWidth = random(20, 40);
      let treeHeight = random(100, 150);
      paintLayer.rect(treeX, treeY, treeWidth, treeHeight);
    }
  } else if (currentRegion === 'sea') {
    // 다양한 크기와 형태의 파도 그리기
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(30, 144, 255, 150); // 파란색
      let waveX = random(width / 2 - 150, width / 2 + 150);
      let waveY = random(height / 2 - 150, height / 2 + 150);
      let waveWidth = random(50, 100);
      let waveHeight = random(20, 40);
      paintLayer.ellipse(waveX, waveY, waveWidth, waveHeight);
    }
  } else if (currentRegion === 'desert') {
    // 다양한 크기와 형태의 선인장 그리기
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(50, 205, 50, 150); // 라임색
      let cactusX = random(width / 2 - 150, width / 2 + 150);
      let cactusY = random(height / 2 - 150, height / 2 + 150);
      let cactusWidth = random(15, 25);
      let cactusHeight = random(60, 100);
      paintLayer.rect(cactusX, cactusY, cactusWidth, cactusHeight);
    }
  }
}

function drawCurrentLocation() {
  // 현재 위치를 나타내는 동그라미의 색상 설정
  let currentLocationColor;
  
  if (currentRegion === 'forest') {
    currentLocationColor = color(34, 139, 34, 200); // 진한 초록색
  } else if (currentRegion === 'sea') {
    currentLocationColor = color(30, 144, 255, 200); // 진한 파란색
  } else if (currentRegion === 'desert') {
    currentLocationColor = color(50, 205, 50, 200); // 진한 라임색
  } else {
    currentLocationColor = color(200, 200, 200, 200); // 기본 회색
  }
  
  // 현재 위치 표시 (중앙)
  paintLayer.noStroke();
  paintLayer.fill(currentLocationColor);
  paintLayer.ellipse(width / 2, height / 2, 50, 50); // 크기 조절 가능
}

function showDiscoveryAnimation(region) {
  discoveryMessage = region;
  discoveryTimer = 120; // 약 2초 동안 표시 (60 FPS 기준)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight, WEBGL);
  paintLayer.resizeCanvas(windowWidth, windowHeight);
  console.log(`Canvas resized to: ${windowWidth}x${windowHeight}`);
}

// 데스크탑용 마우스 움직임으로 현재 방위각 업데이트
function mouseMoved() {
  if (!isMobileDevice()) {
    currentAzimuth = map(mouseX, 0, width, 0, 360);
  }
  
  // 데스크탑에서 키보드 입력으로 이동 시뮬레이션
  if (isSimulating) {
    // 예시: 화살표 키를 누르면 이동 거리 증가
    // 이 부분은 키보드 이벤트 핸들링으로 구현 가능
  }
}

function keyPressed() {
  if (isSimulating) {
    let moveStep = 10; // 이동할 거리
    switch (keyCode) {
      case LEFT_ARROW:
        simulatedPosition.longitude -= 0.001; // 이동 시뮬레이션
        currentAzimuth = 270;
        movedDistance += moveStep;
        break;
      case RIGHT_ARROW:
        simulatedPosition.longitude += 0.001;
        currentAzimuth = 90;
        movedDistance += moveStep;
        break;
      case UP_ARROW:
        simulatedPosition.latitude += 0.001;
        currentAzimuth = 0;
        movedDistance += moveStep;
        break;
      case DOWN_ARROW:
        simulatedPosition.latitude -= 0.001;
        currentAzimuth = 180;
        movedDistance += moveStep;
        break;
    }
    currentRegion = getCurrentRegion();
  }
}

function requestDeviceOrientation() {
  // iOS 권한 요청
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          select('button').remove(); // 버튼 제거
        }
      })
      .catch(console.error);
  } else {
    // iOS가 아닌 경우 이벤트 리스너 추가
    window.addEventListener('deviceorientation', handleOrientation);
    select('button').remove(); // 버튼 제거
  }
}
