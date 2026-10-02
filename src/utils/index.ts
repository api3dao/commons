import { ethers } from 'ethers';

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateRandomBytes32 = () => {
  return ethers.hexlify(ethers.randomBytes(32));
};
