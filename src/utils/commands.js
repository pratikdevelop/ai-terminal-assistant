import chalk from 'chalk';
import { MODEL_NAME, currentTemperature, isCodingMode, SYSTEM_PROMPT_DEFAULT, SYSTEM_PROMPT_CODING } from '../config.js';
import { saveChat, loadChat } from './history.js';

export function printHelp() {
  console.log(chalk.cyan(`
Commands:
  /clear          → Clear conversation
  /save [name]    → Save chat (default: conversation)
  /load [name]    → Load chat
  /model <name>   → Change model (e.g. /model llama3.2)
  /temp <0-2>     → Change temperature
  /code           → Toggle coding assistant mode
  /multi          → Enter multi-line mode (type /end to send)
  /help           → Show this help
  exit / bye      → Exit
  `));
}

export function handleCommand(input, history, state) {
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
    saveChat(history, name);
    return { action: 'continue' };
  }

  if (lower.startsWith('/load')) {
    const name = input.split(' ').slice(1).join(' ').trim() || 'conversation';
    loadChat(history, name);
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

  return { action: 'none' };
}