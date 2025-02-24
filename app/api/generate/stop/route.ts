import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Send SIGTERM to all running bun processes
    const killCommand = process.platform === 'win32' ? 'taskkill /F /IM bun.exe' : 'pkill -15 bun';
    await new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(killCommand, (error: Error | null) => {
        if (error) {
          // Ignore error if no process were found
          if (error.message.includes('no process found') || 
              error.message.includes('not found') ||
              error.message.includes('no process killed')) {
            resolve(null);
          } else {
            reject(error);
          }
        } else {
          resolve(null);
        }
      });
    });

    // Give processes a moment to clean up
    await new Promise(resolve => setTimeout(resolve, 500));

    // Force kill any remaining processes
    const forceKillCommand = process.platform === 'win32' ? 'taskkill /F /IM bun.exe' : 'pkill -9 bun';
    await new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(forceKillCommand, () => resolve(null));
    });

    return NextResponse.json({ 
      success: true,
      message: 'Generation process stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping generation process:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop generation process',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 