import { go } from '@api3/promise-utils';
import axios, { type Method, type AxiosError, type AxiosResponse } from 'axios';

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
  readonly response: unknown;
  readonly message: string;
  readonly code: string | undefined;
}

export const extractAxiosErrorData = (error: AxiosError): ErrorResponse => {
  // Inspired by: https://axios-http.com/docs/handling_errors
  return {
    response: error.response?.data,
    message: error.message,
    code: error.code,
  };
};

interface ExecuteRequestSuccess<T> {
  success: true;
  errorData: undefined;
  data: T;
  statusCode: number;
}
interface ExecuteRequestError {
  success: false;
  errorData: ErrorResponse;
  data: undefined;
  statusCode: number | undefined;
}

export type ExecuteRequestResult<T> = ExecuteRequestError | ExecuteRequestSuccess<T>;

export async function executeRequest<T>(request: Request): Promise<ExecuteRequestResult<T>> {
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
  if (!goAxios.success) {
    return {
      success: false,
      errorData: extractAxiosErrorData(goAxios.error),
      data: undefined,
      statusCode: goAxios.error.status,
    };
  }
  const response = goAxios.data;

  return { success: true, errorData: undefined, data: response.data, statusCode: response.status };
}
