// api/download.ts — Vercel serverless function
// Proxies GitHub artifact downloads so users don't need a GitHub account
// Usage: /api/download?app=admin  OR  /api/download?app=driver

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OWNER = 'kyzelkreates';
const REPO  = 'Fleet-apex-intelligent-ai-os';
const TOKEN = process.env.GITHUB_TOKEN || '';

const APP_NAMES: Record<string, string> = {
  admin:  'fleet-apex-admin-debug-apk',
  driver: 'fleet-apex-driver-debug-apk',
};

const FILE_NAMES: Record<string, string> = {
  admin:  'FleetApex-Admin-Dashboard.apk',
  driver: 'FleetApex-Driver-App.apk',
};

async function ghFetch(path: string, opts: RequestInit = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fleet-apex-vercel',
      ...(opts.headers || {}),
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = (req.query.app as string || '').toLowerCase();

  if (!TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured on Vercel' });
  }

  const artifactName = APP_NAMES[app];
  if (!artifactName) {
    return res.status(400).json({ error: 'Invalid app. Use ?app=admin or ?app=driver' });
  }

  try {
    // 1. Find the latest non-expired artifact
    const runsRes  = await ghFetch(`/repos/${OWNER}/${REPO}/actions/runs?per_page=20&status=success`);
    const runsData = await runsRes.json();
    const runs: any[] = runsData.workflow_runs || [];

    let artifactId: number | null = null;

    for (const run of runs) {
      if (artifactId) break;
      const artsRes  = await ghFetch(`/repos/${OWNER}/${REPO}/actions/runs/${run.id}/artifacts`);
      const artsData = await artsRes.json();
      for (const art of artsData.artifacts || []) {
        if (art.name === artifactName && !art.expired) {
          artifactId = art.id;
          break;
        }
      }
    }

    if (!artifactId) {
      return res.status(404).json({ error: 'No valid artifact found. Build may still be in progress.' });
    }

    // 2. Get redirect URL for the zip
    const zipRes = await ghFetch(
      `/repos/${OWNER}/${REPO}/actions/artifacts/${artifactId}/zip`,
      { redirect: 'manual' }
    );

    let downloadUrl: string;
    if (zipRes.status === 302 || zipRes.status === 301) {
      downloadUrl = zipRes.headers.get('location') || '';
    } else {
      const body = await zipRes.json();
      return res.status(500).json({ error: 'Could not get download URL', body });
    }

    if (!downloadUrl) {
      return res.status(500).json({ error: 'No redirect location from GitHub' });
    }

    // 3. Download the zip from the CDN URL
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      return res.status(500).json({ error: `CDN fetch failed: ${fileRes.status}` });
    }

    // 4. Read zip into buffer
    const arrayBuf = await fileRes.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuf);

    // 5. Extract the .apk from the zip in memory
    // The zip contains a single .apk file — find it
    const apkBuffer = extractApkFromZip(zipBuffer);

    if (!apkBuffer) {
      // Fallback: serve the zip itself
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${FILE_NAMES[app]}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      return res.status(200).send(zipBuffer);
    }

    // 6. Stream APK to user
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${FILE_NAMES[app]}"`);
    res.setHeader('Content-Length', apkBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(apkBuffer);

  } catch (err: any) {
    console.error('Download proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Minimal ZIP parser — extracts first .apk file from a ZIP buffer
function extractApkFromZip(zip: Buffer): Buffer | null {
  try {
    let offset = 0;
    while (offset < zip.length - 30) {
      // Local file header signature: PK\x03\x04
      if (zip[offset] !== 0x50 || zip[offset+1] !== 0x4B ||
          zip[offset+2] !== 0x03 || zip[offset+3] !== 0x04) {
        offset++;
        continue;
      }

      const compression  = zip.readUInt16LE(offset + 8);
      const compSize     = zip.readUInt32LE(offset + 18);
      const uncompSize   = zip.readUInt32LE(offset + 22);
      const fileNameLen  = zip.readUInt16LE(offset + 26);
      const extraLen     = zip.readUInt16LE(offset + 28);
      const fileName     = zip.slice(offset + 30, offset + 30 + fileNameLen).toString('utf8');
      const dataStart    = offset + 30 + fileNameLen + extraLen;

      if (fileName.endsWith('.apk')) {
        if (compression === 0) {
          // Stored — no compression
          return zip.slice(dataStart, dataStart + uncompSize);
        } else if (compression === 8) {
          // Deflate
          const zlib = require('zlib');
          const compressed = zip.slice(dataStart, dataStart + compSize);
          return zlib.inflateRawSync(compressed);
        }
      }

      offset = dataStart + compSize;
    }
    return null;
  } catch {
    return null;
  }
}
