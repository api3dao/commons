import { type Endpoint, RESERVED_PARAMETERS } from '@api3/ois';
import { type GoAsyncOptions, go } from '@api3/promise-utils';

import {
  type EndpointParameters,
  postProcessingV2ResponseSchema,
  endpointParametersSchema,
  preProcessingV2ResponseSchema,
  type PreProcessingV2Response,
  type PostProcessingV2Response,
  type ProcessingSpecificationV2,
  type ProcessingSpecifications,
} from './schema';
import { unsafeEvaluate, unsafeEvaluateAsync, unsafeEvaluateV2 } from './unsafe-evaluate';

export const DEFAULT_PROCESSING_TIMEOUT_MS = 10_000;

const reservedParameters = RESERVED_PARAMETERS as string[]; // To avoid strict TS checks.

/**
 * Removes reserved parameters from the endpoint parameters.
 * @param parameters The endpoint parameters from which reserved parameters will be removed.
 * @returns The endpoint parameters without reserved parameters.
 */
export const removeReservedParameters = (parameters: EndpointParameters): EndpointParameters => {
  const result: EndpointParameters = {};

  for (const key in parameters) {
    if (!reservedParameters.includes(key)) {
      result[key] = parameters[key];
    }
  }

  return result;
};

/**
 * Re-inserts reserved parameters from the initial endpoint parameters into the modified endpoint parameters.
 * @param initialParameters The initial endpoint parameters that might contain reserved parameters.
 * @param modifiedParameters The modified endpoint parameters to which reserved parameters will be added.
 * @returns The modified endpoint parameters with re-inserted reserved parameters.
 */
export const addReservedParameters = (
  initialParameters: EndpointParameters,
  modifiedParameters: EndpointParameters
): EndpointParameters => {
  for (const key in initialParameters) {
    if (reservedParameters.includes(key)) {
      modifiedParameters[key] = initialParameters[key];
    }
  }

  return modifiedParameters;
};

/**
 * Pre-processes endpoint parameters based on the provided endpoint's processing specifications.
 *
 * @param preProcessingSpecifications The v1 pre-processing specifications.
 * @param endpointParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParametersV1 = async (
  preProcessingSpecifications: ProcessingSpecifications | undefined,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<EndpointParameters> => {
  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return endpointParameters;
  }

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goProcessedParameters = await go(async () => {
    let currentValue: unknown = removeReservedParameters(endpointParameters);

    for (const processing of preProcessingSpecifications) {
      // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
      // snippet independently because processing snippets can modify the parameters.
      const nonReservedEndpointParameters = removeReservedParameters(endpointParameters);

      switch (processing.environment) {
        case 'Node': {
          currentValue = await unsafeEvaluate(
            processing.value,
            { input: currentValue, endpointParameters: nonReservedEndpointParameters },
            processing.timeoutMs
          );
          break;
        }
        case 'Node async': {
          currentValue = await unsafeEvaluateAsync(
            processing.value,
            { input: currentValue, endpointParameters: nonReservedEndpointParameters },
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
  const parsedParameters = endpointParametersSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them after pre-processing.
  return addReservedParameters(endpointParameters, parsedParameters);
};

/**
 * Post-processes the response based on the provided endpoint's processing specifications. The response is usually the
 * API call response, but this logic depends on how the processing is used by the target service. For example, Airnode
 * allows skipping API calls in which case the response is the result of pre-processing.
 *
 * @param response The response to be post-processed.
 * @param postProcessingSpecifications The v1 post-processing specifications.
 * @param endpointParameters The endpoint parameters.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed response.
 */
