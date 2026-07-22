const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');
const { auth } = require('../middleware/auth');

// Get all zones for current user
router.get('/', auth, async (req, res) => {
  try {
    const { cameraId, activeOnly } = req.query;
    
    const query = { user: req.user.id };
    if (cameraId) query.cameraId = cameraId;
    if (activeOnly === 'true') query.isActive = true;
    
    const zones = await Zone.find(query).sort({ priority: -1, createdAt: -1 });
    
    res.json({ zones });
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ message: 'Error fetching zones', error: error.message });
  }
});

// Get single zone
router.get('/:id', auth, async (req, res) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    
    res.json(zone);
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ message: 'Error fetching zone', error: error.message });
  }
});

// Create new zone
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, cameraId, points, color, priority, alertSettings } = req.body;
    
    if (!name || !points || points.length < 3) {
      return res.status(400).json({ message: 'Name and at least 3 points are required' });
    }
    
    const zone = new Zone({
      user: req.user.id,
      name,
      description: description || '',
      cameraId: cameraId || 'default',
      points,
      color: color || '#ff5722',
      priority: priority || 1,
      alertSettings: alertSettings || {},
    });
    
    await zone.save();
    
    res.status(201).json({ zone });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ message: 'Error creating zone', error: error.message });
  }
});

// Update zone
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, points, color, priority, alertSettings, isActive } = req.body;
    
    const zone = await Zone.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    
    if (name) zone.name = name;
    if (description !== undefined) zone.description = description;
    if (points && points.length >= 3) zone.points = points;
    if (color) zone.color = color;
    if (priority) zone.priority = priority;
    if (alertSettings) zone.alertSettings = { ...zone.alertSettings, ...alertSettings };
    if (isActive !== undefined) zone.isActive = isActive;
    
    await zone.save();
    
    res.json({ zone });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ message: 'Error updating zone', error: error.message });
  }
});

// Toggle zone active status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const zone = await Zone.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    
    zone.isActive = !zone.isActive;
    await zone.save();
    
    res.json({ zone });
  } catch (error) {
    console.error('Error toggling zone:', error);
    res.status(500).json({ message: 'Error toggling zone', error: error.message });
  }
});

// Delete zone
router.delete('/:id', auth, async (req, res) => {
  try {
    const zone = await Zone.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    
    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ message: 'Error deleting zone', error: error.message });
  }
});

// Check if detection is within any active zone
router.post('/check-detection', auth, async (req, res) => {
  try {
    const { detection, videoWidth, videoHeight, cameraId } = req.body;
    
    const zones = await Zone.find({
      user: req.user.id,
      cameraId: cameraId || 'default',
      isActive: true,
    });
    
    const matchedZones = [];
    
    for (const zone of zones) {
      if (zone.containsDetection(detection, videoWidth, videoHeight)) {
        matchedZones.push({
          _id: zone._id,
          name: zone.name,
          priority: zone.priority,
          alertSettings: zone.alertSettings,
          color: zone.color,
        });
      }
    }
    
    // Sort by priority (highest first)
    matchedZones.sort((a, b) => b.priority - a.priority);
    
    res.json({
      inZone: matchedZones.length > 0,
      zones: matchedZones,
      highestPriority: matchedZones[0] || null,
    });
  } catch (error) {
    console.error('Error checking detection:', error);
    res.status(500).json({ message: 'Error checking detection', error: error.message });
  }
});

// Get zone statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const totalZones = await Zone.countDocuments({ user: req.user.id });
    const activeZones = await Zone.countDocuments({ user: req.user.id, isActive: true });
    
    const zonesByCamera = await Zone.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$cameraId', count: { $sum: 1 } } },
    ]);
    
    res.json({
      totalZones,
      activeZones,
      inactiveZones: totalZones - activeZones,
      zonesByCamera,
    });
  } catch (error) {
    console.error('Error fetching zone stats:', error);
    res.status(500).json({ message: 'Error fetching zone stats', error: error.message });
  }
});

module.exports = router;
