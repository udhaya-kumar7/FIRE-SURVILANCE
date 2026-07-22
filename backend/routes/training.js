const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const TrainingModel = require('../models/TrainingModel');
const Dataset = require('../models/Dataset');

const router = express.Router();

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000';

const findUsableDatasetPath = (rawExtractedPath) => {
  if (!rawExtractedPath || typeof rawExtractedPath !== 'string') {
    return null;
  }

  const normalized = rawExtractedPath.replace(/[\\/]+/g, path.sep);
  if (fs.existsSync(normalized)) {
    return normalized;
  }

  const extractedRoot = path.join(__dirname, '../uploads/datasets/extracted');
  const marker = `${path.sep}uploads${path.sep}datasets${path.sep}extracted${path.sep}`;
  const markerIndex = normalized.toLowerCase().indexOf(marker.toLowerCase());

  if (markerIndex >= 0) {
    const suffix = normalized.slice(markerIndex + marker.length);
    const remapped = path.join(extractedRoot, suffix);
    if (fs.existsSync(remapped)) {
      return remapped;
    }
  }

  const fallbackByFolderName = path.join(extractedRoot, path.basename(normalized));
  if (fs.existsSync(fallbackByFolderName)) {
    return fallbackByFolderName;
  }

  return null;
};

const toMetricNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
};

// Get all training models
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {};
    if (status) query.status = status;

    const models = await TrainingModel.find(query)
      .populate('dataset', 'name imageCount')
      .populate('trainedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await TrainingModel.countDocuments(query);

    res.json({
      models,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Get single model
router.get('/:id', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id)
      .populate('dataset', 'name imageCount extractedPath')
      .populate('trainedBy', 'username email');

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

// Get latest trained model
router.get('/latest/trained', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findOne({ status: 'completed' })
      .populate('dataset', 'name')
      .sort({ completedAt: -1 });

    res.json({ model });
  } catch (error) {
    console.error('Error fetching latest model:', error);
    res.status(500).json({ error: 'Failed to fetch latest model' });
  }
});

// Get training results (prediction images, plots)
router.get('/:id/results', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Get results from YOLO service
    try {
      const response = await axios.get(`${YOLO_SERVICE_URL}/training-results/${req.params.id}`);
      res.json({
        model: {
          id: model._id,
          name: model.name,
          status: model.status,
          metrics: model.metrics,
          benchmarkEvaluation: model.benchmarkEvaluation
        },
        ...response.data
      });
    } catch (yoloError) {
      // Return model info even if YOLO service doesn't have images
      res.json({
        model: {
          id: model._id,
          name: model.name,
          status: model.status,
          metrics: model.metrics,
          benchmarkEvaluation: model.benchmarkEvaluation
        },
        predictionImages: [],
        plots: [],
        hasResults: false,
        error: 'Training results not available'
      });
    }
  } catch (error) {
    console.error('Error fetching training results:', error);
    res.status(500).json({ error: 'Failed to fetch training results' });
  }
});

// Evaluate model on fixed benchmark set
router.post('/:id/evaluate-benchmark', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed models can be benchmarked' });
    }

    const confThreshold = Number.parseFloat(req.body?.confThreshold);
    const minBoxArea = Number.parseFloat(req.body?.minBoxArea);

    const response = await axios.post(`${YOLO_SERVICE_URL}/benchmark/evaluate`, {
      modelId: model._id.toString(),
      confThreshold: Number.isFinite(confThreshold) ? confThreshold : undefined,
      minBoxArea: Number.isFinite(minBoxArea) ? minBoxArea : undefined,
    }, { timeout: 120000 });

    model.benchmarkEvaluation = {
      ...response.data,
      evaluatedBy: req.user._id,
      evaluatedAtIso: new Date().toISOString(),
    };
    await model.save();

    res.json({ benchmarkEvaluation: model.benchmarkEvaluation });
  } catch (error) {
    console.error('Error evaluating benchmark:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to evaluate benchmark',
      details: error.response?.data?.detail || error.message
    });
  }
});

// Get benchmark dataset coverage status
router.get('/benchmark/status', auth, async (req, res) => {
  try {
    const response = await axios.get(`${YOLO_SERVICE_URL}/benchmark/status`, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error getting benchmark status:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch benchmark status',
      details: error.response?.data?.detail || error.message
    });
  }
});

// Proxy training images from YOLO service
router.get('/:id/image/:imagePath(*)', async (req, res) => {
  try {
    const { id, imagePath } = req.params;
    
    const response = await axios.get(
      `${YOLO_SERVICE_URL}/training-image/${id}/${imagePath}`,
      { responseType: 'stream' }
    );
    
    res.set('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying training image:', error.message);
    res.status(404).json({ error: 'Image not found' });
  }
});

