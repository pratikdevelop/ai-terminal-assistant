#!/usr/bin/env node

import { program } from 'commander';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import fetch from 'node-fetch'; // ← add to dependencies: npm install node-fetch

import {
  OLLAMA_BASE_URL,
  MODEL_NAME as  defaultModel,
  currentTemperature as  defaultTemp,
  MAX_HISTORY,
  SYSTEM_PROMPT_DEFAULT,
} from './config.js';
import { copyToClipboard } from './utils/clipboard.js';
import { highlightCode } from './utils/highlight.js';
import { handleCommand } from './utils/commands.js';

// ─── OpenAI Client ────────────────────────────────────────────────────────
const openai = new OpenAI({
  baseURL: OLLAMA_BASE_URL,
  apiKey: 'ollama', // dummy value
});

// ─── Interactive Chat Mode ────────────────────────────────────────────────
async function runInteractiveChat(options) {
  const rl = readline.createInterface({ input, output });

  let history = [{ role: 'system', content: SYSTEM_PROMPT_DEFAULT }];
  let multiLineMode = false;
  let multiLineBuffer = [];

  const state = {
    MODEL_NAME: options.model || defaultModel,
    currentTemperature: parseFloat(options.temp) || defaultTemp,
    isCodingMode: options.code || false,
  };

  // Update system prompt if coding mode
  if (state.isCodingMode) {
    history[0].content =
      'You are an expert programmer. Always respond with clean, well-commented code when appropriate.';
  }

  // Welcome banner
  console.log(chalk.bold.blue('┌──────────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.blue('│             🚀 LOCAL AI CHAT – Developer Edition             │'));
  console.log(chalk.bold.blue('│  Type /help for commands   •   Ctrl+C to exit               │'));
  console.log(chalk.bold.blue('└──────────────────────────────────────────────────────────────┘\n'));

  console.log(
    chalk.yellow('Tip: ') +
      chalk.cyan(`ollama pull ${state.MODEL_NAME}`) +
      chalk.yellow(' if model is missing\n')
  );

  while (true) {
    // ─── Status line ────────────────────────────────────────────────────
    const ctxEstimate = Math.min(history.length * 4, 32000); // very rough
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      chalk.cyan('Model: ') +
        chalk.white(state.MODEL_NAME) +
        chalk.gray('  |  ') +
        chalk.cyan('Temp: ') +
        chalk.white(state.currentTemperature.toFixed(2)) +
        chalk.gray('  |  ') +
        chalk.cyan('Mode: ') +
        (state.isCodingMode ? chalk.green('coding') : chalk.yellow('normal')) +
        chalk.gray(`  |  ctx ~${ctxEstimate.toLocaleString()} tok`)
    );
    console.log(chalk.dim('─'.repeat(60)));

    let promptSymbol = multiLineMode ? chalk.gray('... ') : chalk.bold('You: ');
    let userInput = await rl.question(promptSymbol);

    userInput = userInput.trim();
    if (!userInput) continue;

    // Multi-line handling
    if (multiLineMode) {
      if (userInput.toLowerCase() === '/end') {
        multiLineMode = false;
        userInput = multiLineBuffer.join('\n');
        multiLineBuffer = [];
        console.log(chalk.gray('Multi-line input sent.\n'));
      } else {
        multiLineBuffer.push(userInput);
        continue;
      }
    } else if (userInput.toLowerCase() === '/multi') {
      multiLineMode = true;
      console.log(chalk.cyan('Multi-line mode → type /end when finished\n'));
      continue;
    }

    // Command handling
    const cmdResult = handleCommand(userInput, history, state);
    if (cmdResult?.action === 'exit') {
      console.log(chalk.green('\nGoodbye! 👋\n'));
      break;
    }
    if (cmdResult?.action === 'continue') {
      continue;
    }

    console.log('');

    try {
      history.push({ role: 'user', content: userInput });

      // Keep context length reasonable
      if (history.length > MAX_HISTORY) {
        history.splice(1, history.length - MAX_HISTORY);
      }

      process.stdout.write(chalk.bold.cyan('AI  : '));

      const stream = await openai.chat.completions.create({
        model: state.MODEL_NAME,
        messages: history,
        temperature: state.currentTemperature,
        max_tokens: 4096,
        stream: true,
      });

      let fullAnswer = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          process.stdout.write(delta);
          fullAnswer += delta;
        }
      }

      console.log('\n');

      const highlighted = highlightCode(fullAnswer);
      console.log(highlighted);
      console.log(chalk.gray('─'.repeat(60) + '\n'));

      history.push({ role: 'assistant', content: fullAnswer });

      await copyToClipboard(fullAnswer);
    } catch (err) {
      console.error(chalk.red('\nError:'), err.message);
      if (err.message.includes('model') || err.message.includes('not found')) {
        console.log(
          chalk.yellow(`\nTip:  ollama pull ${state.MODEL_NAME}\n`) +
            chalk.gray('      or use /model <name> to switch\n')
        );
      }
    }
  }

  rl.close();
}

// ─── List Models Command ──────────────────────────────────────────────────
async function listOllamaModels() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL.replace(/\/v1$/, '')}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { models } = await res.json();

    if (!models?.length) {
      console.log(chalk.yellow('No models found. Pull one with: ollama pull llama3.2'));
      return;
    }

    console.log(chalk.bold('\nInstalled Ollama Models:\n'));
    console.table(
      models.map((m) => ({
        name: m.name,
        size: (m.size / 1e9).toFixed(1) + ' GB',
        modified: new Date(m.modified_at).toLocaleString(),
        quantization: m.details?.quantization_level || '—',
      }))
    );
  } catch (err) {
    console.error(
      chalk.red('Failed to list models:'),
      err.message,
      chalk.gray('\nIs Ollama running on ' + OLLAMA_BASE_URL + ' ?')
    );
  }
}

// ─── Commander Setup ──────────────────────────────────────────────────────
program
  .name('local-ai-chat')
  .description('Powerful local LLM chat CLI for developers')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat session (default)')
  .option('--model <name>', 'Model name', defaultModel)
  .option('--temp <number>', 'Temperature (0.0–2.0)', '0.7')
  .option('--code', 'Start in coding mode', false)
  .action((options) => {
    runInteractiveChat(options);
  });

program
  .command('list-models')
  .description('List all installed Ollama models')
  .action(listOllamaModels);

// Default: run chat if no command is given
if (!process.argv.slice(2).length) {
  program.parse(['', '', 'chat']);
} else {
  program.parse();
}