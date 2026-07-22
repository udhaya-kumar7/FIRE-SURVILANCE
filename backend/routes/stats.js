const express = require('express');
const { auth } = require('../middleware/auth');
const Dataset = require('../models/Dataset');
const TrainingModel = require('../models/TrainingModel');
const DetectionLog = require('../models/DetectionLog');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Dataset stats
    const totalDatasets = await Dataset.countDocuments();
    const readyDatasets = await Dataset.countDocuments({ status: 'ready' });

    // Model stats
    const latestModel = await TrainingModel.findOne()
      .sort({ createdAt: -1 })
      .select('status metrics');

    const trainedModels = await TrainingModel.countDocuments({ status: 'completed' });
    const trainingInProgress = await TrainingModel.findOne({ status: 'training' });

    let modelStatus = 'Not Trained';
    let lastMAP = 0;

    if (trainingInProgress) {
      modelStatus = 'Training';
    } else if (latestModel) {
      if (latestModel.status === 'completed') {
        modelStatus = 'Trained';
        lastMAP = latestModel.metrics?.mAP || 0;
      } else if (latestModel.status === 'failed') {
        modelStatus = 'Failed';
      }
    }

    // Detection stats
    const totalDetections = await DetectionLog.countDocuments();
    const fireDetections = await DetectionLog.countDocuments({ fireDetected: true });
    
    // Last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDetections = await DetectionLog.countDocuments({
      createdAt: { $gte: last24h }
    });
    const recentFireDetections = await DetectionLog.countDocuments({
      createdAt: { $gte: last24h },
      fireDetected: true
    });

    // Recent activity
    const recentAlerts = await DetectionLog.find({ fireDetected: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('createdAt alertLevel maxConfidence source');

    res.json({
      datasets: {
        total: totalDatasets,
        ready: readyDatasets
      },
      models: {
        status: modelStatus,
        trained: trainedModels,
        lastMAP: lastMAP,
        isTraining: !!trainingInProgress,
        trainingId: trainingInProgress?._id
      },
      detections: {
        total: totalDetections,
        fireDetections,
        last24h: recentDetections,
        fireDetectionsLast24h: recentFireDetections
      },
      recentAlerts
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get detection trends
router.get('/trends', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const trends = await DetectionLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          fireDetections: { $sum: { $cond: ['$fireDetected', 1, 0] } },
          avgConfidence: { $avg: '$maxConfidence' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get system health
router.get('/health', auth, async (req, res) => {
  try {
    const [datasetStatus, trainingStatus, detectionStatus] = await Promise.all([
      Dataset.findOne().sort({ createdAt: -1 }).select('status createdAt'),
      TrainingModel.findOne({ status: 'training' }),
      DetectionLog.findOne().sort({ createdAt: -1 }).select('createdAt')
    ]);

    res.json({
      database: 'healthy',
      lastDatasetUpload: datasetStatus?.createdAt,
      trainingActive: !!trainingStatus,
      lastDetection: detectionStatus?.createdAt,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
