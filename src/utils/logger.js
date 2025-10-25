import chalk from 'chalk';

const log = (message) => console.log(chalk.white(message));
const success = (message) => console.log(chalk.green(message));
const info = (message) => console.log(chalk.blue(message));
const warn = (message) => console.log(chalk.yellow(message));
const error = (message) => console.log(chalk.red(message));

export default { log, success, info, warn, error };
