import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import HomeScene from './scenes/HomeScene';
import GameScene from './scenes/GameScene';

// Game base dimensions (mobile-first, portrait 9:16 aspect ratio)
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

/**
 * Detect if the device is mobile based on screen width and touch capability
 */
function isMobileDevice() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isNarrowScreen = window.innerWidth <= 768;
  return isTouchDevice && isNarrowScreen;
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, HomeScene, GameScene],
};

const game = new Phaser.Game(config);

/**
 * Handle resize for desktop constraint
 */
function handleResize() {
  // If in fullscreen mode, remove manual constraints and let Phaser handle it
  if (game.scale.isFullscreen) {
    const container = document.getElementById('game-container');
    if (container) {
      container.style.maxWidth = '';
      container.style.maxHeight = '';
    }
    return;
  }

  if (!isMobileDevice()) {
    const canvas = document.querySelector('#game-container canvas');
    if (canvas) {
      // On desktop, constrain canvas width to ~1/3 of viewport
      const viewportWidth = window.innerWidth;
      const maxWidth = Math.min(viewportWidth * 0.4, 450);
      const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
      const calculatedHeight = maxWidth / aspectRatio;

      // Let Phaser handle the scaling, but constrain the container
      const container = document.getElementById('game-container');
      if (container) {
        container.style.maxWidth = `${maxWidth}px`;
        container.style.maxHeight = `${calculatedHeight}px`;
      }
    }
  } else {
    // On mobile, remove constraints
    const container = document.getElementById('game-container');
    if (container) {
      container.style.maxWidth = '';
      container.style.maxHeight = '';
    }
  }
}

// Apply constraints after game is ready
game.events.once('ready', () => {
  handleResize();
});

// Listen for fullscreen changes
game.scale.on('enterfullscreen', handleResize);
game.scale.on('leavefullscreen', handleResize);

// Initial call with slight delay for DOM
setTimeout(handleResize, 50);

// Handle window resize with debounce
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    handleResize();
    // Trigger Phaser's resize handler
    game.scale.refresh();
  }, 100);
});

export default game;
