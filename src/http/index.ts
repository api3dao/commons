import { go } from '@api3/promise-utils';
import axios, { type Method, type AxiosError, type AxiosResponse } from 'axios';
import { pick } from 'lodash';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface Request {
  readonly method: Method;
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly queryParams?: Record<string, any>;
  readonly timeout?: number;
  readonly body?: unknown;
}

export interface ErrorResponse {
  readonly axiosResponse: Pick<AxiosResponse, 'data' | 'headers' | 'status'> | undefined;
  readonly message: string;
  readonly code: string | undefined;
}

export const extractAxiosErrorData = (error: AxiosError): ErrorResponse => {
  // Inspired by: https://axios-http.com/docs/handling_errors
  return {
    axiosResponse: error.response ? pick(error.response, ['data', 'status']) : undefined,
    message: error.message,
    code: error.code,
  } as ErrorResponse;
};

export async function executeRequest<T>(request: Request) {
  const { url, method, body, headers = {}, queryParams = {}, timeout = DEFAULT_TIMEOUT_MS } = request;

  const goAxios = await go<Promise<AxiosResponse<T>>, AxiosError>(async () =>
    axios({
      url,
      method,
      headers,
      data: body,
      params: queryParams,
      timeout,
    })
  );
  if (!goAxios.success) return extractAxiosErrorData(goAxios.error);
  const response = goAxios.data;

  return response.data;
}
