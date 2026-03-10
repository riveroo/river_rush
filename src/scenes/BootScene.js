import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: 'Pixbob',
            fontSize: '24px',
            color: '#ffffff',
        });
        loadingText.setOrigin(0.5);

        // Progress bar background
        const progressBarBg = this.add.rectangle(width / 2, height / 2, 200, 20, 0x333333);
        progressBarBg.setOrigin(0.5);

        // Progress bar fill
        const progressBar = this.add.rectangle(width / 2 - 98, height / 2, 0, 16, 0x4ecca3);
        progressBar.setOrigin(0, 0.5);

        // Update progress bar on load progress
        this.load.on('progress', (value) => {
            progressBar.width = 196 * value;
        });

        // Placeholder asset loading
        for (let i = 0; i < 10; i++) {
            this.load.image(`placeholder_${i}`, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        }
    }

    create() {
        // Transition to HomeScene (changed from GameScene)
        this.scene.start('HomeScene');
    }
}
