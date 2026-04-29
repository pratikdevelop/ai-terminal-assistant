import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import chalk from 'chalk';

export function openEditorForInput() {
  const tmpFile = path.join(os.tmpdir(), `ai-chat-${Date.now()}.md`);
  fs.writeFileSync(tmpFile, '\n\n#\n# Write your multi-line prompt above.\n# Save and close the editor to send.', 'utf8');

  // fallback to notepad on Windows, vim on Unix
  const editor = process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vim');
  
  console.log(chalk.gray(`Opening ${editor}... (Close editor when done)`));
  
  // Note: For shell editors (vim, nano), stdio: 'inherit' is required.
  // For GUI editors (notepad) it doesn't hurt.
  spawnSync(editor, [tmpFile], { stdio: 'inherit' });

  if (!fs.existsSync(tmpFile)) return '';
  const content = fs.readFileSync(tmpFile, 'utf8');
  fs.unlinkSync(tmpFile);

  const lines = content.split('\n');
  const validLines = lines.filter(line => !line.startsWith('#'));
  return validLines.join('\n').trim();
}
