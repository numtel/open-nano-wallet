window.views = window.views || {};

window.views.signIn = function() {
  const walletNames = this.listWalletNames();
  if(walletNames.length === 0)
    return this.views.createWallet();

  return buildTemplate(html`
    <form method="post">
      <h1>XRB Wallet</h1>
      <ul class="wallets">
      ${walletNames.map(name => html`
        <li><a href="#">$${name}</a></li>
      `).join('')}
      </ul>
      <p>Always keep a backup of your seed value.</p>
      <button type="button" class="createWallet">Create Wallet</button>
    </form>`, {
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
      <h2>Log In</h2>
      <label>
        <span>Password</span>
        <input name="password" type="password" />
        <p>Encrypted wallet kept in local browser storage</p>
      </label>
      <button type="submit">Log In</button>
      <button type="button" class="cancel">Cancel</button>
      <button type="button" class="rename">Rename</button>
      <button type="button" class="delete">Delete</button>
    </form>`, {
    'button.cancel click': e => this.render(this.views.signIn()),
    'button.rename click': e => {
      const newName = prompt('Rename wallet "' + this.walletName + '" to what?');
      if(!newName) return;

      this.removeWallet(this.walletName, newName);
      this.walletName = newName;
    },
    'button.delete click': e => {
      if(!confirm('Are you sure you wish to delete wallet "' + this.walletName + '"?\n\nYou will need to import from the seed value to use these accounts again.')) return;

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
      ${walletNames.length ? `<button type="button" class="cancel">Cancel</button>` : ''}
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
