import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  BrainCircuit,
  Users
} from 'lucide-react';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import { PARENT_EMAIL_DOMAIN } from '../constants';

// --- Graphics Components ---

// 1. Education / Future-Ready Graphic
const GraphicEducation = () => (
  <div className="w-full h-full flex items-center justify-center relative">
    <div className="relative w-64 h-64">
      {/* Spinning Rings (Atom-like) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-indigo-400/30 rounded-full skew-x-12 skew-y-12"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border-2 border-purple-400/30 rounded-full skew-x-[-12deg] skew-y-[-12deg]"
      />

      {/* Central Brain/Core */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 m-auto w-32 h-32 bg-indigo-500/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] border border-indigo-400/20"
      >
        <BrainCircuit className="w-16 h-16 text-white/90" />
      </motion.div>

      {/* Orbiting Particles */}
      {[0, 120, 240].map((deg, i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ rotate: deg }}
        >
          <div className="w-3 h-3 bg-white rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_15px_white]" />
        </motion.div>
      ))}
    </div>
  </div>
);

// 2. Real-time Analytics Graphic
const GraphicAnalytics = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative w-80 h-60 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 shadow-2xl overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-10 pointer-events-none">
        <div className="w-full h-px bg-white" />
        <div className="w-full h-px bg-white" />
        <div className="w-full h-px bg-white" />
        <div className="w-full h-px bg-white" />
      </div>

      {/* Rising Bars */}
      <div className="h-full flex items-end justify-between gap-3 relative z-10 px-2 pb-2">
        {[35, 60, 45, 80, 55, 90].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: "10%" }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 1.5, delay: i * 0.1, ease: "backOut" }}
            className="w-full bg-gradient-to-t from-amber-600 to-orange-400 rounded-t-sm opacity-90"
          />
        ))}
      </div>

      {/* Floating Tag */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-xs font-mono text-amber-300 border border-amber-500/30 flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        +24.5%
      </motion.div>
    </div>
  </div>
);

// 3. Collaboration Graphic
const GraphicCollaboration = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Central Node */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] z-20 relative border border-emerald-400/30"
      >
        <Users className="w-10 h-10 text-white" />
      </motion.div>

      {/* Satellite Nodes */}
      {[
        { x: -85, y: -65, delay: 0, icon: <GraduationCap className="w-5 h-5" /> },
        { x: 90, y: -50, delay: 0.2, icon: <CheckCircle2 className="w-5 h-5" /> },
        { x: 0, y: 90, delay: 0.4, icon: <Mail className="w-5 h-5" /> }
      ].map((node, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
          animate={{ scale: 1, opacity: 1, x: node.x, y: node.y }}
          transition={{ delay: node.delay, duration: 0.6, type: "spring" }}
          className="absolute z-10"
        >
          {/* Dashed Line Connection - Rendered as absolute div lines for simplicity */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: Math.sqrt(node.x ** 2 + node.y ** 2) - 30 }}
            transition={{ delay: node.delay + 0.3, duration: 0.5 }}
            className="absolute top-1/2 left-1/2 h-0.5 bg-emerald-500/30 origin-left -z-10"
            style={{
              transform: `translate(-50%, -50%) rotate(${Math.atan2(-node.y, -node.x)}rad) translate(30px, 0)`
            }}
          />

          <div className="w-12 h-12 bg-slate-800 border-2 border-emerald-500/50 rounded-full flex items-center justify-center shadow-lg text-emerald-400">
            {node.icon}
          </div>
        </motion.div>
      ))}

      {/* Rotating Ring to bind them */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute w-64 h-64 border border-emerald-500/10 rounded-full border-dashed"
      />
    </div>
  </div>
);

// --- Testimonial / Value Prop Component ---
const ValueProps = () => {
  const props = [
    {
      title: "Future-Ready Education",
      text: "Empower your institution with AI-driven insights and automated grading systems.",
      color: "from-indigo-500 to-purple-600",
      component: <GraphicEducation />
    },
    {
      title: "Real-time Analytics",
      text: "Track student performance, attendance, and health variance in real-time.",
      color: "from-amber-400 to-orange-500",
      component: <GraphicAnalytics />
    },
    {
      title: "Seamless Collaboration",
      text: "Connect teachers, students, and parents in one unified secure platform.",
      color: "from-emerald-400 to-cyan-500",
      component: <GraphicCollaboration />
    }
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % props.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-full flex flex-col justify-between p-12 text-white overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 z-0" />

      {/* Animated Background Gradients */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 bg-gradient-to-br ${props[current].color} opacity-20 z-0`}
        />
      </AnimatePresence>

      {/* Background Blob Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />

      {/* Logo Area */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <GraduationCap className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-wide">EduProgress</span>
      </div>

      {/* Central Graphic Area - The "Blank Space" Filler */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-10 scale-90 xl:scale-100 transition-transform">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full max-h-[400px] flex items-center justify-center"
          >
            {props[current].component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content Slider */}
      <div className="relative z-10 max-w-lg mt-auto mb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              {props[current].title}
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              {props[current].text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators */}
      <div className="relative z-10 flex gap-2">
        {props.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let loginEmail = email;
      if (!email.includes('@')) {
        loginEmail = `${email}@${PARENT_EMAIL_DOMAIN}`;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/invalid-credential') errorMessage = 'Invalid credentials provided.';
      else if (err.code === 'auth/user-not-found') errorMessage = 'User not found.';
      else if (err.code === 'auth/wrong-password') errorMessage = 'Incorrect password.';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      {/* Left Column - Visuals (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-slate-900">
        <ValueProps />
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Background Details */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950 to-slate-950 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex lg:hidden items-center gap-2 mb-8"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-white">EduProgress</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white tracking-tight"
            >
              Welcome back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-slate-400"
            >
              Please sign in to your dashboard
            </motion.p>
          </div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            {/* Email / User Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email or Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="name@school.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-700 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
                >
                  <div className="mt-0.5"><CheckCircle2 className="w-4 h-4" /></div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></span>
              )}
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-6 text-center"
          >
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Contact your school administrator
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};

export default Login;
