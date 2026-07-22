const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const { auth } = require('../middleware/auth');
const DetectionLog = require('../models/DetectionLog');
const TrainingModel = require('../models/TrainingModel');
const AlertSettings = require('../models/AlertSettings');
const { sendFireAlert } = require('../utils/emailService');

const router = express.Router();

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000';
const LIVE_FIRE_MIN_CONFIDENCE = Number.parseFloat(process.env.LIVE_FIRE_MIN_CONFIDENCE || '0.55');
const UPLOAD_FIRE_MIN_CONFIDENCE = Number.parseFloat(process.env.UPLOAD_FIRE_MIN_CONFIDENCE || '0.65');
const LIVE_FIRE_MIN_BOX_AREA = Number.parseFloat(process.env.LIVE_FIRE_MIN_BOX_AREA || '1200');
const UPLOAD_FIRE_MIN_BOX_AREA = Number.parseFloat(process.env.UPLOAD_FIRE_MIN_BOX_AREA || '2500');

const filterFireDetections = (detections, minConfidence, minBoxArea) => {
  return (detections || []).filter((det) => {
    const confidence = Number(det?.confidence || 0);
    const boxWidth = Number(det?.boundingBox?.width || 0);
    const boxHeight = Number(det?.boundingBox?.height || 0);
    const boxArea = Math.max(0, boxWidth) * Math.max(0, boxHeight);
    const className = String(det?.class || '').toLowerCase();

    return className === 'fire' && confidence >= minConfidence && boxArea >= minBoxArea;
  });
};

// Helper function to check and send fire alert email
const checkAndSendFireAlert = async (userId, detection, imageUrl = null, cameraId = 'Camera 1') => {
  try {
    const settings = await AlertSettings.getOrCreate(userId);
    
    // Check if email alerts are enabled and cooldown has passed
    if (settings.emailAlerts.enabled && 
        settings.emailAlerts.email && 
        settings.canSendEmail()) {
      
      // Check if we should alert for this type
      const shouldAlert = detection.alertLevel === 'critical' 
        ? settings.emailAlerts.onCriticalAlert 
        : settings.emailAlerts.onFireDetected;
      
      if (shouldAlert) {
        const result = await sendFireAlert({
          to: settings.emailAlerts.email,
          detection,
          imageUrl,
          cameraId
        });
        
        if (result.success) {
          settings.lastEmailSent = new Date();
          await settings.save();
        }
        
        return result;
      }
    }
  } catch (error) {
    console.error('Error checking/sending fire alert:', error);
  }
  return { sent: false };
};

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/detections');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
  }
});

// Get all detection logs
router.get('/logs', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      fireDetected, 
      alertLevel,
      startDate,
      endDate,
      source 
    } = req.query;

    const query = {};
    
    if (fireDetected !== undefined) {
      query.fireDetected = fireDetected === 'true';
    }
    if (alertLevel) {
      query.alertLevel = alertLevel;
    }
    if (source) {
      query.source = source;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await DetectionLog.find(query)
      .populate('model', 'name version')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DetectionLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching detection logs:', error);
    res.status(500).json({ error: 'Failed to fetch detection logs' });
  }
});

// Get detection statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '1h': startDate.setHours(startDate.getHours() - 1); break;
      case '24h': startDate.setDate(startDate.getDate() - 1); break;
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
    }

    const stats = await DetectionLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalDetections: { $sum: 1 },
          fireDetections: { $sum: { $cond: ['$fireDetected', 1, 0] } },
          criticalAlerts: { $sum: { $cond: [{ $eq: ['$alertLevel', 'critical'] }, 1, 0] } },
          avgConfidence: { $avg: '$maxConfidence' },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    // Get hourly breakdown
    const hourlyStats = await DetectionLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          fireCount: { $sum: { $cond: ['$fireDetected', 1, 0] } }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);

    res.json({
      summary: stats[0] || {
        totalDetections: 0,
        fireDetections: 0,
        criticalAlerts: 0,
        avgConfidence: 0,
        avgProcessingTime: 0
      },
      hourlyStats
    });
  } catch (error) {
    console.error('Error fetching detection stats:', error);
    res.status(500).json({ error: 'Failed to fetch detection stats' });
  }
});

