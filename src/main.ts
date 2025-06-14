import './style.css'
import Phaser from 'phaser';
import { CameraManager } from './CameraManager';

const GAME_WIDTH = Math.min(window.innerWidth, 800);
const GAME_HEIGHT = Math.min(window.innerHeight - 30, 800);
const BALL_RADIUS = 20;
const GRAVITY = 800;
const BOUNCE_VELOCITY = -350;
const WALL_SPEED = 200;
const WALL_GAP = 280;
const WALL_WIDTH = 40;
const WALL_INTERVAL = 1200; // ms

let score = 0;
let scoreText: Phaser.GameObjects.Text;
let bestScore = Number(localStorage.getItem('bestScore') || 0);
let bestScoreText: Phaser.GameObjects.Text;

let deathCount = Number(localStorage.getItem('deathCount') || 0);
let deathCountText: Phaser.GameObjects.Text;

let currentWallColor = 0xff4444; // Default wall color
let difficultyMultiplier = 1;

class MainScene extends Phaser.Scene {
  ball!: Phaser.Physics.Arcade.Image;
  walls!: Phaser.Physics.Arcade.Group;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  lastWallTime = 0;
  gameOver = false;
  uiCamera!: Phaser.Cameras.Scene2D.Camera;
  gameCamera!: Phaser.Cameras.Scene2D.Camera;
  uiElements: Phaser.GameObjects.Text[] = [];
  cameraManager!: CameraManager;

  constructor() {
    super('MainScene');
  }

  preload() {}

  create() {
    score = 0;
    this.gameOver = false;
    this.physics.world.gravity.y = GRAVITY;

    // Setup cameras first
    this.gameCamera = this.cameras.main;
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Add background rectangle (keep it below everything else)
    const bg = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x222222).setDepth(0);
    this.uiCamera.ignore(bg);

    // Use a graphics-generated texture for the ball
    const ballGfx = this.add.graphics();
    ballGfx.fillStyle(0x00eaff, 1);
    ballGfx.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    ballGfx.generateTexture('ball', BALL_RADIUS*2, BALL_RADIUS*2);
    ballGfx.destroy();
    this.ball = this.physics.add.image(GAME_WIDTH/2, GAME_HEIGHT-100, 'ball')
      .setCircle(BALL_RADIUS)
      .setDisplaySize(BALL_RADIUS*2, BALL_RADIUS*2)
      .setBounce(0.5)
      .setCollideWorldBounds(true);
    this.uiCamera.ignore(this.ball);

    this.walls = this.physics.add.group();
    this.cameraManager = new CameraManager(this);

    this.time.addEvent({ delay: WALL_INTERVAL, callback: this.spawnWall, callbackScope: this, loop: true });

    this.input.on('pointerdown', this.bounce, this);
    this.input.keyboard?.on('keydown-SPACE', this.bounce, this);

    // Responsive text scaling
    const fontSize = Math.max(16, GAME_WIDTH / 40); // Scale font size based on screen width

