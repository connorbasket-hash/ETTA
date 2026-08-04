import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDirectories = [".next", "artifacts", "dist-electron"];

for (const directory of outputDirectories) {
  const target = path.resolve(root, directory);
  if (path.dirname(target) !== root) {
    throw new Error(`Refusing to clean path outside the project: ${target}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
}

console.log("Removed prior build and packaging output.");
