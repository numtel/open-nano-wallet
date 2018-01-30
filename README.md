# XRB Light Wallet

[Raiblocks](https://raiblocks.net) wallet that runs without a full node.

## How It Works

Backend services are comprised of [2 very simple AWS Lambda functions](api.yml):

1. `/account` Transaction history is gleaned from the [Raiblocks.club block explorer](https://www.raiblocks.club)
2. `/publish` New blocks are published to the network using a generic UDP publisher

The frontend may be served statically since there is no central wallet database. Wallets are encrypted using a randomly generated salt and your given password then kept in the browser's `localStorage`.

Proof of work (PoW) is calculated using [jaimehgb/RaiBlocksWebAssemblyPoW](https://github.com/jaimehgb/RaiBlocksWebAssemblyPoW). A [WASM compatible browser](https://caniuse.com/#feat=wasm) is required to calculate work values.

Work values begin calculating as soon as possible and are persisted in the stored wallet for later use. Long transaction processing times indicate that the work value is still calculating.

## Installation

1. Create a new AWS CloudFormation stack using the [`api.yml` stack template](api.yml).
2. Update the endpoint URL values in [`index.html`](index.html)
3. Host the frontend
```sh
$ python -m SimpleHTTPServer
```
4. Browse to the frontend: [`http://localhost:8000`](http://localhost:8000)

## License

MIT
