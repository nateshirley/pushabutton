import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React, { FC } from 'react';
import "./global.css";

const NavigationBar: FC = () => {
    const { wallet } = useWallet();

    let connectStyle = {
        borderRadius: '0px',
        color: "white",
        backgroundColor: "#2760F2",
        border: '0px solid rgba(0, 0, 0, 1)',
        fontFamily: "Inconsolata",
        fontWeight: 800,
        width: '174px',
        height: '55px',
        fontSize: '16px'
    }

    return (
        <nav>
            <div className="navbar">
                {wallet && (
                    <div className="nav-wallet-button-outer">
                        <div className="nav-wallet-button"><WalletMultiButton style={connectStyle} /></div>
                        <div className="nav-wallet-button disconnect"><WalletDisconnectButton style={connectStyle} /></div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default NavigationBar;
