const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');
const { auth } = require('../middleware/auth');

// Get all cameras
router.get('/', auth, async (req, res) => {
  try {
    const cameras = await Camera.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ cameras });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// Get single camera
router.get('/:id', auth, async (req, res) => {
  try {
    const camera = await Camera.findOne({ _id: req.params.id, user: req.user._id });
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json({ camera });
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

// Create camera
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      url,
      location,
      settings,
      icon,
      color,
    } = req.body;

    const camera = new Camera({
      name,
      description,
      type,
      url,
      location,
      settings,
      icon,
      color,
      user: req.user._id,
    });

    await camera.save();
    res.status(201).json({ camera, message: 'Camera created successfully' });
  } catch (error) {
    console.error('Error creating camera:', error);
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

// Update camera
router.put('/:id', auth, async (req, res) => {
  try {
    const camera = await Camera.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({ camera, message: 'Camera updated successfully' });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// Delete camera
router.delete('/:id', auth, async (req, res) => {
  try {
    const camera = await Camera.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({ message: 'Camera deleted successfully' });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

// Update camera status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const camera = await Camera.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { 
        status,
        lastSeen: status === 'online' ? new Date() : undefined,
      },
      { new: true }
    );

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({ camera });
  } catch (error) {
    console.error('Error updating camera status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Record detection on camera
router.patch('/:id/detection', auth, async (req, res) => {
  try {
    const camera = await Camera.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { 
        lastDetection: new Date(),
        $inc: { detectionCount: 1 },
      },
      { new: true }
    );

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json({ camera });
  } catch (error) {
    console.error('Error recording detection:', error);
    res.status(500).json({ error: 'Failed to record detection' });
  }
});

// Toggle camera active state
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const camera = await Camera.findOne({ _id: req.params.id, user: req.user._id });
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    camera.isActive = !camera.isActive;
    await camera.save();

    res.json({ camera });
  } catch (error) {
    console.error('Error toggling camera:', error);
    res.status(500).json({ error: 'Failed to toggle camera' });
  }
});

// Get cameras for map (with location data)
router.get('/map/locations', auth, async (req, res) => {
  try {
    const cameras = await Camera.find(
      { user: req.user._id, isActive: true },
      'name location status lastDetection detectionCount icon color type'
    );
    res.json({ cameras });
  } catch (error) {
    console.error('Error fetching map cameras:', error);
    res.status(500).json({ error: 'Failed to fetch cameras for map' });
  }
});

module.exports = router;
