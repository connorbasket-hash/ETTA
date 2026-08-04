import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getAllSettings, getSetting } from '@/lib/db';

const SCRIPTS_DIR = process.env.TIMEKEEPER_SCRIPTS_DIR || path.resolve('./scripts');
const APP_ROOT = process.cwd();

function venvPythonPath(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [path.join(APP_ROOT, '.venv', 'Scripts', 'python.exe')]
      : [path.join(APP_ROOT, '.venv', 'bin', 'python3')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function getPythonCommandForSpawn(): string {
  return process.env.TIMEKEEPER_PYTHON_COMMAND ||
    (venvPythonPath() ?? (process.platform === 'win32' ? 'python' : 'python3'));
}

export function getOutlookScriptPath(scriptName: string): string {
  return path.join(SCRIPTS_DIR, scriptName);
}

export type OutlookBackend = 'auto' | 'com' | 'graph';

export function resolveOutlookBackend(): OutlookBackend {
  const fromSettings = getSetting('outlook_backend') as OutlookBackend | null;
  const fromEnv = process.env.OUTLOOK_BACKEND as OutlookBackend | undefined;
  const value = fromSettings || fromEnv || 'auto';
  if (value === 'com' || value === 'graph' || value === 'auto') {
    return value;
  }
  return 'auto';
}

export function getEffectiveOutlookBackend(): 'com' | 'graph' {
  const backend = resolveOutlookBackend();
  if (backend === 'com' || backend === 'graph') {
    return backend;
  }
  return process.platform === 'win32' ? 'com' : 'graph';
}

export function buildOutlookPythonEnv(): NodeJS.ProcessEnv {
  const settings = getAllSettings();
  const dataDir = path.resolve('./data');

  return {
    ...process.env,
    OUTLOOK_BACKEND: resolveOutlookBackend(),
    AZURE_CLIENT_ID:
      settings.azure_client_id ||
      process.env.AZURE_CLIENT_ID ||
      process.env.MS_CLIENT_ID ||
      '',
    AZURE_TENANT_ID:
      settings.azure_tenant_id ||
      process.env.AZURE_TENANT_ID ||
      process.env.MS_TENANT_ID ||
      'common',
    AZURE_SCOPES:
      settings.azure_scopes ||
      process.env.AZURE_SCOPES ||
      'Mail.Read Calendars.Read User.Read',
    MSAL_CACHE_PATH: path.join(dataDir, 'msal_cache.json'),
    MSAL_FLOW_PATH: path.join(dataDir, 'outlook_device_flow.json'),
    PYTHONPATH: SCRIPTS_DIR,
  };
}

export function runOutlookPythonScript(
  scriptName: string,
  args: string[] = [],
  options?: { timeoutMs?: number }
): Promise<{ stdout: string; stderr: string; code: number }> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const timeoutMs = options?.timeoutMs ?? 120_000;

  return new Promise((resolve, reject) => {
    const python = spawn(getPythonCommandForSpawn(), [scriptPath, ...args], {
      env: buildOutlookPythonEnv(),
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        python.kill();
        reject(new Error(`Python script timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    python.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    python.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    python.on('error', (error) => {
      clearTimeout(timer);
      settled = true;
      reject(error);
    });

    python.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
      });
    });
  });
}
