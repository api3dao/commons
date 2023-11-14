import { ethers } from 'ethers';

import {
  deriveAirnodeXpub,
  deriveBeaconId,
  deriveBeaconSetId,
  deriveEndpointId,
  deriveSponsorWallet,
  deriveTemplateId,
  deriveWalletPathFromSponsorAddress,
} from './derivation';

describe('deriveWalletPathFromSponsorAddress', () => {
  it('converts address to derivation path', () => {
    const sponsorAddress = '0x8A45eac0267dD0803Fd957723EdE10693A076698';
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress);
    expect(res).toBe('5/973563544/2109481170/2137349576/871269377/610184194/17');

    const randomAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
    const randomPath = deriveWalletPathFromSponsorAddress(randomAddress);
    expect(res).not.toStrictEqual(randomPath);
  });

  it('converts zero address to derivation path', () => {
    const sponsorAddress = ethers.constants.AddressZero;
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress);
    expect(res).toBe('5/0/0/0/0/0/0');
  });

  it('throws if address is null', () => {
    const sponsorAddress = null;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is undefined', () => {
    const sponsorAddress = undefined;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is an empty string', () => {
    const sponsorAddress = '';
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is invalid', () => {
    let sponsorAddress = '7dD0803Fd957723EdE10693A076698';
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(4));
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  describe('blockchain utilities', () => {
    it('derives a sponsor wallet', () => {
      const dapiName = ethers.utils.formatBytes32String('BTC/ETH');
      const sponsorWallet = deriveSponsorWallet(
        'test test test test test test test test test test test junk',
        dapiName
      );

      expect(sponsorWallet.address).toBe('0x1e6f0dfb1775f5032f12f56a01526351eD3F07aF');
    });

    it('throws deriving a sponsor wallet due to an invalid DApi name', () => {
      const dapiName = 'invalid dapi name';
      const throwingFn = () =>
        deriveSponsorWallet('test test test test test test test test test test test junk', dapiName);

      expect(throwingFn).toThrow(expect.objectContaining({ name: expect.stringContaining('Error') }));
    });

    it(`derives an airnode's xpub from a mnemonic`, () => {
      const xpub = deriveAirnodeXpub('test test test test test test test test test test test junk');

      expect(xpub).toBe(
        'xpub6Ce9NcJvTk36xtLSrJLZqE7wtgA5deCeYs7rSQtreh4cj6ByPtrg9sD7V2FNFLPnf8heNP3FGkeV9qwfzvZNSd54JoNXVsXFYSYwHsnJxqP'
      );
    });

    it(`derives an endpoint ID`, () => {
      const endpointId = deriveEndpointId('weather', 'temperature');

      expect(endpointId).toBe('0x5a82d40e44ecd3ef0906e9e82c1a20f2f4ffe4f613ac70f999047496a9cd4635');
    });

    it(`it derives a template ID`, () => {
      const templateId = deriveTemplateId({
        airnode: '0x4E95C31894a89CdC4288669A6F294836948c862b',
        endpointId: '0x5a82d40e44ecd3ef0906e9e82c1a20f2f4ffe4f613ac70f999047496a9cd4635',
        encodedParameters: '0x1234',
      });

      expect(templateId).toBe('0x7655363f294273f84bcc7c47d79858cf46f21951deee92746d9f17a69ac0b0c0');
    });

    it('derives a beacon ID', () => {
      const beaconId = deriveBeaconId(
        '0xc52EeA00154B4fF1EbbF8Ba39FDe37F1AC3B9Fd4',
        '0x457a3b3da67e394a895ea49e534a4d91b2d009477bef15eab8cbed313925b010'
      );

      expect(beaconId).toBe('0xf5c140bcb4814dfec311d38f6293e86c02d32ba1b7da027fe5b5202cae35dbc6');
    });

    it(`derives a beacon set ID`, () => {
      const beaconSetId = deriveBeaconSetId([
        '0x0e30ed302a3c8eeaa0053caf5fbd0825c86ce1767584d12c69c310f0068b1176',
        '0x496092597aef79595df1567412c6ddefd037f63a5a1572702dd469f62f31f469',
        '0x84c1da28b2f29f0a2b0ff360d537d405d1cd69249fcf5f32ae9c2298cee6da12',
        '0xe8655dc68f2b765c5e6d4a042ba7ba8606cf37e1c8c96676f85364ec5bfe9163',
        '0xf5c140bcb4814dfec311d38f6293e86c02d32ba1b7da027fe5b5202cae35dbc6',
      ]);

      expect(beaconSetId).toBe('0x33bf380fd5b06a317a905b23eaf5c61ef0a9b4a20589a1bf1d13133daca34b0e');
    });
  });
});
