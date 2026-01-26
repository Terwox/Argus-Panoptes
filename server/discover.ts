/**
 * Session Discovery
 *
 * Detects already-running Claude Code sessions on startup by scanning
 * transcript files in ~/.claude/projects/
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import * as state from './state.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const RECENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes - consider active if modified recently

interface ToolInput {
  questions?: Array<{ question?: string }>;
  todos?: Array<{ content?: string; status?: string; activeForm?: string }>;
  file_path?: string;
  path?: string;
  command?: string;
  pattern?: string;
  prompt?: string;
  description?: string;
  subagent_type?: string;
  run_in_background?: boolean;
}

interface ContentBlock {
  type: string;
  text?: string;  // For user message text blocks
  thinking?: string;  // For thinking blocks (extended thinking)
  name?: string;  // For tool_use blocks
  input?: ToolInput;
}

interface TranscriptEntry {
  type: string;
  message?: {
    content?: string | ContentBlock[];
  };
  cwd?: string;
}

/**
 * NOTE: We no longer try to decode directory names since the encoding is ambiguous
 * (can't distinguish path separator `-` from literal hyphen `-` in folder names).
 * Instead, we always get the cwd from the transcript file itself.
 */

/**
 * Extract project name from path
 */
function projectNameFromPath(path: string): string {
  return basename(path);
}

/**
 * Find ALL recently active transcript files in a project directory
 * MULTIPLE CONDUCTORS: Returns all transcripts modified within RECENT_THRESHOLD
 */
function findActiveTranscripts(projectDir: string): string[] {
  const now = Date.now();
  const activeTranscripts: string[] = [];

  try {
    const files = readdirSync(projectDir);

    for (const file of files) {
      // Only consider main session transcripts (UUID.jsonl), not subagent transcripts
      if (file.endsWith('.jsonl') && !file.includes('/')) {
        const filePath = join(projectDir, file);
        const stats = statSync(filePath);

        // Include if modified recently enough (active session)
        if (now - stats.mtimeMs < RECENT_THRESHOLD) {
          activeTranscripts.push(filePath);
        }
      }
    }
  } catch (e) {
    // Directory might not exist or be inaccessible
  }

  return activeTranscripts;
}

/**
 * Find the most recent transcript file in a project directory (if active)
 * @deprecated Use findActiveTranscripts for multi-conductor support
 */
function findMostRecentTranscript(projectDir: string): string | null {
  const transcripts = findActiveTranscripts(projectDir);
  return transcripts.length > 0 ? transcripts[0] : null;
}

/**
 * Parse transcript to extract session info
 */