    // Add score text above all game objects
    scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: `${fontSize}px`, color: '#fff' })
      .setDepth(10);
    bestScoreText = this.add.text(20, 60, `Best: ${bestScore}`, { fontSize: `${fontSize * 0.8}px`, color: '#ff0' })
      .setDepth(10);
    deathCountText = this.add.text(20, 100, 'Deaths: ' + deathCount, {
      fontSize: `${fontSize}px`,
      color: '#fff',
    }).setDepth(10);
    this.uiElements = [scoreText, bestScoreText, deathCountText];

    this.gameCamera.ignore(this.uiElements);

    this.physics.add.overlap(this.ball, this.walls, this.handleGameOver, undefined, this);
  }

  bounce() {
    if (this.gameOver) return;
    this.ball.setVelocityY(BOUNCE_VELOCITY);
  }

  spawnWall() {
    if (this.gameOver) return;

    // Adjust gap size dynamically based on score
    const minGap = 180; // Minimum gap size to keep the game playable
    const maxGap = WALL_GAP; // Initial gap size
    const adjustedWallGap = Math.max(minGap, maxGap - score * 5); // Decrease gap size as score increases

    // Adjust wall speed based on difficulty multiplier
    const adjustedWallSpeed = WALL_SPEED * difficultyMultiplier;

    // Random gap position
    const gapY = Phaser.Math.Between(100, GAME_HEIGHT - 100 - adjustedWallGap);
    // Use a graphics-generated texture for the wall
    const wallGfx = this.add.graphics();
    wallGfx.fillStyle(currentWallColor, 1); // Use current wall color
    wallGfx.fillRect(0, 0, WALL_WIDTH, 100);
    wallGfx.generateTexture('wall', WALL_WIDTH, 100);
    wallGfx.destroy();
    // Top wall
    const topWall = this.walls.create(-WALL_WIDTH/2, gapY/2, 'wall')
      .setDisplaySize(WALL_WIDTH, gapY)
      .setImmovable(true)
      .setVelocityX(adjustedWallSpeed);
    // Bottom wall
    const bottomWall = this.walls.create(-WALL_WIDTH/2, gapY + adjustedWallGap + (GAME_HEIGHT-gapY-adjustedWallGap)/2, 'wall')
      .setDisplaySize(WALL_WIDTH, GAME_HEIGHT-gapY-adjustedWallGap)
      .setImmovable(true)
      .setVelocityX(adjustedWallSpeed);
    // Ensure walls are not affected by gravity
    (topWall.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (bottomWall.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    // Remove walls when out of bounds
    topWall.body.checkWorldBounds = true;
    topWall.body.onWorldBounds = true;
    bottomWall.body.checkWorldBounds = true;
    bottomWall.body.onWorldBounds = true;

    // Make sure walls are only visible to game camera
    this.uiCamera.ignore([topWall, bottomWall]);
  }

  handleGameOver() {
    console.warn('Game Over');
    if (this.gameOver) return;
    this.gameOver = true;
    deathCount++;
    localStorage.setItem('deathCount', String(deathCount));
    deathCountText.setText(`Deaths: ${deathCount}`);

    this.ball.setTint(0xff0000);
    this.physics.pause();
    // Show final score, best score, and retry button
    const gameOverText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 60, `Game Over`, {
      fontSize: '48px',
      color: '#fff',
      align: 'center',
    }).setOrigin(0.5);
    const finalScoreText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, `Score: ${score}\nBest: ${bestScore}`, {
      fontSize: '32px',
      color: '#fff',
      align: 'center',
    }).setOrigin(0.5);
    const retryButton = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 70, 'Retry', {
      fontSize: '32px',
      color: '#00eaff',
      backgroundColor: '#222',
      padding: { left: 24, right: 24, top: 8, bottom: 8 },
      align: 'center',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryButton.on('pointerdown', () => this.scene.restart());

    // Add to UI elements and update camera visibility
    this.uiElements.push(gameOverText, finalScoreText, retryButton);
    this.gameCamera.ignore(this.uiElements);
  }

  update(_time: number, delta: number): void {
    if (this.ball.y > GAME_HEIGHT - BALL_RADIUS || this.ball.y < BALL_RADIUS) {
      this.handleGameOver();
    }

    // Remove walls and increment score when they leave the right side of the screen
    this.walls.getChildren().forEach((wall: Phaser.GameObjects.GameObject) => {
      const wallBody = (wall as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
      if (wallBody && wallBody.x > GAME_WIDTH) {
        wall.destroy();
        if (!this.gameOver) {
          score++;
          scoreText.setText('Score: ' + score);
          if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bestScore', String(bestScore));
            bestScoreText.setText(`Best: ${bestScore}`);
          }
          this.cameraManager.startRotation(score); // Trigger camera rotation when score increases

          // Increase difficulty every 10 points
          if (score % 10 === 0) {
            difficultyMultiplier += 0.1; // Increase multiplier
          }
        }
      }
    });

    currentWallColor = this.cameraManager.update(delta, this.walls, [0xff4444, 0x44ff44, 0x4444ff, 0xffff44], currentWallColor);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#222',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT, // Ensure the game scales to fit the screen
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game on the screen
  },
  scene: MainScene,
};

new Phaser.Game(config);
