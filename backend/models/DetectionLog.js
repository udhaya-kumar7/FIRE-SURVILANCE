const mongoose = require('mongoose');

const detectionLogSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingModel'
  },
  source: {
    type: String,
    enum: ['camera', 'upload', 'stream'],
    default: 'camera'
  },
  sourceId: {
    type: String // Camera ID or filename
  },
  imagePath: {
    type: String
  },
  imageUrl: {
    type: String
  },
  detections: [{
    class: {
      type: String,
      default: 'fire'
    },
    confidence: {
      type: Number,
      required: true
    },
    boundingBox: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    }
  }],
  fireDetected: {
    type: Boolean,
    default: false
  },
  maxConfidence: {
    type: Number,
    default: 0
  },
  alertLevel: {
    type: String,
    enum: ['safe', 'warning', 'alert', 'critical'],
    default: 'safe'
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  metadata: {
    imageWidth: Number,
    imageHeight: Number,
    fps: Number,
    frameNumber: Number
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
detectionLogSchema.index({ fireDetected: 1 });
detectionLogSchema.index({ alertLevel: 1 });
detectionLogSchema.index({ createdAt: -1 });
detectionLogSchema.index({ source: 1, sourceId: 1 });

// Pre-save hook to calculate alert level
detectionLogSchema.pre('save', function(next) {
  if (this.detections && this.detections.length > 0) {
    this.fireDetected = true;
    this.maxConfidence = Math.max(...this.detections.map(d => d.confidence));
    
    if (this.maxConfidence >= 0.9) {
      this.alertLevel = 'critical';
    } else if (this.maxConfidence >= 0.7) {
      this.alertLevel = 'alert';
    } else if (this.maxConfidence >= 0.5) {
      this.alertLevel = 'warning';
    } else {
      this.alertLevel = 'safe';
    }
  } else {
    this.fireDetected = false;
    this.alertLevel = 'safe';
    this.maxConfidence = 0;
  }
  next();
});

module.exports = mongoose.model('DetectionLog', detectionLogSchema);
