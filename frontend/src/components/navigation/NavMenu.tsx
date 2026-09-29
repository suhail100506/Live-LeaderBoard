'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string | null;
}

interface NavMenuProps {
  items: NavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  isLink?: boolean;
}

export const NavMenu: React.FC<NavMenuProps> = ({
  items,
  activeId,
  onSelect,
  isLink = false
}) => {
  return (
    <nav className="space-y-1.5 pt-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Navigation
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        const content = (
          <div
            className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-xs font-bold transition-all duration-200 group cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 translate-x-1'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-violet-600'
                }`}
              />
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : item.badge === 'Live'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        );

        if (isLink && item.href) {
          return (
            <Link key={item.id} href={item.href} className="block">
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect && onSelect(item.id)}
            className="w-full text-left"
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
};
