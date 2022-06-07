const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FungibleHarbor", function() {
    let user1HexProof = [
    "0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9",
    "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94"
    ];

    let user2HexProof = [
    "0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d"
    ];

    let fungibleHarbor;
    let customerStore;
    let owner;
    let user1;
    let user2;
    let globalWhitelist;
    
    before("Should deploy a Factory",async function() {
        const Whitelist = await ethers.getContractFactory("contracts/MerkleTree.sol:MerkleTree");
        const w = await Whitelist.deploy();
        await w.deployed();
        globalWhitelist = w;
        const [tempOwner, tempUser1, tempUser2] = await ethers.getSigners();
        owner = tempOwner;
        user1 = tempUser1;
        user2 = tempUser2;
      

        const Factory = await ethers.getContractFactory("contracts/FungibleHarbor.sol:FungibleHarbor");
        const fh = await Factory.deploy(globalWhitelist.address);
        await fh.deployed();
        fungibleHarbor = fh;
    });
  
    it("Should deploy a store through FungibleHarbor contract", async function(){
      const user1Signer = await ethers.provider.getSigner(user1.address);
      const Store = await ethers.getContractFactory("contracts/Store.sol:Store");

      await globalWhitelist.connect(user1Signer).whitelistMint(user1HexProof);
      expect(await globalWhitelist.connect(user1Signer).whitelistClaimed(user1.address)).to.equal(true);

      await fungibleHarbor.connect(user1Signer).createStore();
  
      const storeAddress = await fungibleHarbor.customerToStore(user1.address);
      customerStore = await Store.attach(storeAddress);
    });
  
    it("Should deactivate the store through FungibleHarbor contract", async function(){
      expect(await customerStore.active()).to.equal(true);
  
      await fungibleHarbor.deactivateStore(user1.address);
  
      expect(await customerStore.active()).to.equal(false);
    });

    it("Should activate the store through FungibleHarbor contract", async function(){
      expect(await customerStore.active()).to.equal(false);
  
      await fungibleHarbor.activateStore(user1.address);
  
      expect(await customerStore.active()).to.equal(true);
    });
  
    it("Should allow FH to force a withdrawal of all ether in smart contract", async function(){
      const ownerSigner = await ethers.provider.getSigner(owner.address);
      const user1Signer = await ethers.provider.getSigner(user1.address);
      const user2Signer = await ethers.provider.getSigner(user2.address);

      await globalWhitelist.connect(user2Signer).whitelistMint(user2HexProof);
      expect(await globalWhitelist.connect(user2Signer).whitelistClaimed(user2.address)).to.equal(true);

      await fungibleHarbor.connect(ownerSigner).activateStore(user1.address);
  
      await customerStore.connect(user1Signer).addItem(1, 10, 0);
      const itemSupplyBefore = await customerStore.itemListings(0);
      expect(itemSupplyBefore[1]).to.equal("10");
  
      await customerStore.connect(user2Signer).purchaseItem(0, 2, 1, { "value": ethers.utils.parseUnits("1", "ether") });
      const storeBalanceBefore = await ethers.provider.getBalance(customerStore.address);
      expect(storeBalanceBefore).to.equal("1000000000000000000"); //in wei
  
      const itemSupplyAfter = await customerStore.itemListings(0);
      expect(itemSupplyAfter[1]).to.equal("8");
  
      await fungibleHarbor.connect(ownerSigner).emergencyWithdrawalFH(user1.address, user2.address, storeBalanceBefore);
  
      const storeBalanceAfter = await ethers.provider.getBalance(customerStore.address);
      expect(storeBalanceAfter).to.equal("0"); //in wei
    });
});