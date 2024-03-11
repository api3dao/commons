import { ethers } from 'ethers';

import {
  deriveAirnodeXpub,
  deriveBeaconId,
  deriveBeaconSetId,
  deriveEndpointId,
  deriveSponsorWallet,
  deriveTemplateIdV0,
  deriveTemplateIdV1,
  deriveWalletPathFromSponsorAddress,
  fromBytes32String,
  PROTOCOL_IDS,
  toBytes32String,
} from './derivation';
import type { Address } from './schema';

describe('deriveWalletPathFromSponsorAddress', () => {
  it('converts address to derivation path', () => {
    const sponsorAddress = '0x8A45eac0267dD0803Fd957723EdE10693A076698';
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER);
    expect(res).toBe('5/973563544/2109481170/2137349576/871269377/610184194/17');

    const randomAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20))) as Address;
    const randomPath = deriveWalletPathFromSponsorAddress(randomAddress, PROTOCOL_IDS.AIRSEEKER);
    expect(res).not.toStrictEqual(randomPath);
  });

  it('converts zero address to derivation path', () => {
    const sponsorAddress = ethers.constants.AddressZero;
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER);
    expect(res).toBe('5/0/0/0/0/0/0');
  });

  it('throws if address is null', () => {
    const sponsorAddress = null;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is undefined', () => {
    const sponsorAddress = undefined;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is an empty string', () => {
    const sponsorAddress = '' as Address;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  it('throws if address is invalid', () => {
    let sponsorAddress = '7dD0803Fd957723EdE10693A076698' as Address;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(4)) as Address;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(32)) as Address;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER)).toThrow(
      expect.objectContaining({ name: expect.stringContaining('Error') })
    );
  });

  describe('blockchain utilities', () => {
    it('derives a sponsor wallet', () => {
      const dapiName = ethers.utils.formatBytes32String('BTC/ETH');
      const sponsorWallet = deriveSponsorWallet(
        'test test test test test test test test test test test junk',
        dapiName,
        'AIRSEEKER'
      );

      expect(sponsorWallet.address).toBe('0x1e6f0dfb1775f5032f12f56a01526351eD3F07aF');
    });

    it('throws deriving a sponsor wallet due to an invalid DApi name', () => {
      const dapiName = 'invalid dapi name';
      const throwingFn = () =>
        deriveSponsorWallet('test test test test test test test test test test test junk', dapiName, 'AIRSEEKER');

      expect(throwingFn).toThrow(expect.objectContaining({ name: expect.stringContaining('Error') }));
    });

    it('derives the same sponsor wallet as Airnode', () => {
      function deriveSponsorWalletAirnode(masterHDNode: ethers.utils.HDNode, sponsorAddress: string): ethers.Wallet {
        const sponsorWalletHdNode = masterHDNode.derivePath(
          `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, 'RRP')}`
        );
        return new ethers.Wallet(sponsorWalletHdNode.privateKey);
      }
      const mnemonic = 'test test test test test test test test test test test junk';
      const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);

      const expectedSponsorWallet = deriveSponsorWalletAirnode(hdNode, '0xd22967044D175bfa7c12DE8f8aE3c6fF773A3C9f');
      const actualSponsorWallet = deriveSponsorWallet(mnemonic, '0xd22967044D175bfa7c12DE8f8aE3c6fF773A3C9f', 'RRP');

      expect(actualSponsorWallet.address).toBe(expectedSponsorWallet.address);
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

    it(`it derives a template ID V0`, () => {
      const templateId = deriveTemplateIdV0(
        '0x4E95C31894a89CdC4288669A6F294836948c862b',
        '0x5a82d40e44ecd3ef0906e9e82c1a20f2f4ffe4f613ac70f999047496a9cd4635',
        '0x6466726f6d63455448'
      );

      expect(templateId).toBe('0x25ea8b12135e4b8d49960ef9e0f967b7c0ccad136b955fbb7fbeb76da27d60b0');
    });

    it('derives templateId for V1', () => {
      const expectedTemplateIdV1 = deriveTemplateIdV1(
        '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
        '0x6466726f6d63455448'
      );

      expect(expectedTemplateIdV1).toBe('0xe5d99287b5a870c3453bc0b42769c6f37cf4a3143890e9c34753181171fac842');
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

    it('encodes a string as a bytes32 string', () => {
      const formattedString = toBytes32String('test string');

      expect(formattedString).toBe('0x7465737420737472696e67000000000000000000000000000000000000000000');
    });

    it('decodes a bytes32 string to a normal string', () => {
      const formattedString = fromBytes32String('0x7465737420737472696e67000000000000000000000000000000000000000000');

      expect(formattedString).toBe('test string');
    });
  });
});
