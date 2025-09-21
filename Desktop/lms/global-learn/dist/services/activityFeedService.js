"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityFeedService = void 0;
class ActivityFeedService {
    constructor() {
        this.activities = [];
    }
    getActivities(userId) {
        return this.activities.filter(activity => activity.userId === userId);
    }
    addActivity(activity) {
        this.activities.push(activity);
    }
    clearActivities(userId) {
        this.activities = this.activities.filter(activity => activity.userId !== userId);
    }
}
exports.ActivityFeedService = ActivityFeedService;
