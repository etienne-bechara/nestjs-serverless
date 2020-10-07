import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import dotenv from 'dotenv';

import { AppConfig } from '../app/app.config';
import { AppEnvironment } from '../app/app.enum';

let cachedConfig: Record<string, any>;

@Injectable()
export class ConfigService<T extends Record<string, any>> {
  public get(variable: 'NODE_ENV'): AppEnvironment;
  public get<K extends keyof T>(variable: K): T[K];

  /**
   * Retrieves an specific setting by its key.
   * It is expected that the cache was already populated.
   * @param variable
   */
  public get<K extends keyof T>(variable: K): T[K] {
    if (!cachedConfig) {
      throw new InternalServerErrorException('failed to acquire config cache');
    }
    return cachedConfig[variable as string];
  }

  /**
   * Parses all *.config.ts files, merges them with environment,
   * and apply validation rules.
   * If everything is correct, caches the result.
   */
  public static async populateConfig(): Promise<void> {
    const configConstructors = AppConfig.globToRequire('./**/*.config.{js,ts}');
    const envFile = dotenv.config({ path: `${__dirname}/../../../.env` }).parsed || { };
    const envVariables = { ...process.env, envFile };
    const config: Record<string, any> = { };

    for (const constructor of configConstructors) {
      const partialConfig: Record<string, any> = plainToClass(constructor, envVariables);

      try {
        await validateOrReject(partialConfig, {
          validationError: { target: false },
        });
      }
      catch (e) {
        console.error(e); // eslint-disable-line no-console
        process.exit(1); // eslint-disable-line unicorn/no-process-exit
      }

      for (const key in partialConfig) {
        config[key] = partialConfig[key];
      }
    }
    cachedConfig = config;
  }

}