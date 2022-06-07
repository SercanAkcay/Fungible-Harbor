const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MerkleTree", function() {
    let whitelist;
    let a1, a2, a3, a4, a5;

    let a1HexProof = [
        "0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0",
        "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94"
    ];

    let a2HexProof = [
        "0xe9707d0e6171f728f7473c24cc0432a9b07eaaf1efed6a137a4a8c12c79552d9",
        "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94"
    ];

    let a3HexProof = [
        "0x070e8db97b197cc0e4a1790c5e6c3667bab32d733db7f815fbe84f5824c7168d"
    ];

    it("Should create the smart contract", async function() {
        const MerkleTree = await ethers.getContractFactory("contracts/MerkleTree.sol:MerkleTree");
        const mk = await MerkleTree.deploy();
        whitelist = mk;
        const [acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners()
        a1 = acc1;
        a2 = acc2;
        a3 = acc3;
        a4 = acc4;
        a5 = acc5;
    });

    it("Should allow me to mint the contract", async function() {
        const account1 = await ethers.provider.getSigner(a1.address);
        const account2 = await ethers.provider.getSigner(a2.address);
        const account3 = await ethers.provider.getSigner(a3.address);

        const tx1 = await whitelist.connect(account1).whitelistMint(a1HexProof);
        const tx2 = await whitelist.connect(account2).whitelistMint(a2HexProof);
        const tx3 = await whitelist.connect(account3).whitelistMint(a3HexProof);
    });

    it("Should allow claims to whitelisted users", async function() {
        const account1 = await ethers.provider.getSigner(a1.address);
        const account2 = await ethers.provider.getSigner(a2.address);
        const account3 = await ethers.provider.getSigner(a3.address);

        await whitelist.connect(account1).whitelistClaimed(a1.address);
        await whitelist.connect(account2).whitelistClaimed(a2.address);
        await whitelist.connect(account3).whitelistClaimed(a3.address);

        expect(await whitelist.connect(account1).whitelistClaimed(a1.address)).to.equal(true);
        expect(await whitelist.connect(account2).whitelistClaimed(a2.address)).to.equal(true);
        expect(await whitelist.connect(account3).whitelistClaimed(a3.address)).to.equal(true);

    });

    it("Should fail claims for non-whitelisted users", async function(){
        const account4 = await ethers.provider.getSigner(a4.address);
        const account5 = await ethers.provider.getSigner(a5.address);

        await expect(whitelist.connect(account4).whitelistMint(a1HexProof)).to.be.revertedWith("Invalid Merkle Proof.");
        await expect(whitelist.connect(account5).whitelistMint(a2HexProof)).to.be.revertedWith("Invalid Merkle Proof.");

        expect(await whitelist.connect(account4).whitelistClaimed(a4.address)).to.equal(false);
        expect(await whitelist.connect(account5).whitelistClaimed(a5.address)).to.equal(false);

    });

    it("Should reset the merkle root", async function(){
        const account1 = await ethers.provider.getSigner(a1.address);
        const account5 = await ethers.provider.getSigner(a5.address);

        expect(await whitelist.connect(account1).merkleRoot()).to.equal("0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3926");
        await whitelist.connect(account1).changeMerkleRoot("0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3927")
        expect(await whitelist.connect(account1).merkleRoot()).to.equal("0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3927");

        await expect(whitelist.connect(account5).changeMerkleRoot("0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3926")).to.be.revertedWith('Ownable: caller is not the owner');
        expect(await whitelist.connect(account1).merkleRoot()).to.equal("0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3927");
    });

});