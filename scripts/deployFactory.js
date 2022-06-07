const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const Whitelist = await hre.ethers.getContractFactory("MerkleTree");
  const w = await Whitelist.deploy("My whitelist");
  await w.deploy("Whitelist deployed to:", w.address);
  console.log("Whitelist deployed to: ", w.address);

  const FungibleHarbor = await hre.ethers.getContractFactory("FungibleHarbor");
  const fh = await FungibleHarbor.deploy("My factory");
  await fh.deployed();
  console.log("FungibleHarbor deployed to:", fh.address);

  fs.writeFileSync('./config.js', `
  export const fungibleHarborAddress = "${fh.address}"
  export const harborOwnerAddress = "${fh.signer.address}"
  export const whitelistAddress = "${w.address}"
  export const whitelistOwnerAddress = "${w.signer.address}"
  `)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
