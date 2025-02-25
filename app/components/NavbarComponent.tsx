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
      className="fixed top-0 w-full z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300"
      maxWidth="full"
      isBordered={false}
    >
      <NavbarContent className="px-6 py-3">
        <NavbarBrand className="flex items-center gap-4">
          <div className="flex items-center">
            <i className="ri-flashlight-line text-blue-600 text-2xl mr-3"></i>
            <h1 className="text-xl font-semibold text-slate-700 tracking-tight">
              {title}
            </h1>
          </div>
          <Badge
            color={isRunning ? "primary" : "success"}
            variant={isRunning ? "solid" : "flat"}
            size="lg"
            className={`font-medium shadow-sm transition-all duration-300 ${isRunning ? 'animate-pulse scale-105' : 'opacity-90 hover:opacity-100 hover:scale-105'}`}
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white' : 'bg-green-500'}`}></div>
              {isRunning ? 'Running' : 'Ready'}
            </div>
          </Badge>
        </NavbarBrand>
      </NavbarContent>
    </Navbar>
  );
} 