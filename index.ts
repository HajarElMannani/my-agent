import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT, COMMIT_MESSAGE_SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool, generateMarkdownFileTool, summarizeProjectTool } from "./tools";
import { simpleGit } from "simple-git";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool: getFileChangesInDirectoryTool,
    },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

const excludeFiles = ["dist", "bun.lock"];

async function getStagedDiffs(rootDir: string) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary(["--cached"]);
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--cached", "--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const generateCommitMessage = async (rootDir: string) => {
  const diffs = await getStagedDiffs(rootDir);

  if (!diffs.length) {
    process.stdout.write(
      "No staged changes to commit. Stage files first (e.g., git add -p).\n",
    );
    return;
  }

  const diffsText = diffs
    .map((d) => `# file: ${d.file}\n${d.diff}`)
    .join("\n\n");

  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    system: COMMIT_MESSAGE_SYSTEM_PROMPT,
    prompt: `Staged diffs:\n\n${diffsText}`,
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");
};

async function generateReadme(rootDir: string, overwrite: boolean = true) {
  const prompt = `Read the repository context via summarizeProjectTool, then generate a comprehensive, skimmable README.md grounded in the files you read.

Include:
- Project overview and key features
- Requirements and installation
- Setup and configuration
- Usage with examples
- Scripts / commands
- Contributing, License

After you generate the README content, call generateMarkdownFileTool to write it with:
- rootDir: "${rootDir}"
- relativePath: "README.md"
- content: your generated README (no code fences)
- overwrite: ${overwrite}`;

  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    prompt,
    tools: {
      getFileChangesInDirectoryTool: getFileChangesInDirectoryTool,
      summarizeProjectTool: summarizeProjectTool,
      generateMarkdownFileTool: generateMarkdownFileTool,
    },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");
}

// Simple CLI:
// - Commit message: `bun run index.ts commit [rootDir]`
// - README generate: `bun run index.ts readme [rootDir] [--overwrite true|false]`
const args = process.argv.slice(2);
const mode = args[0];

if (mode === "commit") {
  const dir = args[1] ?? process.cwd();
  await generateCommitMessage(dir);
} else if (mode === "readme") {
  const dir = args[1] ?? process.cwd();
  let overwrite: boolean = true;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--overwrite" && typeof args[i + 1] === "string") {
      overwrite = args[i + 1] === "true";
      i += 1;
    }
  }
  await generateReadme(dir, overwrite);
} else {
  // Default behavior: run the code review agent with provided directory hint
  await codeReviewAgent(
    "Review the code changes in '../my-agent' directory, make your reviews and suggestions file by file",
  );
}
