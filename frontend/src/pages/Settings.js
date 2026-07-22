import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, Switch, FormControlLabel,
  Button, Slider, Alert, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, ImageList, ImageListItem, ImageListItemBar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tooltip,
} from '@mui/material';
import {
  Email as EmailIcon, VolumeUp as SoundIcon, Camera as CameraIcon,
  Settings as SettingsIcon, Save as SaveIcon, Send as SendIcon,
  Check as CheckIcon, Warning as WarningIcon, Delete as DeleteIcon,
  Collections as SnapshotsIcon, Refresh as RefreshIcon, Download as DownloadIcon,
  Notifications as NotificationsIcon, NotificationsActive as NotificationsActiveIcon,
  Security as SecurityIcon, Close as CloseIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { format } from 'date-fns';
import notificationService from '../services/notificationService';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const audioContextRef = useRef(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const showMessage = (msg, type = 'success') => {
    setGlobalMessage({ text: msg, type });
    setTimeout(() => setGlobalMessage(null), 3000);
  };

  const playTestSound = (type = 'alarm', volume = 100) => {
    try {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const vol = volume / 100;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(vol * 0.5, ctx.currentTime);

      if (type === 'alarm') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'square'; osc2.type = 'square';
        osc1.frequency.setValueAtTime(800, ctx.currentTime);
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc1.connect(gainNode); osc2.connect(gainNode);
        osc1.start(); osc2.start();
        
        let isHigh = true;
        const toggle = setInterval(() => {
          osc1.frequency.setValueAtTime(isHigh ? 600 : 800, ctx.currentTime);
          isHigh = !isHigh;
        }, 200);
        
        setTimeout(() => { clearInterval(toggle); osc1.stop(); osc2.stop(); }, 1000);
      } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.connect(gainNode); osc.start();
        setTimeout(() => osc.stop(), 500);
      } else if (type === 'siren') {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1);
        osc.connect(gainNode); osc.start();
        setTimeout(() => osc.stop(), 1000);
      }
      showMessage('Sound test completed', 'success');
    } catch (err) {
      showMessage('Failed to play sound. Interaction required.', 'warning');
    }
  };

  useEffect(() => {
    fetchSettings();
    checkEmailStatus();
    fetchSnapshots();
    checkPushPermission();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const checkPushPermission = () => {
    const permission = notificationService.getPermissionStatus();
    setPushPermission(permission);
    setPushEnabled(permission === 'granted');
  };

  const requestPushPermission = async () => {
    const permission = await notificationService.requestPermission();
    setPushPermission(permission);
    setPushEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      showMessage('Push notifications enabled!', 'success');
      updateSettings('pushNotifications', 'enabled', true);
    } else if (permission === 'denied') {
      showMessage('Push notifications blocked in browser settings.', 'warning');
    }
  };

  const testPushNotification = async () => {
    if (!pushEnabled) return showMessage('Enable push notifications first', 'warning');
    const sent = await notificationService.showNotification('🔔 Test Notification', {
      body: 'FireWatch AI push notifications are working correctly!',
      tag: 'test-notification'
    });
    if (sent) showMessage('Test notification sent!', 'success');
    else showMessage('Failed to send notification', 'error');
  };

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const response = await api.get('/detection/snapshots');
      setSnapshots(response.data.snapshots || []);
    } catch {
      // error handled silently
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const deleteSnapshot = async (filename) => {
    try {
      await api.delete(`/detection/snapshots/${filename}`);
      showMessage('Snapshot deleted', 'success');
      fetchSnapshots();
      setSelectedSnapshot(null);
    } catch {
      showMessage('Failed to delete snapshot', 'error');
    }
  };

  const deleteAllSnapshots = async () => {
    try {
      await api.delete('/detection/snapshots');
      showMessage('All snapshots deleted', 'success');
      setDeleteDialogOpen(false);
      fetchSnapshots();
    } catch {
      showMessage('Failed to delete snapshots', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/alerts/settings');
      setSettings(response.data || {});
    } catch {
      showMessage('Failed to load settings', 'error');
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  const checkEmailStatus = async () => {
    try {
      const response = await api.get('/alerts/email-status');
      setEmailStatus(response.data);
    } catch {}
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/alerts/settings', settings);
      showMessage('Settings saved successfully', 'success');
    } catch {
      showMessage('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!settings.emailAlerts?.email) return showMessage('Please enter an email address', 'warning');
    setTestingEmail(true);
    try {
      const response = await api.post('/alerts/test-email', { email: settings.emailAlerts.email });
      if (response.data.success) showMessage('Test email sent successfully', 'success');
      else showMessage(response.data.error || 'Failed to send test email', 'error');
    } catch {
      showMessage('Failed to send test email', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const triggerTestAlert = async () => {
    try {
      const response = await api.post('/alerts/trigger-test-alert');
      if (response.data.success) showMessage('Test fire alert triggered', 'success');
      else showMessage(response.data.error || 'Failed to send alert', 'error');
    } catch {
      showMessage('Failed to send test alert', 'error');
    }
  };

  const updateSettings = (section, field, value) => {
    setSettings(prev => ({
      ...(prev || {}),
      [section]: { ...((prev || {})[section] || {}), [field]: value }
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#ff4500' }} />
      </Box>
    );
  }

  const SectionHeader = ({ icon: Icon, title, status, color = '#ff4500' }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        background: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.12)`,
        border: `1px solid rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.25)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
      }}>
        <Icon sx={{ color, fontSize: 20 }} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#f0f0ff' }}>
        {title}
      </Typography>
      {status && (
        <Box sx={{ ml: 'auto' }}>{status}</Box>
      )}
    </Box>
  );

  return (
    <Box className="page-enter" sx={{ position: 'relative' }}>
      {/* Global Message Overlay */}
      {globalMessage && (
        <Alert
          severity={globalMessage.type}
          sx={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 300,
          }}
        >
          {globalMessage.text}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5,
            background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            display: 'flex', alignItems: 'center', gap: 1.5
          }}>
            <SettingsIcon sx={{ color: '#ff4500' }} />
            System Settings
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Configure alerts, notification preferences, and system behavior
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
          onClick={saveSettings} disabled={saving}
          sx={{ height: 40, borderRadius: '12px', px: 3 }}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Email Alerts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #29b6f6, #0288d1, transparent)' }} />
            <CardContent sx={{ flex: 1, p: 3 }}>
              <SectionHeader
                icon={EmailIcon} title="Email Alerts" color="#29b6f6"
                status={
                  <Chip
                    label={emailStatus?.configured ? "Configured" : "Not Configured"}
                    size="small"
                    sx={{
                      bgcolor: emailStatus?.configured ? 'rgba(0,230,118,0.1)' : 'rgba(255,167,38,0.1)',
                      color: emailStatus?.configured ? '#00e676' : '#ffa726',
                      fontWeight: 700, fontSize: '0.7rem', border: '1px solid transparent',
                      borderColor: emailStatus?.configured ? 'rgba(0,230,118,0.3)' : 'rgba(255,167,38,0.3)'
                    }}
                  />
                }
              />

              <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', mb: 2.5 }}>
                <FormControlLabel
                  control={<Switch checked={settings?.emailAlerts?.enabled || false} onChange={(e) => updateSettings('emailAlerts', 'enabled', e.target.checked)} />}
                  label={<Typography sx={{ fontWeight: 600 }}>Enable Email Alerts</Typography>}
                />
                
                <Box sx={{ mt: 2, opacity: settings?.emailAlerts?.enabled ? 1 : 0.5, pointerEvents: settings?.emailAlerts?.enabled ? 'auto' : 'none' }}>
                  <TextField fullWidth label="Recipient Email Address" size="small"
                    value={settings?.emailAlerts?.email || ''} onChange={(e) => updateSettings('emailAlerts', 'email', e.target.value)}
                    placeholder="admin@example.com" sx={{ mb: 2.5 }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    <FormControlLabel
                      control={<Switch size="small" checked={settings?.emailAlerts?.onFireDetected || false} onChange={(e) => updateSettings('emailAlerts', 'onFireDetected', e.target.checked)} />}
                      label={<Typography variant="body2" sx={{ color: '#d0d0e8' }}>Alert on any fire detection</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch size="small" checked={settings?.emailAlerts?.onCriticalAlert || false} onChange={(e) => updateSettings('emailAlerts', 'onCriticalAlert', e.target.checked)} />}
                      label={<Typography variant="body2" sx={{ color: '#d0d0e8' }}>Alert on critical fires only</Typography>}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <span>Cooldown Period</span>
                    <span style={{ color: '#29b6f6' }}>{settings?.emailAlerts?.cooldownMinutes || 5} minutes</span>
                  </Typography>
                  <Slider
                    value={settings?.emailAlerts?.cooldownMinutes || 5}
                    onChange={(_, val) => updateSettings('emailAlerts', 'cooldownMinutes', val)}
                    min={1} max={60} marks={[{value:1,label:'1m'}, {value:30,label:'30m'}, {value:60,label:'60m'}]}
                    sx={{ color: '#29b6f6', '& .MuiSlider-thumb': { boxShadow: '0 0 0 8px rgba(41,182,246,0.1)' } }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button variant="outlined" onClick={sendTestEmail} disabled={!settings?.emailAlerts?.email || testingEmail}
                  startIcon={testingEmail ? <CircularProgress size={14} /> : <SendIcon />}
                  sx={{ borderRadius: '8px', flex: 1, color: '#29b6f6', borderColor: 'rgba(41,182,246,0.4)', '&:hover': { borderColor: '#29b6f6', bgcolor: 'rgba(41,182,246,0.1)' } }}>
                  Test Email
                </Button>
                <Button variant="outlined" color="warning" onClick={triggerTestAlert} disabled={!settings?.emailAlerts?.enabled || !settings?.emailAlerts?.email}
                  sx={{ borderRadius: '8px', flex: 1 }}>
                  Test Alert
                </Button>
              </Box>
              
              {!emailStatus?.configured && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
                  SMTP not configured in backend <code>.env</code> file.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Browser Notifications & Sound */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            
            {/* Push Notifications */}
            <Card sx={{ flex: 1 }}>
              <Box sx={{ height: 3, background: 'linear-gradient(90deg, #ff9800, #ff5722, transparent)' }} />
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={NotificationsIcon} title="Browser Notifications" color="#ff9800"
                  status={
                    <Chip
                      label={pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked' : 'Not Set'}
                      size="small"
                      sx={{
                        bgcolor: pushPermission === 'granted' ? 'rgba(0,230,118,0.1)' : pushPermission === 'denied' ? 'rgba(255,23,68,0.1)' : 'rgba(255,167,38,0.1)',
                        color: pushPermission === 'granted' ? '#00e676' : pushPermission === 'denied' ? '#ff1744' : '#ffa726',
                        fontWeight: 700, fontSize: '0.7rem', border: '1px solid transparent',
                      }}
                    />
                  }
                />
                
                {pushPermission === 'granted' ? (
                  <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FormControlLabel
                      control={<Switch checked={settings?.pushNotifications?.enabled !== false} onChange={(e) => updateSettings('pushNotifications', 'enabled', e.target.checked)} />}
                      label={<Typography sx={{ fontWeight: 600 }}>Enable Push Notifications</Typography>}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, ml: 1, opacity: settings?.pushNotifications?.enabled !== false ? 1 : 0.5 }}>
                      <FormControlLabel
                        control={<Switch size="small" checked={settings?.pushNotifications?.criticalOnly || false} onChange={(e) => updateSettings('pushNotifications', 'criticalOnly', e.target.checked)} />}
                        label={<Typography variant="body2" sx={{ color: '#d0d0e8' }}>Critical alerts only</Typography>}
                      />
                    </Box>
                    <Button variant="outlined" onClick={testPushNotification} size="small" sx={{ mt: 2.5, borderRadius: '8px', color: '#ff9800', borderColor: 'rgba(255,152,0,0.4)' }}>
                      Send Test Notification
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3, px: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <NotificationsActiveIcon sx={{ fontSize: 32, color: '#6060a0', mb: 1.5 }} />
                    <Typography variant="body2" sx={{ color: '#a0a0c8', mb: 2 }}>
                      Get notified of fire alerts even when the browser is minimized or in the background.
                    </Typography>
                    <Button variant="contained" onClick={requestPushPermission} sx={{ borderRadius: '8px', bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}>
                      Enable Browser Notifications
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Sound Alerts */}
            <Card sx={{ flex: 1 }}>
              <Box sx={{ height: 3, background: 'linear-gradient(90deg, #e91e63, #f48fb1, transparent)' }} />
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={SoundIcon} title="Sound Alerts" color="#e91e63" />
                
                <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <FormControlLabel
                    control={<Switch checked={settings?.soundAlerts?.enabled || false} onChange={(e) => updateSettings('soundAlerts', 'enabled', e.target.checked)} />}
                    label={<Typography sx={{ fontWeight: 600 }}>Play Sound on Alert</Typography>}
                  />
                  
                  <Box sx={{ mt: 2.5, opacity: settings?.soundAlerts?.enabled ? 1 : 0.5, pointerEvents: settings?.soundAlerts?.enabled ? 'auto' : 'none' }}>
                    <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                      <InputLabel>Sound Type</InputLabel>
                      <Select
                        value={settings?.soundAlerts?.soundType || 'alarm'} label="Sound Type"
                        onChange={(e) => updateSettings('soundAlerts', 'soundType', e.target.value)}
                      >
                        <MenuItem value="alarm">🔔 Classic Alarm</MenuItem>
                        <MenuItem value="siren">🚨 Siren Sweep</MenuItem>
                        <MenuItem value="beep">📢 Short Beep</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <span>Volume Level</span>
                      <span style={{ color: '#e91e63' }}>{settings?.soundAlerts?.volume || 100}%</span>
                    </Typography>
                    <Slider
                      value={settings?.soundAlerts?.volume || 100}
                      onChange={(_, val) => updateSettings('soundAlerts', 'volume', val)}
                      sx={{ color: '#e91e63', '& .MuiSlider-thumb': { boxShadow: '0 0 0 8px rgba(233,30,99,0.1)' } }}
                    />
                    
                    <Button variant="outlined" onClick={() => playTestSound(settings?.soundAlerts?.soundType, settings?.soundAlerts?.volume)}
                      size="small" sx={{ mt: 2, borderRadius: '8px', color: '#e91e63', borderColor: 'rgba(233,30,99,0.4)' }}>
                      Test Sound Volume
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          </Box>
        </Grid>

        {/* System & Detection Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #9c27b0, #ba68c8, transparent)' }} />
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={SecurityIcon} title="Detection Engine" color="#9c27b0" />
              
              <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <FormControlLabel
                  control={<Switch checked={settings?.detection?.autoDetect !== false} onChange={(e) => updateSettings('detection', 'autoDetect', e.target.checked)} />}
                  label={<Typography sx={{ fontWeight: 600 }}>Auto-detect on Camera Start</Typography>}
                  sx={{ mb: 3 }}
                />

                <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <span>Confidence Threshold</span>
                  <span style={{ color: '#9c27b0' }}>{((settings?.detection?.confidenceThreshold || 0.5) * 100).toFixed(0)}%</span>
                </Typography>
                <Slider
                  value={(settings?.detection?.confidenceThreshold || 0.5) * 100}
                  onChange={(_, val) => updateSettings('detection', 'confidenceThreshold', val / 100)}
                  min={20} max={95} marks={[{value:20,label:'20%'}, {value:50,label:'50%'}, {value:80,label:'80%'}]}
                  sx={{ mb: 3, color: '#9c27b0', '& .MuiSlider-thumb': { boxShadow: '0 0 0 8px rgba(156,39,176,0.1)' } }}
                />

                <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <span>Analysis Interval (ms)</span>
                  <span style={{ color: '#9c27b0' }}>{settings?.detection?.detectionInterval || 1000}ms</span>
                </Typography>
                <Slider
                  value={settings?.detection?.detectionInterval || 1000}
                  onChange={(_, val) => updateSettings('detection', 'detectionInterval', val)}
                  min={500} max={5000} step={500} marks={[{value:500,label:'0.5s'}, {value:2000,label:'2s'}, {value:5000,label:'5s'}]}
                  sx={{ color: '#9c27b0', '& .MuiSlider-thumb': { boxShadow: '0 0 0 8px rgba(156,39,176,0.1)' } }}
                />
                <Typography variant="caption" sx={{ color: '#6060a0', display: 'block', mt: 1, lineHeight: 1.4 }}>
                  Lower intervals detect faster but use more CPU/GPU. 1000-2000ms is recommended for most hardware.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Auto Snapshots */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={CameraIcon} title="Auto Snapshots" color="#ff4500" />
              
              <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <FormControlLabel
                  control={<Switch checked={settings?.autoSnapshot?.enabled || false} onChange={(e) => updateSettings('autoSnapshot', 'enabled', e.target.checked)} />}
                  label={<Typography sx={{ fontWeight: 600 }}>Enable Auto Snapshots</Typography>}
                />
                
                <Box sx={{ mt: 2, opacity: settings?.autoSnapshot?.enabled ? 1 : 0.5, pointerEvents: settings?.autoSnapshot?.enabled ? 'auto' : 'none' }}>
                  <FormControlLabel
                    control={<Switch size="small" checked={settings?.autoSnapshot?.saveOnFireDetected || false} onChange={(e) => updateSettings('autoSnapshot', 'saveOnFireDetected', e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ color: '#d0d0e8' }}>Save image automatically when fire detected</Typography>}
                    sx={{ mb: 3 }}
                  />

                  <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <span>Max Snapshots to Keep</span>
                    <span style={{ color: '#ff4500' }}>{settings?.autoSnapshot?.maxSnapshots || 100}</span>
                  </Typography>
                  <Slider
                    value={settings?.autoSnapshot?.maxSnapshots || 100}
                    onChange={(_, val) => updateSettings('autoSnapshot', 'maxSnapshots', val)}
                    min={10} max={500} step={10} marks={[{value:10,label:'10'}, {value:250,label:'250'}, {value:500,label:'500'}]}
                  />
                  <Typography variant="caption" sx={{ color: '#6060a0', display: 'block', mt: 1 }}>
                    Older snapshots will be deleted automatically to save disk space.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Snapshot Gallery */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #4caf50, #8bc34a, transparent)' }} />
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <SectionHeader icon={SnapshotsIcon} title="Fire Snapshots Gallery" color="#4caf50" 
                  status={<Chip label={`${snapshots.length} saved`} size="small" sx={{ bgcolor: 'rgba(76,175,80,0.1)', color: '#4caf50', fontWeight: 700 }} />}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button startIcon={<RefreshIcon />} onClick={fetchSnapshots} disabled={loadingSnapshots} size="small" sx={{ color: '#a0a0c8' }}>
                    Refresh
                  </Button>
                  {snapshots.length > 0 && (
                    <Button color="error" size="small" variant="outlined" onClick={() => setDeleteDialogOpen(true)} sx={{ borderRadius: '8px' }}>
                      Delete All
                    </Button>
                  )}
                </Box>
              </Box>

              {loadingSnapshots ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: '#4caf50' }} />
                </Box>
              ) : snapshots.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <CameraIcon sx={{ fontSize: 48, color: '#6060a0', opacity: 0.5, mb: 2 }} />
                  <Typography sx={{ color: '#a0a0c8', fontWeight: 500 }}>No fire snapshots saved yet.</Typography>
                  <Typography variant="body2" sx={{ color: '#6060a0', mt: 1 }}>Enable Auto Snapshot above to automatically save images.</Typography>
                </Box>
              ) : (
                <ImageList cols={4} gap={16} sx={{ maxHeight: 500, overflow: 'auto', pr: 1, m: 0 }}>
                  {snapshots.map((snapshot) => (
                    <ImageListItem key={snapshot.filename} sx={{
                      cursor: 'pointer', borderRadius: '12px', overflow: 'hidden',
                      border: '2px solid transparent', transition: 'all 0.2s',
                      '&:hover': { borderColor: '#4caf50', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(76,175,80,0.2)' }
                    }} onClick={() => setSelectedSnapshot(snapshot)}>
                      <img
                        src={`${api.defaults.baseURL}${snapshot.path}`}
                        alt={snapshot.filename} loading="lazy"
                        style={{ height: 160, objectFit: 'cover' }}
                      />
                      <ImageListItemBar
                        title={format(new Date(snapshot.createdAt), 'MMM d, HH:mm:ss')}
                        subtitle={`${(snapshot.size / 1024).toFixed(1)} KB`}
                        sx={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)' }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snapshot Preview Dialog */}
      <Dialog open={!!selectedSnapshot} onClose={() => setSelectedSnapshot(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: '#0a0a1a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {selectedSnapshot && format(new Date(selectedSnapshot.createdAt), 'MMMM d, yyyy - HH:mm:ss')}
          </Typography>
          <IconButton size="small" onClick={() => setSelectedSnapshot(null)} sx={{ color: '#8080a8' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', justifyContent: 'center' }}>
          {selectedSnapshot && (
            <img
              src={`${api.defaults.baseURL}${selectedSnapshot.path}`}
              alt={selectedSnapshot.filename}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Button color="error" onClick={() => { deleteSnapshot(selectedSnapshot.filename); }} startIcon={<DeleteIcon />}>
            Delete
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setSelectedSnapshot(null)}>Close</Button>
          <Button variant="contained" color="primary"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `${api.defaults.baseURL}${selectedSnapshot.path}`;
              link.download = selectedSnapshot.filename;
              link.click();
            }}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete All Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', background: 'rgba(20,20,35,0.95)' } }}>
        <DialogTitle sx={{ color: '#ff1744', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Delete All Snapshots?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#d0d0e8' }}>
            Are you sure you want to delete all {snapshots.length} saved fire snapshots? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#a0a0c8' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={deleteAllSnapshots}>Delete All</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
