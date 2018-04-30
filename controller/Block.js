class FieldError extends Error {}

const TYPES = {
  send: 0x02,
  receive: 0x03,
  open: 0x04,
  change: 0x05,
  state: 0x06
};

const REQUIRED_FIELDS = {
  // These are listed in the order that they need to be hashed
  previous: { types: [ TYPES.send, TYPES.receive, TYPES.change, TYPES.state ], length: 32 },
  destination: { types: [ TYPES.send ], length: 32 },
  balance: { types: [ TYPES.send, TYPES.state ], length: 16 },
  source: { types: [ TYPES.receive, TYPES.open ], length: 32 },
  representative: { types: [ TYPES.open, TYPES.change, TYPES.state ], length: 32 },
  account: { types: [ TYPES.open, TYPES.state ], length: 32 },
  link: { types: [ TYPES.state ], length: 32 }
};

// Specify block types whose field hashing order do not match
//  the REQUIRED_FIELDS dictionary.
const SPECIAL_ORDERING = {
  state: [ 'account', 'previous', 'representative', 'balance', 'link' ]
};

// Specify block types whose work value is represented in big-endian format
const BIG_ENDIAN_WORK = [
  'state'
];

class Block {
  constructor(params, account) {
    this.params = Object.assign({
      type: 'invalid', // Required: String
      // ... other block fields, see REQUIRED_FIELDS
      // non-standard 'amount' field with receive/open used to calculate
      //  balance for state block conversion
    }, params);

    this.account = account;
  }

  /*
    Compute hash, work, and signature for this block
    @param  accountKey String private key for account
    @return Object signed block
   */
  sign(accountKey) {
    const block = this.params;
    if(!('type' in block) || !(block.type in TYPES))
      throw new FieldError('type');

    let blockType = block.type;
    // Upgrade old transaction block to state block if account requests
    const stateFields = {};

    if(this.account && this.account.usingStateBlocks) {
      blockType = 'state';
      stateFields.account = this.account.address;

      if(!('representative' in block))
        stateFields.representative = this.account.detailsCache.info.representative;

      switch(block.type) {
        case 'open':
          stateFields.previous = zeroPad(0, 32);
          stateFields.balance = block.amount;
          stateFields.link = block.source;
          break;
        case 'receive':
          stateFields.balance =
            Big(this.account.detailsCache.info.balance)
              .plus(block.amount).toFixed();
          stateFields.link = block.source;
          break;
        case 'send':
          stateFields.link = block.destination;
          break;
        case 'change':
          stateFields.balance = this.account.detailsCache.info.balance;
          stateFields.link = zeroPad(0, 32);
          break;
      }
    }

    const fields = blockFields(blockType);

    const header = Uint8Array.from([
      0x52, // magic number
      0x43, // 43 for mainnet, 41 for testnet
      0x07, // version max
      0x07, // version using
      0x01, // version min
      0x03, // type (3 = publish)
      0x00, // extensions 16-bits
      TYPES[blockType], // extensions 16-bits ( block type )
    ]);

    const values = concat_uint8(fields.map(field => {
      if(!(field in block))
        throw new FieldError(field)

      const value = hex_uint8(valueForHash(field, stateFields[field] || block[field]));
      if(value.length !== REQUIRED_FIELDS[field].length)
        throw new FieldError(field);

      return value;
    }));

    const context = blake2bInit(32, null);
    blake2bUpdate(context, values);
    const hash = blake2bFinal(context);

    const signature = nacl.sign.detached(hash, hex_uint8(accountKey));
    let work = hex_uint8(block.work);
    if(BIG_ENDIAN_WORK.indexOf(blockType) === -1)
      work = work.reverse();

    return {
      msg: [ header, values, signature, work ].map(part => uint8_hex(part)).join(''),
      hash: uint8_hex(hash)
    };
  }

}

function valueForHash(property, value) {
  // Link values of zero are not transformed
  if(property === 'link' && value === zeroPad(0, 32))
    return value;
  // Transform addresses to public keys
  if(['destination', 'representative', 'account', 'link'].indexOf(property) !== -1) {
    value = keyFromAccount(value);
  }
  return value;
}

function blockFields(blockType) {
  if(blockType in SPECIAL_ORDERING)
    return SPECIAL_ORDERING[blockType];

  return Object.keys(REQUIRED_FIELDS).reduce((out, param) => {
    if(REQUIRED_FIELDS[param].types.indexOf(TYPES[blockType]) !== -1) out.push(param);
    return out;
  }, []);
}
