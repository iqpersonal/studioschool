# Proposed Module Subscription Tiers

Based on the current system capabilities, here is the recommended differentiation of modules by subscription tier.

| Module | Description | Suggested Tier |
| :--- | :--- | :--- |
| **Core Platform** | Dashboard, Schools, Users, Settings, Profile | **Free / Core** |
| **Notice Board** | School Announcements | **Free / Core** |
| **Support** | Ticketing System | **Free / Core** |
| **Academics** | Grades, Sections, Subjects, Management Assignments | **Basic** |
| **Attendance** | Student Attendance Tracking | **Basic** |
| **Timetable** | Class Scheduling | **Basic** |
| **Assessment** | Assessments Setup, Grading, Progress Reports | **Basic** |
| **Lesson Planner** | Teacher Lesson Planning | **Basic** |
| **Exams** | Exam Sessions & Seating Arrangements | **Premium** |
| **Library** | Library Management System | **Premium** |
| **Finance** | Fee Collection & Payment Tracking | **Premium** |
| **Inventory** | Asset & Inventory Management | **Premium** |
| **AI Analytics** | AI Usage Monitoring & Insights | **Premium** |
| **Audit Logs** | Security & Activity Logs | **Premium** |

## Implementation Strategy

1.  **Free Tier**: Schools get access to the Core Platform to manage their profile and users.
2.  **Basic Tier**: Adds academic management, attendance, and assessments.
3.  **Premium Tier**: Adds specialized modules like Library, Finance, and Inventory.

We can enforce this by checking the `school.subscriptionTier` field in the database and conditionally rendering these routes in the sidebar.
