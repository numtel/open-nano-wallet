const DEFAULT_REPRESENTATIVE =
  'xrb_3pczxuorp48td8645bs3m6c3xotxd3idskrenmi65rbrga5zmkemzhwkaznh';

class BadArgs extends Error {}
class BlockError extends Error {}

function extraBlockValues(data, i) {
  const block = data.history[i];
  const prevBlock = i === 0 ? null : data.history[i-1];

  if(!prevBlock) {
    block.balanceXrb = rawToXrb(data.info.balance).toString();
  } else if(prevBlock.type === 'send') {
    block.balanceXrb = Big(prevBlock.balanceXrb).plus(rawToXrb(prevBlock.amount)).toString();
  } else if(prevBlock.type === 'receive') {
    block.balanceXrb = Big(prevBlock.balanceXrb).minus(rawToXrb(prevBlock.amount)).toString();
  }
  if(block.amount) block.amountXrb = rawToXrb(block.amount).toString();
}

class Account {
  constructor(wallet, data) {
    if(!(wallet instanceof Wallet))
      throw new BadArgs('INVALID_WALLET');
    if(!('index' in data)
        || typeof data.index !== 'number'
        || data.index < 0
        || data.index > Math.pow(2,32) - 1)
      throw new BadArgs('INVALID_INDEX');

    this.wallet = wallet;

    this.data = Object.assign({
      workHash: null,
      workValue: null,
      redeemSends: {},
      name: 'Account #' + data.index
    }, data);

    this.key = null;
    this.address = null;
    this.updatePair();

    this.details = null; // Replaced with promise immediately
    this.detailsCache = null; // Replaced when loaded
    this.usingStateBlocks = false;

    // Account details, work values are not used in redeem mode
    if(this.wallet.app.redeemCode.raw === null)
      this.refresh();

    this.loading = false;
  }

  toJSON() {
    return this.data;
  }

  updatePair() {
    Object.assign(this, accountPair(this.wallet.params.seed, this.data.index));
  }

  refresh() {
    this.loading = true;
    this.details = this.fetchDetails()
    // Load work but don't block the UI
    this.details.then(() => {
      this.loading = false;
      this.fetchWork()
    });
    return this.details;
  }

  /*
    Perform backend call to fetch account balance, transactions, etc.
    @return Promise
   */
  fetchDetails() {
    return fetch(ACCOUNT_URL + this.address).then(response => {
      return response.json();
    }).then(details => {
      if('error' in details.info && details.info.error === 'Account not found') {
        details.info.balance = '0';
        details.history = [];
      } else if('error' in details.info) {
        throw new Error(details.info.error);
      }

      // Add balance to each block, convert amounts to Xrb
      if(details.history.length) {
        for(let i=0; i<details.history.length; i++) {
          extraBlockValues(details, i);
        }
      }

      this.detailsCache = details;
      return details;
    });
  }

  /*
    Fetch work from backend if not already cached
    @return Promise { work, details }
    */
  fetchWork() {
    if(this.detailsCache === null)
      throw new Error('REQUIRED_DETAILS');

    const nextWorkHash = (this.detailsCache.history.length === 0 ?
      keyFromAccount(this.address) : this.detailsCache.info.frontier);

    if(this.data.workHash === nextWorkHash && this.data.workValue instanceof Promise) {
        return this.data.workValue;
    } else if(this.data.workHash === nextWorkHash && typeof this.data.workValue === 'string') {
        return Promise.resolve({
          work: this.data.workValue,
          details: this.detailsCache
        });
    } else {
      this.data.workHash = nextWorkHash;
      return this.data.workValue = this.wallet.app.queueWork(nextWorkHash)
        .then(data => {
          if(this.data.workHash === nextWorkHash)
            this.data.workValue = data;

          this.wallet.app.saveWallet();

          return {
            details: this.detailsCache,
            work: data
          };
        })
        .catch(reason => {
          if(reason === 'GENERATION_STOPPED') this.data.workValue = null;
          else throw reason;
        });
    }
  }

  acceptPending(sendBlock) {
    let block;
    let rendered;
    this.loading = true;
    return this.fetchWork().then(result => {
      block = new Block(result.details.history.length > 0 ? {
        type: 'receive',
        previous: result.details.info.frontier,
        source: sendBlock.hash,
        work: result.work,
        amount: sendBlock.amount,
        account: sendBlock.account,
      } : {
        type: 'open',
        source: sendBlock.hash,
        representative: DEFAULT_REPRESENTATIVE,
        work: result.work,
        amount: sendBlock.amount,
        account: this.address,
      }, this);
      rendered = block.sign(this.key);
      return publishBlock(rendered, PUBLISH_RETRIES);
    }).then(result => {
      this.detailsCache.info.frontier = rendered.hash;
      // Update balances
      this.detailsCache.info.balance =
        Big(this.detailsCache.info.balance).plus(block.params.amount).toFixed();

      // Add finished block to chain
      block.params.hash = rendered.hash;
      block.params.account = sendBlock.account; // instead of self from open
      block.params.type = 'receive'; // open becomes receive on frontend

      this.detailsCache.history.unshift(block.params);
      extraBlockValues(this.detailsCache, 0);

      // Remove from pending list
      this.detailsCache.pending = this.detailsCache.pending
        .filter(pendingBlock => pendingBlock.hash !== sendBlock.hash);

      this.fetchWork(); // Get ready for next transaction
      this.loading = false;
      return block.params;
    });
  }

