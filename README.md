# Fire Surveillance System

A full-stack MERN application for AI-powered fire detection, inspired by Roboflow and Ultralytics workflow.

![Fire Surveillance System](https://via.placeholder.com/800x400/1a1a2e/ff5722?text=Fire+Surveillance+System)

## 🔥 Features

### Authentication
- Admin login with JWT authentication
- Protected dashboard routes
- Session management

### Dashboard
- Overview cards showing:
  - Total datasets
  - Model training status
  - Last training mAP
  - Total fire detections
- Professional SaaS layout with dark theme
- Red/orange accent colors

### Dataset Management
- Upload datasets (ZIP files with images + labels)
- Automatic dataset processing and validation
- Preview grid with sample images
- Dataset metadata stored in MongoDB

### Model Training
- "Start Training" button to initiate YOLO training
- Real-time training logs via WebSocket
- Training progress bar
- Display metrics after training (mAP, Precision, Recall)
- Training history with model versioning

### Real-Time Detection
- Live camera stream placeholder
- Image upload for detection
- Bounding box overlay on detections
- Confidence scores display
- Fire status indicator (Safe / Alert)
- Detection history table

### Logs & Monitoring
- View past detection logs
- Filter by date, alert level, source
- Export logs to CSV
- Acknowledge alerts

## 🏗️ Architecture

```
fire-surveillance-system/
├── backend/           # Node.js + Express API
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   └── uploads/       # Uploaded files
├── frontend/          # React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── services/    # API & Socket services
│   └── public/
└── yolo-service/      # Python YOLO service
    └── main.py        # FastAPI service
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Python 3.9+ (for YOLO service)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings:
# - MONGODB_URI
# - JWT_SECRET
# - YOLO_SERVICE_URL

# Start the server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### YOLO Service Setup (Optional)

```bash
cd yolo-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the service
python main.py
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Datasets
- `GET /api/datasets` - List all datasets
- `POST /api/datasets/upload` - Upload new dataset
- `GET /api/datasets/:id` - Get dataset details
- `DELETE /api/datasets/:id` - Delete dataset

### Training
- `GET /api/training` - List all models
- `POST /api/training/start` - Start training
- `POST /api/training/:id/cancel` - Cancel training
- `GET /api/training/:id/logs` - Get training logs

### Detection
- `POST /api/detection/detect` - Run detection on image
- `GET /api/detection/logs` - Get detection logs
- `GET /api/detection/logs/export/csv` - Export logs

### Stats
- `GET /api/stats/dashboard` - Dashboard statistics
- `GET /api/stats/trends` - Detection trends

## 🔌 WebSocket Events

### Training
- `training-progress` - Training progress updates
- `training-completed` - Training completed
- `training-cancelled` - Training cancelled

### Detection
- `new-detection` - New detection result

## 🗄️ MongoDB Schemas

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  role: 'admin' | 'user',
  isActive: Boolean
}
```

### Dataset
```javascript
{
  name: String,
  description: String,
  filePath: String,
  imageCount: Number,
  labelCount: Number,
  status: 'uploading' | 'processing' | 'ready' | 'error',
  uploadedBy: ObjectId
}
```

### TrainingModel
```javascript
{
  name: String,
  version: String,
  dataset: ObjectId,
  status: 'pending' | 'training' | 'completed' | 'failed',
  hyperparameters: Object,
  metrics: { mAP, precision, recall, ... },
  trainingLogs: Array
}
```

### DetectionLog
```javascript
{
  model: ObjectId,
  source: 'camera' | 'upload' | 'stream',
  detections: Array,
  fireDetected: Boolean,
  maxConfidence: Number,
  alertLevel: 'safe' | 'warning' | 'alert' | 'critical'
}
```

## 🎨 UI Theme

- **Background**: Dark (#0d0d1a, #1a1a2e)
- **Primary**: Orange/Red (#ff5722)
- **Secondary**: Amber (#ff9800)
- **Success**: Green (#4caf50)
- **Error**: Red (#f44336)

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon
```

### Frontend Development
```bash
cd frontend
npm start  # Starts React dev server
```

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fire-surveillance
JWT_SECRET=your-super-secret-jwt-key
YOLO_SERVICE_URL=http://localhost:8000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🚧 Future Improvements

1. **Real Camera Integration** - WebRTC/RTSP stream support
2. **Actual YOLO Training** - Replace simulation with ultralytics
3. **Alert Notifications** - Email/SMS notifications
4. **Multi-tenant Support** - Multiple organizations
5. **Model Deployment** - Edge device deployment
6. **Analytics Dashboard** - Advanced analytics and reports

## 📄 License

MIT License - Feel free to use this project for learning and development.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Built with ❤️ for fire safety and AI innovation.
