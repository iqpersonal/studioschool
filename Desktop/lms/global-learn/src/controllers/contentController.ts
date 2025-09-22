class ContentController {
    constructor(private contentService: any) {}

    async uploadLesson(req: any, res: any) {
        try {
            const lessonData = req.body;
            const result = await this.contentService.uploadLesson(lessonData);
            res.status(201).json({ message: 'Lesson uploaded successfully', data: result });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error uploading lesson', error: errMsg });
        }
    }

    async createQuiz(req: any, res: any) {
        try {
            const quizData = req.body;
            const result = await this.contentService.createQuiz(quizData);
            res.status(201).json({ message: 'Quiz created successfully', data: result });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error creating quiz', error: errMsg });
        }
    }

    async getCourseContent(req: any, res: any) {
        try {
            const courseId = req.params.id;
            const content = await this.contentService.getCourseContent(courseId);
            res.status(200).json({ data: content });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error retrieving course content', error: errMsg });
        }
    }
    async updateContent(req: any, res: any) {
        try {
            const contentId = parseInt(req.params.contentId, 10);
            const updatedData = req.body;
            const result = await this.contentService.updateCourse(contentId, updatedData);
            if (result) {
                res.status(200).json({ message: 'Content updated successfully', data: result });
            } else {
                res.status(404).json({ message: 'Content not found' });
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error updating content', error: errMsg });
        }
    }

    async deleteContent(req: any, res: any) {
        try {
            const contentId = parseInt(req.params.contentId, 10);
            const deleted = await this.contentService.deleteCourse(contentId);
            if (deleted) {
                res.status(200).json({ message: 'Content deleted successfully' });
            } else {
                res.status(404).json({ message: 'Content not found' });
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            res.status(500).json({ message: 'Error deleting content', error: errMsg });
        }
    }
}
export default ContentController;