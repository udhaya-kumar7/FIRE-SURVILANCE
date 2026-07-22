import React, { useState, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, IconButton,
  Tooltip, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemIcon, Badge,
} from '@mui/material';
import {
  GridView as GridIcon, Add as AddIcon, LocalFireDepartment as FireIcon,
  Videocam as CameraIcon, ViewModule as View2x2Icon, ViewStream as View1x2Icon,
  CropSquare as View1x1Icon, VolumeUp as SoundIcon, VolumeOff as MuteIcon,
  Clear as ClearIcon, History as HistoryIcon, Close as CloseIcon,
  CheckCircle as SafeIcon,
} from '@mui/icons-material';
import CameraFeed from '../components/CameraFeed';
import notificationService from '../services/notificationService';
import { format } from 'date-fns';

const MultiCamera = () => {
  const [cameras, setCameras] = useState([{ id: 1, name: 'Camera 1' }, { id: 2, name: 'Camera 2' }]);
  const [layout, setLayout] = useState('2x2');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fireAlerts, setFireAlerts] = useState([]);
  const [alertHistoryOpen, setAlertHistoryOpen] = useState(false);
  
  const audioContextRef = useRef(null);
  const nextCameraId = useRef(3);

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }, [soundEnabled]);

  const handleFireDetected = useCallback((cameraId, cameraName, detection) => {
    const alert = {
      id: Date.now(), cameraId, cameraName, timestamp: new Date(),
      alertLevel: detection.alertLevel, confidence: detection.maxConfidence,
    };
    setFireAlerts(prev => [alert, ...prev.slice(0, 49)]);
    playAlarm();
    notificationService.showFireAlert({ ...detection, _id: `multi-${cameraId}-${Date.now()}` });
  }, [playAlarm]);

  const addCamera = () => {
    if (cameras.length >= 4) return;
    setCameras(prev => [...prev, { id: nextCameraId.current, name: `Camera ${nextCameraId.current}` }]);
    nextCameraId.current++;
  };

  const removeCamera = (cameraId) => setCameras(prev => prev.filter(c => c.id !== cameraId));

  const getGridCols = () => {
    switch (layout) { case '1x1': return 12; case '1x2': return 6; case '2x2': return 6; default: return 6; }
  };

  const getMaxCameras = () => {
    switch (layout) { case '1x1': return 1; case '1x2': return 2; case '2x2': return 4; default: return 4; }
  };

  const recentAlerts = fireAlerts.slice(0, 5);

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5,
            background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            display: 'flex', alignItems: 'center', gap: 1.5
          }}>
            <GridIcon sx={{ color: '#ff4500' }} />
            Multi-Camera Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Monitor up to 4 live camera feeds simultaneously
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Tooltip title="Alert History">
            <IconButton onClick={() => setAlertHistoryOpen(true)} sx={{
              bgcolor: fireAlerts.length > 0 ? 'rgba(255,69,0,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${fireAlerts.length > 0 ? 'rgba(255,69,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}>
              <Badge badgeContent={fireAlerts.length} color="error" variant="dot">
                <HistoryIcon sx={{ color: fireAlerts.length > 0 ? '#ff4500' : '#8080a8' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}>
            <IconButton onClick={() => setSoundEnabled(!soundEnabled)} sx={{
              bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {soundEnabled ? <SoundIcon sx={{ color: '#00e676' }} /> : <MuteIcon sx={{ color: '#8080a8' }} />}
            </IconButton>
          </Tooltip>

          <Box sx={{
            display: 'flex', p: 0.5, gap: 0.5,
            background: 'rgba(12,12,32,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
          }}>
            {[
              { id: '1x1', icon: View1x1Icon, tooltip: '1 Camera' },
              { id: '1x2', icon: View1x2Icon, tooltip: '2 Cameras' },
              { id: '2x2', icon: View2x2Icon, tooltip: '4 Cameras' },
            ].map(l => (
              <Tooltip key={l.id} title={l.tooltip}>
                <IconButton
                  onClick={() => setLayout(l.id)}
                  sx={{
                    bgcolor: layout === l.id ? 'rgba(255,69,0,0.15)' : 'transparent',
                    color: layout === l.id ? '#ff4500' : '#6060a0',
                    borderRadius: '8px', padding: '6px',
                    '&:hover': { bgcolor: layout === l.id ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <l.icon fontSize="small" />
                </IconButton>
              </Tooltip>
            ))}
          </Box>

          <Button
            variant="contained" startIcon={<AddIcon />} onClick={addCamera}
            disabled={cameras.length >= getMaxCameras()}
            sx={{ height: 40, borderRadius: '12px', px: 2.5 }}
          >
            Add Camera
          </Button>
        </Box>
      </Box>

      {/* Recent Alerts Banner */}
      {recentAlerts.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '12px', background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.25)' }}
          action={
            <Button color="error" size="small" onClick={() => setFireAlerts([])} startIcon={<ClearIcon />}
              sx={{ fontWeight: 700, borderRadius: '8px' }}>
              Clear
            </Button>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#ff6b8a' }}>
              <span className="pulse-animation" style={{ display: 'inline-block', marginRight: '6px' }}>🔥</span>
              Recent Alerts:
            </Typography>
            {recentAlerts.map(alert => (
              <Chip key={alert.id} size="small" icon={<FireIcon sx={{ fontSize: '14px !important' }} />}
                label={`${alert.cameraName} · ${format(alert.timestamp, 'HH:mm:ss')}`}
                sx={{
                  bgcolor: 'rgba(255,23,68,0.15)', color: '#ff6b8a', fontWeight: 600, border: '1px solid rgba(255,23,68,0.3)',
                }}
              />
            ))}
          </Box>
        </Alert>
      )}

      {/* Camera Grid */}
      <Grid container spacing={2.5}>
        {cameras.slice(0, getMaxCameras()).map((camera) => (
          <Grid item xs={12} md={getGridCols()} key={camera.id}>
            <CameraFeed
              cameraId={camera.id} cameraName={camera.name} onFireDetected={handleFireDetected}
              onRemove={cameras.length > 1 ? removeCamera : undefined}
              fullWidth={layout === '1x1'} detectionInterval={2000}
            />
          </Grid>
        ))}

        {/* Add Camera Placeholder */}
        {cameras.length < getMaxCameras() && (
          <Grid item xs={12} md={getGridCols()}>
            <Card sx={{
              height: '100%', minHeight: layout === '1x1' ? 400 : 260,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(12,12,32,0.4)', cursor: 'pointer',
              transition: 'all 0.25s ease',
              '&:hover': { borderColor: '#ff4500', background: 'rgba(255,69,0,0.05)' },
            }} onClick={addCamera}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
                  background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AddIcon sx={{ fontSize: 28, color: '#6060a0' }} />
                </Box>
                <Typography sx={{ fontWeight: 600, color: '#8080a8' }}>Add Camera Stream</Typography>
              </Box>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Alert History Dialog */}
      <Dialog open={alertHistoryOpen} onClose={() => setAlertHistoryOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}>
        <Box sx={{ height: '3px', background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
        <DialogTitle sx={{ p: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(255,69,0,0.12)',
              border: '1px solid rgba(255,69,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HistoryIcon sx={{ fontSize: 18, color: '#ff4500' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>Fire Alert History</Typography>
          </Box>
          <IconButton size="small" onClick={() => setAlertHistoryOpen(false)} sx={{ color: '#6060a0' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {fireAlerts.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <SafeIcon sx={{ fontSize: 48, color: '#00e676', opacity: 0.5, mb: 2 }} />
              <Typography sx={{ color: '#6060a0', fontWeight: 500 }}>No fire alerts recorded in this session.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {fireAlerts.map((alert, i) => (
                <ListItem key={alert.id} divider={i < fireAlerts.length - 1} sx={{ px: 3, py: 2 }}>
                  <ListItemIcon>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,23,68,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,23,68,0.2)'
                    }}>
                      <FireIcon sx={{ color: '#ff1744', fontSize: 20 }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700, color: '#d0d0e8' }}>
                        {alert.cameraName}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#8080a8' }}>
                          {format(alert.timestamp, 'MMM d, yyyy · HH:mm:ss')}
                        </Typography>
                        <Chip size="small" label={alert.alertLevel}
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                            bgcolor: alert.alertLevel === 'critical' ? 'rgba(255,23,68,0.1)' : 'rgba(255,152,0,0.1)',
                            color: alert.alertLevel === 'critical' ? '#ff1744' : '#ff9800',
                            border: `1px solid ${alert.alertLevel === 'critical' ? 'rgba(255,23,68,0.3)' : 'rgba(255,152,0,0.3)'}`,
                          }}
                        />
                        <Chip size="small" label={`${(alert.confidence * 100).toFixed(0)}% CONF`}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.05)', color: '#a0a0c8' }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        {fireAlerts.length > 0 && (
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button color="error" onClick={() => setFireAlerts([])} sx={{ borderRadius: '8px', fontWeight: 600 }}>
              Clear All Alerts
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};

export default MultiCamera;
