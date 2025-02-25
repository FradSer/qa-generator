'use client';

import { useEffect, useRef, useState } from 'react';
import { Region, regions } from '../config/config';
import { AddRegionModal } from './components/AddRegionModal';
import { LogsPanel } from './components/LogsPanel';
import { NavbarComponent } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';

// Types from the original codebase
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
    region: regions.length > 0 ? regions[0].pinyin : '',
    totalCount: 1000,
    workerCount: 5,
    maxQPerWorker: 50,
    maxAttempts: 3,
    batchSize: 50,
    delay: 1000,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAddRegion, setShowAddRegion] = useState(false);
  const [newRegion, setNewRegion] = useState<Partial<Region>>({
    name: '',
    pinyin: '',
    description: ''
  });
  const logsEndRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<AbortController | null>(null);

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

    processRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
        signal: processRef.current.signal,
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
          if (buffer) {
            processSSEData(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

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

  const handleStop = async () => {
    if (processRef.current) {
      processRef.current.abort();
      setLogs(prev => [...prev, 'Stopping generation process...']);
      
      try {
        const response = await fetch('/api/generate/stop', {
          method: 'POST',
        });
        
        if (!response.ok) {
          throw new Error('Failed to stop generation process');
        }
        
        setLogs(prev => [...prev, 'Generation process stopped.']);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        setLogs(prev => [...prev, `Error stopping process: ${message}`]);
      } finally {
        setIsRunning(false);
      }
    }
  };

  const handleAddRegion = async (regionData: Partial<Region>) => {
    try {
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add region');
      }
      
      window.location.reload();
    } catch (error) {
      console.error('Error adding region:', error);
      alert('Failed to add region. Please try again.');
    }
  };

  return (
    <main className="h-screen w-full overflow-hidden">
      <NavbarComponent title="QA Generator Control Panel" isRunning={isRunning} />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] mt-16 px-4 md:px-6 lg:px-10 py-4 gap-6">
        <SettingsPanel 
          options={options}
          setOptions={setOptions}
          isRunning={isRunning}
          handleSubmit={handleSubmit}
          handleStop={handleStop}
          onAddRegionClick={() => setShowAddRegion(true)}
        />

        <LogsPanel
          logs={logs}
          logsEndRef={logsEndRef}
        />
      </div>

      <AddRegionModal
        isOpen={showAddRegion}
        onClose={() => {
          setShowAddRegion(false);
          setNewRegion({ name: '', pinyin: '', description: '' });
        }}
        newRegion={newRegion}
        setNewRegion={setNewRegion}
        onSubmit={handleAddRegion}
      />
    </main>
  );
} 