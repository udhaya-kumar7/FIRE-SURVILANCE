const express = require('express');
const { auth } = require('../middleware/auth');
const AlertSettings = require('../models/AlertSettings');
const { sendFireAlert, sendTestEmail, verifyEmailConfig } = require('../utils/emailService');

const router = express.Router();

// Get alert settings for current user
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await AlertSettings.getOrCreate(req.user._id);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching alert settings:', error);
    res.status(500).json({ error: 'Failed to fetch alert settings' });
  }
});

// Update alert settings
router.put('/settings', auth, async (req, res) => {
  try {
    const {
      emailAlerts,
      soundAlerts,
      autoSnapshot,
      detection
    } = req.body;

    let settings = await AlertSettings.getOrCreate(req.user._id);

    if (emailAlerts) {
      settings.emailAlerts = { ...settings.emailAlerts, ...emailAlerts };
    }
    if (soundAlerts) {
      settings.soundAlerts = { ...settings.soundAlerts, ...soundAlerts };
    }
    if (autoSnapshot) {
      settings.autoSnapshot = { ...settings.autoSnapshot, ...autoSnapshot };
    }
    if (detection) {
      settings.detection = { ...settings.detection, ...detection };
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error updating alert settings:', error);
    res.status(500).json({ error: 'Failed to update alert settings' });
  }
});

// Check email configuration status
router.get('/email-status', auth, async (req, res) => {
  try {
    const status = await verifyEmailConfig();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check email status' });
  }
});

// Send test email
router.post('/test-email', auth, async (req, res) => {
  try {
    const settings = await AlertSettings.getOrCreate(req.user._id);
    const email = req.body.email || settings.emailAlerts.email;

    if (!email) {
      return res.status(400).json({ error: 'No email address provided' });
    }

    const result = await sendTestEmail(email);
    res.json(result);
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Manually trigger fire alert (for testing)
router.post('/trigger-test-alert', auth, async (req, res) => {
  try {
    const settings = await AlertSettings.getOrCreate(req.user._id);
    
    if (!settings.emailAlerts.enabled || !settings.emailAlerts.email) {
      return res.status(400).json({ error: 'Email alerts not configured' });
    }

    const mockDetection = {
      maxConfidence: 0.85,
      alertLevel: 'alert',
      detections: [{ class: 'fire', confidence: 0.85 }],
      source: 'Test Alert'
    };

    const result = await sendFireAlert({
      to: settings.emailAlerts.email,
      detection: mockDetection,
      cameraId: 'Test Camera'
    });

    res.json(result);
  } catch (error) {
    console.error('Error triggering test alert:', error);
    res.status(500).json({ error: 'Failed to trigger test alert' });
  }
});

module.exports = router;
