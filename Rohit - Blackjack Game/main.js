
/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Use function template to simplify code for user  |*|
|*| (-) Auto create hashs using large random numbers     |*|
|*|                                                      |*|
\*|======================================================|*/

const Web3 = require("web3");
const fs = require("fs");

let web3 = new Web3("http://localhost:7545", null, {});
web3.eth.transactionConfirmationBlocks = 1;
web3.eth.defaultGasPrice = 1;
web3.eth.defaultGas = 6721975;

let contracts = JSON.parse(fs.readFileSync("Blackjack.json"))["contracts"]
let cBlackjack = contracts["Blackjack.sol:Blackjack"]
let Blackjack = web3.eth.Contract(JSON.parse(cBlackjack.abi));
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

console.time("Time taken");

makeContract().then((contract) => {
	Promise.all ([
		contract.methods.newGame().send({from: ownerKey})
		.then(() => {
			return joinGame(contract);
		})
		.then(()=> {
			return createRandom(contract);
		})
		.then(() => {
			return showInitialCards(contract);
		})
		.then(() => {
			return split(contract, client1Key);
		})
		.then(() => {
			return hit(contract, client1Key);
		})
		.then(() => {
			return contract.methods.stand().send({from: client1Key});
		})
		.then(() => {
			return contract.methods.transferToSplit().send({from: client1Key});
		})
		.then(() => {
			return hit(contract, client1Key);
		})
		.then(() => {
			return contract.methods.stand().send({from: client1Key});
		})
		.then(() => {
			return hit(contract, client2Key)
		})
		.then(() => {
			return contract.methods.stand().send({from: client2Key});
		})
		.then(() => {
			return contract.methods.finalRandProcess().send({from: ownerKey})
		})
		.then(() => {
			return createRandom(contract);
		})
		.then(() => {
			return withdraw(contract);
		})
		.then(() => {
			return contract.methods.showCards().call({from: ownerKey})
			.then(console.log);
		})
		.then(() => {
			console.timeEnd("Time taken");
		})
	]);
});

function makeContract() {
	return Blackjack
	.deploy({
		//"arguments": [ownerKey],
	})
	.send({
		from: ownerKey
	})
}

function joinGame(contract) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.joinGame().send({from: client1Key, value: 2 * Math.pow(10,18)});
	})
	.then(() => {
		return contract.methods.bet(Math.pow(10,18).toString(10)).send({from: client1Key});
	})
	.then(() => {
		return contract.methods.joinGame().send({from: client2Key, value: 2 * Math.pow(10,18)}); 
	})
	.then(() => {
		return contract.methods.bet(Math.pow(10,18).toString(10)).send({from: client2Key});
	})
	.then(() => {
		return contract.methods.startTimer().send({from: ownerKey});
	})
	.then(() => {
		return timeBurn(contract,ownerKey);
	})
	.then(() => {
		return contract.methods.closeGame().send({from: ownerKey, value: 10 * Math.pow(10,18)});
	})
	.then(() => {
		return contract.methods.submitDeposit().send({from: client1Key, value: 10 * Math.pow(10,18)});
	})
	.then(() => {
		return contract.methods.submitDeposit().send({from: client2Key, value: 10 * Math.pow(10,18)});
	})	
}

function createRandom(contract) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.submitReturnHash('722775529745285120').send({from: client1Key});
	})
	.then(() => {
		return contract.methods.submitReturnHash('388335581365825281').send({from: client2Key});
	})
	.then(() => {
		return contract.methods.submitReturnHash('3963456789123455313').send({from: ownerKey});
	})
	.then(() => {
		return contract.methods.submitNumber('722775529745285120').send({from: client1Key})
	})
	.then(() => {
		return contract.methods.submitNumber('388335581365825281').send({from: client2Key})
	})
	.then(() => {
		return contract.methods.submitNumber('3963456789123455313').send({from: ownerKey});
	})
}

function showInitialCards(contract) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.showCards().call({from: ownerKey})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showCards().call({from: client1Key})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showSplitCards().call({from: client1Key})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showCards().call({from: client2Key})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showSplitCards().call({from: client2Key})
		.then(console.log);
	})
}

function hit(contract,_clientKey) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.submitHashRequest('42450096').send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.submitHashResponse('12034602216').send({from: ownerKey})
	})
	.then(() => {
		return contract.methods.numRequest('42450096').send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.numResponse('12034602216').send({from: ownerKey})
	})
	.then(() => {
		return contract.methods.hit().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.showCards().call({from: _clientKey})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showSplitCards().call({from: _clientKey})
		.then(console.log);
	})
}

function split(contract,_clientKey) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.split().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.showCards().call({from: _clientKey})
		.then(console.log);
	})
	.then(() => {
		return contract.methods.showSplitCards().call({from: _clientKey})
		.then(console.log);
	})
} 

function withdraw(contract) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.withdraw((100 * Math.pow(10,18)).toString(10)).send({from: ownerKey});
	})
	.then(() => {
		return contract.methods.withdraw((100 * Math.pow(10,18)).toString(10)).send({from: client1Key});
	})
	.then(() => {
		return contract.methods.withdraw((100 * Math.pow(10,18)).toString(10)).send({from: client2Key});
	})
}

function timeBurn(contract,_clientKey) {
	return Promise.resolve()
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
	.then(() => {
		return contract.methods.doNothing().send({from: _clientKey})
	})
} 
/*function count(n) {
	console.log(n++); 
	if (n < 30){
	setTimeout(function(){count(n)}, 1000);
	}
}
count(0);*/
