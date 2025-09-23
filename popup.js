// Popup script for extension settings
class PopupManager {
  constructor() {
    this.defaultSettings = {
      defaultLanguage: 'en',
      learningFocus: 'vocabulary',
      autoDetectLanguage: true,
      showPronunciation: true,
      showExamples: true
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateStatus('Ready');
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(this.defaultSettings);
      
      document.getElementById('defaultLanguage').value = settings.defaultLanguage;
      document.getElementById('learningFocus').value = settings.learningFocus;
      document.getElementById('autoDetectLanguage').checked = settings.autoDetectLanguage;
      document.getElementById('showPronunciation').checked = settings.showPronunciation;
      document.getElementById('showExamples').checked = settings.showExamples;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.updateStatus('Error loading settings', 'error');
    }
  }

  async saveSettings() {
    try {
      const settings = {
        defaultLanguage: document.getElementById('defaultLanguage').value,
        learningFocus: document.getElementById('learningFocus').value,
        autoDetectLanguage: document.getElementById('autoDetectLanguage').checked,
        showPronunciation: document.getElementById('showPronunciation').checked,
        showExamples: document.getElementById('showExamples').checked
      };

      await chrome.storage.sync.set(settings);
      this.updateStatus('Settings saved', 'success');
      
      // Notify content script of settings change
      this.notifyContentScript(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.updateStatus('Error saving settings', 'error');
    }
  }

  async notifyContentScript(settings) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: settings
        });
      }
    } catch (error) {
      console.error('Error notifying content script:', error);
    }
  }

  bindEvents() {
    // Save settings when any input changes
    const inputs = document.querySelectorAll('select, input[type="checkbox"]');
    inputs.forEach(input => {
      input.addEventListener('change', () => this.saveSettings());
    });

    // Test tooltip button
    document.getElementById('testTooltip').addEventListener('click', () => {
      this.testTooltip();
    });

    // Clear history button
    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });
  }

  async testTooltip() {
    try {
      this.updateStatus('Testing tooltip...', 'info');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'testTooltip',
          text: 'Hello world! This is a test translation.'
        });
        this.updateStatus('Tooltip test sent', 'success');
      }
    } catch (error) {
      console.error('Error testing tooltip:', error);
      this.updateStatus('Error testing tooltip', 'error');
    }
  }

  async clearHistory() {
    try {
      await chrome.storage.local.clear();
      this.updateStatus('History cleared', 'success');
    } catch (error) {
      console.error('Error clearing history:', error);
      this.updateStatus('Error clearing history', 'error');
    }
  }

  updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        statusElement.textContent = 'Ready';
        statusElement.className = 'status';
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});