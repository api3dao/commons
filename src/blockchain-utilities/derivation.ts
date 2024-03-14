import { ethers } from 'ethers';

import { type Address, addressSchema, type Hex, type Mnemonic } from './schema';

export const PROTOCOL_IDS = {
  RRP: '1',
  PSP: '2',
  RELAYED_RRP: '3',
  RELAYED_PSP: '4',
  AIRSEEKER: '5',
} as const;

export type ProtocolId = (typeof PROTOCOL_IDS)[keyof typeof PROTOCOL_IDS];

export const deriveTemplateIdV0 = (airnode: Address, endpointId: Hex, encodedParameters: Hex) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32', 'bytes'], [airnode, endpointId, encodedParameters]);

export const deriveTemplateIdV1 = (endpointId: Hex, encodedParameters: Hex) =>
  ethers.utils.solidityKeccak256(['bytes32', 'bytes'], [endpointId, encodedParameters]);

export const deriveEndpointId = (oisTitle: string, endpointName: string) =>
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));

export const deriveAirnodeXpub = (airnodeMnemonic: Mnemonic) =>
  ethers.utils.HDNode.fromMnemonic(airnodeMnemonic).derivePath("m/44'/60'/0'").neuter().extendedKey;

export function deriveWalletPathFromSponsorAddress(sponsorAddress: Address, protocolId: ProtocolId) {
  addressSchema.parse(sponsorAddress);

  const sponsorAddressBN = ethers.BigNumber.from(sponsorAddress);
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${protocolId}/${paths.join('/')}`;
}

export const toBytes32String = (input: string) => ethers.utils.formatBytes32String(input);

export const fromBytes32String = (input: Hex) => ethers.utils.parseBytes32String(input);

export const deriveSponsorWallet = (airnodeMnemonic: Mnemonic, dapiName: string, protocolId: ProtocolId) => {
  // Take first 20 bytes of dapiName as sponsor address together with the "0x" prefix.
  const sponsorAddress = ethers.utils.getAddress(dapiName.slice(0, 42)) as Address;
  const sponsorWallet = ethers.Wallet.fromMnemonic(
    airnodeMnemonic,
    `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, protocolId)}`
  );

  return sponsorWallet;
};

export const deriveBeaconId = (airnodeAddress: Address, templateId: Hex) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);

export const deriveBeaconSetId = (beaconIds: Hex[]) =>
  // By convention beacon IDs are sorted alphabetically - the ordering impacts the resulting hash.
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]));
