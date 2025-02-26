'use client';

import {
  Badge,
  Navbar,
  NavbarBrand,
  NavbarContent
} from '@heroui/react';

type NavbarProps = {
  title: string;
  isRunning: boolean;
};

/**
 * Application navbar component that displays title and running status
 */
export function NavbarComponent({ title, isRunning }: NavbarProps) {
  return (
    <Navbar
      className="fixed top-0 w-full z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300"
      maxWidth="full"
      isBordered={false}
    >
      <NavbarContent className="px-4 sm:px-6 py-2.5">
        <NavbarBrand className="flex items-center gap-3">
          <div className="flex items-center">
            <i className="ri-dashboard-3-line text-primary text-xl sm:text-2xl mr-2.5 transition-transform duration-300 hover:scale-110"></i>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              {title}
            </h1>
          </div>
          <Badge
            color={isRunning ? "primary" : "success"}
            variant={isRunning ? "solid" : "flat"}
            size="sm"
            className={`font-medium shadow-sm transition-all duration-300 ${
              isRunning 
                ? 'animate-pulse hover:animate-none hover:scale-105' 
                : 'opacity-90 hover:opacity-100 hover:scale-105'
            }`}
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5 px-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                isRunning 
                  ? 'bg-white animate-ping' 
                  : 'bg-green-500'
              }`}></div>
              <span className="text-sm">{isRunning ? 'Running' : 'Idle'}</span>
            </div>
          </Badge>
        </NavbarBrand>
      </NavbarContent>
    </Navbar>
  );
} 