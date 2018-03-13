
class Redeem {
  constructor() {
    this.privkey = null;
    this.pubkey = null;
    this.address = null;
    this.work = null;
    this.details = null;
    this.detailsCache = null;

    const redeemValue = getParameterByName('redeem');
    if(typeof redeemValue === 'string') {

      let code;
      try {
        code = b64_uint8(redeemValue);
      } catch(error) {
        this.details = new Error('INVALID_CODE');
      }

      if(code) {
        if(code.length === 40) {
          this.privkey = uint8_hex(code.slice(0, 32));
          this.work = uint8_hex(code.slice(32, 40));
          Object.assign(this, adhocAccount(code.slice(0, 32)));

          this.details = this.fetch();
        } else {
          this.details = new Error('INVALID_CODE');
        }
      }
    }
  }
  fetch() {
    if(!this.privkey) return;
    return fetch(ACCOUNT_URL + this.address).then(response => {
      return response.json();
    }).then(details => {
      if('error' in details.info && details.info.error === 'Account not found') {
        this.details = new Error('INVALID_ACCOUNT');
        return;
      }
      this.detailsCache = details;
      return details;
    });
  }
  send(account) {
    if(!(this.details instanceof Promise))
      return Promise.reject(new Error('NOT_REDEEMABLE'));

    let block;
    return this.details.then(details => {
      block = new Block({
        type: 'send',
        previous: details.info.frontier,
        destination: account,
        balance: zeroPad(0, 32),
        work: this.work,
      });
      const rendered = block.sign(this.privkey);
      block.params.hash = rendered.hash;
      return publishBlock(rendered.msg);
    })
    .then(() => delay(BLOCK_PUBLISH_TIME))
    .then(() => fetchBlock(block.params.hash, 3))
    .then(result => {
      if('errorMessage' in result)
        throw new Error('PUBLISH_FAILED');
      return block;
    });
  }
}
