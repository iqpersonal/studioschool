import Activity from '../models/activity';

class ActivityFeedService {
    private activities: any[] = [];

    public getActivities(userId: string): any[] {
        return this.activities.filter(activity => activity.userId === userId);
    }

    public addActivity(activity: any): void {
        this.activities.push(activity);
    }

    public clearActivities(userId: string): void {
        this.activities = this.activities.filter(activity => activity.userId !== userId);
    }
}
export default ActivityFeedService;
}