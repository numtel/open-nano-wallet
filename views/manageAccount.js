window.views = window.views || {};

function parseIndex(value) {
  const index = parseInt(value, 10);
  if(isNaN(index) || index < 0 || index > (Math.pow(2, 32) - 1))
    return false;
  return index;
}

window.views.manageAccount = function(currentAccount, hasCancel) {
  return buildTemplate(html`
    <form method="post">
      <h2>$${currentAccount ? `Edit` : `Add`} Account</h2>
      <label>
        <span>Index</span>
        <input name="index" type="number" min="0" max="4294967295" value="$${currentAccount ? currentAccount.data.index : '0'}" />
        <p class="address dont-break-out"></p>
        <p>
          Each wallet may have up to 4294967296 accounts addressed.
          Please select which account index to use for this account.
          Each index corresponds to a specific public address.
          <br />(0-4294967295)
        </p>
      </label>
      <label>
        <span>Name</span>
        <input name="name" value="$${currentAccount ? currentAccount.data.name : 'New Account'}" />
        <p>Give a name to when using the account.</p>
      </label>
      <button type="submit">$${currentAccount ? `Edit` : `Add Account`}</button>
      ${ currentAccount ? html`<button type="button" class="delist">Delist</button>` : ''}
      ${ hasCancel ? html`<button type="button" class="cancel">Cancel</button>` : ''}
    </form>`, {
    'input[name=index] inputChange': (e, tpl, el) => {
      const addr = tpl.querySelector('p.address');
      const curIndex = parseIndex(el.value);
      if(curIndex === false) addr.innerHTML = 'Invalid index!';
      else addr.innerHTML = accountPair(this.wallet.params.seed, el.value).address;
    },
    'button.delist click': e => {
      if(confirm('No funds change when delisting an account.\n\nIt may be added again by choosing the same index.\n\nAny redeemable links will be lost unless backed up.')) {
        this.wallet.params.accounts.splice(this.selectedAccount, 1);
        this.selectedAccount = 0;
      }
      this.saveWallet();
      this.render();
    },
    'button.cancel click': e => this.render(),
    'form submit': (e, tpl, el) => {
      const newAccount = formValues(el);
      newAccount.index = parseIndex(newAccount.index);
      if(newAccount.index === false) {
        alert('Invalid index!');
        return;
      }

      if(currentAccount) {
        if(currentAccount.data.index !== newAccount.index) {
          Object.assign(currentAccount.data, newAccount);
          currentAccount.updatePair();
          currentAccount.refresh()
            .then(() => this.render())
            .catch(reason => alert(reason));
          this.saveWallet();
          this.render();
        } else {
          Object.assign(currentAccount.data, newAccount);
          this.saveWallet();
          this.render();
        }
      } else {
        this.wallet.addAccount(newAccount);
        this.selectedAccount = this.wallet.params.accounts.length - 1;
        this.saveWallet();
        this.render();
      }
    }
  }, {
    focusForm: true
  });
}
