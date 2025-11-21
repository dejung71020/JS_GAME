// js/Player.js
// 고양이 모델 로딩, 키 입력 상태, 움직임 및 점프 로직을 담당합니다.
//import * as THREE from 'three'; // Three.js 가져오기 (JS 모듈에서 필요)

const keyState = {
    w: false, a: false, s: false, d: false, space: false
};

// ⭐⭐ 충돌 감지용 벡터 (매 프레임 재사용) ⭐⭐
const collisionVector = new THREE.Vector3();

// 키보드 이벤트 리스너 함수는 그대로 유지
document.addEventListener('keydown', (event) => {
    // ... 기존 onKeyDown 로직 ...
    switch (event.key) {
        case 'w': keyState.w = true; break;
        case 'a': keyState.a = true; break;
        case 's': keyState.s = true; break;
        case 'd': keyState.d = true; break;
        case ' ': keyState.space = true; break;
    }
});
document.addEventListener('keyup', (event) => {
    // ... 기존 onKeyUp 로직 ...
    switch (event.key) {
        case 'w': keyState.w = false; break;
        case 'a': keyState.a = false; break;
        case 's': keyState.s = false; break;
        case 'd': keyState.d = false; break;
        case ' ': keyState.space = false; break;
    }
});


export class Player {
    constructor(scene) {
        this.model = null;
        this.scene = scene;
        this.isJumping = false;
        this.verticalVelocity = 0;
        this.gravity = -0.1;
        this.jumpForce = 1.2;
        this.onGround = true; 
        
        // 충돌 계산을 위한 고양이 모델의 대략적인 크기
        this.height = 1; // 원래 1
        this.radius = 0.5; // XZ 평면에서의 반경

        // ⭐⭐ 레이캐스팅 관련 변수 추가 ⭐⭐
        this.raycaster = new THREE.Raycaster();
        this.collisionDistance = this.radius + 0.1; // 모델 반경 + 약간의 여유 공간

        this.loadModel();
    }

    
    loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load('assets/cat.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1, 1, 1);
            this.model.position.y = 0.01;
            this.scene.add(this.model);
            console.log('Player model loaded.');
        });
    }

    // ⭐⭐⭐ 1. 충돌 감지 헬퍼 함수 추가 ⭐⭐⭐
    // ⭐⭐ 1. 벽 충돌 감지 함수 (범용적인 3차원 충돌 처리) ⭐⭐
    checkWallCollision(platforms, directionVector) {
        if (!this.model) return false;
        
        // 레이의 시작점: 플레이어 모델의 중심
        // 방향: 인수로 받은 directionVector
        // 거리: this.collisionDistance까지
        this.raycaster.set(this.model.position, directionVector);
        this.raycaster.far = this.collisionDistance;
        
        // platforms 배열을 대상으로 충돌 검사를 실행합니다.
        // 두 번째 인자 true는 플랫폼의 모든 자식(Geometry)까지 검사하라는 의미입니다.
        const intersections = this.raycaster.intersectObjects(platforms, true);
        
        // 교차점(충돌 지점)이 하나라도 발견되면 true를 반환하여 이동을 막습니다.
        return intersections.length > 0;
    }

    // 충돌 감지 함수 (범용적인 착지 감지)
    checkCollision(platforms) {
        if (!this.model) return 0.0;

        // 1. 레이의 시작점: 플레이어 모델의 중심 위치
        const rayOrigin = this.model.position.clone(); 
        
        // 2. 레이의 방향: Y축 아래 (-1)
        const rayDirection = new THREE.Vector3(0, -1, 0); 
        
        // 3. Raycaster 설정
        this.raycaster.set(rayOrigin, rayDirection);
        // 레이를 충분히 아래로 쏘아 바닥이나 플랫폼을 찾습니다. (예: 10 유닛)
        this.raycaster.far = 10; 

        // 4. 모든 플랫폼과 교차점 검사
        // 두 번째 인수인 'true'는 platform 모델 내부의 모든 복잡한 메시(Geometry)까지 
        // 충돌 검사를 하도록 하여 '범용적인 형태' 충돌을 가능하게 합니다.
        const intersections = this.raycaster.intersectObjects(platforms, true);

        let landingY = 0.0; // 기본 바닥 높이 (Ground Plane)

        if (intersections.length > 0) {
            // 교차점 배열은 거리가 가까운 순서로 정렬되므로, 첫 번째 요소가 가장 가까운 표면입니다.
            const closestIntersection = intersections[0]; 
            
            // 충돌 지점의 Y 좌표 (이것이 착지해야 할 실제 표면 높이입니다.)
            const surfaceY = closestIntersection.point.y; 
            
            // 플레이어의 발 위치
            const playerBottomY = this.model.position.y - this.height / 2;

            // **핵심 착지 조건:**
            // 레이가 감지한 표면(surfaceY)이 현재 플레이어의 발 위치보다
            // 너무 위에 있지 않은지 확인합니다. (0.2는 작은 여유값)
            if (surfaceY < playerBottomY + 0.2) { 
                landingY = surfaceY;
            }
        }
        
        return landingY; 
    }
    
    update(platforms) {
        if (!this.model) return;

        const moveSpeed = 0.05;

        // ⭐⭐ 2. WASD 이동에 벽 충돌 검사 통합 ⭐⭐
    
        // A. Z축(앞/뒤) 이동 검사
        if (keyState.w) {
            // [앞] 방향 벡터 설정 (0, 0, -1)
            collisionVector.set(0, 0, -1);
            if (!this.checkWallCollision(platforms, collisionVector)) {
                this.model.position.z -= moveSpeed;
            }
        }
        if (keyState.s) {
            // [뒤] 방향 벡터 설정 (0, 0, 1)
            collisionVector.set(0, 0, 1);
            if (!this.checkWallCollision(platforms, collisionVector)) {
                this.model.position.z += moveSpeed;
            }
        }

        // B. X축(좌/우) 이동 검사
        if (keyState.a) {
            // [좌] 방향 벡터 설정 (-1, 0, 0)
            collisionVector.set(-1, 0, 0);
            if (!this.checkWallCollision(platforms, collisionVector)) {
                this.model.position.x -= moveSpeed;
            }
        }
        if (keyState.d) {
            // [우] 방향 벡터 설정 (1, 0, 0)
            collisionVector.set(1, 0, 0);
            if (!this.checkWallCollision(platforms, collisionVector)) {
                this.model.position.x += moveSpeed;
            }
        }

        // 점프 로직
        if (this.onGround && keyState.space) {
            this.verticalVelocity = this.jumpForce;
            this.isJumping = true;
            this.onGround = false; // 점프하면 바닥에서 떨어짐
        }

        if (this.isJumping || !this.onGround) {
            this.model.position.y += this.verticalVelocity;
            this.verticalVelocity += this.gravity;
        }   
        // ⭐⭐ 3. 충돌 감지 실행 ⭐⭐
        // 착지해야 할 표면의 Y 좌표 (플랫폼 또는 바닥)
        const targetSurfaceY = this.checkCollision(platforms);

        // 플레이어 모델의 중심이 아닌, 발이 닿는 Y 위치
        const groundLevelY = targetSurfaceY + this.height / 2; 

        // 4. 충돌 결과 반영
        // 현재 하강 중이고 (verticalVelocity <= 0), 
        // 플레이어의 위치가 착지 지점보다 아래로 내려가려 할 때 (또는 이미 아래일 때)
        if (this.verticalVelocity <= 0 && this.model.position.y <= groundLevelY) {
            this.model.position.y = groundLevelY; // 충돌 표면 위로 위치 고정
            this.verticalVelocity = 0;              // 수직 속도 멈춤
            this.isJumping = false;
            this.onGround = true;                   // 땅에 닿음
        }// 5. 공중에 떠 있는 경우 (플랫폼 모서리에서 걸어 나갔을 때)
        else if (this.model.position.y > groundLevelY) {
             this.onGround = false;
        }
    }
}