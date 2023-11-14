import { ethers } from 'ethers';

import { addressSchema } from './schema';

export const PROTOCOL_IDS = {
  RRP: '1',
  PSP: '2',
  RELAYED_RRP: '3',
  RELAYED_PSP: '4',
  AIRSEEKER: '5',
};

export interface Template {
  airnode: string;
  encodedParameters: string;
  endpointId: string;
}

export const deriveTemplateId = ({ airnode, encodedParameters, endpointId }: Template) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32', 'bytes'], [airnode, endpointId, encodedParameters]);

export const deriveEndpointId = (oisTitle: string, endpointName: string) =>
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));

export const deriveAirnodeXpub = (airnodeMnemonic: string) =>
  ethers.utils.HDNode.fromMnemonic(airnodeMnemonic).derivePath("m/44'/60'/0'").neuter().extendedKey;

export function deriveWalletPathFromSponsorAddress(sponsorAddress: string, protocolId: string) {
  addressSchema.parse(sponsorAddress);

  const sponsorAddressBN = ethers.BigNumber.from(sponsorAddress);
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${protocolId}/${paths.join('/')}`;
}

export const formatBytes32String = (input: string) => ethers.utils.formatBytes32String(input);

export const deriveSponsorWallet = (sponsorWalletMnemonic: string, dapiName: string) => {
  // Take first 20 bytes of dapiName as sponsor address together with the "0x" prefix.
  const sponsorAddress = ethers.utils.getAddress(dapiName.slice(0, 42));
  const sponsorWallet = ethers.Wallet.fromMnemonic(
    sponsorWalletMnemonic,
    `m/44'/60'/0'/${
      (deriveWalletPathFromSponsorAddress(sponsorAddress, PROTOCOL_IDS.AIRSEEKER), PROTOCOL_IDS.AIRSEEKER)
    }`
  );

  return sponsorWallet;
};

export const deriveBeaconId = (airnodeAddress: string, templateId: string) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);

export const deriveBeaconSetId = (beaconIds: string[]) =>
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]));
