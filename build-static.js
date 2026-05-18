#!/usr/bin/env node
// build-static.js — copies all static web assets into /public for Vercel
const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;
const DEST = path.join(__dirname, 'public');

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// Files/patterns to copy to public/
const staticFiles = [
  'index.html',
  'install.html',
  'download.html',
  'sw.js',
  'sw_driver-pwa_public.js',
  'manifest.json',
  'manifest-driver.json',
  'manifest_driver-pwa_public.json',
  'fa-offline-db.js',
  'fa-native-bridge.js',
  'fa-native-experience.js',
  'plugin-core.js',
  'icon-admin-48.png',
  'icon-admin-192.png',
  'icon-admin-512.png',
  'icon-admin.svg',
  'icon-driver-48.png',
  'icon-driver-192.png',
  'icon-driver-512.png',
  'icon-driver.svg',
];

let copied = 0;
for (const file of staticFiles) {
  const src  = path.join(SRC, file);
  const dest = path.join(DEST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✅ ${file}`);
    copied++;
  } else {
    console.log(`  ⚠️  skipped (not found): ${file}`);
  }
}

console.log(`\nBuild complete — ${copied} files copied to /public`);
