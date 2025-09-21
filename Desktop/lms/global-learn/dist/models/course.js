"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const courseSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    lessons: [{
            title: {
                type: String,
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            order: {
                type: Number,
                required: true,
            },
        }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
const Course = (0, mongoose_1.model)('Course', courseSchema);
exports.default = Course;
