import { Schema, model } from 'mongoose';

const activitySchema = new Schema({
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
    completedLessons: [{
        lessonId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Content'
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    quizScores: [{
        quizId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Content'
        },
        score: {
            type: Number,
            required: true
        },
        takenAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Activity = model('Activity', activitySchema);

export default Activity;