import { type Endpoint, type ProcessingSpecification, RESERVED_PARAMETERS } from '@api3/ois';
import { type GoAsyncOptions, go } from '@api3/promise-utils';

import { type ApiCallParameters, apiCallParametersSchema } from './schema';
import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';

export const PROCESSING_TIMEOUT_MS = 10_000;

const reservedParameters = RESERVED_PARAMETERS as string[]; // To avoid strict TS checks.

/**
 * Removes reserved parameters from the parameters object.
 */
const removeReservedParameters = (parameters: ApiCallParameters): ApiCallParameters => {
  return Object.fromEntries(Object.entries(parameters).filter(([key]) => !reservedParameters.includes(key)));
};

/**
 * Re-inserts reserved parameters from the initial parameters object into the modified parameters object.
 */
const addReservedParameters = (
  initialParameters: ApiCallParameters,
  modifiedParameters: ApiCallParameters
): ApiCallParameters => {
  return Object.entries(initialParameters).reduce(
    (params, [key, value]) => (reservedParameters.includes(key) ? { ...params, [key]: value } : params),
    modifiedParameters
  );
};

// TODO: Consider passing only processing specifications and API params;
export const preProcessApiCallParameters = async (
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT_MS }
): Promise<ApiCallParameters> => {
  const { preProcessingSpecifications } = endpoint;
  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return apiCallParameters;
  }

  // Run the code through "go" utils to force a specific retry/timeout conditions.
  const goProcessedParameters = await go(
    async () =>
      // TODO: rewrite from reduce to loop
      preProcessingSpecifications.reduce(
        async (currentValue: Promise<unknown>, processing: ProcessingSpecification) => {
          // Provide endpoint parameters without reserved parameters immutably between steps. Because the processing
          // snippets can modify the parameters, we recompute them for each snippet independently.
          const endpointParameters = removeReservedParameters(apiCallParameters);
          switch (processing.environment) {
            case 'Node': {
              return unsafeEvaluate(
                processing.value,
                { input: await currentValue, endpointParameters },
                processing.timeoutMs
              );
            }
            case 'Node async': {
              return unsafeEvaluateAsync(
                processing.value,
                { input: await currentValue, endpointParameters },
                processing.timeoutMs
              );
            }
          }
        },
        Promise.resolve(removeReservedParameters(apiCallParameters))
      ),
    processingOptions
  );
  if (!goProcessedParameters.success) throw goProcessedParameters.error;

  // Let this throw if the processed parameters are invalid.
  const parsedParameters = apiCallParametersSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them for the API call.
  return addReservedParameters(apiCallParameters, parsedParameters);
};

export const postProcessApiCallResponse = async (
  apiCallResponse: unknown,
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT_MS }
) => {
  const { postProcessingSpecifications } = endpoint;
  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return apiCallResponse;
  }

  // Run the code through "go" utils to force a specific retry/timeout conditions.
  const goResult = await go(
    async () =>
      postProcessingSpecifications.reduce(async (currentValue: any, processing: ProcessingSpecification) => {
        // Provide endpoint parameters without reserved parameters immutably between steps. Because the processing
        // snippets can modify the parameters, we recompute them for each snippet independently.
        const endpointParameters = removeReservedParameters(apiCallParameters);
        switch (processing.environment) {
          case 'Node': {
            return unsafeEvaluate(
              processing.value,
              { input: await currentValue, endpointParameters },
              processing.timeoutMs
            );
          }
          case 'Node async': {
            return unsafeEvaluateAsync(
              processing.value,
              { input: await currentValue, endpointParameters },
              processing.timeoutMs
            );
          }
        }
      }, Promise.resolve(apiCallResponse)),
    processingOptions
  );
  if (!goResult.success) throw goResult.error;

  return goResult.data;
};
