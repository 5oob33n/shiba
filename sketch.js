let paintLayer;
let shibaModel; // 3D 시바견 모델
let shibaTexture; // 텍스처 이미지
let exploredRegions = [];
let discoveryMessage = "";
let discoveryTimer = 0;

let previousPosition;
let movedDistance = 0;
let currentAzimuth = 0;
let currentRegion = 'desert';

let simulatedPosition = { latitude: 0, longitude: 0 };
let isSimulating = false;

// Shiba Inu의 위치 (초기값: 중앙)
let shibaX = 0;
let shibaY = 0;

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function preload() {
  // 3D 모델과 텍스처 이미지 로드
  shibaModel = loadModel('Shiba.obj', true); // 실제 업로드한 파일명으로 변경
  shibaTexture = loadImage('shiba_texture.png'); // 실제 업로드한 텍스처 파일명으로 변경
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

  // 자연 요소 그리기
  drawNaturalElements();

  // 현재 위치 표시
  drawCurrentLocation();

  // 3D 시바견 모델 그리기
  push();
  translate(shibaX, shibaY, 0); // 현재 위치로 이동

  // 모델의 방향 수정 (currentAzimuth에 따라 Y축 회전)
  rotateX(HALF_PI); // 모델을 위쪽을 향하게 회전
  rotateY(radians(currentAzimuth)); // 현재 방위각에 따라 회전

  scale(0.5); // 모델 크기 조절

  // 텍스처 적용
  if (shibaTexture) {
    texture(shibaTexture);
  }

  noStroke();
  model(shibaModel);
  pop();

  // paintLayer 표시 (2D 레이어) - 모델 그린 후 그려서 그라데이션이 보이도록 함
  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  image(paintLayer, 0, 0);
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
  let alpha = event.alpha;
  let beta = event.beta;
  let gamma = event.gamma;

  // 방위각 계산 (나침반 0도는 위쪽을 향하도록 조정)
  currentAzimuth = alpha;

  // currentAzimuth를 [0, 360) 범위로 정규화
  currentAzimuth = (currentAzimuth + 360) % 360;

  // 모바일 기기에서 이동 시 그라데이션 적용
  if (isMobileDevice() && previousPosition) {
    // 실제 이동 거리를 계산하는 로직 필요
    // 여기서는 예시로 고정된 거리 사용
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, previousPosition.latitude + 0.001, previousPosition.longitude + 0.001); // 예시 거리 계산
    movedDistance += distance;

    // 이동 방향에 따라 Shiba Inu 위치 업데이트
    let moveX = cos(radians(currentAzimuth)) * (distance / 10); // 스케일 조정 필요
    let moveY = sin(radians(currentAzimuth)) * (distance / 10);
    shibaX += moveX;
    shibaY += moveY;

    // 그라데이션 효과 적용
    applyGradientEffect(distance, currentAzimuth);
  }
}

