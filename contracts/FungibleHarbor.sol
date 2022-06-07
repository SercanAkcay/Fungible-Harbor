//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Store.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract FungibleHarbor is AccessControl {
    address public whitelist;
    address public owner;
    bytes32 public constant OWNER_ROLE = keccak256("Owner");
    bytes32 public constant ADMIN_ROLE = keccak256("Admin");
    mapping(address => address) public customerToStore; //store owner to store address

    constructor(address _whitelist) {
        _setupRole(OWNER_ROLE, msg.sender);
        _setRoleAdmin(OWNER_ROLE, ADMIN_ROLE);
        whitelist = _whitelist;
    }

    event StoreCreated(address _customer, address _store);

    function createStore() public {
        require(this.getWhitelist(msg.sender), "You are not on the whitelist");
        Store newStore = new Store(payable(msg.sender), whitelist);
        customerToStore[msg.sender] = address(newStore);
        emit StoreCreated(msg.sender, address(newStore));
    }

    function activateStore(address _customer) public {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender));
        Store(customerToStore[_customer]).activateStore();
    }

    function deactivateStore(address _customer) public {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender));
        Store(customerToStore[_customer]).deactivateStore();
    }

    function emergencyWithdrawalFH(address _owner, address payable _recipient, uint _amount) external {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender));
        Store(customerToStore[_owner]).emergencyWithdraw(_recipient, _amount);
    }

    function grantAdminAccess(address _newAdmin) public {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender));
        grantRole(ADMIN_ROLE, _newAdmin);
    }

    function getWhitelist(address _user) external view returns(bool){
        return MerkleTree(whitelist).checkWhitelist(_user);
    }
}