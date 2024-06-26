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
      response: 'error data',
      message: 'error message',
      code: '500',
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
      data: undefined,
      errorData: {
        response: undefined,
        code: 'ECONNREFUSED',
        message: expect.any(String), // The message is empty in node@20, but "connect ECONNREFUSED ::1:9999" on node@18
      },
      statusCode: undefined,
      success: false,
    });
  });
});