function updatePosition(position) {
  let latitude = position.coords.latitude;
  let longitude = position.coords.longitude;

  if (previousPosition) {
    let distance = calculateDistance(previousPosition.latitude, previousPosition.longitude, latitude, longitude);
    movedDistance += distance;
    currentAzimuth = calculateBearing(previousPosition.latitude, previousPosition.longitude, latitude, longitude);

    // currentAzimuth를 [0, 360) 범위로 정규화
    currentAzimuth = (currentAzimuth + 360) % 360;

    // Shiba Inu 위치 업데이트
    let moveX = cos(radians(currentAzimuth)) * (distance / 10); // 스케일 조정 필요
    let moveY = sin(radians(currentAzimuth)) * (distance / 10);
    shibaX += moveX;
    shibaY += moveY;

    // 그라데이션 효과 적용
    applyGradientEffect(distance, currentAzimuth);
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

function applyGradientEffect(distance, azimuth) {
  // 현재 지역에 맞는 색상 선택
  let currentColor;

  if (currentRegion === 'forest') {
    currentColor = color(34, 139, 34, 150); // 초록색
  } else if (currentRegion === 'sea') {
    currentColor = color(30, 144, 255, 150); // 파란색
  } else if (currentRegion === 'desert') {
    currentColor = color(50, 205, 50, 150); // 라임색
  } else {
    currentColor = color(200, 200, 200, 150); // 회색
  }

  // 이동 거리에 따른 그라데이션 크기 설정 (조정: 0-500 -> 0-300)
  let gradientSize = map(distance, 0, 500, 0, 300);
  gradientSize = constrain(gradientSize, 0, 300); // 최대 300으로 제한

  // 방위각을 이용해 그라데이션 위치 계산 (나침반 0도가 위쪽을 향하도록 조정)
  let directionRadians = radians(azimuth - 90);
  let xOffset = cos(directionRadians) * gradientSize;
  let yOffset = sin(directionRadians) * gradientSize;

  console.log(`Drawing gradient at (${width / 2 + xOffset + shibaX}, ${height / 2 + yOffset + shibaY}) with size ${gradientSize}`);

  // 그라데이션 그리기
  for (let i = 0; i < 10; i++) {
    let size = map(i, 0, 10, gradientSize / 10, gradientSize);
    let alphaVal = map(i, 0, 10, 200, 0); // 점점 투명해지도록 설정
    paintLayer.fill(red(currentColor), green(currentColor), blue(currentColor), alphaVal);
    paintLayer.ellipse(width / 2 + xOffset + shibaX, height / 2 + yOffset + shibaY, size, size);
  }
}

function getCurrentRegion() {
  // 방위각을 기준으로 지역 결정
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
      let treeX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let treeY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let treeWidth = random(20, 40);
      let treeHeight = random(100, 150);
      paintLayer.rect(treeX, treeY, treeWidth, treeHeight);
    }
  } else if (currentRegion === 'sea') {
    // 다양한 크기와 형태의 파도 그리기
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(30, 144, 255, 150); // 파란색
      let waveX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let waveY = random(height / 2 - 150, height / 2 + 150) + shibaY;
      let waveWidth = random(50, 100);
      let waveHeight = random(20, 40);
      paintLayer.ellipse(waveX, waveY, waveWidth, waveHeight);
    }
  } else if (currentRegion === 'desert') {
    // 다양한 크기와 형태의 선인장 그리기
    for (let i = 0; i < 5; i++) {
      paintLayer.fill(50, 205, 50, 150); // 라임색
      let cactusX = random(width / 2 - 150, width / 2 + 150) + shibaX;
      let cactusY = random(height / 2 - 150, height / 2 + 150) + shibaY;
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
    currentLocationColor = color(200, 200, 200, 200); // 회색
  }

  // 현재 위치 표시 (2D 레이어의 중앙)
  paintLayer.noStroke();
  paintLayer.fill(currentLocationColor);
  paintLayer.ellipse(width / 2 + shibaX, height / 2 + shibaY, 50, 50); // 크기 조절 가능
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

// 키보드 입력으로 이동 시뮬레이션 및 그라데이션 효과 적용
function keyPressed() {
  if (isSimulating) {
    let moveStep = 10; // 이동할 거리 (미터 단위로 가정)
    let azimuth = currentAzimuth; // 현재 방향 유지
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

    // currentAzimuth를 [0, 360) 범위로 정규화
    currentAzimuth = (currentAzimuth + 360) % 360;

    currentRegion = getCurrentRegion();

    // Shiba Inu 위치 업데이트
    let moveX = cos(radians(currentAzimuth)) * (moveStep / 10); // 스케일 조정 필요
    let moveY = sin(radians(currentAzimuth)) * (moveStep / 10);
    shibaX += moveX;
    shibaY += moveY;

    // 그라데이션 효과 적용
    applyGradientEffect(moveStep, currentAzimuth);

    console.log(`Moved Distance: ${movedDistance}, Current Azimuth: ${currentAzimuth}`);
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
