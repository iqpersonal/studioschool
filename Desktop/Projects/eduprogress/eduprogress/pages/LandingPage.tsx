import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, cubicBezier } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CheckCircle2,
    BarChart3,
    BrainCircuit,
    ShieldCheck,
    Zap,
    Users,
    GraduationCap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// --- Reusable Motion Components ---

const FadeIn: React.FC<{ children: React.ReactNode, delay?: number, direction?: 'up' | 'down' | 'left' | 'right' }> = ({
    children,
    delay = 0,
    direction = 'up'
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const directions = {
        up: { y: 40, x: 0 },
        down: { y: -40, x: 0 },
        left: { x: 40, y: 0 },
        right: { x: -40, y: 0 }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, ...directions[direction] }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{
                duration: 0.8,
                delay: delay,
                ease: [0.21, 0.47, 0.32, 0.98]
            }}
        >
            {children}
        </motion.div>
    );
};

const ScaleIn: React.FC<{ children: React.ReactNode, delay?: number }> = ({ children, delay = 0 }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: delay, ease: "backOut" }}
        >
            {children}
        </motion.div>
    );
};

// --- Custom Hero Illustration ---

const HeroIllustration = () => {
    return (
        <div className="relative w-full h-[400px] sm:h-[500px] flex items-center justify-center">
            {/* Floating Elements Container */}
            <motion.div
                className="relative w-full max-w-lg aspect-square"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                {/* Central Abstract Shape */}
                <motion.div
                    animate={{
                        rotate: 360,
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                        scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"
                />

                {/* Floating Cards */}
                <motion.div
                    className="absolute top-1/4 left-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl w-48"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1, y: [0, -10, 0] }}
                    transition={{
                        x: { duration: 0.8, delay: 0.2 },
                        opacity: { duration: 0.8, delay: 0.2 },
                        y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="h-2 w-20 bg-white/20 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-white/10 rounded-full" />
                        <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                    </div>
                </motion.div>

                <motion.div
                    className="absolute bottom-1/4 right-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl w-56"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1, y: [0, 15, 0] }}
                    transition={{
                        x: { duration: 0.8, delay: 0.4 },
                        opacity: { duration: 0.8, delay: 0.4 },
                        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                    }}
                >
                    <div className="flex justify-between items-end gap-2 h-24 mb-2">
                        {[40, 70, 50, 90, 65].map((h, i) => (
                            <motion.div
                                key={i}
                                className="w-full bg-amber-500/80 rounded-t-sm"
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: 0.8 + (i * 0.1) }}
                            />
                        ))}
                    </div>
                    <div className="text-xs text-white/50 text-center font-mono">Performance Analytics</div>
                </motion.div>

                {/* Code/Data Window */}
                <motion.div
                    className="absolute top-10 right-10 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl w-40 font-mono text-xs overflow-hidden"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <div className="flex gap-1.5 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="space-y-1 opacity-70">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            className="h-1.5 bg-indigo-400 rounded-full"
                        />
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "70%" }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                            className="h-1.5 bg-purple-400 rounded-full"
                        />
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};

// --- Main Landing Page Component ---