function parseTranscript(transcriptPath: string): { sessionId: string; cwd: string } | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Session ID is the filename without extension
    const sessionId = basename(transcriptPath, '.jsonl');

    // Try to find cwd from the transcript entries
    // Search more thoroughly - check all lines since cwd might not be at the start
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as TranscriptEntry;
        if (entry.cwd) {
          return { sessionId, cwd: entry.cwd };
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    // No cwd found in transcript - can't reliably determine the project path
    // (Directory name encoding is ambiguous for paths with hyphens)
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a transcript has a pending AskUserQuestion (last assistant message has unanswered question)
 */
function checkPendingAskUserQuestion(transcriptPath: string): string | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Read from end to find the last assistant message
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      try {
        const entry = JSON.parse(lines[i]) as TranscriptEntry;

        // If we find a user message first, no pending question
        if (entry.type === 'user') return null;

        // Check if this is an assistant message with AskUserQuestion tool call
        if (entry.type === 'assistant' && entry.message?.content) {
          const msgContent = entry.message.content;
          // Content is an array of blocks
          if (Array.isArray(msgContent)) {
            for (const block of msgContent) {
              if (block.type === 'tool_use') {
                // AskUserQuestion - explicit user question
                if (block.name === 'AskUserQuestion') {
                  const questions = block.input?.questions;
                  if (questions && questions.length > 0 && questions[0].question) {
                    return questions[0].question;
                  }
                  return 'Waiting for your response...';
                }
                // ExitPlanMode - plan approval dialog
                if (block.name === 'ExitPlanMode') {
                  return 'Accept this plan?';
                }
                // EnterPlanMode - plan mode entry confirmation
                if (block.name === 'EnterPlanMode') {
                  return 'Enter plan mode?';
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Check if a transcript shows a system error that requires user action
 * (e.g., "Prompt is too long" - user needs to compact or shorten)
 */
function checkSystemError(transcriptPath: string): string | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // System error patterns that require user action
    const errorPatterns = [
      { pattern: /prompt is too long/i, message: 'Prompt too long - needs /compact' },
      { pattern: /context.*(too long|exceeded|overflow)/i, message: 'Context overflow - needs /compact' },
      { pattern: /maximum.*tokens?.*(exceeded|reached)/i, message: 'Token limit reached - needs /compact' },
    ];

    // Check last 10 lines for system errors - ONLY match system-type messages
    // Don't match user messages discussing errors (causes false positives)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const rawLine = lines[i];

      try {
        const entry = JSON.parse(rawLine) as TranscriptEntry;

        // If we find a user message, stop looking (error would be after last user input)
        if (entry.type === 'user') break;

        // ONLY check system messages for errors - these are actual CLI errors
        if (entry.type === 'system' && entry.message) {
          const msg = typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message);
          for (const { pattern, message } of errorPatterns) {
            if (pattern.test(msg)) {
              return message;
            }
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

interface RateLimitInfo {
  isRateLimited: boolean;
  resetAt?: number; // Estimated reset timestamp
  message?: string; // The rate limit message
}

/**
 * Check if a transcript shows rate limiting
 * Looks for common rate limit patterns in recent messages
 */
function checkRateLimit(transcriptPath: string): RateLimitInfo | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Rate limit patterns to detect
    const rateLimitPatterns = [
      /you['']ve hit your (usage |rate )?limit/i,
      /rate limit(ed| exceeded)/i,
      /too many requests/i,
      /please (wait|try again)/i,
      /quota exceeded/i,
      /overloaded/i,
      /capacity/i,
      /429/i, // HTTP 429 Too Many Requests
    ];

    // Time patterns to extract reset time (e.g., "try again in 5 minutes", "resets at 2:00 PM", "resets 8pm")
    const timePatterns = [
      /(?:in|after)\s+(\d+)\s*(minute|min|second|sec|hour|hr)s?/i,
      /(?:at|around)\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /resets?\s+(\d{1,2})\s*(am|pm)/i, // "resets 8pm" format (no colon)
      /(?:reset|available|ready)\s+(?:in|at)\s+(.+?)(?:\.|$)/i,
    ];

    // Check last 15 lines for rate limit messages
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
      try {
        const entry = JSON.parse(lines[i]) as TranscriptEntry;

        // Check system messages (API errors often come as system messages)
        if (entry.type === 'system' && entry.message) {
          const msg = typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message);
          for (const pattern of rateLimitPatterns) {
            if (pattern.test(msg)) {
              return parseRateLimitMessage(msg, timePatterns);
            }
          }
        }

        // Check assistant messages for rate limit errors
        if (entry.type === 'assistant' && entry.message?.content) {
          const content = entry.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                for (const pattern of rateLimitPatterns) {
                  if (pattern.test(block.text)) {
                    return parseRateLimitMessage(block.text, timePatterns);
                  }
                }
              }
            }
          }
        }

        // If we find a user message, stop looking (rate limit would be after last user input)
        if (entry.type === 'user') break;
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Parse rate limit message to extract reset time
 */
function parseRateLimitMessage(msg: string, timePatterns: RegExp[]): RateLimitInfo {
  const now = Date.now();
  let resetAt: number | undefined;

  // Try to extract time information
  for (const pattern of timePatterns) {
    const match = msg.match(pattern);
    if (match) {
      // "in X minutes/hours"
      if (match[2]) {
        const amount = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit.startsWith('min')) {
          resetAt = now + amount * 60 * 1000;
          break;
        } else if (unit.startsWith('sec')) {
          resetAt = now + amount * 1000;
          break;
        } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
          resetAt = now + amount * 60 * 60 * 1000;
          break;
        }
        // "resets 8pm" format - match[1] is hour, match[2] is am/pm
        if (unit === 'am' || unit === 'pm') {
          let hours = amount;
          if (unit === 'pm' && hours < 12) hours += 12;
          if (unit === 'am' && hours === 12) hours = 0;

          const resetDate = new Date();
          resetDate.setHours(hours, 0, 0, 0);
          if (resetDate.getTime() < now) {
            resetDate.setDate(resetDate.getDate() + 1);
          }
          resetAt = resetDate.getTime();
          break;
        }
      }
      // "at X:XX PM"
      if (match[1] && match[2] && !match[2].includes(':') && match[3]) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        if (match[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (match[3]?.toLowerCase() === 'am' && hours === 12) hours = 0;

        const resetDate = new Date();
        resetDate.setHours(hours, minutes, 0, 0);
        if (resetDate.getTime() < now) {
          // If the time is in the past, assume it's tomorrow
          resetDate.setDate(resetDate.getDate() + 1);
        }
        resetAt = resetDate.getTime();
        break;
      }
    }
  }

  // Default to 5 minutes if no time found
  if (!resetAt) {
    resetAt = now + 5 * 60 * 1000;
  }

  return {
    isRateLimited: true,
    resetAt,
    message: msg.slice(0, 100),
  };
}

interface ServerRunningInfo {
  isServer: boolean;
  serverType?: string; // 'dev', 'web', 'api', etc.
  port?: number;
}

/**
 * Check if a transcript shows a running server/daemon
 * Looks for patterns indicating long-running processes
 */
function checkServerRunning(transcriptPath: string): ServerRunningInfo | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Server command patterns
    const serverCommandPatterns = [
      /\bnpm run (dev|start|serve)\b/i,
      /\bnpx (vite|next|create-react-app)\b/i,
      /\bnode\s+[\w./]+server/i,
      /\bpython\s+-m\s+(flask|uvicorn|http\.server)/i,
      /\bcargo run\b/i,
      /\bgo run\b.*server/i,
      /\bdocker(-compose)?\s+(up|run)/i,
    ];

    // Server running output patterns
    const serverOutputPatterns = [
      { pattern: /listening on (?:port\s+)?(\d+)/i, type: 'web' },
      { pattern: /server (?:is )?(?:running|started|listening)/i, type: 'web' },
      { pattern: /local:\s+https?:\/\/localhost[:\d]*/i, type: 'dev' },
      { pattern: /network:\s+https?:\/\//i, type: 'dev' },
      { pattern: /ready in \d+(?:ms|s)/i, type: 'dev' },
      { pattern: /vite.*ready/i, type: 'dev' },
      { pattern: /next\.js.*ready/i, type: 'dev' },
      { pattern: /started (?:development )?server/i, type: 'dev' },
    ];

    // Check last 30 lines for server indicators
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
      try {
        const entry = JSON.parse(lines[i]) as TranscriptEntry;

        // Check for Bash commands that start servers
        if (entry.type === 'assistant' && entry.message?.content) {
          const msgContent = entry.message.content;
          if (Array.isArray(msgContent)) {
            for (const block of msgContent) {
              if (block.type === 'tool_use' && block.name === 'Bash' && block.input?.command) {
                const cmd = block.input.command;
                for (const pattern of serverCommandPatterns) {
                  if (pattern.test(cmd)) {
                    // Check if it's a background task
                    if (block.input.run_in_background) {
                      return { isServer: true, serverType: 'dev' };
                    }
                  }
                }
              }
            }
          }
        }

        // Check for server output in tool results or system messages
        if (entry.type === 'system' && entry.message) {
          const msg = typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message);
          for (const { pattern, type } of serverOutputPatterns) {
            const match = msg.match(pattern);
            if (match) {
              const port = msg.match(/:\s*(\d{4,5})\b/)?.[1];
              return {
                isServer: true,
                serverType: type,
                port: port ? parseInt(port, 10) : undefined,
              };
            }
          }
        }

        // If we find user input, stop looking (server would have started before)
        if (entry.type === 'user') break;
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

interface ActivityResult {
  activity: string;
  lineNumber: number;
}

/**
 * Extract current activity from a transcript (most recent meaningful action)
 * Looks for: TodoWrite in_progress items, recent tool calls, assistant text, etc.
 * Returns both the activity text AND the line number for navigation.
 */
function extractCurrentActivity(transcriptPath: string): ActivityResult | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    let lastAssistantText: string | null = null;
    let lastAssistantLine: number | null = null;

    // Read from end to find recent assistant messages
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
      try {
        const entry = JSON.parse(lines[i]) as TranscriptEntry;

        if (entry.type === 'assistant' && entry.message?.content) {
          const msgContent = entry.message.content;
          if (!Array.isArray(msgContent)) continue;

          // Line numbers are 1-indexed for VS Code
          const lineNumber = i + 1;

          // Look for tool calls in this message
          for (const block of msgContent) {
            // Detect thinking blocks - show the stream of thought
            if (block.type === 'thinking' && block.thinking) {
              // Get the last few meaningful lines (most recent thought)
              const thinkingLines = block.thinking.trim().split('\n').filter((l: string) => l.trim());
              if (thinkingLines.length > 0) {
                // Show last meaningful line (most recent thought), limited to reasonable length
                const lastLine = thinkingLines[thinkingLines.length - 1].slice(0, 120);
                return { activity: `💭 ${lastLine}`, lineNumber };
              }
              return { activity: '💭 Thinking...', lineNumber };
            }

            // Capture text blocks as fallback (first one found from end)
            if (block.type === 'text' && block.text && !lastAssistantText) {
              // Get first meaningful line of text (skip empty lines)
              const textLines = block.text.trim().split('\n').filter((l: string) => l.trim());
              if (textLines.length > 0) {
                lastAssistantText = textLines[0].slice(0, 100);
                lastAssistantLine = lineNumber;
              }
            }

            if (block.type !== 'tool_use' || !block.name) continue;

            const input = block.input;
            const toolName = block.name;

            // TodoWrite - get in_progress item
            if (toolName === 'TodoWrite' && input?.todos) {
              const inProgress = input.todos.find((t: { status?: string }) => t.status === 'in_progress');
              if (inProgress?.activeForm) {
                return { activity: inProgress.activeForm, lineNumber };
              }
              if (inProgress?.content) {
                return { activity: inProgress.content, lineNumber };
              }
            }

            // Task - spawning subagent
            if (toolName === 'Task' && input?.description) {
              return { activity: `Delegating: ${input.description}`, lineNumber };
            }

            // Edit/Write - modifying file
            if ((toolName === 'Edit' || toolName === 'Write') && input?.file_path) {
              const fileName = basename(input.file_path);
              return { activity: `Editing ${fileName}`, lineNumber };
            }

            // Read - reading file
            if (toolName === 'Read' && input?.file_path) {
              const fileName = basename(input.file_path);
              return { activity: `Reading ${fileName}`, lineNumber };
            }

            // Bash - running command
            if (toolName === 'Bash') {
              if (input?.description) {
                return { activity: input.description.slice(0, 60), lineNumber };
              }
              if (input?.command) {
                const cmd = input.command.slice(0, 40);
                return { activity: `Running: ${cmd}${input.command.length > 40 ? '...' : ''}`, lineNumber };
              }
            }

            // Grep/Glob - searching
            if (toolName === 'Grep' && input?.pattern) {
              return { activity: `Searching for "${input.pattern.slice(0, 30)}"`, lineNumber };
            }
            if (toolName === 'Glob' && input?.pattern) {
              return { activity: `Finding files: ${input.pattern}`, lineNumber };
            }

            // WebSearch/WebFetch
            if (toolName === 'WebSearch') {
              return { activity: 'Searching the web...', lineNumber };
            }
            if (toolName === 'WebFetch') {
              return { activity: 'Fetching web content...', lineNumber };
            }

            // AskUserQuestion - capture the question being asked
            if (toolName === 'AskUserQuestion' && input?.questions) {
              const questions = input.questions as Array<{ question?: string }>;
              if (questions.length > 0 && questions[0].question) {
                return { activity: questions[0].question.slice(0, 100), lineNumber };
              }
            }
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    // Fallback: return assistant text if no tool activity found
    if (lastAssistantText && lastAssistantLine) {
      return { activity: lastAssistantText, lineNumber: lastAssistantLine };
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Extract task from a transcript (first user message)
 */
function extractTaskFromTranscript(transcriptPath: string): string | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Look for the first user message which contains the task
    for (const line of lines.slice(0, 15)) {
      try {
        const entry = JSON.parse(line) as TranscriptEntry;
        if (entry.type === 'user' && entry.message?.content) {
          const msgContent = entry.message.content;
          // Content might be string or array
          const text = typeof msgContent === 'string'
            ? msgContent
            : Array.isArray(msgContent)
              ? msgContent.find((b: { type: string; text?: string }) => b.type === 'text')?.text || ''
              : '';
          if (text) {
            // Extract first ~100 chars of the task
            const task = text.slice(0, 100);
            return task.length < text.length ? task + '...' : task;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Extract the most recent user message from a transcript
 */
function extractLastUserMessage(transcriptPath: string): string | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Read from end to find the most recent user message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]) as TranscriptEntry;
        if (entry.type === 'user' && entry.message?.content) {
          const msgContent = entry.message.content;
          // Content might be string or array
          const text = typeof msgContent === 'string'
            ? msgContent
            : Array.isArray(msgContent)
              ? msgContent.find((b: { type: string; text?: string }) => b.type === 'text')?.text || ''
              : '';
          if (text) {
            // Truncate to 100 chars
            const truncated = text.slice(0, 100);
            return truncated.length < text.length ? truncated + '...' : truncated;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

/**
 * Check all active sessions for pending AskUserQuestion calls
 * Also updates tasks and current activity for sessions
 * Returns the number of sessions that were updated
 */
export function checkPendingQuestions(): number {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    return 0;
  }

  let updatedCount = 0;
  const now = Date.now();

  try {
    const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);

    for (const dirName of projectDirs) {
      const projectDir = join(CLAUDE_PROJECTS_DIR, dirName);

      try {
        if (!statSync(projectDir).isDirectory()) continue;
      } catch (e) {
        continue;
      }

      // MULTIPLE CONDUCTORS: Find ALL active transcripts in this project
      const transcriptPaths = findActiveTranscripts(projectDir);
      if (transcriptPaths.length === 0) continue;

      // Process each active transcript (each represents a Claude Code session)
      for (const transcriptPath of transcriptPaths) {
        try {
          // Parse transcript to get session info (reads cwd from transcript, not path decoding)
          const info = parseTranscript(transcriptPath);
          if (!info) continue;

          const { sessionId, cwd } = info;
          const projectName = projectNameFromPath(cwd);

          // Register session if it doesn't exist yet
          // This catches sessions that started after Argus or where hooks didn't fire
          const existingProject = state.getProject(cwd);
          if (!existingProject) {
            const task = extractTaskFromTranscript(transcriptPath);
            state.onSessionStart(sessionId, cwd, projectName, task ?? undefined);
            updatedCount++;
          } else {
            // Check if this specific session is registered
            const agents = existingProject.agents as Map<string, unknown>;
            if (!agents.has(sessionId)) {
              // New session in existing project - register it!
              const task = extractTaskFromTranscript(transcriptPath);
              state.onSessionStart(sessionId, cwd, projectName, task ?? undefined);
              updatedCount++;
            } else {
              // Try to extract and update task for sessions missing it
              const task = extractTaskFromTranscript(transcriptPath);
              if (task) {
                state.updateSessionTask(sessionId, cwd, task);
              }
            }
          }

          // Extract current activity (what they're doing now)
          const activityResult = extractCurrentActivity(transcriptPath);
          if (activityResult) {
            const activityChanged = state.updateCurrentActivity(
              sessionId,
              cwd,
              activityResult.activity,
              transcriptPath,
              activityResult.lineNumber
            );
            if (activityChanged) updatedCount++;
          }

          // Extract last user message (per-project, not per-session)
          const lastUserMessage = extractLastUserMessage(transcriptPath);
          if (lastUserMessage) {
            const messageChanged = state.updateLastUserMessage(cwd, lastUserMessage);
            if (messageChanged) updatedCount++;
          }

          const pendingQuestion = checkPendingAskUserQuestion(transcriptPath);
          if (pendingQuestion) {
            // Update the agent to blocked status, preserving what they were doing
            state.onAgentBlocked(sessionId, cwd, projectName, pendingQuestion, activityResult?.activity);
            updatedCount++;
          } else {
            // Check for system errors (like "Prompt is too long") that require user action
            const systemError = checkSystemError(transcriptPath);
            if (systemError) {
              // System error is a blocking state - user needs to take action
              state.onAgentBlocked(sessionId, cwd, projectName, systemError, activityResult?.activity);
              updatedCount++;
            } else {
            // Check for rate limit BEFORE checking for unblock
            const rateLimitInfo = checkRateLimit(transcriptPath);
            if (rateLimitInfo?.isRateLimited) {
              // Agent is rate limited - calm "waiting for quota" state
              state.onAgentRateLimited(sessionId, cwd, projectName, rateLimitInfo.resetAt, rateLimitInfo.message);
              updatedCount++;
            } else {
              // Check for server running
              const serverInfo = checkServerRunning(transcriptPath);
              if (serverInfo?.isServer) {
                // Agent is running a server - calm ambient state
                state.onAgentServerRunning(sessionId, cwd, projectName, serverInfo.serverType, serverInfo.port);
                updatedCount++;
              } else {
                // No pending question, no rate limit, no server - check if we should unblock
                // This handles the case where a question was answered but hooks didn't fire
                const project = state.getProject(cwd);
                if (project) {
                  const agents = project.agents as Map<string, { status: string }>;
                  const agent = agents.get(sessionId);
                  if (agent && (agent.status === 'blocked' || agent.status === 'rate_limited' || agent.status === 'server_running')) {
                    // Agent was in special state but no longer - return to working
                    state.onAgentUnblocked(sessionId, cwd, projectName);
                    updatedCount++;
                  }
                }
              }
            }
            }
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return updatedCount;
}

/**
 * Discover and register existing Claude sessions
 */
export function discoverExistingSessions(): number {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.log('[Argus] No Claude projects directory found');
    return 0;
  }

  let discoveredCount = 0;

  try {
    const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);

    for (const dirName of projectDirs) {
      const projectDir = join(CLAUDE_PROJECTS_DIR, dirName);

      // Skip if not a directory
      try {
        if (!statSync(projectDir).isDirectory()) continue;
      } catch (e) {
        continue;
      }

      // MULTIPLE CONDUCTORS: Find ALL active transcripts in this project
      const transcriptPaths = findActiveTranscripts(projectDir);

      for (const transcriptPath of transcriptPaths) {
        const info = parseTranscript(transcriptPath);

        if (info) {
          const projectName = projectNameFromPath(info.cwd);

          // Register this session
          console.log(`[Argus] Discovered active session: ${projectName} (${info.sessionId.slice(0, 8)}...)`);

          state.onSessionStart(info.sessionId, info.cwd, projectName);
          discoveredCount++;
        }
      }
    }
  } catch (e) {
    console.error('[Argus] Error discovering sessions:', e);
  }

  return discoveredCount;
}
