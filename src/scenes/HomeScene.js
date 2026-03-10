import Phaser from 'phaser';
import homeBgImg from '../assets/images/home-background.png';
import playBtnImg from '../assets/images/buttons/play-btn.png';
import fsBtnImg from '../assets/images/buttons/fullscreen-btn.png';

export default class HomeScene extends Phaser.Scene {
    constructor() {
        super('HomeScene');
    }

    preload() {
        this.load.image('home-bg', homeBgImg);
        this.load.image('play-btn', playBtnImg);
        this.load.image('fs-btn', fsBtnImg);
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Background Image (Scaled to Cover)
        const bg = this.add.image(width / 2, height / 2, 'home-bg');
        bg.setOrigin(0.5, 0.5);

        // Calculate scale to "Cover" the screen
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);

        // 2. Decorative water wave lines (Optional - Keeping as overlay)
        const graphics = this.add.graphics();
        this.createWaveDecoration(graphics, height * 0.6, 0x4ecca3, 0.3);
        this.createWaveDecoration(graphics, height * 0.65, 0x4ecca3, 0.2);
        this.createWaveDecoration(graphics, height * 0.7, 0x4ecca3, 0.1);

        // // 3. Game title
        // const titleText = this.add.text(width / 2, height * 0.25, 'River Rush', {
        //     fontFamily: 'Arial',
        //     fontSize: '52px',
        //     fontStyle: 'bold',
        //     color: '#4ecca3',
        // });
        // titleText.setOrigin(0.5);
        // titleText.setShadow(2, 2, '#000000', 4);

        // this.tweens.add({
        //     targets: titleText,
        //     y: height * 0.25 - 5,
        //     duration: 1500,
        //     yoyo: true,
        //     repeat: -1,
        //     ease: 'Sine.easeInOut',
        // });

        // // 4. Subtitle
        // const subtitleText = this.add.text(width / 2, height * 0.35, 'An endless river adventure', {
        //     fontFamily: 'Arial',
        //     fontSize: '16px',
        //     color: '#dddddd', // Brighter for better contrast on images
        // });
        // subtitleText.setOrigin(0.5);
        // subtitleText.setShadow(1, 1, '#000000', 2);

        // 5. Play button
        this.createPlayButton(width / 2, height * 0.85);

        // 6. Fullscreen button
        this.createFullscreenButton(width - 20, 20);
    }

    createWaveDecoration(graphics, yPosition, color, alpha) {
        const width = this.cameras.main.width;
        graphics.lineStyle(2, color, alpha);
        graphics.beginPath();

        for (let x = 0; x <= width; x += 5) {
            const y = yPosition + Math.sin(x * 0.02) * 10;
            if (x === 0) {
                graphics.moveTo(x, y);
            } else {
                graphics.lineTo(x, y);
            }
        }
        graphics.strokePath();
    }

    createPlayButton(x, y) {
        const playBtn = this.add.image(x, y, 'play-btn');
        playBtn.displayWidth = 250;
        playBtn.scaleY = playBtn.scaleX;

        playBtn.setInteractive({ useHandCursor: true });

        playBtn.on('pointerdown', () => {
            playBtn.setScale(playBtn.scaleX * 0.95);
        });

        playBtn.on('pointerout', () => {
            playBtn.scaleX = 160 / playBtn.width;
            playBtn.scaleY = playBtn.scaleX;
        });

        playBtn.on('pointerup', () => {
            playBtn.scaleX = 160 / playBtn.width;
            playBtn.scaleY = playBtn.scaleX;
            this.scene.start('GameScene');
        });

        this.tweens.add({
            targets: playBtn,
            scaleX: playBtn.scaleX * 1.05,
            scaleY: playBtn.scaleY * 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    createFullscreenButton(x, y) {
        const fsBtn = this.add.image(x, y, 'fs-btn');
        fsBtn.setOrigin(1, 0);
        fsBtn.displayWidth = 32;
        fsBtn.scaleY = fsBtn.scaleX;
        fsBtn.setInteractive({ useHandCursor: true });

        fsBtn.on('pointerdown', () => {
            fsBtn.setScale(fsBtn.scaleX * 0.9);
        });

        fsBtn.on('pointerout', () => {
            fsBtn.scaleX = 32 / fsBtn.width;
            fsBtn.scaleY = fsBtn.scaleX;
        });

        fsBtn.on('pointerup', () => {
            fsBtn.scaleX = 32 / fsBtn.width;
            fsBtn.scaleY = fsBtn.scaleX;
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });
    }
}
