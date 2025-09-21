import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
// import contentRoutes from './routes/contentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
// import analyticsRoutes from './routes/analyticsRoutes';
// import paymentRoutes from './routes/paymentRoutes';
import errorHandler from './middlewares/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/content', contentRoutes);
app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    // Generate an ID similar to the problem statement format
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 14);
    const id = `dxb1:dxb1::s5x67-${timestamp}-${randomSuffix}`;
    
    res.status(404).json({ 
        error: 'NOT_FOUND', 
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
        id: id,
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    console.log(`Dashboard endpoints: http://localhost:${PORT}/api/dashboard/*`);
});