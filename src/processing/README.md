# Processing

> Implementation of [OIS processing](https://docs.api3.org/reference/ois/latest/processing.html).

The pre/post processing is only supported for Node.js environments and uses internal Node.js modules.

## Documentation

The processing module exports a multiple functions related to processing (both version 1 and 2). The most important
functions are:

<!-- NOTE: These are copied over from "processing.d.ts" from "dist" file. -->

```ts
/**
 * Pre-processes endpoint parameters based on the provided endpoint's processing specifications.
 *
 * @param preProcessingSpecifications The v1 pre-processing specifications.
 * @param endpointParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export declare const preProcessEndpointParametersV1: (
  preProcessingSpecifications: ProcessingSpecifications | undefined,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<EndpointParameters>;

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
export declare const postProcessResponseV1: (
  response: unknown,
  postProcessingSpecifications: ProcessingSpecifications | undefined,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<unknown>;

/**
 * Pre-processes endpoint parameters based on the provided endpoint's processing specifications.
 *
 * @param preProcessingSpecificationV2 The v2 pre-processing specification.
 * @param endpointParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export declare const preProcessEndpointParametersV2: (
  preProcessingSpecificationV2: ProcessingSpecificationV2 | undefined,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<PreProcessingV2Response>;

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
export declare const postProcessResponseV2: (
  response: unknown,
  postProcessingSpecificationV2: ProcessingSpecificationV2 | undefined,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<PostProcessingV2Response>;

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
export declare const preProcessEndpointParameters: (
  endpoint: Endpoint,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<PreProcessingV2Response>;

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
export declare const postProcessResponse: (
  response: unknown,
  endpoint: Endpoint,
  endpointParameters: EndpointParameters,
  processingOptions?: GoAsyncOptions
) => Promise<PostProcessingV2Response>;
```
