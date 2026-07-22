import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff4500',
      light: '#ff6b35',
      dark: '#cc3700',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff8c00',
      light: '#ffb347',
      dark: '#cc7000',
      contrastText: '#000000',
    },
    background: {
      default: '#060612',
      paper: 'rgba(12, 12, 30, 0.95)',
    },
    text: {
      primary: '#f0f0ff',
      secondary: '#8080a8',
    },
    error: {
      main: '#ff1744',
      light: '#ff4569',
      dark: '#cc0033',
    },
    warning: {
      main: '#ffa726',
      light: '#ffcc02',
      dark: '#cc8500',
    },
    success: {
      main: '#00e676',
      light: '#33eb91',
      dark: '#00b85e',
    },
    info: {
      main: '#29b6f6',
      light: '#54c8fb',
      dark: '#0086c3',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.75rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
    h6: {
      fontSize: '1.0625rem',
      fontWeight: 600,
      letterSpacing: '0',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.65,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.025em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 14,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0,0,0,0.4)',
    '0 4px 16px rgba(0,0,0,0.5)',
    '0 8px 24px rgba(0,0,0,0.6)',
    '0 12px 32px rgba(0,0,0,0.65)',
    '0 16px 40px rgba(0,0,0,0.7)',
    '0 20px 48px rgba(0,0,0,0.72)',
    '0 24px 56px rgba(0,0,0,0.74)',
    '0 28px 64px rgba(0,0,0,0.76)',
    '0 32px 72px rgba(0,0,0,0.78)',
    '0 36px 80px rgba(0,0,0,0.8)',
    '0 40px 88px rgba(0,0,0,0.82)',
    '0 44px 96px rgba(0,0,0,0.84)',
    '0 48px 104px rgba(0,0,0,0.86)',
    '0 52px 112px rgba(0,0,0,0.88)',
    '0 56px 120px rgba(0,0,0,0.9)',
    '0 60px 128px rgba(0,0,0,0.92)',
    '0 64px 136px rgba(0,0,0,0.93)',
    '0 68px 144px rgba(0,0,0,0.94)',
    '0 72px 152px rgba(0,0,0,0.95)',
    '0 76px 160px rgba(0,0,0,0.96)',
    '0 80px 168px rgba(0,0,0,0.97)',
    '0 84px 176px rgba(0,0,0,0.98)',
    '0 88px 184px rgba(0,0,0,0.99)',
    '0 92px 192px rgba(0,0,0,1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `
            radial-gradient(ellipse at 15% 15%, rgba(255, 69, 0, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(255, 140, 0, 0.05) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 0%, rgba(100, 0, 255, 0.04) 0%, transparent 60%)
          `,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 22px',
          fontSize: '0.875rem',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)',
            opacity: 0,
            transition: 'opacity 0.25s ease',
          },
          '&:hover::after': {
            opacity: 1,
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #ff4500 0%, #ff6b00 100%)',
          boxShadow: '0 4px 20px rgba(255, 69, 0, 0.35)',
          '&:hover': {
            boxShadow: '0 8px 28px rgba(255, 69, 0, 0.55)',
            transform: 'translateY(-1px)',
            background: 'linear-gradient(135deg, #ff5500 0%, #ff7a00 100%)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 69, 0, 0.4)',
          color: '#ff4500',
          background: 'rgba(255, 69, 0, 0.04)',
          '&:hover': {
            borderColor: '#ff4500',
            background: 'rgba(255, 69, 0, 0.1)',
            boxShadow: '0 0 20px rgba(255, 69, 0, 0.15)',
          },
        },
        text: {
          '&:hover': {
            background: 'rgba(255, 69, 0, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(12, 12, 32, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            border: '1px solid rgba(255, 69, 0, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 69, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(12, 12, 32, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(6, 6, 18, 0.97)',
          backdropFilter: 'blur(40px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '4px 0 40px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(6, 6, 18, 0.92)',
          backdropFilter: 'blur(30px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 2px 24px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '14px 16px',
        },
        head: {
          background: 'rgba(6, 6, 18, 0.6)',
          color: '#8080a8',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.2s ease',
          '&:hover': {
            background: 'rgba(255, 69, 0, 0.04) !important',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 6,
          backgroundColor: 'rgba(255, 69, 0, 0.12)',
          overflow: 'hidden',
        },
        bar: {
          borderRadius: 6,
          background: 'linear-gradient(90deg, #ff4500, #ff8c00)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          transition: 'all 0.2s ease',
        },
        filled: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.25s ease',
            background: 'rgba(6, 6, 18, 0.5)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'border-color 0.25s ease',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 69, 0, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ff4500',
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(255, 69, 0, 0.1)',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(10, 10, 26, 0.97)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'rgba(6, 6, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 12px',
          borderRadius: 8,
        },
        arrow: {
          color: 'rgba(6, 6, 18, 0.95)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
        },
        standardError: {
          background: 'rgba(255, 23, 68, 0.1)',
          border: '1px solid rgba(255, 23, 68, 0.25)',
          color: '#ff6b8a',
        },
        standardWarning: {
          background: 'rgba(255, 167, 38, 0.1)',
          border: '1px solid rgba(255, 167, 38, 0.25)',
          color: '#ffcc02',
        },
        standardSuccess: {
          background: 'rgba(0, 230, 118, 0.08)',
          border: '1px solid rgba(0, 230, 118, 0.2)',
          color: '#00e676',
        },
        standardInfo: {
          background: 'rgba(41, 182, 246, 0.08)',
          border: '1px solid rgba(41, 182, 246, 0.2)',
          color: '#29b6f6',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
        },
        switchBase: {
          '&.Mui-checked': {
            color: '#ff4500',
            '& + .MuiSwitch-track': {
              backgroundColor: '#ff4500',
              opacity: 0.4,
            },
          },
        },
        thumb: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        },
        track: {
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#ff4500',
        },
        thumb: {
          boxShadow: '0 0 0 8px rgba(255, 69, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 0 0 12px rgba(255, 69, 0, 0.18)',
          },
        },
        track: {
          background: 'linear-gradient(90deg, #ff4500, #ff8c00)',
          border: 'none',
        },
        rail: {
          background: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          borderRadius: 10,
          '&:hover': {
            background: 'rgba(255, 69, 0, 0.1)',
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          margin: '2px 0',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: '0 4px 12px rgba(255, 69, 0, 0.3)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: 'linear-gradient(90deg, #ff4500, #ff8c00)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            color: '#ff4500',
          },
          '&:hover': {
            color: '#ff6b35',
            background: 'rgba(255, 69, 0, 0.05)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: 'rgba(10, 10, 26, 0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
          borderRadius: 14,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          padding: '8px 12px',
          transition: 'all 0.18s ease',
          '&:hover': {
            background: 'rgba(255, 69, 0, 0.1)',
          },
        },
      },
    },
  },
});

export default theme;
