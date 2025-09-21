"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
class ContentService {
    constructor() {
        this.courses = [];
    }
    createCourse(courseData) {
        const newCourse = Object.assign({ id: this.courses.length + 1 }, courseData);
        this.courses.push(newCourse);
        return newCourse;
    }
    getCourses() {
        return this.courses;
    }
    getCourseById(courseId) {
        return this.courses.find(course => course.id === courseId);
    }
    updateCourse(courseId, updatedData) {
        const courseIndex = this.courses.findIndex(course => course.id === courseId);
        if (courseIndex !== -1) {
            this.courses[courseIndex] = Object.assign(Object.assign({}, this.courses[courseIndex]), updatedData);
            return this.courses[courseIndex];
        }
        return undefined;
    }
    deleteCourse(courseId) {
        const courseIndex = this.courses.findIndex(course => course.id === courseId);
        if (courseIndex !== -1) {
            this.courses.splice(courseIndex, 1);
            return true;
        }
        return false;
    }
}
exports.ContentService = ContentService;
