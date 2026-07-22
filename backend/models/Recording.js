const mongoose = require('mongoose');

const frameSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
  },
  imageData: {
    type: String, // Base64 encoded frame
    required: true,
  },
  hasDetection: {
    type: Boolean,
    default: false,
  },
  detections: [{
    confidence: Number,
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  }],
});

const recordingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  cameraSource: {
    type: String,
    enum: ['webcam', 'ip-camera', 'multi-camera'],
    default: 'webcam',
  },
  cameraName: {
    type: String,
    default: 'Default Camera',
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // Duration in seconds
    default: 0,
  },
  totalFrames: {
    type: Number,
    default: 0,
  },
  detectionCount: {
    type: Number,
    default: 0,
  },
  frames: [frameSchema],
  thumbnail: {
    type: String, // Base64 encoded thumbnail
  },
  status: {
    type: String,
    enum: ['recording', 'completed', 'processing'],
    default: 'recording',
  },
  fileSize: {
    type: Number, // Size in bytes
    default: 0,
  },
  fps: {
    type: Number,
    default: 1, // Frames per second recorded
  },
}, {
  timestamps: true,
});

// Index for efficient queries
recordingSchema.index({ user: 1, createdAt: -1 });
recordingSchema.index({ status: 1 });

// Calculate duration before saving
recordingSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
  if (this.frames && this.frames.length > 0) {
    this.totalFrames = this.frames.length;
    this.detectionCount = this.frames.filter(f => f.hasDetection).length;
    // Estimate file size (rough estimate based on base64 data)
    this.fileSize = this.frames.reduce((acc, frame) => {
      return acc + (frame.imageData ? frame.imageData.length : 0);
    }, 0);
  }
  next();
});

// Virtual for formatted duration
recordingSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

recordingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Recording', recordingSchema);
