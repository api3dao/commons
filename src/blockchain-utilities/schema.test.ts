import { addressSchema, hexSchema, keccak256HashSchema, chainIdSchema, ethUnitsSchema, mnemonicSchema } from './schema';

describe('addressSchema', () => {
  it('validates a valid address and returns its checksum', () => {
    expect(addressSchema.parse('0x8a45eac0267dd0803fd957723ede10693a076698')).toBe(
      '0x8A45eac0267dD0803Fd957723EdE10693A076698'
    );
  });

  it('throws for an invalid address', () => {
    expect(() => addressSchema.parse('0xA8A45eac0267dD0803Fd957723EdE10693A076698')).toThrow(
      expect.objectContaining({ name: 'ZodError' })
    );
  });
});

describe('keccak256HashSchema', () => {
  it('validates a valid ID', () => {
    expect(() =>
      keccak256HashSchema.parse('0x3528e42b017a5fbf9d2993a2df04efc3ed474357575065a111b054ddf9de2acc')
    ).not.toThrow();
  });

  it('throws for an invalid ID', () => {
    expect(() =>
      keccak256HashSchema.parse('0xA3528e42b017a5fbf9d2993a2df04efc3ed474357575065a111b054ddf9de2acc')
    ).toThrow(expect.objectContaining({ name: 'ZodError' }));
  });
});

describe('hexSchema', () => {
  it('validates a valid hex string', () => {
    expect(() => hexSchema.parse('0x3528e42b017a5fbf9d2993a2df04efc3ed474357575065a111b054ddf9de2acc')).not.toThrow();
    expect(() => hexSchema.parse('0x3528e42b')).not.toThrow();
  });

  it('throws for an invalid hex string', () => {
    expect(() => hexSchema.parse('3528e42b017a5fbf9d2993a2df04efc3ed474357575065a111b054ddf9de2acc')).toThrow(
      expect.objectContaining({ name: 'ZodError' })
    );
    expect(() => hexSchema.parse('x3528e42b')).toThrow(expect.objectContaining({ name: 'ZodError' }));
    expect(() => hexSchema.parse('')).toThrow(expect.objectContaining({ name: 'ZodError' }));
  });
});

describe('chainIdSchema', () => {
  it('validates a valid chain ID', () => {
    expect(() => chainIdSchema.parse('1')).not.toThrow();
  });

  it('throws for an invalid chain ID', () => {
    expect(() => chainIdSchema.parse('0')).toThrow(expect.objectContaining({ name: 'ZodError' }));
  });
});

describe('ethUnitsSchema', () => {
  it('validates a valid unit', () => {
    expect(() => ethUnitsSchema.parse('wei')).not.toThrow();
    expect(() => ethUnitsSchema.parse('kwei')).not.toThrow();
    expect(() => ethUnitsSchema.parse('mwei')).not.toThrow();
    expect(() => ethUnitsSchema.parse('gwei')).not.toThrow();
    expect(() => ethUnitsSchema.parse('szabo')).not.toThrow();
    expect(() => ethUnitsSchema.parse('finney')).not.toThrow();
    expect(() => ethUnitsSchema.parse('ether')).not.toThrow();
  });

  it('throws for an invalid unit', () => {
    expect(() => ethUnitsSchema.parse('wei2')).toThrow(expect.objectContaining({ name: 'ZodError' }));
  });
});

describe('mnemonicSchema', () => {
  it('validates a valid mnemonic', () => {
    expect(() =>
      mnemonicSchema.parse('destroy manual orange pole pioneer enemy detail lady cake bus shed visa')
    ).not.toThrow();
  });

  it('throws for an invalid mnemonic', () => {
    expect(() =>
      mnemonicSchema.parse('destroy manual orange pole pioneer enemy detail lady cake bus shed WTF')
    ).toThrow(expect.objectContaining({ name: 'ZodError' }));
  });
});
