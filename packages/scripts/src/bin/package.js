#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { copyDirectorySync } from "../copyDirectorySync.js";
import { getMarketplaceDir } from "../pathManage.js";

/**
 * 这些源码工程文件不属于插件本身，拷贝到产品目录时排除。
 */
const EXCLUDE = new Set([
  "node_modules",
  "package.json",
  ".turbo",
  "dist",
  ".gitignore"
]);

/**
 * 将插件源目录打包到 marketplace/<target>。
 * @param {string} srcDir 插件源目录（通常是插件包根目录 "."）
 * @param {string} target 产品目录下的插件名
 */
export function packageF(srcDir, target) {
  const absSrc = path.resolve(srcDir);
  const targetDir = path.resolve(getMarketplaceDir(), target);

  // 清空已有产物，重新拷贝
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  copyDirectorySync(absSrc, targetDir, (name) => EXCLUDE.has(name));

  console.log(`[package] ${absSrc} -> ${targetDir}`);
}

const param = process.argv.slice(2);
if (param.length === 2) {
  packageF(param[0], param[1]);
} else {
  console.error("用法: package <源目录> <产品目录下的插件名>");
  process.exit(1);
}
