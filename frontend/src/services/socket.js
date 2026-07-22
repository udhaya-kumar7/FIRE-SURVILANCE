import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket = null;
  
  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinTrainingRoom(trainingId) {
    if (this.socket) {
      this.socket.emit('join-training', trainingId);
    }
  }

  joinDetectionRoom() {
    if (this.socket) {
      this.socket.emit('join-detection');
    }
  }

  onTrainingProgress(callback) {
    if (this.socket) {
      this.socket.on('training-progress', callback);
    }
  }

  onTrainingCompleted(callback) {
    if (this.socket) {
      this.socket.on('training-completed', callback);
    }
  }

  onTrainingCancelled(callback) {
    if (this.socket) {
      this.socket.on('training-cancelled', callback);
    }
  }

  onTrainingFailed(callback) {
    if (this.socket) {
      this.socket.on('training-failed', callback);
    }
  }

  onNewDetection(callback) {
    if (this.socket) {
      this.socket.on('new-detection', callback);
    }
  }

  onModelTrained(callback) {
    if (this.socket) {
      this.socket.on('model-trained', callback);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

const socketService = new SocketService();
export default socketService;
