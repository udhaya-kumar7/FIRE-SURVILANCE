const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  extractedPath: {
    type: String
  },
  fileSize: {
    type: Number,
    default: 0
  },
  imageCount: {
    type: Number,
    default: 0
  },
  labelCount: {
    type: Number,
    default: 0
  },
  classes: [{
    type: String
  }],
  sampleImages: [{
    path: String,
    filename: String
  }],
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  errorMessage: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    format: {
      type: String,
      enum: ['yolo', 'coco', 'voc', 'unknown'],
      default: 'yolo'
    },
    splitRatio: {
      train: { type: Number, default: 0.7 },
      val: { type: Number, default: 0.2 },
      test: { type: Number, default: 0.1 }
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
datasetSchema.index({ name: 'text', description: 'text' });
datasetSchema.index({ status: 1 });
datasetSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Dataset', datasetSchema);
