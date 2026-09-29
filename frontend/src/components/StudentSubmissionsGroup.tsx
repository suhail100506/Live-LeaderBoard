'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SubmissionItem } from '../types';
import {
  CheckCircle,
  Clock,
  Flame,
  UserCheck,
  Layers,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  List as ListIcon,
  AlignJustify,
  Maximize2,
  Columns,
  FileText,
  Check,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUpRight,
  Camera,
  Code2,
  X
} from 'lucide-react';
import { StudentHistoryView } from './StudentHistoryView';

export type ViewMode =
  | 'extra-large'
  | 'large'
  | 'medium'
  | 'small'
  | 'list'
  | 'details'
  | 'tiles'
  | 'content';

export type SortMode = 'newest' | 'oldest' | 'name' | 'question' | 'score';

interface StudentSubmissionsGroupProps {
  submissions: SubmissionItem[];
  subFilter: 'ALL' | 'PENDING' | 'EVALUATED';
  setSubFilter: (filter: 'ALL' | 'PENDING' | 'EVALUATED') => void;
  onSelectSubmission: (submission: SubmissionItem) => void;
}

interface GroupedStudent {
  studentKey: string;
  studentName: string;
  studentDepartment: string;
  studentSection: string;
  submissions: SubmissionItem[];
  totalStudentSubmissions: number;
  pendingCount: number;
  evaluatedCount: number;
}

