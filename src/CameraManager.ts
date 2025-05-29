import Phaser from 'phaser';

export class CameraManager {
  private scene: Phaser.Scene;
  private rotationProgress = 0;
  private isRotating = false;
  private currentRotation = 0;
  private targetRotation = 0;
  private readonly ROTATION_DURATION = 2000; // ms

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  startRotation(score: number) {
    this.targetRotation = Math.floor(score / 10) * (Math.PI / 2); // 90 degrees for every 10 points
    if (this.targetRotation !== this.currentRotation && !this.isRotating) {
      this.isRotating = true;
      this.rotationProgress = 0; // Reset rotation progress
      console.log('Starting camera rotation at score:', score, 'target:', this.targetRotation * 180 / Math.PI + '°');
    }
  }

  update(delta: number, walls: Phaser.Physics.Arcade.Group, cardinalColors: number[], currentWallColor: number): number {
    if (this.isRotating) {
      this.rotationProgress += delta / this.ROTATION_DURATION;
      if (this.rotationProgress > 1) this.rotationProgress = 1;

      // Interpolate between current and target rotation
      const newRotation = this.currentRotation + (this.targetRotation - this.currentRotation) * this.rotationProgress;
      this.scene.cameras.main.setRotation(newRotation);

      // Determine color based on cardinal direction
      const currentCardinalIndex = Math.floor(this.currentRotation / (Math.PI / 2)) % 4;
      const targetCardinalIndex = Math.floor(this.targetRotation / (Math.PI / 2)) % 4;
      const startColor = Phaser.Display.Color.ValueToColor(cardinalColors[currentCardinalIndex]);
      const endColor = Phaser.Display.Color.ValueToColor(cardinalColors[targetCardinalIndex]);

      // Interpolate color between current and target cardinal direction
      const colorProgress = Phaser.Display.Color.Interpolate.ColorWithColor(
        startColor,
        endColor,
        100, // Total steps (scaled to 100 for smoother transition)
        this.rotationProgress * 100 // Current step
      );
      const newColor = Phaser.Display.Color.GetColor(colorProgress.r, colorProgress.g, colorProgress.b);
      walls.getChildren().forEach((wall: Phaser.GameObjects.GameObject) => {
        (wall as Phaser.Physics.Arcade.Image).setTint(newColor);
      });

      if (this.rotationProgress === 1) {
        this.isRotating = false;
        this.currentRotation = this.targetRotation; // Update current rotation after animation completes
        return newColor; // Return the final color
      }
    }
    return currentWallColor; // Return the current wall color if no rotation
  }
}
