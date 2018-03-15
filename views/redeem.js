window.views = window.views || {};
window.views.redeem = function(redeemCode) {
  // Rebuild when balance has been loaded
  !redeemCode.detailsCache && redeemCode.details instanceof Promise &&
    redeemCode.details.then(() => this.render());

  return buildTemplate(html`
    <form id="redeem" method="post" class="$${redeemCode.details instanceof Promise && redeemCode.detailsCache === null ? 'loading' : redeemCode.details instanceof Error ? 'error' : ''}">
      <h2>$${__`Redeem Nano Currency`}</h2>
      <p class="complete">$${__`Redemption complete.`}</p>
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
        <label>
          <span>$${__`Recipient`}</span>
          <input name="recipient" />
          <p>
            $${__`XRB Address`}
          </p>
        </label>
        <button type="submit">$${__`Send`}</button>
        <p>$${__`Need an account?`} <a class="external" href="$${this.baseHref}">$${__`Create a new wallet`}</a></p>
      ` : redeemCode.details instanceof Error ? html`
        <p>$${__`Invalid Redeem Code`}</p>
      ` : html`
        <p>$${__`Loading...`}</p>
      `}
    </form>`, {
    'a.external click': (e, tpl, el) => externalLink(el.href),
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
