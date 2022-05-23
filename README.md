# Candy Robbers

This project is composed of 2 contracts `CandyRobbers` and `CandyRobbersMint`

## CandyRobbers

This is the main NFT contract. It is based upon ERC721A for reduced gas consumption for multi-mint.

It declares an Admin Role which manages the contracts and other roles.

The Minter Role is given to sale contracts (see CandyRobbersMint) and to reserve tokens for the team.

Pre-reveal NFTs have all the same URI -> they are the same tokens before reveal.

The admin is able to reveal the NFTs giving each one a unique URI.

After every robberies the admin will change the base uri to reflect the new traits that robbers have gained in the robbery.

## CandyRobbersMint

This is the first sale contract.

There are 2 type of sale possible : presale (whitelist and Early Robbers) and public sale.

We use the signed message approach to give access to the presale. This is because we allow admins to quickly add any latecomers who did not send their address.

The sale can be paused by the admin. The sale can be ended only once.  