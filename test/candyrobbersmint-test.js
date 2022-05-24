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

async function getMintMessage(signer, max, address){
    
    const coder = new AbiCoder();
    const encoded = coder.encode(
        ["uint256","address"],
        [max,address]
    );
    const hash = keccak256(encoded);
    const signature = await signer.signMessage(arrayify(hash));

    return {max: max, signature: signature};

}

const MAX_MINT_WHITELIST  = 3;

describe("CandyRobbersMint", function () {
    let cr; //CandyRobers
    let crMint; //CandyRobbersMint

    let owner;
    let user1;
    let user2;
    let user3;
    let user4;
    let user5;

    let whitelistWallet;

    beforeEach(async function () {
        await network.provider.send("hardhat_reset");

        const CR = await ethers.getContractFactory("CandyRobbers"); //Candy robbers main contract deployment
        cr = await CR.deploy();
        [owner, user1, user2, user3, user4, user5] = await ethers.getSigners(); //Get multiple signers for merkleTree

        const CR_MINT = await ethers.getContractFactory("CandyRobbersMint"); //CandyRobbersMint deployment
        crMint = await CR_MINT.deploy(
            cr.address
        );

        await cr.grantRole(await cr.MINTER_ROLE(), crMint.address); //Allow CandyRobbersMint to mint on CandyRobbers


        whitelistWallet = new ethers.Wallet.createRandom();

        await crMint.setWhitelistAddress(whitelistWallet.address)

    });

    it("Should deploy correctly", async function () {});

    describe("Setters", function () {
        
        it("Should allow only owner to pause sale", async function () {
            await expect(crMint.connect(user1).pause()).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(crMint.pause()).to.not.be.reverted;
            expect(await crMint.paused()).to.be.true;
        });

    });

    describe("Presale", function () {
        it("Should mint one token", async function () {
            await setTimestamp(await crMint.saleStart());

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: await crMint.presalePrice(),
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
            await setTimestamp(await crMint.saleStart());

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(3, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: (await crMint.presalePrice()).mul(3),
                })
            )
                .to.emit(cr, "Transfer")
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    3
                )
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    1
                )
                .withArgs(
                    ethers.constants.AddressZero,
                    await user1.getAddress(),
                    2
                );
        });

        it("Should not mint more than max token", async function () {
            await setTimestamp(await crMint.saleStart());

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(MAX_MINT_WHITELIST + 1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: (await crMint.presalePrice()).mul(MAX_MINT_WHITELIST + 1),
                })
            ).to.be.revertedWith("You can't mint more NFTs!");
        });

        it("Should be closed before start", async function () {
            await setTimestamp((await crMint.saleStart()).sub(1));

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: await crMint.presalePrice(),
                })
            ).to.be.revertedWith("Whitelist mint is not started yet!");
        });

        it("Should be closed after end", async function () {
            await setTimestamp((await crMint.saleStart()).add(1));

            await crMint.endSale();

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: await crMint.presalePrice(),
                })
            ).to.be.revertedWith("Sale is ended");
        });

        it("Should open on time", async function () {
            await setTimestamp(await crMint.saleStart());

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);

            await expect(
                crMint.connect(user1).presaleMint(1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: await crMint.presalePrice(),
                })
            ).to.not.be.reverted;
        });

        it("Should not mint if wrong message is sent", async function () {
            await setTimestamp(await crMint.saleStart());

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user2.address);

            //Mint as user1 with mintMessage for user2
            await expect(
                crMint.connect(user1).presaleMint(1, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: await crMint.presalePrice(),
                })
            ).to.be.revertedWith("SIGNATURE_VALIDATION_FAILED");
        });

        it("Should not mint more than max supply", async function () {
            await setTimestamp((await crMint.saleStart()));

            const mintMessage = await getMintMessage(whitelistWallet, MAX_MINT_WHITELIST, user1.address);


            await crMint.setMaxSupply(1);

            await expect(
                crMint.connect(user1).presaleMint(2, MAX_MINT_WHITELIST, mintMessage.signature, {
                    value: (await crMint.presalePrice()).mul(2),
                })
            ).to.be.revertedWith("SOLD OUT!");
        });

    });

    describe("Public", function () {
        it("Should mint one token", async function () {
            await setTimestamp(await crMint.saleStart());

            await expect(
                crMint.connect(user1).publicSaleMint(1, {
                    value: await crMint.price(),
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
            await setTimestamp(await crMint.saleStart());

            await expect(
                crMint.connect(user1).publicSaleMint(3, {
                    value: (await crMint.price()).mul(3),
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

        it("Should not be open before start", async function () {
            await setTimestamp((await crMint.saleStart()).sub(2));

            await expect(
                crMint.connect(user1).publicSaleMint(1, {
                    value: await crMint.price(),
                })
            ).to.be.revertedWith("Public sale not started");
        });

        it("Should open on time", async function () {
            await setTimestamp(await crMint.saleStart());

            await expect(
                crMint.connect(user1).publicSaleMint(1, {
                    value: await crMint.price(),
                })
            ).to.be.not.reverted;
        });

        it("Should be closed when sale is closed", async function () {
            await setTimestamp(await crMint.saleStart());
            await crMint.endSale();

            await expect(
                crMint.connect(user1).publicSaleMint(1, {
                    value: await crMint.price(),
                })
            ).to.be.revertedWith("Sale is ended");
        });

        it("Should not mint more than max mintable per tx", async function () {
            await setTimestamp(await crMint.saleStart());

            const max = await crMint.maxMintablePerTx();

            await expect(
                crMint.publicSaleMint(max.add(1), {
                    value: (await crMint.price()).mul(max.add(1)),
                })
            ).to.be.revertedWith("Mint too large");
        });

        it("Should not mint more than max supply", async function () {
            await setTimestamp(await crMint.saleStart());

            await crMint.setMaxSupply(1);

            await expect(
                crMint.publicSaleMint(2, {
                    value: (await crMint.price()).mul(2),
                })
            ).to.be.revertedWith("Sold out!");
        });

    });
});