'use client';

import {
  Card,
  CardBody,
  CardHeader,
  ScrollShadow
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
    <div className="flex-1 w-full animate-in fade-in duration-500">
      <Card className="h-full rounded-2xl card-glass overflow-hidden border border-slate-200/70 shadow-md bg-white/95 backdrop-blur-sm">
        <CardHeader className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2.5">
            <i className="ri-terminal-line text-blue-600"></i>
            Execution Logs
          </h2>
        </CardHeader>
        <CardBody className="p-6 lg:flex-1 lg:overflow-hidden">
          <ScrollShadow 
            className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 h-full max-h-[400px] lg:max-h-full overflow-y-auto font-mono text-sm rounded-lg"
            role="log"
            aria-live="polite"
            aria-label="Execution logs"
            hideScrollBar
          >
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
                <i className="ri-terminal-box-line text-slate-500/50 text-4xl mb-3"></i>
                <span className="italic">No logs yet. Start generation to see logs here.</span>
              </div>
            ) : (
              <div className="p-5 space-y-2.5">
                {logs.map((log, index) => {
                  // 根据日志内容设置不同的样式
                  const isError = log.toLowerCase().includes('error');
                  const isSuccess = log.toLowerCase().includes('complet') || log.toLowerCase().includes('success');
                  const isWarning = log.toLowerCase().includes('warning') || log.toLowerCase().includes('stopping');
                  
                  let bgColor = 'hover:bg-slate-700/60';
                  let borderColor = 'border-slate-700/50';
                  let icon = null;
                  
                  if (isError) {
                    bgColor = 'bg-red-900/20 hover:bg-red-900/30';
                    borderColor = 'border-red-700/30';
                    icon = (
                      <i className="ri-error-warning-line text-red-400 mt-0.5 text-base flex-shrink-0"></i>
                    );
                  } else if (isSuccess) {
                    bgColor = 'bg-green-900/20 hover:bg-green-900/30';
                    borderColor = 'border-green-700/30';
                    icon = (
                      <i className="ri-checkbox-circle-line text-green-400 mt-0.5 text-base flex-shrink-0"></i>
                    );
                  } else if (isWarning) {
                    bgColor = 'bg-yellow-900/20 hover:bg-yellow-900/30';
                    borderColor = 'border-yellow-700/30';
                    icon = (
                      <i className="ri-alert-line text-yellow-400 mt-0.5 text-base flex-shrink-0"></i>
                    );
                  } else {
                    icon = (
                      <i className="ri-flashlight-line text-blue-400 mt-0.5 text-base flex-shrink-0"></i>
                    );
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-md px-4 py-2.5 ${bgColor} border ${borderColor} shadow-md whitespace-pre-wrap transition-colors duration-200 group`}
                    >
                      <div className="flex">
                        <div className="mr-3 mt-0.5">{icon}</div>
                        <div className="flex-1 opacity-95 group-hover:opacity-100">{log}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </ScrollShadow>
        </CardBody>
      </Card>
    </div>
  );
} 