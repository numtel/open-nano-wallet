window.views = window.views || {};
window.views.setRepresentative = function(account) {
  return buildTemplate(html`
    <form method="post">
      <h2>Set Representative</h2>
      <label>
        <span>Address</span>
        <input name="account" />
        <p>
          xrb address to use as representative account
        </p>
      </label>
      <button type="submit">Send</button>
      <button type="button" class="cancel">Cancel</button>
    </form>`, {
    'button.cancel click': e => this.render(),
    'form submit': (e, tpl, el) => {
      const params = formValues(el);
      try {
        keyFromAccount(params.account);
      } catch(error) {
        alert('Please specify a valid account address.');
        return;
      }

      account.change(params.account)
        .then(() => this.render())
        .catch(reason => alert(reason));
      this.render();
    }
  }, {
    focusForm: true
  });
}
