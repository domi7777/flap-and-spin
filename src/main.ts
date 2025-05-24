import './style.css'
import Phaser from 'phaser';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BALL_RADIUS = 20;
const GRAVITY = 800;
const BOUNCE_VELOCITY = -350;
const WALL_SPEED = 200;
const WALL_GAP = 180;
const WALL_WIDTH = 40;
const WALL_INTERVAL = 1200; // ms

let score = 0;
let scoreText: Phaser.GameObjects.Text;

class MainScene extends Phaser.Scene {
  ball!: Phaser.Physics.Arcade.Image;
  walls!: Phaser.Physics.Arcade.Group;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  lastWallTime = 0;
  gameOver = false;

  constructor() {
    super('MainScene');
  }

  preload() {}

  create() {
    score = 0;
    this.gameOver = false;
    this.physics.world.gravity.y = GRAVITY;
    this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x222222);

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

    this.walls = this.physics.add.group();
    this.time.addEvent({ delay: WALL_INTERVAL, callback: this.spawnWall, callbackScope: this, loop: true });

    this.input.on('pointerdown', this.bounce, this);
    this.input.keyboard?.on('keydown-SPACE', this.bounce, this);

    scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '28px', color: '#fff' });

    this.physics.add.overlap(this.ball, this.walls, this.handleGameOver, undefined, this);
  }

  bounce() {
    if (this.gameOver) return;
    this.ball.setVelocityY(BOUNCE_VELOCITY);
  }

  spawnWall() {
    if (this.gameOver) return;
    // Random gap position
    const gapY = Phaser.Math.Between(100, GAME_HEIGHT - 100 - WALL_GAP);
    // Use a graphics-generated texture for the wall
    const wallGfx = this.add.graphics();
    wallGfx.fillStyle(0xff4444, 1);
    wallGfx.fillRect(0, 0, WALL_WIDTH, 100);
    wallGfx.generateTexture('wall', WALL_WIDTH, 100);
    wallGfx.destroy();
    // Top wall
    const topWall = this.walls.create(-WALL_WIDTH/2, gapY/2, 'wall')
      .setDisplaySize(WALL_WIDTH, gapY)
      .setImmovable(true)
      .setVelocityX(WALL_SPEED);
    // Bottom wall
    const bottomWall = this.walls.create(-WALL_WIDTH/2, gapY + WALL_GAP + (GAME_HEIGHT-gapY-WALL_GAP)/2, 'wall')
      .setDisplaySize(WALL_WIDTH, GAME_HEIGHT-gapY-WALL_GAP)
      .setImmovable(true)
      .setVelocityX(WALL_SPEED);
    // Ensure walls are not affected by gravity
    (topWall.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (bottomWall.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    // Remove walls when out of bounds
    topWall.body.checkWorldBounds = true;
    topWall.body.onWorldBounds = true;
    bottomWall.body.checkWorldBounds = true;
    bottomWall.body.onWorldBounds = true;
    topWall.body.world.on('worldbounds', (body: any) => {
      if (body.gameObject === topWall || body.gameObject === bottomWall) {
        topWall.destroy();
        bottomWall.destroy();
        if (!this.gameOver) {
          score++;
          scoreText.setText('Score: ' + score);
        }
      }
    });
  }

  handleGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.ball.setTint(0xff0000);
    this.physics.pause();
    this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, 'Game Over\nClick to Restart', {
      fontSize: '40px',
      color: '#fff',
      align: 'center',
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.restart(), this);
  }

  update() {
    if (this.ball.y > GAME_HEIGHT - BALL_RADIUS || this.ball.y < BALL_RADIUS) {
      this.handleGameOver();
    }
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
  scene: MainScene,
};

new Phaser.Game(config);
