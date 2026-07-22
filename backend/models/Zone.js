const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 1, // Normalized coordinates (0-1)
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
});

const zoneSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  cameraId: {
    type: String,
    default: 'default', // For multi-camera support
  },
  // Polygon points defining the zone (normalized 0-1 coordinates)
  points: {
    type: [pointSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 3; // Minimum 3 points for a polygon
      },
      message: 'Zone must have at least 3 points',
    },
  },
  // Zone color for display
  color: {
    type: String,
    default: '#ff5722',
  },
  // Zone priority (higher = more important)
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
  },
  // Alert settings specific to this zone
  alertSettings: {
    enabled: {
      type: Boolean,
      default: true,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    // Minimum confidence to trigger alert in this zone
    minConfidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
zoneSchema.index({ user: 1, cameraId: 1 });
zoneSchema.index({ isActive: 1 });

// Static method to check if a point is inside a polygon (ray casting algorithm)
zoneSchema.statics.isPointInPolygon = function(point, polygon) {
  const { x, y } = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

// Static method to check if a bounding box intersects with a polygon
zoneSchema.statics.doesBoxIntersectZone = function(box, polygon) {
  // Convert box to normalized coordinates if needed
  const { x, y, width, height } = box;
  
  // Check if any corner of the box is inside the polygon
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  
  for (const corner of corners) {
    if (this.isPointInPolygon(corner, polygon)) {
      return true;
    }
  }
  
  // Check if center of box is inside polygon
  const center = { x: x + width / 2, y: y + height / 2 };
  if (this.isPointInPolygon(center, polygon)) {
    return true;
  }
  
  return false;
};

// Instance method to check if detection is in this zone
zoneSchema.methods.containsDetection = function(detection, videoWidth, videoHeight) {
  if (!detection.boundingBox) return false;
  
  // Normalize bounding box coordinates
  const normalizedBox = {
    x: detection.boundingBox.x / videoWidth,
    y: detection.boundingBox.y / videoHeight,
    width: detection.boundingBox.width / videoWidth,
    height: detection.boundingBox.height / videoHeight,
  };
  
  return this.constructor.doesBoxIntersectZone(normalizedBox, this.points);
};

module.exports = mongoose.model('Zone', zoneSchema);
