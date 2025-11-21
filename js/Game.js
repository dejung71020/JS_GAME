// js/Game.js
// 씬, 카메라, 렌더러 설정 및 환경 오브젝트(바닥) 생성을 담당합니다.
//import * as THREE from 'three'; // Three.js 가져오기
import { Player } from './Player.js'; // Player 클래스 가져오기

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.platforms = [];

        this.init();
    }

    init() {
        // 카메라, 렌더러 설정 (기존 코드 그대로)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.camera.position.z = 5; 

        // 조명 추가
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);

        // 바닥 및 플랫폼 생성 (기존 코드 그대로)
        this.createEnvironment(); 
        
        // Player 인스턴스 생성
        this.player = new Player(this.scene);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    // ⭐ 2. 플랫폼을 쉽게 만드는 헬퍼 함수를 정의합니다.
    createPlatform(x, z, height, width, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const platform = new THREE.Mesh(geometry, material);
        
        // Y 좌표는 바닥(y=0)에서 시작하도록 플랫폼 높이의 절반을 더합니다.
        platform.position.set(x, height / 2, z); 
        this.scene.add(platform);
        
        // 충돌 감지를 위해 platforms 배열에 Mesh 객체를 저장합니다.
        this.platforms.push(platform); 
    }

    createEnvironment() {
        // 바닥 (50x20 크기)
        const planeGeometry = new THREE.PlaneGeometry(50, 20); 
        const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const floor = new THREE.Mesh(planeGeometry, planeMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);
        
        // ⭐ 3. 게임에 사용할 실제 플랫폼들을 생성합니다.
        // createPlatform(X 위치, Z 위치, 높이, 가로 길이, 세로 길이, 색상)
        this.createPlatform( 5,  0, 1, 8, 8, 0x8b4513);  // 1. 낮은 플랫폼 (X=5, Z=0)
        this.createPlatform( 15, 5, 3, 4, 4, 0xffa500); // 2. 중간 높이 플랫폼 (X=15, Z=5)
        this.createPlatform(-10, -5, 5, 10, 10, 0x008000); // 3. 높은 플랫폼 (X=-10, Z=-5)
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // ⭐⭐ 게임 업데이트 함수 (게임 루프의 내용) ⭐⭐
    update() {
        // Player 업데이트 (움직임, 점프 로직 실행)
        this.player.update(this.platforms); 
        
        // 카메라 추적 (Player 모델이 로드되었는지 확인 후)
        if (this.player.model) {
            const model = this.player.model;
            this.camera.position.x = model.position.x;
            this.camera.position.y = model.position.y + 3;
            this.camera.position.z = model.position.z + 5;
            this.camera.lookAt(model.position); 
        }

        this.renderer.render(this.scene, this.camera);
    }
}