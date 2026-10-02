import { ethers } from 'ethers';

import type { Address, Hex, Mnemonic } from './schema.js';

export const PROTOCOL_IDS = {
  RRP: '1',
  PSP: '2',
  RELAYED_RRP: '3',
  RELAYED_PSP: '4',
  AIRSEEKER: '5',
} as const;

export type ProtocolId = (typeof PROTOCOL_IDS)[keyof typeof PROTOCOL_IDS];

export const deriveTemplateIdV0 = (airnode: Address, endpointId: Hex, encodedParameters: Hex) =>
  ethers.solidityPackedKeccak256(['address', 'bytes32', 'bytes'], [airnode, endpointId, encodedParameters]);

export const deriveTemplateIdV1 = (endpointId: Hex, encodedParameters: Hex) =>
  ethers.solidityPackedKeccak256(['bytes32', 'bytes'], [endpointId, encodedParameters]);

export const deriveEndpointId = (oisTitle: string, endpointName: string) =>
  ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['string', 'string'], [oisTitle, endpointName]));

export const deriveAirnodeXpub = (airnodeMnemonic: Mnemonic) =>
  ethers.HDNodeWallet.fromPhrase(airnodeMnemonic, undefined, "m/44'/60'/0'").neuter().extendedKey;

export function deriveWalletPathFromSponsorAddress(sponsorAddress: Address, protocolId: ProtocolId) {
  const sponsorAddressBigInt = ethers.getBigInt(sponsorAddress);
  const paths = Array.from({ length: 6 }, (_, index) =>
    ethers.mask(sponsorAddressBigInt >> BigInt(31 * index), 31).toString()
  );
  return `${protocolId}/${paths.join('/')}`;
}

export const toBytes32String = (input: string) => ethers.encodeBytes32String(input);

export const fromBytes32String = (input: Hex) => ethers.decodeBytes32String(input);

export const deriveSponsorWallet = (airnodeMnemonic: Mnemonic, dapiName: string, protocolId: ProtocolId) => {
  // Take first 20 bytes of dapiName as sponsor address together with the "0x" prefix.
  const sponsorAddress = ethers.getAddress(dapiName.slice(0, 42)) as Address;
  const sponsorWallet = ethers.HDNodeWallet.fromPhrase(
    airnodeMnemonic,
    undefined,
    `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress, protocolId)}`
  );

  return sponsorWallet;
};

export const deriveBeaconId = (airnodeAddress: Address, templateId: Hex) =>
  ethers.solidityPackedKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);

export const deriveBeaconSetId = (beaconIds: Hex[]) =>
  // By convention beacon IDs are sorted alphabetically - the ordering impacts the resulting hash.
  ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]'], [beaconIds]));

export const deriveHdNodeFromXpub = (xpub: string) => ethers.HDNodeWallet.fromExtendedKey(xpub);

export const verifyAirnodeXpub = (
  airnodeXpub: string,
  airnodeAddress: Address
): ethers.HDNodeWallet | ethers.HDNodeVoidWallet => {
  // The xpub is expected to belong to the hardened path m/44'/60'/0' so we must derive the child default derivation
  // path m/44'/60'/0'/0/0 to compare it and check if xpub belongs to the Airnode wallet.
  const hdNode = deriveHdNodeFromXpub(airnodeXpub);
  if (airnodeAddress !== hdNode.derivePath('0/0').address) {
    throw new Error(`xpub does not belong to Airnode: ${airnodeAddress}`);
  }
  return hdNode;
};

export function deriveSponsorWalletAddress(
  airnodeXpub: string,
  sponsorAddress: Address,
  protocolId: ProtocolId,
  airnodeAddress?: Address
) {
  const hdNode = airnodeAddress ? verifyAirnodeXpub(airnodeXpub, airnodeAddress) : deriveHdNodeFromXpub(airnodeXpub);
  const derivationPath = deriveWalletPathFromSponsorAddress(sponsorAddress, protocolId);
  return hdNode.derivePath(derivationPath).address;
}
