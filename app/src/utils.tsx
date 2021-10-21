import SPLToken, { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Provider, Program, utils } from '@project-serum/anchor';
import { PublicKey, Keypair, Connection, RpcResponseAndContext, AccountInfo } from "@solana/web3.js";
import { Interface } from "readline";

const PACK_PROGRAM_ID = new PublicKey("5GstP3i7wvo1NEiPDUa9TcdqFFFYaaZDATX2WyVquzT4");
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const buildConnectedMembersDict = async (walletPubkey: PublicKey, connection: Connection) => {
    let packMints = await getPackMintKeysForWallet(walletPubkey, connection);
    let connectedMembers = new Map<String, PublicKey[]>();
    //memberPubkey:[sharedpackmint]
    //console.log(packMints.length, " we got this many pack mints");
    //16 total 
    await Promise.all(packMints.map(async (packMint) => {
        let members = await getMembersForPackMint(packMint, connection);
        members.forEach((member) => {
            if (!member.equals(walletPubkey)) {
                let sharedPacks = connectedMembers.get(member.toBase58());
                if (sharedPacks) {
                    sharedPacks.push(packMint);
                    connectedMembers.set(member.toBase58(), sharedPacks);
                } else {
                    connectedMembers.set(member.toBase58(), [packMint])
                }
            }
        });
    }));
    return connectedMembers
}

export const getPackMintKeysForWallet = async (walletPubkey: PublicKey, connection: Connection) => {
    let fetch = await connection.getTokenAccountsByOwner(walletPubkey, {
        programId: TOKEN_PROGRAM_ID
    });
    let responses = Array.from(fetch.value);
    return await filterResponsesForSquadMintKeys(responses, connection);
}

export const getMembersForPackMint = async (mintPubkey: PublicKey, connection: Connection) => {
    let TokenMint = new Token(
        connection,
        mintPubkey,
        TOKEN_PROGRAM_ID,
        Keypair.generate()
    );
    let largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
    let holders = Array.from(largestAccounts.value);

    //gets all owners into pubkey array
    let members: PublicKey[] = [];
    await Promise.all(holders.map(async (holder) => {
        let accountInfo = await TokenMint.getAccountInfo(holder.address);
        //console.log(accountInfo.owner);
        //type AccountInfo https://github.com/solana-labs/solana-program-library/blob/master/token/js/client/token.js#L149
        //it's a PublicKey
        members.push(accountInfo.owner);
    }));
    return members
}

interface Response {
    pubkey: PublicKey;
    account: AccountInfo<Buffer>;
}
export const filterResponsesForSquadMintKeys = async (responses: Response[], connection: Connection) => {
    responses = Array.from(responses);
    let mintKeys: PublicKey[] = [];
    const [expectedCreator, _bump] = await getAuthPda();
    //response: {account: AccountInfo<Buffer>; pubkey: PublicKey }
    await Promise.all(responses.map(async (response) => {
        let mintKey = new PublicKey(response.account.data.slice(0, 32));
        if (await mintHasVerifiedCreator(mintKey, expectedCreator, connection)) {
            mintKeys.push(mintKey);
        }
    }));
    return mintKeys
}

export const mintHasVerifiedCreator = async (mintPubkey: PublicKey, expectedCreator: PublicKey, connection: Connection) => {
    let [metadataAddress, _bump] = await getMetadataAddress(mintPubkey);
    let metadataInfo = await connection.getAccountInfo(metadataAddress);
    if (metadataInfo) {
        let firstCreator = new PublicKey(metadataInfo.data.slice(326, 358));
        let isFirstCreatorVerified = metadataInfo.data[358];
        if (expectedCreator.equals(firstCreator) && isFirstCreatorVerified) {
            //console.log("the creator is good");
            return true
        }
    }
    return false
}

export const getMetadataAddress = async (mintPubkey: PublicKey) => {
    return await PublicKey.findProgramAddress(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintPubkey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    );
}

const getAuthPda = async () => {
    return await PublicKey.findProgramAddress(
        [utils.bytes.utf8.encode("authority")],
        PACK_PROGRAM_ID
    );
}

export const timeSince = (date: Date) => {
    let now = new Date()
    var seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    var interval = seconds / 31536000;
    if (interval > 1) {
        let roundedUnits = Math.floor(interval);
        return trimmedString(roundedUnits, roundedUnits + " years");
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        let roundedUnits = Math.floor(interval);
        return trimmedString(roundedUnits, roundedUnits + " months");
    }
    interval = seconds / 86400;
    if (interval > 1) {
        let roundedUnits = Math.floor(interval);
        return trimmedString(roundedUnits, roundedUnits + " days");
    }
    interval = seconds / 3600;
    if (interval > 1) {
        let roundedUnits = Math.floor(interval);
        return trimmedString(roundedUnits, roundedUnits + " hours");
    }
    interval = seconds / 60;
    if (interval > 1) {
        let roundedUnits = Math.floor(interval);
        return trimmedString(roundedUnits, roundedUnits + " minutes");
    }
    return Math.floor(seconds) + " seconds";
}

const trimmedString = (roundedUnits: number, string: string) => {
    if (roundedUnits === 1) {
        return string.substring(0, string.length - 1);
    } else {
        return string
    }
}