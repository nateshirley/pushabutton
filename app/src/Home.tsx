import React, { Component, FC, useState, useEffect } from "react";
import { Link, useHistory } from 'react-router-dom';
import SPLToken, { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import "./global.css";
import { Provider, Program } from '@project-serum/anchor';
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import idl from './idl.json';
import bs58 from 'bs58';
import { buildConnectedMembersDict, timeSince } from "./utils"
import { link } from "fs";
import qs from "qs";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import PuffLoader from "react-spinners/PuffLoader";
import { css } from "@emotion/react";

const override = css`
display: block;
margin: 0 auto;
border-color: white;
`;

type Props = {
    getProvider: () => Provider
}
const programID = new PublicKey(idl.metadata.address);

interface MutualPush {
    pushedBy: PublicKey,
    blockTime: number,
    sharedPacks: PublicKey[],
    signature: String,
}

enum AppState {
    Push,
    Transaction,
    SharedPushes,
    Fetching
}


const Home: FC<Props> = ({ getProvider }) => {
    const [appState, setAppState] = useState(AppState.Push);
    const [mutualPushElement, setMutualPushElement] = useState(<div></div>);
    let wallet = useWallet();
    const history = useHistory();
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    useEffect(() => {
        const filterParams = history.location.search.substr(1);
        const filtersFromParams = qs.parse(filterParams);
        if (filtersFromParams.key) {
            let walletKeyString = String(filtersFromParams.key);
            let decoded = bs58.decode(walletKeyString);
            if (decoded.length === 32) {
                fetchMutualPushes(new PublicKey(walletKeyString));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pushButton = async () => {
        setAppState(AppState.Transaction);
        const tx = await program.rpc.push({
            accounts: {
                pusher: provider.wallet.publicKey
            },
        });
        console.log("Your transaction signature", tx);
        if (wallet.publicKey instanceof PublicKey) {
            setAppState(AppState.Fetching);
            fetchMutualPushes(wallet.publicKey);
            history.push("?key=" + wallet.publicKey.toBase58());
        } else {
            setAppState(AppState.Push);
        }
    }

    const truncatedKey = (pubkey: PublicKey) => {
        let b58 = pubkey.toBase58();
        return (b58.slice(0, 4) + "..." + b58.slice(b58.length - 5, b58.length - 1));
    }
    const linkToPusher = (pushedBy: PublicKey) => {
        return (
            <a href={`https://solscan.io/account/${pushedBy.toBase58()}?cluster=devnet`}
                className="mutual-push-link" target="_blank" rel="noreferrer noopener">{truncatedKey(pushedBy)}</a>
        );
    }
    const linkToSharedPacks = (sharedPacks: PublicKey[], pushedBy: PublicKey) => {
        let displayString = "";
        if (sharedPacks.length > 1) {
            displayString = "you share 1 pack"
        } else {
            displayString = `you share ${displayString.length} packs`
        }
        return (
            <a href={`https://www.madpacks.xyz/find?key=${pushedBy.toBase58()}`}
                className="mutual-push-link" target="_blank" rel="noreferrer noopener">{displayString}</a>
        );
    }
    const linkToTransaction = (signature: String) => {
        return (
            <a href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                className="mutual-push-link" target="_blank" rel="noreferrer noopener">pressed the button</a>
        );
    }
    const timestampString = (blockTime: number) => {
        //convert to milliseconds for JS date object
        let time = timeSince(new Date(blockTime * 1000))
        return time + " ago"
    }
    const configureMutualPushElement = (mutualPushes: MutualPush[]) => {
        const pushItemForMutualPush = (mutualPush: MutualPush, index: number) => {
            return (
                <div key={index}>
                    <div className="mutual-push-index">#{index + 1}</div>
                    <div className="mutual-push-paragraph">
                        {linkToPusher(mutualPush.pushedBy)}, with whom {linkToSharedPacks(mutualPush.sharedPacks, mutualPush.pushedBy)},
                        &nbsp;{linkToTransaction(mutualPush.signature)} {timestampString(mutualPush.blockTime)}.
                    </div>
                </div>
            );
        }
        if (mutualPushes.length > 0) {
            let pushItems: JSX.Element[] = [];
            mutualPushes.forEach((mutualPush, index) => {
                pushItems.push(
                    pushItemForMutualPush(mutualPush, index)
                );
            });
            setMutualPushElement(
                <div>{pushItems}</div>
            );
            setAppState(AppState.SharedPushes);
        }
    }
    const fetchMutualPushes = async (walletPubKey: PublicKey) => {
        let connectedMembers = await buildConnectedMembersDict(walletPubKey, provider.connection);
        let fetchedPushes: MutualPush[] = [];
        let signatures = await provider.connection.getConfirmedSignaturesForAddress2(programID, { limit: 1000 }, "confirmed");
        setAppState(AppState.Fetching);
        await Promise.all(signatures.map(async (signatureInfo) => {
            let txResponse = await provider.connection.getTransaction(signatureInfo.signature, { commitment: "confirmed" });
            if (txResponse) {
                let message = txResponse.transaction.message;
                //account: PublicKey
                message.accountKeys.forEach((accountPubkey, index) => {
                    if (message.isAccountSigner(index)) {
                        let sharedPacks = connectedMembers.get(accountPubkey.toBase58());
                        if (sharedPacks && sharedPacks.length > 0) {
                            if (txResponse?.blockTime) {
                                fetchedPushes.push(
                                    {
                                        pushedBy: accountPubkey,
                                        blockTime: txResponse?.blockTime,
                                        sharedPacks: sharedPacks,
                                        signature: signatureInfo.signature
                                    }
                                );
                            } else {
                                console.log("no block time da fuck")
                            }
                        }
                    }
                });
            }
        }));
        configureMutualPushElement(fetchedPushes);
    }
    const backToPushing = () => {
        history.push("");
        setAppState(AppState.Push);
    }



    const defaultWalletKey = new PublicKey("BB17xR1QTpJLKHN294ikxd5YgVg7kLsHUeXh9kG4HKFi");
    let body = <div></div>;
    switch (appState) {
        case AppState.Push:
            if (!wallet.connected) {
                let connectStyle = {
                    borderRadius: '0px',
                    color: "white",
                    backgroundColor: "#000069",
                    border: '0px solid #00288F',
                    fontFamily: "Inconsolata",
                    fontWeight: 900,
                    width: '100%',
                    height: '100%',
                    fontSize: '21px'
                }
                body = (
                    <div className="push-greeting">
                        if you want to press the button, you've come to the right place
                        <div className="connect-button-parent">
                            <WalletMultiButton style={connectStyle}>CONNECT WALLET</WalletMultiButton>
                        </div>
                    </div>
                )
            } else {
                body = (
                    <div className="push-greeting">
                        <button className="central-push-button" onClick={pushButton}>PRESS THE BUTTON</button>
                    </div>
                );
            }
            break;
        case AppState.SharedPushes:
            body = (
                <div>
                    <div className="mutual-push-header">shared pack presses</div>
                    <div className="mutual-push-element">{mutualPushElement}</div>
                    <div>
                        <button className="back-home-button" onClick={backToPushing}>back to the button</button>
                    </div>
                </div>
            );
            break;
        case AppState.Transaction:
            body = (
                <div>
                    <div>approving tx...</div>
                    <div style={{ marginTop: "24px" }}><PuffLoader loading={true} size={31} css={override} color={"white"}/></div>
                </div>
            );
            break;
        case AppState.Fetching:
            body = (
                <div>fetching...</div>
            );
            break;
    }

    return (
        <div className="home-outer">
            <div className="body-parent">
                {body}
            </div>
        </div>
    );


}

export default Home;