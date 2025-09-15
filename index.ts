import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT, COMMIT_MESSAGE_SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool } from "./tools";
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

// Simple CLI: `bun run index.ts commit [rootDir]` or default to cwd for commit
const [mode, maybeDir] = process.argv.slice(2);

if (mode === "commit") {
  const dir = maybeDir ?? process.cwd();
  await generateCommitMessage(dir);
} else {
  // Default behavior: run the code review agent with provided directory hint
  await codeReviewAgent(
    "Review the code changes in '../my-agent' directory, make your reviews and suggestions file by file",
  );
}
