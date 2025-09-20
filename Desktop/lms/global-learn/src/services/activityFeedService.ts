import { Activity } from '../models/activity';

export class ActivityFeedService {
    private activities: Activity[] = [];

    public getActivities(userId: string): Activity[] {
        return this.activities.filter(activity => activity.userId === userId);
    }

    public addActivity(activity: Activity): void {
        this.activities.push(activity);
    }

    public clearActivities(userId: string): void {
        this.activities = this.activities.filter(activity => activity.userId !== userId);
    }
}