window.views = window.views || {};
window.views.sendForm = function(account) {
  return buildTemplate(html`
    <form id="send" method="post" class="xrb_address">
      <h2>Send</h2>
      <label class="check">
        <input name="recipient_type" value="xrb_address" checked type="radio">
        <span>XRB Address</span>
        <p>Send from this account directly to another Nano account <code>xrb_</code> address.</p>
      </label>
      <label class="selDep xrb_address">
        <input name="recipient" placeholder="Recipient XRB Address" />
      </label>
      <label class="check">
        <input name="recipient_type" value="redeem_url" type="radio">
        <span>Redeemable URL</span>
        <p>Instead of inputting a recipient address, a link will be generated that can be shared in order to send Nano to anybody, even if they do not have a Nano wallet already.</p>
        <p>The base 64 encoded link code contains the private key of the randomly generated redeem account used (not connected to this wallet) and a valid work value to send the funds to another account immediately.</p>
      </label>
      <label class="selDep redeem_url">
        <input name="redeem_pass" type="password" placeholder="Redeem Encryption Password (Optional)" />
      </label>
      <label class="selDep redeem_url">
        <input name="redeem_pass_2" type="password" placeholder="Repeat Password" />
      </label>
      <label>
        <span>Amount</span>
        <input name="amount" autocomplete="off" />
        <p class="newBalance"></p>
      </label>
      <button type="submit">$${__`Send`}</button>
      <button type="button" class="cancel">Cancel</button>
    </form>`, {
    'button.cancel click': e => this.render(),
    'input[name=recipient_type] inputChange': (e, tpl, el) => {
      const form = tpl.children[0];
      const sendParams = formValues(form);
      if(sendParams.recipient_type === null) return;
      Array.prototype.forEach.call(document.getElementsByName(el.name), el => {
        form.classList.toggle(el.value, sendParams.recipient_type === el.value);
      });
    },
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

      if(sendParams.recipient_type === 'redeem_url') {
        // Give a recipient name for the confirmation
        sendParams.recipient = "redeemable link";
        if((sendParams.redeem_pass !== '' || sendParams.redeem_pass_2 !== '')
          && sendParams.redeem_pass !== sendParams.redeem_pass_2) {
          alert('Encryption passwords do not match.');
          return;
        }
      } else {
        try {
          keyFromAccount(sendParams.recipient);
        } catch(error) {
          alert('Please specify a valid recipient address.');
          return;
        }
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

      let operation;
      if(sendParams.recipient_type === 'redeem_url') {
        operation = account.sendToRedeemUrl(sendParams.amount, sendParams.redeem_pass);
      } else {
        operation = account.send(sendParams.recipient, sendParams.amount);
      }

      operation.then(result => this.render())
        .catch(reason => alert(reason));
      this.render();
    }
  }, {
    focusForm: true
  });
}
