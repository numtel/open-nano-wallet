class Wallet {
  constructor(app, params) {
    this.app = app;
    this.params = Object.assign({
      seed: uint8_hex(nacl.randomBytes(32)), // Use random seed if unspecified
      accounts: []
    }, params);

    this.params.accounts =
      this.params.accounts.map(account => new Account(this, account));
  }

  addAccount(data) {
    this.params.accounts.push(new Account(this, data));
  }

  toJSON() {
    return this.params;
  }

}
