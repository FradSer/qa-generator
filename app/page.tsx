'use client';

import { useEffect, useRef, useState } from 'react';

// Types from the original codebase
type Region = {
  name: string;
  pinyin: string;
};

type GenerationOptions = {
  mode: 'questions' | 'answers' | 'all';
  region: string;
  totalCount: number;
  workerCount: number;
  maxQPerWorker: number;
  maxAttempts: number;
  batchSize: number;
  delay: number;
};

export default function ControlPanel() {
  const [options, setOptions] = useState<GenerationOptions>({
    mode: 'all',
    region: '',
    totalCount: 1000,
    workerCount: 5,
    maxQPerWorker: 50,
    maxAttempts: 3,
    batchSize: 50,
    delay: 1000,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setLogs([`Starting ${options.mode} generation for region ${options.region}...`]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation process');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining data in the buffer
          if (buffer) {
            processSSEData(buffer);
          }
          break;
        }

        // Append new data to buffer and process complete messages
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep the last incomplete message in the buffer

        for (const message of messages) {
          if (message.trim()) {
            processSSEData(message);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setLogs(prev => [...prev, `Error: ${message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const processSSEData = (message: string) => {
    if (message.startsWith('data: ')) {
      try {
        const data = JSON.parse(message.slice(6));
        switch (data.type) {
          case 'log':
            setLogs(prev => [...prev, data.message.trim()]);
            break;
          case 'error':
            setLogs(prev => [...prev, `Error: ${data.message.trim()}`]);
            break;
          case 'end':
            setLogs(prev => [...prev, `Process completed with code ${data.code}`]);
            setIsRunning(false);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">QA Generator Control Panel</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Operation Mode</label>
                <div className="mt-2 space-y-2">
                  {['questions', 'answers', 'all'].map((mode) => (
                    <label key={mode} className="flex items-center">
                      <input
                        type="radio"
                        value={mode}
                        checked={options.mode === mode}
                        onChange={(e) => setOptions(prev => ({ ...prev, mode: e.target.value as GenerationOptions['mode'] }))}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700 capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Region (Pinyin)</label>
                <input
                  type="text"
                  value={options.region}
                  onChange={(e) => setOptions(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="e.g., beijing"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Questions Count</label>
                <input
                  type="number"
                  value={options.totalCount}
                  onChange={(e) => setOptions(prev => ({ ...prev, totalCount: parseInt(e.target.value) }))}
                  min={1}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Worker Count</label>
                <input
                  type="number"
                  value={options.workerCount}
                  onChange={(e) => setOptions(prev => ({ ...prev, workerCount: parseInt(e.target.value) }))}
                  min={1}
                  max={20}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Questions Per Worker</label>
                <input
                  type="number"
                  value={options.maxQPerWorker}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxQPerWorker: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                <input
                  type="number"
                  value={options.maxAttempts}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) }))}
                  min={1}
                  max={10}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Size</label>
                <input
                  type="number"
                  value={options.batchSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Delay Between Batches (ms)</label>
                <input
                  type="number"
                  value={options.delay}
                  onChange={(e) => setOptions(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  min={0}
                  step={100}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isRunning}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isRunning ? 'Running...' : 'Start Generation'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Execution Logs</h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-[600px] overflow-y-auto font-mono">
              {logs.map((log, index) => (
                <div key={index} className="mb-2 whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 