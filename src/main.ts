import './style.css'
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#222',
    scene: {
        preload,
        create,
        update
    }
};

function preload(this: Phaser.Scene) {
    // Load assets here
}

function create(this: Phaser.Scene) {
    this.add.text(100, 100, 'Hello Phaser + Vite + TypeScript!', { color: '#fff', fontSize: '32px' });
}

function update(this: Phaser.Scene) {
    // Game loop
}

new Phaser.Game(config);
