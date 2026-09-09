import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirs = [
  "app",
  "components",
  "features",
  "hooks",
  "services",
  "domain",
  "theme",
  "__tests__"
];
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"]);
const codeExtensions = new Set([".ts", ".tsx"]);
const errors = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function toProjectPath(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function isInside(projectPath, dir) {
  return projectPath === dir || projectPath.startsWith(`${dir}/`);
}

function hasExplicitAny(content) {
  return /\bany\b/.test(content);
}

function hasApiUrl(content) {
  return /https?:\/\/|EXPO_PUBLIC_API_URL/.test(content);
}

for (const dir of sourceDirs) {
  const absoluteDir = path.join(root, dir);
  const files = await walk(absoluteDir);

  for (const file of files) {
    const ext = path.extname(file);

    if (!textExtensions.has(ext)) {
      continue;
    }

    const projectPath = toProjectPath(file);
    const content = await readFile(file, "utf8");
    const lines = content.split(/\r?\n/);

    if (lines.length > 250) {
      errors.push(`${projectPath} depasse 250 lignes`);
    }

    if (codeExtensions.has(ext) && hasExplicitAny(content)) {
      errors.push(`${projectPath} contient le mot-cle any`);
    }

    if (
      codeExtensions.has(ext) &&
      !isInside(projectPath, "services/api") &&
      /\bfetch\s*\(/.test(content)
    ) {
      errors.push(`${projectPath} utilise fetch hors services/api`);
    }

    if (
      codeExtensions.has(ext) &&
      (isInside(projectPath, "app") || isInside(projectPath, "components")) &&
      hasApiUrl(content)
    ) {
      errors.push(`${projectPath} contient une URL ou variable API interdite`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Architecture frontend valide.");
