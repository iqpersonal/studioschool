import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
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

const Course = model('Course', courseSchema);

export default Course;