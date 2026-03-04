import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file if it exists
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const app = express();
app.use(express.json({ type: ["application/json", "text/*"] }));

// Graceful JSON parse error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: true,
      error_message: `Invalid JSON: ${err.message}`,
      hint: "Send valid JSON with Content-Type: application/json",
    });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY;

// --- Claude CLI wrapper ---

function callClaude(prompt, { model = "haiku", timeoutMs = 55000 } = {}) {
  return new Promise((resolve, reject) => {
    // Clean env so nested claude doesn't fail inside active session
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const args = [
      "--print",
      "--output-format", "text",
      "--model", model,
      "--max-turns", "1",
      "--no-session-persistence",
      "-",  // read prompt from stdin
    ];

    let stdout = "";
    let stderr = "";

    const child = spawn("claude", args, {
      env: cleanEnv,
      cwd: __dirname,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });

    // Send prompt via stdin and close
    child.stdin.write(prompt);
    child.stdin.end();

    // Timeout guard
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("claude CLI timed out"));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`[claude-cli] stderr: ${stderr.trim()}`);
        console.error(`[claude-cli] stdout: ${stdout.trim().slice(0, 200)}`);
        reject(new Error(`claude CLI exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI spawn error: ${err.message}`));
    });
  });
}

// --- Helpers ---

function loadFile(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf-8");
}

function parseContextRefs(skillContent) {
  const refs = [];
  const pattern =
    /^[-*]\s+(knowledge_base\/\S+|clients\/\S+|00_foundation\/\S+)/gm;
  let match;
  while ((match = pattern.exec(skillContent)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function resolveClientSlug(refPath, data) {
  if (refPath.includes("{{client_slug}}") && data.client_slug) {
    return refPath.replace("{{client_slug}}", data.client_slug);
  }
  return refPath;
}

function buildFullPrompt(skillContent, contextFiles, data, instructions) {
  let prompt = "";

  prompt += "You are a JSON generation engine. Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Just the raw JSON object.\n\n";
  prompt += "# Skill Instructions\n\n";
  prompt += skillContent;

  if (contextFiles.length > 0) {
    prompt += "\n\n---\n\n# Loaded Context\n\n";
    for (const { path: filePath, content } of contextFiles) {
      prompt += `## ${filePath}\n\n${content}\n\n`;
    }
  }

  prompt += "\n\n---\n\n# Data to Process\n\n";
  prompt += JSON.stringify(data, null, 2);

  if (instructions) {
    prompt += `\n\n## Campaign Instructions\n${instructions}`;
  }

  prompt += "\n\nReturn ONLY the JSON object. No markdown, no explanation.";

  return prompt;
}

function makeErrorResponse(message, skillName) {
  return {
    error: true,
    error_message: message,
    skill: skillName || "unknown",
  };
}

function listSkills() {
  const skillsDir = path.join(__dirname, "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// --- Routes ---

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "clay-webhook-os",
    engine: "claude-cli",
  });
});

app.get("/skills", (req, res) => {
  res.json({ skills: listSkills() });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", engine: "claude-cli", timestamp: new Date().toISOString() });
});

app.post("/test-echo", (req, res) => {
  res.json({
    received: req.body,
    content_type: req.headers["content-type"],
    keys: req.body ? Object.keys(req.body) : [],
  });
});

app.post("/webhook", async (req, res) => {
  // Auth check
  if (WEBHOOK_API_KEY) {
    const provided = req.headers["x-api-key"];
    if (provided !== WEBHOOK_API_KEY) {
      return res.status(401).json(makeErrorResponse("Invalid API key"));
    }
  }

  const { skill, data, instructions, model } = req.body;

  if (!skill) {
    return res.json(makeErrorResponse("Missing required field: skill"));
  }
  if (!data || typeof data !== "object") {
    return res.json(makeErrorResponse("Missing or invalid field: data", skill));
  }

  // Load skill file
  const skillPath = `skills/${skill}/skill.md`;
  const skillContent = loadFile(skillPath);
  if (!skillContent) {
    return res.json(
      makeErrorResponse(`Skill '${skill}' not found at ${skillPath}`, skill)
    );
  }

  // Parse and load context files
  const contextRefs = parseContextRefs(skillContent);
  const contextFiles = [];
  for (const ref of contextRefs) {
    const resolved = resolveClientSlug(ref, data);
    if (resolved.includes("{{")) continue;
    const content = loadFile(resolved);
    if (content) {
      contextFiles.push({ path: resolved, content });
    }
  }

  // Auto-load industry context
  if (data.industry) {
    const slug = data.industry
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const industryDir = path.join(__dirname, "knowledge_base", "industries");
    if (fs.existsSync(industryDir)) {
      const files = fs.readdirSync(industryDir);
      for (const file of files) {
        if (
          file.endsWith(".md") &&
          slug.includes(file.replace(".md", "").split("-")[0])
        ) {
          const industryPath = `knowledge_base/industries/${file}`;
          if (!contextFiles.some((c) => c.path === industryPath)) {
            const content = loadFile(industryPath);
            if (content) contextFiles.push({ path: industryPath, content });
          }
        }
      }
    }
  }

  const fullPrompt = buildFullPrompt(skillContent, contextFiles, data, instructions);
  const selectedModel = model || "haiku";

  console.log(`[${skill}] Processing via claude --print (model: ${selectedModel})...`);

  try {
    const raw = await callClaude(fullPrompt, { model: selectedModel });

    console.log(`[${skill}] Got response (${raw.length} chars)`);

    if (!raw) {
      return res.json(makeErrorResponse("Empty response from Claude", skill));
    }

    // Parse JSON
    let parsed;
    try {
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.json({
        ...makeErrorResponse("Claude response was not valid JSON", skill),
        raw_response: raw,
      });
    }

    return res.json({
      ...parsed,
      _skill: skill,
      _engine: "claude-cli",
    });
  } catch (err) {
    console.error(`[${skill}] Error:`, err.message);
    return res.json(makeErrorResponse(`Error: ${err.message}`, skill));
  }
});

// --- Start ---

app.listen(PORT, "0.0.0.0", () => {
  console.log(`clay-webhook-os listening on 0.0.0.0:${PORT}`);
  console.log(`Engine: claude --print (uses Claude Code subscription)`);
  console.log(`Skills available: ${listSkills().join(", ") || "none"}`);
  console.log(`WEBHOOK_API_KEY: ${WEBHOOK_API_KEY ? "set" : "disabled"}`);
});
