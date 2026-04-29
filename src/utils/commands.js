import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { MODEL_NAME, currentTemperature, isCodingMode, SYSTEM_PROMPT_DEFAULT, SYSTEM_PROMPT_CODING } from '../config.js';
import { saveChat, loadChat, listChats } from './history.js';

export function printHelp() {
  console.log(chalk.cyan(`
Commands:
  /clear          → Clear conversation
  /save [name]    → Save chat (default: conversation)
  /load [name]    → Load chat
  /chats          → List all saved chats
  /read <file>    → Read a local file and attach it to the prompt
  /system <msg>   → Change system instructions (prompt)
  /model <name>   → Change model (e.g. /model llama3.2)
  /temp <0-2>     → Change temperature
  /code           → Toggle coding assistant mode
  /multi          → Enter multi-line mode (type /end to send)
  /editor         → Open external editor to write long prompt
  /help           → Show this help
  exit / bye      → Exit
  `));
}

export async function handleCommand(input, history, state) {
  const lower = input.toLowerCase().trim();

  if (['exit', 'quit', 'bye'].includes(lower)) {
    return { action: 'exit' };
  }

  if (lower === '/clear') {
    history.length = 1; // keep system prompt
    console.log(chalk.green('Conversation cleared.\n'));
    return { action: 'continue' };
  }

  if (lower === '/help') {
    printHelp();
    return { action: 'continue' };
  }

  if (lower.startsWith('/save')) {
    const name = input.split(' ').slice(1).join(' ').trim() || 'conversation';
    await saveChat(history, name);
    return { action: 'continue' };
  }

  if (lower.startsWith('/load')) {
    const name = input.split(' ').slice(1).join(' ').trim() || 'conversation';
    const newHistory = await loadChat(name);
    if (newHistory) {
      return { action: 'load', history: newHistory };
    }
    return { action: 'continue' };
  }

  if (lower === '/chats') {
    const chats = await listChats();
    if (chats.length === 0) {
      console.log(chalk.yellow('No saved chats found.\n'));
    } else {
      console.log(chalk.cyan('\nSaved chats:'));
      chats.forEach(c => console.log('  • ' + c));
      console.log('');
    }
    return { action: 'continue' };
  }

  if (lower.startsWith('/read ')) {
    const relativePath = input.slice(6).trim();
    if (!relativePath) {
      console.log(chalk.red('Please provide a file path. Usage: /read <filepath>\n'));
      return { action: 'continue' };
    }
    try {
      const fullPath = path.resolve(process.cwd(), relativePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      const fileExt = path.extname(fullPath).slice(1) || 'text';
      const formattedInput = `Here is the content of the file "${relativePath}":\n\n\`\`\`${fileExt}\n${content}\n\`\`\`\n`;
      
      console.log(chalk.green(`✓ Successfully loaded ${relativePath} (${content.length} characters) into context.`));
      return { action: 'read', content: formattedInput };
    } catch (err) {
      console.log(chalk.red(`✗ Failed to read file: ${err.message}\n`));
      return { action: 'continue' };
    }
  }

  if (lower.startsWith('/system ')) {
    const newSystemPrompt = input.slice(8).trim();
    if (newSystemPrompt) {
      history[0].content = newSystemPrompt;
      console.log(chalk.green(`✓ System prompt updated.\n`));
    } else {
      console.log(chalk.red('Please provide a prompt. Usage: /system <prompt>\n'));
    }
    return { action: 'continue' };
  }

  if (lower.startsWith('/model ')) {
    const newModel = input.slice(7).trim();
    if (newModel) {
      state.MODEL_NAME = newModel;
      console.log(chalk.green(`Model switched to: ${newModel}\n`));
    }
    return { action: 'continue' };
  }

  if (lower === '/code') {
    state.isCodingMode = !state.isCodingMode;
    history[0].content = state.isCodingMode ? SYSTEM_PROMPT_CODING : SYSTEM_PROMPT_DEFAULT;
    console.log(chalk.green(`Coding mode: ${state.isCodingMode ? 'ON' : 'OFF'}\n`));
    return { action: 'continue' };
  }

  if (lower.startsWith('/temp ')) {
    const val = parseFloat(input.slice(6));
    if (!isNaN(val) && val >= 0 && val <= 2) {
      state.currentTemperature = val;
      console.log(chalk.green(`Temperature set to ${val}\n`));
    }
    return { action: 'continue' };
  }

  if (lower === '/editor' || lower === '/edit') {
    return { action: 'editor' };
  }

  return { action: 'none' };
}