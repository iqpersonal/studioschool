import { Schema, model } from 'mongoose';

const analyticsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    courseId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    engagementTime: {
        type: Number,
        required: true
    },
    quizScores: [{
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Content'
        },
        score: {
            type: Number,
            required: true
        }
    }],
    completedLessons: [{
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Content'
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Analytics = model('Analytics', analyticsSchema);

export default Analytics;