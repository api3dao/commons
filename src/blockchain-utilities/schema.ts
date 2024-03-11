import { goSync } from '@api3/promise-utils';
import { ethers } from 'ethers';
import { z } from 'zod';

export const addressSchema = z.string().transform((value, ctx) => {
  const goParseAddress = goSync(() => ethers.utils.getAddress(value));
  if (!goParseAddress.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid EVM address' });
    return;
  }

  return goParseAddress.data;
});

export type Address = z.infer<typeof addressSchema>;

export const keccak256HashSchema = z.string().regex(/^0x[\dA-Fa-f]{64}$/, 'Must be a valid EVM keccak256 hash');

export type Keccak256Hash = z.infer<typeof keccak256HashSchema>;
