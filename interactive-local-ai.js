  // interactive-local-ai.js
  // Ultimate version: history, streaming, save/load, syntax highlighting,
  // multi-line input, dynamic model switching, coding mode, clipboard

  import OpenAI from 'openai';
  import * as readline from 'node:readline/promises';
  import { stdin as input, stdout as output } from 'node:process';
  import clipboard from 'clipboardy';
  import chalk from 'chalk';
  import fs from 'fs';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const CHAT_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.local-ai-chat');
  if (!fs.existsSync(CHAT_DIR)) fs.mkdirSync(CHAT_DIR, { recursive: true });

  // ─── Configuration ────────────────────────────────────────────────────
  const openai = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
  });

  let MODEL_NAME = process.env.OLLAMA_MODEL || 'gemma3';
  let currentTemperature = 0.7;
  let isCodingMode = false;

  const MAX_HISTORY = 30;

  // ─── State ────────────────────────────────────────────────────────────
  let history = [
    { role: 'system', content: 'You are a helpful, clear and concise assistant.' }
  ];

  // ─── Utils ────────────────────────────────────────────────────────────
  function getChatFile(filename) {
    return path.join(CHAT_DIR, `${filename}.json`);
  }

  function saveChat(filename) {
    const file = getChatFile(filename);
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
    console.log(chalk.green(`✓ Saved to: ${filename}.json`));
  }

  function loadChat(filename) {
    const file = getChatFile(filename);
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`✗ File not found: ${filename}`));
      return false;
    }
    history = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(chalk.green(`✓ Loaded: ${filename}.json`));
    return true;
  }

  function highlightCode(text) {
    return text.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
      const highlighted = chalk.cyan(code.trim());
      return `\n${chalk.bold.magenta('```' + (lang || ''))}\n${highlighted}\n${chalk.bold.magenta('```')}\n`;
    });
  }

  // ─── Readline ─────────────────────────────────────────────────────────
  const rl = readline.createInterface({ input, output });

  let multiLineMode = false;
  let multiLineBuffer = [];

  async function askQuestion(prompt = 'You: ') {
    return await rl.question(prompt);
  }

  // ─── Help ─────────────────────────────────────────────────────────────
  function printHelp() {
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

  // ─── Main Loop ────────────────────────────────────────────────────────
  async function main() {
    console.log(chalk.bold.blue('┌──────────────────────────────────────────────────────┐'));
    console.log(chalk.bold.blue('│          🚀 LOCAL AI CHAT – Ultimate Edition         │'));
    console.log(chalk.bold.blue(`│  Model: ${MODEL_NAME.padEnd(45)} │`));
    console.log(chalk.bold.blue('│  Type /help for commands                             │'));
    console.log(chalk.bold.blue('└──────────────────────────────────────────────────────┘\n'));

    console.log(chalk.yellow('Tip: Pull model if needed → ') + chalk.cyan(`docker exec -it ollama-server ollama pull ${MODEL_NAME}`) + '\n');

    while (true) {
      let userInput = '';

      if (multiLineMode) {
        userInput = await askQuestion(chalk.gray('... (multi-line) '));
      } else {
        userInput = await askQuestion(chalk.bold('You: '));
      }

      userInput = userInput.trim();

      if (!userInput) continue;

      // ─── Multi-line handling ───────────────────────────────────────
      if (multiLineMode) {
        if (userInput === '/end') {
          multiLineMode = false;
          userInput = multiLineBuffer.join('\n');
          multiLineBuffer = [];
          console.log(chalk.gray('Multi-line sent.\n'));
        } else {
          multiLineBuffer.push(userInput);
          continue;
        }
      } else if (userInput === '/multi') {
        multiLineMode = true;
        console.log(chalk.cyan('Multi-line mode ON. Type /end when finished.\n'));
        continue;
      }

      const lower = userInput.toLowerCase();

      // ─── Commands ──────────────────────────────────────────────────
      if (['exit', 'quit', 'bye'].includes(lower)) {
        console.log(chalk.green('Goodbye! 👋'));
        break;
      }

      if (lower === '/clear') {
        history = [history[0]];
        console.log(chalk.green('Conversation cleared.\n'));
        continue;
      }

      if (lower === '/help') {
        printHelp();
        continue;
      }

      if (lower.startsWith('/save')) {
        const name = (userInput.split(' ')[1] || 'conversation').trim();
        saveChat(name);
        continue;
      }

      if (lower.startsWith('/load')) {
        const name = (userInput.split(' ')[1] || 'conversation').trim();
        loadChat(name);
        continue;
      }

      if (lower.startsWith('/model ')) {
        const newModel = userInput.slice(7).trim();
        if (newModel) {
          MODEL_NAME = newModel;
          console.log(chalk.green(`Model switched to: ${MODEL_NAME}\n`));
        }
        continue;
      }

      if (lower === '/code') {
        isCodingMode = !isCodingMode;
        history[0].content = isCodingMode
          ? 'You are an expert programmer. Always respond with clean, well-commented code when appropriate.'
          : 'You are a helpful, clear and concise assistant.';
        console.log(chalk.green(`Coding mode: ${isCodingMode ? 'ON' : 'OFF'}\n`));
        continue;
      }

      if (lower.startsWith('/temp ')) {
        const val = parseFloat(userInput.slice(6));
        if (!isNaN(val) && val >= 0 && val <= 2) {
          currentTemperature = val;
          console.log(chalk.green(`Temperature set to ${val}\n`));
        }
        continue;
      }

      // ─── Normal chat ───────────────────────────────────────────────
      console.log('');

      try {
        history.push({ role: 'user', content: userInput });

        // Trim history
        if (history.length > MAX_HISTORY) {
          history = [history[0], ...history.slice(-MAX_HISTORY + 1)];
        }

        process.stdout.write(chalk.bold.cyan('AI : '));

        const stream = await openai.chat.completions.create({
          model: MODEL_NAME,
          messages: history,
          temperature: currentTemperature,
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

        const finalAnswer = highlightCode(fullAnswer);
        console.log(finalAnswer);
        console.log(chalk.gray('──────────────────────────────────────────────────────\n'));

        history.push({ role: 'assistant', content: fullAnswer });

        // Auto copy to clipboard
        try {
          await clipboard.write(fullAnswer);
        } catch {}

      } catch (err) {
        console.error(chalk.red('Error:'), err.message);
        if (err.message.includes('model') || err.message.includes('not found')) {
          console.log(chalk.yellow(`\nTip: docker exec -it ollama-server ollama pull ${MODEL_NAME}\n`));
        }
      }
    }

    rl.close();
  }

  main();