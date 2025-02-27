'use client';

import {
  Badge,
  Navbar,
  NavbarBrand,
  NavbarContent,
  Select,
  SelectItem
} from '@heroui/react';

export type Provider = {
  id: string;
  name: string;
};

type NavbarProps = {
  title: string;
  isRunning: boolean;
  providers: Provider[];
  selectedProvider: string;
  onProviderChange: (providerId: string) => void;
};

/**
 * Application navbar component that displays title, running status and provider selection
 */
export function NavbarComponent({ 
  title, 
  isRunning, 
  providers,
  selectedProvider,
  onProviderChange 
}: NavbarProps) {
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
            color={isRunning ? "success" : "default"}
            variant="flat"
            size="sm"
            className="font-medium shadow-sm transition-all duration-300 hover:scale-105"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5 px-0.5">
              <div className={`relative w-1.5 h-1.5`}>
                {/* Static dot */}
                <div className={`absolute inset-0 rounded-full ${
                  isRunning ? 'bg-green-600' : 'bg-slate-600'
                }`}></div>
                {/* Animated ping effect */}
                <div className={`absolute inset-0 rounded-full ${
                  isRunning 
                    ? 'bg-green-500/50 animate-ping' 
                    : 'bg-gray-500/50 animate-pulse'
                }`}></div>
              </div>
              <span className="text-sm">{isRunning ? 'Running' : 'Idle'}</span>
            </div>
          </Badge>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="px-4 sm:px-6" justify="end">
        <div className="flex items-center gap-2">
          <i className="ri-cpu-line text-blue-600 text-lg"></i>
          <Select
            placeholder="Select a provider"
            selectedKeys={[selectedProvider]}
            className="w-48"
            onChange={(e) => onProviderChange(e.target.value)}
            size="sm"
            variant="bordered"
          >
            {providers.map((provider) => (
              <SelectItem key={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      </NavbarContent>
    </Navbar>
  );
} 