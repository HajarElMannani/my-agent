import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { promises as fs } from "fs";
import { dirname, resolve, relative, isAbsolute, join } from "path";

const excludeFiles = ["dist", "bun.lock"];

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

const markdownFileInput = z.object({
  rootDir: z.string().min(1).describe("The root directory in which to write"),
  relativePath: z
    .string()
    .min(1)
    .describe("Relative path to markdown file, e.g., docs/notes.md"),
  content: z.string().describe("Markdown content to write"),
  overwrite: z
    .boolean()
    .optional()
    .describe("If false, error when file exists. Default true."),
});

type MarkdownFileInput = z.infer<typeof markdownFileInput>;

async function generateMarkdownFile({
  rootDir,
  relativePath,
  content,
  overwrite,
}: MarkdownFileInput) {
  if (!relativePath.endsWith(".md") && !relativePath.endsWith(".mdx")) {
    throw new Error("Target path must end with .md or .mdx");
  }

  const absRoot = resolve(rootDir);
  const targetPath = resolve(absRoot, relativePath);
  const relToRoot = relative(absRoot, targetPath);
  if (relToRoot.startsWith("..") || isAbsolute(relToRoot)) {
    throw new Error("Target path must be inside rootDir");
  }

  await fs.mkdir(dirname(targetPath), { recursive: true });

  if (overwrite === false) {
    try {
      await fs.access(targetPath);
      throw new Error(
        `File already exists at ${targetPath}. Set overwrite=true to replace.`,
      );
    } catch (err: any) {
      if (err && err.code !== "ENOENT") throw err;
    }
  }

  await fs.writeFile(targetPath, content, "utf8");
  return { filePath: targetPath, bytesWritten: Buffer.byteLength(content, "utf8") };
}

export const generateMarkdownFileTool = tool({
  description:
    "Creates or overwrites a Markdown file inside rootDir at relativePath",
  inputSchema: markdownFileInput,
  execute: generateMarkdownFile,
});

const summarizeProjectInput = z.object({
  rootDir: z.string().min(1).describe("The repository root to summarize"),
  maxFiles: z.number().int().positive().max(50).optional(),
  maxBytesPerFile: z.number().int().positive().max(100000).optional(),
});

type SummarizeProjectInput = z.infer<typeof summarizeProjectInput>;

async function summarizeProject({
  rootDir,
  maxFiles = 12,
  maxBytesPerFile = 4000,
}: SummarizeProjectInput) {
  const absRoot = resolve(rootDir);
  const priority = [
    "package.json",
    "README.md",
    "index.ts",
    "tools.ts",
    "prompts.ts",
    "bunfig.toml",
    "tsconfig.json",
  ];

  const selected: string[] = [];

  // Add priority files if present
  for (const name of priority) {
    const p = join(absRoot, name);
    try {
      const stat = await fs.stat(p);
      if (stat.isFile()) selected.push(p);
    } catch {
      // ignore missing
    }
    if (selected.length >= maxFiles) break;
  }

  // Add additional .ts/.md/.json files from root (non-dot), skipping heavy dirs
  if (selected.length < maxFiles) {
    const dirents = await fs.readdir(absRoot, { withFileTypes: true });
    for (const d of dirents) {
      if (!d.isFile()) continue;
      if (d.name.startsWith(".")) continue;
      const lower = d.name.toLowerCase();
      if (!(/\.(ts|md|json)$/i.test(lower))) continue;
      const full = join(absRoot, d.name);
      if (!selected.includes(full)) selected.push(full);
      if (selected.length >= maxFiles) break;
    }
  }

  const files: { path: string; snippet: string }[] = [];
  for (const full of selected.slice(0, maxFiles)) {
    try {
      const rel = relative(absRoot, full);
      const content = await fs.readFile(full, "utf8");
      const snippet = content.slice(0, maxBytesPerFile);
      files.push({ path: rel, snippet });
    } catch {
      // ignore unreadable
    }
  }

  return files;
}

export const summarizeProjectTool = tool({
  description:
    "Reads key files in the repository root to provide grounded context for docs",
  inputSchema: summarizeProjectInput,
  execute: summarizeProject,
});
