//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface MerkleTree {
    function checkWhitelist(address _user) external view returns(bool);
}

contract Store{
    ItemListing[8] public itemListings;
    event customerToWeiSpent(uint128 _itemId, uint128 _amountPurchased, uint _weiSpent, address _customer);
    event customerRequestedRefund(uint128 _itemId, address _customer);
    event payoutComplete(uint _paymentAmount);
    mapping(address => mapping(uint => uint)) public customerItemDelivery; //0-No Order, 1-Awaiting Confirmation (buyer), 2-Refund Request(buyer), 3-Complete
    mapping(address => mapping(uint => uint)) public customerItemWei;
    address payable public storeOwner;
    address public fungibleHarbor;
    address public whitelistContract;
    bool private locked = false;
    bool public active = true;
    uint public pay;

    constructor(address payable _owner, address _whitelistContract) {
        storeOwner = _owner;
        fungibleHarbor = msg.sender;
        whitelistContract = _whitelistContract;
        pay = 0;
    }

    modifier activeStore {
        require(active, "This store is deactivated");
        _;
    }

    modifier onlyOwner {
        require(storeOwner == msg.sender, "You are not the store owner");
        _;
    }

    modifier onlyFH {
        require(msg.sender == fungibleHarbor, "you are not my keeper");
        _;
    }

    modifier nonReentrant {
        require(!locked, "Reentrant call, f(x) is locked");
        locked = true;
        _;
        locked = false;
    }

    struct ItemListing {
        uint128 id;
        uint128 availableSupply;
    }

    function getWhitelist(address _user) external view returns(bool){
        return MerkleTree(whitelistContract).checkWhitelist(_user);
    }

    function addItem(uint128 _itemId, uint128 _supply, uint _slot) public activeStore onlyOwner { 
        ItemListing memory newItem = ItemListing(_itemId, _supply);
        itemListings[_slot] = newItem;
    }

    function removeItem(uint _listingIdx) public activeStore onlyOwner {
        delete itemListings[_listingIdx];
    }

    function purchaseItem(uint _listingIdx, uint128 _amount, uint128 _itemId) external payable activeStore {
        require(this.getWhitelist(msg.sender), "User not in the whitelist");
        require(itemListings[_listingIdx].availableSupply - _amount >= 0, "Purchase amt > avail supply");
        itemListings[_listingIdx].availableSupply -= _amount;
        customerItemDelivery[msg.sender][_itemId] = 1;
        customerItemWei[msg.sender][_itemId] = msg.value;
        emit customerToWeiSpent(_itemId, _amount, msg.value, msg.sender);
    }

    function confirmDelivery(uint128 _itemId) external {
        require(customerItemDelivery[msg.sender][_itemId] == 1);
        customerItemDelivery[msg.sender][_itemId] = 3;
        pay += customerItemWei[msg.sender][_itemId];
        customerItemWei[msg.sender][_itemId] = 0;
    }

    function payOut() public onlyFH nonReentrant {
        require(address(this).balance - pay >= 0, "Insufficient funds in contract");
        payable(storeOwner).transfer((pay * 950 ) / 1000);
        payable(fungibleHarbor).transfer((pay * 50) / 1000);
        emit payoutComplete(pay);
        pay = 0;
    }

    function refund(uint128 _itemId, address payable _customer, uint percentageKept) public onlyOwner nonReentrant {
        uint refundAmount = customerItemWei[_customer][_itemId];
        require(refundAmount > 0);
        require(customerItemDelivery[_customer][_itemId] == 2);
        _customer.transfer((refundAmount * (1000-percentageKept)) / 1000); //90%
        pay += ((refundAmount * percentageKept) / 1000); //10%
        customerItemWei[_customer][_itemId] = 0;
    }

    function requestRefund(uint128 _itemId) external {
        require(customerItemDelivery[msg.sender][_itemId] == 1);
        customerItemDelivery[msg.sender][_itemId] = 2;
        emit customerRequestedRefund(_itemId, msg.sender);
    }

    function deactivateStore() public onlyFH{
        active = false;
    }

    function activateStore() public onlyFH{
        active = true;
    }

    function emergencyWithdraw(address _address, uint _amount) public onlyFH nonReentrant {
        payable(_address).transfer(_amount);
    }
}