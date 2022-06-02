//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICandyRobbers.sol";

contract CandyRobbersFiat is Ownable, PaymentSplitter, Pausable {
    using Strings for uint256;
    using ECDSA for bytes32;

    ICandyRobbers immutable candyRobbers;

    uint256 public constant price = 0.08 ether;
    uint256 public constant maxMintablePerTx = 5;

    bool public saleEnded = false;

    address[] private team_ = [0x9e9bc682f651c99BA0d7Eeb93eE64a2AD07CE112, 0x11412a492e7ab9F672c83e9586245cE6a70E4388];
    uint256[] private teamShares_ = [97,3];

    constructor(ICandyRobbers _candyRobbers)
        PaymentSplitter(team_, teamShares_)
    {
        candyRobbers = _candyRobbers;
    }

    /**
     * @dev Performs a mint for a different address than msg.sender. Equivalent to a public sale.
     */
    function mintTo(address to, uint256 count) external payable {
        require(!saleEnded, "Sale is ended");
        require(msg.value >= count * price, "Not enough funds");
        require(count < maxMintablePerTx, "Mint too large");


        candyRobbers.mintTo(to, count);

    }

    //End the sale
    function endSale() external onlyOwner {
        saleEnded = true;
    }


}
