import fs from "fs";
import path from "path";

/**
 * 递归拷贝目录。
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 * @param {(name: string, fullPath: string) => boolean} [exclude] 返回 true 则跳过该条目
 */
export function copyDirectorySync(src, dest, exclude) {
  if (!fs.existsSync(src)) {
    throw new Error(`源目录不存在: ${src}`);
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  fs.readdirSync(src).forEach((file) => {
    const srcPath = path.join(src, file);
    if (exclude && exclude(file, srcPath)) {
      return;
    }

    const destPath = path.join(dest, file);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      copyDirectorySync(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
