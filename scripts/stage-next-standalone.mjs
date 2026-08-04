import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Next.js standalone output is missing. Run next build first.");
}

fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
  force: true,
});
fs.mkdirSync(path.join(standalone, ".next"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
  force: true,
});

// Turbopack can create hashed external-module aliases as absolute symlinks.
// Those links are invalid after installation and Electron Builder intentionally
// skips links that point outside the package. Materialize them as real folders.
const externalAliases = path.join(standalone, ".next", "node_modules");
if (fs.existsSync(externalAliases)) {
  for (const entry of fs.readdirSync(externalAliases, { withFileTypes: true })) {
    const aliasPath = path.join(externalAliases, entry.name);
    if (!fs.lstatSync(aliasPath).isSymbolicLink()) continue;
    const sourcePath = fs.realpathSync(aliasPath);
    fs.unlinkSync(aliasPath);
    fs.cpSync(sourcePath, aliasPath, { recursive: true, force: true, dereference: true });
  }
}

console.log("Staged Next.js standalone assets.");
