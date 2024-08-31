import { exit } from 'node:process';
import {
  ExitCode,
  debug,
  error,
  info,
  isDebug,
  setFailed,
  warning,
} from '@actions/core';
import fetchRetry, { type RequestInitRetryParams } from 'fetch-retry';
import type { CreateModuleRequest } from './types/createModule';
import type { CreateVersionRequest } from './types/createVersion';
import type { ErrorResponse } from './types/error';

type RetryFetch = (
  input: string | URL | Request,
  init?:
    | (RequestInit &
        RequestInitRetryParams<
          (
            input: string | URL | globalThis.Request,
            init?: RequestInit,
          ) => Promise<Response>
        >)
    | undefined,
) => Promise<Response>;

export class TFEClient {
  retryFetch: RetryFetch;

  constructor(
    private baseUri: string,
    private authToken: string,
  ) {
    this.retryFetch = fetchRetry(fetch);
  }

  getModule = (url: string) => this.fetcher(url, 'GET');

  createModule = async (url: string, req: CreateModuleRequest) => {
    warning(`module ${req.data.attributes.name} does not exist, creating`);

    const createModuleRaw = await this.fetcher(url, 'POST', req);

    if (!createModuleRaw.ok)
      await this.processErrors(
        createModuleRaw,
        `failed to create new module ${req.data.attributes.name}`,
      );

    info(`created module ${req.data.attributes.name}\n`);
    return createModuleRaw;
  };

  createVersion = async (url: string, req: CreateVersionRequest) => {
    info(`creating module version ${req.data.attributes.version}`);

    const createVersionRaw = await this.fetcher(url, 'POST', req);

    if (!createVersionRaw.ok) {
      await this.processErrors(
        createVersionRaw,
        `failed to create new version ${req.data.attributes.version}`,
      );
    }

    info(`version ${req.data.attributes.version} was created\n`);
    return createVersionRaw;
  };

  deleteVersion = async (url: string) => {
    const deleteVersionRaw = await this.fetcher(url, 'DELETE');

    if (!deleteVersionRaw.ok)
      await this.processErrors(
        deleteVersionRaw,
        `failed to remove module version from server. This will need to be manually deleted via DELETE REST call to ${this.baseUri}/${url} if no module was uploaded.`,
      );

    return deleteVersionRaw;
  };

  uploadVersion = async (url: string, fileStream: Buffer) => {
    info('uploading module code');

    const uploadVersionRaw = await this.retryFetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileStream,
      retries: 3,
      retryDelay: (attempt: number) => 2 ** attempt * 1000, // exp backoff
    });

    if (!uploadVersionRaw.ok) {
      error('failed during module upload');
      const err = (await uploadVersionRaw.json()) as ErrorResponse;
      error(
        err?.errors
          ?.map((x) => `${x.status} | ${x.title}: ${x.detail}`)
          ?.join('\n'),
      );
      throw err;
    }

    info('module code was successfully uploaded!');
    return uploadVersionRaw;
  };

  private fetcher = <T>(
    uri: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: T,
  ) => {
    let debugMsg = `making http ${method} request to ${this.baseUri}/${uri}`;
    if (isDebug() && body)
      debugMsg += ` with:\n ${JSON.stringify(body, null, 2)}`;
    info(debugMsg);

    return this.retryFetch(`${this.baseUri}/${uri}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/vnd.api+json',
      },
      body: body ? JSON.stringify(body) : undefined,
      retries: 3,
      retryDelay: (attempt: number) => 2 ** attempt * 1000, // exp backoff
    });
  };

  /**
   * Deal with any API errors to mark the run as failed, and exit the entire build process
   * @param resp Raw response
   * @param msg optional error message
   */
  private processErrors = async (resp: Response, msg?: string) => {
    const err = (await resp.json()) as ErrorResponse;
    if (isDebug()) debug(JSON.stringify(resp, null, 2));

    if (msg) error(msg);

    setFailed(
      err.errors.map((x) => `${x.status} | ${x.title}: ${x.detail}`).join('\n'),
    );
    exit(ExitCode.Failure);
  };
}
