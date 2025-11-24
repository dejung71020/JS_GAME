// js/Player.js
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  f: false,
  p: false,
};

document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "w":
      keyState.w = true;
      break;
    case "a":
      keyState.a = true;
      break;
    case "s":
      keyState.s = true;
      break;
    case "d":
      keyState.d = true;
      break;
    case " ":
      keyState.space = true;
      break;
    case "f":
      keyState.f = true;
      break;
    case "p":
      keyState.p = true;
      break;
  }
});
document.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "w":
      keyState.w = false;
      break;
    case "a":
      keyState.a = false;
      break;
    case "s":
      keyState.s = false;
      break;
    case "d":
      keyState.d = false;
      break;
    case " ":
      keyState.space = false;
      break;
    case "f":
      keyState.f = false;
      break;
    case "p":
      keyState.p = false;
      break;
  }
});

export class Player {
  constructor(scene, world) {
    this.model = null;
    this.playerGroup = new THREE.Group(); // 모델을 담을 그룹
    this.scene = scene;
    this.world = world;
    this.body = null;
    this.maxMoveSpeed = 7;
    this.accelerationFactor = 0.15;
    this.decelerationFactor = 0.9;
    this.jumpForce = 8;

    this.playerRadius = 0.5;
    this.playerHeight = 1.0;
    this.horizontalVelocity = new THREE.Vector3(0, 0, 0);
    this.jumpKeyPressedLastFrame = false;

    // ⭐⭐⭐ 애니메이션 관련 변수 추가 ⭐⭐⭐
    this.mixer = null;
    this.actions = {}; // 애니메이션 액션을 이름으로 저장할 객체
    this.clock = new THREE.Clock(); // 시간 흐름을 측정하여 믹서를 업데이트

    // ⭐⭐ currentAction 초기화 ⭐⭐
    this.currentAction = null;

    // ⭐⭐⭐ Wave 상태 관리 변수 추가 ⭐⭐⭐
    this.fKeyPressedLastFrame = false; // F 키 Edge Trigger용
    this.isWaving = false; // 현재 Wave 애니메이션 재생 중인지 여부

    // ⭐⭐⭐ Fly Mode 관련 변수 추가 ⭐⭐⭐
    this.isFlying = false;
    this.pKeyPressedLastFrame = false;
    this.baseMaxSpeed = 7;
    this.flyMaxSpeed = 30; // 비행 시 빨라진 최대 속도
    this.flyForce = 15; // 비행 시 상승/하강 속도

    this.loadModel();
  }

  createPhysicsBody() {
    // 플레이어를 위한 캡슐 형태의 충돌체 (Cylinder를 사용하고 회전을 막음)
    const shape = new CANNON.Cylinder(
      this.playerRadius,
      this.playerRadius,
      this.playerHeight,
      8
    );

    this.body = new CANNON.Body({
      mass: 5, // 움직이는 바디
      position: new CANNON.Vec3(0, this.playerHeight / 2 + 1, 0),
      shape: shape,
    });

    this.body.fixedRotation = true; // 회전 방지 (캐릭터 제어 시 필수)
    this.body.updateMassProperties();

    this.world.addBody(this.body);
  }

  loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load("./assets/astronaut.glb", (gltf) => {
      this.model = gltf.scene;
      this.model.scale.set(1, 1, 1);
      this.model.position.y = -this.playerHeight / 2; // 모델 중심 조정

      this.playerGroup.add(this.model);
      this.scene.add(this.playerGroup);

      this.createPhysicsBody();
      // ⭐⭐⭐ 애니메이션 믹서 생성 및 클립 추출 ⭐⭐⭐
      this.mixer = new THREE.AnimationMixer(this.model);

      // ⭐⭐⭐ wave 애니메이션 완료 리스너 추가 ⭐⭐⭐
      this.mixer.addEventListener("finished", (e) => {
        if (e.action.getClip().name === "wave") {
          this.isWaving = false;
        }
      });

      // GLTF 파일에 포함된 모든 애니메이션 클립을 반복합니다.
      gltf.animations.forEach((clip) => {
        const action = this.mixer.clipAction(clip);
        this.actions[clip.name] = action;

        // ⭐ wave는 LoopOnce, 나머지는 LoopRepeat 설정
        if (clip.name === "wave") {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity);
        }
      });

      // 초기 애니메이션 설정 (대기 상태로 시작)
      this.currentAction = this.actions["idle"]; // 'Idle'이 대기 애니메이션 이름이라고 가정
      if (this.currentAction) {
        this.currentAction.play();
      }

      console.log(
        "Player model and physics body created. Animations loaded:",
        Object.keys(this.actions)
      );
    });
  }

  checkIsOnGround() {
    // 물리 바디의 Y축 속도가 0에 가까운지 확인 (충돌 후 정지 상태)
    if (!this.body) return false;
    return Math.abs(this.body.velocity.y) < 0.1;
  }

  // ⭐⭐⭐ 애니메이션을 부드럽게 전환하는 헬퍼 함수 ⭐⭐⭐
  prepareAction(nextActionName, duration = 0.5) {
    const nextAction = this.actions[nextActionName];

    // ⭐⭐ 안전 체크: 다음 액션이 없거나 현재 액션이 없으면 종료 ⭐⭐
    if (!nextAction || nextAction === this.currentAction) return;

    // 이 줄에서 오류가 났습니다. (this.currentAction이 undefined일 때)
    if (this.currentAction) {
      this.currentAction.fadeOut(duration); // 현재 액션을 페이드 아웃
    }

    nextAction.reset().fadeIn(duration).play(); // 다음 액션을 페이드 인 후 재생

    this.currentAction = nextAction; // 현재 액션을 업데이트
  }

  // ⭐⭐⭐ 애니메이션 상태 업데이트 함수 ⭐⭐⭐
  updateAnimation(speed, onGround) {
    if (!this.mixer) return;

    // ⭐⭐⭐ 1. Wave 상태 확인 (최고 우선순위) ⭐⭐⭐
    if (this.isWaving) {
      this.prepareAction("wave", 0.2);
      return;
    }

    // 2. 공중 상태 확인 (Wave가 아닐 때만 실행)
    if (!onGround) {
      this.prepareAction("floating", 0.2);
      return;
    }

    // 3. 지면 상태 확인 (Wave가 아닐 때만 실행)
    if (speed > 0.1) {
      this.prepareAction("moon_walk", 0.2);
    } else {
      this.prepareAction("idle", 0.5);
    }
  }

  update() {
    if (!this.model || !this.body) return;

    // ⭐⭐⭐ 1. 애니메이션 믹서 업데이트 ⭐⭐⭐
    if (this.mixer) {
      // 지난 프레임과의 시간 차이(delta time)를 얻어 믹서에 전달
      this.mixer.update(this.clock.getDelta());
    }

    // ⭐⭐⭐ P 키 입력 감지 (Edge Trigger & Fly Mode 토글) ⭐⭐⭐
    const isPPressedNow = keyState.p;
    if (isPPressedNow && !this.pKeyPressedLastFrame) {
      this.isFlying = !this.isFlying; // 플라이 모드 토글

      if (this.isFlying) {
        // ✅ 비행 시작: 중력 영향 무시 및 속도 증가
        this.body.gravityFactor = 0; // 이 바디에 가해지는 중력 영향 0으로 설정!
        this.body.velocity.y = 0;
        this.maxMoveSpeed = this.flyMaxSpeed;
      } else {
        // ✅ 비행 종료: 중력 영향 복구 및 속도 복구
        this.body.gravityFactor = 1; // 중력 영향 다시 활성화
        this.maxMoveSpeed = this.baseMaxSpeed;
      }
    }
    this.pKeyPressedLastFrame = isPPressedNow;

    // ⭐⭐ F 키 입력 감지 (Edge Trigger) ⭐⭐
    const isFPressedNow = keyState.f;
    if (isFPressedNow && !this.fKeyPressedLastFrame && !this.isWaving) {
      this.isWaving = true; // wave 시작 플래그 켜기
    }
    this.fKeyPressedLastFrame = isFPressedNow; // 다음 프레임을 위해 F 키 상태 저장

    const onGround = this.checkIsOnGround();
    let inputX = 0;
    let inputZ = 0;
    let inputY = 0;

    // 1. 입력 방향 계산
    if (keyState.w) inputZ -= 1;
    if (keyState.s) inputZ += 1;
    if (keyState.a) inputX -= 1;
    if (keyState.d) inputX += 1;

    // Fly Mode에 따른 'S' 키 역할 분리
    if (!this.isWaving && keyState.s) {
      if (this.isFlying) {
        inputY -= 1; // S 키: 하강
      } else {
        inputZ += 1; // S 키: 후진
      }
    }

    let inputVectorLength = Math.sqrt(inputX * inputX + inputZ * inputZ);

    // 2. 가속/감속 로직
    if (inputVectorLength > 0) {
      let normalizedInputX = inputX / inputVectorLength;
      let normalizedInputZ = inputZ / inputVectorLength;

      let targetX = normalizedInputX * this.maxMoveSpeed;
      let targetZ = normalizedInputZ * this.maxMoveSpeed;

      // 가속 (Lerp)
      this.horizontalVelocity.x +=
        (targetX - this.horizontalVelocity.x) * this.accelerationFactor;
      this.horizontalVelocity.z +=
        (targetZ - this.horizontalVelocity.z) * this.accelerationFactor;
    } else {
      // 감속 (Deceleration)
      this.horizontalVelocity.x *= this.decelerationFactor;
      this.horizontalVelocity.z *= this.decelerationFactor;

      if (this.horizontalVelocity.lengthSq() < 0.01) {
        this.horizontalVelocity.set(0, 0, 0);
      }
    }

    // 3. 물리 바디의 수평 속도에 최종 계산된 값 적용
    this.body.velocity.x = this.horizontalVelocity.x;
    this.body.velocity.z = this.horizontalVelocity.z;

    // ⭐⭐ 4. 점프 로직 수정: 이번 프레임에 키가 새로 눌렸는지 확인 ⭐⭐
    const isJumpPressedNow = keyState.space; // 현재 눌림 상태

    // ⭐⭐⭐ 4. 플라이 모드 수직 이동 & 점프 로직 (수직 속도 제어) ⭐⭐⭐
    if (this.isFlying) {
      // Space: 상승
      if (keyState.space) inputY += 1;

      let targetY = inputY * this.flyForce;

      // 수직 속도에 직접 적용 (비행 시 부드러운 움직임)
      this.body.velocity.y +=
        (targetY - this.body.velocity.y) * this.accelerationFactor;
    } else {
      // 기존 점프 로직 (플라이 모드가 아닐 때만 실행)
      const isJumpPressedNow = keyState.space;

      if (onGround && isJumpPressedNow && !this.jumpKeyPressedLastFrame) {
        this.body.velocity.y = this.jumpForce;
      }
      this.jumpKeyPressedLastFrame = isJumpPressedNow;
    }

    // 5. 물리 바디의 위치를 Three.js Mesh에 동기화
    this.playerGroup.position.copy(this.body.position);
    this.playerGroup.quaternion.copy(this.body.quaternion);

    // (선택) 모델 방향 회전
    if (inputVectorLength > 0) {
      const direction = new THREE.Vector3(inputX, 0, inputZ).normalize();
      const angle = Math.atan2(direction.x, direction.z);
      this.playerGroup.rotation.y = angle;
    }
    // ⭐⭐⭐ 2. 애니메이션 전환 로직 호출 ⭐⭐⭐
    this.updateAnimation(inputVectorLength, onGround); // 새로 만들 함수 호출
    // ⭐⭐ 6. 마지막으로, 현재 키 상태를 다음 프레임을 위해 저장 ⭐⭐
    this.jumpKeyPressedLastFrame = isJumpPressedNow;
  }
}
