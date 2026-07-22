import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipPrevious as PrevIcon,
  SkipNext as NextIcon,
  FastRewind as RewindIcon,
  FastForward as ForwardIcon,
  ArrowBack as BackIcon,
  Speed as SpeedIcon,
  LocalFireDepartment as FireIcon,
  Videocam as VideocamIcon,
  AccessTime as TimeIcon,
  Photo as FrameIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Playback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [recording, setRecording] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [detectionFrames, setDetectionFrames] = useState([]);
  const intervalRef = useRef(null);

  // Fetch recording metadata
  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/recordings/${id}/metadata`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecording(response.data);
      } catch (err) {
        setError('Failed to load recording');
        console.error('Error fetching recording:', err);
      }
    };
    fetchRecording();
  }, [id]);

  // Fetch frames
  useEffect(() => {
    const fetchFrames = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/recordings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFrames(response.data.frames || []);
        
        // Find frames with detections
        const detections = (response.data.frames || [])
          .map((frame, index) => ({ ...frame, index }))
          .filter(frame => frame.hasDetection);
        setDetectionFrames(detections);
        
        setError('');
      } catch (err) {
        setError('Failed to load recording frames');
        console.error('Error fetching frames:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFrames();
  }, [id]);

  // Draw frame on canvas
  const drawFrame = useCallback((frameIndex) => {
    if (!frames[frameIndex] || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const frame = frames[frameIndex];
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Draw detection boxes if present
      if (frame.hasDetection && frame.detections) {
        ctx.strokeStyle = '#ff5722';
        ctx.lineWidth = 3;
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ff5722';
        
        frame.detections.forEach((det) => {
          if (det.boundingBox) {
            const { x, y, width, height } = det.boundingBox;
            ctx.strokeRect(x, y, width, height);
            ctx.fillText(
              `Fire ${Math.round((det.confidence || 0) * 100)}%`,
              x,
              y - 5
            );
          }
        });
      }
    };
    img.src = frame.imageData;
  }, [frames]);

  // Draw current frame when it changes
  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  // Playback control
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const fps = recording?.fps || 1;
      const interval = 1000 / (fps * playbackSpeed);
      
      intervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, frames.length, playbackSpeed, recording?.fps]);

  const handlePlayPause = () => {
    if (currentFrame >= frames.length - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (event, newValue) => {
    setIsPlaying(false);
    setCurrentFrame(newValue);
  };

  const handlePrevFrame = () => {
    setCurrentFrame((prev) => Math.max(0, prev - 1));
  };

  const handleNextFrame = () => {
    setCurrentFrame((prev) => Math.min(frames.length - 1, prev + 1));
  };

  const handleRewind = () => {
    setCurrentFrame((prev) => Math.max(0, prev - 10));
  };

  const handleForward = () => {
    setCurrentFrame((prev) => Math.min(frames.length - 1, prev + 10));
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const jumpToDetection = (frameIndex) => {
    setIsPlaying(false);
    setCurrentFrame(frameIndex);
  };

  const formatTime = (frameIndex) => {
    if (!recording?.fps) return '0:00';
    const seconds = Math.floor(frameIndex / recording.fps);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/recordings')} sx={{ mb: 2 }}>
          Back to Recordings
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/recordings')}>
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold">
              {recording?.name || 'Recording Playback'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {recording?.description || formatDate(recording?.createdAt)}
            </Typography>
          </Box>
          <Chip
            icon={<VideocamIcon sx={{ fontSize: 16 }} />}
            label={recording?.cameraName || 'Camera'}
            variant="outlined"
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Video Player */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              bgcolor: '#0d0d1a',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {/* Canvas */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                bgcolor: '#000',
                minHeight: 400,
              }}
            >
              {frames.length > 0 ? (
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 400,
                  }}
                >
                  <Typography color="text.secondary">No frames available</Typography>
                </Box>
              )}
            </Box>

            {/* Controls */}
            <Box sx={{ p: 2 }}>
              {/* Timeline Slider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
                  {formatTime(currentFrame)}
                </Typography>
                <Slider
                  value={currentFrame}
                  min={0}
                  max={Math.max(0, frames.length - 1)}
                  onChange={handleSliderChange}
                  sx={{
                    '& .MuiSlider-track': {
                      bgcolor: 'primary.main',
                    },
                    '& .MuiSlider-thumb': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
                  {formatTime(frames.length - 1)}
                </Typography>
              </Box>

              {/* Playback Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Speed">
                  <Button
                    size="small"
                    onClick={handleSpeedChange}
                    startIcon={<SpeedIcon />}
                    sx={{ minWidth: 80 }}
                  >
                    {playbackSpeed}x
                  </Button>
                </Tooltip>
                <IconButton onClick={handleRewind} disabled={currentFrame === 0}>
                  <RewindIcon />
                </IconButton>
                <IconButton onClick={handlePrevFrame} disabled={currentFrame === 0}>
                  <PrevIcon />
                </IconButton>
                <IconButton
                  onClick={handlePlayPause}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                    p: 2,
                  }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>
                <IconButton onClick={handleNextFrame} disabled={currentFrame >= frames.length - 1}>
                  <NextIcon />
                </IconButton>
                <IconButton onClick={handleForward} disabled={currentFrame >= frames.length - 1}>
                  <ForwardIcon />
                </IconButton>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Frame {currentFrame + 1} / {frames.length}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Recording Info */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a1a2e', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recording Info
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <TimeIcon sx={{ color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Duration"
                  secondary={recording?.formattedDuration || formatTime(frames.length - 1)}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <FrameIcon sx={{ color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Total Frames"
                  secondary={recording?.totalFrames || frames.length}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <FireIcon sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Fire Detections"
                  secondary={recording?.detectionCount || detectionFrames.length}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SpeedIcon sx={{ color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="FPS"
                  secondary={recording?.fps || 1}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Detection Timeline */}
          <Paper sx={{ p: 2, bgcolor: '#1a1a2e', borderRadius: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Detection Events
            </Typography>
            {detectionFrames.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No fire detections in this recording
              </Typography>
            ) : (
              <List dense>
                {detectionFrames.map((frame, idx) => (
                  <React.Fragment key={frame.index}>
                    <ListItem
                      button
                      onClick={() => jumpToDetection(frame.index)}
                      selected={currentFrame === frame.index}
                      sx={{
                        borderRadius: 1,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255, 87, 34, 0.2)',
                        },
                      }}
                    >
                      <ListItemIcon>
                        <FireIcon sx={{ color: 'error.main' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Detection ${idx + 1}`}
                        secondary={`Frame ${frame.index + 1} • ${formatTime(frame.index)}`}
                      />
                      <Chip
                        size="small"
                        label={`${Math.round((frame.detections?.[0]?.confidence || 0) * 100)}%`}
                        color="error"
                        variant="outlined"
                      />
                    </ListItem>
                    {idx < detectionFrames.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Playback;
