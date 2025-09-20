export class ContentController {
    constructor(private contentService: any) {}

    async uploadLesson(req: any, res: any) {
        try {
            const lessonData = req.body;
            const result = await this.contentService.uploadLesson(lessonData);
            res.status(201).json({ message: 'Lesson uploaded successfully', data: result });
        } catch (error) {
            res.status(500).json({ message: 'Error uploading lesson', error: error.message });
        }
    }

    async createQuiz(req: any, res: any) {
        try {
            const quizData = req.body;
            const result = await this.contentService.createQuiz(quizData);
            res.status(201).json({ message: 'Quiz created successfully', data: result });
        } catch (error) {
            res.status(500).json({ message: 'Error creating quiz', error: error.message });
        }
    }

    async getCourseContent(req: any, res: any) {
        try {
            const courseId = req.params.id;
            const content = await this.contentService.getCourseContent(courseId);
            res.status(200).json({ data: content });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving course content', error: error.message });
        }
    }
}