'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { NavMenu, NavItem } from './NavMenu';
import {
  Trophy,
  Code,
  FileCode,
  Layers,
  LogOut,
  Shield,
  UserCheck,
  Clock,
  CheckCircle2,
  Settings,
  ChevronRight
} from 'lucide-react';

interface OvalSidebarProps {
  activeTab: string;
  setActiveTab?: (tab: any) => void;
  pendingCount?: number;
  assessmentTitle?: string;
  assessmentStatus?: string;
  completedQuestions?: number;
  totalQuestions?: number;
  isLinkNavigation?: boolean;
  onOpenSettings?: () => void;
}

export const OvalSidebar: React.FC<OvalSidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  completedQuestions = 0,
  totalQuestions = 6,
  isLinkNavigation = false,
  onOpenSettings
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isStudent = user.role === 'student';

  const studentNavItems: NavItem[] = [
    {
      id: 'questions',
      label: 'Assigned Problems',
      icon: Code,
      badge: null,
      href: '/student'
    },
    {
      id: 'leaderboard',
      label: 'Live Leaderboard',
      icon: Trophy,
      badge: 'Live',
      href: '/leaderboard'
    }
  ];

  const adminNavItems: NavItem[] = [
    {
      id: 'submissions',
      label: 'Live Evaluations',
      icon: FileCode,
      badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
      href: '/admin'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard Monitor',
      icon: Trophy,
      badge: 'Live',
      href: '/leaderboard'
    },
    {
      id: 'bank',
      label: 'Question Bank',
      icon: Layers,
      badge: null,
      href: '/admin'
    }
  ];

  const navItems = isStudent ? studentNavItems : adminNavItems;

  const progressPercent = totalQuestions > 0 
    ? Math.min(100, Math.round((completedQuestions / totalQuestions) * 100))
    : 0;

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-6 lg:self-start lg:h-[calc(100vh-3rem)]">
      <div className="glass-panel oval-sidebar p-5 sm:p-6 flex flex-col justify-between shadow-xl border border-slate-200/90 bg-white/95 h-full overflow-y-auto">
        
        {/* Top: Logo, Navigation, Progress Card */}
        <div className="space-y-4">
          
          {/* LiveCodeArena Branding */}
          <div className="flex items-center gap-3 px-1 pt-1 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1.5px] shadow-md shadow-violet-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                LiveCode<span className="text-violet-600">Arena</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {isStudent ? 'Student Workspace' : 'Evaluator Studio'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <NavMenu
            items={navItems}
            activeId={activeTab}
            onSelect={setActiveTab}
            isLink={isLinkNavigation}
          />

          {/* User Progress Card (No Event Status, No Switch Account) */}
          {isStudent ? (
            <div className="p-4 rounded-3xl bg-violet-50/70 border border-violet-150 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-violet-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                  Your Progress
                </span>
                <span className="text-violet-700 font-extrabold">{completedQuestions}/{totalQuestions} Solved</span>
              </div>
              <div className="w-full bg-violet-200/70 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Rankings update live as faculty scores each problem.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200/80 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Queue
                </span>
                <span className="text-amber-800 font-extrabold">{pendingCount} Submissions</span>
              </div>
              <p className="text-[11px] text-amber-900/80 font-medium leading-relaxed">
                Awarding marks instantly recalculates and broadcasts leaderboard shifts.
              </p>
            </div>
          )}
        </div>

        {/* Bottom: Settings, User Profile & Sign Out (No Switch Account) */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5 mt-6">
          
          {/* Settings / Change Password Option */}
          {isStudent && (
            <button
              onClick={onOpenSettings}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-50 hover:bg-violet-50/80 border border-slate-200/80 hover:border-violet-300 text-slate-700 hover:text-violet-700 transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white group-hover:bg-violet-100 text-slate-500 group-hover:text-violet-600 border border-slate-200/80 group-hover:border-violet-200 flex items-center justify-center transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-violet-900 leading-tight">Settings</p>
                  <p className="text-[10px] text-slate-400 group-hover:text-violet-600 font-medium">Change Password</p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* User profile pill */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isStudent
                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {isStudent ? <UserCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {isStudent ? (user.studentId ? `${user.studentId} • CSE Sec ${user.section || 'D'}` : `CSE • Section ${user.section || 'D'}`) : 'Faculty Evaluator'}
                </p>
              </div>
            </div>
          </div>

          {/* Sign Out button */}
          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-full border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

        </div>

      </div>
    </aside>
  );
};
