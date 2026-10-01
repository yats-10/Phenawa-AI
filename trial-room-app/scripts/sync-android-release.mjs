import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const rawUrl = process.env.PHENAWA_API_URL;
if (!rawUrl) {
  console.error('Set PHENAWA_API_URL to your public HTTPS API URL before building Android for release.');
  process.exit(1);
}

let apiUrl;
try {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('Use an HTTPS URL without credentials.');
  }
  apiUrl = rawUrl.replace(/\/+$/, '');
} catch {
  console.error('PHENAWA_API_URL must be a valid public HTTPS URL.');
  process.exit(1);
}

const environmentFile = new URL('../src/environments/environment.android-release.ts', import.meta.url);
writeFileSync(
  environmentFile,
  `import { environment as webEnvironment } from './environment.prod';\n\nexport const environment = { ...webEnvironment, apiUrl: ${JSON.stringify(apiUrl)} };\n`,
);

for (const args of [
  ['ng', 'build', '--configuration', 'production,android-release'],
  ['cap', 'sync', 'android'],
]) {
  const result = spawnSync('npx', args, { stdio: 'inherit', env: { ...process.env, PHENAWA_ANDROID_LOCAL: '0' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
