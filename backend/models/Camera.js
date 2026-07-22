const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['webcam', 'ip', 'rtsp'],
    default: 'webcam',
  },
  url: {
    type: String,
    default: '', // For IP cameras
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    floor: {
      type: String,
      default: '',
    },
    building: {
      type: String,
      default: '',
    },
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error', 'maintenance'],
    default: 'offline',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  lastDetection: {
    type: Date,
    default: null,
  },
  detectionCount: {
    type: Number,
    default: 0,
  },
  settings: {
    detectionEnabled: {
      type: Boolean,
      default: true,
    },
    sensitivity: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    alertsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  icon: {
    type: String,
    enum: ['camera', 'dome', 'ptz', 'thermal'],
    default: 'camera',
  },
  color: {
    type: String,
    default: '#2196f3',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for geospatial queries
cameraSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Camera', cameraSchema);