  sendToRedeemUrl(amount, password) {
    let sendBlock, openBlock, redeemCodeValue;
    let sendRendered, openRendered;
    this.loading = true;

    const adhocPrivkey = nacl.randomBytes(32);
    const adhocPublic = adhocAccount(adhocPrivkey);

    return this.fetchWork().then(result => {
      const newBalance =
        Big(result.details.info.balance)
          .minus(xrbToRaw(amount))
          .toFixed();

      if(Big(newBalance).lt(0))
        throw new BlockError('INSUFFICIENT_BALANCE');

      sendBlock = new Block({
        type: 'send',
        previous: result.details.info.frontier,
        destination: adhocPublic.address,
        balance: zeroPad(dec2hex(newBalance), 32),
        work: result.work,
        amount: xrbToRaw(amount),
        account: adhocPublic.address,
      }, this);
      sendRendered = sendBlock.sign(this.key);
      return this.wallet.app.queueWork(adhocPublic.pubkey);
    })
    .then(result => {
      openBlock = new Block({
        type: 'open',
        source: sendRendered.hash,
        representative: DEFAULT_REPRESENTATIVE,
        work: result,
        amount: xrbToRaw(amount),
        account: adhocPublic.address,
      });
      openRendered = openBlock.sign(uint8_hex(adhocPrivkey));
      return this.wallet.app.queueWork(openRendered.hash);
    })
    .then(result => {
      redeemCodeValue = concat_uint8([adhocPrivkey, hex_uint8(result)]);

      if(password) {
        const encrypted = encrypt(redeemCodeValue, password);
        redeemCodeValue = encrypted.salt + ':' + encrypted.box;
      } else {
        redeemCodeValue = uint8_b64(redeemCodeValue);
      }

      this.data.redeemSends[sendRendered.hash] = redeemCodeValue;
      this.wallet.app.saveWallet();

      return publishBlock(sendRendered, PUBLISH_RETRIES);
    })
    .then(result => {
      if('errorMessage' in result)
        throw new BlockError('PUBLISH_1_FAILED');

      return publishBlock(openRendered, PUBLISH_RETRIES);
    })
    .then(result => {
      if('errorMessage' in result)
        throw new BlockError('PUBLISH_2_FAILED');

      this.detailsCache.info.frontier = sendRendered.hash;
      // Update balance
      this.detailsCache.info.balance =
        Big(this.detailsCache.info.balance).minus(sendBlock.params.amount).toFixed();

      // Add finished block to chain
      sendBlock.params.hash = sendRendered.hash;
      this.detailsCache.history.unshift(sendBlock.params);
      extraBlockValues(this.detailsCache, 0);

      this.fetchWork(); // Get ready for next transaction
      this.loading = false;
      return sendBlock.params;
    });
  }

  send(recipient, amount) {
    let block;
    let rendered;
    this.loading = true;
    return this.fetchWork().then(result => {
      const newBalance =
        Big(result.details.info.balance)
          .minus(xrbToRaw(amount))
          .toFixed();

      if(Big(newBalance).lt(0))
        throw new BlockError('INSUFFICIENT_BALANCE');

      block = new Block({
        type: 'send',
        previous: result.details.info.frontier,
        destination: recipient,
        balance: zeroPad(dec2hex(newBalance), 32),
        work: result.work,
        amount: xrbToRaw(amount),
        account: recipient,
      }, this);
      rendered = block.sign(this.key);
      return publishBlock(rendered, PUBLISH_RETRIES);
    }).then(result => {
      this.detailsCache.info.frontier = rendered.hash;
      // Update balance
      this.detailsCache.info.balance =
        Big(this.detailsCache.info.balance).minus(block.params.amount).toFixed();

      // Add finished block to chain
      block.params.hash = rendered.hash;
      this.detailsCache.history.unshift(block.params);
      extraBlockValues(this.detailsCache, 0);

      this.fetchWork(); // Get ready for next transaction
      this.loading = false;
      return block.params;
    });
  }

  change(newRep) {
    let block;
    let rendered;
    this.loading = true;
    return this.fetchWork().then(result => {
      try {
        keyFromAccount(newRep);
      } catch(error) {
        throw new BlockError('INVALID_REPRESENTATIVE');
      }

      block = new Block({
        type: 'change',
        previous: result.details.info.frontier,
        representative: newRep,
        work: result.work,
      }, this);
      rendered = block.sign(this.key);
      return publishBlock(rendered, PUBLISH_RETRIES);
    }).then(result => {
      // Change blocks are not displayed in transaction history
      this.detailsCache.info.frontier = rendered.hash;

      this.fetchWork(); // Get ready for next transaction
      this.loading = false;
      return block.params;
    });
  }
}
