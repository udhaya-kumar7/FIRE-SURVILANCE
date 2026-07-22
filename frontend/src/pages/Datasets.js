import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography, Button,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Chip, IconButton, Menu, MenuItem, Alert, Tooltip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon, MoreVert as MoreIcon, Delete as DeleteIcon,
  Edit as EditIcon, Visibility as ViewIcon, Image as ImageIcon,
  Description as FileIcon, CheckCircle as ReadyIcon, Error as ErrorIcon,
  HourglassEmpty as ProcessingIcon, Storage as StorageIcon,
  FolderZip as ZipIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import { format } from 'date-fns';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const STATUS_CONFIG = {
  ready: { color: '#00e676', label: 'Ready', icon: ReadyIcon },
  error: { color: '#ff1744', label: 'Error', icon: ErrorIcon },
  processing: { color: '#ffa726', label: 'Processing', icon: ProcessingIcon },
  uploading: { color: '#29b6f6', label: 'Uploading', icon: ProcessingIcon },
};

const getStatusCfg = (status) => STATUS_CONFIG[status] || { color: '#6060a0', label: status, icon: StorageIcon };

const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [error, setError] = useState('');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/datasets');
      setDatasets(response.data.datasets || []);
    } catch {
      setError('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDatasets(); }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setFormData((prev) => ({ ...prev, name: file.name.replace('.zip', '') }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    const formDataObj = new FormData();
    formDataObj.append('dataset', selectedFile);
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    try {
      await api.post('/datasets/upload', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setFormData({ name: '', description: '' });
      fetchDatasets();
    } catch {
      setError('Failed to upload dataset');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDataset = async () => {
    if (!selectedDataset) return;
    try {
      await api.delete(`/datasets/${selectedDataset._id}`);
      setMenuAnchor(null);
      setSelectedDataset(null);
      fetchDatasets();
    } catch {
      setError('Failed to delete dataset');
    }
  };

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5,
            background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Datasets
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Manage your fire detection training datasets · {datasets.length} total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon sx={{ fontSize: 17 }} />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{ height: 40, borderRadius: '12px', px: 2.5, fontSize: '0.875rem' }}
        >
          Upload Dataset
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LinearProgress sx={{ borderRadius: 2 }} />
      ) : datasets.length === 0 ? (
        <Card sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, px: 4,
          border: '2px dashed rgba(255,255,255,0.08)', background: 'rgba(12,12,32,0.6)',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px', mb: 3,
            background: 'rgba(255, 69, 0, 0.08)', border: '1px solid rgba(255, 69, 0, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <StorageIcon sx={{ fontSize: 36, color: '#ff4500', opacity: 0.7 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#d0d0e8', mb: 1 }}>
            No datasets yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', mb: 3, textAlign: 'center', maxWidth: 340 }}>
            Upload your first dataset to start training fire detection models. Supports YOLO format ZIP files.
          </Typography>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadDialogOpen(true)}
            sx={{ borderRadius: '12px', px: 3 }}>
            Upload First Dataset
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {datasets.map((dataset) => {
            const cfg = getStatusCfg(dataset.status);
            const StatusIcon = cfg.icon;
            return (
              <Grid item xs={12} sm={6} lg={4} key={dataset._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                  {/* Top accent bar */}
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}44)`,
                  }} />
                  <CardContent sx={{ flex: 1, pt: '20px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '11px',
                          background: `${cfg.color}12`, border: `1px solid ${cfg.color}28`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <StatusIcon sx={{ fontSize: 19, color: cfg.color }} />
                        </Box>
                        <Chip size="small" label={cfg.label} sx={{
                          height: 22, bgcolor: `${cfg.color}12`, color: cfg.color,
                          fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${cfg.color}28`,
                          textTransform: 'capitalize',
                        }} />
                      </Box>
                      <Tooltip title="Options" arrow>
                        <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setSelectedDataset(dataset); }}
                          sx={{ color: '#6060a0' }}>
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#d0d0e8', mb: 0.5 }} noWrap>
                      {dataset.name}
                    </Typography>
                    {dataset.description && (
                      <Typography variant="body2" sx={{
                        color: '#6060a0', fontSize: '0.8125rem', mb: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {dataset.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 1.5, flexWrap: 'wrap' }}>
                      {[
                        { icon: <ImageIcon sx={{ fontSize: 14 }} />, value: `${dataset.imageCount || 0} images` },
                        { icon: <FileIcon sx={{ fontSize: 14 }} />, value: `${dataset.labelCount || 0} labels` },
                      ].map((item) => (
                        <Box key={item.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ color: '#4040a0' }}>{item.icon}</Box>
                          <Typography variant="caption" sx={{ color: '#6060a0', fontWeight: 500, fontSize: '0.72rem' }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: '14px', pt: 0, justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.7rem' }}>
                      {formatFileSize(dataset.fileSize)} · {format(new Date(dataset.createdAt), 'MMM d, yyyy')}
                    </Typography>
                    <Button size="small" startIcon={<ViewIcon sx={{ fontSize: 14 }} />}
                      sx={{ height: 28, borderRadius: '8px', fontSize: '0.75rem', px: 1.5 }}>
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => !uploading && setUploadDialogOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}>
        <Box sx={{ height: '3px', background: 'linear-gradient(90deg, #ff4500, #ff8c00, transparent)' }} />
        <DialogTitle sx={{ p: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(255,69,0,0.12)',
              border: '1px solid rgba(255,69,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadIcon sx={{ fontSize: 18, color: '#ff4500' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>Upload Dataset</Typography>
          </Box>
          <IconButton size="small" onClick={() => !uploading && setUploadDialogOpen(false)}
            sx={{ color: '#6060a0' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1 }}>
          {/* Dropzone */}
          <Box {...getRootProps()} sx={{
            border: `2px dashed ${isDragActive ? '#ff4500' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '16px',
            p: 4, textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? 'rgba(255, 69, 0, 0.06)' : 'rgba(6, 6, 18, 0.4)',
            transition: 'all 0.25s ease',
            mb: 2.5,
            '&:hover': { borderColor: 'rgba(255, 69, 0, 0.4)', background: 'rgba(255, 69, 0, 0.04)' },
          }}>
            <input {...getInputProps()} />
            <Box sx={{
              width: 52, height: 52, borderRadius: '14px', mx: 'auto', mb: 2,
              background: isDragActive ? 'rgba(255,69,0,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isDragActive ? 'rgba(255,69,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}>
              <ZipIcon sx={{ fontSize: 26, color: isDragActive ? '#ff4500' : '#6060a0' }} />
            </Box>
            {selectedFile ? (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#d0d0e8', mb: 0.5 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#00e676', fontWeight: 600 }}>
                  {formatFileSize(selectedFile.size)} · Ready to upload
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#a0a0c8', mb: 0.5 }}>
                  {isDragActive ? 'Drop your dataset here' : 'Drag & drop your dataset'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5050a0' }}>
                  or click to browse · ZIP files only · max 500MB
                </Typography>
              </Box>
            )}
          </Box>

          <TextField fullWidth label="Dataset Name" value={formData.name} size="small"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }} disabled={uploading} />
          <TextField fullWidth label="Description (Optional)" value={formData.description} size="small"
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline rows={2} disabled={uploading} sx={{ mb: 2 }} />

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#8080a8', fontWeight: 600 }}>Uploading...</Typography>
                <Typography variant="caption" sx={{ color: '#ff6b35', fontWeight: 700, fontFamily: 'monospace' }}>
                  {uploadProgress}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Alert severity="info" sx={{ borderRadius: '12px', mb: 1 }}>
            Upload a ZIP with YOLO-format labels. Structure: <code>images/</code> and <code>labels/</code> subdirectories.
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}
            sx={{ borderRadius: '10px', px: 2.5, height: 38 }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpload}
            disabled={!selectedFile || uploading || !formData.name}
            sx={{ borderRadius: '10px', px: 3, height: 38 }}>
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload Dataset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dataset Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setSelectedDataset(null); }}
        PaperProps={{ sx: { minWidth: 160 } }}>
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: '#8080a8' }} />
          <Typography variant="body2">Edit</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteDataset} sx={{ color: '#ff6b6b' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          <Typography variant="body2" sx={{ color: '#ff6b6b' }}>Delete</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Datasets;
