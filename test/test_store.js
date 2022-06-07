const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Store", function () {
  let ownerHexProof = [
    "0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0",
    "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94"
  ];

  let user1HexProof = [
    "0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9",
    "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94"
  ];

  let user2HexProof = [
    "0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d"
  ];

  let globalStore;
  let globalWhitelist;
  let owner;
  let user1;
  let user2; 
  
  before("Should deploy a store and a MerkleTree", async function() {
    const Whitelist = await ethers.getContractFactory("contracts/MerkleTree.sol:MerkleTree");
    const w = await Whitelist.deploy();
    await w.deployed();
    globalWhitelist = w;
    const [tempOwner, tempUser1, tempUser2] = await ethers.getSigners();
    owner = tempOwner;
    user1 = tempUser1;
    user2 = tempUser2;
    
    const Store = await ethers.getContractFactory("contracts/Store.sol:Store");
    const store = await Store.deploy(owner.address, globalWhitelist.address);
    await store.deployed();
    globalStore = store;
  });

  it("Should add an item to the store as a listing", async function() {
    await globalStore.addItem(1, 10, 0); //Additem: itemId, supply, item index in listings array

    const itemStruct = await globalStore.itemListings(0);
    const itemId = itemStruct[0];
    const itemSupply = itemStruct[1];
    expect(itemId).to.equal(1);
    expect(itemSupply).to.equal(10);
  });

  it("Should fail if you are not whitelisted", async function(){
    const ownerSigner = await ethers.provider.getSigner(user1.address);
    expect(await globalWhitelist.connect(ownerSigner).whitelistClaimed(user1.address)).to.equal(false);

    const itemSupplyBefore = await globalStore.itemListings(0);
    expect(itemSupplyBefore[1]).to.equal(10);

    await expect(globalStore.connect(ownerSigner).purchaseItem(0, 2, 1)).to.be.revertedWith('User not in the whitelist');

    const itemSupplyAfter = await globalStore.itemListings(0);
    expect(itemSupplyAfter[1]).to.equal(10);
  });

  it("Should allow you to purchase an item after whitelisting", async function(){
    const ownerSigner = await ethers.provider.getSigner(owner.address);
    const user1Signer = await ethers.provider.getSigner(user1.address);
    const user2Signer = await ethers.provider.getSigner(user2.address);
    globalStore.connect(ownerSigner);
    
    await globalWhitelist.connect(user1Signer).whitelistMint(user1HexProof);
    expect(await globalWhitelist.connect(user1Signer).whitelistClaimed(user1.address)).to.equal(true);

    await globalWhitelist.connect(user2Signer).whitelistMint(user2HexProof);
    expect(await globalWhitelist.connect(user2Signer).whitelistClaimed(user2.address)).to.equal(true);
    
    const itemSupplyBefore = await globalStore.itemListings(0);
    expect(itemSupplyBefore[1]).to.equal("10");

    await globalStore.connect(user1Signer).purchaseItem(0, 2, 1, { "value": ethers.utils.parseUnits("1", "ether") });
    await globalStore.connect(user2Signer).purchaseItem(0, 2, 1, { "value": ethers.utils.parseUnits("1", "ether") });
    globalStore.connect(ownerSigner);

    const itemSupplyAfter = await globalStore.itemListings(0);
    expect(itemSupplyAfter[1]).to.equal("6");

    const storeBalance = await ethers.provider.getBalance(globalStore.address);
    expect(storeBalance).to.equal("2000000000000000000"); //in wei

    // const user1Balance = await ethers.provider.getBalance(user1.address);
    // console.log(user1Balance);
  });

  it("Should allow the customer to confirm the delivery", async function(){
    const user1Signer = await ethers.provider.getSigner(user1.address);
    
    const paymentBefore = await globalStore.pay();
    expect(paymentBefore).to.equal("0");
    expect(await globalStore.connect(user1Signer).confirmDelivery(1));
    const paymentAfter = await globalStore.pay();
    expect(paymentAfter).to.equal("1000000000000000000");

  })

  it("Should allow customer to receive payout and fungibleharbor to get the tax", async function(){
    const storeBalanceBefore = await ethers.provider.getBalance(globalStore.address);
    expect(storeBalanceBefore).to.equal("2000000000000000000");

    const ownerBefore = await ethers.provider.getBalance(owner.address);

    await globalStore.payOut();

    const storeBalanceAfter = await ethers.provider.getBalance(globalStore.address);
    expect(storeBalanceAfter).to.equal("1000000000000000000");
    
    const ownerAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerAfter - ownerBefore == ethers.utils.parseUnits("1", "ether"));
  });

  it("Should allow the customer to request a refund", async function(){
    const user2Signer = await ethers.provider.getSigner(user2.address);
    await globalStore.connect(user2Signer).requestRefund(1);
    expect(await globalStore.customerItemDelivery(user2.address, 1)).to.equal("2");
  });

  it("Should refund the user with 10% fee", async function(){
    const storeBalanceBefore = await ethers.provider.getBalance(globalStore.address);
    expect(storeBalanceBefore).to.equal("1000000000000000000");

    //const ownerBefore = await ethers.provider.getBalance(owner.address);
    //const u2Before = await ethers.provider.getBalance(user2.address);
    const percentKept = 10;

    await globalStore.refund(1, user2.address, percentKept*10); //mult percentKept by 10 for contract

    const storeBalanceAfter = await ethers.provider.getBalance(globalStore.address);
    expect(storeBalanceAfter).to.equal("100000000000000000"); // 10% of the total refund

    //const ownerAfter = await ethers.provider.getBalance(owner.address);
    //const u2After = await ethers.provider.getBalance(user2.address);
  });

  it("Should remove an item from the store", async function() {
    const [owner] = await ethers.getSigners();

    const itemIdBefore = await globalStore.itemListings(0);
    expect(itemIdBefore[0]).to.equal("1");

    await globalStore.removeItem(0);

    const itemId = await globalStore.itemListings(0);
    expect(itemId[0]).to.equal("0");
  });
});
