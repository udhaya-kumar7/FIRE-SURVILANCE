const mongoose = require('mongoose');

const trainingModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  dataset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    required: true
  },
  baseModel: {
    type: String,
    default: 'yolov11s'
  },
  modelFamily: {
    type: String,
    enum: ['yolo', 'vajra', 'rtdetr', 'detr', 'faster_rcnn'],
    default: 'yolo'
  },
  modelVersion: {
    type: String,
    default: 'v11'
  },
  status: {
    type: String,
    enum: ['pending', 'training', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  hyperparameters: {
    epochs: { type: Number, default: 50 },
    batchSize: { type: Number, default: 16 },
    imageSize: { type: Number, default: 640 },
    learningRate: { type: Number, default: 0.01 },
    optimizer: { type: String, default: 'AdamW' },
    patience: { type: Number, default: 10 },
    augmentation: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  metrics: {
    mAP: { type: Number, default: 0 },
    mAP50: { type: Number, default: 0 },
    mAP75: { type: Number, default: 0 },
    precision: { type: Number, default: 0 },
    recall: { type: Number, default: 0 },
    f1Score: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    parameters: { type: String },
    modelFamily: { type: String }
  },
  trainingProgress: {
    currentEpoch: { type: Number, default: 0 },
    totalEpochs: { type: Number, default: 0 },
    currentLoss: { type: Number, default: 0 },
    elapsedTime: { type: Number, default: 0 }, // in seconds
    estimatedTimeRemaining: { type: Number, default: 0 }
  },
  trainingLogs: [{
    epoch: Number,
    loss: Number,
    valLoss: Number,
    mAP: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  modelPath: {
    type: String
  },
  weightsPath: {
    type: String
  },
  trainDir: {
    type: String
  },
  modelConfig: {
    type: mongoose.Schema.Types.Mixed
  },
  benchmarkEvaluation: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  configPath: {
    type: String
  },
  trainedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
trainingModelSchema.index({ status: 1 });
trainingModelSchema.index({ dataset: 1 });
trainingModelSchema.index({ trainedBy: 1 });

// Virtual for training duration
trainingModelSchema.virtual('trainingDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return (this.completedAt - this.startedAt) / 1000; // in seconds
  }
  return null;
});

module.exports = mongoose.model('TrainingModel', trainingModelSchema);
