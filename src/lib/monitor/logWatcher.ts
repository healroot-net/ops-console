import fs from 'fs';
import path from 'path';
import os from 'os';

export interface LogEntry {
  timestamp: string;
  type: 'out' | 'err';
  message: string;
  processName: string;
}

export function getPM2LogPath(processName: string, type: 'out' | 'error'): string {
  const pm2Home = process.env.PM2_HOME || path.join(os.homedir(), '.pm2');
  const logDir = path.join(pm2Home, 'logs');
  return path.join(logDir, `${processName}-${type}.log`);
}

export async function readRecentLogs(processName: string, lines: number = 50): Promise<{ out: string[]; err: string[] }> {
  const outPath = getPM2LogPath(processName, 'out');
  const errPath = getPM2LogPath(processName, 'error');

  const readLastLines = (filePath: string, n: number): string[] => {
    try {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf-8');
      const allLines = content.split('\n');
      return allLines.slice(-n).filter(Boolean);
    } catch {
      return [];
    }
  };

  return {
    out: readLastLines(outPath, lines),
    err: readLastLines(errPath, lines),
  };
}
