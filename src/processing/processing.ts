import { type Endpoint, RESERVED_PARAMETERS } from '@api3/ois';
import { type GoAsyncOptions, go } from '@api3/promise-utils';

import {
  type ApiCallParameters,
  postProcessingV2ResponseSchema,
  apiCallParametersSchema,
  preProcessingV2ResponseSchema,
  type PreProcessingV2Response,
  type PostProcessingV2Response,
} from './schema';
import { unsafeEvaluate, unsafeEvaluateAsync, unsafeEvaluateAsyncV2 } from './unsafe-evaluate';

export const DEFAULT_PROCESSING_TIMEOUT_MS = 10_000;

const reservedParameters = RESERVED_PARAMETERS as string[]; // To avoid strict TS checks.

/**
 * Removes reserved parameters from the parameters object.
 * @param parameters The API call parameters from which reserved parameters will be removed.
 * @returns The parameters object without reserved parameters.
 */
export const removeReservedParameters = (parameters: ApiCallParameters): ApiCallParameters => {
  const result: ApiCallParameters = {};

  for (const key in parameters) {
    if (!reservedParameters.includes(key)) {
      result[key] = parameters[key];
    }
  }

  return result;
};

/**
 * Re-inserts reserved parameters from the initial parameters object into the modified parameters object.
 * @param initialParameters The initial API call parameters that might contain reserved parameters.
 * @param modifiedParameters The modified API call parameters to which reserved parameters will be added.
 * @returns The modified parameters object with re-inserted reserved parameters.
 */
export const addReservedParameters = (
  initialParameters: ApiCallParameters,
  modifiedParameters: ApiCallParameters
): ApiCallParameters => {
  for (const key in initialParameters) {
    if (reservedParameters.includes(key)) {
      modifiedParameters[key] = initialParameters[key];
    }
  }

  return modifiedParameters;
};

/**
 * Pre-processes API call parameters based on the provided endpoint's processing specifications.
 *
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParametersV1 = async (
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<ApiCallParameters> => {
  const { preProcessingSpecifications } = endpoint;
  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return apiCallParameters;
  }

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goProcessedParameters = await go(async () => {
    let currentValue: unknown = removeReservedParameters(apiCallParameters);

    for (const processing of preProcessingSpecifications) {
      // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
      // snippet independently because processing snippets can modify the parameters.
      const endpointParameters = removeReservedParameters(apiCallParameters);

      switch (processing.environment) {
        case 'Node': {
          currentValue = await unsafeEvaluate(
            processing.value,
            { input: currentValue, endpointParameters },
            processing.timeoutMs
          );
          break;
        }
        case 'Node async': {
          currentValue = await unsafeEvaluateAsync(
            processing.value,
            { input: currentValue, endpointParameters },
            processing.timeoutMs
          );
          break;
        }
      }
    }

    return currentValue;
  }, processingOptions);
  if (!goProcessedParameters.success) throw goProcessedParameters.error;

  // Let this throw if the processed parameters are invalid.
  const parsedParameters = apiCallParametersSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them for the API call.
  return addReservedParameters(apiCallParameters, parsedParameters);
};

/**
 * Post-processes the API call response based on the provided endpoint's processing specifications.
 *
 * @param apiCallResponse The raw response obtained from the API call.
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters used in the API call.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed API call response.
 */
export const postProcessApiCallResponseV1 = async (
  apiCallResponse: unknown,
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
) => {
  const { postProcessingSpecifications } = endpoint;
  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return apiCallResponse;
  }

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goResult = await go(async () => {
    let currentValue: unknown = apiCallResponse;

    for (const processing of postProcessingSpecifications) {
      // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
      // snippet independently because processing snippets can modify the parameters.
      const endpointParameters = removeReservedParameters(apiCallParameters);
      switch (processing.environment) {
        case 'Node': {
          currentValue = await unsafeEvaluate(
            processing.value,
            { input: currentValue, endpointParameters },
            processing.timeoutMs
          );
          break;
        }
        case 'Node async': {
          currentValue = await unsafeEvaluateAsync(
            processing.value,
            { input: currentValue, endpointParameters },
            processing.timeoutMs
          );
          break;
        }
      }
    }

    return currentValue;
  }, processingOptions);
  if (!goResult.success) throw goResult.error;

  return goResult.data;
};

/**
 * Pre-processes API call parameters based on the provided endpoint's processing specifications.
 *
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParametersV2 = async (
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PreProcessingV2Response> => {
  const { preProcessingSpecificationV2 } = endpoint;
  if (!preProcessingSpecificationV2) return { apiCallParameters };

  // We only wrap the code through "go" utils because of the timeout and retry logic.  In case of error, the function
  // just re-throws.
  const goProcessedParameters = await go(async () => {
    const { environment, timeoutMs, value } = preProcessingSpecificationV2;

    switch (environment) {
      case 'Node async': {
        return unsafeEvaluateAsyncV2(
          value,
          { apiCallParameters: removeReservedParameters(apiCallParameters) },
          timeoutMs
        );
      }
    }
  }, processingOptions);
  if (!goProcessedParameters.success) throw goProcessedParameters.error;

  // Let this throw if the processed parameters are invalid.
  const preProcessingResponse = preProcessingV2ResponseSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them for the API call.
  return { apiCallParameters: addReservedParameters(apiCallParameters, preProcessingResponse.apiCallParameters) };
};

/**
 * Post-processes the API call response based on the provided endpoint's processing specifications.
 *
 * @param apiCallResponse The raw response obtained from the API call.
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters used in the API call.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed API call response.
 */
export const postProcessApiCallResponseV2 = async (
  apiCallResponse: unknown,
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PostProcessingV2Response> => {
  const { postProcessingSpecificationV2 } = endpoint;
  if (!postProcessingSpecificationV2) return { apiCallResponse };

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goResult = await go(async () => {
    const { environment, timeoutMs, value } = postProcessingSpecificationV2;
    // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
    // snippet independently because processing snippets can modify the parameters.
    const endpointParameters = removeReservedParameters(apiCallParameters);

    switch (environment) {
      case 'Node async': {
        return unsafeEvaluateAsyncV2(value, { apiCallResponse, endpointParameters }, timeoutMs);
      }
    }
  }, processingOptions);
  if (!goResult.success) throw goResult.error;

  return postProcessingV2ResponseSchema.parse(goResult.data);
};

/**
 * Post-processes the API call response based on the provided endpoint's processing specifications. Internally it
 * determines what processing implementation should be used.
 *
 * @param apiCallResponse The raw response obtained from the API call.
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters used in the API call.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed API call response.
 */
export const postProcessApiCallResponse = async (
  apiCallResponse: unknown,
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PostProcessingV2Response> => {
  const { postProcessingSpecificationV2 } = endpoint;
  if (postProcessingSpecificationV2) return postProcessApiCallResponseV2(apiCallResponse, endpoint, apiCallParameters);

  const postProcessV1Response = await postProcessApiCallResponseV1(
    apiCallResponse,
    endpoint,
    apiCallParameters,
    processingOptions
  );
  return { apiCallResponse: postProcessV1Response };
};

/**
 * Pre-processes API call parameters based on the provided endpoint's processing specifications. Internally it
 * determines what processing implementation should be used.
 *
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParameters = async (
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PreProcessingV2Response> => {
  const { preProcessingSpecificationV2 } = endpoint;
  if (preProcessingSpecificationV2) return preProcessApiCallParametersV2(endpoint, apiCallParameters);

  const preProcessV1Response = await preProcessApiCallParametersV1(endpoint, apiCallParameters, processingOptions);
  return { apiCallParameters: preProcessV1Response };
};
