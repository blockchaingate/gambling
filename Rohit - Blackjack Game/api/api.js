const Web3 = require("web3");
const bj = require("../smart contract/blackjack.js");
const request = require('request');
var randomatic = require("randomatic")
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

let listener;

const ownerKey = acc[0].address;
const client1Key = acc[1].address;
const client2Key = acc[2].address;
const client3Key = acc[3].address;
const client4Key = acc[4].address;

//console.time("Time taken");
async function runGame() {
	let contract = await makeContract(ownerKey,1,10);
	await joinGame(contract,client1Key,2);
	await bet(contract,client1Key,1);
	await joinGame(contract,client2Key,2);
	await bet(contract,client2Key,1);
	await startTimer(contract,ownerKey);
	await timeBurn(contract,ownerKey);
	/*await contract.methods.players(client1Key).call()
		.then(console.log)*/;
	await automateRand(contract,ownerKey,()=>{});
	await automateRand(contract,client1Key, async ()=>{
		await submitDeposit(contract,client1Key,10);
	});
	await automateRand(contract,client2Key,async ()=>{
		await submitDeposit(contract,client2Key,10);
	});
	await closeGame(contract,ownerKey,10);
	/*await contract.methods.players(client1Key).call()
		.then(console.log)*/;
	await timeBurn(contract,ownerKey); //To show cards
	await showInitialCards(contract);
	await split(contract, client1Key);
	await hit(contract, client1Key);
	await stand(contract, client1Key);
	await hit(contract, client1Key);
	await stand(contract, client1Key);
	await hit(contract, client2Key);
	await stand(contract,client2Key);
	await finalRandProcess(contract, ownerKey);
	//await contract.methods.returnDeposit().call({from: client1Key}).then(console.log);
	//await contract.methods.returnDeposit().call({from: client2Key}).then(console.log);
	await withdraw(contract,client1Key,100);
	await withdraw(contract,client1Key,100);
	await withdraw(contract,client2Key,100);
	await withdraw(contract,ownerKey,100);
	await withdraw(contract,ownerKey,100);
	await removeOne(contract);
	await contract.methods.showCards().call({from: ownerKey})
		.then(console.log);
	//listener.unsubscribe();
	//await console.timeEnd("Time taken");
}

async function makeContract(address,minBet,maxBet) { 
	let contract = await Blackjack
	.deploy({
		"arguments": [(minBet*Math.pow(10,18)).toString(10),(maxBet*Math.pow(10,18)).toString(10)],
	})
	.send({
		from: address
	})
	await request({
		url: 'http://localhost:3000/games',
		method: 'POST',
		json: {
		  address: contract.options.address,
		  minBet: (minBet*Math.pow(10,18)).toString(10),
		  maxBet: (maxBet*Math.pow(10,18)).toString(10)
		}
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
		console.log(body);
	  }
	);
	newGame(contract,address);
	return contract;
}

async function newGame(contract,address) {
	await contract.methods.newGame().send({from: address});
}

async function joinGame(contract,address,value){
	await contract.methods.joinGame().send({from: address, value: (value * Math.pow(10,18)).toString(10)});
}

async function bet(contract,address,value){
	await contract.methods.bet((value*Math.pow(10,18)).toString(10)).send({from: address});
}

async function timeBurn(contract,address) {
	for (let i = 0; i < 5; i ++) {
		await contract.methods.doNothing().send({from: address});
	}
} // temp

async function closeGame(contract,address,value) {
	await contract.methods.closeGame().send({from: address, value: (value * Math.pow(10,18)).toString(10)}); 
}

async function submitDeposit(contract,address,value) {
	await contract.methods.submitDeposit().send({from: address, value: (value * Math.pow(10,18)).toString(10)});
}

function automateRand(contract,address,depositFunc) {
	let randNum;
	listener = contract.events.StateChange(async function (err, event) {
		if (err) {
			console.log(err);
		} else if (event.returnValues.newState == 1){
			let depo;
			await contract.methods.returnDeposit().call({from: address}).then((res)=>{
				depo = res;
			});
			if (depo == 0){
				await depositFunc();
			}
			do {
				randNum = await randomatic('0',20);
			} while (randNum.charAt(0)=='0'); // Put into function			
			await contract.methods.submitAutoHash(randNum).send({from: address});
		} else if (event.returnValues.newState == 2){
			await contract.methods.submitNumber(randNum).send({from: address});
		} else if (event.returnValues.newState == 7){
			let house;
			await contract.methods.house().call().then((res)=>{
				house = res;
			});
			if (address == house) {
				do {
					randNum = await randomatic('0',20);
				} while (randNum.charAt(0)=='0'); // Put into function			
				await contract.methods.submitAutoHashResponse(randNum).send({from: address});
				timeBurn(contract,address);
			}
		} else if (event.returnValues.newState == 9 ){
			let house;
			await contract.methods.house().call().then((res)=>{
				house = res;
			});
			if (address == house){
				await contract.methods.numResponse(randNum).send({from: address});
				timeBurn(contract,address);
			}
		} else if (event.returnValues.newState == 5) {
			listener.unsubscribe();
		}
	});
	return listener;
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
} //Temp

