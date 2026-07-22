import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Psychology as ModelIcon,
  Speed as MetricIcon,
  Timeline as TimelineIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Compare as CompareIcon,
  Star as StarIcon,
  Info as InfoIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import api from '../services/api';
import socketService from '../services/socket';
import { format } from 'date-fns';
import MODEL_CONFIGS, {
  MODEL_FAMILIES,
  YOLO_VERSIONS,
  TRAINING_PRESETS,
  AUGMENTATION_PRESETS,
  getModelsByVersion,
  getModelsByFamily,
  getRecommendedModels,
} from '../config/modelConfigs';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const formatPercentMetric = (value, fallback = '--') => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return `${(Math.max(0, parsed) * 100).toFixed(1)}%`;
};

const formatExactMetric = (value, fallback = '--') => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed.toFixed(6);
};

const formatDualMetric = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { percent: '--', raw: '--' };
  }
  return {
    percent: `${(Math.max(0, parsed) * 100).toFixed(1)}%`,
    raw: parsed.toFixed(4)
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return '#4caf50';
    case 'training':
      return '#ff9800';
    case 'failed':
    case 'cancelled':
      return '#f44336';
    default:
      return '#9e9e9e';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <SuccessIcon sx={{ color: '#4caf50' }} />;
    case 'training':
      return <PendingIcon sx={{ color: '#ff9800' }} />;
    case 'failed':
    case 'cancelled':
      return <ErrorIcon sx={{ color: '#f44336' }} />;
    default:
      return <PendingIcon sx={{ color: '#9e9e9e' }} />;
  }
};

