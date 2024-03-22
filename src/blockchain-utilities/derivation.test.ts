import { ethers } from 'ethers';

import {
  deriveAirnodeXpub,
  deriveBeaconId,
  deriveBeaconSetId,
  deriveEndpointId,
  deriveSponsorWallet,
  deriveSponsorWalletAddress,
  deriveTemplateIdV0,
  deriveTemplateIdV1,
  deriveWalletPathFromSponsorAddress,
  fromBytes32String,
  PROTOCOL_IDS,
  toBytes32String,
  verifyAirnodeXpub,
} from './derivation';
import type { Address } from './schema';

describe(deriveWalletPathFromSponsorAddress.name, () => {
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
});

describe(deriveSponsorWallet.name, () => {
  it('derives a sponsor wallet', () => {
    const dapiName = ethers.utils.formatBytes32String('BTC/ETH');
    const sponsorWallet = deriveSponsorWallet(
      'test test test test test test test test test test test junk',
      dapiName,
      '1'
    );

    expect(sponsorWallet.address).toBe('0x4f86228e0Bc58829Cd77547224291bb8d212174D');
  });

  it('throws deriving a sponsor wallet due to an invalid DApi name', () => {
    const dapiName = 'invalid dapi name';
    const throwingFn = () =>
      deriveSponsorWallet('test test test test test test test test test test test junk', dapiName, '5');

    expect(throwingFn).toThrow(expect.objectContaining({ name: expect.stringContaining('Error') }));
  });

  it('derives the same sponsor wallet as Airnode', () => {
    function deriveSponsorWalletAirnode(masterHDNode: ethers.utils.HDNode, sponsorAddress: Address): ethers.Wallet {
      const sponsorWalletHdNode = masterHDNode.derivePath(
        `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, '1')}`
      );
      return new ethers.Wallet(sponsorWalletHdNode.privateKey);
    }
    const mnemonic = 'achieve climb couple wait accident symbol spy blouse reduce foil echo label';
    const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);

    // https://github.com/api3dao/airnode/blob/a4c17c28c8b31c9fb13d2828764b89f1063b702f/packages/airnode-node/src/evm/wallet.test.ts#L25
    const expectedSponsorWallet = deriveSponsorWalletAirnode(hdNode, '0x06f509f73eefba36352bc8228f9112c3786100da');
    const actualSponsorWallet = deriveSponsorWallet(mnemonic, '0x06f509f73eefba36352bc8228f9112c3786100da', '1');

    expect(actualSponsorWallet.address).toBe(expectedSponsorWallet.address);
    expect(actualSponsorWallet.address).toBe('0x228A54F33E46fbb32a62ca650Fcc9eD3C730511d');
  });
});

describe(deriveAirnodeXpub.name, () => {
  it(`derives an airnode's xpub from a mnemonic`, () => {
    const xpub = deriveAirnodeXpub('test test test test test test test test test test test junk');

    expect(xpub).toBe(
      'xpub6Ce9NcJvTk36xtLSrJLZqE7wtgA5deCeYs7rSQtreh4cj6ByPtrg9sD7V2FNFLPnf8heNP3FGkeV9qwfzvZNSd54JoNXVsXFYSYwHsnJxqP'
    );
  });
});

describe(deriveEndpointId.name, () => {
  it(`derives an endpoint ID`, () => {
    const endpointId = deriveEndpointId('weather', 'temperature');

    expect(endpointId).toBe('0x5a82d40e44ecd3ef0906e9e82c1a20f2f4ffe4f613ac70f999047496a9cd4635');
  });
});

describe(deriveTemplateIdV0.name, () => {
  it(`it derives a template ID V0`, () => {
    const templateId = deriveTemplateIdV0(
      '0x4E95C31894a89CdC4288669A6F294836948c862b',
      '0x5a82d40e44ecd3ef0906e9e82c1a20f2f4ffe4f613ac70f999047496a9cd4635',
      '0x6466726f6d63455448'
    );

    expect(templateId).toBe('0x25ea8b12135e4b8d49960ef9e0f967b7c0ccad136b955fbb7fbeb76da27d60b0');
  });
});

describe(deriveTemplateIdV1.name, () => {
  it('derives templateId for V1', () => {
    const expectedTemplateIdV1 = deriveTemplateIdV1(
      '0x2f3a3adf6daf5a3bb00ab83aa82262a6a84b59b0a89222386135330a1819ab48',
      '0x6466726f6d63455448'
    );

    expect(expectedTemplateIdV1).toBe('0xe5d99287b5a870c3453bc0b42769c6f37cf4a3143890e9c34753181171fac842');
  });
});

