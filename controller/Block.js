function valueForHash(property, value) {
  // Transform addresses to public keys
  if(['destination', 'representative', 'account'].indexOf(property) !== -1) {
    value = keyFromAccount(value);
  }
  return value;
}

class FieldError extends Error {}

const TYPES = {
  send: 0x02,
  receive: 0x03,
  open: 0x04,
  change: 0x05
};

const REQUIRED_FIELDS = {
  // These are listed in the order that they need to be hashed
  previous: { types: [ TYPES.send, TYPES.receive, TYPES.change ], length: 32 },
  destination: { types: [ TYPES.send ], length: 32 },
  balance: { types: [ TYPES.send ], length: 16 },
  source: { types: [ TYPES.receive, TYPES.open ], length: 32 },
  representative: { types: [ TYPES.open, TYPES.change ], length: 32 },
  account: { types: [ TYPES.open ], length: 32 }
};

class Block {
  constructor(params) {
    this.params = Object.assign({
      type: 'invalid', // Required: String
      // ... other block fields, see REQUIRED_FIELDS
    }, params);
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

    const fields = Object.keys(REQUIRED_FIELDS).reduce((out, param) => {
      if(REQUIRED_FIELDS[param].types.indexOf(TYPES[block.type]) !== -1) out.push(param);
      return out;
    }, []);

    const header = Uint8Array.from([
      0x52, // magic number
      0x43, // 43 for mainnet, 41 for testnet
      0x05, // version max
      0x05, // version using
      0x01, // version min
      0x03, // type (3 = publish)
      0x00, // extensions 16-bits
      TYPES[block.type], // extensions 16-bits ( block type )
    ]);

    const values = concat_uint8(fields.map(field => {
      if(!(field in block))
        throw new FieldError(field)

      const value = hex_uint8(valueForHash(field, block[field]));
      if(value.length !== REQUIRED_FIELDS[field].length)
        throw new FieldError(field);

      return value;
    }));

    const context = blake2bInit(32, null);
    blake2bUpdate(context, values);
    const hash = blake2bFinal(context);

    const signature = nacl.sign.detached(hash, hex_uint8(accountKey));
    const work = hex_uint8(block.work).reverse();

    return {
      msg: [ header, values, signature, work ].map(part => uint8_hex(part)).join(''),
      hash: uint8_hex(hash)
    };
  }

}

