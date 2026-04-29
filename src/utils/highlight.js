import chalk from 'chalk';
import { highlight } from 'cli-highlight';

export function highlightCode(text) {
  return text.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
    try {
      const highlighted = highlight(code.trim(), { language: lang || 'markdown', ignoreIllegals: true });
      return `\n${chalk.bold.magenta('```' + (lang || ''))}\n${highlighted}\n${chalk.bold.magenta('```')}\n`;
    } catch {
      // fallback
      const highlighted = chalk.cyan(code.trim());
      return `\n${chalk.bold.magenta('```' + (lang || ''))}\n${highlighted}\n${chalk.bold.magenta('```')}\n`;
    }
  });
}