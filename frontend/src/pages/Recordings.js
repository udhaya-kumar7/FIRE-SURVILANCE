import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Checkbox,
  Toolbar,
  Tooltip,
  Menu,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Videocam as VideocamIcon,
  AccessTime as TimeIcon,
  LocalFireDepartment as FireIcon,
  FilterList as FilterIcon,
  SelectAll as SelectAllIcon,
  DeleteSweep as DeleteSweepIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Recordings = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, recording: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, recording: null });
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      
      const response = await axios.get(`${API_URL}/recordings`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      
      setRecordings(response.data.recordings);
      setTotalPages(response.data.totalPages);
      setError('');
    } catch (err) {
      setError('Failed to load recordings');
      console.error('Error fetching recordings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const handlePlayRecording = (id) => {
    navigate(`/recordings/${id}`);
  };

  const handleEditSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/recordings/${editDialog.recording._id}`,
        {
          name: editDialog.recording.name,
          description: editDialog.recording.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditDialog({ open: false, recording: null });
      fetchRecordings();
    } catch (err) {
      console.error('Error updating recording:', err);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/recordings/${deleteDialog.recording._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteDialog({ open: false, recording: null });
      fetchRecordings();
    } catch (err) {
      console.error('Error deleting recording:', err);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/recordings/delete-multiple`,
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedIds([]);
      fetchRecordings();
    } catch (err) {
      console.error('Error deleting recordings:', err);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === recordings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recordings.map(r => r._id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recording': return 'error';
      case 'completed': return 'success';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
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
              Recordings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage recorded detection sessions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchRecordings} sx={{ color: 'primary.main' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter">
              <IconButton 
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                sx={{ color: statusFilter ? 'primary.main' : 'inherit' }}
              >
                <FilterIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
        >
          <MenuItem 
            onClick={() => { setStatusFilter(''); setFilterAnchor(null); }}
            selected={!statusFilter}
          >
            All
          </MenuItem>
          <MenuItem 
            onClick={() => { setStatusFilter('completed'); setFilterAnchor(null); }}
            selected={statusFilter === 'completed'}
          >
            Completed
          </MenuItem>
          <MenuItem 
            onClick={() => { setStatusFilter('recording'); setFilterAnchor(null); }}
            selected={statusFilter === 'recording'}
          >
            Recording
          </MenuItem>
        </Menu>
      </Paper>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Paper sx={{ mb: 2, p: 1, bgcolor: 'rgba(255, 87, 34, 0.1)' }}>
          <Toolbar variant="dense">
            <Typography sx={{ flex: 1 }}>
              {selectedIds.length} selected
            </Typography>
            <Button
              startIcon={<DeleteSweepIcon />}
              color="error"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          </Toolbar>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : recordings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <VideocamIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No recordings yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a recording from the Live Detection page
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/detection')}
          >
            Go to Live Detection
          </Button>
        </Paper>
      ) : (
        <>
          {/* Select All */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={selectedIds.length === recordings.length}
              indeterminate={selectedIds.length > 0 && selectedIds.length < recordings.length}
              onChange={handleSelectAll}
            />
            <Typography variant="body2" color="text.secondary">
              Select All
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {recordings.map((recording) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={recording._id}>
                <Card
                  sx={{
                    bgcolor: '#1a1a2e',
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: selectedIds.includes(recording._id) ? '2px solid' : '1px solid',
                    borderColor: selectedIds.includes(recording._id) ? 'primary.main' : 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  {/* Thumbnail */}
                  <Box sx={{ position: 'relative' }}>
                    <Checkbox
                      sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1 }}
                      checked={selectedIds.includes(recording._id)}
                      onChange={() => handleToggleSelect(recording._id)}
                    />
                    <CardMedia
                      component="img"
                      height="140"
                      image={recording.thumbnail || '/placeholder-video.png'}
                      alt={recording.name}
                      sx={{ 
                        bgcolor: '#0d0d1a',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                      onClick={() => handlePlayRecording(recording._id)}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjMWExYTJlIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBUaHVtYm5haWw8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    <Chip
                      label={recording.status}
                      size="small"
                      color={getStatusColor(recording.status)}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                    {/* Play overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        cursor: 'pointer',
                        '&:hover': { opacity: 1 },
                      }}
                      onClick={() => handlePlayRecording(recording._id)}
                    >
                      <PlayIcon sx={{ fontSize: 48, color: 'white' }} />
                    </Box>
                  </Box>

                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {recording.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDate(recording.createdAt)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<TimeIcon sx={{ fontSize: 16 }} />}
                        label={formatDuration(recording.duration)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<VideocamIcon sx={{ fontSize: 16 }} />}
                        label={`${recording.totalFrames || 0} frames`}
                        size="small"
                        variant="outlined"
                      />
                      {recording.detectionCount > 0 && (
                        <Chip
                          icon={<FireIcon sx={{ fontSize: 16 }} />}
                          label={`${recording.detectionCount} detections`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      startIcon={<PlayIcon />}
                      onClick={() => handlePlayRecording(recording._id)}
                    >
                      Play
                    </Button>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => setEditDialog({ open: true, recording: { ...recording } })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, recording })}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, recording: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Recording</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={editDialog.recording?.name || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              recording: { ...editDialog.recording, name: e.target.value }
            })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={editDialog.recording?.description || ''}
            onChange={(e) => setEditDialog({
              ...editDialog,
              recording: { ...editDialog.recording, description: e.target.value }
            })}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, recording: null })}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, recording: null })}
      >
        <DialogTitle>Delete Recording?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.recording?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, recording: null })}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recordings;
