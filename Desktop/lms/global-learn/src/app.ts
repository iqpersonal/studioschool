import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import contentRoutes from './routes/contentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import paymentRoutes from './routes/paymentRoutes';
import errorHandler from './middlewares/errorHandler';


const app = express();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/global_learn';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
} as any);
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
});

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Health check endpoint for deployment monitoring
import { Request, Response } from 'express';

// TODO: Make sure to install all dependencies:
// npm install express mongoose body-parser cors
// npm install --save-dev @types/express @types/mongoose @types/body-parser @types/cors @types/node

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
});