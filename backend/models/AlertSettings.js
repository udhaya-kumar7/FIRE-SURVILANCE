const mongoose = require('mongoose');

const alertSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Email alerts
  emailAlerts: {
    enabled: { type: Boolean, default: false },
    email: { type: String },
    onFireDetected: { type: Boolean, default: true },
    onCriticalAlert: { type: Boolean, default: true },
    cooldownMinutes: { type: Number, default: 5 } // Don't spam emails
  },
  // Sound alerts
  soundAlerts: {
    enabled: { type: Boolean, default: true },
    volume: { type: Number, default: 100, min: 0, max: 100 },
    soundType: { type: String, default: 'alarm', enum: ['alarm', 'beep', 'siren'] }
  },
  // Push notifications
  pushNotifications: {
    enabled: { type: Boolean, default: true },
    criticalOnly: { type: Boolean, default: false }
  },
  // Snapshot settings
  autoSnapshot: {
    enabled: { type: Boolean, default: true },
    saveOnFireDetected: { type: Boolean, default: true },
    maxSnapshots: { type: Number, default: 100 }
  },
  // Detection settings
  detection: {
    confidenceThreshold: { type: Number, default: 0.5, min: 0, max: 1 },
    detectionInterval: { type: Number, default: 1000, min: 500, max: 10000 },
    autoDetect: { type: Boolean, default: true }
  },
  // Last alert sent (to prevent spam)
  lastEmailSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Get or create settings for a user
alertSettingsSchema.statics.getOrCreate = async function(userId) {
  let settings = await this.findOne({ user: userId });
  if (!settings) {
    settings = await this.create({ user: userId });
  }
  return settings;
};

// Check if enough time has passed since last email
alertSettingsSchema.methods.canSendEmail = function() {
  if (!this.lastEmailSent) return true;
  const cooldownMs = this.emailAlerts.cooldownMinutes * 60 * 1000;
  return Date.now() - this.lastEmailSent.getTime() > cooldownMs;
};

module.exports = mongoose.model('AlertSettings', alertSettingsSchema);
