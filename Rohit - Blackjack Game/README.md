# Blackjack DAPP

A blackjack game programmed for the FAB blockchain. Currently able to deploy on Ganache's Ethreum testnet

## Prerequisites
Requires node.js and npm for installing server

## Installation

For the database, install the [MongoDB Community Server](https://www.mongodb.com/download-center/community). Follow the instructions here to [Run MongoDB from the command line](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/).

For the Ethreum EVM install [Ganache](https://www.trufflesuite.com/ganache)

In the Blackjack DAPP directory, run the following npm command

```bash
npm install
```

## Usage
Run **Ganache** by creating a new new quickstart workspace

Run **MongoDB** by inputting the following command in your windows terminal
```bash
"C:\Program Files\MongoDB\Server\4.0\bin\mongod.exe" --dbpath="C:\Program Files\MongoDB\Server\4.0\bin\data\db"
```
Run the **server** by inputting the following command in your windows terminal
```bash
node server.js
```
In your browser enter **localhost:3000** to open the game

## Contact
Please contact rohitkrishna.ca@gmail.com for any questions or concerns or if you would like to contribute.

## Contributions
For local contributions:
- If editing the smart contract, to export edits to be seen by api run ` solc --optimize --combined-json abi,asm,ast,bin,bin-runtime,interface,opcodes,srcmap,srcmap-runtime Blackjack.sol > blackjack.json
` in a Windows terminal in the **smart contract** directory. Then copy all data from the **blackjack.json** file and paste it after the "=" near the beginning of the **blackjack.js** file.
- To export api edits to the client-side (will have to be done when **blackjack.js** is edited as well) run `browserify api.js -o api-web.js` in a Windows terminal in the **api** directory.

## License
[MIT](https://github.com/blockchaingate/gambling/blob/master/LICENSE)