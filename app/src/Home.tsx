import React, { Component, FC, useState } from "react";
import { Link } from 'react-router-dom';
import SPLToken, { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import "./global.css";
import { Provider, Program } from '@project-serum/anchor';
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair } from "@solana/web3.js";
import idl from './idl.json';
import { buildConnectedMembersDict } from "./utils"


type Props = {
    getProvider: () => Provider
}
const programID = new PublicKey(idl.metadata.address);


const Home: FC<Props> = ({ getProvider }) => {
    const [isLoading, setIsLoading] = useState(false);
    let wallet = useWallet();
    const provider = getProvider();

    const program = new Program(idl, programID, provider);


    const push = async () => {

        // setIsLoading(true);
        // const tx = await program.rpc.push({
        //     accounts: {
        //         pusher: provider.wallet.publicKey
        //     },
        // });
        // setIsLoading(false);
        // console.log("Your transaction signature", tx);
        if (wallet.publicKey instanceof PublicKey) {
            fetchMutualPushes(wallet.publicKey);
        }
        //once you have the signature, pass it to a dif component with results and sig. for now just make the calls
    }

    const fetchMutualPushes = async (walletPubKey: PublicKey) => {


        let connectedMembers = await buildConnectedMembersDict(walletPubKey, provider.connection);
        let sharedActivity = [];
        console.log(connectedMembers);


        let signatures = await provider.connection.getConfirmedSignaturesForAddress2(programID, { limit: 40 }, "confirmed");
        console.log(signatures);
        await Promise.all(signatures.map(async (signatureInfo) => {
            let txResponse = await provider.connection.getTransaction(signatureInfo.signature, { commitment: "confirmed" });
            if (txResponse) {
                let message = txResponse.transaction.message;
                //account: PublicKey
                message.accountKeys.forEach((accountPubkey, index) => {
                    if (message.isAccountSigner(index)) {
                        console.log(accountPubkey.toBase58());
                        let sharedPacks = connectedMembers.get(accountPubkey.toBase58());
                        console.log(sharedPacks);
                        if (sharedPacks) {
                            sharedPacks.forEach((packMint) => {
                                console.log("shared activity on mint: ", packMint);
                                sharedActivity.push(packMint);
                            });
                        }
                    }
                });
            }
        }));
    }



    let body = null;
    if (!wallet.connected) {
        body = (
            <div className="home-info" style={{ marginTop: "50px" }}>
                first, select devnet wallet ↗
            </div>
        )
    } else {
        body = (
            <div>
                {isLoading
                    ? (<div>waiting</div>)
                    : (<button className="default-button" onClick={push}>push the button</button>)
                }
            </div>
        );
    }

    return (
        <div className="component-parent">
            home page
            <div>{body}</div>
        </div>
    );

}

export default Home;