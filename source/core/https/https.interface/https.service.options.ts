import https from 'https';

import { HttpsReturnType } from '../https.enum';

/**
 * Sets up a custom HTTP instance based on Axios.
 */
export interface HttpsServiceOptions {

  defaultValidator?: (status: number)=> boolean;
  defaultReturnType?: HttpsReturnType;
  defaultTimeout?: number;

  baseUrl?: string;
  baseQuery?: Record<string, string>;
  baseData?: Record<string, unknown>;
  baseHeaders?: Record<string, string>;

  httpsAgent?: https.Agent;
  ignoreHttpsErrors?: boolean;

  ssl?: {
    cert: string;
    key: string;
    passphrase?: string;
  }

}
