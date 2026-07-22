const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const unzipper = require('unzipper');
const { auth } = require('../middleware/auth');
const Dataset = require('../models/Dataset');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/datasets');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// Get all datasets
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search };
    }

    const datasets = await Dataset.find(query)
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Dataset.countDocuments(query);

    res.json({
      datasets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

// Get single dataset
router.get('/:id', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
      .populate('uploadedBy', 'username email');

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json({ dataset });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    res.status(500).json({ error: 'Failed to fetch dataset' });
  }
});

// Upload new dataset
router.post('/upload', auth, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description } = req.body;

    const dataset = new Dataset({
      name: name || path.basename(req.file.originalname, '.zip'),
      description: description || '',
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      status: 'processing'
    });

    await dataset.save();

    // Process the zip file asynchronously
    processDataset(dataset._id, req.file.path);

    res.status(201).json({
      message: 'Dataset upload started',
      dataset
    });
  } catch (error) {
    console.error('Error uploading dataset:', error);
    res.status(500).json({ error: 'Failed to upload dataset' });
  }
});

// Process dataset (extract and analyze)
async function processDataset(datasetId, zipPath) {
  try {
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return;

    const extractDir = path.join(
      path.dirname(zipPath),
      'extracted',
      path.basename(zipPath, '.zip')
    );

    await fs.mkdir(extractDir, { recursive: true });

    // Extract zip file
    await new Promise((resolve, reject) => {
      const readStream = require('fs').createReadStream(zipPath);
      readStream
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Analyze dataset structure
    const { imageCount, labelCount, sampleImages } = await analyzeDataset(extractDir);

    dataset.extractedPath = extractDir;
    dataset.imageCount = imageCount;
    dataset.labelCount = labelCount;
    dataset.sampleImages = sampleImages;
    dataset.classes = ['fire']; // For fire detection
    dataset.status = 'ready';

    await dataset.save();
  } catch (error) {
    console.error('Dataset processing error:', error);
    const dataset = await Dataset.findById(datasetId);
    if (dataset) {
      dataset.status = 'error';
      dataset.errorMessage = error.message;
      await dataset.save();
    }
  }
}

// Analyze dataset structure
async function analyzeDataset(extractDir) {
  let imageCount = 0;
  let labelCount = 0;
  const sampleImages = [];

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];
  const labelExtensions = ['.txt', '.xml', '.json'];

  async function walkDir(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          await walkDir(filePath);
        } else {
          const ext = path.extname(file.name).toLowerCase();
          
          if (imageExtensions.includes(ext)) {
            imageCount++;
            if (sampleImages.length < 6) {
              sampleImages.push({
                path: filePath,
                filename: file.name
              });
            }
          } else if (labelExtensions.includes(ext)) {
            labelCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error walking directory:', error);
    }
  }

  await walkDir(extractDir);

  return { imageCount, labelCount, sampleImages };
}

// Update dataset
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const dataset = await Dataset.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json({ dataset });
  } catch (error) {
    console.error('Error updating dataset:', error);
    res.status(500).json({ error: 'Failed to update dataset' });
  }
});

// Delete dataset
router.delete('/:id', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Delete files
    if (dataset.filePath) {
      await fs.unlink(dataset.filePath).catch(() => {});
    }
    if (dataset.extractedPath) {
      await fs.rm(dataset.extractedPath, { recursive: true, force: true }).catch(() => {});
    }

    await Dataset.findByIdAndDelete(req.params.id);

    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

// Get dataset sample images
router.get('/:id/samples', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.json({ sampleImages: dataset.sampleImages });
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch sample images' });
  }
});

module.exports = router;