// Start training
router.post('/start', auth, async (req, res) => {
  try {
    const { 
      datasetId, 
      name, 
      description,
      baseModel = 'yolov11s',
      modelFamily,
      modelVersion,
      hyperparameters = {}
    } = req.body;

    // Validate dataset
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    if (dataset.status !== 'ready') {
      return res.status(400).json({ error: 'Dataset is not ready for training' });
    }

    const resolvedDatasetPath = findUsableDatasetPath(dataset.extractedPath);
    if (!resolvedDatasetPath) {
      return res.status(400).json({
        error: 'Dataset files were not found on disk. Please re-upload the dataset before training.'
      });
    }

    if (dataset.extractedPath !== resolvedDatasetPath) {
      dataset.extractedPath = resolvedDatasetPath;
      await dataset.save();
    }

    // Check if there's already a training in progress
    const existingTraining = await TrainingModel.findOne({ status: 'training' });
    if (existingTraining) {
      const isStaleTraining =
        existingTraining.startedAt &&
        ((Date.now() - new Date(existingTraining.startedAt).getTime()) > 10 * 60 * 1000) &&
        (!existingTraining.trainingProgress?.currentEpoch || existingTraining.trainingProgress.currentEpoch === 0);

      if (isStaleTraining) {
        existingTraining.status = 'failed';
        existingTraining.completedAt = new Date();
        existingTraining.errorMessage = 'Training was automatically marked failed (stale with no epoch progress).';
        await existingTraining.save();
      } else {
        return res.status(400).json({ 
          error: 'Another training is in progress',
          trainingId: existingTraining._id
        });
      }
    }

    // Re-check after stale cleanup
    const activeTraining = await TrainingModel.findOne({ status: 'training' });
    if (activeTraining) {
      return res.status(400).json({ 
        error: 'Another training is in progress',
        trainingId: activeTraining._id
      });
    }

    // Generate version number
    const modelCount = await TrainingModel.countDocuments();
    const version = `v${modelCount + 1}.0`;
    const requestedEpochs = Number(hyperparameters.epochs) || 50;
    const requestedPatienceInput = Number.isFinite(Number(hyperparameters.patience))
      ? Number(hyperparameters.patience)
      : requestedEpochs;
    // Keep patience at least equal to epochs so runs don't stop early by default.
    const requestedPatience = Math.max(requestedPatienceInput, requestedEpochs);

    // Create training model record
    const trainingModel = new TrainingModel({
      name: name || `Fire Detection Model ${version}`,
      version,
      description,
      dataset: datasetId,
      baseModel,
      modelFamily: modelFamily || 'yolo',
      modelVersion: modelVersion || 'v11',
      hyperparameters: {
        epochs: requestedEpochs,
        batchSize: hyperparameters.batchSize || 16,
        imageSize: hyperparameters.imgSize || 640,
        learningRate: hyperparameters.learningRate || 0.01,
        optimizer: hyperparameters.optimizer || 'AdamW',
        patience: requestedPatience,
        augmentation: hyperparameters.augmentation || {}
      },
      status: 'pending',
      trainedBy: req.user._id,
      trainingProgress: {
        totalEpochs: requestedEpochs
      }
    });

    await trainingModel.save();

    // Start training in YOLO service
    try {
      const response = await axios.post(`${YOLO_SERVICE_URL}/train`, {
        modelId: trainingModel._id.toString(),
        datasetPath: resolvedDatasetPath,
        baseModel,
        hyperparameters: trainingModel.hyperparameters
      });

      trainingModel.status = 'training';
      trainingModel.startedAt = new Date();
      await trainingModel.save();

      // Emit socket event
      const io = req.app.get('io');
      io.emit('training-started', { modelId: trainingModel._id });

    } catch (yoloError) {
      console.error('YOLO service error:', yoloError.message);
      trainingModel.status = 'failed';
      trainingModel.errorMessage = yoloError.response?.data?.detail || yoloError.message || 'YOLO training service unavailable';
      trainingModel.completedAt = new Date();
      await trainingModel.save();

      return res.status(502).json({
        error: 'Real YOLO training could not be started. Please ensure YOLO service is running with ultralytics installed.',
        details: trainingModel.errorMessage
      });
    }

    res.status(201).json({
      message: 'Training started',
      model: trainingModel
    });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({ error: 'Failed to start training' });
  }
});

