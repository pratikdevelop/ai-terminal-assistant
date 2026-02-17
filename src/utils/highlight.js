import chalk from 'chalk';

export function highlightCode(text) {
  return text.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
    const highlighted = chalk.cyan(code.trim());
    return `\n${chalk.bold.magenta('```' + (lang || ''))}\n${highlighted}\n${chalk.bold.magenta('```')}\n`;
  });
}