import React from 'react';
import { School } from '../../../types';
import GlassCard, { GlassHeader, GlassTitle, GlassContent } from '../../../components/ui/GlassCard';
import AnimatedNumber from '../../../components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { Users, GraduationCap, CreditCard, TrendingUp } from 'lucide-react';

import DashboardCharts from '../../../components/dashboard/DashboardCharts';
import QuickActions from '../../../components/dashboard/QuickActions';

interface ManagerDashboardProps {
    stats: { studentCount: number; teacherCount: number };
    school: School;
}

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ stats, school }) => {
    const statCards = [
        {
            title: 'Total Students',
            value: stats.studentCount,
            icon: <GraduationCap className="h-5 w-5" />,
            isNumber: true,
            color: "border-l-4 border-emerald-500",
            iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        },
        {
            title: 'Teachers & Staff',
            value: stats.teacherCount,
            icon: <Users className="h-5 w-5" />,
            isNumber: true,
            color: "border-l-4 border-indigo-500",
            iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        },
        {
            title: 'Subscription Plan',
            value: <span className="capitalize">{school.subscriptionTier}</span>,
            icon: <CreditCard className="h-5 w-5" />,
            isNumber: false,
            color: "border-l-4 border-amber-500",
            iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
            <div className="grid gap-6 md:grid-cols-3">
                {statCards.map((stat, index) => (
                    <motion.div key={index} variants={item}>
                        <div className={`relative overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300 group ${stat.color} h-full`}>
                            <div className="absolute inset-y-0 left-0 w-1" /> {/* Border replacement for cleaner look if styled won't work */}

                            <div className="p-6 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{stat.title}</h3>
                                    <div className={`p-2 rounded-lg ${stat.iconBg} transition-transform group-hover:scale-110`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold tracking-tight">
                                        {stat.isNumber ? <AnimatedNumber value={stat.value as number} /> : stat.value}
                                    </div>
                                    {stat.isNumber && (
                                        <p className="text-xs text-muted-foreground mt-2 flex items-center">
                                            <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
                                            <span className="text-emerald-600 font-medium">+5%</span>
                                            <span className="ml-1 opacity-70">this term</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div variants={item}>
                <DashboardCharts />
            </motion.div>

            <motion.div variants={item}>
                <QuickActions />
            </motion.div>

        </motion.div>
    );
};

export default ManagerDashboard;
