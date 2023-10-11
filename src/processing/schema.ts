import { z } from 'zod';

export const apiCallParametersSchema = z.record(z.string(), z.any());

export type ApiCallParameters = z.infer<typeof apiCallParametersSchema>;
