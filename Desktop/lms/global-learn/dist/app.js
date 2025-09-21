"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = require("body-parser");
const authRoutes_1 = require("./routes/authRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const contentRoutes_1 = require("./routes/contentRoutes");
const dashboardRoutes_1 = require("./routes/dashboardRoutes");
const analyticsRoutes_1 = require("./routes/analyticsRoutes");
const paymentRoutes_1 = require("./routes/paymentRoutes");
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use((0, body_parser_1.json)());
app.use((0, body_parser_1.urlencoded)({ extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.authRoutes);
app.use('/api/users', userRoutes_1.userRoutes);
app.use('/api/content', contentRoutes_1.contentRoutes);
app.use('/api/dashboard', dashboardRoutes_1.dashboardRoutes);
app.use('/api/analytics', analyticsRoutes_1.analyticsRoutes);
app.use('/api/payments', paymentRoutes_1.paymentRoutes);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
