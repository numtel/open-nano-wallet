window.views = window.views || {};
window.views.setRepresentative = function(account) {
  return buildTemplate(html`
    <form method="post">
      <h2>$${__`Set Representative`}</h2>
      <label>
        <span>$${__`Address`}</span>
        <input name="account" />
        <p>
          $${__`xrb address to use as representative account`}
        </p>
      </label>
      <button type="submit">$${__`Set Representative`}</button>
      <button type="button" class="cancel">$${__`Cancel`}</button>
    </form>`, {
    'button.cancel click': e => this.render(),
    'form submit': (e, tpl, el) => {
      const params = formValues(el);
      try {
        keyFromAccount(params.account);
      } catch(error) {
        alert(__`Please specify a valid account address.`);
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
