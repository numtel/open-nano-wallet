window.views = window.views || {};
window.views.footer = function() {
  return buildTemplate(html`
    <p id="footnote">
      $${__`Looking for help or to contribute?`}
      <a href="https://github.com/numtel/open-nano-wallet">$${__`View repository on GitHub`}</a>
      <br />
      <br />
      <select id="lang">
        <option value="en">English</option>
        ${Object.keys(window.lang).map(thisLang => html`
          <option value="${thisLang}"
            ${localStorage[LANG_LOCALSTORAGE_KEY]===thisLang ? 'selected' : ''}>
              ${window.lang[thisLang].English}
          </option>
        `).join('')}
      </select>
    </p>`, {
    'a click': (e, tpl, el) => externalLink(el.href),
    '#lang change': e => {
      localStorage[LANG_LOCALSTORAGE_KEY] = e.target.value;
      this.render();
    },
  });
}
