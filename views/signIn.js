window.views = window.views || {};

window.views.signIn = function() {
  const walletNames = this.listWalletNames();

  return buildTemplate(html`
    <form method="post">
      <h1>Open Nano Wallet</h1>
      ${walletNames.length === 0 ? html`
        <div id="landing">
          <p>
          <i class="fa fa-bolt fa-3x fa-fw"></i>
          Publish transactions directly to the NANO peer network.</p>
          <p>
          <i class="fa fa-share-alt fa-3x fa-fw"></i>
          Send NANO to anyone, even those without an account yet, using redeemable URL link codes.</p>
          <p>
          <i class="fa fa-lock fa-3x fa-fw"></i>
          All data stored locally, your keys are completely in your control.</p>
          <p>
          <i class="fa fa-user-secret fa-3x fa-fw"></i>
          GitHub hosted to prove fully open and unmodified source.</p>
          <p>To get started, select "Create Wallet" to use a new random seed or input a previously generated seed.</p>
          <p>Alternatively, select "Import Wallet" to select a wallet file exported from this application.</p>
        </div>
      ` : html`
        <ul class="wallets">
        ${walletNames.map(name => html`
          <li><a href="#">$${name}</a></li>
        `).join('')}
        </ul>
      `}
      <button type="button" class="createWallet">Create Wallet</button>
      <button type="button" class="importWallet">Import Wallet</button>
      <input id="upload" type="file" class="hidden" />
    </form>`, {
    '#upload change': (e, tpl, el) => {
      if(el.files.length === 0) return;

      const reader = new FileReader();
      reader.onload = e => {
        try {
          this.importWallet(el.files[0].name, JSON.parse(e.target.result));
        } catch(error) {
          console.error(error);
          alert('This file does not contain a valid exported wallet.');
          return;
        }
        this.render();
      };
      reader.readAsText(el.files[0]);
    },
    '.importWallet click': (e, tpl, el) => {
      tpl.querySelector('#upload').click();
    },
    '.createWallet click': e => this.render(this.views.createWallet()),
    'ul.wallets a click': (e, tpl, el) => {
      this.walletName = el.innerHTML;
      this.render(this.views.passwordForm());
    }
  });
}

window.views.passwordForm = function() {
  return buildTemplate(html`
    <form id="send" method="post">
      <h2>Log In: $${this.walletName}</h2>
      <label>
        <span>Password</span>
        <input name="password" type="password" />
        <p>Encrypted wallet kept in local browser storage</p>
      </label>
      <button type="submit">Log In</button>
      <button type="button" class="cancel">Cancel</button>
      <p>Always keep a backup of your seed value.</p>
      <button type="button" class="export">Export</button>
      <button type="button" class="rename">Rename</button>
      <button type="button" class="delete">Delete</button>
    </form>`, {
    'button.cancel click': e => this.render(this.views.signIn()),
    'button.export click': e => this.exportWallet(),
    'button.rename click': e => {
      const newName = prompt('Rename wallet "' + this.walletName + '" to what?');
      if(!newName) return;

      this.removeWallet(this.walletName, newName);
      this.walletName = newName;
    },
    'button.delete click': e => {
      if(!confirm('Are you sure you wish to delete wallet "' + this.walletName + '"?\n\nYou will need to import from the seed value or export file to use these accounts again.')) return;

      this.removeWallet(this.walletName);
      this.walletName = null;
      this.render();
    },
    'form submit': (e, tpl, el) => {
      const values = formValues(el);
      this.walletPassword = values.password;
      try {
      this.loadWallet();
      } catch(error) {
        alert('Unable to encrypt wallet! Possibly incorrect password.');
      }
      this.render();
    }
  }, {
    focusForm: true
  });
}

window.views.createWallet = function() {
  const walletNames = this.listWalletNames();
  return buildTemplate(html`
    <form method="post">
      <h1>Create Wallet</h1>
      <label>
        <span>Name</span>
        <input name="name" autocomplete="off" />
        <p>Give a name for the new wallet</p>
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" />
        <p>Encrypted wallet kept in local browser storage</p>
      </label>
      <label>
        <span>Seed</span>
        <input name="seed" autocomplete="off" />
        <p>Leave blank for random new wallet</p>
      </label>
      <button type="submit">Create Wallet</button>
      <button type="button" class="cancel">Cancel</button>
    </form>`, {
    'button.cancel click': e => this.render(this.views.signIn()),
    'form submit': (e, tpl, el) => {
      const values = formValues(el);
      const walletParams = {};

      if(!values.name)
        return alert('Name required!');
      if(walletNames.indexOf(values.name) !== -1)
        return alert('Name already in use!');

      if(values.seed) walletParams.seed = values.seed;

      this.walletName = values.name;
      this.walletPassword = values.password;
      this.wallet = new Wallet(this, walletParams);

      this.render();
    }
  }, {
    focusForm: true
  });
}
