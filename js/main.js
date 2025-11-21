import { Game } from './Game.js'; // Game 클래스 가져오기

const game = new Game();

// 게임 루프 및 애니메이션 함수
function animate() {
    requestAnimationFrame(animate);

    game.update(); // Game.js의 update 함수 호출
}

animate(); // 게임 시작!