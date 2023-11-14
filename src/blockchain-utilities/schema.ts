import { z } from 'zod';

export const addressSchema = z.string().regex(/^0x[\dA-Fa-f]{40}$/, 'Must be a valid EVM address');

export const idSchema = z.string().regex(/^0x[\dA-Fa-f]{64}$/, 'Must be a valid EVM hash');

export type Address = z.infer<typeof addressSchema>;
export type Id = z.infer<typeof idSchema>;
