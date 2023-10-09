import type { OIS } from '@api3/ois';
import { z } from 'zod';

export const apiCallParametersSchema = z.record(z.string(), z.any());

export type ApiCallParameters = z.infer<typeof apiCallParametersSchema>;

export const apiCredentialsSchema = z
  .object({
    securitySchemeName: z.string(),
    securitySchemeValue: z.string(),
    oisTitle: z.string(),
  })
  .strict();

export type ApiCredentials = z.infer<typeof apiCredentialsSchema>;

export interface ApiCallErrorResponse {
  success: false;
  errorMessage: string;
  reservedParameterOverrides?: {
    gasPrice?: string;
  };
}

export interface RegularApiCallSuccessResponse {
  success: true;
  data: { encodedValue: string; signature: string };
  reservedParameterOverrides?: {
    gasPrice?: string;
  };
}

export interface HttpGatewayApiCallSuccessResponse {
  success: true;
  data: { values: unknown[]; rawValue: unknown; encodedValue: string };
}

export interface HttpGatewayApiCallPartialResponse {
  success: true;
  errorMessage: string;
  data: unknown;
}

export interface HttpSignedDataApiCallSuccessResponse {
  success: true;
  data: { timestamp: string; encodedValue: string; signature: string };
}

export type RegularApiCallResponse = ApiCallErrorResponse | RegularApiCallSuccessResponse;
export type HttpGatewayApiCallResponse =
  | ApiCallErrorResponse
  | HttpGatewayApiCallPartialResponse
  | HttpGatewayApiCallSuccessResponse;
export type HttpSignedDataApiCallResponse = ApiCallErrorResponse | HttpSignedDataApiCallSuccessResponse;

export type ApiCallResponse = HttpGatewayApiCallResponse;

export type AggregatedApiCall = HttpSignedDataAggregatedApiCall | RegularAggregatedApiCall;

export interface BaseAggregatedApiCall {
  endpointName: string;
  oisTitle: string;
  parameters: ApiCallParameters;
  // This property is defined in case there is an error and this API call cannot be processed
  errorMessage?: string;
}

export interface RegularAggregatedApiCall extends BaseAggregatedApiCall {
  id: string;
  airnodeAddress: string;
  endpointId: string;
  sponsorAddress: string;
  requesterAddress: string;
  sponsorWalletAddress: string;
  chainId: string;
  requestType: ApiCallType;
  // TODO: This has way too many common properties with ApiCall
  metadata: RequestMetadata;
  requestCount: string;
  templateId: string | null;
  fulfillAddress: string;
  fulfillFunctionId: string;
  encodedParameters: string;
  template?: ApiCallTemplate;
  cacheResponses?: boolean;
}

export interface ApiCallTemplate {
  readonly airnodeAddress: string;
  readonly endpointId: string;
  readonly encodedParameters: string;
  readonly id: string;
}

export interface RequestMetadata {
  readonly address: string;
  readonly blockNumber: number;
  readonly currentBlock: number;
  readonly minConfirmations: number;
  readonly transactionHash: string;
  readonly logIndex: number;
}

export type ApiCallType = 'full' | 'template';

export type RegularAggregatedApiCallWithResponse = RegularAggregatedApiCall & RegularApiCallResponse;

export interface HttpSignedDataAggregatedApiCall extends BaseAggregatedApiCall {
  id: string;
  endpointId: string;
  templateId: string;
  template: ApiCallTemplate;
}

// TODO: We need to make sure the processing does not depend on Airnode Config
export interface Config {
  apiCredentials: ApiCredentials[];
  ois: OIS[];
}

export type HttpApiCallConfig = Pick<Config, 'apiCredentials' | 'ois'>;

export type RegularApiCallConfig = HttpApiCallConfig;

export type ApiCallConfig = HttpApiCallConfig;

export interface RegularApiCallPayload {
  type: 'regular';
  readonly config: RegularApiCallConfig;
  readonly aggregatedApiCall: RegularAggregatedApiCall;
}

export interface HttpApiCallPayload {
  type: 'http-gateway';
  readonly config: HttpApiCallConfig;
  readonly aggregatedApiCall: BaseAggregatedApiCall;
}

export interface HttpSignedApiCallPayload {
  type: 'http-signed-data-gateway';
  readonly config: HttpApiCallConfig;
  readonly aggregatedApiCall: HttpSignedDataAggregatedApiCall;
}

export type ApiCallPayload = HttpApiCallPayload | HttpSignedApiCallPayload | RegularApiCallPayload;
