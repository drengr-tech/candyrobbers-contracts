const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, formatBytes32String } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("CandyRobbers", function () {
    let cr;

    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        const CR = await ethers.getContractFactory("CandyRobbers");
        [owner, user1, user2] = await ethers.getSigners();
        cr = await CR.deploy();
        await cr.grantRole(await cr.MINTER_ROLE(), owner.address);
    });

    describe("Access Control", function () {
        it("Should allow MINTER addresses to mint", async function () {
            await cr.grantRole(await cr.MINTER_ROLE(), user1.address);

            await cr.connect(user1).mintTo(user1.address, 10);

            expect(await cr.balanceOf(user1.address)).to.be.equal(10);
        });

        it("Should not allow non MINTER addresses to mint", async function () {
            await expect(
                cr.connect(user1).mintTo(user1.address, 10)
            ).to.be.revertedWith("You are not allowed to perform this action.");
        });

        it("Should allow admin role to grant minter role", async function () {
            await cr.grantRole(await cr.MINTER_ROLE(), user2.address);

            expect(await cr.hasRole(await cr.MINTER_ROLE(), user2.address)).to
                .be.true;
        });

        it("Should allow admin role to revoke minter role", async function () {
            await cr.grantRole(await cr.MINTER_ROLE(), user2.address);
            await cr.revokeRole(await cr.MINTER_ROLE(), user2.address);

            expect(await cr.hasRole(await cr.MINTER_ROLE(), user2.address)).to
                .be.false;
        });

        it("Should allow for transfer of admin role", async function () {
            await cr.transferAdmin(user1.address);

            expect(await cr.hasRole(await cr.ADMIN_ROLE(), owner.address)).to.be
                .false;
            expect(await cr.hasRole(await cr.ADMIN_ROLE(), user1.address)).to.be
                .true;
        });

        it("Should not allow for transfer of admin role to 0 address", async function () {
            await expect(
                cr.transferAdmin(ethers.constants.AddressZero)
            ).to.be.revertedWith("Can't put 0 address");
        });
    });
});
