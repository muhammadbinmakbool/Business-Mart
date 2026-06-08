const { spawn } = require('child_process');

const args = process.argv.slice(2);
const envVars = {};
let cmdIndex = 0;

// Parse key=value environment variables from CLI arguments
while (cmdIndex < args.length && args[cmdIndex].includes('=')) {
  const parts = args[cmdIndex].split('=');
  const key = parts[0];
  const value = parts.slice(1).join('=');
  envVars[key] = value;
  cmdIndex++;
}

const command = args[cmdIndex];
const cmdArgs = args.slice(cmdIndex + 1);

if (!command) {
  console.error('[Env Run] ERROR: No command specified to run.');
  process.exit(1);
}

// Spawn sub-command with blended environment variables
const child = spawn(command, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...envVars }
});

child.on('close', (code) => {
  process.exit(code);
});
