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
      className="fixed top-0 w-full z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300"
      maxWidth="full"
      isBordered={false}
    >
      <NavbarContent className="px-6 py-2">
        <NavbarBrand className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {title}
          </h1>
          <Badge
            color={isRunning ? "primary" : "success"}
            variant={isRunning ? "solid" : "flat"}
            size="lg"
            className={`font-medium transition-all duration-300 ${isRunning ? 'animate-pulse' : 'opacity-85'}`}
            aria-live="polite"
          >
            {isRunning ? 'Running' : 'Idle'}
          </Badge>
        </NavbarBrand>
      </NavbarContent>
    </Navbar>
  );
} 