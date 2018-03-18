window.views = window.views || {};
window.views.redeem = function(redeemCode) {
  if(this.wallet && this.wallet.params.accounts.length === 0)
    return this.views.manageAccount();
  // Rebuild when balance has been loaded
  !redeemCode.detailsCache && redeemCode.details instanceof Promise &&
    redeemCode.details.then(() => this.render());

  const walletNames = this.listWalletNames();

  return buildTemplate(html`
    <form id="redeem" method="post" class="$${redeemCode.details instanceof Promise && redeemCode.detailsCache === null ? 'loading' : redeemCode.details instanceof Error ? 'error' : ''}">
      <h2>$${__`Redeem Nano Currency`}</h2>
      <p class="complete">
        $${__`Redemption complete.`}
        <a href="$${this.baseHref}" rel="noreferrer">$${__`Return to Sign In`}</a>
      </p>
      ${ redeemCode.decrypted === null ? html`
        <label>
          <span>$${__`Password`}</span>
          <input name="password" type="password" />
        </label>
        <button type="submit">$${__`Decrypt`}</button>
      ` :  redeemCode.detailsCache && redeemCode.detailsCache.info.balance === '0' ? html`
        <p>$${__`This redeem account does not have a balance.`}</p>
      ` : redeemCode.detailsCache ? html`
        <p class="balance">
          <span class="redeemValue">
            $${rawToXrb(redeemCode.detailsCache.info.balance).toString()}
          </span> NANO
        </p>
        ${this.wallet === null ? html`
          ${walletNames.length === 0 ? html`
            <p>$${__`Create a wallet to accept the funds:`}</p>
          `: html`
            <p>$${__`Choose a wallet to receive the funds:`}</p>
            <ul class="wallets">
              ${walletNames.map(name => html`
                <li><a href="#">$${name}</a></li>
              `).join('')}
            </ul>
          `}
          <button type="button" class="createWallet">$${__`Create Wallet`}</button>
          <p>$${__`Or, send to any address:`}</p>
          <label>
            <span>$${__`Recipient`}</span>
            <input name="recipient" />
            <p>
              $${__`XRB Address`}
            </p>
          </label>
          <button type="submit">$${__`Send`}</button>
        ` : html`
          <p>$${__`Choose an account to receive the funds:`}</p>
          ${this.wallet.params.accounts.map((account, index) => html`
            <label class="check">
              <input name="recipient" value="$${account.address}" $${index===0 ? 'checked' : ''} type="radio">
              <span>$${account.data.name}</span>
            </label>
          `).join('')}
          <button type="submit">$${__`Send`}</button>
          <button type="button" class="cancel">$${__`Cancel`}</button>
        `}
      ` : redeemCode.details instanceof Error ? html`
        <p>$${__`Invalid Redeem Code`}</p>
      ` : html`
        <p>$${__`Loading...`}</p>
      `}
    </form>`, {
    'button.cancel click': e => {
      this.wallet = null;
      this.render()
    },
    'ul.wallets a click': (e, tpl, el) => {
      this.walletName = el.innerHTML;
      this.render(this.views.passwordForm(true));
    },
    '.createWallet click': e => this.render(this.views.createWallet()),
    'form submit': (e, tpl, el) => {
      const sendParams = formValues(el);

      if(redeemCode.decrypted === null) {
        const redeemParts = redeemCode.raw.split(':');
        const decrypted = decrypt(redeemParts[0], redeemParts[1], sendParams.password);
        if(decrypted === null) {
          alert(__`Invalid password.`);
          el.elements[0].value = '';
          el.elements[0].focus();
        } else {
          redeemCode.decrypted = uint8_b64(decrypted);
          redeemCode.decode();
          this.render();
        }
      } else {
        try {
          keyFromAccount(sendParams.recipient);
        } catch(error) {
          alert(__`Please specify a valid recipient address.`);
          return;
        }

        el.classList.add('sending');
        redeemCode.send(sendParams.recipient).then(block => {
          el.classList.remove('sending');
          el.classList.add('complete');
        });
      }

    }
  }, {
    focusForm: true
  });
}
