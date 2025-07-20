
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const faceapi = require('face-api.js');
const { Canvas, Image } = require('canvas');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// JWT Secret for token generation
const JWT_SECRET = process.env.JWT_SECRET || 'jadsu-shopping-secret-key';

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect('mongodb://0.0.0.0:27017/attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define User Schema for JADSU e-commerce platform
const User = mongoose.model('User', {
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});

// Define Student Schema
const Student = mongoose.model('Student', {
  name: String,
  rollNo: String,
  faceDescriptor: Array
});

// Define Attendance Schema
const Attendance = mongoose.model('Attendance', {
  studentId: String,
  date: Date,
  status: String
});

// Initialize face-api models
const loadModels = async () => {
  await faceapi.nets.faceRecognitionNet.loadFromDisk('models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('models');
};

loadModels().then(() => console.log('Models loaded'));

// Register new student
app.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const img = await canvas.loadImage(`./public/uploads/${req.file.filename}`);
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      return res.status(400).json({ error: 'No face detected' });
    }

    const student = new Student({
      name: req.body.name,
      rollNo: req.body.rollNo,
      faceDescriptor: Array.from(detections.descriptor)
    });

    await student.save();
    res.json({ message: 'Student registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark attendance
app.post('/mark-attendance', upload.single('photo'), async (req, res) => {
  try {
    const img = await canvas.loadImage(`./public/uploads/${req.file.filename}`);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ error: 'No face detected' });
    }

    const students = await Student.find();
    const labeledDescriptors = students.map(
      student => new faceapi.LabeledFaceDescriptors(
        student._id.toString(),
        [new Float32Array(student.faceDescriptor)]
      )
    );

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
    const match = faceMatcher.findBestMatch(detection.descriptor);

    if (match.distance < 0.6) {
      const attendance = new Attendance({
        studentId: match.label,
        date: new Date(),
        status: 'present'
      });
      await attendance.save();
      res.json({ message: 'Attendance marked successfully' });
    } else {
      res.status(400).json({ error: 'Student not recognized' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records
app.get('/attendance', async (req, res) => {
  try {
    const records = await Attendance.find().populate('studentId');
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email, fullName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Protected route example
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