// Run detection on uploaded image
router.post('/detect', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const requestedModelId = req.body?.modelId;
    const requestedConfThreshold = Number.parseFloat(req.body?.confThreshold);
    const requestedMinBoxArea = Number.parseFloat(req.body?.minBoxArea);

    // Use requested model when provided, otherwise latest completed model
    let model = null;
    if (requestedModelId) {
      model = await TrainingModel.findOne({
        _id: requestedModelId,
        status: 'completed'
      });

      if (!model) {
        return res.status(400).json({ error: 'Selected model is not available for inference' });
      }
    } else {
      model = await TrainingModel.findOne({ status: 'completed' })
        .sort({ completedAt: -1 });
    }

    let detections = [];
    let processingTime = 0;

    try {
      // Read image and convert to base64
      const imageBuffer = await fs.readFile(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Call YOLO service for inference with base64 image
      const startTime = Date.now();
      const response = await axios.post(`${YOLO_SERVICE_URL}/detect/base64`, {
        imageBase64: imageBase64,
        modelId: model?._id?.toString(),
        confThreshold: Number.isFinite(requestedConfThreshold) ? requestedConfThreshold : undefined,
        minBoxArea: Number.isFinite(requestedMinBoxArea) ? requestedMinBoxArea : undefined,
      }, { timeout: 15000 });
      
      processingTime = Date.now() - startTime;
      
      // Map detections to correct format
      detections = (response.data.detections || []).map(det => ({
        class: det.class_name || det.class || 'fire',
        confidence: det.confidence,
        boundingBox: det.boundingBox
      }));
      
    } catch (yoloError) {
      console.log('YOLO service error:', yoloError.message);
      // No detection without YOLO service
      processingTime = 50;
      detections = [];
    }

    // Apply stricter filtering to reduce false positives on uploads
    detections = filterFireDetections(detections, UPLOAD_FIRE_MIN_CONFIDENCE, UPLOAD_FIRE_MIN_BOX_AREA);

    // Calculate fire detection status from filtered detections
    const fireDetections = detections;
    const fireDetected = fireDetections.length > 0;
    const maxConfidence = fireDetections.length > 0 
      ? Math.max(...fireDetections.map(d => d.confidence)) 
      : 0;
    
    // Determine alert level based on confidence
    let alertLevel = 'safe';
    if (fireDetected) {
      if (maxConfidence >= 0.9) alertLevel = 'critical';
      else if (maxConfidence >= 0.75) alertLevel = 'alert';
      else if (maxConfidence >= 0.5) alertLevel = 'warning';
    }

    // Create detection log
    const detectionLog = new DetectionLog({
      model: model?._id,
      source: 'upload',
      imagePath: req.file.path,
      imageUrl: `/uploads/detections/${req.file.filename}`,
      detections,
      fireDetected,
      maxConfidence,
      alertLevel,
      processingTime: Math.round(processingTime),
      metadata: {
        imageWidth: 640,
        imageHeight: 480
      }
    });

    await detectionLog.save();

    // Send email alert if fire detected
    if (detectionLog.fireDetected) {
      checkAndSendFireAlert(
        req.user._id,
        detectionLog,
        `${process.env.BACKEND_URL || 'http://localhost:5000'}${detectionLog.imageUrl}`,
        'Upload'
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to('detection-room').emit('new-detection', {
      detection: detectionLog
    });

    res.json({
      detection: detectionLog,
      message: detectionLog.fireDetected ? 'Fire detected!' : 'No fire detected'
    });
  } catch (error) {
    console.error('Error running detection:', error);
    res.status(500).json({ error: 'Failed to run detection' });
  }
});

// Detection from camera frame (base64)
router.post('/detect/frame', auth, async (req, res) => {
  try {
    const { frameData, cameraId = 'cam-1', confThreshold, minBoxArea } = req.body;
    const requestedConfThreshold = Number.parseFloat(confThreshold);
    const requestedMinBoxArea = Number.parseFloat(minBoxArea);

    // Get latest trained model
    const model = await TrainingModel.findOne({ status: 'completed' })
      .sort({ completedAt: -1 });

    let detections = [];
    let processingTime = 50;

    // Call YOLO service with base64 frame data
    if (frameData) {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${YOLO_SERVICE_URL}/detect/base64`, {
          imageBase64: frameData,
          modelId: model?._id?.toString(),
          confThreshold: Number.isFinite(requestedConfThreshold) ? requestedConfThreshold : undefined,
          minBoxArea: Number.isFinite(requestedMinBoxArea) ? requestedMinBoxArea : undefined,
        }, { timeout: 15000 });
        
        processingTime = Date.now() - startTime;
        
        detections = (response.data.detections || []).map(det => ({
          class: det.class_name || det.class || 'fire',
          confidence: det.confidence,
          boundingBox: det.boundingBox
        }));
      } catch (yoloError) {
        console.log('YOLO service error:', yoloError.message);
        detections = [];
      }
    }

    // Apply stricter filtering for live camera streams
    detections = filterFireDetections(detections, LIVE_FIRE_MIN_CONFIDENCE, LIVE_FIRE_MIN_BOX_AREA);

    // Calculate fire detection status from filtered detections
    const fireDetections = detections;
    const fireDetected = fireDetections.length > 0;
    const maxConfidence = fireDetections.length > 0 
      ? Math.max(...fireDetections.map(d => d.confidence)) 
      : 0;
    
    // Determine alert level based on confidence
    let alertLevel = 'safe';
    if (fireDetected) {
      if (maxConfidence >= 0.9) alertLevel = 'critical';
      else if (maxConfidence >= 0.75) alertLevel = 'alert';
      else if (maxConfidence >= 0.5) alertLevel = 'warning';
    }

    const detectionLog = new DetectionLog({
      model: model?._id,
      source: 'camera',
      sourceId: cameraId,
      detections,
      fireDetected,
      maxConfidence,
      alertLevel,
      processingTime: Math.round(processingTime),
      metadata: {
        imageWidth: 640,
        imageHeight: 480,
        fps: 30
      }
    });

    await detectionLog.save();

    // Send email alert if fire detected (async, don't wait)
    if (detectionLog.fireDetected) {
      checkAndSendFireAlert(
        req.user._id,
        detectionLog,
        null,
        cameraId
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to('detection-room').emit('new-detection', {
      detection: detectionLog
    });

    res.json({ detection: detectionLog });
  } catch (error) {
    console.error('Error processing frame:', error);
    res.status(500).json({ error: 'Failed to process frame' });
  }
});

// Acknowledge alert
router.post('/logs/:id/acknowledge', auth, async (req, res) => {
  try {
    const { notes } = req.body;

    const log = await DetectionLog.findByIdAndUpdate(
      req.params.id,
      {
        acknowledged: true,
        acknowledgedBy: req.user._id,
        acknowledgedAt: new Date(),
        notes
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ error: 'Detection log not found' });
    }

    res.json({ log });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get single detection log
router.get('/logs/:id', auth, async (req, res) => {
  try {
    const log = await DetectionLog.findById(req.params.id)
      .populate('model', 'name version')
      .populate('acknowledgedBy', 'username');

    if (!log) {
      return res.status(404).json({ error: 'Detection log not found' });
    }

    res.json({ log });
  } catch (error) {
    console.error('Error fetching detection log:', error);
    res.status(500).json({ error: 'Failed to fetch detection log' });
  }
});

// Delete detection log
router.delete('/logs/:id', auth, async (req, res) => {
  try {
    const log = await DetectionLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ error: 'Detection log not found' });
    }

    // Delete associated image file
    if (log.imagePath) {
      await fs.unlink(log.imagePath).catch(() => {});
    }

    await DetectionLog.findByIdAndDelete(req.params.id);

    res.json({ message: 'Detection log deleted' });
  } catch (error) {
    console.error('Error deleting detection log:', error);
    res.status(500).json({ error: 'Failed to delete detection log' });
  }
});

// Export logs as CSV
router.get('/logs/export/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate, fireDetectedOnly } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (fireDetectedOnly === 'true') {
      query.fireDetected = true;
    }

    const logs = await DetectionLog.find(query)
      .populate('model', 'name version')
      .sort({ createdAt: -1 });

    // Generate CSV
    const headers = ['ID', 'Timestamp', 'Source', 'Fire Detected', 'Alert Level', 'Max Confidence', 'Processing Time (ms)', 'Model', 'Acknowledged'];
    const rows = logs.map(log => [
      log._id,
      log.createdAt.toISOString(),
      log.source,
      log.fireDetected,
      log.alertLevel,
      log.maxConfidence?.toFixed(4) || '0',
      log.processingTime,
      log.model?.name || 'N/A',
      log.acknowledged
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=detection-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// Save fire detection snapshot
router.post('/snapshot', auth, async (req, res) => {
  try {
    const { imageData, detectionId, alertLevel, confidence } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Create snapshots directory
    const snapshotsDir = path.join(__dirname, '../uploads/snapshots');
    await fs.mkdir(snapshotsDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `fire-${alertLevel || 'detection'}-${timestamp}.jpg`;
    const filepath = path.join(snapshotsDir, filename);

    // Remove base64 prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Save the image
    await fs.writeFile(filepath, base64Data, 'base64');

    // Check max snapshots and clean up old ones
    const files = await fs.readdir(snapshotsDir);
    const settings = await AlertSettings.getOrCreate(req.user.id);
    const maxSnapshots = settings.autoSnapshot?.maxSnapshots || 100;

    if (files.length > maxSnapshots) {
      // Sort by creation time and delete oldest
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const stat = await fs.stat(path.join(snapshotsDir, file));
          return { file, mtime: stat.mtime };
        })
      );
      fileStats.sort((a, b) => a.mtime - b.mtime);
      
      const toDelete = fileStats.slice(0, files.length - maxSnapshots);
      for (const { file } of toDelete) {
        await fs.unlink(path.join(snapshotsDir, file));
      }
    }

    res.json({
      success: true,
      filename,
      path: `/api/detection/snapshots/${filename}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

// Get list of snapshots
router.get('/snapshots', auth, async (req, res) => {
  try {
    const snapshotsDir = path.join(__dirname, '../uploads/snapshots');
    
    try {
      await fs.access(snapshotsDir);
    } catch {
      return res.json({ snapshots: [] });
    }

    const files = await fs.readdir(snapshotsDir);
    const snapshots = await Promise.all(
      files
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
        .map(async (file) => {
          const stat = await fs.stat(path.join(snapshotsDir, file));
          return {
            filename: file,
            path: `/api/detection/snapshots/${file}`,
            createdAt: stat.mtime,
            size: stat.size
          };
        })
    );

    // Sort by newest first
    snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ snapshots });
  } catch (error) {
    console.error('Error listing snapshots:', error);
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

// Serve individual snapshot
router.get('/snapshots/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/snapshots', filename);
    
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    await fs.access(filepath);
    res.sendFile(filepath);
  } catch (error) {
    res.status(404).json({ error: 'Snapshot not found' });
  }
});

// Delete snapshot
router.delete('/snapshots/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads/snapshots', filename);
    
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    await fs.unlink(filepath);
    res.json({ success: true, message: 'Snapshot deleted' });
  } catch (error) {
    res.status(404).json({ error: 'Snapshot not found' });
  }
});

// Delete all snapshots
router.delete('/snapshots', auth, async (req, res) => {
  try {
    const snapshotsDir = path.join(__dirname, '../uploads/snapshots');
    
    try {
      await fs.access(snapshotsDir);
    } catch {
      return res.json({ success: true, deleted: 0 });
    }

    const files = await fs.readdir(snapshotsDir);
    let deleted = 0;
    
    for (const file of files) {
      if (file.endsWith('.jpg') || file.endsWith('.png')) {
        await fs.unlink(path.join(snapshotsDir, file));
        deleted++;
      }
    }

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting snapshots:', error);
    res.status(500).json({ error: 'Failed to delete snapshots' });
  }
});

module.exports = router;
