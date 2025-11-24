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

    this.init();
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
    document.body.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this.createEnvironment();

    // Player 인스턴스 생성 시 world 전달
    this.player = new Player(this.scene, this.world);

    window.addEventListener("resize", this.onWindowResize.bind(this));

    //스카이박스 로드 및 적용
    this.loadSkybox();
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

    // 1. 낮은 플랫폼 (바닥 y=0 위에 중심이 y=0.5에 오도록):
    this.createPlatform(5, 0.5, 0, 8, 1, 8, 0x8b4513);

    // 2. 높은 탑 (중심이 Y=5에 오도록)
    this.createPlatform(15, 5, 5, 4, 10, 4, 0xffa500);

    // 3. 공중에 떠 있는 긴 구조물 (Z=-10, 중심이 Y=2에 오도록)
    this.createPlatform(-10, 2, -2, 20, 4, 2, 0x008000);

    // 4. 아주 작은 발판 (중심이 Y=3에 오도록)
    this.createPlatform(2, 3, 5, 1, 1, 1, 0x0000ff);

    const jumpPlatformColor = 0x6a0dad; // 보라색
    let currentY = 5.0;
    let currentX = -20;

    for (let i = 0; i < 4; i++) {
      currentY += 1.5; // 다음 발판 높이
      currentX += 3.5; // 다음 발판 수평 거리

      // 작은 정사각형 발판
      this.createPlatform(
        currentX,
        currentY,
        -5, // Z축은 고정
        2.5, // 너비
        0.5, // 높이 (얇게)
        2.5, // 깊이
        jumpPlatformColor
      );
    }

    // ⭐ 6. 아주 긴 외나무다리 (높이 10m) ⭐
    this.createPlatform(
      15,
      10,
      7,
      30, // 길이 (X축으로 길게)
      0.5,
      1.5, // 폭이 좁아지므로 더 어렵습니다.
      0x888888
    );

    // ⭐ 7. 플레이어 시작 위치 근처에 높은 기둥 ⭐
    this.createPlatform(
      -5,
      1.5,
      8,
      2,
      3,
      2,
      0xff0000 // 빨간색
    );

    // ⭐⭐⭐ 맵 경계 벽 생성 (바닥 크기: X=50, Z=20) ⭐⭐⭐
    const sizeX = 50;
    const sizeZ = 20;
    const wallHeight = 15;
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

  update() {
    // ⭐⭐⭐ 1. 물리 세계 업데이트 (가장 중요) ⭐⭐⭐
    this.world.step(this.fixedTimeStep);

    // 2. Player 업데이트 (물리 계산된 위치를 3D 모델에 적용)
    this.player.update();

    // 3. 카메라 추적
    if (this.player.model) {
      const model = this.player.playerGroup;
      this.camera.position.x = model.position.x;
      this.camera.position.y = model.position.y + 3;
      this.camera.position.z = model.position.z + 5;
      this.camera.lookAt(model.position);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
