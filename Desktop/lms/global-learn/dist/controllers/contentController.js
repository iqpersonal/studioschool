"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
class ContentController {
    constructor(contentService) {
        this.contentService = contentService;
    }
    uploadLesson(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lessonData = req.body;
                const result = yield this.contentService.uploadLesson(lessonData);
                res.status(201).json({ message: 'Lesson uploaded successfully', data: result });
            }
            catch (error) {
                res.status(500).json({ message: 'Error uploading lesson', error: error.message });
            }
        });
    }
    createQuiz(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const quizData = req.body;
                const result = yield this.contentService.createQuiz(quizData);
                res.status(201).json({ message: 'Quiz created successfully', data: result });
            }
            catch (error) {
                res.status(500).json({ message: 'Error creating quiz', error: error.message });
            }
        });
    }
    getCourseContent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const courseId = req.params.id;
                const content = yield this.contentService.getCourseContent(courseId);
                res.status(200).json({ data: content });
            }
            catch (error) {
                res.status(500).json({ message: 'Error retrieving course content', error: error.message });
            }
        });
    }
}
exports.ContentController = ContentController;
