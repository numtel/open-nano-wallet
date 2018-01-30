window.views = window.views || {};
window.views.sendForm = function(account) {
  return buildTemplate(html`
    <form id="send" method="post">
      <h2>Send</h2>
      <label>
        <span>Recipient</span>
        <input name="recipient" />
        <p>
          xrb address
        </p>
      </label>
      <label>
        <span>Amount</span>
        <input name="amount" autocomplete="off" />
        <p class="newBalance"></p>
      </label>
      <button type="submit">Send</button>
      <button type="button" class="cancel">Cancel</button>
    </form>`, {
    'button.cancel click': e => this.render(),
    'input[name=amount] inputChange': (e, tpl, el) => {
      const addr = tpl.querySelector('p.newBalance');
      const amount = parseFloat(el.value);
      if(amount === 0 || isNaN(amount)) {
        addr.innerHTML = 'Please specify an amount to send.';
        return;
      }

      const newBalance = Big(account.detailsCache.info.balance).minus(xrbToRaw(amount)).toFixed();

      if(Big(newBalance).lt(0)) {
        addr.innerHTML = 'Insufficient funds.';
        return;
      } else addr.innerHTML = 'New Balance: ' + rawToXrb(newBalance).toString();
    },
    'form submit': (e, tpl, el) => {
      const sendParams = formValues(el);

      try {
        keyFromAccount(sendParams.recipient);
      } catch(error) {
        alert('Please specify a valid recipient address.');
        return;
      }

      const amount = parseFloat(sendParams.amount)
      if(amount === 0 || isNaN(amount)) {
        alert('Please specify an amount to send.');
        return;
      }

      const newBalance = Big(account.detailsCache.info.balance).minus(xrbToRaw(sendParams.amount)).toFixed();
      if(Big(newBalance).lt(0)) {
        alert('Insufficient funds.');
        return;
      }

      if(!confirm(`Send ${sendParams.amount} to ${sendParams.recipient}?\n\nNew balance will be ${rawToXrb(newBalance).toString()}`)) return;

      account.send(sendParams.recipient, sendParams.amount)
        .then(result => this.render())
        .catch(reason => alert(reason));
      this.render();
    }
  }, {
    focusForm: true
  });
}
