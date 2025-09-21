import { Router } from 'express';
import ContentController from '../controllers/contentController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();
const contentController = new ContentController();

// Route for uploading lessons
router.post('/lessons', authMiddleware, contentController.uploadLesson);

// Route for creating quizzes
router.post('/quizzes', authMiddleware, contentController.createQuiz);

// Route for fetching all course content
router.get('/courses/:courseId/content', contentController.getCourseContent);

// Route for updating course content
router.put('/content/:contentId', authMiddleware, contentController.updateContent);

// Route for deleting course content
router.delete('/content/:contentId', authMiddleware, contentController.deleteContent);

export default router;