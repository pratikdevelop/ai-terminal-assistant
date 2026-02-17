import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CHAT_DIR } from '../config.js';

export function getChatFile(filename) {
  return path.join(CHAT_DIR, `${filename}.json`);
}

export function saveChat(history, filename = 'conversation') {
  const file = getChatFile(filename);
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
  console.log(chalk.green(`✓ Saved to: ${filename}.json`));
}

export function loadChat(historyRef, filename = 'conversation') {
  const file = getChatFile(filename);
  if (!fs.existsSync(file)) {
    console.log(chalk.red(`✗ File not found: ${filename}`));
    return false;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  historyRef.length = 0;               // clear
  historyRef.push(...data);            // replace
  console.log(chalk.green(`✓ Loaded: ${filename}.json`));
  return true;
}