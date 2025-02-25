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
      className="fixed top-0 w-full z-10 bg-white/85 backdrop-blur-md border-b border-slate-200/70 shadow-sm transition-all duration-300"
      maxWidth="full"
      isBordered={false}
    >
      <NavbarContent className="px-6 py-3">
        <NavbarBrand className="flex items-center gap-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-blue-500 mr-3">
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
            </svg>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {title}
            </h1>
          </div>
          <Badge
            color={isRunning ? "primary" : "success"}
            variant={isRunning ? "solid" : "flat"}
            size="lg"
            className={`font-medium shadow-sm transition-all duration-300 ${isRunning ? 'animate-pulse scale-105' : 'opacity-90 hover:scale-105'}`}
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white' : 'bg-green-500'}`}></div>
              {isRunning ? 'Running' : 'Idle'}
            </div>
          </Badge>
        </NavbarBrand>
      </NavbarContent>
    </Navbar>
  );
} 