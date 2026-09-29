'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Terminal
} from 'lucide-react';

interface CompilerClashLoginProps {
  onSuccess?: () => void;
}

export const CompilerClashLogin: React.FC<CompilerClashLoginProps> = ({ onSuccess }) => {
  const { user, login } = useAuth();
  const router = useRouter();

  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (onSuccess) {
        onSuccess();
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'student') {
        router.push('/student');
      }
    }
  }, [user, router, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await login(emailInput.trim(), passInput);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setLoginError(res.message || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setLoginError('Network error connecting to authentication server.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto p-4 sm:p-6">
      {/* Main Clean Centered Login Card */}
      <div className="bg-white rounded-[32px] p-7 sm:p-9 border border-slate-200/90 shadow-xl shadow-slate-200/50">
        
        {/* Header with Compiler Clash Branding */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-amber-500 p-[2px] shadow-md shadow-violet-500/20 mb-3.5">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Terminal className="w-6 h-6 text-violet-600" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            COMPILER CLASH
            <span className="block text-lg sm:text-xl font-extrabold text-violet-600 mt-0.5">
              : Battle of Bug
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Sri Eshwar College of Engineering • Dept of CSE
          </p>
        </div>

        {/* Error Notification Alert */}
        {loginError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name.year@sece.ac.in"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 rounded-full text-sm font-black text-white shadow-lg shadow-violet-600/25 bg-gradient-to-r from-violet-600 via-indigo-600 to-amber-500 hover:from-violet-700 hover:to-amber-600 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-5"
          >
            {loginLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </div>
            ) : (
              <>
                <span>Enter Battle of Bug</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Clean Institutional Footer */}
        <div className="pt-5 mt-6 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
          <span>Sri Eshwar College of Engineering • Autonomous System</span>
        </div>
      </div>
    </div>
  );
};
