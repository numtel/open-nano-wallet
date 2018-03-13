window.views = window.views || {};
window.views.redeem = function(redeemCode) {
  const build = () => {
    return buildTemplate(html`
      <form id="redeem" method="post" class="$${redeemCode.details instanceof Promise && redeemCode.detailsCache === null ? 'loading' : redeemCode.details instanceof Error ? 'error' : ''}">
        <h2>Redeem Nano Currency</h2>
        ${ redeemCode.detailsCache && redeemCode.detailsCache.info.balance === '0' ? html`
          <p>This redeem account does not have a balance.<p>
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
        el.classList.add('sending');

        try {
          keyFromAccount(sendParams.recipient);
        } catch(error) {
          alert('Please specify a valid recipient address.');
          return;
        }

        redeemCode.send(sendParams.recipient).then(block => {
          el.classList.remove('sending');
          console.log(block);
        });

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
