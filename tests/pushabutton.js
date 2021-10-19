const anchor = require('@project-serum/anchor');

describe('pushabutton', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Pushabutton;


  it('test push', async () => {
    // Add your test here.
    const tx = await program.rpc.push({
      accounts: {
        pusher: provider.wallet.publicKey 
      }, 
      signers: [
        provider.wallet.payer
      ]
    });
    console.log("Your transaction signature", tx);

  });

});
