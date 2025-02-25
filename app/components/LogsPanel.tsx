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
      <Card className="h-full rounded-2xl card-glass overflow-hidden border border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
            </svg>
            Execution Logs
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <ScrollShadow 
            className="bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 h-[calc(100vh-200px)] overflow-y-auto font-mono text-sm"
            role="log"
            aria-live="polite"
            aria-label="Execution logs"
            hideScrollBar
          >
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-slate-500/50 mb-3">
                  <path fillRule="evenodd" d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97.97a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l.97-.97-.97-.97a.75.75 0 010-1.06zm4.28 4.28a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
                <span className="italic">No logs yet. Start generation to see logs here.</span>
              </div>
            ) : (
              <div className="p-6 space-y-2">
                {logs.map((log, index) => {
                  // 根据日志内容设置不同的样式
                  const isError = log.toLowerCase().includes('error');
                  const isSuccess = log.toLowerCase().includes('complet') || log.toLowerCase().includes('success');
                  const isWarning = log.toLowerCase().includes('warning') || log.toLowerCase().includes('stopping');
                  
                  let bgColor = 'hover:bg-slate-700/60';
                  let borderColor = 'border-slate-700/50';
                  let icon = null;
                  
                  if (isError) {
                    bgColor = 'bg-red-900/20 hover:bg-red-900/40';
                    borderColor = 'border-red-700/30';
                    icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0 mt-1">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                    );
                  } else if (isSuccess) {
                    bgColor = 'bg-green-900/20 hover:bg-green-900/40';
                    borderColor = 'border-green-700/30';
                    icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 flex-shrink-0 mt-1">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    );
                  } else if (isWarning) {
                    bgColor = 'bg-yellow-900/20 hover:bg-yellow-900/40';
                    borderColor = 'border-yellow-700/30';
                    icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-1">
                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                    );
                  } else {
                    icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1">
                        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                      </svg>
                    );
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-md px-4 py-3 ${bgColor} border ${borderColor} shadow-sm whitespace-pre-wrap transition-colors duration-300 group`}
                    >
                      <div className="flex">
                        <div className="mr-2 mt-1">{icon}</div>
                        <div className="flex-1 opacity-90 group-hover:opacity-100">{log}</div>
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