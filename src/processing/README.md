# Processing

> Implementation of [OIS processing](https://docs.api3.org/reference/ois/latest/processing.html).

The pre/post processing is only supported for Node.js environments and uses internal Node.js modules.

## Getting started

1. Install `zod` which is a peer dependency of this module. Zod is used for validating the logger configuration.

## Documentation

The processing module exports two main functions:

<!-- NOTE: These are copied over from "processing.d.ts" from "dist" file. -->

```ts
/**
 * Pre-processes API call parameters based on the provided endpoint's processing specifications.
 *
 * @param endpoint The endpoint containing processing specifications.
 * @param apiCallParameters The parameters to be pre-processed.
 * @param processingOptions Options to control the async processing behavior like retries and timeouts.
 *
 * @returns A promise that resolves to the pre-processed parameters.
 */
export declare const preProcessApiCallParameters: (
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions?: GoAsyncOptions
) => Promise<ApiCallParameters>;

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
export declare const postProcessApiCallResponse: (
  apiCallResponse: unknown,
  endpoint: Endpoint,
  apiCallParameters: ApiCallParameters,
  processingOptions?: GoAsyncOptions
) => Promise<unknown>;
```
