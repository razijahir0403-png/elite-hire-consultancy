import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, Sun, Moon } from 'lucide-react';
import rasLogo from '../assets/ras.jpeg';
import ThreeBarLogo from '../components/ThreeBarLogo';
import { consumeAuthMessage } from '../utils/authToken';

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    const message = consumeAuthMessage();
    if (message) {
      setSessionMessage(message);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError('Please enter both your email address and password');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    await login(email, password);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#121212] px-4 py-12 overflow-hidden selection:bg-[#D5F5E7] dark:selection:bg-[#00B96B] selection:text-[#07566A] dark:selection:text-white transition-colors duration-200">
      {/* Theme Switcher in Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <div
          className="flex items-center p-1 bg-white/90 dark:bg-[#1E293B]/90 border border-[#B8C0CC] dark:border-[#475569] rounded-xl shadow-2xs backdrop-blur-xs transition-colors duration-200"
          role="group"
          aria-label="Theme Selection"
        >
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-[#111827] border border-[#B8C0CC] shadow-xs'
                : 'text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:bg-slate-100 dark:hover:bg-[#121212]'
            }`}
            title="Light Theme ☀️"
            aria-pressed={theme === 'light'}
          >
            <Sun size={13} className={theme === 'light' ? 'text-amber-500 fill-amber-500' : 'text-[#374151] dark:text-[#E2E8F0]'} />
            <span className="hidden sm:inline">Light ☀️</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#121212] text-emerald-300 border border-[#475569] shadow-xs'
                : 'text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] hover:bg-slate-100 dark:hover:bg-[#121212]'
            }`}
            title="Dark Theme 🌙"
            aria-pressed={theme === 'dark'}
          >
            <Moon size={13} className={theme === 'dark' ? 'text-emerald-400 fill-emerald-400' : 'text-[#374151] dark:text-[#E2E8F0]'} />
            <span className="hidden sm:inline">Dark 🌙</span>
          </button>
        </div>
      </div>

      {/* Subtle Mint Ambient Shapes inspired by the logo */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] bg-[#D5F5E7]/70 dark:bg-[#00B96B]/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#F4FBF8]/80 dark:bg-[#0E3D48]/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[#00B96B]/5 dark:bg-[#00B96B]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 animate-fade-in-up">
        {/* Logo & Animated 3-Bar Brand Motif Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 group">
            {/* White card with Eleventis Logo */}
            <div className="bg-white dark:bg-[#1E293B] p-2.5 rounded-2xl border border-[#C5CBD3] dark:border-[#475569] w-20 h-20 flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105">
              <img src={rasLogo} alt="Eleventis Logo" className="w-full h-full object-contain" />
            </div>
            {/* Floating animated 3-bar indicator badge */}
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1E293B] px-2 py-1 rounded-full border border-[#B8C0CC] dark:border-[#475569] shadow-md flex items-center justify-center">
              <ThreeBarLogo size="xs" animated={true} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827] dark:text-[#FFFFFF] mt-2">
            Eleventis
          </h1>
          <p className="text-xs font-extrabold text-[#00B96B] dark:text-emerald-400 uppercase tracking-widest mt-1">
            Data • Talent • Solutions
          </p>
          <p className="text-xs text-[#374151] dark:text-[#E2E8F0] mt-1 font-medium">
            Enterprise Talent Analytics & Operations Workspace
          </p>
        </div>

        {/* Elegant Login Card */}
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#C5CBD3] dark:border-[#475569] p-7 sm:p-9 relative transition-colors duration-200">
          {/* Subtle top accent line */}
          <div className="absolute top-0 inset-x-8 h-1 rounded-full bg-gradient-to-r from-transparent via-[#00B96B] to-transparent opacity-80" />

          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#111827] dark:text-[#FFFFFF] font-sans">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-[#374151] dark:text-[#E2E8F0] mt-0.5">
              Access candidate pipelines, tracking records, and reports
            </p>
          </div>

          {sessionMessage && (
            <div className="mb-5 px-4 py-3 bg-[#D5F5E7]/60 dark:bg-[#0E3D48]/50 border border-[#00B96B]/30 dark:border-[#00B96B]/50 rounded-xl text-xs font-bold text-[#07566A] dark:text-emerald-300 flex items-center space-x-2">
              <Sparkles size={16} className="text-[#00B96B] dark:text-emerald-400 flex-shrink-0" />
              <span>{sessionMessage}</span>
            </div>
          )}

          {validationError && (
            <div className="mb-5 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
              {validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-[#374151] dark:text-[#E2E8F0] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#374151] dark:text-[#E2E8F0]">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] dark:bg-[#121212] border border-[#AEB7C4] dark:border-[#475569] rounded-xl text-sm font-medium text-[#111827] dark:text-[#FFFFFF] placeholder-[#6B7280] dark:placeholder-[#A1AAB8] focus:bg-white dark:focus:bg-[#121212] focus:outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-[#00B96B]/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-bold text-[#374151] dark:text-[#E2E8F0] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#374151] dark:text-[#E2E8F0]">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-[#F8FAFC] dark:bg-[#121212] border border-[#AEB7C4] dark:border-[#475569] rounded-xl text-sm font-medium text-[#111827] dark:text-[#FFFFFF] placeholder-[#6B7280] dark:placeholder-[#A1AAB8] focus:bg-white dark:focus:bg-[#121212] focus:outline-none focus:border-[#00B96B] focus:ring-2 focus:ring-[#00B96B]/20 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#374151] dark:text-[#E2E8F0] hover:text-[#111827] dark:hover:text-[#FFFFFF] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button with Brand Green Gradient & Deep Teal Text */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3 bg-gradient-to-r from-[#00D98B] to-[#00B96B] hover:from-[#00E99A] hover:to-[#00D98B] text-[#043845] dark:text-[#043845] font-extrabold text-sm rounded-xl transition-all shadow-[0_6px_20px_rgba(0,185,107,0.35)] hover:shadow-[0_8px_24px_rgba(0,185,107,0.45)] flex items-center justify-center space-x-2 group disabled:opacity-75 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <ThreeBarLogo size="xs" animated={true} />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-[#043845]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom links */}
          <div className="mt-6 pt-5 border-t border-[#B8C0CC] dark:border-[#475569] text-center">
            <p className="text-xs text-[#374151] dark:text-[#E2E8F0]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#0284C7] dark:text-[#60A5FA] hover:text-[#00B96B] font-bold transition-colors underline decoration-[#00B96B]/50 underline-offset-4">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center">
          <p className="text-[11px] text-[#374151] dark:text-[#E2E8F0]">
            © {new Date().getFullYear()} Eleventis. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
