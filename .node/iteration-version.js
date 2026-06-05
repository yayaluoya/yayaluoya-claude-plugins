import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { program } from 'commander';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPackageJsonPath = path.join(__dirname, '../package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath).toString());

const repositoryInfo = {
  owner: rootPackageJson.repository.owner,
  repo: rootPackageJson.repository.repo,
};

const packagesDir = path.join(__dirname, '../packages');
const defaultVersion = '0.0.0';

program
  .description('迭代版本号')
  .option('-m, --major <major>', '主版本号')
  .option('-n, --minor <minor>', '次版本号')
  .action(() => {
    iterationVersion(program.opts()).catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
  })
  .parse(process.argv);

/**
 * @param {{ major?: string, minor?: string }} options
 */
async function iterationVersion(options) {
  let { major = '1', minor = '0' } = options;
  major = parseInt(major.trim()).toString();
  minor = parseInt(minor.trim()).toString();

  const remoteVersions = await getRemoteVersions();
  const remoteMaxVersion = semver.maxSatisfying(remoteVersions, '*') || defaultVersion;

  console.log('remoteMaxVersion:', remoteMaxVersion);

  if (semver.lt(`${major}.${Number(minor) + 1}.0`, remoteMaxVersion)) {
    throw new Error(`主版本号 ${major} 和次版本号 ${minor} 落后于远程最高版本号 ${remoteMaxVersion}`);
  }

  const newVersion = semver.inc(
    semver.maxSatisfying([remoteMaxVersion, `${major}.${minor}.0`], '*') || defaultVersion,
    'patch'
  );

  console.log('newVersion:', newVersion);

  // 更新根包版本号
  rootPackageJson.version = newVersion;
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
  console.log(`updated root -> ${newVersion}`);

  // 更新所有子包版本号
  const packageDirList = fs.readdirSync(packagesDir).filter((item) =>
    fs.statSync(path.join(packagesDir, item), { throwIfNoEntry: false })?.isDirectory()
  );
  for (const packageDir of packageDirList) {
    const pkgJsonPath = path.join(packagesDir, packageDir, 'package.json');
    if (!fs.statSync(pkgJsonPath, { throwIfNoEntry: false })?.isFile()) continue;
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath).toString());
    pkgJson.version = newVersion;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    console.log(`updated ${packageDir} -> ${newVersion}`);
  }
}

async function getRemoteVersions() {
  /** @type {{name: string}[] | {status: string}} */
  const tagList = await new Promise((resolve, reject) => {
    https.get(
      `https://api.github.com/repos/${repositoryInfo.owner}/${repositoryInfo.repo}/tags`,
      { headers: { 'User-Agent': 'nodejs' } },
      (res) => {
        /** @type {Buffer[]} */
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => resolve(JSON.parse(Buffer.concat(data).toString())));
        res.on('error', reject);
      }
    );
  });

  if ('status' in tagList) return [];

  return tagList
    .map((tag) => tag.name)
    .filter((v) => /^v/i.test(v))
    .map((v) => v.replace(/^v/, ''))
    .filter((v) => !!semver.valid(v));
}