describe(deriveBeaconId.name, () => {
  it('derives a beacon ID', () => {
    const beaconId = deriveBeaconId(
      '0xc52EeA00154B4fF1EbbF8Ba39FDe37F1AC3B9Fd4',
      '0x457a3b3da67e394a895ea49e534a4d91b2d009477bef15eab8cbed313925b010'
    );

    expect(beaconId).toBe('0xf5c140bcb4814dfec311d38f6293e86c02d32ba1b7da027fe5b5202cae35dbc6');
  });
});

describe(deriveBeaconSetId.name, () => {
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

describe(toBytes32String.name, () => {
  it('encodes a string as a bytes32 string', () => {
    const formattedString = toBytes32String('test string');

    expect(formattedString).toBe('0x7465737420737472696e67000000000000000000000000000000000000000000');
  });
});

describe(fromBytes32String.name, () => {
  it('decodes a bytes32 string to a normal string', () => {
    const formattedString = fromBytes32String('0x7465737420737472696e67000000000000000000000000000000000000000000');

    expect(formattedString).toBe('test string');
  });
});

describe(verifyAirnodeXpub.name, () => {
  it('does not throw for valid xpub/airnode combination', () => {
    expect(() =>
      verifyAirnodeXpub(
        'xpub6CvZvZuFtPUtNirE36eMqYu8pRa1CEQuDon9tT4G8fisU3jj38Sn53TxdHb1SUvWiwVjJ68ytPZf45gnPM7Kg4g4CNTdyjJMevDQ1wk4tYD',
        '0x02F5BD238B866c36f7d7b144D2889fB5e594474e'
      )
    ).not.toThrow();
  });

  it('throws when the xpub is invalid', () => {
    expect(() =>
      verifyAirnodeXpub(
        'xpub6CvZvZuFtPUtNirE36eMqYu8pRa1CEQuDon9tT4G8fisU3jj38Sn53TxdHb1SUvWiwVjJ68ytPZf45gnPM7Kg4g4CNTdyjJMevDQ1wk4tYD',
        '0xDdfd47366cA427e75C26c9F3364EE37b33e1DD38'
      )
    ).toThrow('xpub does not belong to Airnode: 0xDdfd47366cA427e75C26c9F3364EE37b33e1DD38');
  });
});

describe(deriveSponsorWalletAddress, () => {
  it('derives the sponsor wallet address and verifies airnode address', () => {
    const sponsorWalletAddress = deriveSponsorWalletAddress(
      'xpub6CvZvZuFtPUtNirE36eMqYu8pRa1CEQuDon9tT4G8fisU3jj38Sn53TxdHb1SUvWiwVjJ68ytPZf45gnPM7Kg4g4CNTdyjJMevDQ1wk4tYD',
      '0xE9232cde1f37B029dfbB403f79429f912D7405F3',
      '1',
      '0x02F5BD238B866c36f7d7b144D2889fB5e594474e'
    );

    expect(sponsorWalletAddress).toBe('0xDdfd47366cA427e75C26c9F3364EE37b33e1DD38');
  });

  it('derives the sponsor wallet without xpub verifification', () => {
    const sponsorWalletAddress = deriveSponsorWalletAddress(
      'xpub6CvZvZuFtPUtNirE36eMqYu8pRa1CEQuDon9tT4G8fisU3jj38Sn53TxdHb1SUvWiwVjJ68ytPZf45gnPM7Kg4g4CNTdyjJMevDQ1wk4tYD',
      '0xE9232cde1f37B029dfbB403f79429f912D7405F3',
      '1'
    );

    expect(sponsorWalletAddress).toBe('0xDdfd47366cA427e75C26c9F3364EE37b33e1DD38');
  });

  it('verifies that xpub is valid when airnode address is provided', () => {
    expect(() =>
      deriveSponsorWalletAddress(
        'xpub6CvZvZuFtPUtNirE36eMqYu8pRa1CEQuDon9tT4G8fisU3jj38Sn53TxdHb1SUvWiwVjJ68ytPZf45gnPM7Kg4g4CNTdyjJMevDQ1wk4tYD',
        '0xE9232cde1f37B029dfbB403f79429f912D7405F3',
        '1',
        '0xA143283e75c8e0a3174d51e6ccA38B334E1D6b12'
      )
    ).toThrow('xpub does not belong to Airnode: 0xA143283e75c8e0a3174d51e6ccA38B334E1D6b12');
  });
});
