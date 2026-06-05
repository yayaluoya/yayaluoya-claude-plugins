import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');
const marketplacePath = path.join(rootDir, '.claude-plugin', 'marketplace.json');
const rootPackageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

const packageDirList = fs.readdirSync(packagesDir).filter((item) =>
  fs.statSync(path.join(packagesDir, item), { throwIfNoEntry: false })?.isDirectory()
);

const plugins = [];

for (const packageDir of packageDirList) {
  const pluginJsonPath = path.join(packagesDir, packageDir, '.claude-plugin', 'plugin.json');
  const pkgJsonPath = path.join(packagesDir, packageDir, 'package.json');

  if (!fs.statSync(pluginJsonPath, { throwIfNoEntry: false })?.isFile()) continue;
  if (!fs.statSync(pkgJsonPath, { throwIfNoEntry: false })?.isFile()) continue;

  const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  plugins.push({
    name: pluginJson.name,
    source: {
      source: 'npm',
      package: pkgJson.name,
      version: pkgJson.version,
    },
    description: pluginJson.description || pkgJson.description || '',
    author: pluginJson.author || { name: rootPackageJson.author },
  });
}

const marketplace = {
  _comment: '此文件由 .node/update-marketplace.js 自动生成，请勿手动修改',
  name: rootPackageJson.name,
  owner: {
    name: rootPackageJson.repository.owner,
  },
  metadata: {
    description: rootPackageJson.description,
    version: rootPackageJson.version,
  },
  plugins,
};

fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2));
console.log(`marketplace.json updated, ${plugins.length} plugins: ${plugins.map((p) => p.name).join(', ')}`);