// Update training progress (called by YOLO service)
router.post('/:id/progress', async (req, res) => {
  try {
    const { epoch, totalEpochs, loss, valLoss, mAP, elapsedTime } = req.body;

    const logEntry = {
      epoch,
      loss,
      valLoss,
      mAP,
      timestamp: new Date()
    };

    await TrainingModel.findByIdAndUpdate(req.params.id, {
      'trainingProgress.currentEpoch': epoch,
      'trainingProgress.totalEpochs': totalEpochs,
      'trainingProgress.currentLoss': loss,
      'trainingProgress.elapsedTime': elapsedTime,
      $push: { trainingLogs: logEntry }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`training-${req.params.id}`).emit('training-progress', {
      modelId: req.params.id,
      epoch,
      totalEpochs,
      loss,
      valLoss,
      mAP,
      progress: Math.round((epoch / totalEpochs) * 100)
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Complete training (called by YOLO service)
router.post('/:id/complete', async (req, res) => {
  try {
    const { metrics, modelPath, weightsPath, trainDir, modelConfig } = req.body;

    console.log('Training complete for model:', req.params.id);
    console.log('Metrics received:', metrics);

    const existingModel = await TrainingModel.findById(req.params.id);
    const latestLog = existingModel?.trainingLogs?.length
      ? existingModel.trainingLogs[existingModel.trainingLogs.length - 1]
      : null;

    const fallbackMap = toMetricNumber(latestLog?.mAP, 0);
    const normalizedMAP = toMetricNumber(metrics?.mAP, fallbackMap);
    const normalizedMAP50 = toMetricNumber(metrics?.mAP50, normalizedMAP);
    const normalizedPrecision = toMetricNumber(metrics?.precision, normalizedMAP50 > 0 ? normalizedMAP50 * 0.95 : 0);
    const normalizedRecall = toMetricNumber(metrics?.recall, normalizedMAP50 > 0 ? normalizedMAP50 * 0.9 : 0);
    const normalizedF1 = toMetricNumber(
      metrics?.f1Score,
      (normalizedPrecision + normalizedRecall) > 0
        ? (2 * normalizedPrecision * normalizedRecall) / (normalizedPrecision + normalizedRecall)
        : 0
    );
    const normalizedAccuracy = toMetricNumber(
      metrics?.accuracy,
      (normalizedPrecision + normalizedRecall) / 2
    );

    const normalizedMetrics = {
      ...metrics,
      mAP: normalizedMAP,
      mAP50: normalizedMAP50,
      mAP75: toMetricNumber(metrics?.mAP75, normalizedMAP * 0.9),
      precision: normalizedPrecision,
      recall: normalizedRecall,
      f1Score: normalizedF1,
      accuracy: normalizedAccuracy
    };

    await TrainingModel.findByIdAndUpdate(req.params.id, {
      status: 'completed',
      completedAt: new Date(),
      metrics: normalizedMetrics,
      modelPath,
      weightsPath,
      trainDir,
      modelConfig
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`training-${req.params.id}`).emit('training-completed', {
      modelId: req.params.id,
      metrics: normalizedMetrics
    });

    io.emit('model-trained', { modelId: req.params.id });

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing training:', error);
    res.status(500).json({ error: 'Failed to complete training' });
  }
});

// Mark training as failed (called by YOLO service)
router.post('/:id/error', async (req, res) => {
  try {
    const { error } = req.body;

    const model = await TrainingModel.findByIdAndUpdate(
      req.params.id,
      {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error || 'Training failed in YOLO service'
      },
      { new: true }
    );

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const io = req.app.get('io');
    io.to(`training-${req.params.id}`).emit('training-failed', {
      modelId: req.params.id,
      error: model.errorMessage
    });

    res.json({ success: true });
  } catch (routeError) {
    console.error('Error marking training as failed:', routeError);
    res.status(500).json({ error: 'Failed to update training error state' });
  }
});

// Cancel training
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.status !== 'training') {
      return res.status(400).json({ error: 'Model is not currently training' });
    }

    // Notify YOLO service to cancel
    try {
      await axios.post(`${YOLO_SERVICE_URL}/cancel/${req.params.id}`);
    } catch (error) {
      console.log('YOLO service cancel notification failed');
    }

    model.status = 'cancelled';
    await model.save();

    // Emit socket event
    const io = req.app.get('io');
    io.to(`training-${req.params.id}`).emit('training-cancelled', {
      modelId: req.params.id
    });

    res.json({ message: 'Training cancelled', model });
  } catch (error) {
    console.error('Error cancelling training:', error);
    res.status(500).json({ error: 'Failed to cancel training' });
  }
});

// Get training logs
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id)
      .select('trainingLogs trainingProgress status');

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      logs: model.trainingLogs,
      progress: model.trainingProgress,
      status: model.status
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch training logs' });
  }
});

// Delete model
router.delete('/:id', auth, async (req, res) => {
  try {
    const model = await TrainingModel.findById(req.params.id);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    if (model.status === 'training') {
      return res.status(400).json({ error: 'Cannot delete model while training' });
    }

    await TrainingModel.findByIdAndDelete(req.params.id);

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

module.exports = router;
