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
import { motion } from 'framer-motion';
import {
  School as SchoolIcon,
  CreditCard as SubscriptionIcon,
  Ticket as TicketIcon,
  Bot as RobotIcon,
  Plus,
  ArrowRight,
  LayoutGrid,
  Settings,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';

// --- Motion Components ---

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

// --- Custom Graphics ---

const DashboardIllustration = () => (
  <div className="relative w-full h-full min-h-[160px] flex items-center justify-center overflow-hidden">
    {/* Abstract Background Shapes */}
    <motion.div
      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"
    />
    <motion.div
      animate={{ rotate: -360, scale: [1, 1.2, 1] }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"
    />

    <div className="relative z-10 flex gap-4">
      {/* Floating Cards Graphic */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-32 bg-slate-800/80 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-xl transform -rotate-6"
      >
        <div className="h-2 w-12 bg-indigo-500/50 rounded mb-2" />
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-slate-600 rounded" />
          <div className="h-1.5 w-2/3 bg-slate-600 rounded" />
        </div>
        <div className="mt-3 flex gap-1">
          <div className="h-6 w-full bg-indigo-500/20 rounded" />
          <div className="h-6 w-full bg-purple-500/20 rounded" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-32 bg-indigo-600 p-3 rounded-xl shadow-2xl transform rotate-3 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="text-xs text-indigo-200 font-mono">+12%</div>
        </div>
        <div className="h-8 w-full mt-2 flex items-end gap-1">
          {[40, 70, 50, 90, 60].map((h, i) => (
            <div key={i} style={{ height: `${h}%` }} className="w-full bg-white/40 rounded-t-[2px]" />
          ))}
        </div>
      </motion.div>
    </div>
  </div>
);

// --- Dashboard Component ---

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}

const StatCardComp = ({ title, value, change, icon, color, delay }: StatCardProps) => (
  <motion.div variants={item} className="h-full">
    <Card className="overflow-hidden border-l-4 h-full hover:shadow-lg transition-all duration-300 group" style={{ borderLeftColor: color }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
          {value}
        </div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-green-600 font-medium">{change}</span>
            <span className="opacity-70">vs last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const Dashboard = () => {
  const { currentUserData } = useAuth();
  const navigate = useNavigate();

  // Stats Data
  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats formatting
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Recent Schools Listener
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

  const stats = statsLoading || !statsData
    ? [
      { title: 'Total Schools', value: '...', color: '#6366f1', icon: <SchoolIcon size={18} /> },
      { title: 'Active Subscriptions', value: '...', color: '#ec4899', icon: <SubscriptionIcon size={18} /> },
      { title: 'Support Tickets', value: '...', color: '#eab308', icon: <TicketIcon size={18} /> },
      { title: 'AI Tokens Usage', value: '...', color: '#10b981', icon: <RobotIcon size={18} /> },
    ]
    : [
      {
        title: 'Total Schools',
        value: statsData.statErrors.schools ? 'Err' : statsData.schoolsCount.toString(),
        change: '+4%',
        color: '#6366f1', // Indigo
        icon: <SchoolIcon size={18} color="#6366f1" />,
      },
      {
        title: 'Active Subscriptions',
        value: statsData.statErrors.subscriptions ? 'Err' : statsData.activeSubs.toString(),
        change: '+12%',
        color: '#ec4899', // Pink
        icon: <SubscriptionIcon size={18} color="#ec4899" />,
      },
      {
        title: 'Support Tickets',
        value: statsData.statErrors.tickets ? 'Err' : statsData.openTickets.toString(),
        change: '-2%',
        color: '#eab308', // Yellow
        icon: <TicketIcon size={18} color="#eab308" />,
      },
      {
        title: 'AI Tokens Usage',
        value: statsData.statErrors.aiUsage ? 'Err' : formatNumber(statsData.totalTokens),
        change: '+25%',
        color: '#10b981', // Emerald
        icon: <RobotIcon size={18} color="#10b981" />,
      },
    ];

  const quickActions = [
    { title: 'Manage Modules', path: '/modules', icon: <LayoutGrid className="w-5 h-5 text-indigo-500" />, desc: 'Configure system modules' },
    { title: 'Subscriptions', path: '/subscriptions', icon: <SubscriptionIcon className="w-5 h-5 text-pink-500" />, desc: 'Manage billing plans' },
    { title: 'Support Queue', path: '/support', icon: <TicketIcon className="w-5 h-5 text-amber-500" />, desc: 'View open tickets' },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Welcome Header */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl dark:border dark:border-white/10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="grid md:grid-cols-[1fr_300px] items-center">
          <div className="p-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Welcome back, {currentUserData?.name?.split(' ')[0] || 'Admin'}! 👋
              </h1>
              <p className="text-indigo-200/80 max-w-lg text-lg mb-6">
                Here's what's happening across your education platform today. You have <span className="text-white font-semibold">{statsData?.openTickets || 0} support tickets</span> pending.
              </p>
              <div className="flex gap-3">
                <Button size="lg" onClick={() => navigate('/schools')} className="bg-white text-indigo-950 hover:bg-indigo-50 border-none">
                  <Plus className="w-4 h-4 mr-2" />
                  New School
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/settings')} className="bg-transparent text-white border-white/20 hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Illustration Area */}
          <div className="h-full hidden md:block relative">
            <div className="absolute inset-0 bg-gradient-to-l from-indigo-500/10 to-transparent" />
            <DashboardIllustration />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCardComp
            key={index}
            {...stat}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Signups */}
        <motion.div variants={item} className="lg:col-span-2 h-full">
          <Card className="h-full border-none shadow-md bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Recent School Signups
              </CardTitle>
              <CardDescription>
                New institutions joining the EduProgress network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSchools.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No new schools have signed up recently.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSchools.map((school, i) => (
                    <motion.div
                      key={school.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => navigate('/schools')}
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                        {school.logoURL ? (
                          <img
                            src={school.logoURL}
                            alt={school.name}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <SchoolIcon size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {school.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>Joined {school.createdAt
                            ? school.createdAt instanceof Timestamp
                              ? school.createdAt.toDate().toLocaleDateString()
                              : new Date(school.createdAt).toLocaleDateString()
                            : 'N/A'}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="h-full">
          <Card className="h-full border-none shadow-md bg-gradient-to-b from-white to-slate-50 dark:from-card dark:to-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>Shortcut to your frequent tasks.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {quickActions.map((action, i) => (
                <motion.div
                  key={action.path}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={action.path}
                    className="flex items-center p-3 rounded-xl border bg-white dark:bg-slate-950/50 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {action.icon}
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-foreground">{action.title}</h4>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <ArrowRight className="ml-auto w-4 h-4 text-slate-300" />
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
