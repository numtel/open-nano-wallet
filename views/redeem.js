window.views = window.views || {};
window.views.redeem = function(redeemCode) {
  const build = () => {
    return buildTemplate(html`
      <form id="redeem" method="post" class="$${redeemCode.details instanceof Promise && redeemCode.detailsCache === null ? 'loading' : redeemCode.details instanceof Error ? 'error' : ''}">
        <h2>Redeem Nano Currency</h2>
        <p class="complete">Redemption complete.</p>
        ${ redeemCode.decrypted === null ? html`
          <label>
            <span>Password</span>
            <input name="password" type="password" />
          </label>
          <button type="submit">Decrypt</button>
        ` :  redeemCode.detailsCache && redeemCode.detailsCache.info.balance === '0' ? html`
          <p>This redeem account does not have a balance.</p>
        ` : redeemCode.detailsCache ? html`
          <p class="balance">
            <span class="redeemValue">
              $${rawToXrb(redeemCode.detailsCache.info.balance).toString()}
            </span> NANO 
          </p>
          <label>
            <span>Recipient</span>
            <input name="recipient" />
            <p>
              xrb address
            </p>
          </label>
          <button type="submit">Send</button>
        ` : redeemCode.details instanceof Error ? html`
          <p>Invalid Redeem Code</p>
        ` : html`
          <p>Loading...</p>
        `}
      </form>`, {
      'form submit': (e, tpl, el) => {
        const sendParams = formValues(el);

        if(redeemCode.decrypted === null) {
          const redeemParts = redeemCode.raw.split(':');
          const decrypted = decrypt(redeemParts[0], redeemParts[1], sendParams.password);
          if(decrypted === null) {
            alert('Invalid password.');
            el.elements[0].value = '';
            el.elements[0].focus();
          } else {
            redeemCode.decrypted = uint8_b64(decrypted);
            redeemCode.decode();
            rebuild(tpl);
            // Rebuild when balance has been loaded
            redeemCode.details instanceof Promise &&
              redeemCode.details.then(() => rebuild(tpl));
          }
        } else {
          try {
            keyFromAccount(sendParams.recipient);
          } catch(error) {
            alert('Please specify a valid recipient address.');
            return;
          }

          el.classList.add('sending');
          redeemCode.send(sendParams.recipient).then(block => {
            el.classList.remove('sending');
            el.classList.add('complete');
            console.log(block);
          });
        }

      }
    }, {
      focusForm: true
    });
  }

  const rebuild = el => {
    while(el.firstChild)
      el.removeChild(el.firstChild);

    const newEl = build();

    while(el.children.length < newEl.children.length)
      el.appendChild(newEl.children[el.children.length]);
  };

  const out = build();
  // Rebuild when balance has been loaded
  redeemCode.details instanceof Promise &&
    redeemCode.details.then(() => rebuild(out));
  
  return out;
}
