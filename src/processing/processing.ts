import { type Endpoint, type ProcessingSpecification, RESERVED_PARAMETERS } from '@api3/ois';
import { type GoAsyncOptions, go } from '@api3/promise-utils';

import { type ApiCallParameters, type ApiCallPayload, apiCallParametersSchema } from './schema';
import { unsafeEvaluate, unsafeEvaluateAsync } from './unsafe-evaluate';

export const PROCESSING_TIMEOUT_MS = 10_000;

const reservedParameters = RESERVED_PARAMETERS as string[];

const removeReservedParameters = (parameters: ApiCallParameters): ApiCallParameters => {
  return Object.fromEntries(Object.entries(parameters).filter(([key]) => !reservedParameters.includes(key)));
};

/**
 * Re-inserts reserved parameters from the initial parameters object into the modified parameters object.
 */
const reInsertReservedParameters = (
  initialParameters: ApiCallParameters,
  modifiedParameters: ApiCallParameters
): ApiCallParameters => {
  return Object.entries(initialParameters).reduce(
    (params, [key, value]) => (reservedParameters.includes(key) ? { ...params, [key]: value } : params),
    modifiedParameters
  );
};

export const preProcessApiSpecifications = async (
  payload: ApiCallPayload,
  processingOptions: GoAsyncOptions = { retries: 0, totalTimeoutMs: PROCESSING_TIMEOUT_MS }
): Promise<ApiCallPayload> => {
  const { config, aggregatedApiCall } = payload;
  const { endpointName, oisTitle } = aggregatedApiCall;
  const ois = config.ois.find((o) => o.title === oisTitle)!;
  const { preProcessingSpecifications } = ois.endpoints.find((e) => e.name === endpointName)!;

  if (!preProcessingSpecifications || preProcessingSpecifications.length === 0) {
    return payload;
  }

  const inputParameters = removeReservedParameters(aggregatedApiCall.parameters);

  const goProcessedParameters = await go(
    async () =>
      preProcessingSpecifications.reduce(async (input: Promise<unknown>, processing: ProcessingSpecification) => {
        // provide endpoint parameters without reserved parameters immutably between steps
        const endpointParameters = removeReservedParameters(JSON.parse(JSON.stringify(aggregatedApiCall.parameters)));
        switch (processing.environment) {
          case 'Node': {
            return unsafeEvaluate(processing.value, { input: await input, endpointParameters }, processing.timeoutMs);
          }
          case 'Node async': {
            return unsafeEvaluateAsync(
              processing.value,
              { input: await input, endpointParameters },
              processing.timeoutMs
            );
          }
        }
      }, Promise.resolve(inputParameters)),
    processingOptions
  );

  if (!goProcessedParameters.success) {
    throw goProcessedParameters.error;
  }

  // Let this throw if the processed parameters are invalid
  const parsedParameters = apiCallParametersSchema.parse(goProcessedParameters.data);

  // Having removed reserved parameters for pre-processing, we need to re-insert them for the API call
  const parameters = reInsertReservedParameters(aggregatedApiCall.parameters, parsedParameters);

  return {
    ...payload,
    aggregatedApiCall: {
      ...aggregatedApiCall,
      parameters,
    },
  } as ApiCallPayload;
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
