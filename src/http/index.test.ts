import { AxiosError, type AxiosResponse } from 'axios';

import { executeRequest, extractAxiosErrorData } from '.';

describe(extractAxiosErrorData.name, () => {
  it('should return an error response object', () => {
    const axiosError = new AxiosError('error message', '500', undefined, {}, {
      data: 'error data',
      status: 500,
      statusText: 'Internal Server Error',
    } as any as AxiosResponse);

    expect(extractAxiosErrorData(axiosError)).toStrictEqual({
      axiosResponse: {
        data: 'error data',
        status: 500,
      },
      code: '500',
      message: 'error message',
    });
  });
});

describe(executeRequest.name, () => {
  it('fails to call invalid URL', async () => {
    const request = {
      method: 'GET',
      url: 'http://localhost:9999',
    } as const;

    const response = await executeRequest(request);

    expect(response).toStrictEqual({
      axiosResponse: undefined,
      message: '',
      code: 'ECONNREFUSED',
    });
  });
});