// Fallback-Safe Submission Thumbnail Component
const SubmissionThumbnail: React.FC<{
  url: string;
  title?: string;
  className?: string;
  iconSize?: string;
}> = ({ url, title, className = 'w-full h-full object-cover', iconSize = 'w-5 h-5' }) => {
  const [hasError, setHasError] = useState(!url);

  useEffect(() => {
    setHasError(!url);
  }, [url]);

  if (hasError || !url) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-violet-400">
        <Camera className={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={title || 'Screenshot'}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export const StudentSubmissionsGroup: React.FC<StudentSubmissionsGroupProps> = ({
  submissions,
  subFilter,
  setSubFilter,
  onSelectSubmission
}) => {
  const backendHost = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  // Selected Student for Individual History View
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Per-student collapse state for hiding individual submissions
  const [collapsedStudents, setCollapsedStudents] = useState<Set<string>>(new Set());

  const toggleStudentCollapse = (key: string) => {
    setCollapsedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const collapseAll = (keys: string[]) => {
    setCollapsedStudents(new Set(keys));
  };

  const expandAll = () => {
    setCollapsedStudents(new Set());
  };

  // View & Sort State
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [groupByCandidate, setGroupByCandidate] = useState<boolean>(true);
  const [enlargedScreenshot, setEnlargedScreenshot] = useState<{ url: string; title: string; student: string } | null>(null);

  // Dropdown Open States
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) {
        setShowViewDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Overall counts for filter tabs
  const totalPending = useMemo(() => submissions.filter((s) => !s.isEvaluated).length, [submissions]);
  const totalEvaluated = useMemo(() => submissions.filter((s) => s.isEvaluated).length, [submissions]);
  const totalAll = submissions.length;

  // Filter submissions first
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (subFilter === 'PENDING') return !s.isEvaluated;
      if (subFilter === 'EVALUATED') return s.isEvaluated;
      return true;
    });
  }, [submissions, subFilter]);

  // Sort submissions
  const sortedSubmissions = useMemo(() => {
    const list = [...filteredSubmissions];
    return list.sort((a, b) => {
      if (sortMode === 'newest') {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortMode === 'oldest') {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortMode === 'name') {
        return (a.student?.name || '').localeCompare(b.student?.name || '');
      }
      if (sortMode === 'question') {
        return (a.question?.title || '').localeCompare(b.question?.title || '');
      }
      if (sortMode === 'score') {
        const scoreA = a.evaluation?.marksObtained ?? (a.isEvaluated ? 0 : -1);
        const scoreB = b.evaluation?.marksObtained ?? (b.isEvaluated ? 0 : -1);
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [filteredSubmissions, sortMode]);

  // Group filtered submissions by student
  const studentGroups = useMemo(() => {
    const map = new Map<string, GroupedStudent>();

    // Total submissions count per student
    const studentTotalMap = new Map<string, number>();
    submissions.forEach((s) => {
      const key = s.student?._id || s.student?.name || 'unknown';
      studentTotalMap.set(key, (studentTotalMap.get(key) || 0) + 1);
    });

    sortedSubmissions.forEach((sub) => {
      const key = sub.student?._id || sub.student?.name || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          studentKey: key,
          studentName: sub.student?.name || 'Student Candidate',
          studentDepartment: sub.student?.department || 'Computer Science & Engineering',
          studentSection: sub.student?.section || 'D',
          submissions: [],
          totalStudentSubmissions: studentTotalMap.get(key) || 0,
          pendingCount: 0,
          evaluatedCount: 0
        });
      }

      const group = map.get(key)!;
      group.submissions.push(sub);
      if (sub.isEvaluated) {
        group.evaluatedCount++;
      } else {
        group.pendingCount++;
      }
    });

    return Array.from(map.values());
  }, [sortedSubmissions, submissions]);

  // View Options Definition (Exact Windows Explorer Options)
  const viewOptions: { id: ViewMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'extra-large', label: 'Extra large icons', icon: Maximize2 },
    { id: 'large', label: 'Large icons', icon: LayoutGrid },
    { id: 'medium', label: 'Medium icons', icon: Grid2X2 },
    { id: 'small', label: 'Small icons', icon: Grid3X3 },
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'details', label: 'Details', icon: AlignJustify },
    { id: 'tiles', label: 'Tiles', icon: Columns },
    { id: 'content', label: 'Content', icon: FileText }
  ];

  // Helper function to resolve image URL
  const getImgUrl = (sub: SubmissionItem) => {
    if (!sub.screenshotUrl) return '';
    return sub.screenshotUrl.startsWith('http')
      ? sub.screenshotUrl
      : `${backendHost}${sub.screenshotUrl}`;
  };

  /* ------------------------------------------------------------- */
  /* RENDER SUBMISSION CARD BY VIEW MODE                           */
  /* ------------------------------------------------------------- */
  const renderSubmissionCard = (sub: SubmissionItem) => {
    const imgUrl = getImgUrl(sub);

    // 1. EXTRA LARGE VIEW
    if (viewMode === 'extra-large') {
      return (
        <div
          key={sub.id}
          onClick={() => onSelectSubmission(sub)}
          className="bg-slate-50/70 hover:bg-white rounded-[28px] p-6 cursor-pointer border border-slate-200/80 hover:border-violet-400 shadow-sm hover:shadow-2xl transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">
                {sub.question?.category || 'Algorithms'}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  sub.isEvaluated
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                }`}
              >
                {sub.isEvaluated ? '✓ Approved' : '⏳ Needs Review'}
              </span>
            </div>

            <div className="h-56 w-full rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center my-3 relative shadow-inner">
              <SubmissionThumbnail
                url={imgUrl}
                title={sub.question?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                iconSize="w-8 h-8"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-4">
                <span className="text-sm font-black text-white">{sub.question?.title}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-medium">
              <span>
                Candidate:{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentId(sub.student?._id || sub.student?.studentId || sub.student?.email);
                  }}
                  className="font-bold text-slate-800 hover:text-violet-600 hover:underline cursor-pointer"
                  title="Click to view student submission history"
                >
                  {sub.student?.name}
                </button>
              </span>
              <span>Max Marks: <strong className="text-slate-800">{sub.question?.marks} pts</strong></span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between">
            {sub.isEvaluated ? (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                Awarded: {sub.evaluation?.marksObtained} / {sub.question?.marks} pts
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Needs Marking
              </span>
            )}

            <button className="px-4 py-2 rounded-full bg-violet-600 group-hover:bg-violet-700 text-xs font-bold text-white shadow-md shadow-violet-600/20 transition-all flex items-center gap-1">
              {sub.isEvaluated ? 'Edit Marks ↗' : 'Evaluate ↗'}
            </button>
          </div>
        </div>
      );
    }

    // 2. MEDIUM VIEW
    if (viewMode === 'medium') {
      return (
        <div
          key={sub.id}
          onClick={() => onSelectSubmission(sub)}
          className="bg-slate-50/70 hover:bg-white rounded-[20px] p-4 cursor-pointer border border-slate-200/80 hover:border-violet-300 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase">
                {sub.question?.category || 'Code'}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  sub.isEvaluated ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                }`}
              >
                {sub.isEvaluated ? '✓ Done' : '⏳ Review'}
              </span>
            </div>

            <div className="h-24 w-full rounded-xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center my-2 relative">
              <SubmissionThumbnail
                url={imgUrl}
                title={sub.question?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                iconSize="w-5 h-5"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[11px] font-bold text-white truncate">{sub.question?.title}</span>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-700 truncate">{sub.student?.name}</p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="font-bold text-violet-700">
              {sub.isEvaluated ? `${sub.evaluation?.marksObtained}/${sub.question?.marks} pts` : `${sub.question?.marks} pts max`}
            </span>
            <span className="text-violet-600 font-bold group-hover:text-indigo-600">
              {sub.isEvaluated ? 'Edit ↗' : 'Award ↗'}
            </span>
          </div>
        </div>
      );
    }

    // 3. SMALL VIEW (Neat, Uniform Cards with Pristine Horizontal Alignment)
    if (viewMode === 'small') {
      return (
        <div
          key={sub.id}
          onClick={() => onSelectSubmission(sub)}
          className="bg-slate-50/70 hover:bg-white rounded-2xl p-3 cursor-pointer border border-slate-200/90 hover:border-violet-400 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 group h-[72px]"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200/90 relative flex items-center justify-center shadow-xs">
              <SubmissionThumbnail
                url={imgUrl}
                title={sub.question?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                iconSize="w-5 h-5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h5
                className="text-xs font-bold text-slate-900 truncate group-hover:text-violet-600 transition-colors"
                title={sub.question?.title}
              >
                {sub.question?.title}
              </h5>
              <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                {groupByCandidate
                  ? `${sub.question?.category || 'Algorithms'} • ${sub.question?.marks || 10} pts max`
                  : `${sub.student?.name} • CSE D`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-center whitespace-nowrap border ${
                sub.isEvaluated
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
              }`}
            >
              {sub.isEvaluated ? `${sub.evaluation?.marksObtained} pts` : 'Needs Review'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-violet-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      );
    }

    // 4. CONTENT VIEW (Horizontal Card)
    if (viewMode === 'content') {
      return (
        <div
          key={sub.id}
          onClick={() => onSelectSubmission(sub)}
          className="bg-slate-50/70 hover:bg-white rounded-[24px] p-5 cursor-pointer border border-slate-200 hover:border-violet-300 shadow-sm hover:shadow-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 group"
        >
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <div className="w-28 sm:w-36 h-24 rounded-2xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200 relative">
              <SubmissionThumbnail
                url={imgUrl}
                title={sub.question?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                iconSize="w-6 h-6"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                  {sub.question?.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  sub.isEvaluated ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                }`}>
                  {sub.isEvaluated ? '✓ Approved' : '⏳ Needs Review'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-violet-600 truncate">
                {sub.question?.title}
              </h4>
              <p className="text-xs text-slate-500">
                Submitted by <span className="font-semibold text-slate-800">{sub.student?.name}</span> • Max Marks: {sub.question?.marks} pts
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            {sub.isEvaluated ? (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Awarded: {sub.evaluation?.marksObtained} / {sub.question?.marks} pts
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Award Marks
              </span>
            )}
            <span className="text-xs font-bold text-violet-600 group-hover:text-indigo-600 flex items-center gap-1">
              {sub.isEvaluated ? 'Edit Marks ↗' : 'Evaluate Studio ↗'}
            </span>
          </div>
        </div>
      );
    }

    // 5. TILES & LARGE VIEW (Default Rich Cards)
    return (
      <div
        key={sub.id}
        onClick={() => onSelectSubmission(sub)}
        className="bg-slate-50/70 hover:bg-white rounded-[24px] p-5 cursor-pointer border border-slate-200/80 hover:border-violet-300 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group h-full min-h-[250px]"
      >
        <div>
          {/* Clickable Student Name Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStudentId(sub.student?._id || sub.student?.studentId || sub.student?.email);
              }}
              className="text-xs font-black text-slate-900 hover:text-violet-600 hover:underline flex items-center gap-1.5 cursor-pointer truncate max-w-[200px] group/stu transition-colors"
              title="Click to view full submission history for this student"
            >
              <UserCheck className="w-3.5 h-3.5 text-violet-600 shrink-0 group-hover/stu:scale-110 transition-transform" />
              <span>{sub.student?.name}</span>
            </button>
            <span className="text-[10px] text-slate-400 font-medium">
              {sub.student?.studentId ? sub.student.studentId : `Sec ${sub.student?.section || 'D'}`}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase tracking-wider">
              {sub.question?.category || 'Algorithms'}
            </span>

            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                sub.isEvaluated
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
              }`}
            >
              {sub.isEvaluated ? 'Status: Evaluated' : 'Status: Needs Review'}
            </span>
          </div>

          {/* Screenshot container with 'Student Screenshot' badge & zoom click */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setEnlargedScreenshot({
                url: imgUrl,
                title: sub.question?.title,
                student: sub.student?.name
              });
            }}
            className="h-36 w-full rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center my-2 relative shadow-inner group/img cursor-zoom-in"
            title="Click to view full screenshot"
          >
            <SubmissionThumbnail
              url={imgUrl}
              title={sub.question?.title}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
              iconSize="w-7 h-7"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
              <Camera className="w-3 h-3 text-cyan-400" />
              <span>Student Screenshot</span>
            </div>
            <div className="absolute top-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-xs text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-3 pointer-events-none">
              <span className="text-xs font-bold text-white leading-tight">
                {sub.question?.title}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 font-medium">
            <span>Max Marks: <strong className="text-slate-800">{sub.question?.marks} pts</strong></span>
            {sub.isEvaluated && (
              <span className="text-emerald-700 font-bold">
                Awarded: {sub.evaluation?.marksObtained} / {sub.question?.marks}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
          {sub.isEvaluated ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Awarded: {sub.evaluation?.marksObtained} / {sub.question?.marks}
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Needs Review
            </span>
          )}

          <button
            onClick={() => onSelectSubmission(sub)}
            className="px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            {sub.isEvaluated ? 'Edit Marks' : 'Award Marks'}
          </button>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------- */
  /* DETAILS / LIST TABLE VIEW                                     */
  /* ------------------------------------------------------------- */
  const renderDetailsTable = (items: SubmissionItem[]) => {
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <th className="py-3 px-4">Problem</th>
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Screenshot</th>
              <th className="py-3 px-4">Marks Awarded</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((sub) => {
              const imgUrl = getImgUrl(sub);
              return (
                <tr
                  key={sub.id}
                  onClick={() => onSelectSubmission(sub)}
                  className="hover:bg-violet-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900">{sub.question?.title}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentId(sub.student?._id || sub.student?.studentId || sub.student?.email);
                      }}
                      className="font-bold text-slate-900 hover:text-violet-600 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                      title="Click to view student submission history"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                      <span>{sub.student?.name}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{sub.question?.category}</td>
                  <td className="py-3.5 px-4">
                    <div className="w-10 h-7 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 inline-block">
                      <SubmissionThumbnail
                        url={imgUrl}
                        title={sub.question?.title}
                        className="w-full h-full object-cover"
                        iconSize="w-3.5 h-3.5"
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold">
                    {sub.isEvaluated ? (
                      <span className="text-emerald-700">{sub.evaluation?.marksObtained} / {sub.question?.marks} pts</span>
                    ) : (
                      <span className="text-slate-400">- / {sub.question?.marks} pts</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sub.isEvaluated
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      {sub.isEvaluated ? '✓ Approved' : '⏳ Needs Review'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs font-bold text-violet-600 hover:text-indigo-600">
                      {sub.isEvaluated ? 'Edit ↗' : 'Evaluate ↗'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  /* ------------------------------------------------------------- */
  /* GRID COLUMN LAYOUT CLASS RESOLVER                             */
  /* ------------------------------------------------------------- */
  const getGridClasses = () => {
    switch (viewMode) {
      case 'extra-large':
        return 'grid grid-cols-1 xl:grid-cols-2 gap-6';
      case 'medium':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
      case 'small':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5';
      case 'content':
        return 'space-y-4';
      case 'tiles':
      case 'large':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5';
    }
  };

  if (selectedStudentId) {
    return (
      <StudentHistoryView
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
        onSelectSubmission={onSelectSubmission}
        refreshTrigger={submissions.length}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs Bar + Windows-style View & Sort Menus */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        {/* Left: Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubFilter('PENDING')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              subFilter === 'PENDING'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>⏳ Pending Review</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                subFilter === 'PENDING' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalPending}
            </span>
          </button>

          <button
            onClick={() => setSubFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              subFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Submissions</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                subFilter === 'ALL' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalAll}
            </span>
          </button>

          <button
            onClick={() => setSubFilter('EVALUATED')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              subFilter === 'EVALUATED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>✓ Approved / Evaluated</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                subFilter === 'EVALUATED' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalEvaluated}
            </span>
          </button>
        </div>

        {/* Right: Sort ∨ and View ∨ Dropdown Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* 1. Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowViewDropdown(false);
              }}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort Dropdown Menu (Fluent Dark Theme) */}
            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#1f242d] text-slate-200 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/50">
                  Sort Submissions By
                </div>
                {[
                  { id: 'newest', label: 'Newest First' },
                  { id: 'oldest', label: 'Oldest First' },
                  { id: 'name', label: 'Student Candidate (A-Z)' },
                  { id: 'question', label: 'Problem Title (A-Z)' },
                  { id: 'score', label: 'Score (High to Low)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSortMode(item.id as SortMode);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                      sortMode === item.id ? 'bg-violet-600 text-white font-bold' : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {sortMode === item.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. View Dropdown (Exact Match to Windows 11 Explorer Menu) */}
          <div className="relative" ref={viewDropdownRef}>
            <button
              onClick={() => {
                setShowViewDropdown(!showViewDropdown);
                setShowSortDropdown(false);
              }}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-violet-600" />
              <span>View</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Windows Explorer Style View Dropdown Menu */}
            {showViewDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1f242d] text-slate-200 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="py-1">
                  {viewOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = viewMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setViewMode(opt.id);
                          setShowViewDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left group ${
                          isActive
                            ? 'bg-white/15 text-white font-bold'
                            : 'hover:bg-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        {/* Windows dot indicator on the left */}
                        <div className="w-2.5 flex items-center justify-center shrink-0">
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />}
                        </div>

                        {/* Icon */}
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'}`} />

                        {/* Label */}
                        <span className="flex-1">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700/70 my-1.5" />

                {/* Grouping Toggle */}
                <button
                  onClick={() => {
                    setGroupByCandidate(!groupByCandidate);
                    setShowViewDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left group ${
                    groupByCandidate
                      ? 'bg-white/15 text-white font-bold'
                      : 'hover:bg-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="w-2.5 flex items-center justify-center shrink-0">
                    {groupByCandidate && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />}
                  </div>
                  <UserCheck className={`w-4 h-4 shrink-0 ${groupByCandidate ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="flex-1">Group by Candidate</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Collapse All / Expand All Toggle Button */}
          {groupByCandidate && studentGroups.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (collapsedStudents.size === studentGroups.length) {
                  expandAll();
                } else {
                  collapseAll(studentGroups.map((g) => g.studentKey));
                }
              }}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title={
                collapsedStudents.size === studentGroups.length
                  ? 'Expand all student candidate submissions'
                  : 'Collapse and hide all student candidate submissions'
              }
            >
              {collapsedStudents.size === studentGroups.length ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-violet-600" />
                  <span>Show All</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hide All</span>
                </>
              )}
            </button>
          )}

          {/* 4. Action ... Menu (Quick reset / refresh) */}
          <div className="relative">
            <button
              onClick={() => {
                setViewMode('tiles');
                setGroupByCandidate(true);
              }}
              title="Reset View to Default Tiles"
              className="p-2 rounded-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredSubmissions.length === 0 && (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            {subFilter === 'PENDING'
              ? 'No Submissions Awaiting Review'
              : subFilter === 'EVALUATED'
              ? 'No Approved Submissions Yet'
              : 'No Submissions Found'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {subFilter === 'PENDING'
              ? 'All submitted code questions have been evaluated. Switch to "All Submissions" or "Approved" to review existing marks.'
              : 'Student submissions will appear here once candidates upload their solution screenshots.'}
          </p>
        </div>
      )}

      {/* VIEW RENDERER 1: Details / List Table Mode */}
      {(viewMode === 'details' || viewMode === 'list') && filteredSubmissions.length > 0 && (
        <div className="space-y-6">
          {groupByCandidate ? (
            studentGroups.map((group) => {
              const isCollapsed = collapsedStudents.has(group.studentKey);
              return (
                <div
                  key={group.studentKey}
                  className={`bg-white rounded-[32px] border border-slate-200/90 shadow-sm transition-all duration-200 ${
                    isCollapsed ? 'p-5 sm:p-6' : 'p-6 sm:p-7 space-y-4'
                  }`}
                >
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCollapsed ? '' : 'pb-3 border-b border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {group.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(group.studentKey)}
                            className="text-base font-bold text-slate-900 hover:text-violet-600 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                            title="Click to view student submission history"
                          >
                            <span>{group.studentName}</span>
                            <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                              View History →
                            </span>
                          </button>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            CSE • Section {group.studentSection || 'D'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {group.submissions.length} submission{group.submissions.length !== 1 ? 's' : ''} • {group.pendingCount} pending, {group.evaluatedCount} approved
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {group.pendingCount > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {group.pendingCount} Pending
                        </span>
                      )}
                      {group.evaluatedCount > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {group.evaluatedCount} Approved
                        </span>
                      )}

                      {/* Hide / Show Icon button to the right of Approved */}
                      <button
                        type="button"
                        onClick={() => toggleStudentCollapse(group.studentKey)}
                        className={`p-2 rounded-full border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                          isCollapsed
                            ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:scale-105'
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:scale-105'
                        }`}
                        title={
                          isCollapsed
                            ? `Show submissions for ${group.studentName}`
                            : `Hide submissions for ${group.studentName}`
                        }
                        aria-label={isCollapsed ? 'Show submissions' : 'Hide submissions'}
                      >
                        {isCollapsed ? (
                          <Eye className="w-4 h-4 text-violet-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && renderDetailsTable(group.submissions)}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm">
              {renderDetailsTable(sortedSubmissions)}
            </div>
          )}
        </div>
      )}

      {/* VIEW RENDERER 2: Cards / Grid Modes (Tiles, Large, Medium, Small, Content, Extra-large) */}
      {viewMode !== 'details' && viewMode !== 'list' && filteredSubmissions.length > 0 && (
        <div className="space-y-6">
          {groupByCandidate ? (
            /* GROUPED BY CANDIDATE */
            studentGroups.map((group) => {
              const isCollapsed = collapsedStudents.has(group.studentKey);
              return (
                <div
                  key={group.studentKey}
                  className={`bg-white rounded-[32px] border border-slate-200/90 shadow-sm transition-all duration-200 ${
                    isCollapsed ? 'p-5 sm:p-6' : 'p-6 sm:p-7 space-y-5'
                  }`}
                >
                  {/* Student Header */}
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCollapsed ? '' : 'pb-4 border-b border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[2px] shadow-md shadow-violet-500/20 shrink-0">
                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-slate-900 text-base">
                          {group.studentName.charAt(0)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(group.studentKey)}
                            className="text-lg font-black text-slate-900 tracking-tight hover:text-violet-600 hover:underline transition-colors text-left flex items-center gap-2 group/name cursor-pointer"
                            title="Click to view student submission history"
                          >
                            <span>{group.studentName}</span>
                            <span className="text-[11px] text-violet-600 opacity-90 group-hover/name:opacity-100 font-bold bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                              View History →
                            </span>
                          </button>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                            CSE • Section {group.studentSection || 'D'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Student Candidate • {group.submissions.length} submission{group.submissions.length !== 1 ? 's' : ''} in{' '}
                          <span className="font-semibold text-slate-700">
                            {subFilter === 'PENDING'
                              ? 'Pending Queue'
                              : subFilter === 'EVALUATED'
                              ? 'Approved List'
                              : 'All Submissions'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badges & Hide Button for this Student */}
                    <div className="flex items-center gap-2">
                      {group.pendingCount > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {group.pendingCount} Pending Review
                        </span>
                      )}
                      {group.evaluatedCount > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          {group.evaluatedCount} Approved
                        </span>
                      )}

                      {/* Hide / Show Icon button to the right of Approved */}
                      <button
                        type="button"
                        onClick={() => toggleStudentCollapse(group.studentKey)}
                        className={`p-2 rounded-full border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                          isCollapsed
                            ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:scale-105'
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:scale-105'
                        }`}
                        title={
                          isCollapsed
                            ? `Show submissions for ${group.studentName}`
                            : `Hide submissions for ${group.studentName}`
                        }
                        aria-label={isCollapsed ? 'Show submissions' : 'Hide submissions'}
                      >
                        {isCollapsed ? (
                          <Eye className="w-4 h-4 text-violet-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submissions in this Student */}
                  {!isCollapsed && (
                    <div className={getGridClasses()}>
                      {group.submissions.map((sub) => renderSubmissionCard(sub))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* FLAT GRID (NON-GROUPED) */
            <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  Showing {sortedSubmissions.length} Total Submissions
                </span>
              </div>
              <div className={getGridClasses()}>
                {sortedSubmissions.map((sub) => renderSubmissionCard(sub))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* High-Resolution Screenshot Lightbox Modal */}
      {enlargedScreenshot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedScreenshot(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl p-3 border border-slate-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-800 text-white text-xs font-bold">
              <div>
                <span className="text-violet-400 font-extrabold">{enlargedScreenshot.student}</span>
                <span className="text-slate-400 font-normal"> — {enlargedScreenshot.title}</span>
              </div>
              <button
                onClick={() => setEnlargedScreenshot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="Close lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={enlargedScreenshot.url}
                alt={enlargedScreenshot.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