async function hit(contract,address) {
	let verified;
	await contract.methods.verifyHit().call({from: address}).then((res)=>{
		verified = res; 
	});
	if (!verified) {
		console.log("Invalid Hit");
		return;
	}
	let randNum;
	do {
		randNum = await randomatic('0',20);
	} while (randNum.charAt(0)=='0'); // Put into function	
	await makeEventListener(contract,10,async()=>{ // Change later to make sure it only responds to user's event
		await contract.methods.hit().send({from: address});
		await contract.methods.showCards().call({from: address})
			.then(console.log);
		await contract.methods.showSplitCards().call({from: address})
			.then(console.log);
	});
	await makeEventListener(contract,8,async()=>{
		await contract.methods.numRequest(randNum).send({from: address});		//Randomize
		await timeBurn(contract,ownerKey)
	});
	await contract.methods.submitAutoHashRequest(randNum).send({from: address});
	await timeBurn(contract,ownerKey);
}

async function doubleDown(contract,address) {
	let verified;
	await contract.methods.verifyDoubleDown().call({from: address}).then((res)=>{
		verified = res; 
	});
	if (!verified) {
		console.log("Invalid Double Down");
		return;
	}
	let randNum;
	do {
		randNum = await randomatic('0',20);
	} while (randNum.charAt(0)=='0'); // Put into function	
	await makeEventListener(contract,10,async()=>{ // Change later to make sure it only responds to user's event
		await contract.methods.doubleDown().send({from: address});
		await contract.methods.showCards().call({from: address})
			.then(console.log);
		await contract.methods.showSplitCards().call({from: address})
			.then(console.log);
	});
	await makeEventListener(contract,8,async()=>{
		await contract.methods.numRequest(randNum).send({from: address});		//Randomize
		await timeBurn(contract,ownerKey)
	});
	await contract.methods.submitAutoHashRequest(randNum).send({from: address});
	await timeBurn(contract,ownerKey);
}

async function split(contract,address) {
	await contract.methods.split().send({from: address});
	await contract.methods.showCards().call({from: address})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: address})
		.then(console.log);
} 

async function stand (contract,address) {
	await contract.methods.stand().send({from: address});
}

async function finalRandProcess(contract,address){
	await contract.methods.finalRandProcess().send({from: address});
}

async function withdraw(contract,address,value) {
	await contract.methods.withdraw((value * Math.pow(10,18)).toString(10)).send({from: address});
}

async function leave(contract,address) {
	await contract.methods.leave().send({from: address});
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

async function returnLobbySize (contract) {
	let lobbySize;
	await contract.methods.playerCount().call().then((res)=>{
		lobbySize = res;
	});
	return lobbySize;
}

async function returnCards (contract,address,split) {
	let cards = [];
	if (split) {
		await contract.methods.showSplitCards().call({from: address}).then((res) =>{
			cards = res;
		});	
	} else {
		await contract.methods.showCards().call({from: address}).then((res) =>{
			cards = res;
		});
	}
	for (let i = 0; i < cards.length; i++) {
		let card = "";
		if (cards[i]%13 == 1) {
            card += "A";
        } else if (cards[i]%13 == 11) {
            card += "J";
        } else if (cards[i]%13 == 12) {
            card += "Q";
        } else if (cards[i]%13 == 0) {
            card += "K";
        } else {
            card += cards[i]%13;
        }

		if (cards[i]/13<= 1) {
			card += "D";
		} else if (cards[i]/13<= 2) {
			card += "C";
		} else if (cards[i]/13<= 3) {
			card += "H";
		} else {
			card += "S";
		}
		cards[i] = card;
	}
	return cards;
}

async function returnOwnerAddress (contract) {
	let addr;
	await contract.methods.house().call().then((res)=>{
		addr = res;
	});
	return addr;
}

async function possibleLoss (contract) {
	let pb;
	await contract.methods.possibleLoss().call().then((res)=>{
		pb = res/Math.pow(10,18);
	})
	return pb;
}

async function done (contract,address) {
	let doneHand;
	await contract.methods.done(address).call().then((res)=>{
		doneHand = res;
	})
	return doneHand;
}

async function removeOne(contract) {
	await request({
		url: 'http://localhost:3000/games/'+contract.options.address+'/',
		method: 'DELETE'
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
		console.log(body);
	})
}

function makeEventListener(contract, eventNum, func) {
	let singleListener;
	singleListener = contract.events.StateChange(function (err, event) {
		if (err) {
			console.log(err);
		} else if (event.returnValues.newState == eventNum){
			func();
			singleListener.unsubscribe();
		}
	});
}

//runGame();

// Export libraries
window.Web3 = Web3;
window.bj = bj;
window.web3 = web3;
window.cBlackjack = cBlackjack;

// Export API methods 
window.makeContract = makeContract;
window.newGame = newGame;
window.joinGame = joinGame;
window.bet = bet;
window.timeBurn = timeBurn;
window.closeGame = closeGame;
window.submitDeposit = submitDeposit;
window.automateRand = automateRand;
window.makeEventListener = makeEventListener;
window.split = split;
window.hit = hit;
window.doubleDown = doubleDown;
window.stand = stand;
window.finalRandProcess = finalRandProcess;
window.withdraw = withdraw;
window.leave = leave;
window.returnLobbySize = returnLobbySize;
window.returnCards = returnCards;
window.returnOwnerAddress = returnOwnerAddress;
window.possibleLoss = possibleLoss;
window.done = done;

// Export HTML request methods
window.getGames = getGames;
window.removeOne = removeOne;

//testing
//window.removeAll = removeAll;
//window.hearAllEvents = hearAllEvents;
//window.showInitialCards = showInitialCards;

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