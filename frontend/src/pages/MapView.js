import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Slider,
  Divider,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MyLocation as LocationIcon,
  Videocam as CameraIcon,
  CameraOutdoor as DomeIcon,
  ControlCamera as PtzIcon,
  Thermostat as ThermalIcon,
  Warning as WarningIcon,
  CheckCircle as OnlineIcon,
  Cancel as OfflineIcon,
  Map as MapIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom camera marker icons
const createCameraIcon = (color, status) => {
  const statusColor = status === 'online' ? '#4caf50' : status === 'error' ? '#f44336' : '#9e9e9e';
  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
      ">
        <div style="
          width: 36px;
          height: 36px;
          background: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid ${statusColor};
        ">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>
        ${status === 'online' ? `
          <div style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            background: #4caf50;
            border-radius: 50%;
            border: 2px solid white;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Component to handle map clicks for adding cameras
const MapClickHandler = ({ onMapClick, isAddingCamera }) => {
  useMapEvents({
    click: (e) => {
      if (isAddingCamera) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

// Component to center map on user location
const LocationButton = () => {
  const map = useMap();
  
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 10, marginRight: 10 }}>
      <div className="leaflet-control leaflet-bar">
        <Tooltip title="Go to my location">
          <IconButton
            onClick={handleLocate}
            sx={{
              bgcolor: 'white',
              '&:hover': { bgcolor: '#f5f5f5' },
              borderRadius: 1,
            }}
            size="small"
          >
            <LocationIcon />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

const MapView = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingCamera, setIsAddingCamera] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, camera: null });
  const [newCameraLocation, setNewCameraLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // Default: NYC

  // Fetch cameras
  const fetchCameras = useCallback(async () => {
    try {
      const response = await api.get('/cameras');
      setCameras(response.data.cameras || []);
      
      // Center map on first camera if available
      if (response.data.cameras?.length > 0) {
        const firstCam = response.data.cameras[0];
        setMapCenter([firstCam.location.latitude, firstCam.location.longitude]);
      }
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Failed to load cameras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Handle map click to add camera
  const handleMapClick = (latlng) => {
    if (isAddingCamera) {
      setNewCameraLocation(latlng);
      setEditDialog({
        open: true,
        camera: {
          name: 'New Camera',
          description: '',
          type: 'webcam',
          url: '',
          location: {
            latitude: latlng.lat,
            longitude: latlng.lng,
            address: '',
            floor: '',
            building: '',
          },
          settings: {
            detectionEnabled: true,
            sensitivity: 5,
            alertsEnabled: true,
          },
          icon: 'camera',
          color: '#2196f3',
        },
      });
      setIsAddingCamera(false);
    }
  };

  // Save camera
  const handleSaveCamera = async () => {
    try {
      const { camera } = editDialog;
      if (camera._id) {
        await api.put(`/cameras/${camera._id}`, camera);
      } else {
        await api.post('/cameras', camera);
      }
      setEditDialog({ open: false, camera: null });
      setNewCameraLocation(null);
      fetchCameras();
    } catch (err) {
      console.error('Error saving camera:', err);
      setError('Failed to save camera');
    }
  };

  // Delete camera
  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Delete this camera?')) return;
    try {
      await api.delete(`/cameras/${cameraId}`);
      fetchCameras();
    } catch (err) {
      console.error('Error deleting camera:', err);
      setError('Failed to delete camera');
    }
  };

  // Edit camera
  const handleEditCamera = (camera) => {
    setEditDialog({ open: true, camera: { ...camera } });
  };

  // Get icon component for camera type
  const getCameraIcon = (iconType) => {
    switch (iconType) {
      case 'dome': return <DomeIcon />;
      case 'ptz': return <PtzIcon />;
      case 'thermal': return <ThermalIcon />;
      default: return <CameraIcon />;
    }
  };

  const COLORS = [
    '#2196f3', '#f44336', '#4caf50', '#ff9800', 
    '#9c27b0', '#00bcd4', '#e91e63', '#8bc34a',
  ];

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Camera Map View
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage camera locations on the map
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCameras}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddingCamera(true)}
              color={isAddingCamera ? 'warning' : 'primary'}
            >
              {isAddingCamera ? 'Click on Map...' : 'Add Camera'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isAddingCamera && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Click on the map to place a new camera. Press ESC or click "Add Camera" again to cancel.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Map */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: 600 }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler 
                onMapClick={handleMapClick} 
                isAddingCamera={isAddingCamera} 
              />
              
              <LocationButton />

              {/* Camera markers */}
              {cameras.map((camera) => (
                <Marker
                  key={camera._id}
                  position={[camera.location.latitude, camera.location.longitude]}
                  icon={createCameraIcon(camera.color, camera.status)}
                >
                  <Popup>
                    <Box sx={{ minWidth: 200, p: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {camera.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={camera.status}
                        color={camera.status === 'online' ? 'success' : 'default'}
                        sx={{ mb: 1 }}
                      />
                      {camera.location.address && (
                        <Typography variant="body2" color="text.secondary">
                          {camera.location.address}
                        </Typography>
                      )}
                      {camera.location.building && (
                        <Typography variant="caption" display="block">
                          Building: {camera.location.building}
                        </Typography>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Detections: {camera.detectionCount || 0}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleEditCamera(camera)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCamera(camera._id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  </Popup>
                </Marker>
              ))}

              {/* Temporary marker for new camera */}
              {newCameraLocation && (
                <Marker position={[newCameraLocation.lat, newCameraLocation.lng]}>
                  <Popup>New Camera Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </Paper>
        </Grid>

        {/* Camera List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#1a1a2e', borderRadius: 2, maxHeight: 600, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Cameras ({cameras.length})
            </Typography>
            
            {cameras.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No cameras added yet. Click "Add Camera" and then click on the map to place one.
              </Typography>
            ) : (
              <List dense>
                {cameras.map((camera) => (
                  <ListItem
                    key={camera._id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderLeft: `4px solid ${camera.color}`,
                    }}
                  >
                    <Box sx={{ mr: 1, color: camera.color }}>
                      {getCameraIcon(camera.icon)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {camera.name}
                          {camera.status === 'online' ? (
                            <OnlineIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <OfflineIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          )}
                        </Box>
                      }
                      secondary={camera.location.address || `${camera.location.latitude.toFixed(4)}, ${camera.location.longitude.toFixed(4)}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditCamera(camera)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteCamera(camera._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Legend */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status Legend
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip icon={<OnlineIcon />} label="Online" size="small" color="success" />
              <Chip icon={<OfflineIcon />} label="Offline" size="small" />
              <Chip icon={<WarningIcon />} label="Error" size="small" color="error" />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit/Add Camera Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => {
          setEditDialog({ open: false, camera: null });
          setNewCameraLocation(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editDialog.camera?._id ? 'Edit Camera' : 'Add New Camera'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Camera Name"
            value={editDialog.camera?.name || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              camera: { ...editDialog.camera, name: e.target.value }
            })}
            sx={{ mt: 2, mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={editDialog.camera?.description || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              camera: { ...editDialog.camera, description: e.target.value }
            })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Camera Type</InputLabel>
                <Select
                  value={editDialog.camera?.type || 'webcam'}
                  label="Camera Type"
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    camera: { ...editDialog.camera, type: e.target.value }
                  })}
                >
                  <MenuItem value="webcam">Webcam</MenuItem>
                  <MenuItem value="ip">IP Camera</MenuItem>
                  <MenuItem value="rtsp">RTSP Stream</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={editDialog.camera?.icon || 'camera'}
                  label="Icon"
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    camera: { ...editDialog.camera, icon: e.target.value }
                  })}
                >
                  <MenuItem value="camera">Standard Camera</MenuItem>
                  <MenuItem value="dome">Dome Camera</MenuItem>
                  <MenuItem value="ptz">PTZ Camera</MenuItem>
                  <MenuItem value="thermal">Thermal Camera</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {(editDialog.camera?.type === 'ip' || editDialog.camera?.type === 'rtsp') && (
            <TextField
              fullWidth
              label="Camera URL"
              value={editDialog.camera?.url || ''}
              onChange={(e) => setEditDialog({
                ...editDialog,
                camera: { ...editDialog.camera, url: e.target.value }
              })}
              placeholder="http://192.168.1.100:8080/video or rtsp://..."
              sx={{ mt: 2 }}
            />
          )}

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>Location</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={editDialog.camera?.location?.latitude || ''}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    location: { ...editDialog.camera?.location, latitude: parseFloat(e.target.value) }
                  }
                })}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={editDialog.camera?.location?.longitude || ''}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    location: { ...editDialog.camera?.location, longitude: parseFloat(e.target.value) }
                  }
                })}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Address"
            value={editDialog.camera?.location?.address || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              camera: {
                ...editDialog.camera,
                location: { ...editDialog.camera?.location, address: e.target.value }
              }
            })}
            sx={{ mt: 2 }}
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Building"
                value={editDialog.camera?.location?.building || ''}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    location: { ...editDialog.camera?.location, building: e.target.value }
                  }
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Floor"
                value={editDialog.camera?.location?.floor || ''}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    location: { ...editDialog.camera?.location, floor: e.target.value }
                  }
                })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>Marker Color</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {COLORS.map((color) => (
              <IconButton
                key={color}
                onClick={() => setEditDialog({
                  ...editDialog,
                  camera: { ...editDialog.camera, color }
                })}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: color,
                  border: editDialog.camera?.color === color ? '3px solid white' : 'none',
                  '&:hover': { bgcolor: color, opacity: 0.8 },
                }}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>Settings</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.camera?.settings?.detectionEnabled ?? true}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    settings: { ...editDialog.camera?.settings, detectionEnabled: e.target.checked }
                  }
                })}
              />
            }
            label="Detection Enabled"
          />
          <FormControlLabel
            control={
              <Switch
                checked={editDialog.camera?.settings?.alertsEnabled ?? true}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  camera: {
                    ...editDialog.camera,
                    settings: { ...editDialog.camera?.settings, alertsEnabled: e.target.checked }
                  }
                })}
              />
            }
            label="Alerts Enabled"
          />

          <Typography gutterBottom sx={{ mt: 2 }}>
            Sensitivity: {editDialog.camera?.settings?.sensitivity || 5}
          </Typography>
          <Slider
            value={editDialog.camera?.settings?.sensitivity || 5}
            onChange={(e, value) => setEditDialog({
              ...editDialog,
              camera: {
                ...editDialog.camera,
                settings: { ...editDialog.camera?.settings, sensitivity: value }
              }
            })}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialog({ open: false, camera: null });
            setNewCameraLocation(null);
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveCamera}>
            {editDialog.camera?._id ? 'Save Changes' : 'Add Camera'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MapView;
