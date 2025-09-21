"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = __importDefault(require("../controllers/analyticsController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const analyticsController = new analyticsController_1.default();
router.get('/reports', authMiddleware_1.authMiddleware, analyticsController.getReports);
router.get('/engagement', authMiddleware_1.authMiddleware, analyticsController.getEngagementData);
router.get('/performance', authMiddleware_1.authMiddleware, analyticsController.getPerformanceData);
exports.default = router;
