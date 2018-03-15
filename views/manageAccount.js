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
      <h2>$${currentAccount ? __`Edit` : __`Add`} $${__`Account`}</h2>
      <label>
        <span>$${__`Index`}</span>
        <input name="index" type="number" min="0" max="4294967295" value="$${currentAccount ? currentAccount.data.index : '0'}" />
        <p class="address dont-break-out"></p>
        <p>
          $${__`Each wallet may have up to 4294967296 accounts addressed.`}
          $${__`Please select which account index to use for this account.`}
          $${__`Each index corresponds to a specific public address.`}
          <br />(0-4294967295)
        </p>
      </label>
      <label>
        <span>$${__`Name`}</span>
        <input name="name" value="$${currentAccount ? currentAccount.data.name : __`New Account`}" />
        <p>$${__`Give a name to the account.`}</p>
      </label>
      <button type="submit">$${currentAccount ? __`Edit` : __`Add Account`}</button>
      ${ currentAccount ? html`<button type="button" class="delist">$${__`Delist`}</button>` : ''}
      ${ hasCancel ? html`<button type="button" class="cancel">$${__`Cancel`}</button>` : ''}
    </form>`, {
    'input[name=index] inputChange': (e, tpl, el) => {
      const addr = tpl.querySelector('p.address');
      const curIndex = parseIndex(el.value);
      if(curIndex === false) addr.innerHTML = __`Invalid index!`;
      else addr.innerHTML = accountPair(this.wallet.params.seed, el.value).address;
    },
    'button.delist click': e => {
      if(confirm(__`No funds change when delisting an account.` + '\n\n' +
                 __`It may be added again by choosing the same index.` + '\n\n' +
                 __`Any redeemable links will be lost unless backed up.`)) {
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
        alert(__`Invalid index!`);
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
