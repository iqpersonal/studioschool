
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

import { PARENT_EMAIL_DOMAIN } from '../constants';

const LoginVector = () => (
  <svg width="100%" height="100%" viewBox="0 0 400 400" className="max-w-md mx-auto">
    <defs>
      <linearGradient id="login-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="login-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.1" />
        <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.3" />
      </linearGradient>
      <style>
        {`
                    @keyframes float {
                        0% { transform: translatey(0px); }
                        50% { transform: translatey(-10px); }
                        100% { transform: translatey(0px); }
                    }
                     @keyframes float-delay-1 {
                        0% { transform: translatey(0px); }
                        50% { transform: translatey(-8px); }
                        100% { transform: translatey(0px); }
                    }
                     @keyframes float-delay-2 {
                        0% { transform: translatey(0px); }
                        50% { transform: translatey(-12px); }
                        100% { transform: translatey(0px); }
                    }
                    .float-1 { animation: float 6s ease-in-out infinite; }
                    .float-2 { animation: float-delay-1 7s ease-in-out infinite; }
                    .float-3 { animation: float-delay-2 5s ease-in-out infinite; }
                `}
      </style>
    </defs>
    {/* Open Book */}
    <g className="float-1">
      <path d="M 50 250 C 100 200, 150 200, 200 250 L 200 320 C 150 270, 100 270, 50 320 Z" fill="url(#login-grad-1)" />
      <path d="M 200 250 C 250 200, 300 200, 350 250 L 350 320 C 300 270, 250 270, 200 320 Z" fill="url(#login-grad-1)" />
      <rect x="40" y="240" width="320" height="10" fill="hsl(var(--primary))" rx="5" />
    </g>
    {/* Graduation Cap */}
    <g className="float-2" transform="translate(0, -20)">
      <path d="M 120 150 L 200 190 L 280 150 L 200 110 Z" fill="hsl(var(--primary))" />
      <path d="M 160 190 L 160 220 C 160 230, 240 230, 240 220 L 240 190" fill="hsl(var(--primary))" />
      <line x1="280" y1="150" x2="300" y2="130" stroke="hsl(var(--primary))" strokeWidth="4" />
      <rect x="295" y="125" width="10" height="20" fill="hsl(var(--primary))" rx="3" transform="rotate(45, 300, 130)" />
    </g>
    {/* Upward Graph */}
    <g className="float-3">
      <path d="M 80 120 C 120 140, 160 80, 220 90" stroke="url(#login-grad-2)" fill="none" strokeWidth="8" strokeLinecap="round" />
      <circle cx="220" cy="90" r="10" fill="hsl(var(--primary))" />
    </g>
  </svg>
);

const EyeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
  </svg>
);


import MouseSpotlight from '../components/ui/MouseSpotlight';
import BackgroundDots from '../components/ui/BackgroundDots';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let loginEmail = email;
      // Check if input is a username (no @ symbol)
      if (!email.includes('@')) {
        // Assume it's a family username and append the virtual domain
        loginEmail = `${email}@${PARENT_EMAIL_DOMAIN}`;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid credentials. Please check your username/email and password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address or username you entered is not valid.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This user account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Access to this account has been temporarily disabled due to too many failed login attempts. Please reset your password or try again later.';
          break;
        default:
          console.error('Login error:', err);
          break;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackgroundDots />
      <MouseSpotlight />
      <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 relative z-10">
        <div className="flex items-center justify-center py-12">
          <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
              <h1 className="text-3xl font-bold">Welcome Back</h1>
              <p className="text-balance text-muted-foreground">
                Enter your credentials to access the dashboard.
              </p>
            </div>
            <div className="grid gap-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Username</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Email or Parent Username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="ml-auto inline-block text-sm underline hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                      Forgot your password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : 'Login'}
                </Button>
              </form>
            </div>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-card to-secondary/50">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.905 59.905 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-2.072-1.036A48.627 48.627 0 0112 10.147a48.627 48.627 0 018.232-4.41l-2.072 1.036m-15.482 0c-.22.08-.433.16-.64.24a59.905 59.905 0 00-2.072-1.036" />
              </svg>
              <span className="text-3xl font-bold text-foreground">EduProgress</span>
            </div>
            <p className="text-xl font-medium text-foreground mb-4">
              Empowering Education Through Insightful Analytics.
            </p>
            <p className="text-muted-foreground">
              The all-in-one platform for modern academic management.
            </p>
            <div className="mt-8">
              <LoginVector />
            </div>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </>
  );
};

export default Login;
