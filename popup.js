// Main entry point for the Working Time extension
import { AppController } from './js/app-controller.js';

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.initialize();
});
