// js/Game.js
import { Player } from './Player.js'; 

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        
        // ⭐ Cannon.js 물리 세계 설정 ⭐
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
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    // 플랫폼 생성 및 물리 바디 연결
    createPlatform(x, z, height, width, depth, color) {
        // 1. Three.js Mesh 생성
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, height / 2, z); 
        this.scene.add(platform);
        this.platforms.push(platform); 
        
        // 2. Cannon.js Body 생성 (Static)
        const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
        const shape = new CANNON.Box(halfExtents);
        
        const body = new CANNON.Body({
            mass: 0, // 질량이 0이면 Static (고정된 충돌체)
            shape: shape,
        });
        body.position.set(platform.position.x, platform.position.y, platform.position.z);
        this.world.addBody(body);
        
        platform.userData.physicsBody = body; 
    }

    createEnvironment() {
        // Three.js 바닥 (시각적)
        const planeGeometry = new THREE.PlaneGeometry(50, 20); 
        const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const floor = new THREE.Mesh(planeGeometry, planeMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);
        
        // Cannon.js 바닥 (물리)
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); 
        this.world.addBody(groundBody);
        
        // 플랫폼 생성
        this.createPlatform( 5,  0, 1, 8, 8, 0x8b4513); // 낮은 플랫폼
        this.createPlatform( 15, 5, 3, 4, 4, 0xffa500); // 중간 플랫폼
        this.createPlatform(-10, -5, 5, 10, 10, 0x008000); // 높은 플랫폼
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