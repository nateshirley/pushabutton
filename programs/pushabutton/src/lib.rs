use anchor_lang::prelude::*;

declare_id!("GnpXzkc1vc76ekZR1WeNfJdLv8Pcg2zYMxU1H3EJrgEd");

#[program]
pub mod pushabutton {
    use super::*;

    pub fn push(ctx: Context<Push>) -> ProgramResult {

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct Push<'info> {
    pub pusher: Signer<'info>
}
