import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Videocam as CameraIcon,
  VideocamOff as CameraOffIcon,
  CloudUpload as UploadIcon,
  LocalFireDepartment as FireIcon,
  CheckCircle as SafeIcon,
  Warning as WarningIcon,
  Error as AlertIcon,
  Refresh as RefreshIcon,
  VolumeUp as SoundOnIcon,
  VolumeOff as SoundOffIcon,
  Wifi as IpCameraIcon,
  Computer as WebcamIcon,
  FiberManualRecord as RecordIcon,
  Stop as StopRecordIcon,
  CropFree as ZoneIcon,
  Visibility as ZoneVisibleIcon,
  VisibilityOff as ZoneHiddenIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import socketService from '../services/socket';
import notificationService from '../services/notificationService';
import { format } from 'date-fns';

const getAlertColor = (level) => {
  switch (level) {
    case 'critical':
      return '#f44336';
    case 'alert':
      return '#ff5722';
    case 'warning':
      return '#ff9800';
    default:
      return '#4caf50';
  }
};

const getAlertIcon = (level) => {
  switch (level) {
    case 'critical':
    case 'alert':
      return <AlertIcon sx={{ color: getAlertColor(level) }} />;
    case 'warning':
      return <WarningIcon sx={{ color: getAlertColor(level) }} />;
    default:
      return <SafeIcon sx={{ color: getAlertColor(level) }} />;
  }
};

