import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 项目根目录（packages/scripts/src -> 上溯三级）
 */
export function getProjectRootDir() {
  return path.join(__dirname, "../../../");
}

/**
 * 产品目录：打包后的插件输出到这里
 */
export function getPluginsDir() {
  return path.join(getProjectRootDir(), "./plugins");
}
