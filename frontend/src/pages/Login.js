import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  LocalFireDepartment as FireIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  LoginRounded as LoginIcon,
  AppRegistrationRounded as RegisterIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

// Shared input field styles
const inputStyles = {
  '& .MuiOutlinedInput-root': {
    color: '#f0f0ff',
    backgroundColor: 'rgba(6, 6, 18, 0.6)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 69, 0, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#ff4500',
      borderWidth: '2px',
      boxShadow: '0 0 0 4px rgba(255, 69, 0, 0.08)',
    },
  },
  '& .MuiInputBase-input': {
    color: '#f0f0ff !important',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.35)',
      opacity: 1,
    },
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px rgba(6, 6, 18, 0.9) inset',
      WebkitTextFillColor: '#f0f0ff',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(180, 180, 210, 0.7)',
    '&.Mui-focused': {
      color: '#ff6b35 !important',
    },
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { login, register, error } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    let result;
    if (tab === 0) {
      result = await login(formData.email, formData.password);
    } else {
      if (!formData.username) {
        setFormError('Username is required');
        setLoading(false);
        return;
      }
      result = await register(formData.username, formData.email, formData.password);
    }

    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#060612',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
      }}
    >
      {/* Animated Background Orbs */}
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          top: '-150px',
          right: '-150px',
          background: 'radial-gradient(circle, rgba(255, 69, 0, 0.08) 0%, transparent 65%)',
          filter: 'blur(60px)',
          animation: 'float 15s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          bottom: '-80px',
          left: '-80px',
          background: 'radial-gradient(circle, rgba(255, 140, 0, 0.05) 0%, transparent 65%)',
          filter: 'blur(50px)',
          animation: 'floatReverse 18s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          top: '40%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(100, 0, 255, 0.04) 0%, transparent 65%)',
          filter: 'blur(40px)',
          animation: 'float 22s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle grid pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Login Card */}
      <Card
        sx={{
          width: '100%',
          maxWidth: 460,
          background: 'rgba(10, 10, 28, 0.88)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 32px 80px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 69, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.07)
          `,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          animation: 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
          transition: 'box-shadow 0.4s ease',
          '&:hover': {
            boxShadow: `
              0 40px 96px rgba(0, 0, 0, 0.75),
              0 0 0 1px rgba(255, 69, 0, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.09)
            `,
          },
        }}
      >
        {/* Top accent line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #ff4500, #ff8c00, transparent)',
            opacity: 0.8,
          }}
        />

        {/* Subtle scan line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'scanLine 8s linear infinite',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />

        <CardContent sx={{ p: '36px 36px 32px' }}>
          {/* Brand Section */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3.5,
              textAlign: 'center',
            }}
          >
            {/* Logo Icon */}
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: '22px',
                background: 'linear-gradient(135deg, rgba(255, 69, 0, 0.15), rgba(255, 140, 0, 0.08))',
                border: '1px solid rgba(255, 69, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
                position: 'relative',
                animation: 'fireGlow 3s ease-in-out infinite',
                boxShadow: '0 8px 32px rgba(255, 69, 0, 0.15)',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
                  borderRadius: '22px',
                },
              }}
            >
              <FireIcon
                sx={{
                  fontSize: 40,
                  color: '#ff5500',
                  filter: 'drop-shadow(0 0 10px rgba(255, 69, 0, 0.9))',
                  zIndex: 1,
                }}
              />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #ff4500 0%, #ff8c00 60%, #ffb347 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.75,
                lineHeight: 1.15,
              }}
            >
              FireWatch AI
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#6060a0',
                fontSize: '0.8125rem',
                letterSpacing: '0.02em',
                maxWidth: 260,
              }}
            >
              AI-Powered Fire Detection & Surveillance Platform
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              mb: 3,
              minHeight: 44,
              background: 'rgba(6, 6, 18, 0.5)',
              borderRadius: '12px',
              p: 0.5,
              '& .MuiTabs-indicator': {
                display: 'none',
              },
              '& .MuiTab-root': {
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#6060a0',
                borderRadius: '10px',
                minHeight: 38,
                transition: 'all 0.25s ease',
                zIndex: 1,
                '&.Mui-selected': {
                  color: '#f0f0ff',
                  background: 'rgba(255, 69, 0, 0.15)',
                  border: '1px solid rgba(255, 69, 0, 0.25)',
                  boxShadow: '0 4px 12px rgba(255, 69, 0, 0.12)',
                },
                '&:hover:not(.Mui-selected)': {
                  color: '#a0a0c8',
                  background: 'rgba(255, 255, 255, 0.04)',
                },
              },
              '& .MuiTabs-flexContainer': {
                gap: 0.5,
              },
            }}
          >
            <Tab
              label="Sign In"
              icon={<LoginIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              sx={{ textTransform: 'none' }}
            />
            <Tab
              label="Create Account"
              icon={<RegisterIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              sx={{ textTransform: 'none' }}
            />
          </Tabs>

          {/* Error Alert */}
          {(formError || error) && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: '12px',
                animation: 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) both',
              }}
            >
              {formError || error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tab === 1 && (
                <TextField
                  fullWidth
                  name="username"
                  label="Username"
                  placeholder="Choose your username"
                  value={formData.username}
                  onChange={handleChange}
                  variant="outlined"
                  size="small"
                  sx={inputStyles}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'rgba(255, 69, 0, 0.55)', fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              <TextField
                fullWidth
                name="email"
                label="Email Address"
                placeholder="your.email@example.com"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                size="small"
                required
                sx={inputStyles}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(255, 69, 0, 0.55)', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                name="password"
                label="Password"
                placeholder={tab === 0 ? 'Enter your password' : 'Choose a strong password'}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                size="small"
                required
                sx={inputStyles}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'rgba(255, 69, 0, 0.55)', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{
                          color: 'rgba(128, 128, 168, 0.7)',
                          '&:hover': {
                            color: '#ff4500',
                            background: 'rgba(255, 69, 0, 0.08)',
                          },
                        }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 1.5,
                height: 50,
                fontWeight: 700,
                fontSize: '0.9375rem',
                letterSpacing: '0.02em',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ff4500 0%, #ff6b00 50%, #ff8c00 100%)',
                backgroundSize: '200% 200%',
                boxShadow: '0 8px 28px rgba(255, 69, 0, 0.4)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '60%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  transition: 'left 0.6s ease',
                },
                '&:hover:not(:disabled)': {
                  boxShadow: '0 12px 36px rgba(255, 69, 0, 0.55)',
                  transform: 'translateY(-2px)',
                  '&::before': {
                    left: '150%',
                  },
                },
                '&:active:not(:disabled)': {
                  transform: 'translateY(0)',
                  boxShadow: '0 6px 20px rgba(255, 69, 0, 0.4)',
                },
                '&:disabled': {
                  opacity: 0.6,
                  background: 'linear-gradient(135deg, #ff4500 0%, #ff6b00 100%)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: 'rgba(255,255,255,0.85)' }} />
              ) : tab === 0 ? (
                'Sign In to Dashboard'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Security Badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mt: 1,
              p: 1.5,
              borderRadius: '10px',
              background: 'rgba(0, 230, 118, 0.04)',
              border: '1px solid rgba(0, 230, 118, 0.1)',
            }}
          >
            <ShieldIcon sx={{ fontSize: 14, color: '#00e676' }} />
            <Typography
              variant="caption"
              sx={{ color: 'rgba(0, 230, 118, 0.7)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.03em' }}
            >
              Secured with end-to-end encryption
            </Typography>
          </Box>

          {/* Switch tab hint */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: '#5050a0',
              fontSize: '0.75rem',
              mt: 1.5,
              lineHeight: 1.5,
            }}
          >
            {tab === 0
              ? "Don't have an account? Switch to Create Account above."
              : 'Already have an account? Switch to Sign In above.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
