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
    <div className="flex-1 w-full animate-in">
      <Card className="h-full rounded-2xl card-glass overflow-hidden border border-slate-100">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white/60">
          <h2 className="text-lg font-bold text-slate-800">Execution Logs</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div 
            className="bg-slate-900 text-slate-100 h-[calc(100vh-200px)] overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
            role="log"
            aria-live="polite"
            aria-label="Execution logs"
          >
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full p-6 text-slate-400 italic">
                <span>No logs yet. Start generation to see logs here.</span>
              </div>
            ) : (
              <div className="p-6 space-y-2">
                {logs.map((log, index) => {
                  // 根据日志内容设置不同的样式
                  const isError = log.toLowerCase().includes('error');
                  const isSuccess = log.toLowerCase().includes('complet') || log.toLowerCase().includes('success');
                  const isWarning = log.toLowerCase().includes('warning') || log.toLowerCase().includes('stopping');
                  
                  let bgColor = 'hover:bg-slate-800/60';
                  if (isError) bgColor = 'bg-red-900/20 hover:bg-red-900/30';
                  else if (isSuccess) bgColor = 'bg-green-900/20 hover:bg-green-900/30';
                  else if (isWarning) bgColor = 'bg-yellow-900/20 hover:bg-yellow-900/30';
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-md px-4 py-3 ${bgColor} whitespace-pre-wrap transition-colors duration-200`}
                    >
                      {log}
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 