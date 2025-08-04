// Main index controller for tab navigation and app initialization
import { AppController } from './app-controller.js';

class IndexController {
  constructor() {
    this.appController = null;
    this.currentTab = 'home';
    this.setupTabNavigation();
    this.initializeDefaultTab();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetTab = e.target.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    // Hide all tabs and remove active class
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Show target tab and add active class
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}-tab`);

    if (targetButton && targetContent) {
      targetButton.classList.add('active');
      targetContent.classList.add('active');
      this.currentTab = tabName;

      // Initialize app controller if switching to home tab
      if (tabName === 'home' && !this.appController) {
        this.initializeApp();
      }
    }
  }

  initializeDefaultTab() {
    // Home tab is default, initialize the app
    if (this.currentTab === 'home') {
      this.initializeApp();
    }
  }

  initializeApp() {
    if (!this.appController) {
      this.appController = new AppController();
      this.appController.initialize();
    }
  }
}

// Initialize the index controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new IndexController();
});
