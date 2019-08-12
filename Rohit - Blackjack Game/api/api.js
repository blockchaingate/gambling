
/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Auto create hashs using large random numbers     |*|
|*| (-) Make api format uniform for HTML JS              |*|
|*| (-)	Edit function to send rand nums to put in api    |*|
|*| 	format											 |*|
|*|                                                      |*|
\*|======================================================|*/

const Web3 = require("web3");
const bj = require("../smart contract/blackjack.js");
const request = require('request');
// Probably dont need --> converting from testnet to real //const web3 = (window.ethereum)? new Web3(window.ethereum) : null;
let web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:7545"));
//let web3 = new Web3("http://localhost:7545", null, {});
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.defaultGasPrice = 1;
web3.eth.defaultGas = 6721975;

let cBlackjack = bj.con["contracts"]["Blackjack.sol:Blackjack"];
let Blackjack = new web3.eth.Contract(JSON.parse(cBlackjack.abi),{ gasLimit:6721975, gasPrice: 1 }); //Remove options for older Web3 version
Blackjack.options.data = "0x" + cBlackjack.bin;

let acc = [];
let privateKeys = ["0xe6974be75995c317b182ff6e7b33058e7ba3328354305040a075d544db240886", "0x5275f72548b49081aab8b9f71dfca866247dddefb706f4cfa751284d5221027e","0x2d85d928177456a12b6564864920e5ff672b262496477b7406659a3d418e5a2c","0xe66d847b96768a175b4db00d095fbb38ba5b4e7992d86797394a2a4ebe710bd2","0xff725e440c2f6b4682f203fa38e75ae0ad5d37aaa5e5e23139a77f819aaef926"];

for(let key of privateKeys) {
	acc.push(web3.eth.accounts.privateKeyToAccount(key));
	//console.log("account " + acc[acc.length - 1].address);
}

const ownerKey = acc[0].address;
const client1Key = acc[1].address;
const client2Key = acc[2].address;
const client3Key = acc[3].address;
const client4Key = acc[4].address;

//console.time("Time taken");
async function runGame() {
	let contract = await makeContract(ownerKey,Math.pow(10,18).toString(10),Math.pow(10,19).toString(10));
	//await contract.methods.newGame().send({from: ownerKey});
	await joinGame(contract);
	await createRandom(contract);
	await showInitialCards(contract);
	await split(contract, client1Key);
	await hit(contract, client1Key);
	await contract.methods.stand().send({from: client1Key});
	await contract.methods.transferToSplit().send({from: client1Key});
	await hit(contract, client1Key);
	await contract.methods.stand().send({from: client1Key});
	await hit(contract, client2Key);
	await contract.methods.stand().send({from: client2Key});
	await contract.methods.finalRandProcess().send({from: ownerKey});
	await createRandom(contract);
	await withdraw(contract);
	//await console.timeEnd("Time taken");
}

async function makeContract(address,minBet,maxBet) { 
	let contract = await Blackjack
	.deploy({
		"arguments": [minBet,maxBet],
	})
	.send({
		from: address
	})
	await request({
		url: 'http://localhost:3000/games',
		method: 'POST',
		json: {
		  address: contract.options.address,
		  minBet: minBet,
		  maxBet: maxBet
		}
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
		console.log(body);
	  }
	);
	await contract.methods.newGame().send({from: address});
	return contract;
}

async function joinGame(contract) {
	await contract.methods.joinGame().send({from: client1Key, value: 2 * Math.pow(10,18)});
	await contract.methods.bet(Math.pow(10,18).toString(10)).send({from: client1Key});
	await contract.methods.joinGame().send({from: client2Key, value: 2 * Math.pow(10,18)}); 
	await contract.methods.bet(Math.pow(10,18).toString(10)).send({from: client2Key});
	await contract.methods.startTimer().send({from: ownerKey});
	await timeBurn(contract,ownerKey);
	await contract.methods.players(client1Key).call()
		/*.then(console.log)*/;
	await contract.methods.closeGame().send({from: ownerKey, value: 10 * Math.pow(10,18)});
	await contract.methods.players(client1Key).call()
		/*.then(console.log)*/;
	await contract.methods.submitDeposit().send({from: client1Key, value: 10 * Math.pow(10,18)});
	await contract.methods.submitDeposit().send({from: client2Key, value: 10 * Math.pow(10,18)});
}

