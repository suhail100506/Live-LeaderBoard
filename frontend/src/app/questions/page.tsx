'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentPage from '../student/page';
import AdminPage from '../admin/page';

/**
 * /questions route
 * Dynamically routes to Student Assigned Questions or Faculty Question Management
 */
export default function QuestionsRoutePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <AdminPage initialTab="bank" />;
  }

  return <StudentPage initialTab="questions" />;
}
