# ABCDi
The Address Based Crypto Daemon Interaction module for NodeJS provides interaction with crypto daemon CLIs while treating crypto addresses as separate accounts, and provides functionalities for miner fees and company fees.

## Address Based
The key focus of this module is that it is entirely address-based. In traditional crypto, the daemon links addresses all to their original account and then when making transactions from the account takes currency from any addresses linked, meaning normally a separate wallet would have to be created for every user. ABCDi solved this problem by treating each address as a separate account, so that when a transaction is made it is withdrawn only from one address, not any linked to the same account. This makes generating online "wallets" easy, as only 1 wallet needs to be set up for the service then each user can simply get a generated address from that wallet, another feature inbuilt into the module.

## Functionality
This module can currently:
- Generate online "wallets" for users under one address each
- Create transactions between accounts, giving custom options for mining fees, and taking fees for profit.
- Check balances of specific addresses linked to the online account
- Validate crypto addresses
- Create raw transactions step by step (ONLY IF YOU KNOW HOW!)

## Development
Features will be added frequently as they are thought of / suggested.

# Documentation

## Functions

### `generateAddress ( )`
Generate an address for a user to be treated as a separate account. Returns a promise which is fullfilled with the address string.

### `checkBalance ( addr, min_conf )`
Check the balance of an address from transactions with a minimum confirmation of `min_conf`. Returns a promise which is fullfilled with the balance.

### `validateAddress ( addr )`
Check if the given address is a valid crypto address. Returns a promise which is fullfilled with the result (boolean).

### `transferFromToAddress ( from_addr, to_addr, amount, take_fees, fees_from_sender )`
Creates and sends a transaction of `amount` coins from `from_addr` to `to_addr`. If `take_fees` is `true`, a fraction of the transaction determined by `company_fee` in abcdi-conf.json will be automatically deducted from the transaction and added to the company wallet determined by `company_wallet` in abcdi-conf.json. The miner fee is specified by `miner_fee` in abcdi-conf.json as a set amount. If `fees_from_sender` is `true`, miner fees will be taken from the sender (so the sender sends more), if `false` the fees are taken from the recipient (so they receive less coins instead). Returns a promise fullfilled with the TXID of the transaction. Will reject with `"balance_low"` if `from_addr` does not have enough balance.

### Warning: The following are functions for creating raw transactions. Use only if you know how!

### `createRawTransaction ( from_addr, to_addr, amount, take_fees, fees_from_sender, callback )`
Creates a raw transaction with the same parameters as `transferFromToAddress`. Calls `callback ( err, tx_hex, input_txs )` were err is any error (`"balance_low"` if `from_addr` does not have enough balance), `tx_hex` is the hex of the transaction data and `input_txs` is an array of objects representing the unspent transactions used.

### `signRawTransaction ( tx_hex, from_addr, input_txs, callback )`
Signs a created raw transaction with sender `from_addr`. `tx_hex` is the hex of the raw transaction data, and `input_txs` is an array of objects representing the unspent transactions used. Calls `callback ( err, tx_signed_hex )` where `err` is any error and `tx_signed_hex` is the hex of the signed transaction data.

### `sendRawTransaction ( tx_signed_hex, callback )`
Sends a created and signed raw transaction with data provided by `tx_signed_hex`. Calls `callback ( err, txid )` where `err` is any error and `txid` is the TXID of the resulting transaction.

## Config
- path: The path to the crypto daemon CLI executeable, e.g. "bitcoin/bin/bitcoin-cli" (must omit file extension)
- company_wallet: The wallet to transfer company fees to
- miner_fee: The fixed rate fee for mining (higher fee = quicker confirmation time)
- company_fee: The fraction of a transaction to take as a company fee (if the transaction has `take_fees` set to `true`)
