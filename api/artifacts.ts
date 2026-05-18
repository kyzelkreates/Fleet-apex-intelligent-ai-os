// api/artifacts.ts — Vercel Serverless Function
// Returns latest GitHub Actions artifact download links
import type { VercelRequest, VercelResponse } from '@vercel/node';

const OWNER = 'kyzelkreates';
const REPO  = 'Fleet-apex-intelligent-ai-os';
const TOKEN = process.env.GITHUB_TOKEN || '';

function fmtSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

interface GitHubRun {
  id: number;
  head_sha: string;
  created_at: string;
}

interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
}

async function ghFetch(path: string): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fleet-apex-vercel',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json() as Promise<any>;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const runsData = await ghFetch(
      `/repos/${OWNER}/${REPO}/actions/runs?per_page=20&status=success`
    ) as { workflow_runs?: GitHubRun[] };
    const runs: GitHubRun[] = runsData.workflow_runs || [];

    const nameMap: Record<string, string> = {
      'fleet-apex-admin-debug-apk':  'adminApk',
      'fleet-apex-driver-debug-apk': 'driverApk',
      'fleet-apex-windows-exe':      'windowsExe',
      'fleet-apex-windows-msi':      'windowsMsi',
      'fleet-apex-macos-dmg':        'macosDmg',
      'fleet-apex-linux-deb':        'linuxDeb',
      'fleet-apex-linux-appimage':   'linuxAppimage',
    };

    const result: Record<string, any> = {};
    const found = new Set<string>();

    for (const run of runs) {
      if (found.size >= Object.keys(nameMap).length) break;
      const artsData = await ghFetch(
        `/repos/${OWNER}/${REPO}/actions/runs/${run.id}/artifacts`
      ) as { artifacts?: GitHubArtifact[] };
      for (const art of (artsData.artifacts || [])) {
        const key = nameMap[art.name];
        if (key && !result[key] && !art.expired) {
          result[key] = {
            url:  `https://github.com/${OWNER}/${REPO}/actions/runs/${run.id}/artifacts/${art.id}`,
            size: fmtSize(art.size_in_bytes),
          };
          found.add(art.name);
          if (!result.latestSha) {
            result.latestSha  = run.head_sha;
            result.latestDate = run.created_at;
          }
        }
      }
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('artifacts API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
