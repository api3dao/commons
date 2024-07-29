import { ethers } from 'ethers';

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateRandomBytes32 = () => {
  return ethers.utils.hexlify(ethers.utils.randomBytes(32));
};
