"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const userController = new userController_1.UserController();
// Route to get user profile
router.get('/profile', authMiddleware_1.authMiddleware, userController.getUserProfile);
// Route to update user profile
router.put('/profile', authMiddleware_1.authMiddleware, userController.updateUserProfile);
// Route to get user activity
router.get('/activity', authMiddleware_1.authMiddleware, userController.getUserActivity);
exports.default = router;
