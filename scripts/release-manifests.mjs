// Release step (CI): copies the signed Tauri NSIS installer to release/WinRate-Setup-<version>.exe
// and writes the two update manifests next to it:
//   latest.json — read by the Tauri updater of installed 0.6+ apps (signature from the .sig file);
//   latest.yml  — read by electron-updater in installed Electron versions (≤ 0.5.x), so they update
//                 straight into this installer (its hooks carry their data over and remove them).
// Usage: node scripts/release-manifests.mjs <bundle/nsis dir> [notes file]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const [bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis'), notesFile] = process.argv.slice(2);

const setup = fs.readdirSync(bundleDir).find((f) => f.endsWith('-setup.exe') && f.includes(version));
if (!setup) throw new Error(`no ${version} setup in ${bundleDir}`);
const sigFile = path.join(bundleDir, `${setup}.sig`);
if (!fs.existsSync(sigFile)) throw new Error(`missing ${sigFile} (TAURI_SIGNING_PRIVATE_KEY not set?)`);

const out = path.join(root, 'release');
fs.mkdirSync(out, { recursive: true });
const name = `WinRate-Setup-${version}.exe`;
fs.copyFileSync(path.join(bundleDir, setup), path.join(out, name));
fs.copyFileSync(sigFile, path.join(out, `${name}.sig`));

const bytes = fs.readFileSync(path.join(out, name));
const url = `https://github.com/Banzamel/WinRate/releases/download/v${version}/${name}`;
const now = new Date().toISOString();
const notes = notesFile && fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8').trim() : `WinRate ${version}`;

fs.writeFileSync(path.join(out, 'latest.json'), `${JSON.stringify({
  version,
  notes,
  pub_date: now,
  platforms: { 'windows-x86_64': { signature: fs.readFileSync(sigFile, 'utf8').trim(), url } },
}, null, 2)}\n`);

const sha512 = crypto.createHash('sha512').update(bytes).digest('base64');
fs.writeFileSync(path.join(out, 'latest.yml'), [
  `version: ${version}`,
  'files:',
  `  - url: ${name}`,
  `    sha512: ${sha512}`,
  `    size: ${bytes.length}`,
  `path: ${name}`,
  `sha512: ${sha512}`,
  `releaseDate: '${now}'`,
  '',
].join('\n'));

console.log(`release/${name} (${bytes.length} bytes), latest.json, latest.yml`);
