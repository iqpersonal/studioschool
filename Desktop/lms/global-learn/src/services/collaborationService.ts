export class CollaborationService {
    private projects: any[] = [];
    
    constructor() {}

    createProject(projectData: any): any {
        const newProject = { id: this.projects.length + 1, ...projectData };
        this.projects.push(newProject);
        return newProject;
    }

    getProjects(): any[] {
        return this.projects;
    }

    getProjectById(projectId: number): any | null {
        return this.projects.find(project => project.id === projectId) || null;
    }

    updateProject(projectId: number, updatedData: any): any | null {
        const projectIndex = this.projects.findIndex(project => project.id === projectId);
        if (projectIndex === -1) return null;

        this.projects[projectIndex] = { ...this.projects[projectIndex], ...updatedData };
        return this.projects[projectIndex];
    }

    deleteProject(projectId: number): boolean {
        const projectIndex = this.projects.findIndex(project => project.id === projectId);
        if (projectIndex === -1) return false;

        this.projects.splice(projectIndex, 1);
        return true;
    }

    addCollaborator(projectId: number, userId: string): boolean {
        const project = this.getProjectById(projectId);
        if (!project) return false;

        if (!project.collaborators) {
            project.collaborators = [];
        }
        project.collaborators.push(userId);
        return true;
    }

    removeCollaborator(projectId: number, userId: string): boolean {
        const project = this.getProjectById(projectId);
        if (!project || !project.collaborators) return false;

        project.collaborators = project.collaborators.filter(id => id !== userId);
        return true;
    }
}