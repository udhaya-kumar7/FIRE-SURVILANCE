import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  CheckCircle as SafeIcon,
  Warning as WarningIcon,
  Error as AlertIcon,
  Visibility as ViewIcon,
  FilterAlt as FilterAltIcon,
  LocalFireDepartment as FireIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../services/api';

const getAlertColor = (level) => {
  switch (level) {
    case 'critical': return '#ff1744';
    case 'alert': return '#ff4500';
    case 'warning': return '#ffa726';
    default: return '#00e676';
  }
};

const getAlertBg = (level) => {
  switch (level) {
    case 'critical': return 'rgba(255, 23, 68, 0.08)';
    case 'alert': return 'rgba(255, 69, 0, 0.06)';
    case 'warning': return 'rgba(255, 167, 38, 0.06)';
    default: return 'transparent';
  }
};

const getAlertIcon = (level) => {
  const color = getAlertColor(level);
  switch (level) {
    case 'critical':
    case 'alert':
      return <AlertIcon sx={{ color, fontSize: 18 }} />;
    case 'warning':
      return <WarningIcon sx={{ color, fontSize: 18 }} />;
    default:
      return <SafeIcon sx={{ color, fontSize: 18 }} />;
  }
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    fireDetected: '',
    alertLevel: '',
    source: '',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page + 1);
      params.append('limit', rowsPerPage);
      if (filters.fireDetected) params.append('fireDetected', filters.fireDetected);
      if (filters.alertLevel) params.append('alertLevel', filters.alertLevel);
      if (filters.source) params.append('source', filters.source);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/detection/logs?${params.toString()}`);
      setLogs(response.data.logs);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, rowsPerPage]);

  const handleFilterApply = () => {
    setPage(0);
    setFilterOpen(false);
    fetchLogs();
  };

  const handleFilterReset = () => {
    setFilters({ fireDetected: '', alertLevel: '', source: '', startDate: '', endDate: '' });
    setPage(0);
    setFilterOpen(false);
    fetchLogs();
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.fireDetected === 'true') params.append('fireDetectedOnly', 'true');

      const response = await api.get(`/detection/logs/export/csv?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `detection-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export logs');
    }
  };

  const handleAcknowledge = async (logId) => {
    try {
      await api.post(`/detection/logs/${logId}/acknowledge`, {
        notes: 'Acknowledged via dashboard',
      });
      fetchLogs();
    } catch (error) {
      console.error('Acknowledge error:', error);
      setError('Failed to acknowledge alert');
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <Box className="page-enter">
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            Logs & Monitoring
          </Typography>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            View and export detection history
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterAltIcon sx={{ fontSize: 16 }} />}
            onClick={() => setFilterOpen(!filterOpen)}
            sx={{
              height: 38,
              borderRadius: '10px',
              fontSize: '0.8125rem',
              position: 'relative',
            }}
          >
            Filters
            {activeFiltersCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                {activeFiltersCount}
              </Box>
            )}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportCSV}
            sx={{ height: 38, borderRadius: '10px', fontSize: '0.8125rem' }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2.5, borderRadius: '12px' }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Filter Panel */}
      <Collapse in={filterOpen}>
        <Card sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: '18px 20px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: '#d0d0e8', fontSize: '0.875rem' }}
              >
                Filter Logs
              </Typography>
              <IconButton size="small" onClick={() => setFilterOpen(false)} sx={{ color: '#6060a0' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={2} alignItems="flex-end">
              {[
                {
                  label: 'Fire Status',
                  key: 'fireDetected',
                  options: [
                    { value: '', label: 'All' },
                    { value: 'true', label: 'Fire Detected' },
                    { value: 'false', label: 'No Fire' },
                  ],
                },
                {
                  label: 'Alert Level',
                  key: 'alertLevel',
                  options: [
                    { value: '', label: 'All' },
                    { value: 'safe', label: 'Safe' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'alert', label: 'Alert' },
                    { value: 'critical', label: 'Critical' },
                  ],
                },
                {
                  label: 'Source',
                  key: 'source',
                  options: [
                    { value: '', label: 'All' },
                    { value: 'camera', label: 'Camera' },
                    { value: 'upload', label: 'Upload' },
                    { value: 'stream', label: 'Stream' },
                  ],
                },
              ].map((f) => (
                <Grid item xs={12} sm={6} md={2.4} key={f.key}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={f.label}
                    value={filters[f.key]}
                    onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                  >
                    {f.options.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleFilterApply}
                    sx={{ px: 2.5, height: 34, borderRadius: '8px', fontSize: '0.8rem' }}
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleFilterReset}
                    sx={{ px: 2.5, height: 34, borderRadius: '8px', fontSize: '0.8rem' }}
                  >
                    Reset
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Logs Table */}
      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Table Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2.5,
              py: 2,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#d0d0e8' }}>
                Detection History
              </Typography>
              {!loading && (
                <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.72rem' }}>
                  {totalCount.toLocaleString()} total records
                </Typography>
              )}
            </Box>
            <Tooltip title="Refresh" arrow>
              <IconButton
                onClick={fetchLogs}
                size="small"
                sx={{
                  width: 34,
                  height: 34,
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#6060a0',
                  '&:hover': { color: '#ff4500', border: '1px solid rgba(255, 69, 0, 0.3)' },
                }}
              >
                <RefreshIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {loading ? (
            <Box sx={{ px: 2.5, py: 1 }}>
              <LinearProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Status', 'Timestamp', 'Source', 'Confidence', 'Detections', 'Processing', 'Acknowledged', 'Actions'].map((h) => (
                        <TableCell
                          key={h}
                          align={['Confidence', 'Detections', 'Actions'].includes(h) ? 'center' : 'left'}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => {
                      const alertColor = getAlertColor(log.alertLevel);
                      return (
                        <TableRow
                          key={log._id}
                          sx={{
                            bgcolor: log.fireDetected ? getAlertBg(log.alertLevel) : 'transparent',
                          }}
                        >
                          {/* Status */}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getAlertIcon(log.alertLevel)}
                              <Chip
                                size="small"
                                label={log.alertLevel}
                                sx={{
                                  height: 22,
                                  bgcolor: `${alertColor}12`,
                                  color: alertColor,
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  textTransform: 'capitalize',
                                  letterSpacing: '0.03em',
                                  border: `1px solid ${alertColor}28`,
                                }}
                              />
                            </Box>
                          </TableCell>

                          {/* Timestamp */}
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#d0d0e8', fontSize: '0.8125rem', fontWeight: 500 }}>
                              {format(new Date(log.createdAt), 'MMM d, yyyy')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.7rem' }}>
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </Typography>
                          </TableCell>

                          {/* Source */}
                          <TableCell>
                            <Chip
                              size="small"
                              label={log.source}
                              sx={{
                                height: 22,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: '#8080a8',
                                fontWeight: 600,
                                fontSize: '0.68rem',
                                textTransform: 'capitalize',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            />
                          </TableCell>

                          {/* Confidence */}
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.825rem',
                                color: log.maxConfidence > 0.7 ? '#ff4500' : log.maxConfidence > 0.4 ? '#ffa726' : '#8080a8',
                                fontFamily: '"Space Grotesk", monospace',
                              }}
                            >
                              {log.maxConfidence ? `${(log.maxConfidence * 100).toFixed(1)}%` : '—'}
                            </Typography>
                          </TableCell>

                          {/* Detections count */}
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: '8px',
                                background: log.detections?.length > 0
                                  ? 'rgba(255, 69, 0, 0.12)'
                                  : 'rgba(255,255,255,0.04)',
                                border: log.detections?.length > 0
                                  ? '1px solid rgba(255, 69, 0, 0.25)'
                                  : '1px solid rgba(255,255,255,0.07)',
                                color: log.detections?.length > 0 ? '#ff6b35' : '#5050a0',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              {log.detections?.length || 0}
                            </Box>
                          </TableCell>

                          {/* Processing time */}
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#6060a0',
                                fontFamily: '"Space Grotesk", monospace',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            >
                              {log.processingTime}ms
                            </Typography>
                          </TableCell>

                          {/* Acknowledged */}
                          <TableCell>
                            {log.acknowledged ? (
                              <Chip
                                size="small"
                                label="Done"
                                sx={{
                                  height: 22,
                                  bgcolor: 'rgba(0, 230, 118, 0.08)',
                                  color: '#00e676',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  border: '1px solid rgba(0, 230, 118, 0.2)',
                                }}
                              />
                            ) : log.fireDetected ? (
                              <Tooltip title="Click to acknowledge" arrow>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleAcknowledge(log._id)}
                                  sx={{
                                    height: 24,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    px: 1.25,
                                    borderRadius: '6px',
                                    borderColor: 'rgba(255, 167, 38, 0.4)',
                                    color: '#ffa726',
                                    '&:hover': {
                                      borderColor: '#ffa726',
                                      background: 'rgba(255, 167, 38, 0.1)',
                                    },
                                  }}
                                >
                                  Pending
                                </Button>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#3030a0' }}>
                                N/A
                              </Typography>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center">
                            <Tooltip title="View Details" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(log)}
                                sx={{
                                  width: 30,
                                  height: 30,
                                  border: '1px solid rgba(255,255,255,0.07)',
                                  color: '#6060a0',
                                  '&:hover': {
                                    color: '#ff4500',
                                    border: '1px solid rgba(255, 69, 0, 0.3)',
                                    background: 'rgba(255, 69, 0, 0.08)',
                                  },
                                }}
                              >
                                <ViewIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <FilterIcon sx={{ fontSize: 40, color: '#3030a0', opacity: 0.6 }} />
                            <Typography variant="body2" sx={{ color: '#6060a0' }}>
                              No detection logs found
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#4040a0' }}>
                              Try adjusting your filters or start a detection session
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                sx={{
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  color: '#6060a0',
                  '& .MuiTablePagination-select': { color: '#d0d0e8' },
                  '& .MuiTablePagination-selectIcon': { color: '#6060a0' },
                  '& .MuiIconButton-root': { color: '#6060a0' },
                  '& .MuiIconButton-root:hover': { color: '#ff4500' },
                  '& .MuiTablePagination-displayedRows': { color: '#6060a0' },
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
          },
        }}
      >
        {/* Dialog top accent */}
        <Box
          sx={{
            height: '3px',
            background: selectedLog
              ? `linear-gradient(90deg, ${getAlertColor(selectedLog?.alertLevel)}, transparent)`
              : 'linear-gradient(90deg, #ff4500, transparent)',
          }}
        />
        <DialogTitle sx={{ p: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: selectedLog ? `${getAlertColor(selectedLog?.alertLevel)}14` : 'rgba(255,69,0,0.1)',
                border: `1px solid ${selectedLog ? getAlertColor(selectedLog?.alertLevel) + '28' : 'rgba(255,69,0,0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedLog && getAlertIcon(selectedLog.alertLevel)}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Detection Details
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setDetailDialogOpen(false)}
            sx={{ color: '#6060a0', '&:hover': { color: '#f0f0ff' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 3 }}>
          {selectedLog && (
            <Grid container spacing={2}>
              {[
                { label: 'Timestamp', value: format(new Date(selectedLog.createdAt), 'PPpp'), icon: <TimeIcon sx={{ fontSize: 14 }} /> },
                { label: 'Source', value: selectedLog.source, capitalize: true },
                { label: 'Fire Detected', value: selectedLog.fireDetected ? '🔥 Yes' : '✓ No' },
                { label: 'Alert Level', value: selectedLog.alertLevel, capitalize: true, color: getAlertColor(selectedLog.alertLevel) },
                { label: 'Max Confidence', value: selectedLog.maxConfidence ? `${(selectedLog.maxConfidence * 100).toFixed(2)}%` : 'N/A' },
                { label: 'Processing Time', value: `${selectedLog.processingTime}ms` },
              ].map((item) => (
                <Grid item xs={6} key={item.label}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      height: '100%',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {item.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: item.color || '#d0d0e8',
                        fontWeight: 600,
                        mt: 0.5,
                        fontSize: '0.875rem',
                        textTransform: item.capitalize ? 'capitalize' : 'none',
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}

              {/* Detections list */}
              <Grid item xs={12}>
                <Typography
                  variant="caption"
                  sx={{ color: '#5050a0', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                >
                  Detections ({selectedLog.detections?.length || 0})
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {selectedLog.detections?.length > 0 ? (
                    selectedLog.detections.map((det, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 69, 0, 0.06)',
                          border: '1px solid rgba(255, 69, 0, 0.15)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FireIcon sx={{ fontSize: 14, color: '#ff4500' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#d0d0e8', fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                            {det.class}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#ff6b35', fontSize: '0.875rem', fontFamily: '"Space Grotesk", monospace' }}>
                            {(det.confidence * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.68rem' }}>
                            {det.boundingBox.x.toFixed(0)},{det.boundingBox.y.toFixed(0)} · {det.boundingBox.width.toFixed(0)}×{det.boundingBox.height.toFixed(0)}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, borderRadius: '10px', background: 'rgba(0, 230, 118, 0.05)', border: '1px solid rgba(0, 230, 118, 0.1)', textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#00e676', fontSize: '0.8125rem', fontWeight: 600 }}>
                        No fire detections — area is safe
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button
            onClick={() => setDetailDialogOpen(false)}
            variant="contained"
            size="small"
            sx={{ borderRadius: '10px', px: 3, height: 36 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Logs;
