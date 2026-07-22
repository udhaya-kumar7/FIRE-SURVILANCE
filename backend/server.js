const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const datasetRoutes = require('./routes/dataset');
const trainingRoutes = require('./routes/training');
const detectionRoutes = require('./routes/detection');
const statsRoutes = require('./routes/stats');
const alertsRoutes = require('./routes/alerts');
const recordingsRoutes = require('./routes/recordings');
const zonesRoutes = require('./routes/zones');
const camerasRoutes = require('./routes/cameras');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS — supports multiple comma-separated URLs in FRONTEND_URLS
const extraOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(u => u.trim())
  : [];

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...extraOrigins,
  // Hardcoded known frontend URLs
  'https://fire-survilance.vercel.app',
  'https://fire-survilance.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

// Socket.io setup for real-time updates
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked request from origin: ${origin}`);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // Increased for recording frames
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded datasets and models
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fire-surveillance')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/recordings', recordingsRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/cameras', camerasRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-training', (trainingId) => {
    socket.join(`training-${trainingId}`);
    console.log(`Client joined training room: ${trainingId}`);
  });

  socket.on('join-detection', () => {
    socket.join('detection-room');
    console.log('Client joined detection room');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Fire Surveillance API running on port ${PORT}`);
});

module.exports = { app, io };
