import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './config/database';
// import authRoutes from './routes/auth';
// import imageRoutes from './routes/images';
// import userRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://finesf.netlify.app',
    'https://finesf.com',
    process.env.FRONTEND_URL || ''
  ],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);

// Routes - temporarily disabled
// app.use('/api/auth', authRoutes);
// app.use('/api/images', imageRoutes);
// app.use('/api/users', userRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fine Estate API',
    version: '1.0.0',
    status: 'OK',
    database: 'temporarily disabled'
  });
});

// Test login endpoint (temporary)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Hardcoded test credentials
  if (email === 'jtsf71@gmail.com' && password === 'night_!!!') {
    res.json({
      token: 'test-token-123',
      user: {
        id: '1',
        email: 'jtsf71@gmail.com',
        role: 'Admin',
        firstName: 'Admin',
        lastName: 'User'
      }
    });
  } else if (email === 'martin@finesf.com' && password === 'day_!!!') {
    res.json({
      token: 'test-token-456',
      user: {
        id: '2',
        email: 'martin@finesf.com',
        role: 'Admin',
        firstName: 'Martin',
        lastName: 'Admin'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    res.json({ 
      status: 'ok',
      port: process.env.PORT || PORT,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {
    // Temporarily skip database initialization
    console.log('WARNING: Database initialization disabled for testing');
    // await initializeDatabase();
    
    const port = process.env.PORT || PORT;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('Database URL check:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();