const Training = () => {
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [activeTraining, setActiveTraining] = useState(null);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [animatedEpochProgress, setAnimatedEpochProgress] = useState(0);
  const [animatedEpoch, setAnimatedEpoch] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [historyTabValue, setHistoryTabValue] = useState(0);
  const [error, setError] = useState('');
  
  // Results dialog state
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedModelResults, setSelectedModelResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [selectedResultImage, setSelectedResultImage] = useState('');
  const [singleTestLoading, setSingleTestLoading] = useState(false);
  const [singleTestError, setSingleTestError] = useState('');
  const [singleTestImage, setSingleTestImage] = useState('');
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState('');
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarkCoverage, setBenchmarkCoverage] = useState(null);
  const [inferenceTuning, setInferenceTuning] = useState({
    confThreshold: 0.5,
    minBoxArea: 900,
  });
  
  // Model selection state
  const [selectedFamily, setSelectedFamily] = useState('yolo');
  const [selectedVersion, setSelectedVersion] = useState('v11');
  const [selectedModel, setSelectedModel] = useState('yolov11s');
  const [trainingPreset, setTrainingPreset] = useState('balanced');
  const [augmentationPreset, setAugmentationPreset] = useState('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareModels, setCompareModels] = useState([]);

  const [trainingConfig, setTrainingConfig] = useState({
    datasetId: '',
    name: '',
    description: '',
    baseModel: 'yolov11s',
    epochs: 50,
    batchSize: 16,
    learningRate: 0.01,
    imgSize: 640,
    patience: 10,
    optimizer: 'AdamW',
    augmentation: AUGMENTATION_PRESETS.medium,
  });

  // Get filtered models based on selection
  const getAvailableModels = () => {
    if (selectedFamily === 'yolo') {
      return getModelsByVersion(selectedVersion);
    }
    return getModelsByFamily(selectedFamily);
  };

  // Handle family change
  const handleFamilyChange = (event, newFamily) => {
    if (newFamily) {
      setSelectedFamily(newFamily);
      if (newFamily === 'yolo') {
        setSelectedVersion('v11');
        setSelectedModel('yolov11s');
      } else if (newFamily === 'vajra') {
        setSelectedModel('vajrav2s');
      }
    }
  };

  // Handle version change
  const handleVersionChange = (event, newVersion) => {
    if (newVersion) {
      setSelectedVersion(newVersion);
      // Select default model for this version
      const versionModels = getModelsByVersion(newVersion);
      const defaultModel = versionModels.find(m => m.size === 'small') || versionModels[0];
      setSelectedModel(defaultModel.id);
    }
  };

  // Handle model selection
  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    const model = MODEL_CONFIGS[modelId];
    setTrainingConfig(prev => ({
      ...prev,
      baseModel: modelId,
      name: `${model.name} Fire Detection`,
    }));
  };

  // Handle preset change
  const handlePresetChange = (presetKey) => {
    setTrainingPreset(presetKey);
    const preset = TRAINING_PRESETS[presetKey];
    setTrainingConfig(prev => ({
      ...prev,
      epochs: preset.epochs,
      batchSize: preset.batchSize,
      learningRate: preset.lr,
      imgSize: preset.imgSize,
      patience: preset.patience,
      optimizer: preset.optimizer,
    }));
  };

  // Toggle model for comparison
  const toggleCompareModel = (modelId) => {
    setCompareModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length < 4) {
        return [...prev, modelId];
      }
      return prev;
    });
  };

  // View training results with bounding boxes
  const viewTrainingResults = async (model) => {
    setSelectedModelResults(model);
    setResultsLoading(true);
    setResultsDialogOpen(true);
    setSingleTestImage('');
    setSingleTestError('');
    setBenchmarkError('');
    setBenchmarkResult(model?.benchmarkEvaluation || null);
    setBenchmarkCoverage(null);
    
    try {
      const response = await api.get(`/training/${model._id}/results`);
      setResultsData(response.data);
      setSelectedResultImage((response.data?.predictionImages || [])[0] || '');
      if (response.data?.model) {
        setSelectedModelResults((prev) => ({
          ...(prev || model),
          ...response.data.model,
          metrics: response.data.model.metrics || prev?.metrics || model.metrics,
        }));
        setBenchmarkResult(response.data.model.benchmarkEvaluation || null);
      }

      try {
        const coverageRes = await api.get('/training/benchmark/status');
        setBenchmarkCoverage(coverageRes.data || null);
      } catch (coverageError) {
        console.error('Failed to load benchmark coverage:', coverageError);
      }
    } catch (error) {
      console.error('Error fetching training results:', error);
      setResultsData({ hasResults: false, error: 'Failed to load results' });
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modelsRes, datasetsRes] = await Promise.all([
        api.get('/training'),
        api.get('/datasets?status=ready'),
      ]);
      setModels(modelsRes.data.models);
      setDatasets(datasetsRes.data.datasets);

      // Check for active training
      const active = modelsRes.data.models.find((m) => m.status === 'training');
      if (active) {
        setActiveTraining(active);
        setTrainingLogs(active.trainingLogs || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Connect to socket for real-time updates
    const socket = socketService.connect();

    if (activeTraining) {
      socketService.joinTrainingRoom(activeTraining._id);
    }

    socketService.onTrainingProgress((data) => {
      setTrainingProgress(data);
      setTrainingLogs((prev) => [
        ...prev,
        {
          epoch: data.epoch,
          loss: data.loss,
          valLoss: data.valLoss,
          mAP: data.mAP,
          timestamp: new Date(),
        },
      ]);
    });

    socketService.onTrainingCompleted((data) => {
      setActiveTraining(null);
      setTrainingProgress(null);
      fetchData();
    });

    socketService.onTrainingCancelled(() => {
      setActiveTraining(null);
      setTrainingProgress(null);
      fetchData();
    });

    socketService.onTrainingFailed((data) => {
      setError(data?.error || 'Training failed');
      setActiveTraining(null);
      setTrainingProgress(null);
      fetchData();
    });

    return () => {
      socketService.off('training-progress');
      socketService.off('training-completed');
      socketService.off('training-cancelled');
      socketService.off('training-failed');
    };
  }, [activeTraining]);

  // Animate in-epoch progress (Colab-like) between backend epoch updates.
  useEffect(() => {
    if (!activeTraining || !trainingProgress?.epoch || trainingProgress.epoch <= 0) {
      setAnimatedEpoch(0);
      setAnimatedEpochProgress(0);
      return;
    }

    if (trainingProgress.epoch !== animatedEpoch) {
      setAnimatedEpoch(trainingProgress.epoch);
      setAnimatedEpochProgress(0);
    }
  }, [activeTraining, trainingProgress?.epoch, animatedEpoch]);

  useEffect(() => {
    if (!activeTraining || !trainingProgress?.epoch || trainingProgress.epoch <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setAnimatedEpochProgress((prev) => clamp(prev + 2, 0, 99));
    }, 1200);

    return () => clearInterval(timer);
  }, [activeTraining, trainingProgress?.epoch]);

  useEffect(() => {
    if (!activeTraining?._id) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/training/${activeTraining._id}`);
        const latestModel = response.data?.model;
        if (!latestModel) {
          return;
        }

        if (latestModel.status === 'failed') {
          setError(latestModel.errorMessage || 'Training failed');
          setActiveTraining(null);
          setTrainingProgress(null);
          fetchData();
          return;
        }

        if (latestModel.status === 'completed' || latestModel.status === 'cancelled') {
          setActiveTraining(null);
          setTrainingProgress(null);
          fetchData();
          return;
        }

        const progress = latestModel.trainingProgress || {};
        const currentEpoch = Number(progress.currentEpoch || 0);
        const totalEpochs = Number(progress.totalEpochs || latestModel.hyperparameters?.epochs || 0);

        if (totalEpochs > 0) {
          setTrainingProgress((prev) => ({
            ...(prev || {}),
            epoch: currentEpoch,
            totalEpochs,
            loss: Number.isFinite(Number(progress.currentLoss)) ? Number(progress.currentLoss) : prev?.loss,
            elapsedTime: Number.isFinite(Number(progress.elapsedTime)) ? Number(progress.elapsedTime) : prev?.elapsedTime,
            progress: Math.round((currentEpoch / totalEpochs) * 100),
          }));
        }
      } catch (pollError) {
        console.error('Training status poll error:', pollError);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeTraining?._id]);

  const handleStartTraining = async () => {
    try {
      setError('');
      const selectedModelConfig = MODEL_CONFIGS[selectedModel];
      const response = await api.post('/training/start', {
        datasetId: trainingConfig.datasetId,
        name: trainingConfig.name || `${selectedModelConfig.name} Fire Detection`,
        description: trainingConfig.description,
        baseModel: selectedModel,
        modelFamily: selectedModelConfig.family,
        modelVersion: selectedModelConfig.version,
        hyperparameters: {
          epochs: trainingConfig.epochs,
          batchSize: trainingConfig.batchSize,
          learningRate: trainingConfig.learningRate,
          imgSize: trainingConfig.imgSize,
          patience: trainingConfig.patience,
          optimizer: trainingConfig.optimizer,
          augmentation: trainingConfig.augmentation,
        },
      });

      setActiveTraining(response.data.model);
      setTrainingLogs([]);
      setTrainingProgress({ progress: 0 });
      setTrainingDialogOpen(false);
      socketService.joinTrainingRoom(response.data.model._id);
    } catch (error) {
      console.error('Error starting training:', error);
      setError(error.response?.data?.error || 'Failed to start training');
    }
  };

  const handleCancelTraining = async () => {
    if (!activeTraining) return;

    try {
      await api.post(`/training/${activeTraining._id}/cancel`);
      setActiveTraining(null);
      setTrainingProgress(null);
      fetchData();
    } catch (error) {
      console.error('Error cancelling training:', error);
      setError('Failed to cancel training');
    }
  };

  const chartData = {
    labels: trainingLogs.map((_, i) => i + 1),
    datasets: [
      {
        label: 'Training Loss',
        data: trainingLogs.map((l) => l.loss),
        borderColor: '#f44336',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Validation Loss',
        data: trainingLogs.map((l) => l.valLoss),
        borderColor: '#ff9800',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'mAP',
        data: trainingLogs.map((l) => l.mAP),
        borderColor: '#4caf50',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#b0b0c0' },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Epoch', color: '#b0b0c0' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#b0b0c0' },
      },
      y: {
        title: { display: true, text: 'Loss', color: '#b0b0c0' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#b0b0c0' },
        position: 'left',
      },
      y1: {
        title: { display: true, text: 'mAP', color: '#b0b0c0' },
        grid: { display: false },
        ticks: { color: '#b0b0c0' },
        position: 'right',
        min: 0,
        max: 1,
      },
    },
  };

  const createAnnotatedPreview = (file, detections = []) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');

          ctx.drawImage(image, 0, 0);

          (detections || []).forEach((det) => {
            if (String(det.class || '').toLowerCase() !== 'fire') {
              return;
            }

            const { x, y, width, height } = det.boundingBox || {};
            if ([x, y, width, height].some((n) => Number.isNaN(Number(n)))) {
              return;
            }

            ctx.strokeStyle = '#ff5722';
            ctx.lineWidth = 3;
            ctx.strokeRect(Number(x), Number(y), Number(width), Number(height));

            const label = `FIRE ${((Number(det.confidence) || 0) * 100).toFixed(0)}%`;
            ctx.font = 'bold 14px Arial';
            const textWidth = ctx.measureText(label).width;
            const labelX = Number(x);
            const labelY = Math.max(22, Number(y));

            ctx.fillStyle = 'rgba(255,87,34,0.9)';
            ctx.fillRect(labelX, labelY - 22, textWidth + 12, 22);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, labelX + 6, labelY - 6);
          });

          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };

        image.onerror = () => reject(new Error('Failed to load selected image'));
        image.src = reader.result;
      };

      reader.onerror = () => reject(new Error('Failed to read selected image'));
      reader.readAsDataURL(file);
    });
  };

  const handleSingleImageTest = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModelResults?._id) {
      return;
    }

    setSingleTestLoading(true);
    setSingleTestError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('modelId', selectedModelResults._id);
      formData.append('confThreshold', String(inferenceTuning.confThreshold));
      formData.append('minBoxArea', String(inferenceTuning.minBoxArea));

      const response = await api.post('/detection/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const annotatedDataUrl = await createAnnotatedPreview(file, response.data?.detection?.detections || []);
      setSingleTestImage(annotatedDataUrl);
    } catch (error) {
      console.error('Single image test failed:', error);
      setSingleTestError(error.response?.data?.error || 'Failed to run single-image inference');
    } finally {
      setSingleTestLoading(false);
      event.target.value = '';
    }
  };

  const handleRunBenchmark = async () => {
    if (!selectedModelResults?._id) {
      return;
    }

    try {
      setBenchmarkLoading(true);
      setBenchmarkError('');
      const response = await api.post(`/training/${selectedModelResults._id}/evaluate-benchmark`, {
        confThreshold: inferenceTuning.confThreshold,
        minBoxArea: inferenceTuning.minBoxArea,
      });

      const result = response.data?.benchmarkEvaluation || null;
      setBenchmarkResult(result);
      setSelectedModelResults((prev) => ({
        ...(prev || {}),
        benchmarkEvaluation: result,
      }));
      fetchData();
    } catch (err) {
      console.error('Benchmark evaluation failed:', err);
      setBenchmarkError(err.response?.data?.details || err.response?.data?.error || 'Benchmark evaluation failed');
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const displayedMetrics = resultsData?.model?.metrics || selectedModelResults?.metrics || {};
  const selectedDataset = datasets.find((d) => d._id === trainingConfig.datasetId) || null;
  const splitRatio = selectedDataset?.metadata?.splitRatio || { train: 0.7, val: 0.2, test: 0.1 };
  const datasetImages = Number(selectedDataset?.imageCount || 0);
  const datasetLabels = Number(selectedDataset?.labelCount || 0);
  const estimatedTrainCount = Math.max(0, Math.round(datasetImages * Number(splitRatio.train || 0.7)));
  const estimatedValCount = Math.max(0, Math.round(datasetImages * Number(splitRatio.val || 0.2)));
  const estimatedTestCount = Math.max(0, Math.round(datasetImages * Number(splitRatio.test || 0.1)));
  const labelDensity = datasetImages > 0 ? datasetLabels / datasetImages : 0;
  const precisionMetric = Number(displayedMetrics.precision);
  const recallMetric = Number(displayedMetrics.recall);
  const derivedAccuracy = Number.isFinite(precisionMetric) && Number.isFinite(recallMetric)
    ? (precisionMetric + recallMetric) / 2
    : null;
  const effectiveAccuracy = Number.isFinite(Number(displayedMetrics.accuracy))
    ? Number(displayedMetrics.accuracy)
    : derivedAccuracy;

  const summaryMetrics = {
    mAP50: Number(displayedMetrics.mAP50 ?? displayedMetrics.mAP),
    precision: precisionMetric,
    recall: recallMetric,
    f1Score: Number(displayedMetrics.f1Score),
    accuracy: effectiveAccuracy,
  };

  const confusionPlots = (resultsData?.plots || []).filter((plot) =>
    plot.toLowerCase().includes('confusion_matrix')
  );
  const trainingPlots = (resultsData?.plots || []).filter((plot) =>
    !plot.toLowerCase().includes('confusion_matrix')
  );

  if (loading) {
    return <LinearProgress />;
  }

  const totalEpochs = trainingProgress?.totalEpochs || activeTraining?.hyperparameters?.epochs || 100;
  const currentEpoch = trainingProgress?.epoch || 0;
  const epochPercent = currentEpoch > 0 ? animatedEpochProgress : 0;
  const overallProgress = currentEpoch > 0
    ? clamp(Math.round((((Math.max(currentEpoch - 1, 0)) + (epochPercent / 100)) / totalEpochs) * 100), 0, 99)
    : 0;

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
            Model Training
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Train and manage fire detection models
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={activeTraining ? <StopIcon /> : <StartIcon />}
          onClick={activeTraining ? handleCancelTraining : () => setTrainingDialogOpen(true)}
          color={activeTraining ? 'error' : 'primary'}
          disabled={!activeTraining && datasets.length === 0}
        >
          {activeTraining ? 'Stop Training' : 'Start Training'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Active Training Status */}
      {activeTraining && (
        <Card sx={{ mb: 3, border: '1px solid rgba(41,182,246,0.3)', background: 'rgba(12,12,32,0.6)' }}>
          <Box sx={{ height: 3, background: 'linear-gradient(90deg, #29b6f6, #0288d1, transparent)' }} />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <ModelIcon color="primary" />
              <Typography variant="h6">
                Training in Progress: {activeTraining.name}
              </Typography>
              <Chip
                label="LIVE"
                size="small"
                sx={{
                  bgcolor: 'rgba(76, 175, 80, 0.2)',
                  color: 'success.main',
                  fontWeight: 700,
                  '&::before': {
                    content: '""',
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    mr: 1,
                    animation: 'pulseLiveDot 1.1s ease-in-out infinite',
                  },
                  '@keyframes pulseLiveDot': {
                    '0%': { transform: 'scale(0.85)', opacity: 0.7 },
                    '50%': { transform: 'scale(1.2)', opacity: 1 },
                    '100%': { transform: 'scale(0.85)', opacity: 0.7 },
                  },
                }}
              />
              <Chip
                label="Training"
                color="warning"
                size="small"
                sx={{ ml: 'auto' }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Epoch {currentEpoch} / {totalEpochs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentEpoch > 0 ? `Overall ${overallProgress}%` : 'Initializing...'}
                </Typography>
              </Box>
              <LinearProgress
                variant={currentEpoch > 0 ? 'determinate' : 'indeterminate'}
                value={currentEpoch > 0 ? overallProgress : undefined}
                sx={{
                  height: 10,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': {
                    transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                    animation: 'progressGlow 1.6s ease-in-out infinite',
                  },
                  '@keyframes progressGlow': {
                    '0%': { filter: 'brightness(1)' },
                    '50%': { filter: 'brightness(1.2)' },
                    '100%': { filter: 'brightness(1)' },
                  },
                }}
              />
              {currentEpoch > 0 && (
                <Box sx={{ mt: 1.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Epoch {currentEpoch} Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {epochPercent}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={epochPercent}
                    sx={{
                      height: 7,
                      borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.07)',
                    }}
                  />
                </Box>
              )}
              {currentEpoch === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Preparing dataset and model... first epoch metrics will appear shortly.
                </Typography>
              )}
              {Number.isFinite(Number(trainingProgress?.elapsedTime)) && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Elapsed: {Math.round(Number(trainingProgress.elapsedTime))}s
                </Typography>
              )}
            </Box>

            {trainingProgress && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(244,67,54,0.08)' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Training Loss (Exact)
                      </Typography>
                      <Typography variant="h6">
                        {formatExactMetric(trainingProgress.loss)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(255,152,0,0.08)' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Validation Loss (Exact)
                      </Typography>
                      <Typography variant="h6">
                        {formatExactMetric(trainingProgress.valLoss)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(76,175,80,0.08)' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        mAP50-95 Score (Exact)
                      </Typography>
                      <Typography variant="h6">
                        {formatExactMetric(trainingProgress.mAP)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPercentMetric(trainingProgress.mAP, '--')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(33,150,243,0.08)' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        mAP50 Score (Exact)
                      </Typography>
                      <Typography variant="h6">
                        {formatExactMetric(trainingProgress.mAP50)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPercentMetric(trainingProgress.mAP50, '--')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training Chart */}
      {trainingLogs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Training Progress
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={chartData} options={chartOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Available Models Browser */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <ModelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Available Model Architectures
            </Typography>
            <Button
              size="small"
              startIcon={<CompareIcon />}
              onClick={() => setCompareMode(!compareMode)}
              variant={compareMode ? 'contained' : 'outlined'}
            >
              {compareMode ? 'Exit Compare' : 'Compare Models'}
            </Button>
          </Box>

          {compareMode && compareModels.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Model Comparison (Select up to 4)</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Model</TableCell>
                      <TableCell align="center">Parameters</TableCell>
                      <TableCell align="center">FLOPs</TableCell>
                      <TableCell align="center">mAP</TableCell>
                      <TableCell align="center">Speed</TableCell>
                      <TableCell align="center">GPU Required</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {compareModels.map(modelId => {
                      const m = MODEL_CONFIGS[modelId];
                      return (
                        <TableRow key={modelId}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell align="center">{m.params}</TableCell>
                          <TableCell align="center">{m.flops}</TableCell>
                          <TableCell align="center">{m.mapVal}</TableCell>
                          <TableCell align="center">{m.speed}</TableCell>
                          <TableCell align="center">{m.requirements.gpu ? 'Yes' : 'No'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Model Categories */}
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Models" />
            <Tab label="YOLO Family" />
            <Tab label="Vajra" />
            <Tab label="Recommended" />
          </Tabs>

          <Grid container spacing={2}>
            {Object.values(MODEL_CONFIGS)
              .filter(model => {
                if (tabValue === 0) return true;
                if (tabValue === 1) return model.family === 'yolo';
                if (tabValue === 2) return model.family === 'vajra';
                if (tabValue === 3) return model.recommended;
                return true;
              })
              .map((model) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={model.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      border: compareModels.includes(model.id) ? '2px solid' : '1px solid',
                      borderColor: compareModels.includes(model.id) ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      cursor: compareMode ? 'pointer' : 'default',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: compareMode ? 'translateY(-2px)' : 'none',
                      },
                    }}
                    onClick={() => compareMode && toggleCompareModel(model.id)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {model.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={model.version}
                            sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
                          />
                        </Box>
                        {model.recommended && (
                          <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, minHeight: 32 }}>
                        {model.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Tooltip title="Parameters">
                          <Chip size="small" icon={<MemoryIcon sx={{ fontSize: 12 }} />} label={model.params} sx={{ height: 20, fontSize: '0.6rem' }} />
                        </Tooltip>
                        <Tooltip title="mAP on COCO">
                          <Chip size="small" label={`${model.mapVal} mAP`} sx={{ height: 20, fontSize: '0.6rem' }} />
                        </Tooltip>
                        <Tooltip title="Inference Speed">
                          <Chip size="small" icon={<SpeedIcon sx={{ fontSize: 12 }} />} label={model.speed} sx={{ height: 20, fontSize: '0.6rem' }} />
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Model History */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Training History
          </Typography>
          <Tabs value={historyTabValue} onChange={(_, v) => setHistoryTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="All Models" />
            <Tab label="Completed" />
          </Tabs>

          <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Architecture</TableCell>
                  <TableCell>Dataset</TableCell>
                  <TableCell align="center">mAP</TableCell>
                  <TableCell align="center">Precision</TableCell>
                  <TableCell align="center">Recall</TableCell>
                  <TableCell align="center">Accuracy</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {models
                  .filter((m) => historyTabValue === 0 || m.status === 'completed')
                  .map((model) => (
                    <TableRow key={model._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(model.status)}
                          <Chip
                            size="small"
                            label={model.status}
                            sx={{
                              bgcolor: `${getStatusColor(model.status)}20`,
                              color: getStatusColor(model.status),
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {model.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={model.baseModel || model.version || 'N/A'} 
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>{model.dataset?.name || 'N/A'}</TableCell>
                      <TableCell align="center">
                        {model.status === 'completed'
                          ? formatPercentMetric(model.metrics?.mAP ?? model.metrics?.mAP50, '0.0%')
                          : formatPercentMetric(model.metrics?.mAP ?? model.metrics?.mAP50, '--')}
                      </TableCell>
                      <TableCell align="center">
                        {model.status === 'completed'
                          ? formatPercentMetric(model.metrics?.precision, '0.0%')
                          : formatPercentMetric(model.metrics?.precision, '--')}
                      </TableCell>
                      <TableCell align="center">
                        {model.status === 'completed'
                          ? formatPercentMetric(model.metrics?.recall, '0.0%')
                          : formatPercentMetric(model.metrics?.recall, '--')}
                      </TableCell>
                      <TableCell align="center">
                        {model.status === 'completed'
                          ? formatPercentMetric(
                            model.metrics?.accuracy ?? ((Number(model.metrics?.precision) + Number(model.metrics?.recall)) / 2),
                            '0.0%'
                          )
                          : '--'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(model.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell align="center">
                        {model.status === 'completed' && (
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => viewTrainingResults(model)}
                              sx={{ fontSize: '0.7rem' }}
                            >
                              View Results
                            </Button>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => viewTrainingResults(model)}
                              sx={{ fontSize: '0.7rem' }}
                            >
                              Benchmark
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No models trained yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Training Configuration Dialog */}
      <Dialog
        open={trainingDialogOpen}
        onClose={() => setTrainingDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ModelIcon color="primary" />
          Configure Model Training
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Dataset Selection */}
            <TextField
              select
              fullWidth
              label="Select Dataset"
              value={trainingConfig.datasetId}
              onChange={(e) =>
                setTrainingConfig({ ...trainingConfig, datasetId: e.target.value })
              }
              margin="normal"
              required
            >
              {datasets.map((dataset) => (
                <MenuItem key={dataset._id} value={dataset._id}>
                  {dataset.name} ({dataset.imageCount} images)
                </MenuItem>
              ))}
            </TextField>

            {selectedDataset && (
              <Box sx={{ mt: 1.5 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Split preview: Train {estimatedTrainCount}, Val {estimatedValCount}, Test {estimatedTestCount} images.
                </Alert>
                {datasetImages < 120 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Dataset is small ({datasetImages} images). Consider adding more fire and no-fire scenes for stable training.
                  </Alert>
                )}
                {estimatedValCount < 15 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    Validation set is too small ({estimatedValCount} images). Metrics may be unstable.
                  </Alert>
                )}
                {labelDensity < 0.3 && (
                  <Alert severity="warning">
                    Low annotation density detected ({labelDensity.toFixed(2)} labels/image). Check for missing labels.
                  </Alert>
                )}
              </Box>
            )}

            {/* Model Family Selection */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Model Architecture Family
              </Typography>
              <ToggleButtonGroup
                value={selectedFamily}
                exclusive
                onChange={handleFamilyChange}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="yolo" sx={{ px: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>YOLO</Typography>
                    <Typography variant="caption" color="text.secondary">v8-v12</Typography>
                  </Box>
                </ToggleButton>
                <ToggleButton value="vajra" sx={{ px: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Vajra</Typography>
                    <Typography variant="caption" color="text.secondary">v1-v2</Typography>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* YOLO Version Selection */}
            {selectedFamily === 'yolo' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  YOLO Version
                </Typography>
                <ToggleButtonGroup
                  value={selectedVersion}
                  exclusive
                  onChange={handleVersionChange}
                  size="small"
                >
                  {YOLO_VERSIONS.map(v => (
                    <ToggleButton key={v} value={v} sx={{ px: 2 }}>
                      {v.toUpperCase()}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Model Size Selection */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Select Model Size
              </Typography>
              <Grid container spacing={2}>
                {getAvailableModels().map((model) => (
                  <Grid item xs={12} sm={6} md={4} key={model.id}>
                    <Card
                      variant="outlined"
                      onClick={() => handleModelSelect(model.id)}
                      sx={{
                        cursor: 'pointer',
                        border: selectedModel === model.id ? '2px solid' : '1px solid',
                        borderColor: selectedModel === model.id ? 'primary.main' : 'divider',
                        bgcolor: selectedModel === model.id ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {model.name}
                          </Typography>
                          {model.recommended && (
                            <Chip
                              size="small"
                              icon={<StarIcon sx={{ fontSize: 14 }} />}
                              label="Recommended"
                              color="primary"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {model.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip size="small" label={`${model.params} params`} sx={{ height: 20, fontSize: '0.65rem' }} />
                          <Chip size="small" label={`${model.mapVal} mAP`} sx={{ height: 20, fontSize: '0.65rem' }} />
                          <Chip size="small" label={model.speed} sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Box>
                        {model.requirements.gpu && (
                          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                            <MemoryIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            Requires GPU ({model.requirements.minRam} RAM)
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Training Presets */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Training Preset
              </Typography>
              <ToggleButtonGroup
                value={trainingPreset}
                exclusive
                onChange={(e, v) => v && handlePresetChange(v)}
                size="small"
                fullWidth
              >
                {Object.entries(TRAINING_PRESETS).map(([key, preset]) => (
                  <ToggleButton key={key} value={key}>
                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{preset.name}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }} color="text.secondary">
                        {preset.epochs} epochs
                      </Typography>
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Model Name & Description */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Model Name"
                  value={trainingConfig.name}
                  onChange={(e) =>
                    setTrainingConfig({ ...trainingConfig, name: e.target.value })
                  }
                  placeholder="Fire Detection Model"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={trainingConfig.description}
                  onChange={(e) =>
                    setTrainingConfig({ ...trainingConfig, description: e.target.value })
                  }
                />
              </Grid>
            </Grid>

            {/* Advanced Settings */}
            <Accordion 
              expanded={showAdvanced} 
              onChange={() => setShowAdvanced(!showAdvanced)}
              sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.02)' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon fontSize="small" />
                  <Typography>Advanced Training Settings</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Epochs: {trainingConfig.epochs}
                    </Typography>
                    <Slider
                      value={trainingConfig.epochs}
                      onChange={(_, value) =>
                        setTrainingConfig({ ...trainingConfig, epochs: value })
                      }
                      min={10}
                      max={300}
                      step={10}
                      marks={[
                        { value: 50, label: '50' },
                        { value: 100, label: '100' },
                        { value: 200, label: '200' },
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Batch Size: {trainingConfig.batchSize}
                    </Typography>
                    <Slider
                      value={trainingConfig.batchSize}
                      onChange={(_, value) =>
                        setTrainingConfig({ ...trainingConfig, batchSize: value })
                      }
                      min={4}
                      max={64}
                      step={4}
                      marks={[
                        { value: 8, label: '8' },
                        { value: 16, label: '16' },
                        { value: 32, label: '32' },
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Image Size: {trainingConfig.imgSize}px
                    </Typography>
                    <Slider
                      value={trainingConfig.imgSize}
                      onChange={(_, value) =>
                        setTrainingConfig({ ...trainingConfig, imgSize: value })
                      }
                      min={320}
                      max={1280}
                      step={32}
                      marks={[
                        { value: 416, label: '416' },
                        { value: 640, label: '640' },
                        { value: 1024, label: '1024' },
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Early Stop Patience: {trainingConfig.patience}
                    </Typography>
                    <Slider
                      value={trainingConfig.patience}
                      onChange={(_, value) =>
                        setTrainingConfig({ ...trainingConfig, patience: value })
                      }
                      min={5}
                      max={50}
                      step={5}
                      marks={[
                        { value: 10, label: '10' },
                        { value: 20, label: '20' },
                        { value: 30, label: '30' },
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Optimizer"
                      value={trainingConfig.optimizer}
                      onChange={(e) =>
                        setTrainingConfig({ ...trainingConfig, optimizer: e.target.value })
                      }
                    >
                      <MenuItem value="AdamW">AdamW</MenuItem>
                      <MenuItem value="SGD">SGD</MenuItem>
                      <MenuItem value="Adam">Adam</MenuItem>
                      <MenuItem value="RMSprop">RMSprop</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Data Augmentation"
                      value={augmentationPreset}
                      onChange={(e) => {
                        setAugmentationPreset(e.target.value);
                        setTrainingConfig({ 
                          ...trainingConfig, 
                          augmentation: AUGMENTATION_PRESETS[e.target.value] 
                        });
                      }}
                    >
                      {Object.entries(AUGMENTATION_PRESETS).map(([key, preset]) => (
                        <MenuItem key={key} value={key}>
                          {preset.name} - {preset.description}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Selected Model Summary */}
            {MODEL_CONFIGS[selectedModel] && (
              <Alert 
                severity="info" 
                sx={{ mt: 2 }}
                icon={<InfoIcon />}
              >
                <Typography variant="subtitle2">
                  Selected: {MODEL_CONFIGS[selectedModel].name}
                </Typography>
                <Typography variant="body2">
                  {MODEL_CONFIGS[selectedModel].params} parameters | 
                  {MODEL_CONFIGS[selectedModel].flops} FLOPs | 
                  ~{MODEL_CONFIGS[selectedModel].speed} inference time
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTrainingDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartTraining}
            disabled={!trainingConfig.datasetId}
            startIcon={<StartIcon />}
          >
            Start Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Training Results Dialog */}
      <Dialog
        open={resultsDialogOpen}
        onClose={() => setResultsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ModelIcon color="primary" />
            <Box>
              <Typography variant="h6">
                Training Results - {selectedModelResults?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedModelResults?.baseModel} | {selectedModelResults?.dataset?.name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {resultsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <LinearProgress sx={{ width: '50%' }} />
            </Box>
          ) : (
            <Box>
              {/* Metrics Summary */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">mAP50</Typography>
                      <Typography variant="h4" color="success.main">
                        {formatDualMetric(summaryMetrics.mAP50).percent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw: {formatDualMetric(summaryMetrics.mAP50).raw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Precision</Typography>
                      <Typography variant="h4" color="info.main">
                        {formatDualMetric(summaryMetrics.precision).percent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw: {formatDualMetric(summaryMetrics.precision).raw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Recall</Typography>
                      <Typography variant="h4" color="warning.main">
                        {formatDualMetric(summaryMetrics.recall).percent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw: {formatDualMetric(summaryMetrics.recall).raw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">F1 Score</Typography>
                      <Typography variant="h4" color="secondary.main">
                        {formatDualMetric(summaryMetrics.f1Score).percent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw: {formatDualMetric(summaryMetrics.f1Score).raw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Accuracy</Typography>
                      <Typography variant="h4" sx={{ color: '#00bcd4' }}>
                        {formatDualMetric(summaryMetrics.accuracy).percent}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        raw: {formatDualMetric(summaryMetrics.accuracy).raw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {resultsData?.trainingSummary && (
                <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Best vs Last Epoch</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Best epoch {resultsData.trainingSummary.bestEpoch} of {resultsData.trainingSummary.totalEpochs} based on mAP50.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Best Epoch ({resultsData.trainingSummary.bestEpoch})</Typography>
                          <Typography variant="body2">mAP50: {formatPercentMetric(resultsData.trainingSummary.bestMetrics?.mAP50, '--')} ({formatExactMetric(resultsData.trainingSummary.bestMetrics?.mAP50, '--')})</Typography>
                          <Typography variant="body2">F1: {formatPercentMetric(resultsData.trainingSummary.bestMetrics?.f1Score, '--')} ({formatExactMetric(resultsData.trainingSummary.bestMetrics?.f1Score, '--')})</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Last Epoch ({resultsData.trainingSummary.lastEpoch})</Typography>
                          <Typography variant="body2">mAP50: {formatPercentMetric(resultsData.trainingSummary.lastMetrics?.mAP50, '--')} ({formatExactMetric(resultsData.trainingSummary.lastMetrics?.mAP50, '--')})</Typography>
                          <Typography variant="body2">F1: {formatPercentMetric(resultsData.trainingSummary.lastMetrics?.f1Score, '--')} ({formatExactMetric(resultsData.trainingSummary.lastMetrics?.f1Score, '--')})</Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6">Benchmark Evaluation</Typography>
                    <Button
                      variant="contained"
                      onClick={handleRunBenchmark}
                      disabled={benchmarkLoading || !selectedModelResults?._id}
                    >
                      {benchmarkLoading ? 'Running...' : 'Run Benchmark'}
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Uses fixed images in `yolo-service/benchmark/fire` and `yolo-service/benchmark/no_fire`.
                  </Typography>
                  {benchmarkCoverage && (
                    <Alert severity={benchmarkCoverage.ready ? 'info' : 'warning'} sx={{ mb: 1.5 }}>
                      Coverage: Fire {benchmarkCoverage.fireImages}, No-Fire {benchmarkCoverage.noFireImages}, Total {benchmarkCoverage.totalImages}
                      {!benchmarkCoverage.ready && ' - add benchmark images before running.'}
                    </Alert>
                  )}
                  {benchmarkError && (
                    <Alert severity="error" sx={{ mb: 1.5 }}>{benchmarkError}</Alert>
                  )}
                  {benchmarkResult ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Confusion Matrix</Typography>
                          <Typography variant="body2">TP: {benchmarkResult.confusionMatrix?.tp ?? 0}</Typography>
                          <Typography variant="body2">FP: {benchmarkResult.confusionMatrix?.fp ?? 0}</Typography>
                          <Typography variant="body2">FN: {benchmarkResult.confusionMatrix?.fn ?? 0}</Typography>
                          <Typography variant="body2">TN: {benchmarkResult.confusionMatrix?.tn ?? 0}</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Benchmark Metrics</Typography>
                          <Typography variant="body2">Precision: {formatPercentMetric(benchmarkResult.metrics?.precision, '--')} ({formatExactMetric(benchmarkResult.metrics?.precision, '--')})</Typography>
                          <Typography variant="body2">Recall: {formatPercentMetric(benchmarkResult.metrics?.recall, '--')} ({formatExactMetric(benchmarkResult.metrics?.recall, '--')})</Typography>
                          <Typography variant="body2">F1: {formatPercentMetric(benchmarkResult.metrics?.f1Score, '--')} ({formatExactMetric(benchmarkResult.metrics?.f1Score, '--')})</Typography>
                          <Typography variant="body2">Accuracy: {formatPercentMetric(benchmarkResult.metrics?.accuracy, '--')} ({formatExactMetric(benchmarkResult.metrics?.accuracy, '--')})</Typography>
                          <Typography variant="body2">False Positive Rate: {formatPercentMetric(benchmarkResult.metrics?.falsePositiveRate, '--')}</Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info">No benchmark run yet for this model.</Alert>
                  )}
                </CardContent>
              </Card>

              {/* Prediction Images with Bounding Boxes */}
              <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>
                Single Image Test
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} sx={{ mb: 1.5 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">
                      Confidence Threshold: {inferenceTuning.confThreshold.toFixed(2)}
                    </Typography>
                    <Slider
                      value={inferenceTuning.confThreshold}
                      onChange={(_, value) => setInferenceTuning((prev) => ({ ...prev, confThreshold: Number(value) }))}
                      min={0.25}
                      max={0.9}
                      step={0.05}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">
                      Min Box Area: {inferenceTuning.minBoxArea}px
                    </Typography>
                    <Slider
                      value={inferenceTuning.minBoxArea}
                      onChange={(_, value) => setInferenceTuning((prev) => ({ ...prev, minBoxArea: Number(value) }))}
                      min={100}
                      max={5000}
                      step={100}
                    />
                  </Grid>
                </Grid>
                <Button variant="outlined" component="label" disabled={singleTestLoading || !selectedModelResults?._id}>
                  Upload One Image
                  <input type="file" hidden accept="image/*" onChange={handleSingleImageTest} />
                </Button>
                {singleTestLoading && <LinearProgress sx={{ mt: 1.5 }} />}
                {singleTestError && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {singleTestError}
                  </Alert>
                )}
                {singleTestImage && (
                  <Card sx={{ mt: 2 }}>
                    <Box
                      component="img"
                      src={singleTestImage}
                      alt="Single image prediction with bounding boxes"
                      sx={{ width: '100%', maxHeight: 520, objectFit: 'contain', bgcolor: '#0a0a14' }}
                    />
                  </Card>
                )}
              </Box>

              {/* Prediction Images with Bounding Boxes */}
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SuccessIcon color="success" />
                Detection Results (Images with Bounding Boxes)
              </Typography>
              
              {resultsData?.predictionImages?.length > 0 ? (
                <Box>
                  <Card sx={{ mb: 2 }}>
                    <Box
                      component="img"
                      src={`${BACKEND_ORIGIN}/api/training/${selectedModelResults?._id}/image/${selectedResultImage || resultsData.predictionImages[0]}`}
                      alt="Selected prediction"
                      sx={{
                        width: '100%',
                        maxHeight: 520,
                        objectFit: 'contain',
                        bgcolor: '#0a0a14',
                      }}
                    />
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {(selectedResultImage || resultsData.predictionImages[0]).split('/').pop()}
                      </Typography>
                    </Box>
                  </Card>

                  <Grid container spacing={1.5}>
                    {resultsData.predictionImages.map((img, idx) => (
                      <Grid item xs={6} sm={4} md={3} key={idx}>
                        <Card
                          onClick={() => setSelectedResultImage(img)}
                          sx={{
                            cursor: 'pointer',
                            border: (selectedResultImage || resultsData.predictionImages[0]) === img
                              ? '2px solid'
                              : '1px solid',
                            borderColor: (selectedResultImage || resultsData.predictionImages[0]) === img
                              ? 'primary.main'
                              : 'divider',
                          }}
                        >
                          <Box
                            component="img"
                            src={`${BACKEND_ORIGIN}/api/training/${selectedModelResults?._id}/image/${img}`}
                            alt={`Prediction ${idx + 1}`}
                            sx={{ width: '100%', height: 110, objectFit: 'cover', bgcolor: '#0a0a14' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <Alert severity="info">
                  No prediction images available. Training results may not include validation predictions.
                </Alert>
              )}

              {/* Confusion Matrix */}
              {confusionPlots.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MetricIcon color="primary" />
                    Confusion Matrix
                  </Typography>
                  <Grid container spacing={2}>
                    {confusionPlots.map((plot, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Card>
                          <Box
                            component="img"
                            src={`${BACKEND_ORIGIN}/api/training/${selectedModelResults?._id}/image/${plot}`}
                            alt={plot}
                            sx={{ width: '100%', height: 'auto' }}
                          />
                          <Box sx={{ p: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {plot.replace('.png', '').replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* Training Plots */}
              {trainingPlots.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon color="primary" />
                    Training Plots
                  </Typography>
                  <Grid container spacing={2}>
                    {trainingPlots.map((plot, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Card>
                          <Box
                            component="img"
                            src={`${BACKEND_ORIGIN}/api/training/${selectedModelResults?._id}/image/${plot}`}
                            alt={plot}
                            sx={{
                              width: '100%',
                              height: 'auto',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <Box sx={{ p: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {plot.replace('.png', '').replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {!resultsData?.hasResults && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Training results not available. Please ensure the YOLO service is running and training completed successfully.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Training;
