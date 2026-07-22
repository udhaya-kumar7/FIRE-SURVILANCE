import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Videocam as CameraIcon,
  VideocamOff as CameraOffIcon,
  LocalFireDepartment as FireIcon,
  Settings as SettingsIcon,
  Wifi as IpCameraIcon,
  Computer as WebcamIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import api from '../services/api';
import notificationService from '../services/notificationService';

const CameraFeed = ({ 
  cameraId, 
  cameraName, 
  onFireDetected, 
  detectionInterval = 2000,
  onRemove,
  fullWidth = false 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraMode, setCameraMode] = useState('webcam');
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentDetection, setCurrentDetection] = useState(null);
  const [error, setError] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const ipImageRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const isStreamingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start webcam
  const startWebcam = async () => {
    try {
      setError('');
      const constraints = {
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
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
      startDetectionLoop();
    } catch (err) {
      setError(err.name === 'NotAllowedError' 
        ? 'Camera access denied' 
        : `Camera error: ${err.message}`);
    }
  };

  // Start IP camera
  const startIpCamera = () => {
    if (!ipCameraUrl) {
      setError('Enter IP camera URL');
      return;
    }

    setError('');
    setIsStreaming(true);
    isStreamingRef.current = true;
    
    if (ipImageRef.current) {
      ipImageRef.current.src = ipCameraUrl + '?t=' + Date.now();
    }
    
    startIpDetectionLoop();
    setSettingsOpen(false);
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

    if (ipImageRef.current) {
      ipImageRef.current.src = '';
    }

    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }

    setIsStreaming(false);
    isStreamingRef.current = false;
    setCurrentDetection(null);
    clearOverlay();
  };

  // Detection loop for webcam
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

  // Detection loop for IP camera
  const startIpDetectionLoop = () => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
    }

    detectionLoopRef.current = setInterval(() => {
      if (isStreamingRef.current) {
        captureIpFrame();
      }
    }, detectionInterval);
  };

  // Capture webcam frame
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current || !isStreamingRef.current || isDetecting) return;

    setIsDetecting(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!video.videoWidth || !video.videoHeight) {
      setIsDetecting(false);
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await api.post('/detection/detect/frame', {
        frameData,
        cameraId: String(cameraId || 'webcam-1'),
      });

      const detection = response.data.detection;
      setCurrentDetection(detection);

      if (detection.fireDetected && detection.detections?.length > 0) {
        drawBoundingBoxes(detection.detections, canvas.width, canvas.height);
        onFireDetected?.(cameraId, cameraName, detection);
      } else {
        clearOverlay();
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Capture IP camera frame
  const captureIpFrame = async () => {
    if (!ipImageRef.current || !canvasRef.current || !isStreamingRef.current || isDetecting) return;

    setIsDetecting(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    
    tempImg.onload = async () => {
      canvas.width = tempImg.width || 640;
      canvas.height = tempImg.height || 480;
      ctx.drawImage(tempImg, 0, 0);

      if (ipImageRef.current) {
        ipImageRef.current.src = tempImg.src;
      }

      const frameData = canvas.toDataURL('image/jpeg', 0.8);

      try {
        const response = await api.post('/detection/detect/frame', {
          frameData,
          cameraId: String(cameraId || 'ip-camera'),
        });

        const detection = response.data.detection;
        setCurrentDetection(detection);

        if (detection.fireDetected && detection.detections?.length > 0) {
          drawBoundingBoxes(detection.detections, canvas.width, canvas.height);
          onFireDetected?.(cameraId, cameraName, detection);
        } else {
          clearOverlay();
        }
      } catch (err) {
        console.error('Detection error:', err);
      } finally {
        setIsDetecting(false);
      }
    };

    tempImg.onerror = () => {
      setIsDetecting(false);
    };

    tempImg.src = ipCameraUrl + '?t=' + Date.now();
  };

  // Draw bounding boxes
  const drawBoundingBoxes = (detections, width, height) => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    overlay.width = width;
    overlay.height = height;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    detections.forEach((det) => {
      if (det.class?.toLowerCase() === 'fire') {
        const { x, y, width: w, height: h } = det.boundingBox;
        
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        ctx.shadowBlur = 0;
        const label = `🔥 ${(det.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 12px Arial';
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = 'rgba(255, 87, 34, 0.9)';
        ctx.fillRect(x, y - 20, textWidth + 8, 18);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 4, y - 6);
      }
    });
  };

  // Clear overlay
  const clearOverlay = () => {
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
  };

  const handleStart = () => {
    if (cameraMode === 'webcam') {
      startWebcam();
    } else {
      setSettingsOpen(true);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 1, pb: '8px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {cameraName}
            </Typography>
            {isStreaming && (
              <Chip
                size="small"
                label="LIVE"
                color="error"
                sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
              />
            )}
            {currentDetection?.fireDetected && (
              <Chip
                icon={<FireIcon sx={{ fontSize: 14 }} />}
                size="small"
                label="FIRE"
                color="error"
                sx={{ height: 18, animation: 'pulse 0.5s infinite' }}
              />
            )}
          </Box>
          <Box>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onRemove && (
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => onRemove(cameraId)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Video Container */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            bgcolor: '#0a0a14',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: fullWidth ? 300 : 180,
          }}
        >
          {/* Webcam video */}
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

          {/* IP camera image */}
          <img
            ref={ipImageRef}
            alt="IP Camera"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: isStreaming && cameraMode === 'ip' ? 'block' : 'none',
            }}
            crossOrigin="anonymous"
          />

          {/* Hidden canvas */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Overlay */}
          <canvas
            ref={overlayRef}
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

          {/* Placeholder */}
          {!isStreaming && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <CameraIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Click Start to begin
              </Typography>
            </Box>
          )}

          {/* Detecting indicator */}
          {isDetecting && (
            <Box sx={{ position: 'absolute', top: 5, right: 5 }}>
              <CircularProgress size={16} thickness={5} />
            </Box>
          )}

          {/* Fire alert overlay */}
          {currentDetection?.fireDetected && (
            <Box
              sx={{
                position: 'absolute',
                top: 5,
                left: 5,
                bgcolor: 'rgba(244, 67, 54, 0.9)',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 0.5,
                animation: 'pulse 0.5s infinite',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FireIcon sx={{ fontSize: 14 }} /> FIRE!
              </Typography>
            </Box>
          )}
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant={isStreaming ? 'outlined' : 'contained'}
            color={isStreaming ? 'error' : 'primary'}
            startIcon={isStreaming ? <CameraOffIcon /> : <CameraIcon />}
            onClick={isStreaming ? stopCamera : handleStart}
            fullWidth
            sx={{ py: 0.5 }}
          >
            {isStreaming ? 'Stop' : 'Start'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>
            <Typography variant="caption">{error}</Typography>
          </Alert>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Camera Settings - {cameraName}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Camera Type</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={cameraMode === 'webcam' ? 'contained' : 'outlined'}
                startIcon={<WebcamIcon />}
                onClick={() => setCameraMode('webcam')}
                size="small"
              >
                Webcam
              </Button>
              <Button
                variant={cameraMode === 'ip' ? 'contained' : 'outlined'}
                startIcon={<IpCameraIcon />}
                onClick={() => setCameraMode('ip')}
                size="small"
              >
                IP Camera
              </Button>
            </Box>

            {cameraMode === 'ip' && (
              <TextField
                fullWidth
                label="IP Camera URL"
                value={ipCameraUrl}
                onChange={(e) => setIpCameraUrl(e.target.value)}
                placeholder="http://192.168.1.100:8080/video"
                size="small"
                helperText="MJPEG stream or snapshot URL"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (cameraMode === 'webcam') {
                startWebcam();
                setSettingsOpen(false);
              } else {
                startIpCamera();
              }
            }}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default CameraFeed;
