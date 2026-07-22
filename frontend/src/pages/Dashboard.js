import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Storage as DatasetIcon,
  Psychology as ModelIcon,
  Speed as MetricIcon,
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../services/api';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// ===========================
// Premium Stat Card Component
// ===========================
const StatCard = ({ title, value, subtitle, icon, color, trend, glowColor, pulse }) => (
  <Card
    sx={{
      height: '100%',
      background: 'rgba(10, 10, 26, 0.85)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${glowColor ? `${color}22` : 'rgba(255,255,255,0.07)'}`,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: pulse ? 'fireGlow 2s ease-in-out infinite' : 'none',
      '&:hover': {
        border: `1px solid ${color}35`,
        transform: 'translateY(-4px)',
        boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 32px ${color}18`,
      },
    }}
  >
    {/* Top colored bar */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        opacity: 0.8,
      }}
    />

    {/* Background glow */}
    <Box
      sx={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }}
    />

    <CardContent sx={{ p: '20px 20px 18px', position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: '14px',
            background: `${color}14`,
            border: `1px solid ${color}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 16px ${color}20`,
          }}
        >
          {React.cloneElement(icon, {
            sx: {
              color,
              fontSize: 22,
              filter: `drop-shadow(0 0 6px ${color}80)`,
            },
          })}
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={<TrendingUpIcon sx={{ fontSize: '14px !important' }} />}
            label={trend}
            sx={{
              height: 26,
              bgcolor: 'rgba(0, 230, 118, 0.1)',
              color: '#00e676',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.02em',
              border: '1px solid rgba(0, 230, 118, 0.25)',
              '& .MuiChip-icon': { color: '#00e676' },
            }}
          />
        )}
      </Box>

      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          fontSize: '1.875rem',
          letterSpacing: '-0.03em',
          color: '#f0f0ff',
          mb: 0.5,
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: '#8080a8', fontWeight: 500, fontSize: '0.8125rem', mb: 0.5 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            color: `${color}90`,
            fontSize: '0.71rem',
            display: 'block',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ===========================
// Alert Level Colors
// ===========================
const getModelStatusColor = (status) => {
  switch (status) {
    case 'Trained': return '#00e676';
    case 'Training': return '#ffa726';
    case 'Failed': return '#ff1744';
    default: return '#6060a0';
  }
};

const getAlertLevelColor = (level) => {
  switch (level) {
    case 'critical': return '#ff1744';
    case 'alert': return '#ff4500';
    case 'warning': return '#ffa726';
    default: return '#00e676';
  }
};

// ===========================
// Dashboard Component
// ===========================
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, trendsRes] = await Promise.all([
        api.get('/stats/dashboard'),
        api.get('/stats/trends?days=7'),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data.trends || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartData = {
    labels: trends.map((t) => format(new Date(t._id), 'MMM d')),
    datasets: [
      {
        label: 'Total Scans',
        data: trends.map((t) => t.total),
        borderColor: '#29b6f6',
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(41, 182, 246, 0.25)');
          gradient.addColorStop(1, 'rgba(41, 182, 246, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.45,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#29b6f6',
        pointBorderColor: '#060612',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
      {
        label: 'Fire Detections',
        data: trends.map((t) => t.fireDetections),
        borderColor: '#ff4500',
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(255, 69, 0, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 69, 0, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.45,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#ff4500',
        pointBorderColor: '#060612',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#8080a8',
          font: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 4,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(6, 6, 18, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: '700' },
        bodyFont: { family: "'Space Grotesk', sans-serif", size: 12 },
        titleColor: '#f0f0ff',
        bodyColor: '#8080a8',
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: {
          color: '#6060a0',
          font: { family: "'Space Grotesk', sans-serif", size: 11, weight: '500' },
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: {
          color: '#6060a0',
          font: { family: "'Space Grotesk', sans-serif", size: 11, weight: '500' },
          padding: 8,
        },
        border: { display: false },
      },
    },
  };

  const hasFireDetections = stats?.detections?.fireDetectionsLast24h > 0;

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3.5,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Dashboard
            </Typography>
            {hasFireDetections && (
              <Chip
                size="small"
                icon={<FireIcon sx={{ fontSize: '14px !important', color: '#ff4500 !important' }} />}
                label="ACTIVE ALERTS"
                sx={{
                  bgcolor: 'rgba(255, 69, 0, 0.1)',
                  color: '#ff6b35',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(255, 69, 0, 0.3)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  height: 26,
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
            Overview of your fire surveillance system
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Last updated */}
          <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.7rem' }}>
            {format(currentTime, 'HH:mm:ss')}
          </Typography>
          <Tooltip title="Refresh data" arrow>
            <IconButton
              onClick={fetchData}
              sx={{
                width: 38,
                height: 38,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#8080a8',
                '&:hover': {
                  border: '1px solid rgba(255, 69, 0, 0.3)',
                  color: '#ff4500',
                  background: 'rgba(255, 69, 0, 0.08)',
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            sx={{
              height: 3,
              borderRadius: 2,
              background: 'rgba(255, 69, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #ff4500, #ff8c00)',
              },
            }}
          />
        </Box>
      )}

      {/* Stats Cards */}
      {!loading && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Datasets"
              value={stats?.datasets?.total ?? '—'}
              subtitle={`${stats?.datasets?.ready || 0} ready for training`}
              icon={<DatasetIcon />}
              color="#29b6f6"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Model Status"
              value={stats?.models?.status || 'Not Trained'}
              subtitle={`${stats?.models?.trained || 0} models trained`}
              icon={<ModelIcon />}
              color={getModelStatusColor(stats?.models?.status)}
              glowColor
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Last mAP Score"
              value={`${((stats?.models?.lastMAP || 0) * 100).toFixed(1)}%`}
              subtitle="Model accuracy metric"
              icon={<MetricIcon />}
              color="#ffa726"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Fire Detections"
              value={stats?.detections?.fireDetections ?? '—'}
              subtitle={`${stats?.detections?.fireDetectionsLast24h || 0} in last 24h`}
              icon={<FireIcon />}
              color="#ff4500"
              trend={hasFireDetections ? `${stats?.detections?.fireDetectionsLast24h} Today` : null}
              glowColor
              pulse={hasFireDetections}
            />
          </Grid>
        </Grid>
      )}

      {/* Charts and Tables */}
      {!loading && (
        <Grid container spacing={2.5}>
          {/* Detection Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: '20px 22px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#d0d0e8' }}>
                      Detection Trends
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.75rem' }}>
                      Last 7 days
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '8px',
                      background: 'rgba(0, 230, 118, 0.07)',
                      border: '1px solid rgba(0, 230, 118, 0.15)',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#00e676', fontWeight: 700, fontSize: '0.7rem' }}>
                      LIVE
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 280 }}>
                  {trends.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                      }}
                    >
                      <MetricIcon sx={{ fontSize: 40, color: '#3030a0', opacity: 0.6 }} />
                      <Typography color="text.secondary" variant="body2">
                        No detection data available yet
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Alerts */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: '20px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '10px',
                      background: 'rgba(255, 167, 38, 0.12)',
                      border: '1px solid rgba(255, 167, 38, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 17, color: '#ffa726' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#d0d0e8' }}>
                      Recent Alerts
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.72rem' }}>
                      {stats?.recentAlerts?.length || 0} alerts
                    </Typography>
                  </Box>
                </Box>

                {stats?.recentAlerts?.length > 0 ? (
                  <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {stats.recentAlerts.map((alert, index) => {
                      const alertColor = getAlertLevelColor(alert.alertLevel);
                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 1.25,
                            borderBottom: index < stats.recentAlerts.length - 1
                              ? '1px solid rgba(255,255,255,0.04)'
                              : 'none',
                            '&:hover': {
                              background: 'rgba(255,255,255,0.02)',
                              borderRadius: '8px',
                              mx: -0.5,
                              px: 0.5,
                            },
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Color indicator */}
                          <Box
                            sx={{
                              width: 4,
                              height: 36,
                              borderRadius: '2px',
                              background: `linear-gradient(180deg, ${alertColor}, ${alertColor}44)`,
                              boxShadow: `0 0 8px ${alertColor}40`,
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip
                                size="small"
                                label={alert.alertLevel}
                                sx={{
                                  height: 22,
                                  bgcolor: `${alertColor}14`,
                                  color: alertColor,
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  letterSpacing: '0.04em',
                                  textTransform: 'capitalize',
                                  border: `1px solid ${alertColor}28`,
                                }}
                              />
                              <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.7rem' }}>
                                {format(new Date(alert.createdAt), 'HH:mm')}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#6060a0', fontSize: '0.72rem', mt: 0.25, display: 'block' }}>
                              {(alert.maxConfidence * 100).toFixed(1)}% confidence
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '16px',
                        background: 'rgba(0, 230, 118, 0.07)',
                        border: '1px solid rgba(0, 230, 118, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircleIcon sx={{ fontSize: 24, color: '#00e676', opacity: 0.7 }} />
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#00e676', fontWeight: 600, fontSize: '0.8125rem' }}>
                        All Clear
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#5050a0', fontSize: '0.72rem' }}>
                        No recent alerts
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;
