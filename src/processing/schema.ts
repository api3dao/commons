import type { processingSpecificationSchemaV2, ProcessingSpecification } from '@api3/ois';
import { z } from 'zod';

export type ProcessingSpecificationV2 = z.infer<typeof processingSpecificationSchemaV2>;

export type ProcessingSpecifications = ProcessingSpecification[];

export const endpointParametersSchema = z.record(z.any());

export type EndpointParameters = z.infer<typeof endpointParametersSchema>;

export const preProcessingV2ResponseSchema = z.object({
  endpointParameters: endpointParametersSchema,
});

export type PreProcessingV2Response = z.infer<typeof preProcessingV2ResponseSchema>;

export const postProcessingV2ResponseSchema = z.object({
  response: z.any(),
  timestamp: z.number().nonnegative().int().optional(),
});

export type PostProcessingV2Response = z.infer<typeof postProcessingV2ResponseSchema>;
