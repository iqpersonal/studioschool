import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStats } from '../hooks/useDashboardStats';
import Button from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { School } from '../types';

// ============= ICON COMPONENTS =============

const SchoolIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 14l9-5-9-5-9 5m0 0l9 5m-9-5v10l9 5m0 0l9-5m-9 5v-10m0 0l-9-5"
    />
  </svg>
);

const SubscriptionIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TicketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"
    />
  </svg>
);

const RobotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-muted-foreground"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const DashboardVector = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 400 300"
    className="h-48 w-full md:h-64 md:w-96"
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
        <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.2 }} />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#grad1)" rx="8" />
    <circle cx="100" cy="100" r="40" fill="#3b82f6" opacity="0.3" />
    <circle cx="300" cy="200" r="60" fill="#8b5cf6" opacity="0.2" />
    <rect x="50" y="150" width="300" height="100" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.3" rx="4" />
    <line x1="80" y1="170" x2="320" y2="170" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
    <line x1="80" y1="190" x2="320" y2="190" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
    <line x1="80" y1="210" x2="320" y2="210" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
  </svg>
);

// ============= DASHBOARD COMPONENT =============

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}

const Dashboard = () => {
  const { currentUserData } = useAuth();
  const navigate = useNavigate();

  // Use React Query hook for dashboard stats caching
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();

  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Build stats array from React Query data
  const stats: StatCard[] = statsLoading || !statsData
    ? [
        { title: 'Total Schools', value: 'Loading...', change: '', icon: <SchoolIcon /> },
        { title: 'Active Subscriptions', value: 'Loading...', change: '', icon: <SubscriptionIcon /> },
        { title: 'Open Support Tickets', value: 'Loading...', change: '', icon: <TicketIcon /> },
        { title: 'Total AI Tokens', value: 'Loading...', change: '', icon: <RobotIcon /> },
      ]
    : [
        {
          title: 'Total Schools',
          value: statsData.statErrors.schools ? statsData.statErrors.schools : statsData.schoolsCount.toString(),
          change: '',
          icon: <SchoolIcon />,
        },
        {
          title: 'Active Subscriptions',
          value: statsData.statErrors.subscriptions ? statsData.statErrors.subscriptions : statsData.activeSubs.toString(),
          change: '',
          icon: <SubscriptionIcon />,
        },
        {
          title: 'Open Support Tickets',
          value: statsData.statErrors.tickets ? statsData.statErrors.tickets : statsData.openTickets.toString(),
          change: '',
          icon: <TicketIcon />,
        },
        {
          title: 'Total AI Tokens',
          value: statsData.statErrors.aiUsage ? statsData.statErrors.aiUsage : formatNumber(statsData.totalTokens),
          change: '',
          icon: <RobotIcon />,
        },
      ];

  // Separate effect for real-time recent schools listener
  useEffect(() => {
    const schoolsRef = collection(db, 'schools');
    const q = query(schoolsRef, orderBy('createdAt', 'desc'), limit(5));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const schoolsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as School[];
        setRecentSchools(schoolsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching recent schools:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const quickActions = [
    {
      title: 'Manage Modules',
      path: '/modules',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      title: 'View Subscriptions',
      path: '/subscriptions',
      icon: <SubscriptionIcon />,
    },
    {
      title: 'Check Support Queue',
      path: '/support',
      icon: <TicketIcon />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-lg bg-card border dark:border-border/50 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {currentUserData?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-muted-foreground max-w-md">
            Here's a snapshot of your platform's activity. You can create new
            schools or manage existing ones.
          </p>
          <div className="pt-2">
            <Button size="lg" onClick={() => navigate('/schools')}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create a New School
            </Button>
          </div>
        </div>
        <div className="w-full md:w-auto flex justify-center shrink-0">
          <DashboardVector />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Signups */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent School Signups</CardTitle>
            <CardDescription>
              New schools that have joined the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : recentSchools.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No new schools have signed up recently.
              </p>
            ) : (
              <div className="space-y-4">
                {recentSchools.map((school) => (
                  <div key={school.id} className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                      {school.logoURL ? (
                        <img
                          src={school.logoURL}
                          alt={school.name + ' logo'}
                          className="w-full h-full rounded-md object-cover"
                        />
                      ) : (
                        <SchoolIcon />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {school.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Joined on{' '}
                        {school.createdAt
                          ? school.createdAt instanceof Timestamp
                            ? school.createdAt.toDate().toLocaleDateString()
                            : new Date(school.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/schools')}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center p-2 -mx-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="text-muted-foreground">{action.icon}</div>
                <span className="ml-3">{action.title}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
