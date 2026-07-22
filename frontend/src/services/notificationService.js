// Push Notification Service for Fire Surveillance System

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.permissionGranted = false;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Initialize the service worker
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', this.swRegistration);

      // Check current permission
      this.permissionGranted = Notification.permission === 'granted';

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleSwMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  // Show a notification
  async showNotification(title, options = {}) {
    if (!this.permissionGranted) {
      console.warn('Notification permission not granted');
      return false;
    }

    const defaultOptions = {
      icon: '/fire-icon.svg',
      badge: '/fire-icon.svg',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      tag: 'fire-alert-' + Date.now(),
      ...options
    };

    try {
      // Use service worker for background notifications
      if (this.swRegistration && document.hidden) {
        const sw = this.swRegistration.active || this.swRegistration.waiting || this.swRegistration.installing;
        if (sw) {
          sw.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body: defaultOptions.body,
            data: defaultOptions.data
          });
          return true;
        }
      }

      // Use regular Notification API for foreground
      const notification = new Notification(title, defaultOptions);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        // Navigate to detection page
        if (window.location.pathname !== '/detection') {
          window.location.href = '/detection';
        }
      };

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  // Show fire detection alert
  async showFireAlert(detection) {
    const confidence = detection.maxConfidence 
      ? `${(detection.maxConfidence * 100).toFixed(0)}%` 
      : 'Unknown';
    
    const alertLevel = detection.alertLevel || 'warning';
    const levelEmoji = alertLevel === 'critical' ? '🚨' : '⚠️';

    return this.showNotification(`${levelEmoji} Fire Detected!`, {
      body: `Fire detected with ${confidence} confidence. Alert Level: ${alertLevel.toUpperCase()}`,
      tag: 'fire-alert-' + detection._id,
      data: {
        detectionId: detection._id,
        alertLevel,
        timestamp: Date.now(),
        url: '/detection'
      },
      requireInteraction: alertLevel === 'critical'
    });
  }

  // Handle messages from service worker
  handleSwMessage(event) {
    console.log('Message from Service Worker:', event.data);
    
    if (event.data.type === 'NOTIFICATION_CLICKED') {
      // Handle notification click action
      if (event.data.action === 'view') {
        window.location.href = '/detection';
      }
    }
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.isSupported && this.permissionGranted;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
