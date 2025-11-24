// js/Game.js
import { Player } from "./Player.js";

export class Game {
  constructor() {
    this.scene = new THREE.Scene();

    // Cannon.js 물리 세계 설정
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0); // 현실적인 중력
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.fixedTimeStep = 1.0 / 60.0; // 물리 업데이트 속도 (60 FPS)

    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.platforms = [];

    // 게임 상태 및 최종 플랫폼 위치
    this.isGameOver = false;
    this.finalPlatformY = 154; // 최종 플랫폼의 Y 좌표 저장

    // 안내 메시지 상태 관리
    this.isInstructionShown = false; // 안내 메시지가 현재 표시 중인지 여부

    // 최대 높이 기록 변수
    this.maxHeightReached = 0;

    // 타이머 시작 시간 변수
    this.startTime = 0;

    // 로비 요소 참조
    this.lobbyElement = document.getElementById("game-lobby");
    this.hudElements = [
      "max-height-display",
      "game-timer",
      "victory-message",
      "instruction-message",
    ];

    this.cameraAngle = 0; // 초기 각도 (라디안)
    this.cameraDistance = 5;

    this.init();
    this.showLobby();
  }

  init() {
    // 카메라, 렌더러, 조명 설정...
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    //document.body.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this.createEnvironment();

    // Player 인스턴스 생성 시 world 전달
    //this.player = new Player(this.scene, this.world);

    window.addEventListener("resize", this.onWindowResize.bind(this));

    //스카이박스 로드 및 적용
    this.loadSkybox();

    // 타이머 시작 시간 기록
    //this.startTime = Date.now();

    // ✅ 추가: 카메라 회전 키 입력 핸들러
    document.addEventListener("keydown", (event) => {
      const rotationSpeed = 0.1; // 각도 변화 속도 (라디안)
      if (event.key === "q" || event.key === "Q") {
        // Q: 시계 반대 방향 (좌회전)
        this.cameraAngle += rotationSpeed;
      } else if (event.key === "e" || event.key === "E") {
        // E: 시계 방향 (우회전)
        this.cameraAngle -= rotationSpeed;
      } // 각도가 2*PI(360도)를 넘지 않도록 합니다.
      this.cameraAngle %= Math.PI * 2;
    });
  }

  // ✅ 추가: 로비 화면 표시 및 이벤트 설정
  showLobby() {
    if (this.lobbyElement) {
      this.lobbyElement.classList.remove("hidden");
    }
    this.hudElements.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    // 버튼 이벤트 리스너 추가
    document.getElementById("start-game-button").onclick = () =>
      this.startGame();
    document.getElementById("view-records-button").onclick = () =>
      alert("기록 보기 기능은 아직 구현되지 않았습니다.");
    document.getElementById("exit-game-button").onclick = () => window.close(); // 브라우저 창 닫기 시도
  }

  // 게임 시작 로직 (로비를 숨기고 게임을 렌더링)
  startGame() {
    // 1. 로비 숨기기
    if (this.lobbyElement) {
      this.lobbyElement.classList.add("hidden");
    }

    // 2. 렌더러를 DOM에 추가 (게임 화면 표시)
    document.body.appendChild(this.renderer.domElement);

    // 3. HUD 표시
    document.getElementById("max-height-display").classList.remove("hidden");
    document.getElementById("game-timer").classList.remove("hidden");

    // 4. 플레이어 생성 및 초기화
    this.player = new Player(this.scene, this.world);

    // 5. 게임 상태 초기화 및 타이머 시작
    this.isGameOver = false;
    this.maxHeightReached = 0;
    this.startTime = Date.now();
    document.getElementById("max-height-display").textContent =
      "최대 도달 높이 : 0.0m";
    document.getElementById("game-timer").textContent = "시간: 00:00";

    // 플레이어가 없었을 때 멈춰있던 update() 루프를 다시 시작하기 위해 명시적으로 요청 (main.js에서 호출됨)
    // main.js의 animate() 루프는 이미 실행 중이지만, player가 없었기에 카메라 추적이 되지 않았을 수 있습니다.
    // 이 시점부터 모든 것이 정상 작동합니다.
    console.log("Game Started!");
  }

  // 타이머 업데이트 함수
  updateTimer() {
    if (this.isGameOver) return; // 게임 종료 시 타이머 멈춤

    const elapsedMilliseconds = Date.now() - this.startTime;
    const totalSeconds = Math.floor(elapsedMilliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // 두 자리 숫자로 포맷팅 (예: 05, 12)
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    const timerElement = document.getElementById("game-timer");
    if (timerElement) {
      timerElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
    }
  }

  loadSkybox() {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath("./assets/Skybox/"); // 스카이박스 이미지들이 있는 경로

    const texture = loader.load(
      [
        "posx.jpg",
        "negx.jpg", // x-axis
        "posy.jpg",
        "negy.jpg", // y-axis
        "posz.jpg",
        "negz.jpg", // z-axis
      ],
      () => {
        this.scene.background = texture; // 씬의 배경으로 스카이박스 설정
        console.log("Skybox loaded successfully!");
      },
      undefined,
      (error) => {
        console.error("Error loading skybox:", error);
        // 에러 발생 시 단색 배경으로 대체 (선택 사항)
        this.scene.background = new THREE.Color(0x333333);
      }
    );
  }

  // 플랫폼 생성 함수: 위치(x, y, z)와 크기(width, height, depth) 명시
  createPlatform(x, y, z, width, height, depth, color, opacity = 1.0) {
    // 1. Three.js Mesh (시각적 오브젝트) 생성
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({
      color: color,
      transparent: opacity < 1.0, // opacity가 1.0 미만이면 투명 모드 활성화
      opacity: opacity,
    });
    const platform = new THREE.Mesh(geometry, material);

    // Y 좌표는 '중심'을 기준으로 합니다.
    platform.position.set(x, y, z);
    // 플랫폼의 원래 색상을 userData에 저장합니다.
    platform.userData.originalColor = color;
    platform.userData.isFinal = y === this.finalPlatformY; // 최종 플랫폼 여부
    this.scene.add(platform);
    this.platforms.push(platform);

    // 2. Cannon.js Body (물리 충돌체) 생성
    // Cannon.js는 크기를 '반지름/반쪽 크기'로 받습니다.
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const shape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0, // 질량이 0이면 Static (고정된 충돌체)
      shape: shape,
    });

    // ✅ 추가: 충돌 이벤트 리스너 등록
    body.addEventListener("collide", (event) => {
      // 충돌한 다른 바디가 플레이어 바디인지 확인해야 함.
      // Game 클래스는 Player 객체에 접근 가능하므로 this.player.body와 비교합니다.
      if (this.player && event.body === this.player.body) {
        // 충돌이 발생하면 이 플랫폼의 시각적 메쉬를 찾아 색상 변경 함수를 호출합니다.
        this.flashPlatformColor(platform);
      }
    });

    // 물리 바디의 위치를 3D 오브젝트와 동일하게 설정합니다.
    body.position.set(
      platform.position.x,
      platform.position.y,
      platform.position.z
    );
    this.world.addBody(body);

    platform.userData.physicsBody = body;
  }

  createModelPlatform(url, x, y, z, scale = 1.0) {
    const loader = new THREE.GLTFLoader();

    loader.load(url, (gltf) => {
      const model = gltf.scene;
      model.scale.set(scale, scale, scale);
      model.position.set(x, y, z);
      this.scene.add(model);
      this.platforms.push(model);

      // 1. 모델의 크기를 대략적으로 파악합니다 (Box3를 사용).
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      // 2. Cannon.js Body 생성 (모델 크기와 동일한 Box 형태로 근사)
      // 충돌체 크기 = (모델 크기 * 스케일) / 2
      const halfExtents = new CANNON.Vec3(
        (size.x * scale) / 2,
        (size.y * scale) / 2,
        (size.z * scale) / 2
      );
      const shape = new CANNON.Box(halfExtents);

      const body = new CANNON.Body({
        mass: 0, // 고정 플랫폼
        shape: shape,
        position: new CANNON.Vec3(x, y, z), // 모델과 같은 위치에 물리 바디 배치
      });

      this.world.addBody(body);

      // 시각적 모델의 위치를 물리 바디에 연결합니다.
      // (이 경우 모델도 Static이므로 크게 필요 없지만, 동기화를 위해 연결)
      model.userData.physicsBody = body;

      console.log(`Model platform '${url}' loaded with Box collision.`);
    });
  }
  createEnvironment() {
    // Three.js 바닥 (시각적)
    const planeGeometry = new THREE.PlaneGeometry(50, 20);
    const planeMaterial = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      transparent: true, // 투명도 활성화
      opacity: 0.2,
    }); //흰색은 0xcccccc
    const floor = new THREE.Mesh(planeGeometry, planeMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // Cannon.js 바닥 (물리)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    this.world.addBody(groundBody);

    // 3. 50개 초고난도 플랫폼 생성 로직 (가능한 난이도로 조정)

    const platformCount = 50;
    let currentY = 1.0;
    let currentX = 0;
    let currentZ = 0;
    let step = 0; // 나선형/지그재그 패턴 단계를 위한 변수

    // ✅ 플레이어 점프력(8)으로 도달 가능한 최대 난이도 값
    const JUMP_HEIGHT = 3.0; // 수직 이동 (가능 최대: 3.26m)
    const HORIZONTAL_JUMP = 6.0; // 수평 이동 (난이도 극대화)

    const PLATFORM_W = 1.0; // 플랫폼 폭 (착지 난이도 극대화)
    const PLATFORM_H = 0.2;
    const PLATFORM_D = 1.0;

    // 시작 플랫폼 (녹색)
    this.createPlatform(0, 0.5, 0, 4, 1, 4, 0x00ff00);

    for (let i = 1; i <= platformCount; i++) {
      // Y축 업데이트: 매번 3.0m씩 올라가 극한의 수직 점프 요구
      currentY += JUMP_HEIGHT;

      // X, Z축 업데이트: 맵 경계 내에서 나선형/지그재그 패턴으로 이동

      let isMoving = false; // i는 0부터 시작하므로, i+1이 10의 배수일 때 (10번째, 20번째 등)
      if (i > 0 && (i + 1) % 10 === 0) {
        isMoving = true;
      }

      if (i % 4 === 1) {
        // 1단계: 북동쪽으로 이동
        currentX += HORIZONTAL_JUMP * 0.8;
        currentZ += HORIZONTAL_JUMP * 0.4;
      } else if (i % 4 === 2) {
        // 2단계: 남동쪽으로 이동
        currentX += HORIZONTAL_JUMP * 0.8;
        currentZ -= HORIZONTAL_JUMP * 0.4;
      } else if (i % 4 === 3) {
        // 3단계: 남서쪽으로 이동
        currentX -= HORIZONTAL_JUMP * 0.8;
        currentZ -= HORIZONTAL_JUMP * 0.4;
      } else {
        // 4단계: 북서쪽으로 이동
        currentX -= HORIZONTAL_JUMP * 0.8;
        currentZ += HORIZONTAL_JUMP * 0.4;
      }

      // 맵 경계 (X: ±25, Z: ±10)를 벗어나지 않도록 강제 제한
      currentX = Math.min(24, Math.max(-24, currentX));
      currentZ = Math.min(9, Math.max(-9, currentZ));

      // 색상: 난이도가 올라갈수록 붉은 계열로 변경
      const color = new THREE.Color().setHSL(
        (i / platformCount) * 0.3,
        1.0,
        0.5
      ); // 빨강, 주황 계열

      // 플랫폼 생성
      this.createPlatform(
        currentX, // X 위치 (좌우 극한)
        currentY, // Y 위치 (수직 극한)
        currentZ, // Z 위치 (깊이감)
        PLATFORM_W, // 너비 (아주 좁음)
        PLATFORM_H, // 높이
        PLATFORM_D, // 깊이 (아주 좁음)
        color.getHex()
      );
      // ✅ 2. 움직이는 플랫폼 정보 저장 (이동 로직의 핵심)
      const platformMesh = this.platforms[this.platforms.length - 1]; // 방금 생성된 플랫폼
      platformMesh.userData.isMoving = isMoving;
      platformMesh.userData.startPos = {
        x: platformMesh.position.x,
        y: platformMesh.position.y,
        z: platformMesh.position.z,
      };

      console.log(
        `Platform ${i} created at (${currentX.toFixed(2)}, ${currentY.toFixed(
          2
        )}, ${currentZ.toFixed(2)}) (Moving: ${isMoving})`
      );
    }

    // ⭐⭐⭐ 4. 정상 층 (51번째 플랫폼) 추가 ⭐⭐⭐
    // 마지막 플랫폼보다 5m 높게, 크고 밝게 만듭니다.

    const finalPlatformColor = 0xffff00; // 밝은 노란색 (승리를 상징)
    const finalPlatformY = currentY + 5.0; // 마지막 플랫폼 높이 + 5m

    this.createPlatform(
      4.8,
      152,
      -8,
      10,
      0.5,
      10,
      finalPlatformColor,
      0.8 // 약간의 투명도 (우주와 어우러지도록)
    );

    // ⭐⭐⭐ 맵 경계 벽 생성 (바닥 크기: X=50, Z=20) ⭐⭐⭐
    const sizeX = 50;
    const sizeZ = 20;
    const wallHeight = 150;
    const wallThickness = 1;
    const wallColor = 0x555555;

    // 벽의 중심 Y 위치
    const wallCenterY = wallHeight / 2;

    // 벽의 중심 좌표 (경계 + 벽 두께 절반)
    const boundaryX = sizeX / 2 + wallThickness / 2; // 25.5
    const boundaryZ = sizeZ / 2 + wallThickness / 2; // 10.5
    // 1. 동/서 벽 (X 방향 경계)
    // 벽의 길이는 Z축 크기와 동일하게 (20)
    // ⭐⭐⭐ 남쪽 벽 투명하게 만들기 ⭐⭐⭐
    const WallOpacity = 0; // 20% 불투명 (80% 투명)

    // 동쪽 벽 (X = +25.5 위치)
    this.createPlatform(
      boundaryX, // X = 25 + 0.5 = 25.5
      wallCenterY,
      0,
      wallThickness,
      wallHeight,
      sizeZ + wallThickness * 2, // 맵 Z 크기(20)보다 길게 만들어서 모서리를 덮음
      wallColor,
      WallOpacity
    );
    // 서쪽 벽 (X = -25.5 위치)
    this.createPlatform(
      -boundaryX, // X = -25.5
      wallCenterY,
      0,
      wallThickness,
      wallHeight,
      sizeZ + wallThickness * 2,
      wallColor,
      WallOpacity
    );

    // 2. 남/북 벽 (Z 방향 경계)
    // 벽의 길이는 X축 크기와 동일하게 (50)

    // 북쪽 벽 (Z = -10.5 위치)
    this.createPlatform(
      0,
      wallCenterY,
      -boundaryZ, // Z = -10 - 0.5 = -10.5
      sizeX, // 맵 X 크기(50)와 동일
      wallHeight,
      wallThickness,
      wallColor,
      WallOpacity // ⭐ opacity 인수 전달 ⭐
    );

    this.createPlatform(
      0,
      wallCenterY,
      boundaryZ,
      sizeX,
      wallHeight,
      wallThickness,
      wallColor,
      WallOpacity // ⭐ opacity 인수 전달 ⭐
    );
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ✅ 변경: 플레이어 상태 확인 함수 (승리 조건 및 안내 메시지)
  checkPlayerState() {
    if (!this.player || !this.player.body || this.isGameOver) return;

    const playerY = this.player.body.position.y;
    const finalPlatformApproxY = this.finalPlatformY; // 최종 플랫폼의 중심 Y
    const WINNING_JUMP_HEIGHT = 154.0; // 승리 기준 높이

    // 1. 안내 메시지 표시/숨김 로직
    const instructionMessageElement = document.getElementById(
      "instruction-message"
    );
    if (instructionMessageElement) {
      // 플레이어가 최종 플랫폼 근처에 도달했을 때 (예: 최종 플랫폼 Y - 2m ~ 최종 플랫폼 Y + 5m 사이)
      if (
        (playerY > finalPlatformApproxY - 2.0 &&
          playerY < finalPlatformApproxY + 5.0) ||
        (playerY > 0 && playerY < 2)
      ) {
        if (!this.isInstructionShown) {
          instructionMessageElement.classList.remove("hidden");
          instructionMessageElement.style.opacity = 1;
          this.isInstructionShown = true;
          console.log("Instruction message shown.");
        }
      } else {
        // 최종 플랫폼 영역을 벗어나면 메시지 숨김
        if (this.isInstructionShown) {
          instructionMessageElement.style.opacity = 0;
          // 트랜지션 완료 후 hidden 클래스 추가
          setTimeout(() => {
            instructionMessageElement.classList.add("hidden");
          }, 500); // CSS transition 시간과 맞춤
          this.isInstructionShown = false;
          console.log("Instruction message hidden.");
        }
      }
    }

    // 2. 승리 조건 확인 로직
    // 플레이어가 154m 높이에 도달했고, 현재 상승 중(점프 중)일 때 승리 처리
    if (playerY >= WINNING_JUMP_HEIGHT && this.player.body.velocity.y > 0.01) {
      this.handleWin();
    }
  }

  // 승리 처리 및 리셋 타이머 함수
  handleWin() {
    this.isGameOver = true;
    console.log("🎉 WIN! Game Over. Resetting in 10 seconds.");

    // 승리 메시지 표시
    const victoryMessageElement = document.getElementById("victory-message");
    if (victoryMessageElement) {
      victoryMessageElement.classList.remove("hidden");
      victoryMessageElement.style.opacity = 1;
    }

    // 안내 메시지가 보이고 있다면 숨김
    const instructionMessageElement = document.getElementById(
      "instruction-message"
    );
    if (instructionMessageElement && this.isInstructionShown) {
      instructionMessageElement.style.opacity = 0;
      setTimeout(() => {
        instructionMessageElement.classList.add("hidden");
      }, 500);
      this.isInstructionShown = false;
    }

    // 2. 10초 후 게임 초기화
    setTimeout(() => {
      this.resetGame();
    }, 10000); // 10000ms = 10초
  }

  // 게임 초기화 함수
  resetGame() {
    console.log("Game reset requested. Reloading page...");
    // 페이지 새로고침을 통해 게임 상태를 가장 간단하게 초기화합니다.
    window.location.reload();
  }

  // 플랫폼 색상 변경 함수
  flashPlatformColor(platformMesh) {
    if (!platformMesh || !platformMesh.material) return;

    // 반짝이는 색상 설정 (최종 플랫폼은 황금색, 일반 플랫폼은 밝은 파란색)
    const flashColor = platformMesh.userData.isFinal ? 0xffd700 : 0x00ffff; // 금색 또는 청록색
    const originalColor = platformMesh.userData.originalColor;

    // 1. 색상 변경
    platformMesh.material.color.setHex(flashColor);

    // 2. 200ms 후 원래 색상으로 복구
    setTimeout(() => {
      // 복구 시에도 원래 색상으로 설정 (저장된 originalColor 사용)
      platformMesh.material.color.setHex(originalColor);
    }, 2000); // 2초 동안 색상 유지
  }

  update() {
    // 게임 오버 상태일 경우 렌더링만 하고 로직 건너뛰기
    if (!this.player || this.isGameOver) {
      // 렌더러가 DOM에 추가되어 있다면 렌더링만 유지 (선택 사항)
      if (this.renderer.domElement.parentNode) {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    // ⭐⭐⭐ 1. 물리 세계 업데이트 (가장 중요) ⭐⭐⭐
    this.world.step(this.fixedTimeStep);

    // 타이머 업데이트
    this.updateTimer();

    // 2. Player 업데이트 (물리 계산된 위치를 3D 모델에 적용)
    this.player.update();

    // ✅ 추가: 움직이는 플랫폼 업데이트 로직
    const time = Date.now() * 0.001; // 현재 시간 (초 단위)
    this.platforms.forEach((mesh) => {
      // mesh.userData.isMoving 플래그가 true인 플랫폼만 움직입니다.
      if (mesh.userData.isMoving) {
        // GLTF 모델처럼 userData.physicsBody가 정의되지 않은 오브젝트는 건너뜁니다.
        if (!mesh.userData.physicsBody) return;

        const body = mesh.userData.physicsBody;
        const startY = mesh.userData.startPos.y;

        // 시간에 따라 사인 함수를 이용하여 Y축으로 움직입니다. (진폭 3m, 속도 1.5)
        const newY = startY + Math.sin(time * 1.5) * 3;

        // 1. Cannon.js 물리 바디 위치 업데이트
        body.position.y = newY;

        // 2. Three.js 메쉬 위치 업데이트
        mesh.position.y = newY;
      }
    });
    // 최대 높이 추적 및 표시 로직
    if (this.player.body) {
      const currentY = this.player.body.position.y;
      if (currentY > this.maxHeightReached) {
        this.maxHeightReached = currentY;
        const displayElement = document.getElementById("max-height-display");
        if (displayElement) {
          // 소수점 첫째 자리까지 표시
          displayElement.textContent = `최대 도달 높이 : ${this.maxHeightReached.toFixed(
            1
          )}m`;
        }
      }
    }

    // 3. 카메라 추적
    if (this.player.model) {
      const model = this.player.playerGroup; // ✅ 수정: 각도와 거리를 이용해 카메라 위치 계산
      const camX =
        model.position.x + this.cameraDistance * Math.sin(this.cameraAngle);
      const camZ =
        model.position.z + this.cameraDistance * Math.cos(this.cameraAngle);

      this.camera.position.x = camX;
      this.camera.position.y = model.position.y + 3;
      this.camera.position.z = camZ;
      this.camera.lookAt(model.position);
    }

    // 매 업데이트마다 승리 조건 확인
    this.checkPlayerState();

    this.renderer.render(this.scene, this.camera);
  }
}
