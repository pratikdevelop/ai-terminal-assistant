import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CHAT_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.local-ai-chat'
);

if (!fs.existsSync(CHAT_DIR)) {
  fs.mkdirSync(CHAT_DIR, { recursive: true });
}

export let MODEL_NAME = process.env.OLLAMA_MODEL || 'gemma3'; // will be changeable
export let currentTemperature = 0.7;
export let isCodingMode = false;

export const MAX_HISTORY = 30;

export const SYSTEM_PROMPT_DEFAULT = 'You are a helpful, clear and concise assistant.';

export const SYSTEM_PROMPT_CODING =
  'You are an expert programmer. Always respond with clean, well-commented code when appropriate.';

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';