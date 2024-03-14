import { ethers } from 'ethers';

import { type Address, addressSchema } from './schema';

export const PROTOCOL_IDS = {
  RRP: '1',
  PSP: '2',
  RELAYED_RRP: '3',
  RELAYED_PSP: '4',
  AIRSEEKER: '5',
};

/**
 * Derives a template ID from the input parameters
 *
 * @param airnode an Airnode address
 * @param encodedParameters encoded parameters, see the airnode/abi package's encode function
 * @param endpointId An endpointID (see deriveEndpointId)
 */
export const deriveTemplateIdV0 = (airnode: Address, endpointId: string, encodedParameters: string) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32', 'bytes'], [airnode, endpointId, encodedParameters]);

export const deriveTemplateIdV1 = (endpointId: string, encodedParameters: string) =>
  ethers.utils.solidityKeccak256(['bytes32', 'bytes'], [endpointId, encodedParameters]);

/**
 * Derives an endpoint ID
 *
 * @param oisTitle the OIS title
 * @param endpointName the endpoint name
 */
export const deriveEndpointId = (oisTitle: string, endpointName: string) =>
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string', 'string'], [oisTitle, endpointName]));

/**
 * Derives an airnode address's xpub, required for allowing signed data consumers to verify authenticity
 *
 * @param airnodeMnemonic the airnode's mnemonic
 */
export const deriveAirnodeXpub = (airnodeMnemonic: string) =>
  ethers.utils.HDNode.fromMnemonic(airnodeMnemonic).derivePath("m/44'/60'/0'").neuter().extendedKey;

/**
 * Derives a wallet path from a sponsor address, used for calculating a sponsor wallet.
 *
 * @param sponsorAddress an EVM-compatible address
 * @param protocolId an API application protocol ID
 */
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

/**
 * Encodes/formats a string as a hex-encoded bytes32 string.
 *
 * @param input the input string
 */
export const toBytes32String = (input: string) => ethers.utils.formatBytes32String(input);

/**
 * Decodes a hex-encoded bytes32 string to a normal string.
 *
 * @param input the input hex string
 */
export const fromBytes32String = (input: string) => ethers.utils.parseBytes32String(input);

/**
 * Derives a sponsor wallet, given a mnemonic and dapiName.
 *
 * @param sponsorWalletMnemonic the sponsor wallet mnemonic
 * @param dapiName the dapi name
 */
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

/**
 * Derives the ID of a single beacon
 *
 * @param airnodeAddress the airnode address of the provider that supplies the data used to update this beacon
 * @param templateId the templateId of the template used to generate the data used to update this beacon
 */
export const deriveBeaconId = (airnodeAddress: string, templateId: string) =>
  ethers.utils.solidityKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);

/**
 * Derives the ID of a set of beacons.
 * By convention beacon IDs are sorted alphabetically - the ordering impacts the resulting hash.
 *
 * @param beaconIds an ordered array of beacon ids
 */
export const deriveBeaconSetId = (beaconIds: string[]) =>
  ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]));
