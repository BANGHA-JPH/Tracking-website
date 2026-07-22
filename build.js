const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== STARTING RENDER PRODUCTION BUILD ===');

// 1. Build frontend
console.log('1. Building React Frontend...');
execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

// 2. Ensure root dist directory exists
const frontendDist = path.join(__dirname, 'frontend', 'dist');
const rootDist = path.join(__dirname, 'dist');

if (fs.existsSync(frontendDist)) {
  console.log('2. Copying built assets to root dist...');
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(frontendDist, rootDist, { recursive: true });
  console.log('=== BUILD COMPLETED SUCCESSFULLY ===');
} else {
  console.error('ERROR: frontend/dist was not created by Vite build!');
  process.exit(1);
}
