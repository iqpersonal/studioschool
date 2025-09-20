import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import { authRoutes } from './routes/authRoutes';
import { userRoutes } from './routes/userRoutes';
import { contentRoutes } from './routes/contentRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { analyticsRoutes } from './routes/analyticsRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

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
});