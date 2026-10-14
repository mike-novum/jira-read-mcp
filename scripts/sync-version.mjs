import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const indexPath = join(root, "src/index.ts");
const source = readFileSync(indexPath, "utf8");
const pattern = /^(\s*version:\s*")[^"]+(")/m;

if (!pattern.test(source)) {
  console.error("version field not found in src/index.ts");
  process.exit(1);
}

writeFileSync(indexPath, source.replace(pattern, `$1${version}$2`));
