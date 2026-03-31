#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.error) {
    console.error(`Error: failed to run ${command} ${args.join(' ')}.`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
};

const commandExists = (command) => {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return result.status === 0;
};

if (!commandExists('node')) {
  console.error('Error: node is not installed or not in PATH.');
  process.exit(1);
}

if (!commandExists('npm')) {
  console.error('Error: npm is not installed or not in PATH.');
  process.exit(1);
}

console.log('Using Node:');
run('node', ['-v']);

console.log('Using npm:');
run('npm', ['-v']);

console.log('Installing dependencies...');
run('npm', ['install']);

console.log('Running type check...');
run('npm', ['run', 'check']);

console.log('Building project...');
run('npm', ['run', 'build']);

console.log('Init complete.');
