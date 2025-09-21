"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contentController_1 = __importDefault(require("../controllers/contentController"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
const contentController = new contentController_1.default();
// Route for uploading lessons
router.post('/lessons', authMiddleware_1.authMiddleware, contentController.uploadLesson);
// Route for creating quizzes
router.post('/quizzes', authMiddleware_1.authMiddleware, contentController.createQuiz);
// Route for fetching all course content
router.get('/courses/:courseId/content', contentController.getCourseContent);
// Route for updating course content
router.put('/content/:contentId', authMiddleware_1.authMiddleware, contentController.updateContent);
// Route for deleting course content
router.delete('/content/:contentId', authMiddleware_1.authMiddleware, contentController.deleteContent);
exports.default = router;
