import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Alert,
  Divider,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Undo as UndoIcon,
  Palette as ColorIcon,
  Videocam as CameraIcon,
  VideocamOff as CameraOffIcon,
} from '@mui/icons-material';
import api from '../services/api';

const COLORS = [
  '#ff5722', // Orange
  '#f44336', // Red
  '#e91e63', // Pink
  '#9c27b0', // Purple
  '#673ab7', // Deep Purple
  '#3f51b5', // Indigo
  '#2196f3', // Blue
  '#00bcd4', // Cyan
  '#009688', // Teal
  '#4caf50', // Green
  '#8bc34a', // Light Green
  '#ffeb3b', // Yellow
];

const ZoneEditor = ({ 
  canvasWidth = 640, 
  canvasHeight = 480,
  cameraId = 'default',
  onZonesChange,
}) => {
  const [zones, setZones] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, zone: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showZones, setShowZones] = useState(true);
  const [colorAnchor, setColorAnchor] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#ff5722');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError('');
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCameraOn(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Failed to access camera. Check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Fetch zones from backend
  const fetchZones = useCallback(async () => {
    try {
      const response = await api.get(`/zones?cameraId=${cameraId}`);
      setZones(response.data.zones || []);
      if (onZonesChange) {
        onZonesChange(response.data.zones || []);
      }
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  }, [cameraId, onZonesChange]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Draw zones on canvas
  const drawZones = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showZones) return;

    // Draw existing zones
    zones.forEach((zone) => {
      if (!zone.isActive && selectedZone !== zone._id) return;

      ctx.beginPath();
      zone.points.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();

      // Fill with transparency
      ctx.fillStyle = `${zone.color}33`;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = selectedZone === zone._id ? 3 : 2;
      ctx.stroke();

      // Label
      if (zone.points.length > 0) {
        const labelX = zone.points[0].x * canvas.width;
        const labelY = zone.points[0].y * canvas.height - 10;
        ctx.font = '12px Arial';
        ctx.fillStyle = zone.color;
        ctx.fillText(zone.name, labelX, labelY);
      }
    });

    // Draw current points being added
    if (currentPoints.length > 0) {
      ctx.beginPath();
      currentPoints.forEach((point, index) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      if (currentPoints.length > 2) {
        ctx.closePath();
        ctx.fillStyle = `${selectedColor}33`;
        ctx.fill();
      }

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      currentPoints.forEach((point) => {
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = selectedColor;
        ctx.fill();
      });
    }
  }, [zones, currentPoints, showZones, selectedZone, selectedColor]);

  useEffect(() => {
    drawZones();
  }, [drawZones]);

  // Handle canvas click
  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setCurrentPoints([...currentPoints, { x, y }]);
  };

  // Handle right-click to complete zone
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isDrawing && currentPoints.length >= 3) {
      completeZone();
    }
  };

  // Start drawing mode
  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
  };

  // Cancel drawing
  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // Undo last point
  const undoPoint = () => {
    setCurrentPoints(currentPoints.slice(0, -1));
  };

  // Complete zone and save
  const completeZone = () => {
    if (currentPoints.length < 3) {
      setError('At least 3 points required');
      return;
    }

    setEditDialog({
      open: true,
      zone: {
        name: `Zone ${zones.length + 1}`,
        description: '',
        points: currentPoints,
        color: selectedColor,
        priority: 1,
        cameraId,
        alertSettings: {
          enabled: true,
          minConfidence: 0.5,
          soundEnabled: true,
          pushEnabled: true,
        },
      },
    });

    setIsDrawing(false);
  };

  // Save zone to backend
  const saveZone = async () => {
    try {
      const { zone } = editDialog;
      if (zone._id) {
        // Update existing
        await api.put(`/zones/${zone._id}`, zone);
      } else {
        // Create new
        await api.post('/zones', zone);
      }
      setEditDialog({ open: false, zone: null });
      setCurrentPoints([]);
      fetchZones();
    } catch (err) {
      console.error('Error saving zone:', err);
      setError('Failed to save zone');
    }
  };

  // Delete zone
  const deleteZone = async (zoneId) => {
    if (!window.confirm('Delete this zone?')) return;
    try {
      await api.delete(`/zones/${zoneId}`);
      fetchZones();
    } catch (err) {
      console.error('Error deleting zone:', err);
    }
  };

  // Toggle zone active status
  const toggleZone = async (zoneId) => {
    try {
      await api.patch(`/zones/${zoneId}/toggle`);
      fetchZones();
    } catch (err) {
      console.error('Error toggling zone:', err);
    }
  };

  // Edit existing zone
  const editZone = (zone) => {
    setEditDialog({ open: true, zone: { ...zone } });
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {cameraError && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setCameraError('')}>
          {cameraError}
        </Alert>
      )}

      {/* Video + Canvas Container */}
      <Paper ref={containerRef} sx={{ bgcolor: '#0d0d1a', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Box sx={{ position: 'relative', width: '100%' }}>
          {/* Video Element (hidden when camera off) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              aspectRatio: `${canvasWidth} / ${canvasHeight}`,
              objectFit: 'cover',
              backgroundColor: '#000',
              display: isCameraOn ? 'block' : 'none',
            }}
          />
          
          {/* Placeholder when camera is off */}
          {!isCameraOn && (
            <Box
              sx={{
                width: '100%',
                aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <CameraOffIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Camera Off</Typography>
              <Typography variant="caption">Click "Start Camera" to preview</Typography>
            </Box>
          )}
          
          {/* Canvas Overlay - always on top */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            onContextMenu={handleContextMenu}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: isDrawing ? 'crosshair' : 'default',
            }}
          />
        </Box>
      </Paper>

      {/* Controls Panel */}
      <Paper sx={{ p: 2, bgcolor: '#1a1a2e' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Detection Zones</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Camera Toggle */}
            <Button
              variant={isCameraOn ? 'outlined' : 'contained'}
              color={isCameraOn ? 'error' : 'primary'}
              startIcon={isCameraOn ? <CameraOffIcon /> : <CameraIcon />}
              onClick={isCameraOn ? stopCamera : startCamera}
              size="small"
            >
              {isCameraOn ? 'Stop' : 'Camera'}
            </Button>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  size="small"
                />
              }
              label="Show"
            />
            {!isDrawing ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={startDrawing}
                size="small"
              >
                New Zone
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={(e) => setColorAnchor(e.currentTarget)}
                  sx={{ color: selectedColor }}
                >
                  <ColorIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={undoPoint}
                  disabled={currentPoints.length === 0}
                  size="small"
                >
                  Undo
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={completeZone}
                  disabled={currentPoints.length < 3}
                  size="small"
                >
                  Save ({currentPoints.length} pts)
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={cancelDrawing}
                  size="small"
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {isDrawing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Click on the canvas above to add points. Right-click or click "Save" when done (minimum 3 points).
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Zone List */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {zones.length} zone{zones.length !== 1 ? 's' : ''} configured
        </Typography>
        
        {zones.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No zones configured. Click "New Zone" to create one.
          </Typography>
        ) : (
          <List dense>
            {zones.map((zone) => (
              <ListItem
                key={zone._id}
                button
                selected={selectedZone === zone._id}
                onClick={() => setSelectedZone(selectedZone === zone._id ? null : zone._id)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: selectedZone === zone._id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: `4px solid ${zone.color}`,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {zone.name}
                      <Chip
                        size="small"
                        label={`P${zone.priority}`}
                        sx={{ 
                          height: 18, 
                          fontSize: 10,
                          bgcolor: zone.color,
                          color: '#fff',
                        }}
                      />
                      {!zone.isActive && (
                        <Chip size="small" label="Inactive" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                      )}
                    </Box>
                  }
                  secondary={`${zone.points.length} points • Min ${Math.round(zone.alertSettings.minConfidence * 100)}% conf`}
                />
                <ListItemSecondaryAction>
                  <Tooltip title={zone.isActive ? 'Disable' : 'Enable'}>
                    <IconButton size="small" onClick={() => toggleZone(zone._id)}>
                      {zone.isActive ? <VisibleIcon fontSize="small" /> : <HiddenIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => editZone(zone)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => deleteZone(zone._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Color Picker Menu */}
      <Menu
        anchorEl={colorAnchor}
        open={Boolean(colorAnchor)}
        onClose={() => setColorAnchor(null)}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', width: 200 }}>
          {COLORS.map((color) => (
            <IconButton
              key={color}
              onClick={() => {
                setSelectedColor(color);
                setColorAnchor(null);
              }}
              sx={{
                width: 40,
                height: 40,
                m: 0.5,
                bgcolor: color,
                border: selectedColor === color ? '2px solid white' : 'none',
                '&:hover': { bgcolor: color, opacity: 0.8 },
              }}
            />
          ))}
        </Box>
      </Menu>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, zone: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editDialog.zone?._id ? 'Edit Zone' : 'Create New Zone'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Zone Name"
            value={editDialog.zone?.name || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              zone: { ...editDialog.zone, name: e.target.value }
            })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={editDialog.zone?.description || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              zone: { ...editDialog.zone, description: e.target.value }
            })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          
          <Typography gutterBottom>Priority (1-5)</Typography>
          <Slider
            value={editDialog.zone?.priority || 1}
            onChange={(e, value) => setEditDialog({
              ...editDialog,
              zone: { ...editDialog.zone, priority: value }
            })}
            min={1}
            max={5}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          
          <Typography gutterBottom>Minimum Confidence</Typography>
          <Slider
            value={(editDialog.zone?.alertSettings?.minConfidence || 0.5) * 100}
            onChange={(e, value) => setEditDialog({
              ...editDialog,
              zone: {
                ...editDialog.zone,
                alertSettings: {
                  ...editDialog.zone?.alertSettings,
                  minConfidence: value / 100
                }
              }
            })}
            min={10}
            max={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
            sx={{ mb: 2 }}
          />
          
          <Typography gutterBottom>Zone Color</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {COLORS.map((color) => (
              <IconButton
                key={color}
                onClick={() => setEditDialog({
                  ...editDialog,
                  zone: { ...editDialog.zone, color }
                })}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: color,
                  border: editDialog.zone?.color === color ? '2px solid white' : 'none',
                  '&:hover': { bgcolor: color, opacity: 0.8 },
                }}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Alert Settings</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.zone?.alertSettings?.enabled ?? true}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  zone: {
                    ...editDialog.zone,
                    alertSettings: {
                      ...editDialog.zone?.alertSettings,
                      enabled: e.target.checked
                    }
                  }
                })}
              />
            }
            label="Alerts Enabled"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.zone?.alertSettings?.soundEnabled ?? true}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  zone: {
                    ...editDialog.zone,
                    alertSettings: {
                      ...editDialog.zone?.alertSettings,
                      soundEnabled: e.target.checked
                    }
                  }
                })}
              />
            }
            label="Sound Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.zone?.alertSettings?.pushEnabled ?? true}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  zone: {
                    ...editDialog.zone,
                    alertSettings: {
                      ...editDialog.zone?.alertSettings,
                      pushEnabled: e.target.checked
                    }
                  }
                })}
              />
            }
            label="Push Notifications"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, zone: null })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveZone}>
            Save Zone
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ZoneEditor;
