import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CHAT_DIR } from '../config.js';

export async function listChats() {
  try {
    const files = await fs.readdir(CHAT_DIR);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch (err) {
    return [];
  }
}


export function getChatFile(filename) {
  return path.join(CHAT_DIR, `${filename}.json`);
}

export async function saveChat(history, filename = 'conversation') {
  const file = getChatFile(filename);
  await fs.writeFile(file, JSON.stringify(history, null, 2));
  console.log(chalk.green(`✓ Saved to: ${filename}.json`));
}

export async function loadChat(filename = 'conversation') {
  const file = getChatFile(filename);
  if (!existsSync(file)) {
    console.log(chalk.red(`✗ File not found: ${filename}`));
    return null;
  }
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  console.log(chalk.green(`✓ Loaded: ${filename}.json`));
  return data;
}