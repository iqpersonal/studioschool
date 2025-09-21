"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const analyticsSchema = new mongoose_1.Schema({
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
    engagementTime: {
        type: Number,
        required: true
    },
    quizScores: [{
            quizId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Content'
            },
            score: {
                type: Number,
                required: true
            }
        }],
    completedLessons: [{
            lessonId: {
                type: mongoose_1.Schema.Types.ObjectId,
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
const Analytics = (0, mongoose_1.model)('Analytics', analyticsSchema);
exports.default = Analytics;
