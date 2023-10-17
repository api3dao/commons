export const validateApiCallParameters = (apiCallParameters: unknown): ApiCallParameters => {
  // eslint-disable-next-line lodash/prefer-lodash-typecheck
  if (typeof apiCallParameters !== 'object' || apiCallParameters === null) {
    throw new TypeError('Invalid API call parameters');
  }

  return apiCallParameters as ApiCallParameters;
};

export type ApiCallParameters = Record<string, any>;
