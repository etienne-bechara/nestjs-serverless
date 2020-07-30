import { Injectable, InternalServerErrorException, Scope } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import qs from 'qs';
import UserAgent from 'user-agents';

import { AppProvider } from '../app/app.provider';
import { HttpsReturnType } from './https.enum';
import { HttpsRequestParams, HttpsServiceOptions } from './https.interface';
import { HttpsSettings } from './https.settings';

@Injectable({ scope: Scope.TRANSIENT })
export class HttpsService extends AppProvider {
  private settings: HttpsSettings = this.getSettings();
  private defaultValidator: (status: number)=> boolean;
  private defaultReturnType: HttpsReturnType;
  private baseUrl: string;
  private baseData: Record<string, unknown>;
  private baseHeaders: Record<string, string>;
  private instance: AxiosInstance;

  /**
   * Creates new HTTP instance based on Axios params
   * Change the following default behaviours:
   * - Sets default timeout according to settings
   * - Sets default return type to data
   * - Save custom status validation at instance level
   * - Remove validation inside axios handler
   * @param params
   */
  public setupInstance(params: HttpsServiceOptions): void {

    this.defaultReturnType = params.defaultReturnType || HttpsReturnType.DATA;
    this.baseUrl = params.baseUrl,
    this.baseData = params.baseData;
    this.defaultValidator = params.defaultValidator
      ? params.defaultValidator
      : (s): boolean => s < 400;

    if (!params.baseHeaders) params.baseHeaders = { };
    if (params.randomizeUserAgent) {
      params.baseHeaders['user-agent'] = new UserAgent().toString();
    }
    this.baseHeaders = params.baseHeaders;

    this.instance = axios.create({
      timeout: params.defaultTimeout || this.settings.HTTPS_DEFAULT_TIMEOUT,
      validateStatus: () => true,
      httpsAgent: params.ignoreHttpsErrors
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    });
  }

  /**
   * Handles all requests, extending default axios functionality with:
   * • Better validation: Include returned data in case of validation failure
   * • Better timeout: Based on server timing instead of only after DNS resolve
   * • Error standardisation: Add several data for easier debugging
   * @param params
   */
  public async request<T>(params: HttpsRequestParams): Promise<T> {
    let errorPrefix, res;

    if (!this.instance) {
      throw new InternalServerErrorException('https service must be configured with this.setupInstance()');
    }

    params.timeout = params.timeout || this.instance.defaults.timeout;
    const rawParams = Object.assign({ }, params);
    this.transformParams(params);

    try {
      const source = axios.CancelToken.source();
      params.cancelToken = source.token;

      res = await Promise.race([
        this.instance(params),
        this.wait(params.timeout),
      ]);

      const validator = params.validateStatus || this.defaultValidator;
      if (!res) {
        source.cancel();
        errorPrefix = 'Request timeout';
      }
      else if (!validator(res.status)) {
        errorPrefix = 'Request failed';
      }
    }
    catch (e) {
      if (e.message.includes('timeout')) errorPrefix = 'Request timeout';
      else errorPrefix = 'Request exception';
    }

    if (errorPrefix) {
      throw new InternalServerErrorException({
        message: `${errorPrefix}: ${rawParams.method} ${rawParams.url}`,
        config: rawParams,
        status: res ? res.status : undefined,
        headers: res ? res.headers : undefined,
        data: res ? res.data : undefined,
      });
    }

    const returnType = params.returnType || this.defaultReturnType;
    return returnType === HttpsReturnType.DATA
      ? res.data
      : res;
  }

  /**
   * Apply custom rules to inbound params for better usability
   * @param param
   */
  private transformParams(params: HttpsRequestParams): void {
    if (!params.headers) params.headers = { };

    // Join url, data and headers with respective base
    if (this.baseUrl) params.url = `${this.baseUrl}${params.url}`;
    params.headers = { ...this.baseHeaders, ...params.headers };
    if (this.baseData) {
      if (params.data) params.data = { ...this.baseData, ...params.data };
      if (params.form) params.form = { ...this.baseData, ...params.form };
      if (params.params) params.params = { ...this.baseData, ...params.params };
    }

    // Automatically stringify forms and set its header
    if (params.form) {
      params.headers['content-type'] = 'application/x-www-form-urlencoded';
      params.data = qs.stringify(params.form);
    }

    // Apply URL replacements
    if (params.replacements) {
      for (const key in params.replacements) {
        const replaceRegex = new RegExp(`:${key}`, 'g');
        const value = encodeURIComponent(params.replacements[key].toString());
        params.url = params.url.replace(replaceRegex, value);
      }
    }
  }

  /** GET */
  public async get<T>(url: string, params: HttpsRequestParams = { }): Promise<T> {
    params.method = 'GET';
    params.url = url;
    return this.request<T>(params);
  }

  /** POST */
  public async post<T>(url: string, params: HttpsRequestParams = { }): Promise<T> {
    params.method = 'POST';
    params.url = url;
    return this.request<T>(params);
  }

  /** PUT */
  public async put<T>(url: string, params: HttpsRequestParams = { }): Promise<T> {
    params.method = 'PUT';
    params.url = url;
    return this.request<T>(params);
  }

  /** DELETE */
  public async delete<T>(url: string, params: HttpsRequestParams = { }): Promise<T> {
    params.method = 'DELETE';
    params.url = url;
    return this.request<T>(params);
  }

}
