// main.js

// 1. Three.js 라이브러리 불러오기
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// 키보드 입력 상태를 저장하는 객체
const keys = {
  w: false,
  s: false,
  a: false,
  d: false,
};

const moveSpeed = 0.05; // 큐브의 이동 속도 설정

// 변수 선언 (Scene, Camera, Renderer, Cube)
let scene, camera, renderer, cube;

// 초기화 함수: 모든 설정을 시작합니다.
function init() {
  // Scene 설정
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333); // 배경색을 어두운 회색으로 설정

  // 원근 카메라 설정
  camera = new THREE.PerspectiveCamera(
    200, //표준적인 시야 각 값이 클수록 시야가 넓어지고 왜곡이 심해짐
    window.innerWidth / window.innerHeight, //현재 웹 브라우저 창의 내부 너비와 높이 값을 의미
    0.1, //카메라로부터 가장 가까운 거리를 나타냅니다. 이 거리보다 가까이 있는 물체는 화면에 렌더링되지 않습니다.
    1000 //카메라로부터 가장 먼 거리를 나타냅니다. 이 거리보다 멀리 있는 물체는 화면에 렌더링되지 않아 성능을 절약할 수 있습니다.
  );
  camera.position.z = 5;

  // Renderer 설정
  renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias로 모서리를 부드럽게 처리
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Mesh (큐브) 설정
  const geometry = new THREE.BoxGeometry(1, 1, 1); //정육면체 가로(Width), 세로(Height), 깊이(Depth)
  // MeshBasicMaterial 대신 빛의 영향을 받는 MeshStandardMaterial을 사용해 봅시다.
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); //Three.js에서 제공 물리 기반 렌더링(PBR) 재질 중 하나
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Light (빛) 설정 - MeshStandardMaterial이 보이려면 빛이 필요합니다.
  // 장면 전체를 은은하게 비춥니다. 그림자는 만들지 않지만, 어두운 면이 완전히 검게 되는 것을 방지합니다.
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 주변광

  scene.add(ambientLight);

  //태양처럼 특정 방향에서 오는 빛입니다. 이 빛이 있어야 그림자가 생기고 물체의 입체감이 살아납니다.
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 방향광
  directionalLight.position.set(2, 2, 5); // 빛의 방향 설정
  scene.add(directionalLight);
  document.addEventListener("keydown", (event) => {
    switch (event.key.toLowerCase()) {
      case "w":
        keys.w = true;
        break;
      case "s":
        keys.s = true;
        break;
      case "a":
        keys.a = true;
        break;
      case "d":
        keys.d = true;
        break;
    }
  });

  document.addEventListener("keyup", (event) => {
    switch (event.key.toLowerCase()) {
      case "w":
        keys.w = false;
        break;
      case "s":
        keys.s = false;
        break;
      case "a":
        keys.a = false;
        break;
      case "d":
        keys.d = false;
        break;
    }
  });
  // 화면 크기가 변경될 때 카메라와 렌더러를 업데이트하는 리스너 추가
  window.addEventListener("resize", onWindowResize, false);
}

// 창 크기가 변경될 때 호출되는 함수
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // 카메라 설정 업데이트
  renderer.setSize(window.innerWidth, window.innerHeight); // 렌더러 크기 업데이트
}

function animate() {
  requestAnimationFrame(animate);

  // 1. 키보드 입력에 따른 큐브 위치 업데이트
  if (keys.w) {
    cube.position.z -= moveSpeed; // W: 앞으로 이동 (Z축 마이너스 방향)
  }
  if (keys.s) {
    cube.position.z += moveSpeed; // S: 뒤로 이동 (Z축 플러스 방향)
  }
  if (keys.a) {
    cube.position.x -= moveSpeed; // A: 왼쪽으로 이동 (X축 마이너스 방향)
  }
  if (keys.d) {
    cube.position.x += moveSpeed; // D: 오른쪽으로 이동 (X축 플러스 방향)
  }

  // (선택 사항) 큐브 회전 애니메이션 제거 또는 유지
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;

  // 2. 장면 렌더링
  renderer.render(scene, camera);
}

// 프로그램 시작
init();
animate();
