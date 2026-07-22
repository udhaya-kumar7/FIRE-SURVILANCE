import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Psychology as TrainingIcon,
  Videocam as DetectionIcon,
  Assignment as LogsIcon,
  LocalFireDepartment as FireIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  GridView as GridViewIcon,
  VideoLibrary as RecordingsIcon,
  CropFree as ZonesIcon,
  Map as MapIcon,
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 270;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', section: 'main' },
  { text: 'Live Detection', icon: <DetectionIcon />, path: '/detection', section: 'main' },
  { text: 'Multi-Camera', icon: <GridViewIcon />, path: '/multicamera', section: 'main' },
  { divider: true, label: 'DATA & TRAINING', section: 'data' },
  { text: 'Datasets', icon: <StorageIcon />, path: '/datasets', section: 'data' },
  { text: 'Model Training', icon: <TrainingIcon />, path: '/training', section: 'data' },
  { divider: true, label: 'MONITORING', section: 'monitoring' },
  { text: 'Detection Zones', icon: <ZonesIcon />, path: '/zones', section: 'monitoring' },
  { text: 'Camera Map', icon: <MapIcon />, path: '/map', section: 'monitoring' },
  { text: 'Recordings', icon: <RecordingsIcon />, path: '/recordings', section: 'monitoring' },
  { text: 'Logs & Monitoring', icon: <LogsIcon />, path: '/logs', section: 'monitoring' },
  { divider: true, label: 'SYSTEM', section: 'system' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings', section: 'system' },
];

const DashboardLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient sidebar background */}
      <Box
        sx={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          top: '-60px',
          right: '-60px',
          background: 'radial-gradient(circle, rgba(255, 69, 0, 0.07) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          bottom: '80px',
          left: '-50px',
          background: 'radial-gradient(circle, rgba(255, 140, 0, 0.05) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: '20px 20px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          position: 'relative',
        }}
      >
        {/* Animated fire icon container */}
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.2), rgba(255, 140, 0, 0.1))',
            border: '1px solid rgba(255, 69, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: 'fireGlow 3s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(255, 69, 0, 0.2)',
          }}
        >
          <FireIcon sx={{ fontSize: 24, color: '#ff6b35', filter: 'drop-shadow(0 0 6px rgba(255, 69, 0, 0.8))' }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ff4500 0%, #ff8c00 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            FireWatch AI
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#00e676',
                boxShadow: '0 0 0 0 rgba(0, 230, 118, 0.7)',
                animation: 'statusPulse 2s ease-in-out infinite',
              }}
            />
            <Typography variant="caption" sx={{ color: '#8080a8', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              SYSTEM ONLINE
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, pt: 1.5, px: 1.5, pb: 1 }}>
        {menuItems.map((item, index) => {
          if (item.divider) {
            return (
              <Box key={index} sx={{ px: 1, pt: 2, pb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(128, 128, 168, 0.5)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: '12px',
                  py: 1,
                  px: 1.5,
                  position: 'relative',
                  overflow: 'hidden',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 69, 0, 0.18) 0%, rgba(255, 140, 0, 0.1) 100%)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(255, 69, 0, 0.25)'
                    : '1px solid transparent',
                  boxShadow: isActive
                    ? '0 4px 16px rgba(255, 69, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    : 'none',
                  '&:hover': {
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(255, 69, 0, 0.22) 0%, rgba(255, 140, 0, 0.12) 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 69, 0, 0.2)',
                    transform: 'translateX(2px)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  // Shimmer on active
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                    animation: 'shimmer 3s ease-in-out infinite',
                  } : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#ff6b35' : '#6060a0',
                    minWidth: 36,
                    transition: 'all 0.2s ease',
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(255, 69, 0, 0.6))' : 'none',
                    '& .MuiSvgIcon-root': {
                      fontSize: 19,
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.875rem',
                      color: isActive ? '#f0f0ff' : '#8080a8',
                      transition: 'color 0.2s ease',
                      letterSpacing: isActive ? '-0.01em' : '0',
                    },
                  }}
                />
                {/* Active indicator dot */}
                {isActive && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                      boxShadow: '0 0 8px rgba(255, 69, 0, 0.8)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User Section */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.25,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 69, 0, 0.06)',
              border: '1px solid rgba(255, 69, 0, 0.15)',
            },
          }}
          onClick={handleMenuClick}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: '0.8rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
              boxShadow: '0 0 0 2px rgba(255, 69, 0, 0.25), 0 4px 12px rgba(255, 69, 0, 0.3)',
            }}
          >
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontSize: '0.825rem', color: '#d0d0e8' }}
              noWrap
            >
              {user?.username || 'Admin'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6060a0', fontSize: '0.7rem' }} noWrap>
              {user?.email || 'admin@example.com'}
            </Typography>
          </Box>
          <LogoutIcon
            sx={{ fontSize: 16, color: '#6060a0', flexShrink: 0 }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Background ambient orbs */}
      <Box className="bg-orb bg-orb-1" />
      <Box className="bg-orb bg-orb-2" />
      <Box className="bg-orb bg-orb-3" />

      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer - 1,
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Page title area */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#00e676',
                  boxShadow: '0 0 0 0 rgba(0, 230, 118, 0.7)',
                  animation: 'statusPulse 2s ease-in-out infinite',
                  display: { xs: 'none', sm: 'block' },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: '#6060a0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Live Monitoring
              </Typography>
            </Box>
          </Box>

          {/* Time display */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              mr: 2,
              px: 1.5,
              py: 0.5,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", monospace',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#a0a0c8',
                letterSpacing: '0.05em',
              }}
            >
              {formatTime(currentTime)}
            </Typography>
          </Box>

          {/* Notifications */}
          <Tooltip title="Notifications" arrow>
            <IconButton
              sx={{
                mr: 1,
                width: 38,
                height: 38,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <NotificationsIcon sx={{ fontSize: 18, color: '#8080a8' }} />
            </IconButton>
          </Tooltip>

          {/* User Avatar */}
          <Tooltip title={user?.username || 'Account'} arrow>
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                  boxShadow: '0 0 0 2px rgba(255, 69, 0, 0.3)',
                }}
              >
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* User Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { mt: 1, minWidth: 200 } }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#d0d0e8' }}>
                {user?.username || 'Admin'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6060a0' }}>
                {user?.email || 'admin@example.com'}
              </Typography>
            </Box>
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <PersonIcon fontSize="small" sx={{ color: '#8080a8' }} />
              </ListItemIcon>
              <Typography variant="body2">Profile</Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: '#8080a8' }} />
              </ListItemIcon>
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleLogout} sx={{ color: '#ff6b6b' }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#ff6b6b' }} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ color: '#ff6b6b' }}>Sign Out</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'transparent',
          mt: '60px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
