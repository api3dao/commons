import { z } from 'zod';

export const apiCallParametersSchema = z.record(z.any());

export type ApiCallParameters = z.infer<typeof apiCallParametersSchema>;

export const preProcessingV2ResponseSchema = z.object({
  apiCallParameters: apiCallParametersSchema,
});

export type PreProcessingV2Response = z.infer<typeof preProcessingV2ResponseSchema>;

export const postProcessingV2ResponseSchema = z.object({
  apiCallResponse: z.any(),
  timestamp: z.number().nonnegative().int().optional(),
});

export type PostProcessingV2Response = z.infer<typeof postProcessingV2ResponseSchema>;