export const postProcessApiCallResponseV1 = async (
  response: unknown,
  postProcessingSpecifications: ProcessingSpecifications | undefined,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
) => {
  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return response;
  }

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goResult = await go(async () => {
    let currentValue: unknown = response;

    for (const processing of postProcessingSpecifications) {
      // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
      // snippet independently because processing snippets can modify the parameters.
      const nonReservedEndpointParameters = removeReservedParameters(endpointParameters);
      switch (processing.environment) {
        case 'Node': {
          currentValue = await unsafeEvaluate(
            processing.value,
            { input: currentValue, endpointParameters: nonReservedEndpointParameters },
            processing.timeoutMs
          );
          break;
        }
        case 'Node async': {
          currentValue = await unsafeEvaluateAsync(
            processing.value,
            { input: currentValue, endpointParameters: nonReservedEndpointParameters },
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
 * Pre-processes endpoint parameters based on the provided endpoint's processing specifications.
 *
 * @param preProcessingSpecificationV2 The v2 pre-processing specification.
 * @param endpointParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParametersV2 = async (
  preProcessingSpecificationV2: ProcessingSpecificationV2 | undefined,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PreProcessingV2Response> => {
  if (!preProcessingSpecificationV2) return { endpointParameters };

  // We only wrap the code through "go" utils because of the timeout and retry logic.  In case of error, the function
  // just re-throws.
  const goProcessedParameters = await go(async () => {
    const { environment, timeoutMs, value } = preProcessingSpecificationV2;

    switch (environment) {
      case 'Node': {
        return unsafeEvaluateV2(value, { endpointParameters: removeReservedParameters(endpointParameters) }, timeoutMs);
      }
    }
  }, processingOptions);
  if (!goProcessedParameters.success) throw goProcessedParameters.error;

  // Let this throw if the processed parameters are invalid.
  const preProcessingResponse = preProcessingV2ResponseSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them after pre-processing.
  return { endpointParameters: addReservedParameters(endpointParameters, preProcessingResponse.endpointParameters) };
};

/**
 * Post-processes the response based on the provided endpoint's processing specifications. The response is usually the
 * API call response, but this logic depends on how the processing is used by the target service. For example, Airnode
 * allows skipping API calls in which case the response is the result of pre-processing.
 *
 * @param response The response to be post-processed.
 * @param postProcessingSpecificationV2 The v2 post-processing specification.
 * @param endpointParameters The endpoint parameters.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed response.
 */
export const postProcessApiCallResponseV2 = async (
  response: unknown,
  postProcessingSpecificationV2: ProcessingSpecificationV2 | undefined,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PostProcessingV2Response> => {
  if (!postProcessingSpecificationV2) return { response };

  // We only wrap the code through "go" utils because of the timeout and retry logic. In case of error, the function
  // just re-throws.
  const goResult = await go(async () => {
    const { environment, timeoutMs, value } = postProcessingSpecificationV2;
    // Provide endpoint parameters without reserved parameters immutably between steps. Recompute them for each
    // snippet independently because processing snippets can modify the parameters.
    const nonReservedEndpointParameters = removeReservedParameters(endpointParameters);

    switch (environment) {
      case 'Node': {
        return unsafeEvaluateV2(value, { response, endpointParameters: nonReservedEndpointParameters }, timeoutMs);
      }
    }
  }, processingOptions);
  if (!goResult.success) throw goResult.error;

  return postProcessingV2ResponseSchema.parse(goResult.data);
};

/**
 * Post-processes the response based on the provided endpoint's processing specifications. The response is usually the
 * API call response, but this logic depends on how the processing is used by the target service. For example, Airnode
 * allows skipping API calls in which case the response is the result of pre-processing.
 *
 * This function determines what processing version should be used and provides a common interface. This is useful for
 * services that want to use processing and don't care which processing version is used.
 *
 * @param response The response to be post-processed.
 * @param endpoint The endpoint containing processing specifications.
 * @param endpointParameters The endpoint parameters.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the post-processed response.
 */
export const postProcessApiCallResponse = async (
  response: unknown,
  endpoint: Endpoint,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PostProcessingV2Response> => {
  const { postProcessingSpecificationV2, postProcessingSpecifications } = endpoint;
  if (postProcessingSpecificationV2) {
    return postProcessApiCallResponseV2(response, postProcessingSpecificationV2, endpointParameters);
  }

  const postProcessV1Response = await postProcessApiCallResponseV1(
    response,
    postProcessingSpecifications,
    endpointParameters,
    processingOptions
  );
  return { response: postProcessV1Response };
};

/**
 * Pre-processes endpoint parameters based on the provided endpoint's processing specifications. Internally it
 * determines what processing implementation should be used.
 *
 * @param endpoint The endpoint containing processing specifications.
 * @param endpointParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export const preProcessApiCallParameters = async (
  endpoint: Endpoint,
  endpointParameters: EndpointParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: DEFAULT_PROCESSING_TIMEOUT_MS }
): Promise<PreProcessingV2Response> => {
  const { preProcessingSpecificationV2, preProcessingSpecifications } = endpoint;
  if (preProcessingSpecificationV2) {
    return preProcessApiCallParametersV2(preProcessingSpecificationV2, endpointParameters);
  }

  const preProcessV1Response = await preProcessApiCallParametersV1(
    preProcessingSpecifications,
    endpointParameters,
    processingOptions
  );
  return { endpointParameters: preProcessV1Response };
};
