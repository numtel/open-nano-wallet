const LOCALSTORAGE_KEY = 'xrb_wallets';

class RedeemCodeError extends Error {}

class App {
  constructor(element, wallet) {
    this.element = element;
    this.wallet = wallet || null;
    this.selectedAccount = 0; // Index of added accounts, not all wallet accounts
    this.mode = null;
    this.walletName = null; // For localStorage
    this.walletPassword = null;
    this.pendingWorkHashes = [];
    this.workQueuePromise = null;
    this.baseHref = `${location.protocol}//${location.host}${location.pathname}`;

    this.redeemCode = new Redeem;

    // Views are contained in separate files
    this.views = Object.keys(window.views).reduce((out, cur) => {
      out[cur] = window.views[cur].bind(this);
      return out;
    }, {});

    this.defaultView = this.redeemCode.raw ?
      () => this.views.redeem(this.redeemCode) :
      () => this.views.dashboard();

    this.render();

    document.addEventListener('keyup', e => {
      if(e.code === 'Escape') this.render();
    });
  }
  render(mode) {
    this.mode = mode || null;
    // Reset root element
    while(this.element.firstChild)
      this.element.removeChild(this.element.firstChild);

    if(this.mode !== null) {
      this.element.appendChild(this.mode);
    } else {
      this.element.appendChild(this.defaultView());
    }
    this.element.appendChild(this.views.footer());
  }
  queueWork(hash) {
    this.pendingWorkHashes.push(hash);
    return this.processWorkQueue().then(result => {
      if(result.hash === hash) return result.work;
      // Continue processing if the returned value wasn't for this hash
      return this.processWorkQueue();
    });
  }
  processWorkQueue() {
    if(this.pendingWorkHashes.length === 0)
      return null;

    // Only process one generation at a time
    if(this.workQueuePromise !== null)
      return this.workQueuePromise;

    const nextWorkHash = this.pendingWorkHashes.shift();
    return this.workQueuePromise = new Promise((resolve, reject) => {
      setStatus(__`Beginning work generation for ${nextWorkHash}`);
      let finished = data => {
        setStatus(__`Found ${data} for ${nextWorkHash}`);
        // Do not execute this callback again if WebGL returned before
        // it was able to be stopped
        if(finished === null) return;

        finished = null;        // In case of WebAssembly finishing first
        pow_terminate(workers); // In case of WebGL finishing first

        this.workQueuePromise = null;
        resolve({ hash: nextWorkHash, work: data });
      };

      const workers = pow_initiate(undefined, 'dist/RaiBlocksWebAssemblyPoW/');
      pow_callback(workers, nextWorkHash, () => {}, finished);

      try {
        NanoWebglPow(nextWorkHash, finished, function(n) {
          // If WebAssembly finished first, do not continue with WebGL
          if(finished === null) return true;
        });
      } catch(error) {
        if(error.message === 'webgl2_required') {
          // Do nothing, WebAssembly is calculating as well
        } else throw error;
      }
    });
  }
  listWalletNames() {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    return Object.keys(wallets);
  }
  exportWallet() {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(this.walletName in wallets))
      throw new Error('INVALID_WALLET');

    saveTextAs(JSON.stringify(wallets[this.walletName]), this.walletName + '.json');
  }
  importWallet(name, data) {
    const json = new TextEncoder().encode(JSON.stringify(this.wallet));
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(typeof data === 'object' && 'box' in data && 'salt' in data))
      throw new Error('INVALID_WALLET');
    wallets[name] = data;
    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(wallets);
  }
  saveWallet() {
    const json = new TextEncoder().encode(JSON.stringify(this.wallet));
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    wallets[this.walletName] = encrypt(json, this.walletPassword);
    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(wallets);
  }
  removeWallet(original, newName) {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(this.walletName in wallets))
      throw new Error('INVALID_WALLET');

    if(newName)
      wallets[newName] = wallets[original];
    delete wallets[original];

    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(wallets);
  }
  loadWallet() {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(this.walletName in wallets))
      throw new Error('INVALID_WALLET');

    const data = wallets[this.walletName];
    const open = decrypt(data.salt, data.box, this.walletPassword);

    this.wallet = new Wallet(this, JSON.parse(new TextDecoder().decode(open)));
  }
}
