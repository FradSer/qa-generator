'use client';

import {
  Card,
  CardBody,
  CardHeader
} from '@heroui/react';
import { RefObject } from 'react';

type LogsPanelProps = {
  logs: string[];
  logsEndRef: RefObject<HTMLDivElement>;
};

/**
 * LogsPanel component for displaying execution logs
 */
export function LogsPanel({ logs, logsEndRef }: LogsPanelProps) {
  return (
    <div className="flex-1 w-full animate-in slide-in-from-right-5 duration-700 ease-out">
      <Card className="h-full rounded-2xl overflow-hidden border border-slate-200/70 shadow-md bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/70">
        <CardHeader className="px-6 py-5 border-b border-slate-200/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <i className="ri-terminal-line text-blue-600"></i>
            Execution Logs
          </h2>
        </CardHeader>
        <CardBody className="p-6 h-[600px] flex flex-col">
          <div 
            className="bg-slate-900 text-slate-100 h-full overflow-y-auto font-mono text-sm rounded-xl scrollbar-none"
            role="log"
            aria-live="polite"
            aria-label="Execution logs"
          >
            <div className="space-y-2 p-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
                  <i className="ri-terminal-line text-slate-500/50 text-4xl mb-2"></i>
                  <span className="italic">No logs yet. Start generation to see logs here.</span>
                </div>
              ) : (
                logs.map((log, index) => {
                  const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail');
                  const isSuccess = log.toLowerCase().includes('complet') || log.toLowerCase().includes('success');
                  const isWarning = log.toLowerCase().includes('warning') || log.toLowerCase().includes('stopping');
                  
                  let bgColor = 'hover:bg-slate-800/50';
                  let borderColor = 'border-slate-700/50';
                  let icon = null;

                  if (isError) {
                    bgColor = 'bg-red-500/10 hover:bg-red-500/20';
                    borderColor = 'border-red-500/30';
                    icon = <i className="ri-error-warning-line text-red-500"></i>;
                  } else if (isSuccess) {
                    bgColor = 'bg-green-500/10 hover:bg-green-500/20';
                    borderColor = 'border-green-500/30';
                    icon = <i className="ri-checkbox-circle-line text-green-500"></i>;
                  } else if (isWarning) {
                    bgColor = 'bg-yellow-500/10 hover:bg-yellow-500/20';
                    borderColor = 'border-yellow-500/30';
                    icon = <i className="ri-alert-line text-yellow-500"></i>;
                  }

                  return (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${borderColor} ${bgColor} transition-colors duration-300`}
                    >
                      <div className="flex items-center gap-2">
                        {icon && <span className="flex-shrink-0 leading-none">{icon}</span>}
                        <span className="flex-1 leading-normal">{log}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 