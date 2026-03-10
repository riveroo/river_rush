import Phaser from 'phaser';
import riverImg from '../assets/images/river.png';
import boatImg from '../assets/images/single-boat2.png';
import rockImg from '../assets/images/rock2.png'; // 1. Import Rock Asset
import pauseBtnImg from '../assets/images/buttons/pause-btn.png';
import fsBtnImg from '../assets/images/buttons/fullscreen-btn.png';
import resumeBtnImg from '../assets/images/buttons/resume-btn.png';
import restartBtnImg from '../assets/images/buttons/restart-btn.png';
import puSlowImg from '../assets/images/slow-pu.png';
import puSpeedImg from '../assets/images/speed-pu.png';
import puInvImg from '../assets/images/invincible-pu.png';

const DEBUG_HITBOX = true;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('river', riverImg);
        this.load.image('boat_single', boatImg);
        this.load.image('rock', rockImg); // Load Rock
        this.load.image('pause-btn', pauseBtnImg);
        this.load.image('fs-btn', fsBtnImg);
        this.load.image('resume-btn', resumeBtnImg);
        this.load.image('restart-btn', restartBtnImg);
        this.load.image('pu-slow', puSlowImg);
        this.load.image('pu-speed', puSpeedImg);
        this.load.image('pu-invincible', puInvImg);
    }

    create() {
        // --- TESTING FLAGS ---
        this.TEST_INVINCIBLE = false;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.sceneWidth = width;
        this.sceneHeight = height;
        this.isGameOver = false;
        this.isPaused = false;

        // SCORING MODEL
        this.score = 1;        // n
        this.scoreMultiplier = 1; // m

        // COMBO MODEL
        this.combo = 1;
        this.maxComboActive = false;
        this.scorePulseTween = null;

        // Power-up States
        this.globalSpeedMultiplier = 1;
        this.isInvincible = false;
        this.activePowerupEvent = null;

        // 1. Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0f3460);

        // 2. River Scroller
        this.river = this.add.tileSprite(width / 2, height / 2, width, height, 'river');
        this.river.setDepth(0);
        const scale = width / 1024;
        this.river.setScale(Math.max(scale, 1));

        // 3. Walls
        const wallThickness = 10;
        this.walls = this.physics.add.staticGroup();
        this.walls.add(this.add.rectangle(wallThickness / 2, height / 2, wallThickness, height, 0x16213e));
        this.walls.add(this.add.rectangle(width - wallThickness / 2, height / 2, wallThickness, height, 0x16213e));

        // 4. Player Boat (Scaled Up 4x)
        this.baseBoatSpeed = 240;

        this.boat = this.physics.add.sprite(width / 2, height * 0.2, 'boat_single');
        // Originally 0.05, now 4x larger = 0.2
        // Boat img is 1024px wide. 0.2 * 1024 = 204.8px width.
        // This is quite large for a mobile screen, but requested explicitly.
        this.boat.setScale(0.11);

        // Adjust physics body: Reduce to 75% size and center
        const boatWidth = this.boat.width;
        const boatHeight = this.boat.height;
        this.boat.body.setSize(boatWidth * 0.75, boatHeight * 0.75);
        this.boat.body.setOffset(boatWidth * 0.125, boatHeight * 0.125);

        this.boatDirection = 1;
        this.boat.body.setVelocityX(this.baseBoatSpeed);
        // Tilt boat initially based on direction
        this.boat.setAngle(10);

        // 5. Input Keys
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // 6. Groups
        this.obstacles = this.physics.add.group();
        this.coins = this.physics.add.group();
        this.powerups = this.physics.add.group();

        // 7. Spawn System
        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.processSpawnCycle,
            callbackScope: this,
            loop: true
        });

        // 8. Score Timer (0.5s ticks)
        this.scoreTimer = this.time.addEvent({
            delay: 500,
            callback: this.updateScoreTick,
            callbackScope: this,
            loop: true
        });

        // 9. Collisions
        this.physics.add.overlap(this.boat, this.walls, this.handleWallCollision, null, this);
        this.physics.add.overlap(this.boat, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.add.overlap(this.boat, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.boat, this.powerups, this.collectPowerup, null, this);

        // 10. Controls
        this.createControls(width, height);

        // 11. Score UI
        this.scoreText = this.add.text(width / 2, 60, '1', {
            fontSize: '48px',
            fontFamily: 'Pixbob',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.scoreText.setDepth(20);

        // 12. Combo UI
        this.comboText = this.add.text(width - 50, height * 0.3, '', {
            fontSize: '32px',
            fontFamily: 'Pixbob',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(1, 0.5);
        this.comboText.setDepth(20);
        this.comboText.setVisible(false);

        // 13. Game Over UI
        this.createGameOverUI(width, height);

        // 14. Debug Hitbox Graphics
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(1000);

        // 15. Fullscreen and Pause UI
        this.createFullscreenToggle(width, height);
        this.createPauseUI(width, height);
    }

    // --- SPAWN LOGIC ---

    processSpawnCycle() {
        if (this.isGameOver) return;

        const chanceObstacle = 0.80;
        const chanceCoin = 0.70;
        const chancePowerup = 0.25;

        if (Math.random() < chanceObstacle) {
            this.spawnEntity('obstacle');
        }
        if (Math.random() < chanceCoin) {
            this.spawnEntity('coin');
        }
        if (Math.random() < chancePowerup) {
            this.spawnEntity('powerup');
        }
    }

    spawnEntity(type) {
        const spawnY = this.sceneHeight + 60;
        const x = this.getValidSpawnX(spawnY);

        if (x === null) return;

        if (type === 'obstacle') {
            // Replace rectangle with rock sprite
            const obstacle = this.physics.add.sprite(x, spawnY, 'rock');
            // Rock img is 1024x1536. Scale down to ~50px width -> 0.05
            obstacle.setScale(0.11);

            // Random obstacle rotation
            obstacle.setAngle(Phaser.Math.Between(-25, 25));

            // Adjust obstacle hitbox: height to 50%, vertically centered
            const obsWidth = obstacle.width;
            const obsHeight = obstacle.height;
            obstacle.body.setSize(obsWidth, obsHeight * 0.5);
            obstacle.body.setOffset(0, obsHeight * 0.25);

            obstacle.speed = 4;
            this.obstacles.add(obstacle);
        }
        else if (type === 'coin') {
            const coin = this.add.circle(x, spawnY, 15, 0xffd700);
            this.physics.add.existing(coin);
            coin.body.setCircle(15);
            coin.speed = 4;
            this.coins.add(coin);
        }
        else if (type === 'powerup') {
            const variant = Phaser.Math.Between(0, 2);
            let textureKey = 'pu-speed';
            if (variant === 0) textureKey = 'pu-speed';
            else if (variant === 1) textureKey = 'pu-slow';
            else if (variant === 2) textureKey = 'pu-invincible';

            const powerup = this.physics.add.sprite(x, spawnY, textureKey);
            powerup.displayWidth = 40;
            powerup.scaleY = powerup.scaleX;
            powerup.body.setCircle(powerup.width / 2);

            powerup.speed = 4;
            powerup.powerType = variant;
            this.powerups.add(powerup);

            const targetScale = powerup.scaleX;

            // Spawn pop animation
            powerup.setScale(0);
            this.tweens.add({
                targets: powerup,
                scale: targetScale,
                duration: 400,
                ease: 'Back.out',
                onComplete: () => {
                    // Looping pulse animation
                    this.tweens.add({
                        targets: powerup,
                        scale: targetScale * 1.15,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });

            // Looping gentle rotation
            this.tweens.add({
                targets: powerup,
                angle: 360,
                duration: 4000,
                repeat: -1,
                ease: 'Linear'
            });
        }
    }

    getValidSpawnX(checkY) {
        const safeMargin = 50;
        const minDistance = 70;
        const maxAttempts = 10;

        for (let i = 0; i < maxAttempts; i++) {
            const candidateX = Phaser.Math.Between(safeMargin, this.sceneWidth - safeMargin);
            let valid = true;

            const checkGroup = (group) => {
                group.getChildren().forEach(child => {
                    if (Math.abs(child.y - checkY) < 100) {
                        const dist = Math.abs(child.x - candidateX);
                        if (dist < minDistance) valid = false;
                    }
                });
            };

            checkGroup(this.obstacles);
            checkGroup(this.coins);
            checkGroup(this.powerups);

            if (valid) return candidateX;
        }

        return null;
    }

    // --- SCORING & COMBO ---

    formatScore(value) {
        if (value >= 1_000_000_000) {
            return value.toExponential(2).replace('+', '');
        }
        return value.toLocaleString();
    }

    updateScoreTick() {
        if (this.isGameOver) return;

        const ms = this.scoreMultiplier;
        const sps = ms + (this.combo * ms);

        this.score += sps;
        this.scoreText.setText(this.formatScore(this.score));

        if (!this.maxComboActive) {
            this.tweens.add({
                targets: this.scoreText,
                scale: 1.1,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        }
    }

    removeMaxComboEffect() {
        if (this.maxComboActive) {
            this.maxComboActive = false;
            this.scoreText.setColor('#ffffff');
            if (this.scorePulseTween) {
                this.scorePulseTween.stop();
                this.scorePulseTween = null;
                this.scoreText.setScale(1);
            }
        }
    }

    updateComboUI() {
        if (this.combo > 1) {
            this.comboText.setText(`${this.combo}x`);
            this.comboText.setVisible(true);
            this.comboText.setAlpha(1);
            this.comboText.y = this.cameras.main.height * 0.3;

            if (this.combo >= 32) {
                if (!this.maxComboActive) {
                    this.maxComboActive = true;
                    this.scoreText.setColor('#ff0000');
                    if (this.scorePulseTween) this.scorePulseTween.stop();
                    this.scorePulseTween = this.tweens.add({
                        targets: this.scoreText,
                        scale: 1.25,
                        duration: 400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            } else {
                this.removeMaxComboEffect();
            }

            this.tweens.killTweensOf(this.comboText);

            this.comboText.setScale(1.5);

            this.tweens.add({
                targets: this.comboText,
                scale: 1.2,
                duration: 300,
                ease: 'Back.out',
                onComplete: () => {
                    if (this.combo > 1) {
                        this.tweens.add({
                            targets: this.comboText,
                            scale: 1.3,
                            duration: 500,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                }
            });
        } else {
            this.comboText.setVisible(false);
            this.comboText.setScale(1);
            this.removeMaxComboEffect();
            this.tweens.killTweensOf(this.comboText);
        }
    }

    resetCombo() {
        if (this.combo > 1) {
            this.tweens.killTweensOf(this.comboText);
            this.removeMaxComboEffect();

            this.tweens.add({
                targets: this.comboText,
                y: this.comboText.y + 20,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.comboText.setAlpha(1);
                    this.comboText.y = this.cameras.main.height * 0.3;
                    this.comboText.setVisible(false);
                }
            });
        }
        this.combo = 1;
    }

    collectCoin(boat, coin) {
        coin.destroy();
        this.scoreMultiplier += 10;

        this.combo = Math.min(this.combo * 2, 32);
        this.updateComboUI();

        this.showFloatingText(boat.x, boat.y, "+10 Mult!");
    }

    collectPowerup(boat, powerup) {
        const type = powerup.powerType;
        powerup.destroy();
        if (this.activePowerupEvent) this.activePowerupEvent.remove();

        if (type === 0) this.activateSpeed(2);
        else if (type === 1) this.activateSpeed(0.5);
        else if (type === 2) this.activateShield();

        this.activePowerupEvent = this.time.delayedCall(3000, () => {
            this.resetPowerEffects();
        }, [], this);
    }

    activateSpeed(multiplier) {
        this.resetPowerEffects(false);
        this.globalSpeedMultiplier = multiplier;
        this.boat.body.setVelocityX(this.baseBoatSpeed * this.globalSpeedMultiplier * this.boatDirection);

        if (multiplier > 1) {
            this.boat.setTint(0x00ffff);
            this.scoreMultiplier *= 2;
            this.showFloatingText(this.boat.x, this.boat.y, "Mult x2!");
        } else {
            this.boat.setTint(0x800080);
            this.scoreMultiplier *= 1.5;
            this.showFloatingText(this.boat.x, this.boat.y, "Mult x1.5!");
        }
    }

    activateShield() {
        this.resetPowerEffects(false);
        this.isInvincible = true;
        this.boat.setTint(0x00ff00);
        this.boat.setAlpha(0.6);
    }

    showFloatingText(x, y, message) {
        const feedback = this.add.text(x, y - 40, message, {
            fontSize: '24px',
            fontFamily: 'Pixbob',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.tweens.add({
            targets: feedback,
            y: y - 100,
            alpha: 0,
            duration: 800,
            onComplete: () => feedback.destroy()
        });
    }

    resetPowerEffects(clearTimer = true) {
        if (clearTimer && this.activePowerupEvent) {
            this.activePowerupEvent.remove();
            this.activePowerupEvent = null;
        }
        this.globalSpeedMultiplier = 1;
        this.isInvincible = false;
        if (this.boat && this.boat.active) {
            this.boat.clearTint();
            this.boat.setAlpha(1);
            this.boat.body.setVelocityX(this.baseBoatSpeed * this.boatDirection);
        }
    }

    handleWallCollision() {
        if (this.TEST_INVINCIBLE || this.isInvincible) return;
        this.handleGameOver();
    }

    handleObstacleCollision() {
        if (this.TEST_INVINCIBLE || this.isInvincible) return;
        this.handleGameOver();
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.physics.pause();
        this.spawnTimer.paused = true;
        this.scoreTimer.paused = true;
        if (this.activePowerupEvent) this.activePowerupEvent.remove();

        this.boat.body.setVelocity(0);

        this.resetCombo();

        this.gameOverUI.setVisible(true);
        this.finalScoreText.setText(this.formatScore(this.score));
    }

    toggleBoatDirection() {
        if (this.isGameOver || this.isPaused) return;
        this.boatDirection *= -1;
        this.boat.body.setVelocityX(this.baseBoatSpeed * this.globalSpeedMultiplier * this.boatDirection);

        // Tilt boat smoothly
        this.tweens.add({
            targets: this.boat,
            angle: this.boatDirection === 1 ? 10 : -10,
            duration: 150,
            ease: 'Sine.easeInOut'
        });
    }

    createControls(width, height) {
        const buttonRadius = 40;
        const buttonX = width / 2;
        const buttonY = height - 80;
        this.controlBtn = this.add.circle(buttonX, buttonY, buttonRadius, 0xffffff, 0.5);
        this.add.text(buttonX, buttonY, '⇄', { fontSize: '32px', fontFamily: 'Pixbob', color: '#000' }).setOrigin(0.5);
        const hitArea = this.add.circle(buttonX, buttonY, buttonRadius * 1.5, 0x000, 0).setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
            this.toggleBoatDirection();
            this.controlBtn.setScale(0.9);
        });

        hitArea.on('pointerup', () => {
            this.controlBtn.setScale(1);
        });
    }

    createGameOverUI(width, height) {
        this.gameOverUI = this.add.container(0, 0);
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        const title = this.add.text(width / 2, height / 2 - 50, 'GAME OVER', { fontSize: '40px', fontFamily: 'Pixbob', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
        this.finalScoreText = this.add.text(width / 2, height / 2 + 10, '0', { fontSize: '48px', fontFamily: 'Pixbob', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        const restartBtn = this.add.image(width / 2, height / 2 + 100, 'restart-btn').setInteractive({ useHandCursor: true });
        restartBtn.displayWidth = 200;
        restartBtn.scaleY = restartBtn.scaleX;

        this.gameOverUI.add([bg, title, this.finalScoreText, restartBtn]);
        this.gameOverUI.setVisible(false);
        this.gameOverUI.setDepth(100);

        restartBtn.on('pointerdown', () => {
            restartBtn.setScale(restartBtn.scaleX * 0.95);
        });

        restartBtn.on('pointerout', () => {
            restartBtn.scaleX = 200 / restartBtn.width;
            restartBtn.scaleY = restartBtn.scaleX;
        });

        restartBtn.on('pointerup', () => {
            restartBtn.scaleX = 200 / restartBtn.width;
            restartBtn.scaleY = restartBtn.scaleX;
            this.scene.restart();
        });
    }

    createFullscreenToggle(width, height) {
        const padding = 20;
        const fsBtn = this.add.image(width - padding - 15, padding + 15, 'fs-btn').setInteractive({ useHandCursor: true }).setDepth(100);
        fsBtn.displayWidth = 30;
        fsBtn.scaleY = fsBtn.scaleX;

        fsBtn.on('pointerdown', () => {
            fsBtn.setScale(fsBtn.scaleX * 0.9);
        });

        fsBtn.on('pointerout', () => {
            fsBtn.scaleX = 30 / fsBtn.width;
            fsBtn.scaleY = fsBtn.scaleX;
        });

        fsBtn.on('pointerup', () => {
            fsBtn.scaleX = 30 / fsBtn.width;
            fsBtn.scaleY = fsBtn.scaleX;
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });
    }

    createPauseUI(width, height) {
        const padding = 20;
        const pauseBtn = this.add.image(padding + 15, padding + 15, 'pause-btn').setInteractive({ useHandCursor: true }).setDepth(100);
        pauseBtn.displayWidth = 30;
        pauseBtn.scaleY = pauseBtn.scaleX;

        pauseBtn.on('pointerdown', () => {
            pauseBtn.setScale(pauseBtn.scaleX * 0.9);
        });

        pauseBtn.on('pointerout', () => {
            pauseBtn.scaleX = 30 / pauseBtn.width;
            pauseBtn.scaleY = pauseBtn.scaleX;
        });

        pauseBtn.on('pointerup', () => {
            pauseBtn.scaleX = 30 / pauseBtn.width;
            pauseBtn.scaleY = pauseBtn.scaleX;
            this.togglePause();
        });

        // Pause Overlay
        this.pauseOverlay = this.add.container(0, 0).setDepth(200).setVisible(false);
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        const title = this.add.text(width / 2, height / 2 - 50, 'PAUSED', {
            fontSize: '40px', fontFamily: 'Pixbob', color: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5);

        const resumeBtn = this.add.image(width / 2, height / 2 + 50, 'resume-btn').setInteractive({ useHandCursor: true });
        resumeBtn.displayWidth = 200;
        resumeBtn.scaleY = resumeBtn.scaleX;

        this.pauseOverlay.add([bg, title, resumeBtn]);

        resumeBtn.on('pointerdown', () => {
            resumeBtn.setScale(resumeBtn.scaleX * 0.95);
        });

        resumeBtn.on('pointerout', () => {
            resumeBtn.scaleX = 200 / resumeBtn.width;
            resumeBtn.scaleY = resumeBtn.scaleX;
        });

        resumeBtn.on('pointerup', () => {
            resumeBtn.scaleX = 200 / resumeBtn.width;
            resumeBtn.scaleY = resumeBtn.scaleX;
            this.togglePause();
        });
    }

    togglePause() {
        if (this.isGameOver) return; // Cannot pause/resume if game over

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.physics.pause();
            this.spawnTimer.paused = true;
            this.scoreTimer.paused = true;
            if (this.activePowerupEvent) this.activePowerupEvent.paused = true;
            this.pauseOverlay.setVisible(true);
            this.tweens.pauseAll();
        } else {
            this.physics.resume();
            this.spawnTimer.paused = false;
            this.scoreTimer.paused = false;
            if (this.activePowerupEvent) this.activePowerupEvent.paused = false;
            this.pauseOverlay.setVisible(false);
            this.tweens.resumeAll();
        }
    }

    update() {
        if (this.isGameOver || this.isPaused) return;

        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.toggleBoatDirection();
        }

        const height = this.cameras.main.height;
        const width = this.cameras.main.width;
        const currentSpeedMult = this.globalSpeedMultiplier;

        // 1. Scroll River
        this.river.tilePositionY -= 4 * currentSpeedMult;

        // 2. Move Entities
        this.obstacles.getChildren().forEach(obs => {
            obs.y -= obs.speed * currentSpeedMult;
            if (obs.y < -50) obs.destroy();
        });

        this.coins.getChildren().forEach(coin => {
            coin.y -= coin.speed * currentSpeedMult;
            if (coin.active && coin.y < this.boat.y - 100) {
                if (!coin.missed) {
                    coin.missed = true;
                    this.resetCombo();
                }
            }
            if (coin.y < -50) coin.destroy();
        });

        this.powerups.getChildren().forEach(p => {
            p.y -= p.speed * currentSpeedMult;
            if (p.y < -50) p.destroy();
        });

        // 3. Clamp
        if (this.boat.x < 20) this.boat.x = 20;
        if (this.boat.x > width - 20) this.boat.x = width - 20;

        // 4. Draw Debug Hitboxes
        this.debugGraphics.clear();
        if (DEBUG_HITBOX) {
            // Boat: Red rectangle
            this.debugGraphics.lineStyle(2, 0xff0000);
            if (this.boat && this.boat.active && this.boat.body) {
                this.debugGraphics.strokeRect(
                    this.boat.body.x,
                    this.boat.body.y,
                    this.boat.body.width,
                    this.boat.body.height
                );
            }

            // Obstacles: Green rectangle
            this.debugGraphics.lineStyle(2, 0x00ff00);
            this.obstacles.getChildren().forEach(obs => {
                if (obs && obs.active && obs.body) {
                    this.debugGraphics.strokeRect(
                        obs.body.x,
                        obs.body.y,
                        obs.body.width,
                        obs.body.height
                    );
                }
            });
        }
    }
}
