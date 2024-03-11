import { z } from 'zod';

export const addressSchema = z.string().regex(/^0x[\dA-Fa-f]{40}$/, 'Must be a valid EVM address');

export type Address = z.infer<typeof addressSchema>;

export const keccak256HashSchema = z.string().regex(/^0x[\dA-Fa-f]{64}$/, 'Must be a valid EVM keccak256 hash');

export type Keccak256Hash = z.infer<typeof keccak256HashSchema>;
