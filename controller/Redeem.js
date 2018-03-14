
class Redeem {
  constructor() {
    this.raw = getParameterByName('redeem');
    this.decrypted = null;

    this.privkey = null;
    this.pubkey = null;
    this.address = null;
    this.work = null;
    this.details = null;
    this.detailsCache = null;

    if(typeof this.raw === 'string') {
      const redeemParts = this.raw.split(':');
      if(redeemParts.length === 1) {
        this.decrypted = redeemParts[0];
        this.decode();
      } else if(redeemParts.length !== 2) {
        this.details = new Error('INVALID_CODE');
      }
    }
  }
  decode() {
    let code;
    try {
      code = b64_uint8(this.decrypted);
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
      return publishBlock(rendered, PUBLISH_RETRIES);
    })
    .then(result => {
      if('errorMessage' in result)
        throw new Error('PUBLISH_FAILED');
      return block;
    });
  }
}
