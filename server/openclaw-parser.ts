/**
 * OpenClaw JSONL Parser
 *
 * Normalizes OpenClaw transcript entries to Claude Code format so existing parsing logic can reuse them.
 */

export interface OpenClawEntry {
  type: 'session' | 'message' | 'model_change' | 'thinking_level_change' | 'custom';
  id: string;
  parentId?: string | null;
  timestamp: string;
  message?: {
    role: 'user' | 'assistant' | 'toolResult';
    content: Array<{
      type: 'text' | 'thinking' | 'toolCall';
      text?: string;
      thinking?: string;
      thinkingSignature?: string;
      id?: string;
      name?: string;
      arguments?: Record<string, unknown>;
      toolCallId?: string;
      toolName?: string;
    }>;
  };
  cwd?: string;
  customType?: string;
  data?: unknown;
}

// Normalize to match Claude Code transcript entry shape
export interface NormalizedEntry {
  type: 'user' | 'assistant' | 'system';
  message?: {
    content?: string | Array<{
      type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
      text?: string;
      thinking?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      content?: string | Array<{ type: string; text?: string }>;
    }>;
  };
  cwd?: string;
}

/**
 * Convert OpenClaw entry to Claude Code format
 * This allows reusing existing extractCurrentActivity(), extractTodos(), etc.
 */
export function normalizeOpenClawEntry(raw: unknown): NormalizedEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as OpenClawEntry;

  // Session start — extract cwd
  if (entry.type === 'session' && entry.cwd) {
    return {
      type: 'system',
      cwd: entry.cwd,
    };
  }

  // Message entries
  if (entry.type === 'message' && entry.message) {
    const { role, content } = entry.message;

    // Map toolResult to system (we don't need tool results for activity extraction)
    const mappedRole = role === 'toolResult' ? 'system' : role;

    // Convert content blocks from OpenClaw format to Claude Code format
    const normalizedContent = content.map((block) => {
      // Thinking blocks
      if (block.type === 'thinking') {
        return {
          type: 'thinking' as const,
          thinking: block.thinking,
        };
      }

      // Tool calls (OpenClaw: toolCall → Claude Code: tool_use)
      if (block.type === 'toolCall') {
        return {
          type: 'tool_use' as const,
          name: block.name,
          input: block.arguments,
        };
      }

      // Text blocks
      if (block.type === 'text') {
        return {
          type: 'text' as const,
          text: block.text,
        };
      }

      // Pass through unknown blocks as-is
      return block;
    });

    return {
      type: mappedRole as 'user' | 'assistant' | 'system',
      message: {
        content: normalizedContent as NormalizedEntry['message']['content'],
      },
    };
  }

  // Ignore other entry types (model_change, thinking_level_change, custom)
  return null;
}
