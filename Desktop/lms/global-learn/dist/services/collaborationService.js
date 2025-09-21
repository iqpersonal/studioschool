"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationService = void 0;
class CollaborationService {
    constructor() {
        this.projects = [];
    }
    createProject(projectData) {
        const newProject = Object.assign({ id: this.projects.length + 1 }, projectData);
        this.projects.push(newProject);
        return newProject;
    }
    getProjects() {
        return this.projects;
    }
    getProjectById(projectId) {
        return this.projects.find(project => project.id === projectId) || null;
    }
    updateProject(projectId, updatedData) {
        const projectIndex = this.projects.findIndex(project => project.id === projectId);
        if (projectIndex === -1)
            return null;
        this.projects[projectIndex] = Object.assign(Object.assign({}, this.projects[projectIndex]), updatedData);
        return this.projects[projectIndex];
    }
    deleteProject(projectId) {
        const projectIndex = this.projects.findIndex(project => project.id === projectId);
        if (projectIndex === -1)
            return false;
        this.projects.splice(projectIndex, 1);
        return true;
    }
    addCollaborator(projectId, userId) {
        const project = this.getProjectById(projectId);
        if (!project)
            return false;
        if (!project.collaborators) {
            project.collaborators = [];
        }
        project.collaborators.push(userId);
        return true;
    }
    removeCollaborator(projectId, userId) {
        const project = this.getProjectById(projectId);
        if (!project || !project.collaborators)
            return false;
        project.collaborators = project.collaborators.filter(id => id !== userId);
        return true;
    }
}
exports.CollaborationService = CollaborationService;
