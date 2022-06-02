const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { AbiCoder, arrayify } = require("ethers/lib/utils");
const { ethers, network } = require("hardhat");
const { keccak256 } = require("@ethersproject/keccak256");

require("@nomiclabs/hardhat-waffle");

async function setTimestamp(timestamp) {
    await network.provider.send("evm_setNextBlockTimestamp", [
        BigNumber.from(timestamp).toNumber(),
    ]);
}


describe("CandyRobbersFiat", function () {
    let cr; //CandyRobers
    let crFiat; //CandyRobbersFiat

    let owner;
    let user1;
    let user2;
    let user3;
    let user4;
    let user5;

    beforeEach(async function () {
        await network.provider.send("hardhat_reset");

        const CR = await ethers.getContractFactory("CandyRobbers"); //Candy robbers main contract deployment
        cr = await CR.deploy();
        [owner, user1, user2, user3, user4, user5] = await ethers.getSigners(); //Get multiple signers for merkleTree

        const CR_FIAT = await ethers.getContractFactory("CandyRobbersFiat"); //CandyRobbersFiat deployment
        crFiat = await CR_FIAT.deploy(
            cr.address
        );

        await cr.grantRole(await cr.MINTER_ROLE(), crFiat.address); //Allow CandyRobbersMint to mint on CandyRobbers

    });

    it("Should deploy correctly", async function () {});

    describe("Setters", function () {
        
        it("Should allow only owner to end sale", async function () {
            await expect(crFiat.connect(user1).endSale()).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(crFiat.endSale()).to.not.be.reverted;
            expect(await crFiat.saleEnded()).to.be.true;
        });

    });


    describe("Public", function () {
        it("Should mint one token for another address", async function () {

            await expect(
                crFiat.mintTo(user1.address, 1, {
                    value: await crFiat.price(),
                })
            )
                .to.emit(cr, "Transfer")
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    1
                );
        });

        it("Should mint multiple tokens", async function () {

            await expect(
                crFiat.mintTo(user1.address, 3, {
                    value: (await crFiat.price()).mul(3),
                })
            )
                .to.emit(cr, "Transfer")
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    1
                )
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    2
                )
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    3
                );
        });


        it("Should not mint more than max mintable per tx", async function () {

            const max = await crFiat.maxMintablePerTx();

            await expect(
                crFiat.mintTo(user1.address, max+1, {
                    value: (await crFiat.price()).mul(max+1),
                })
            ).to.be.revertedWith("Mint too large");
        });

    });
});