const Detection = () => {
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);
  const [stats, setStats] = useState({ total: 0, fireDetections: 0 });
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [detectionInterval, setDetectionInterval] = useState(1000);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);
  const [alertSettings, setAlertSettings] = useState(null);
  const [alertVolume, setAlertVolume] = useState(100);
  const [soundType, setSoundType] = useState('alarm');
  
  // IP Camera state
  const [cameraMode, setCameraMode] = useState('webcam'); // 'webcam' or 'ip'
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const [ipCameraDialogOpen, setIpCameraDialogOpen] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef(null);
  const recordingFpsRef = useRef(1);
  const isRecordingRef = useRef(false);
  const recordingIdRef = useRef(null);

  // Zone state
  const [zones, setZones] = useState([]);
  const [showZones, setShowZones] = useState(true);
  const [zoneFilterEnabled, setZoneFilterEnabled] = useState(true);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const audioContextRef = useRef(null);
  const isStreamingRef = useRef(false);
  const alarmIntervalRef = useRef(null);
  const ipImageRef = useRef(null);

  // Fetch recent detections
  const fetchRecentDetections = async () => {
    try {
      const response = await api.get('/detection/logs?limit=10');
      setRecentDetections(response.data.logs);
    } catch (error) {
      console.error('Error fetching detections:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get('/detection/stats?period=24h');
      setStats(response.data.summary);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch alert settings
  const fetchAlertSettings = async () => {
    try {
      const response = await api.get('/alerts/settings');
      setAlertSettings(response.data);
      if (response.data.soundAlerts) {
        setSoundEnabled(response.data.soundAlerts.enabled);
        setAlertVolume(response.data.soundAlerts.volume || 100);
        setSoundType(response.data.soundAlerts.soundType || 'alarm');
      }
    } catch (error) {
      console.error('Error fetching alert settings:', error);
    }
  };

  // Initialize Web Audio API for alarm sounds
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Play alarm sound using Web Audio API
  const playAlarmTone = (type = 'alarm', duration = 500) => {
    try {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        console.log('Audio context suspended, attempting to resume...');
        ctx.resume().then(() => {
          console.log('Audio context resumed');
        });
      }

      const volume = alertVolume / 100;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
      
      console.log(`Playing ${type} sound at ${volume * 100}% volume`);

      if (type === 'alarm') {
      // Classic alarm - alternating frequencies
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc2.frequency.setValueAtTime(600, ctx.currentTime);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      
      osc1.start();
      osc2.start();
      
      // Alternate between frequencies
      const toggleFreq = () => {
        osc1.frequency.setValueAtTime(
          osc1.frequency.value === 800 ? 600 : 800, ctx.currentTime
        );
      };
      const toggle = setInterval(toggleFreq, 200);
      
      setTimeout(() => {
        clearInterval(toggle);
        osc1.stop();
        osc2.stop();
      }, duration);
    } else if (type === 'beep') {
      // Simple beep
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      setTimeout(() => osc.stop(), duration);
    } else if (type === 'siren') {
      // Siren - sweeping frequency
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1);
      osc.connect(gainNode);
      osc.start();
      setTimeout(() => osc.stop(), duration);
    }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  // Play continuous alarm for fire detection
  const playFireAlarm = () => {
    if (!soundEnabled) {
      console.log('Sound alerts disabled');
      return;
    }
    
    console.log('🔔 Playing fire alarm sound...');
    
    // Stop any existing alarm
    stopFireAlarm();
    
    // Play initial alarm
    playAlarmTone(soundType, 1000);
    
    // Continue alarm every 2 seconds
    alarmIntervalRef.current = setInterval(() => {
      if (soundEnabled) {
        playAlarmTone(soundType, 800);
      }
    }, 2000);
    
    // Auto-stop after 10 seconds to prevent annoyance
    setTimeout(() => {
      stopFireAlarm();
    }, 10000);
  };

  // Stop fire alarm
  const stopFireAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  // Initialize on mount
  useEffect(() => {
    fetchAlertSettings();
    return () => {
      stopFireAlarm();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Socket connection
  useEffect(() => {
    fetchRecentDetections();
    fetchStats();

    socketService.connect();
    socketService.joinDetectionRoom();

    socketService.onNewDetection((data) => {
      setCurrentDetection(data.detection);
      setRecentDetections((prev) => [data.detection, ...prev.slice(0, 9)]);
      if (data.detection.fireDetected) {
        setStats((prev) => ({
          ...prev,
          totalDetections: (prev.totalDetections || 0) + 1,
          fireDetections: (prev.fireDetections || 0) + 1,
        }));
      }
    });

    return () => {
      socketService.off('new-detection');
      stopCamera();
    };
  }, []);

  // Fetch zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await api.get('/zones?activeOnly=true');
        setZones(response.data.zones || []);
      } catch (err) {
        console.error('Error fetching zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Draw zones on overlay
  const drawZonesOnOverlay = useCallback((overlay, videoWidth, videoHeight) => {
    if (!showZones || zones.length === 0) return;
    
    const ctx = overlay.getContext('2d');
    
    zones.forEach((zone) => {
      const points = zone.points.map(p => ({
        x: p.x * videoWidth,
        y: p.y * videoHeight,
      }));

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();

      // Fill with transparency
      ctx.fillStyle = `${zone.color}15`;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw zone name
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      ctx.fillStyle = zone.color;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, centerX, centerY);
    });
  }, [zones, showZones]);

  // Check if detection is in any zone
  const isDetectionInZone = useCallback((detection, videoWidth, videoHeight) => {
    if (!zoneFilterEnabled || zones.length === 0) return { inZone: true, zone: null };
    
    const normalizedBox = {
      x: detection.boundingBox.x / videoWidth,
      y: detection.boundingBox.y / videoHeight,
      width: detection.boundingBox.width / videoWidth,
      height: detection.boundingBox.height / videoHeight,
    };

    // Check center point
    const centerX = normalizedBox.x + normalizedBox.width / 2;
    const centerY = normalizedBox.y + normalizedBox.height / 2;

    for (const zone of zones) {
      const points = zone.points;
      let inside = false;
      
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        
        const intersect = ((yi > centerY) !== (yj > centerY)) &&
          (centerX < (xj - xi) * (centerY - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
      }
      
      if (inside) {
        return { inZone: true, zone };
      }
    }
    
    return { inZone: false, zone: null };
  }, [zones, zoneFilterEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError('');
      
      // Initialize audio context on user interaction for sound alerts
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
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

      setIsStreaming(true);
      isStreamingRef.current = true;

      // Start detection loop if autoDetect is enabled
      if (autoDetect) {
        startDetectionLoop();
      }

    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Camera access denied. Please allow camera permissions.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : `Camera error: ${err.message}`
      );
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  };

  // Start IP Camera stream
  const startIpCamera = async () => {
    if (!ipCameraUrl) {
      setCameraError('Please enter an IP camera URL');
      return;
    }

    try {
      setCameraError('');
      
      // Initialize audio context on user interaction for sound alerts
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      setIsStreaming(true);
      isStreamingRef.current = true;

      // For MJPEG streams, we'll display directly in an img tag
      // For static image URLs (snapshot mode), we'll refresh periodically
      if (ipImageRef.current) {
        ipImageRef.current.src = ipCameraUrl + (ipCameraUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      }

      // Start detection loop
      if (autoDetect) {
        startIpDetectionLoop();
      }

      setIpCameraDialogOpen(false);
    } catch (err) {
      console.error('IP Camera error:', err);
      setCameraError(`Failed to connect to IP camera: ${err.message}`);
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  };

  // IP Camera detection loop
  const startIpDetectionLoop = () => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
    }

    detectionLoopRef.current = setInterval(() => {
      if (isStreamingRef.current) {
        captureIpCameraFrame();
      }
    }, detectionInterval);
  };

  // Capture frame from IP camera for detection
  const captureIpCameraFrame = async () => {
    if (!ipImageRef.current || !canvasRef.current) return;

    const img = ipImageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Refresh image for snapshot-style IP cameras
    const newUrl = ipCameraUrl + (ipCameraUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    
    // Create a temporary image to load the new frame
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    tempImg.onload = async () => {
      canvas.width = tempImg.width || 640;
      canvas.height = tempImg.height || 480;
      ctx.drawImage(tempImg, 0, 0);

      // Update the display image
      if (ipImageRef.current) {
        ipImageRef.current.src = tempImg.src;
      }

      // Send frame for detection
      const frameData = canvas.toDataURL('image/jpeg', 0.8);

      try {
          const response = await api.post('/detection/detect/frame', {
            frameData,
            cameraId: `ip-${Date.now()}`
          });

          const detection = response.data.detection;
          setCurrentDetection(detection);

          if (detection.fireDetected && detection.detections?.length > 0) {
            drawIpBoundingBoxes(detection.detections, canvas.width, canvas.height);
            playAlertSound();
            
            // Send push notification
            if (alertSettings?.pushNotifications?.enabled !== false) {
              notificationService.showFireAlert(detection);
            }
            
            if (alertSettings?.autoSnapshot?.enabled && alertSettings?.autoSnapshot?.saveOnFireDetected) {
              saveFireSnapshot(detection);
            }
          } else {
            clearOverlay();
          }

          fetchStats();
      } catch (error) {
          console.error('IP Camera detection error:', error);
      }
    };

    tempImg.onerror = () => {
      console.error('Failed to load IP camera frame');
    };

    tempImg.src = newUrl;
  };

  // Draw bounding boxes for IP camera feed
  const drawIpBoundingBoxes = (detections, width, height) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    overlay.width = width;
    overlay.height = height;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    detections.forEach((det) => {
      if (det.class?.toLowerCase() === 'fire') {
        const { x, y, width: w, height: h } = det.boundingBox;
        
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        ctx.shadowBlur = 0;
        const label = `🔥 FIRE ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 14px Inter, Arial';
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = 'rgba(255, 87, 34, 0.9)';
        ctx.fillRect(x, y - 28, textWidth + 16, 26);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 8, y - 10);
      }
    });
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

    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }

    // Clear IP camera image
    if (ipImageRef.current) {
      ipImageRef.current.src = '';
    }

    setIsStreaming(false);
    isStreamingRef.current = false;
    clearOverlay();
    
    // Stop recording if active
    if (isRecordingRef.current) {
      stopRecording();
    }
  };

  // Recording functions
  const startRecording = async () => {
    if (!isStreaming) {
      setError('Start camera first before recording');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/recordings/start', {
        name: `Recording ${new Date().toLocaleString()}`,
        cameraSource: cameraMode,
        cameraName: cameraMode === 'webcam' ? 'Webcam' : ipCameraUrl,
        fps: recordingFpsRef.current,
      });

      setRecordingId(response.data.recording._id);
      recordingIdRef.current = response.data.recording._id;
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingDuration(0);

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingIdRef.current) return;

    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      await api.post(`/recordings/${recordingIdRef.current}/stop`);
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingId(null);
      recordingIdRef.current = null;
      setRecordingDuration(0);

    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  const addFrameToRecording = async (imageData, hasDetection, detections) => {
    if (!isRecordingRef.current || !recordingIdRef.current) return;

    try {
      await api.post(`/recordings/${recordingIdRef.current}/frame`, {
        imageData,
        hasDetection,
        detections: detections?.map(d => ({
          confidence: d.confidence,
          boundingBox: d.boundingBox,
        })) || [],
      });
    } catch (err) {
      console.error('Error adding frame to recording:', err);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start detection loop
  const startDetectionLoop = () => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
    }

    detectionLoopRef.current = setInterval(() => {
      if (isStreamingRef.current) {
        captureAndDetect();
      }
    }, detectionInterval);
  };

  // Capture frame and send for detection
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreamingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert frame to base64 and send to backend
    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    try {
        const response = await api.post('/detection/detect/frame', {
          frameData,
          cameraId: cameraMode === 'webcam' ? 'webcam-1' : `ip-${Date.now()}`
        });

        const detection = response.data.detection;
        setCurrentDetection(detection);

        // Draw bounding boxes if fire detected
        if (detection.fireDetected && detection.detections?.length > 0) {
          drawBoundingBoxes(detection.detections, canvas.width, canvas.height);
          
          // Check if any detection is in a zone
          let shouldAlert = !zoneFilterEnabled || zones.length === 0;
          let matchedZone = null;
          
          for (const det of detection.detections) {
            if (det.class?.toLowerCase() === 'fire') {
              const { inZone, zone } = isDetectionInZone(det, canvas.width, canvas.height);
              if (inZone) {
                shouldAlert = true;
                matchedZone = zone;
                break;
              }
            }
          }
          
          // Only trigger alerts if detection is in a zone (or zone filtering is disabled)
          if (shouldAlert) {
            playAlertSound();
            
            // Send push notification
            if (alertSettings?.pushNotifications?.enabled !== false) {
              notificationService.showFireAlert(detection);
            }
            
            // Auto-save snapshot if enabled
            if (alertSettings?.autoSnapshot?.enabled && alertSettings?.autoSnapshot?.saveOnFireDetected) {
              saveFireSnapshot(detection);
            }
          }
        } else {
          clearOverlay();
        }

        // Update stats
        fetchStats();

        // Add frame to recording if recording is active
        if (isRecordingRef.current && recordingIdRef.current) {
          const imageData = canvas.toDataURL('image/jpeg', 0.7);
          addFrameToRecording(
            imageData,
            detection.fireDetected,
            detection.detections
          );
        }

    } catch (error) {
        console.error('Detection error:', error);
    }
  };

  // Save fire detection snapshot
  const saveFireSnapshot = async (detection) => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      await api.post('/detection/snapshot', {
        imageData,
        detectionId: detection._id,
        alertLevel: detection.alertLevel,
        confidence: detection.maxConfidence
      });
      
      console.log('Fire snapshot saved');
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  };

  // Draw bounding boxes on overlay canvas (ONLY for fire detections)
  const drawBoundingBoxes = (detections, videoWidth, videoHeight) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    
    // Match overlay size to video
    overlay.width = videoWidth;
    overlay.height = videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw zones first (as background)
    drawZonesOnOverlay(overlay, videoWidth, videoHeight);

    // Track if any detection is in a zone
    let alertTriggered = false;

    // Draw bounding boxes for fire detections only
    detections.forEach((det) => {
      // Only draw if class is fire
      if (det.class?.toLowerCase() === 'fire') {
        const { x, y, width, height } = det.boundingBox;
        
        // Check if detection is in a zone
        const { inZone, zone } = isDetectionInZone(det, videoWidth, videoHeight);
        
        // Different styling based on zone
        const boxColor = inZone ? (zone?.color || '#ff5722') : '#888888';
        const showAlert = !zoneFilterEnabled || inZone;
        
        if (showAlert) {
          alertTriggered = true;
        }
        
        // Draw glowing box
        ctx.shadowColor = boxColor;
        ctx.shadowBlur = showAlert ? 15 : 5;
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = showAlert ? 3 : 2;
        ctx.strokeRect(x, y, width, height);
        
        // Reset shadow for label
        ctx.shadowBlur = 0;

        // Draw label background
        const zoneLabel = zone ? ` [${zone.name}]` : (zoneFilterEnabled && zones.length > 0 ? ' [Outside Zone]' : '');
        const label = `🔥 FIRE ${(det.confidence * 100).toFixed(0)}%${zoneLabel}`;
        ctx.font = 'bold 14px Inter, Arial';
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = 'rgba(255, 87, 34, 0.9)';
        ctx.fillRect(x, y - 28, textWidth + 16, 26);
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 8, y - 10);

        // Draw corner markers for emphasis
        const cornerSize = 15;
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 4;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerSize);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerSize, y + height);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerSize);
        ctx.stroke();
      }
    });
  };

  // Clear overlay
  const clearOverlay = () => {
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
  };

  // Play alert sound
  const playAlertSound = () => {
    if (soundEnabled) {
      playFireAlarm();
    }
  };

  // Manual capture button
  const handleManualCapture = () => {
    if (isStreaming) {
      captureAndDetect();
    }
  };

  // Handle interval change
  const handleIntervalChange = (_, newValue) => {
    setDetectionInterval(newValue);
    if (isStreamingRef.current && autoDetect) {
      startDetectionLoop();
    }
  };

  // Dropzone for image upload
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setLoading(true);
    setError('');

    // Preview the image
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/detection/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCurrentDetection(response.data.detection);
      setUploadDialogOpen(false);
      fetchRecentDetections();
      fetchStats();
      
      if (response.data.detection.fireDetected) {
        playAlertSound();
        // Send push notification
        if (alertSettings?.pushNotifications?.enabled !== false) {
          notificationService.showFireAlert(response.data.detection);
        }
      }
    } catch (error) {
      console.error('Detection error:', error);
      setError('Failed to process image');
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, alertVolume, soundType, alertSettings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5,
            background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Live Detection
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Real-time fire detection monitoring
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Camera Mode Toggle */}
          <ToggleButtonGroup
            value={cameraMode}
            exclusive
            onChange={(_, value) => value && setCameraMode(value)}
            size="small"
            disabled={isStreaming}
          >
            <ToggleButton value="webcam">
              <Tooltip title="Webcam">
                <WebcamIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="ip">
              <Tooltip title="IP Camera">
                <IpCameraIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}>
            <IconButton onClick={() => {
              // Initialize audio context on user click to allow sound playback
              const ctx = initAudioContext();
              if (ctx.state === 'suspended') {
                ctx.resume();
              }
              setSoundEnabled(!soundEnabled);
            }}>
              {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
            </IconButton>
          </Tooltip>
          
          {/* Test Sound Button */}
          <Tooltip title="Test alert sound">
            <IconButton 
              onClick={() => {
                const ctx = initAudioContext();
                if (ctx.state === 'suspended') {
                  ctx.resume();
                }
                playAlarmTone(soundType, 500);
              }}
              sx={{ color: 'warning.main' }}
            >
              <SoundOnIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {/* Zone Controls */}
          <Tooltip title={showZones ? 'Hide zones' : 'Show zones'}>
            <IconButton onClick={() => setShowZones(!showZones)}>
              {showZones ? <ZoneVisibleIcon /> : <ZoneHiddenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={zoneFilterEnabled ? 'Disable zone filter' : 'Enable zone filter (only alert in zones)'}>
            <IconButton 
              onClick={() => setZoneFilterEnabled(!zoneFilterEnabled)}
              color={zoneFilterEnabled ? 'primary' : 'default'}
            >
              <ZoneIcon />
            </IconButton>
          </Tooltip>
          {zones.length > 0 && (
            <Chip 
              size="small" 
              label={`${zones.length} zone${zones.length > 1 ? 's' : ''}`} 
              color="primary" 
              variant="outlined" 
            />
          )}
          
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Image
          </Button>
          <Button
            variant="contained"
            startIcon={isStreaming ? <CameraOffIcon /> : <CameraIcon />}
            onClick={() => {
              if (isStreaming) {
                stopCamera();
              } else if (cameraMode === 'webcam') {
                startCamera();
              } else {
                setIpCameraDialogOpen(true);
              }
            }}
            color={isStreaming ? 'error' : 'primary'}
          >
            {isStreaming ? 'Stop Camera' : (cameraMode === 'webcam' ? 'Start Webcam' : 'Connect IP Camera')}
          </Button>
          
          {/* Recording Button */}
          {isStreaming && (
            <Button
              variant={isRecording ? 'contained' : 'outlined'}
              startIcon={isRecording ? <StopRecordIcon /> : <RecordIcon />}
              onClick={isRecording ? stopRecording : startRecording}
              color={isRecording ? 'error' : 'inherit'}
              sx={{
                borderColor: isRecording ? 'error.main' : 'rgba(255,255,255,0.3)',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {isRecording ? `Stop (${formatRecordingTime(recordingDuration)})` : 'Record'}
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {cameraError && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setCameraError('')}>
          {cameraError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Camera Stream / Detection View */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <CameraIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Camera Feed
                </Typography>
                {isStreaming && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1s infinite' }} />}
                      label="LIVE"
                      color="error"
                      size="small"
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleManualCapture}
                    >
                      Capture Now
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Video Container */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 400,
                  bgcolor: '#0a0a14',
                  borderRadius: 2,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Video element for webcam */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: isStreaming && cameraMode === 'webcam' ? 'block' : 'none',
                  }}
                />

                {/* Image element for IP camera */}
                <img
                  ref={ipImageRef}
                  alt="IP Camera Feed"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: isStreaming && cameraMode === 'ip' ? 'block' : 'none',
                  }}
                  crossOrigin="anonymous"
                />

                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Overlay canvas for bounding boxes */}
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    display: isStreaming ? 'block' : 'none',
                  }}
                />

                {/* Placeholder when not streaming */}
                {!isStreaming && (
                  <Box sx={{ textAlign: 'center' }}>
                    {cameraMode === 'webcam' ? (
                      <CameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    ) : (
                      <IpCameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    )}
                    <Typography color="text.secondary">
                      {cameraMode === 'webcam' 
                        ? 'Click "Start Webcam" to begin live detection'
                        : 'Click "Connect IP Camera" to connect to a network camera'
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cameraMode === 'webcam'
                        ? 'Your browser will ask for camera permission'
                        : 'Supports MJPEG streams and snapshot URLs'
                      }
                    </Typography>
                  </Box>
                )}

                {/* Camera mode indicator */}
                {isStreaming && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {cameraMode === 'webcam' ? <WebcamIcon fontSize="small" /> : <IpCameraIcon fontSize="small" />}
                    <Typography variant="caption">
                      {cameraMode === 'webcam' ? 'Webcam' : 'IP Camera'}
                    </Typography>
                  </Box>
                )}

                {/* Fire alert overlay */}
                {currentDetection?.fireDetected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      bgcolor: 'rgba(244, 67, 54, 0.9)',
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      animation: 'pulse 0.5s infinite',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <FireIcon />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      FIRE DETECTED!
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Detection Settings */}
              {isStreaming && (
                <Box sx={{ mt: 2, px: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Detection Interval: {detectionInterval}ms
                      </Typography>
                      <Slider
                        value={detectionInterval}
                        onChange={handleIntervalChange}
                        min={500}
                        max={5000}
                        step={500}
                        marks={[
                          { value: 500, label: '0.5s' },
                          { value: 2000, label: '2s' },
                          { value: 5000, label: '5s' },
                        ]}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoDetect}
                            onChange={(e) => {
                              setAutoDetect(e.target.checked);
                              if (e.target.checked && isStreamingRef.current) {
                                startDetectionLoop();
                              } else if (detectionLoopRef.current) {
                                clearInterval(detectionLoopRef.current);
                              }
                            }}
                          />
                        }
                        label="Auto-detect"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status & Current Detection */}
        <Grid item xs={12} md={4}>
          {/* Fire Status Card */}
          <Card
            sx={{
              mb: 2,
              bgcolor: currentDetection?.fireDetected
                ? `${getAlertColor(currentDetection.alertLevel)}15`
                : 'background.paper',
              border: currentDetection?.fireDetected
                ? `2px solid ${getAlertColor(currentDetection.alertLevel)}`
                : undefined,
              transition: 'all 0.3s ease',
            }}
          >
            <Box sx={{ height: 3, background: currentDetection?.fireDetected ? 'linear-gradient(90deg, #ff1744, #ff5252, transparent)' : 'linear-gradient(90deg, #4caf50, #8bc34a, transparent)' }} />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {currentDetection?.fireDetected ? (
                  <FireIcon 
                    sx={{ 
                      fontSize: 48, 
                      color: getAlertColor(currentDetection.alertLevel),
                      animation: 'pulse 0.5s infinite',
                    }} 
                  />
                ) : (
                  <SafeIcon sx={{ fontSize: 48, color: '#4caf50' }} />
                )}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {currentDetection?.fireDetected ? 'FIRE DETECTED!' : 'ALL CLEAR'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentDetection?.fireDetected
                      ? `Alert Level: ${currentDetection.alertLevel?.toUpperCase() || 'UNKNOWN'}`
                      : 'No fire detected in current frame'}
                  </Typography>
                </Box>
              </Box>

              {currentDetection && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Confidence
                    </Typography>
                    <Typography variant="h6">
                      {currentDetection.maxConfidence
                        ? `${(currentDetection.maxConfidence * 100).toFixed(1)}%`
                        : '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Processing Time
                    </Typography>
                    <Typography variant="h6">
                      {currentDetection.processingTime || 0}ms
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Detections
                    </Typography>
                    <Typography variant="h6">
                      {currentDetection.detections?.length || 0}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #2196f3, #64b5f6, transparent)' }} />
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                24h Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                      {stats.totalDetections || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Scans
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 87, 34, 0.1)', borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff5722' }}>
                      {stats.fireDetections || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fire Events
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Detection History */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ height: 3, background: 'linear-gradient(90deg, #9c27b0, #ba68c8, transparent)' }} />
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Detections</Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchRecentDetections} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell align="center">Confidence</TableCell>
                      <TableCell align="center">Detections</TableCell>
                      <TableCell>Processing</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentDetections.map((detection) => (
                      <TableRow
                        key={detection._id}
                        sx={{
                          bgcolor: detection.fireDetected
                            ? `${getAlertColor(detection.alertLevel)}10`
                            : 'transparent',
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getAlertIcon(detection.alertLevel)}
                            <Chip
                              size="small"
                              label={detection.fireDetected ? 'Fire' : 'Safe'}
                              sx={{
                                bgcolor: `${getAlertColor(detection.alertLevel)}20`,
                                color: getAlertColor(detection.alertLevel),
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(new Date(detection.createdAt), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {detection.source}
                        </TableCell>
                        <TableCell align="center">
                          {detection.maxConfidence
                            ? `${(detection.maxConfidence * 100).toFixed(1)}%`
                            : '--'}
                        </TableCell>
                        <TableCell align="center">
                          {detection.detections?.length || 0}
                        </TableCell>
                        <TableCell>{detection.processingTime}ms</TableCell>
                      </TableRow>
                    ))}
                    {recentDetections.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No detections yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !loading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Image for Detection</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'rgba(255, 87, 34, 0.1)' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(255, 87, 34, 0.05)',
                },
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                Drag & drop an image here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse (JPEG, PNG, WebP)
              </Typography>
            </Box>

            {previewImage && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                />
              </Box>
            )}

            {loading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Processing image...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* IP Camera Dialog */}
      <Dialog
        open={ipCameraDialogOpen}
        onClose={() => setIpCameraDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <IpCameraIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Connect IP Camera
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="IP Camera URL"
              value={ipCameraUrl}
              onChange={(e) => setIpCameraUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080/video"
              helperText="Enter MJPEG stream URL or snapshot URL (e.g., http://camera_ip/mjpg/video.mjpg)"
              sx={{ mb: 2 }}
            />
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Supported formats:
              </Typography>
              <Typography variant="body2">
                • MJPEG stream: http://camera_ip/mjpg/video.mjpg<br/>
                • Snapshot URL: http://camera_ip/snapshot.jpg<br/>
                • IP Webcam (Android): http://phone_ip:8080/video<br/>
                • ESP32-CAM: http://esp32_ip/capture
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2">
                Note: The camera must be accessible from your browser. For local network cameras, 
                ensure CORS is enabled or use the same network.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIpCameraDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={startIpCamera}
            disabled={!ipCameraUrl}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSS Keyframes */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
};

export default Detection;
