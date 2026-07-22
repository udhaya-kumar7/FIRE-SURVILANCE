const express = require('express');
const router = express.Router();
const Recording = require('../models/Recording');
const { auth } = require('../middleware/auth');

// Start a new recording session
router.post('/start', auth, async (req, res) => {
  try {
    const { name, description, cameraSource, cameraName, fps } = req.body;
    
    const recording = new Recording({
      user: req.user.id,
      name: name || `Recording ${new Date().toLocaleString()}`,
      description: description || '',
      cameraSource: cameraSource || 'webcam',
      cameraName: cameraName || 'Default Camera',
      startTime: new Date(),
      status: 'recording',
      fps: fps || 1,
      frames: [],
    });
    
    await recording.save();
    
    res.status(201).json({
      success: true,
      recording: {
        _id: recording._id,
        name: recording.name,
        status: recording.status,
        startTime: recording.startTime,
      },
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ message: 'Error starting recording', error: error.message });
  }
});

// Add frame to recording
router.post('/:id/frame', auth, async (req, res) => {
  try {
    const { imageData, hasDetection, detections } = req.body;
    
    const recording = await Recording.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'recording',
    });
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found or already stopped' });
    }
    
    const frame = {
      timestamp: new Date(),
      imageData,
      hasDetection: hasDetection || false,
      detections: detections || [],
    };
    
    recording.frames.push(frame);
    
    // Set thumbnail from first frame
    if (recording.frames.length === 1) {
      recording.thumbnail = imageData;
    }
    
    // Update thumbnail if detection found
    if (hasDetection && !recording.thumbnail?.includes('detection')) {
      recording.thumbnail = imageData;
    }
    
    await recording.save();
    
    res.json({
      success: true,
      frameCount: recording.frames.length,
    });
  } catch (error) {
    console.error('Error adding frame:', error);
    res.status(500).json({ message: 'Error adding frame', error: error.message });
  }
});

// Stop recording
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    recording.status = 'completed';
    recording.endTime = new Date();
    await recording.save();
    
    res.json({
      success: true,
      recording: {
        _id: recording._id,
        name: recording.name,
        status: recording.status,
        duration: recording.duration,
        totalFrames: recording.totalFrames,
        detectionCount: recording.detectionCount,
      },
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    res.status(500).json({ message: 'Error stopping recording', error: error.message });
  }
});

// Get all recordings for user (without frames for listing)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: req.user.id };
    if (status) {
      query.status = status;
    }
    
    const recordings = await Recording.find(query)
      .select('-frames') // Exclude frames for listing
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Recording.countDocuments(query);
    
    res.json({
      recordings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Error fetching recordings', error: error.message });
  }
});

// Get single recording with frames (for playback)
router.get('/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ message: 'Error fetching recording', error: error.message });
  }
});

// Get recording metadata (without frames)
router.get('/:id/metadata', auth, async (req, res) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).select('-frames');
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error fetching recording metadata:', error);
    res.status(500).json({ message: 'Error fetching recording metadata', error: error.message });
  }
});

// Get specific frames (for paginated playback)
router.get('/:id/frames', auth, async (req, res) => {
  try {
    const { start = 0, count = 30 } = req.query;
    
    const recording = await Recording.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    const frames = recording.frames.slice(
      parseInt(start),
      parseInt(start) + parseInt(count)
    );
    
    res.json({
      frames,
      totalFrames: recording.totalFrames,
      hasMore: parseInt(start) + parseInt(count) < recording.totalFrames,
    });
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ message: 'Error fetching frames', error: error.message });
  }
});

// Update recording details
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const recording = await Recording.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name, description },
      { new: true }
    ).select('-frames');
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    res.json(recording);
  } catch (error) {
    console.error('Error updating recording:', error);
    res.status(500).json({ message: 'Error updating recording', error: error.message });
  }
});

// Delete recording
router.delete('/:id', auth, async (req, res) => {
  try {
    const recording = await Recording.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    res.json({ success: true, message: 'Recording deleted' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({ message: 'Error deleting recording', error: error.message });
  }
});

// Delete multiple recordings
router.post('/delete-multiple', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid recording IDs' });
    }
    
    const result = await Recording.deleteMany({
      _id: { $in: ids },
      user: req.user.id,
    });
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting recordings:', error);
    res.status(500).json({ message: 'Error deleting recordings', error: error.message });
  }
});

module.exports = router;
