import { addressSchema, keccak256HashSchema } from './schema';

describe('schema', () => {
  it('validates a valid address', () => {
    expect(() => addressSchema.parse('0x8A45eac0267dD0803Fd957723EdE10693A076698')).not.toThrow();
  });

  it('throws for an invalid address', () => {
    expect(() => addressSchema.parse('0xA8A45eac0267dD0803Fd957723EdE10693A076698')).toThrow(
      expect.objectContaining({ name: 'ZodError' })
    );
  });

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
