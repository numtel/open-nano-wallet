window.views = window.views || {};
window.views.dashboard = function() {
  if(!this.wallet)
    return this.views.signIn();
  if(this.wallet.params.accounts.length === 0)
    return this.views.manageAccount();

  const account = this.wallet.params.accounts[this.selectedAccount];
  const details = !account.loading ? account.detailsCache : null;
  if(!account.loading && !account.detailsCache)
    account.details.then(() => this.render()); // Reload when details are ready

  return buildTemplate(html`
    <div id="currentAccount">
      <div class="balance $${details ? '' : 'loading'}">
          <span class="xrb">${details ? rawToXrb(details.info.balance).toString() : ''}</span>
          ${details && account.nextWork instanceof Promise ?
              html`<span class="fiat">Loading work...</span>` : ''}
      </div>
      <a href="#" class="showMenu" title="Show Menu"><i class="fa fa-bars"></i></a>
      <h1><a href="#" class="showActions" title="Account Actions">$${account.data.name}<i class="fa fa-sort-desc"></i></a></h1>
      <ul id="actions" class="hidden">
        <li><a href="#" class="sendForm">
          <i class="fa fa-arrow-right fa-fw"></i>Send...</a></li>
        <li><a href="#" class="editAccount">
          <i class="fa fa-pencil fa-fw"></i>Edit Account...</a></li>
        <li><a href="#" class="changeRep">
          <i class="fa fa-flag fa-fw"></i>Change Representative...</a></li>
        <li><a href="#" class="refresh">
          <i class="fa fa-refresh fa-fw"></i>Refresh</a></li>
      </ul>
      <h2 class="dont-break-out">$${account.address}</h2>
    </div>
    <ul id="mainMenu">
      ${this.wallet.params.accounts.map((acct, index) =>
        html`<li><a href="#" class="account" data-index="$${index}"><i class="fa fa-money fa-fw"></i> $${acct.data.name}</a></li>`).join('')}
      <li><a href="#" class="addAccount"><i class="fa fa-plus fa-fw"></i> Add Account</a></li>
      <li><a href="#" class="displaySeed"><i class="fa fa-floppy-o fa-fw"></i>Display Wallet Seed</a></li>
      <li><a href="#" class="logout"><i class="fa fa-sign-out fa-fw"></i>Log Out</a></li>
    </ul>
    <ol id="history">
      ${details && details.pending.length ? details.pending.map((block, index) => html`<li class="pending">
        <i class="fa fa-arrow-left fa-3x fa-fw"></i>
        <dl>
          <dt>Pending:</dt>
          <dd>
            <a href="https://www.raiblocks.club/block/$${block.hash}" title="View block on explorer">
              Block $${index}
            </a>
          </dd>
          <dt>From:</dt>
          <dd class="dont-break-out">
            <a href="https://www.raiblocks.club/account/$${block.account}">
              $${block.account}
            </a>
          </dd>
          <dt>Amount:</dt>
          <dd>$${rawToXrb(block.amount).toString()}</dd>
          <dt>Action:</dt>
          <dd><a href="#" class="acceptPending" data-hash="$${block.hash}">Accept Pending Block</a></dd>
        </dl>
      </li>`) : ''}
      ${details && details.history.length === 0 ? html`
        <li class="no-blocks">No transactions in this account</li>` : ''}
      ${details && details.history.length !== 0 ? details.history.map((block, index) => html`<li>
        ${ block.type === 'send' ? html`<i class="fa fa-arrow-right fa-3x fa-fw"></i>` : '' }
        ${ block.type === 'receive' ? html`<i class="fa fa-arrow-left fa-3x fa-fw"></i>` : '' }
        <dl>
          <dt>$${block.type.charAt(0).toUpperCase() + block.type.slice(1)}:</dt>
          <dd>
            <a href="https://www.raiblocks.club/block/$${block.hash}" title="View block on explorer">
              Block $${index}
            </a>
          </dd>
          <dt>${ block.type === 'send' ? 'To' : 'From' }:</dt>
          <dd class="dont-break-out">
            <a href="https://www.raiblocks.club/account/$${block.account}">
              $${block.account}
            </a>
          </dd>
          <dt>Amount:</dt>
          <dd>$${block.amountXrb ? block.amountXrb : ''}</dd>
          <dt>Balance:</dt>
          <dd>$${block.balanceXrb ? block.balanceXrb : ''}</dd>
        </dl>
      </li>`).join('') : '' }
    </ol>`, {
    '.showActions, #actions click': (e, tpl) =>
      tpl.querySelector('#actions').classList.toggle('hidden'),
    '.refresh click': e => {
      account.refresh()
        .then(() => this.render())
        .catch(reason => alert(reason));
      this.render();
    },
    '.sendForm click': e => this.render(this.views.sendForm(account)),
    '.changeRep click': e => this.render(this.views.setRepresentative(account)),
    '.editAccount click': e => this.render(this.views.manageAccount(account, true)),
    '.addAccount click': e => this.render(this.views.manageAccount(undefined, true)),
    '.logout click': e => { this.wallet = null; this.render(this.views.signIn()); },
    '.displaySeed click': e => this.render(this.views.showSeed()),
    '#history a.acceptPending click': (e, tpl, el) => {
      const block = details.pending
        .filter(blk => blk.hash === el.getAttribute('data-hash'))[0];
      account.acceptPending(block)
        .then(result => this.render())
//         .catch(reason => alert(reason));
      this.render();
    },
    '#mainMenu a.account click': (e, tpl, el) => {
      this.selectedAccount = parseInt(el.getAttribute('data-index'), 10);
      this.render();
    },
    '.showMenu, #mainMenu click': (e, tpl) =>
      tpl.querySelector('#mainMenu').classList.toggle('open'),
  });
}

window.views.showSeed = function() {
  return buildTemplate(html`
    <form method="post">
      <h1>Wallet Seed Value</h1>
      <p class="dont-break-out">$${this.wallet.params.seed}</p>
      <p>Always keep a backup of your seed value.</p>
      <p>All accounts can be recovered from this seed value. Protect it!</p>
      <button type="button" class="cancel">Close</button>
    </form>`, {
    'button.cancel click': e => this.render()
  });
}
