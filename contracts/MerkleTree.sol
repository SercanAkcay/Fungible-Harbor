// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleTree is Ownable {
    // Calculated from `merkle_tree.js`
    bytes32 public merkleRoot = 0x55e8063f883b9381398d8fef6fbae371817e8e4808a33a4145b8e3cdd65e3926;
    mapping(address => bool) public activeUserWhitelist;
    mapping(address => bool) public whitelistClaimed;

    // --- FUNCTIONS ---- //

    function whitelistMint(bytes32[] calldata _merkleProof) public {
        require(!whitelistClaimed[msg.sender], "Address already claimed");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid Merkle Proof.");
        whitelistClaimed[msg.sender] = true;
        activeUserWhitelist[msg.sender] = true;
    }

    function changeMerkleRoot(bytes32 _newRoot) public onlyOwner {
        merkleRoot = _newRoot;
    }

    function checkWhitelist(address _user) external view returns(bool) {
        return activeUserWhitelist[_user];
    }

    function removeUserFromWhitelist(address _user) public onlyOwner {
        activeUserWhitelist[_user] = false;
    }
}