const LandingPage = () => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const { currentUserData } = useAuth();
    const isLoggedIn = !!currentUserData;

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">

            {/* Scroll Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 origin-left z-50"
                style={{ scaleX }}
            />

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-40 bg-slate-950/50 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            EduProgress
                        </span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        {isLoggedIn ? (
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-2.5 rounded-full bg-white text-slate-900 font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2 group"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <>
                                <button onClick={() => navigate('/login')} className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                    Sign In
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.7)]"
                                >
                                    Get Started
                                </button>
                            </>
                        )}
                    </motion.div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <FadeIn delay={0.1}>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-4">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                New: AI-Powered Assessment Grading
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                                Modernize Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400">
                                    School Management
                                </span>
                            </h1>
                        </FadeIn>

                        <FadeIn delay={0.2}>
                            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
                                Streamline operations, enhance learning with AI, and empower students, teachers, and parents with a unified, state-of-the-art platform.
                            </p>
                        </FadeIn>

                        <FadeIn delay={0.3}>
                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
                                    className="px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg hover:scale-105 transition-transform shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                >
                                    Start Free Trial
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-colors backdrop-blur-sm">
                                    Book Demo
                                </button>
                            </div>
                        </FadeIn>

                        <FadeIn delay={0.4}>
                            <div className="pt-8 flex items-center gap-8 text-slate-500">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                    <span>Free Setup</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                    <span>24/7 Support</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                    <span>GDPR Compliant</span>
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    <div className="relative">
                        <HeroIllustration />
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900/50 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <FadeIn>
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <span className="text-indigo-400">excel</span></h2>
                            <p className="text-slate-400 text-lg">
                                Our platform unifies every aspect of school administration into one beautiful, intuitive interface.
                            </p>
                        </div>
                    </FadeIn>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <BrainCircuit className="w-6 h-6" />,
                                title: "AI Analysis",
                                desc: "Automated grading and performance insights powered by advanced AI models.",
                                color: "from-pink-500 to-rose-500"
                            },
                            {
                                icon: <BarChart3 className="w-6 h-6" />,
                                title: "Real-time Reports",
                                desc: "Live dashboards for attendance, grades, and financial health.",
                                color: "from-amber-400 to-orange-500"
                            },
                            {
                                icon: <ShieldCheck className="w-6 h-6" />,
                                title: "Secure & Safe",
                                desc: "Enterprise-grade security ensuring your student data is always protected.",
                                color: "from-emerald-400 to-green-600"
                            },
                            {
                                icon: <Users className="w-6 h-6" />,
                                title: "Role-Based Access",
                                desc: "Custom portals for Students, Parents, Teachers, and Admins.",
                                color: "from-blue-400 to-indigo-500"
                            },
                            {
                                icon: <Zap className="w-6 h-6" />,
                                title: "Fast Implementation",
                                desc: "Get your entire school onboarded in days, not months.",
                                color: "from-purple-400 to-violet-600"
                            },
                            {
                                icon: <GraduationCap className="w-6 h-6" />,
                                title: "Curriculum Tools",
                                desc: "Lesson planners and resource libraries integrated directly into workflow.",
                                color: "from-cyan-400 to-sky-500"
                            }
                        ].map((feature, idx) => (
                            <ScaleIn key={idx} delay={idx * 0.1}>
                                <div className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors overflow-hidden h-full">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-200 transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            </ScaleIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 border-y border-white/5 bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                        {[
                            { val: "500+", label: "Schools Connected" },
                            { val: "1M+", label: "Assignments Graded" },
                            { val: "99.9%", label: "Uptime Guaranteed" },
                            { val: "24/7", label: "Expert Support" },
                        ].map((stat, i) => (
                            <FadeIn key={i} delay={i * 0.1} direction="up">
                                <div className="space-y-2">
                                    <div className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                                        {stat.val}
                                    </div>
                                    <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                                        {stat.label}
                                    </div>
                                </div>
                            </FadeIn>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900/10" />

                <div className="max-w-5xl mx-auto px-6 relative text-center">
                    <FadeIn>
                        <h2 className="text-4xl md:text-6xl font-bold mb-8">
                            Ready to transform your institution?
                        </h2>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                            Join hundreds of forward-thinking schools using EduProgress to build a better future.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto px-10 py-5 rounded-full bg-white text-slate-950 text-xl font-bold hover:bg-slate-200 transition-colors shadow-2xl"
                            >
                                Get Started Now
                            </button>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 bg-slate-950 text-slate-500 text-sm">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        <span className="font-semibold text-slate-300">EduProgress</span>
                        <span>© 2026. All rights reserved.</span>
                    </div>
                    <div className="flex gap-8">
                        <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
