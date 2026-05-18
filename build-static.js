#!/usr/bin/env node
// build-static.js — copies all static web assets into /public for Vercel
const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;
const DEST = path.join(__dirname, 'public');

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

// All static files to copy to public/
// NOTE: app.html and install.html are built directly into public/ — not copied from root
const staticFiles = [
  'index.html',
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

let copied = 0, missing = 0;
for (const file of staticFiles) {
  const src  = path.join(SRC, file);
  const dest = path.join(DEST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✅ ${file}`);
    copied++;
  } else {
    console.error(`  ❌ MISSING: ${file}`);
    missing++;
  }
}

// install.html and app.html live directly in public/ — verify they exist
for (const f of ['install.html', 'app.html']) {
  const dest = path.join(DEST, f);
  if (fs.existsSync(dest)) {
    const size = Math.round(fs.statSync(dest).size / 1024);
    console.log(`  ✅ ${f} (${size}KB — pre-built)`);
    copied++;
  } else {
    console.error(`  ❌ MISSING: public/${f}`);
    missing++;
  }
}

console.log(`\nBuild complete — ${copied} files in /public`);
if (missing > 0) {
  console.error(`WARNING: ${missing} files were missing.`);
  process.exit(1);
}
