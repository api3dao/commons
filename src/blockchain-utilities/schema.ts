import { goSync } from '@api3/promise-utils';
import { ethers } from 'ethers';
import { z } from 'zod';

export const hexSchema = z.string().regex(/^0x[\dA-Fa-f]+$/, 'Must be a valid hex string');

export type Hex = `0x${string}`; // Not using z.infer<typeof hexSchema> because the inferred type is just `string`.

export const addressSchema = z.string().transform((value, ctx) => {
  const goParseAddress = goSync(() => ethers.utils.getAddress(value));
  if (!goParseAddress.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid EVM address' });
    return z.NEVER;
  }

  return goParseAddress.data as Hex;
});

export type Address = z.infer<typeof addressSchema>;

export const keccak256HashSchema = z
  .string()
  .regex(/^0x[\dA-Fa-f]{64}$/, 'Must be a valid EVM keccak256 hash')
  .transform((val) => val as Hex);

export type Keccak256Hash = z.infer<typeof keccak256HashSchema>;

export const chainIdSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a valid chain ID')
  .refine((chainId) => Number(chainId) > 0, 'Chain ID must be greater than 0');

export type ChainId = z.infer<typeof chainIdSchema>;

export const ethUnitsSchema = z.union([
  z.literal('wei'),
  z.literal('kwei'),
  z.literal('mwei'),
  z.literal('gwei'),
  z.literal('szabo'),
  z.literal('finney'),
  z.literal('ether'),
]);

export type EthUnits = z.infer<typeof ethUnitsSchema>;

export const mnemonicSchema = z
  .string()
  .refine((mnemonic) => ethers.utils.isValidMnemonic(mnemonic), 'Invalid mnemonic');

export type Mnemonic = z.infer<typeof mnemonicSchema>;
