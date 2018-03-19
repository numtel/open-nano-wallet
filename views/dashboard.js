window.views = window.views || {};
window.views.dashboard = function() {
  if(!this.wallet)
    return this.views.signIn();
  if(this.wallet.params.accounts.length === 0)
    return this.views.manageAccount();

  const account = this.wallet.params.accounts[this.selectedAccount];
  const details = !account.loading ? account.detailsCache : null;
  if(!account.loading && !account.detailsCache)
    account.details
      // Reload when details are ready
      .then(() => this.render())
      .catch(reason => {
        out.querySelector('#history li.error').classList.remove('hidden');
        console.error(reason);
      });

  const out = buildTemplate(html`
    <div id="currentAccount">
      <div class="balance $${details ? '' : 'loading'}">
          <span class="xrb">${details ? rawToXrb(details.info.balance).toString() : ''}</span>
          ${details && account.nextWork instanceof Promise ?
              html`<span class="fiat">$${__`Loading work...`}</span>` : ''}
      </div>
      <a href="#" class="showMenu" title="$${__`Show Menu`}"><i class="fa fa-bars"></i></a>
      <h1><a href="#" class="showActions" title="$${__`Account Actions`}">$${account.data.name}<i class="fa fa-sort-desc"></i></a></h1>
      <ul id="actions" class="hidden">
				${details && details.history.length !== 0 ? html`
					<li><a href="#" class="sendForm">
						<i class="fa fa-arrow-right fa-fw"></i>$${__`Send...`}</a></li>
				` : ''}
        <li><a href="#" class="editAccount">
          <i class="fa fa-pencil fa-fw"></i>$${__`Edit Account...`}</a></li>
				${details && details.history.length !== 0 ? html`
					<li><a href="#" class="changeRep">
						<i class="fa fa-flag fa-fw"></i>$${__`Change Representative...`}</a></li>
				` : ''}
        <li><a href="#" class="refresh">
          <i class="fa fa-refresh fa-fw"></i>$${__`Refresh`}</a></li>
      </ul>
      <h2 class="dont-break-out">$${account.address}</h2>
    </div>
    <ul id="mainMenu">
      ${this.wallet.params.accounts.map((acct, index) =>
        html`<li><a href="#" class="account" data-index="$${index}"><i class="fa fa-money fa-fw"></i> $${acct.data.name}</a></li>`).join('')}
      <li><a href="#" class="addAccount"><i class="fa fa-plus fa-fw"></i> $${__`Add Account`}</a></li>
      <li><a href="#" class="displaySeed"><i class="fa fa-floppy-o fa-fw"></i> $${__`Display Wallet Seed`}</a></li>
      <li><a href="#" class="remoteWork"><i class="fa fa-$${this.workFromRemote ? 'check-square' : 'square-o'} fa-fw"></i> $${__`Fetch Remote Work`}</a></li>
      <li><a href="#" class="logout"><i class="fa fa-sign-out fa-fw"></i> $${__`Log Out`}</a></li>
    </ul>
    ${!details ? html`
      <pre id="txStatus"></pre>
    ` : ''}
    <ol id="history">
      ${details && details.pending.length ? details.pending.map((block, index) => html`<li class="pending">
        <i class="fa fa-arrow-left fa-3x fa-fw"></i>
        <dl>
          <dt>$${__`Pending`}:</dt>
          <dd>
            <a class="external" href="https://www.nanode.co/block/$${block.hash}" title="$${__`View block on explorer`}">
              $${__`Block`} $${index}
            </a>
          </dd>
          <dt>$${__`From`}:</dt>
          <dd class="dont-break-out">
            <a class="external" href="https://www.nanode.co/account/$${block.account}">
              $${block.account}
            </a>
          </dd>
          <dt>$${__`Amount`}:</dt>
          <dd>$${rawToXrb(block.amount).toString()}</dd>
          <dt>$${__`Action`}:</dt>
          <dd><a href="#" class="acceptPending" data-hash="$${block.hash}">$${__`Accept Pending Block`}</a></dd>
        </dl>
      </li>`) : ''}
      <li class="no-blocks error hidden">
        $${__`Error fetching account.`}
        <a href="#" class="refresh">$${__`Refresh`}</a>
      </li>
      ${details && details.history.length === 0 ? html`
        <li class="no-blocks">$${__`No transactions in this account`}</li>` : ''}
      ${details && details.history.length !== 0 ? details.history.map((block, index) => html`<li>
        ${ block.type === 'send' ? html`<i class="fa fa-arrow-right fa-3x fa-fw"></i>` : '' }
        ${ block.type === 'receive' ? html`<i class="fa fa-arrow-left fa-3x fa-fw"></i>` : '' }
        <dl>
          <dt>$${capitalize(__({raw:[block.type]}))}:</dt>
          <dd>
            <a class="external" href="https://www.nanode.co/block/$${block.hash}" title="$${__`View block on explorer`}">
              $${__`Block`} $${index}
            </a>
          </dd>
          <dt>${ block.type === 'send' ? __`To` : __`From` }:</dt>
          <dd class="dont-break-out">
            <a class="external" href="https://www.nanode.co/account/$${block.account}">
              $${block.account}
            </a>
          </dd>
          ${ block.hash in account.data.redeemSends ? html`
            <dt>$${__`Redeem`}:</dt>
            <dd class="ellipsis">
              <a class="external" href="$${this.baseHref}?redeem=$${account.data.redeemSends[block.hash]}">
                $${this.baseHref}?redeem=$${account.data.redeemSends[block.hash]}
              </a>
            </dd>
          ` : ''}
          <dt>$${__`Amount`}:</dt>
          <dd>$${block.amountXrb ? block.amountXrb : ''}</dd>
          <dt>$${__`Balance`}:</dt>
          <dd>$${block.balanceXrb ? block.balanceXrb : ''}</dd>
        </dl>
      </li>`).join('') : '' }
    </ol>`, {
    'a.external click': (e, tpl, el) => externalLink(el.href),
    '.showActions, #actions click': (e, tpl) =>
      !account.loading && tpl.querySelector('#actions').classList.toggle('hidden'),
    '.refresh click': e => {
      account.refresh()
        .then(() => this.render())
        .catch(reason => { account.loading = false; alert(reason); this.render(); });
      this.render();
    },
    '.sendForm click': e => this.render(this.views.sendForm(account)),
    '.changeRep click': e => this.render(this.views.setRepresentative(account)),
    '.editAccount click': e => this.render(this.views.manageAccount(account, true)),
    '.addAccount click': e => this.render(this.views.manageAccount(undefined, true)),
    '.remoteWork click': e => {
      this.workFromRemote = localStorage[REMOTE_WORK_LOCALSTORAGE_KEY] = !this.workFromRemote;
      this.workQueueStop && this.workQueueStop();
      this.render();
    },
    '.logout click': e => {
      this.wallet = null;
      this.selectedAccount = 0;
      this.workQueueStop && this.workQueueStop();
      this.render();
    },
    '.displaySeed click': e => this.render(this.views.showSeed()),
    '#history a.acceptPending click': (e, tpl, el) => {
      const block = details.pending
        .filter(blk => blk.hash === el.getAttribute('data-hash'))[0];
      account.acceptPending(block)
        .then(result => this.render())
        .catch(reason => alert(reason));
      this.render();
    },
    '#mainMenu a.account click': (e, tpl, el) => {
      this.selectedAccount = parseInt(el.getAttribute('data-index'), 10);
      this.render();
    },
    '.showMenu, #mainMenu click': (e, tpl) =>
      tpl.querySelector('#mainMenu').classList.toggle('open'),
  });
  return out;
}

window.views.showSeed = function() {
  return buildTemplate(html`
    <form method="post">
      <h1>$${__`Wallet Seed Value`}</h1>
      <p class="dont-break-out">$${this.wallet.params.seed}</p>
      <p>$${__`Always keep a backup of your seed value.`}</p>
      <p>$${__`All accounts can be recovered from this seed value. Protect it!`}</p>
      <button type="button" class="export">$${__`Export Wallet`}</button>
      <button type="button" class="cancel">$${__`Close`}</button>
    </form>`, {
    'button.export click': e => this.exportWallet(),
    'button.cancel click': e => this.render()
  });
}
