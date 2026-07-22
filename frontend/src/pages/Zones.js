import React, { useState, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Grid, Alert, Chip } from '@mui/material';
import { CropFree as ZoneIcon, CheckCircle as ActiveIcon, RemoveCircle as InactiveIcon } from '@mui/icons-material';
import ZoneEditor from '../components/ZoneEditor';

const Zones = () => {
  const [zones, setZones] = useState([]);
  const handleZonesChange = useCallback((newZones) => setZones(newZones), []);

  return (
    <Box className="page-enter">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{
          fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5,
          background: 'linear-gradient(135deg, #f0f0ff 0%, #a0a0c8 100%)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Detection Zones
        </Typography>
        <Typography variant="body2" sx={{ color: '#6060a0', fontSize: '0.8125rem' }}>
          Define specific areas to monitor for fire detection
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        {/* Zone Editor */}
        <Grid item xs={12} md={8}>
          <ZoneEditor canvasWidth={640} canvasHeight={480} cameraId="default" onZonesChange={handleZonesChange} />
        </Grid>

        {/* Zone Info Panel */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Stats */}
            <Grid container spacing={2}>
              {[
                { label: 'Total Zones', value: zones.length, color: '#29b6f6' },
                { label: 'Active', value: zones.filter(z => z.isActive).length, color: '#00e676' },
              ].map((stat) => (
                <Grid item xs={6} key={stat.label}>
                  <Card>
                    <CardContent sx={{ p: '16px !important', textAlign: 'center' }}>
                      <Typography variant="h3" sx={{
                        fontWeight: 800, fontSize: '2rem', color: stat.color,
                        filter: `drop-shadow(0 0 8px ${stat.color}60)`,
                      }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6060a0', fontSize: '0.72rem', fontWeight: 600 }}>
                        {stat.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* How-to card */}
            <Card>
              <CardContent sx={{ p: '18px 20px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d0d0e8', mb: 2, fontSize: '0.875rem' }}>
                  How to Create Zones
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    'Click "New Zone" to start drawing',
                    'Click on the canvas to add polygon points',
                    'Add at least 3 points to form a zone',
                    'Right-click or click "Save" to complete',
                    'Configure zone settings in the dialog',
                  ].map((step, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                      <Box sx={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(255,69,0,0.2), rgba(255,140,0,0.1))',
                        border: '1px solid rgba(255,69,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 800, color: '#ff6b35', mt: 0.1,
                      }}>
                        {i + 1}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#8080a8', lineHeight: 1.5, fontSize: '0.78rem' }}>
                        {step}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Info alert */}
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              <Typography variant="caption" sx={{ lineHeight: 1.6 }}>
                Fire detections will only trigger alerts if they occur within active zones when zone filtering is enabled on the Detection page.
              </Typography>
            </Alert>

            {/* Zone list */}
            {zones.length > 0 && (
              <Card>
                <CardContent sx={{ p: '16px 20px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#d0d0e8', mb: 1.5, fontSize: '0.875rem' }}>
                    Configured Zones
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {zones.map((zone, i) => (
                      <Box key={i} sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {zone.isActive
                            ? <ActiveIcon sx={{ fontSize: 14, color: '#00e676' }} />
                            : <InactiveIcon sx={{ fontSize: 14, color: '#6060a0' }} />}
                          <Typography variant="caption" sx={{ color: '#d0d0e8', fontWeight: 600, fontSize: '0.78rem' }}>
                            {zone.name || `Zone ${i + 1}`}
                          </Typography>
                        </Box>
                        <Chip size="small" label={zone.isActive ? 'Active' : 'Inactive'} sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: zone.isActive ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.05)',
                          color: zone.isActive ? '#00e676' : '#6060a0',
                          border: `1px solid ${zone.isActive ? 'rgba(0,230,118,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        }} />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Zones;
