"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = __importDefault(require("../controllers/dashboardController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const dashboardController = new dashboardController_1.default();
// Routes for retrieving dashboard data
router.get('/student', authMiddleware_1.authMiddleware, dashboardController.getStudentDashboard);
router.get('/parent', authMiddleware_1.authMiddleware, dashboardController.getParentDashboard);
router.get('/instructor', authMiddleware_1.authMiddleware, dashboardController.getInstructorDashboard);
exports.default = router;
