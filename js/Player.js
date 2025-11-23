// js/Player.js
const keyState = {
    w: false, a: false, s: false, d: false, space: false
};

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w': keyState.w = true; break;
        case 'a': keyState.a = true; break;
        case 's': keyState.s = true; break;
        case 'd': keyState.d = true; break;
        case ' ': keyState.space = true; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w': keyState.w = false; break;
        case 'a': keyState.a = false; break;
        case 's': keyState.s = false; break;
        case 'd': keyState.d = false; break;
        case ' ': keyState.space = false; break;
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

        this.loadModel();
    }

    createPhysicsBody() {
        // 플레이어를 위한 캡슐 형태의 충돌체 (Cylinder를 사용하고 회전을 막음)
        const shape = new CANNON.Cylinder(this.playerRadius, this.playerRadius, this.playerHeight, 8);
        
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
        loader.load('assets/cat.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1, 1, 1);
            this.model.position.y = -this.playerHeight / 2; // 모델 중심 조정
            
            this.playerGroup.add(this.model);
            this.scene.add(this.playerGroup);
            
            this.createPhysicsBody(); 
        });
    }

    checkIsOnGround() {
        // 물리 바디의 Y축 속도가 0에 가까운지 확인 (충돌 후 정지 상태)
        if (!this.body) return false;
        return Math.abs(this.body.velocity.y) < 0.1;
    }

    update() {
        if (!this.model || !this.body) return;

        const onGround = this.checkIsOnGround();
        let inputX = 0;
        let inputZ = 0;
        
        // 1. 입력 방향 계산
        if (keyState.w) inputZ -= 1;
        if (keyState.s) inputZ += 1;
        if (keyState.a) inputX -= 1;
        if (keyState.d) inputX += 1;
        
        let inputVectorLength = Math.sqrt(inputX * inputX + inputZ * inputZ);

        // 2. 가속/감속 로직
        if (inputVectorLength > 0) {
            let normalizedInputX = inputX / inputVectorLength;
            let normalizedInputZ = inputZ / inputVectorLength;

            let targetX = normalizedInputX * this.maxMoveSpeed;
            let targetZ = normalizedInputZ * this.maxMoveSpeed;
            
            // 가속 (Lerp)
            this.horizontalVelocity.x += (targetX - this.horizontalVelocity.x) * this.accelerationFactor;
            this.horizontalVelocity.z += (targetZ - this.horizontalVelocity.z) * this.accelerationFactor;
            
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
        
        if (onGround && isJumpPressedNow && !this.jumpKeyPressedLastFrame) {
            // 땅에 닿아있고, 현재 눌렸으며, 이전 프레임에는 눌리지 않았을 때만 실행!
            this.body.velocity.y = this.jumpForce; 
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

        // ⭐⭐ 6. 마지막으로, 현재 키 상태를 다음 프레임을 위해 저장 ⭐⭐
        this.jumpKeyPressedLastFrame = isJumpPressedNow;
    }
}