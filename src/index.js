#!/usr/bin/env node

import { program } from 'commander';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { encode } from 'gpt-tokenizer';
import ora from 'ora';

import {
  OLLAMA_BASE_URL,
  MODEL_NAME as defaultModel,
  currentTemperature as defaultTemp,
  SYSTEM_PROMPT_DEFAULT,
} from './config.js';
import { copyToClipboard } from './utils/clipboard.js';
import { handleCommand } from './utils/commands.js';
import { openEditorForInput } from './utils/editor.js';

// ─── OpenAI Client ────────────────────────────────────────────────────────
const openai = new OpenAI({
  baseURL: OLLAMA_BASE_URL,
  apiKey: 'ollama', // dummy value
});

async function checkOllamaConnection() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL.replace(/\/v1$/, '')}/api/tags`);
    if (!res.ok) throw new Error();
    return true;
  } catch {
    return false;
  }
}

function estimateTokens(history) {
  let count = 0;
  for (const msg of history) {
    count += encode(msg.content || '').length;
  }
  return count;
}

// ─── Interactive Chat Mode ────────────────────────────────────────────────
async function runInteractiveChat(options) {
  const isOllamaRunning = await checkOllamaConnection();
  if (!isOllamaRunning) {
    console.log(chalk.red('\n✗ Error: Ollama daemon is not responding.'));
    console.log(chalk.yellow(`Please start Ollama at ${OLLAMA_BASE_URL} before using the chat.\n`));
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });
  let isGenerating = false;
  let abortController = null;

  rl.on('SIGINT', () => {
    if (isGenerating && abortController) {
      abortController.abort();
    } else {
      console.log(chalk.green('\nGoodbye! 👋\n'));
      process.exit(0);
    }
  });

  let history = [{ role: 'system', content: SYSTEM_PROMPT_DEFAULT }];
  let multiLineMode = false;
  let multiLineBuffer = [];

  const state = {
    MODEL_NAME: options.model || defaultModel,
    currentTemperature: parseFloat(options.temp) || defaultTemp,
    isCodingMode: options.code || false,
  };

  if (state.isCodingMode) {
    history[0].content =
      'You are an expert programmer. Always respond with clean, well-commented code when appropriate.';
  }

  console.log(chalk.bold.blue('┌──────────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold.blue('│             🚀 LOCAL AI CHAT – Developer Edition             │'));
  console.log(chalk.bold.blue('│  Type /help for commands   •   Ctrl+C to abort/exit         │'));
  console.log(chalk.bold.blue('└──────────────────────────────────────────────────────────────┘\n'));

  console.log(
    chalk.yellow('Tip: ') +
      chalk.cyan(`ollama pull ${state.MODEL_NAME}`) +
      chalk.yellow(' if model is missing\n')
  );

  while (true) {
    // Dynamically manage context window (arbitrarily keeping it under 30k tokens for local LLMs)
    while (history.length > 2 && estimateTokens(history) > 30000) {
      history.splice(1, 1); // remove oldest non-system message
    }

    const ctxEstimate = estimateTokens(history);
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
        chalk.gray(`  |  ctx ~${ctxEstimate} tok`)
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
    const cmdResult = await handleCommand(userInput, history, state);
    if (cmdResult?.action === 'exit') {
      console.log(chalk.green('\nGoodbye! 👋\n'));
      break;
    }
    if (cmdResult?.action === 'load') {
      history = cmdResult.history;
      continue;
    }
    if (cmdResult?.action === 'read') {
      userInput = cmdResult.content;
      console.log(chalk.cyan('File context loaded.\n'));
    } else if (cmdResult?.action === 'editor') {
      const editorContent = openEditorForInput();
      if (!editorContent) {
        console.log(chalk.gray('Editor closed with no content.\n'));
        continue;
      }
      userInput = editorContent;
      console.log(chalk.cyan('Loaded input from editor.\n'));
    } else if (cmdResult?.action === 'continue') {
      continue;
    }

    console.log('');

    let spinner;

    try {
      history.push({ role: 'user', content: userInput });

      abortController = new AbortController();
      isGenerating = true;

      spinner = ora('Thinking...').start();

      const stream = await openai.chat.completions.create({
        model: state.MODEL_NAME,
        messages: history,
        temperature: state.currentTemperature,
        max_tokens: 4096,
        stream: true,
      }, { signal: abortController.signal });

      let fullAnswer = '';
      let firstChunk = true;

      for await (const chunk of stream) {
        if (firstChunk) {
          spinner.stop();
          process.stdout.write(chalk.bold.cyan('AI  : '));
          firstChunk = false;
        }
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          process.stdout.write(delta);
          fullAnswer += delta;
        }
      }

      if (firstChunk) {
        // stream ended without any chunks
        spinner.stop();
        process.stdout.write(chalk.bold.cyan('AI  : '));
      }

      console.log('\n');

      history.push({ role: 'assistant', content: fullAnswer });
      await copyToClipboard(fullAnswer);

    } catch (err) {
      if (spinner && spinner.isSpinning) spinner.stop();
      
      if (err.name === 'AbortError') {
        console.log(chalk.yellow('\n[Generation aborted by user]\n'));
        // Prune the user's latest query so it doesn't get stuck in context without an answer
        history.pop();
      } else {
        console.error(chalk.red('\nError:'), err.message);
        if (err.message.includes('model') || err.message.includes('not found')) {
          console.log(
            chalk.yellow(`\nTip:  ollama pull ${state.MODEL_NAME}\n`) +
              chalk.gray('      or use /model <name> to switch\n')
          );
        }
      }
    } finally {
      isGenerating = false;
      abortController = null;
    }
  }

  rl.close();
  process.exit(0);
}

// ─── List Models Command ──────────────────────────────────────────────────
async function listOllamaModels() {
  try {
    const res = await checkOllamaConnection();
    if (!res) throw new Error(`Ollama daemon on ${OLLAMA_BASE_URL} is not responding.`);
    
    const tagsRes = await fetch(`${OLLAMA_BASE_URL.replace(/\/v1$/, '')}/api/tags`);
    const { models } = await tagsRes.json();

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
      err.message
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