import { type Endpoint, type ProcessingSpecification, RESERVED_PARAMETERS } from '@api3/ois';
import { type GoAsyncOptions, go } from '@api3/promise-utils';

import { type ApiCallParameters, type ApiCallPayload, apiCallParametersSchema } from './schema';
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

// TODO: Consider passing only processing specifications and API params; This function could then be called pre-process
// API parameters.
export const preProcessApiSpecifications = async (
  endpoint: Endpoint,
  parameters: ApiCallParameters,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT_MS }
): Promise<ApiCallParameters> => {
  const { preProcessingSpecifications } = endpoint;
  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return parameters;
  }

  // Run the code through "go" utils to force a specific retry/timeout conditions.
  const goProcessedParameters = await go(
    async () =>
      // TODO: rewrite from reduce to loop
      preProcessingSpecifications.reduce(
        async (currentInput: Promise<unknown>, processing: ProcessingSpecification) => {
          // Provide endpoint parameters without reserved parameters immutably between steps. Because the processing
          // snippets can modify the parameters, we recompute them for each snippet independently.
          const endpointParameters = removeReservedParameters(parameters);
          switch (processing.environment) {
            case 'Node': {
              return unsafeEvaluate(
                processing.value,
                { input: await currentInput, endpointParameters },
                processing.timeoutMs
              );
            }
            case 'Node async': {
              return unsafeEvaluateAsync(
                processing.value,
                { input: await currentInput, endpointParameters },
                processing.timeoutMs
              );
            }
          }
        },
        Promise.resolve(removeReservedParameters(parameters))
      ),
    processingOptions
  );
  if (!goProcessedParameters.success) throw goProcessedParameters.error;

  // Let this throw if the processed parameters are invalid.
  const parsedParameters = apiCallParametersSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them for the API call.
  return addReservedParameters(parameters, parsedParameters);
};

export const postProcessApiSpecifications = async (
  input: unknown,
  endpoint: Endpoint,
  payload: ApiCallPayload,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT_MS }
) => {
  const { postProcessingSpecifications } = endpoint;

  if (!postProcessingSpecifications || postProcessingSpecifications?.length === 0) {
    return input;
  }

  const goResult = await go(
    async () =>
      postProcessingSpecifications.reduce(async (input: any, currentValue: ProcessingSpecification) => {
        // provide endpoint parameters without reserved parameters immutably between steps
        const endpointParameters = removeReservedParameters(
          JSON.parse(JSON.stringify(payload.aggregatedApiCall.parameters))
        );
        switch (currentValue.environment) {
          case 'Node': {
            return unsafeEvaluate(
              currentValue.value,
              { input: await input, endpointParameters },
              currentValue.timeoutMs
            );
          }
          case 'Node async': {
            return unsafeEvaluateAsync(
              currentValue.value,
              { input: await input, endpointParameters },
              currentValue.timeoutMs
            );
          }
        }
      }, Promise.resolve(input)),

    processingOptions
  );

  if (!goResult.success) {
    throw goResult.error;
  }

  return goResult.data;
};
