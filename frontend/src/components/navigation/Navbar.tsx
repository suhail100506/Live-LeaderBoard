'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Trophy, LogOut, UserCheck, Shield } from 'lucide-react';

interface NavbarProps {
  assessmentTitle?: string;
  assessmentStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  assessmentTitle = 'First Year Algorithmic Sprint 2026',
  assessmentStatus = 'LIVE'
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 px-4 lg:px-8 py-3.5 backdrop-blur-xl bg-white/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand & Contest Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              LiveCode<span className="text-violet-600">Arena</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              {assessmentTitle}
            </p>
          </div>
        </Link>

        {/* Right: User Pill & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                user.role === 'admin'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-violet-100 text-violet-800 border border-violet-200'
              }`}>
                {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                  {user.role === 'admin' ? 'Faculty Evaluator' : `CSE • Section ${user.section || 'D'}`}
                </p>
              </div>
            </div>
          )}

          {user && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
