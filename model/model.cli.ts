/* eslint-disable no-console */

import { camelCase, constantCase, dotCase, pascalCase, pathCase, snakeCase } from 'change-case';
import fs from 'fs-extra';
import globby from 'globby';
import { argv } from 'yargs';

/**
 * Creates a folder inside ./source that matches
 * desired model and replace its naming variables
 */
function generateModel(): void {
  try {
    const type = argv.t ? argv.t.toString() : null;
    if (!type) {
      return printError(
        'missing model type',
        'npm run model:{model_type} -- -n {domain_name}',
      );
    }
    return generateModelByType(type);
  }
  catch (e) {
    return printError(e.message);
  }
}

/**
 * Copy all files inside model folder to project ./source,
 * renaming according to provided domain name
 *
 * Then replace all placeholders according to desired case
 */
function generateModelByType(type: string): void {
  const name: string = argv.n ? argv.n.toString() : null;

  if (!name) {
    return printError(
      'missing domain name [-n]',
      `npm run model:${type} -- -n {domain_name}`,
    );
  }

  globby.sync(`./${type}/**/*`, { cwd: __dirname }).map((file) => {

    const source = file.replace('./', './model/');
    const destination = file.replace('./', './source/')
      .replace(new RegExp(type, 'g'), dotCase(name));

    const content = fs.readFileSync(source, 'utf8');
    const replaced = content
      .replace(/_Pascal_/g, pascalCase(name))
      .replace(/_Snake_/g, snakeCase(name))
      .replace(/_Camel_/g, camelCase(name))
      .replace(/_Dot_/g, dotCase(name))
      .replace(/_Path_/g, pathCase(name))
      .replace(/_Constant_/g, constantCase(name));

    fs.ensureFileSync(destination);
    fs.writeFileSync(destination, replaced, 'utf8');
  });

}

/**
 * Prints an error message
 * @param message
 */
function printError(message: string, example?: string): void {
  console.error(`
  
  Model Generation Failed!
  Error: ${message}

  ${example ? `
  Example Usage:
  ${example}
  ` : ''}
  `);
}

void generateModel();
