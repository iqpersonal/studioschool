"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const activitySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    courseId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    completedLessons: [{
            lessonId: {
                type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
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
const Activity = (0, mongoose_1.model)('Activity', activitySchema);
exports.default = Activity;
