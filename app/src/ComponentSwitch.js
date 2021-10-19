import { clusterApiUrl, Connection, ConfirmOptions } from '@solana/web3.js';
import { Provider} from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { Route, Switch } from 'react-router-dom';
import Home from './Home';




const ComponentSwitch = () => {

  let wallet = useWallet()
  const opts = {
    preflightCommitment: "processed"
  }
  const getProvider = () => {
    const network = clusterApiUrl('devnet');
    let confirmOptions = {preflightCommitment: "processed"};
    const connection = new Connection(network, confirmOptions.preflightCommitment);
    const provider = new Provider(
      connection, wallet, confirmOptions,
    );
    return provider;
  }

  if(wallet.connected) {
    console.log(wallet.publicKey);
  }
  return (
    <Switch>
      <Route path="/" render={(props) => (
        <Home {...props} getProvider={getProvider} />
      )} />
    </Switch>
  );

}

export default ComponentSwitch;