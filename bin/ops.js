#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const args = process.argv.slice(2);
const command = args[0] || 'start';

function getPort() {
  const portIdx = args.indexOf('-p') !== -1 ? args.indexOf('-p') : args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    return parseInt(args[portIdx + 1], 10);
  }
  return process.env.PORT || 3000;
}

const port = getPort();

function printHelp() {
  console.log(`
Ops Console - Lightweight Server Observability & PM2 Dashboard

Usage:
  ops start [-p <port>]     Start Ops Console dashboard in standalone mode
  ops dev [-p <port>]       Start in Next.js development mode
  ops status                Check current running status
  ops help                  Show this help message

Options:
  -p, --port <number>       Port number to bind (Default: 3000)
`);
}

if (command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === 'status') {
  try {
    const res = execSync(`lsof -i :${port} -sTCP:LISTEN -t`).toString().trim();
    if (res) {
      console.log(`Ops Console is currently RUNNING on port ${port} (PID: ${res})`);
    } else {
      console.log(`Ops Console is NOT running on port ${port}.`);
    }
  } catch {
    console.log(`Ops Console is NOT running on port ${port}.`);
  }
  process.exit(0);
}

if (command === 'dev') {
  console.log(`Starting Ops Console in DEVELOPMENT mode on port ${port}...`);
  const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  });
  child.on('exit', (code) => process.exit(code || 0));
} else if (command === 'start') {
  const standaloneServer = path.join(projectRoot, '.next', 'standalone', 'server.js');
  
  if (!fs.existsSync(standaloneServer)) {
    console.log('Production build not found. Running "npm run build"...');
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
  }

  console.log(`Starting Ops Console on port ${port} (http://localhost:${port}) [Standalone RAM ~75MB]...`);
  const child = spawn('node', [standaloneServer], {
    cwd: path.join(projectRoot, '.next', 'standalone'),
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), HOSTNAME: '0.0.0.0' },
  });

  child.on('exit', (code) => process.exit(code || 0));
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}