async function createRandom(contract) {
	await contract.methods.submitReturnHash('722775529745285120').send({from: client1Key});
	await contract.methods.submitReturnHash('388335581365825281').send({from: client2Key});
	await contract.methods.submitReturnHash('3963456789123455313').send({from: ownerKey});
	await contract.methods.submitNumber('722775529745285120').send({from: client1Key});
	await contract.methods.submitNumber('388335581365825281').send({from: client2Key});
	await contract.methods.submitNumber('3963456789123455313').send({from: ownerKey});
}

async function showInitialCards(contract) {
	await contract.methods.showCards().call({from: ownerKey})
		.then(console.log);
	await contract.methods.showCards().call({from: client1Key})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: client1Key})
		.then(console.log);
	await contract.methods.showCards().call({from: client2Key})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: client2Key})
		.then(console.log);
}

async function hit(contract,clientKey) {
	await contract.methods.submitHashRequest('42450096').send({from: clientKey});
	await contract.methods.submitHashResponse('12034602216',0).send({from: ownerKey});
	await contract.methods.numRequest('42450096').send({from: clientKey});
	await contract.methods.numResponse('12034602216',0).send({from: ownerKey});
	await contract.methods.hit().send({from: clientKey});
	await contract.methods.showCards().call({from: clientKey})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: clientKey})
		.then(console.log);
}

async function split(contract,clientKey) {
	await contract.methods.split().send({from: clientKey});
	await contract.methods.showCards().call({from: clientKey})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: clientKey})
		.then(console.log);
} 

async function withdraw(contract) {
	await contract.methods.withdraw((100 * Math.pow(10,18)).toString(10)).send({from: client1Key});
	await contract.methods.withdraw((100 * Math.pow(10,18)).toString(10)).send({from: client2Key});
	await remove(contract);
	await contract.methods.end().send({from: ownerKey});
}

async function timeBurn(contract,clientKey) {
	for (let i = 0; i < 5; i ++) {
		await contract.methods.doNothing().send({from: clientKey});
	}
} // temp

async function removeOne(contract) {
	await request({
		url: 'http://localhost:3000/games/'+contract.options.address+'/',
		method: 'DELETE'
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
		console.log(body);
	})
}

async function removeAll() {
	await request({
		url: 'http://localhost:3000/games/',
		method: 'DELETE'
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
		console.log(body);
	})
}


function getGames() {
	let arr = [];
	return new Promise(function(resolve,reject) {
		request('http://localhost:3000/games', { json: true }, (err, res, body) => {
			if (err) { return console.log(err); }
			for (let i = 0; i < body.length; i++)
			{
				arr.push({address: body[i].address, minBet: body[i].minBet, maxBet: body[i].maxBet});
			}
			resolve(arr);
		});
	});
}

function makeEventListener(contract, func) {
	contract.once('StateChange',
	/*contract.events.StateChange(*/function (err, event) { //Commented code for unlimited listening
		if (err) {
			console.log(err);
		} else {
			console.log(event.returnValues.newState);
			func();
		}
	});
}

function hearAllEvents(contract) {
	contract.events.StateChange(function (err, event) { //Commented code for unlimited listening
		if (err) {
			console.log(err);
		} else {
			console.log(event.returnValues.newState);
		}
	});
}

//window.runGame = runGame;
window.Web3 = Web3;
window.bj = bj;
window.web3 = web3;
window.cBlackjack = cBlackjack;
window.makeContract = makeContract;
window.getGames = getGames;
window.timeBurn = timeBurn;
window.makeEventListener = makeEventListener;
//window.removeOne = removeOne;

//testing
window.removeAll = removeAll;
window.hearAllEvents = hearAllEvents;

//runGame();
//makeEventListener(contract);

//=====================================================================================Temp code=====================================================================================\\

/*function count(n) {
	console.log(n++); 
	if (n < 30){
	setTimeout(function(){count(n)}, 1000);
	}
}
count(0);*/