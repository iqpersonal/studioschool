export class ContentService {
    private courses: any[] = [];

    public createCourse(courseData: any): any {
        const newCourse = { id: this.courses.length + 1, ...courseData };
        this.courses.push(newCourse);
        return newCourse;
    }

    public getCourses(): any[] {
        return this.courses;
    }

    public getCourseById(courseId: number): any | undefined {
        return this.courses.find(course => course.id === courseId);
    }

    public updateCourse(courseId: number, updatedData: any): any | undefined {
        const courseIndex = this.courses.findIndex(course => course.id === courseId);
        if (courseIndex !== -1) {
            this.courses[courseIndex] = { ...this.courses[courseIndex], ...updatedData };
            return this.courses[courseIndex];
        }
        return undefined;
    }

    public deleteCourse(courseId: number): boolean {
        const courseIndex = this.courses.findIndex(course => course.id === courseId);
        if (courseIndex !== -1) {
            this.courses.splice(courseIndex, 1);
            return true;
        }
        return false;
    }
}