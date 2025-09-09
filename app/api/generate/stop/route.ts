import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { InputValidator } from '../../../../utils/input-validation';

/**
 * Secure process termination utility
 */
class SecureProcessManager {
  private static getKillCommands(platform: 'win32' | 'unix') {
    if (platform === 'win32') {
      return {
        graceful: ['taskkill', ['/F', '/IM', 'bun.exe']],
        force: ['taskkill', ['/F', '/IM', 'bun.exe']]
      };
    } else {
      return {
        graceful: ['pkill', ['-15', 'bun']],
        force: ['pkill', ['-9', 'bun']]
      };
    }
  }

  private static execSecureCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        stdio: 'pipe',
        timeout: 5000 // 5 second timeout
      });

      process.on('close', (code) => {
        // Ignore "no process found" type errors (codes 1, 123, etc)
        if (code === 0 || code === 1 || code === 123) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        // Ignore common "no process found" errors
        if (error.message.includes('ESRCH') || 
            error.message.includes('no such process')) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  static async terminateProcesses(): Promise<void> {
    // Validate and normalize platform
    const platform = InputValidator.validatePlatform(process.platform);
    const commands = this.getKillCommands(platform);

    try {
      // First attempt graceful termination
      await this.execSecureCommand(commands.graceful[0], commands.graceful[1]);
      
      // Give processes time to clean up
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force kill any remaining processes
      await this.execSecureCommand(commands.force[0], commands.force[1]);
      
    } catch (error) {
      // Log but don't fail - processes might already be terminated
      console.warn('Process termination warning:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export async function POST() {
  try {
    await SecureProcessManager.terminateProcesses();

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