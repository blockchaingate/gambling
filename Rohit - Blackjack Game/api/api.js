//Import libraries and smart contract
const Web3 = require("web3");
const bj = require("../smart contract/blackjack.js");
const request = require('request');
var randomatic = require("randomatic")

let web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:7545"));

web3.eth.transactionConfirmationBlocks = 1;
web3.eth.defaultGasPrice = 1;
web3.eth.defaultGas = 6721975;

let cBlackjack = bj.con["contracts"]["Blackjack.sol:Blackjack"];
let Blackjack = new web3.eth.Contract(JSON.parse(cBlackjack.abi),{ gasLimit:6721975, gasPrice: 1}); //Remove options for older Web3 version
Blackjack.options.data = "0x" + cBlackjack.bin;

//Used for testing purposes - Will Remove on final build
let acc = [];
let privateKeys = ["0xe6974be75995c317b182ff6e7b33058e7ba3328354305040a075d544db240886", "0x5275f72548b49081aab8b9f71dfca866247dddefb706f4cfa751284d5221027e","0x2d85d928177456a12b6564864920e5ff672b262496477b7406659a3d418e5a2c","0xe66d847b96768a175b4db00d095fbb38ba5b4e7992d86797394a2a4ebe710bd2","0xff725e440c2f6b4682f203fa38e75ae0ad5d37aaa5e5e23139a77f819aaef926"];
for(let key of privateKeys) {
	acc.push(web3.eth.accounts.privateKeyToAccount(key));
}
const ownerKey = acc[0].address;
const client1Key = acc[1].address;
const client2Key = acc[2].address;
const client3Key = acc[3].address;
const client4Key = acc[4].address;

let listener;

// Makes a blackjack game contract
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
	  }
	);
	newGame(contract,address);
	return contract;
}

// Creates a new blackjack game
async function newGame(contract,address) {
	await contract.methods.newGame().send({from: address});
}

// Allows users to join the game
async function joinGame(contract,address,value){
	await contract.methods.joinGame().send({from: address, value: (value * Math.pow(10,18)).toString(10)});
}

// Allows users to specify their bet
async function bet(contract,address,value){
	await contract.methods.bet((value*Math.pow(10,18)).toString(10)).send({from: address});
}

// Temporary funciton used for testing purposes - Will be removed on final build
async function timeBurn(contract,address) {
	for (let i = 0; i < 5; i ++) {
		await contract.methods.doNothing().send({from: address});
	}
}

// Allows the owner to close the lobby 
async function closeGame(contract,address,value) {
	await contract.methods.closeGame().send({from: address, value: (value * Math.pow(10,18)).toString(10)}); 
}

// Allows users to submit required deposits
async function submitDeposit(contract,address,value) {
	await contract.methods.submitDeposit().send({from: address, value: (value * Math.pow(10,18)).toString(10)});
}

// Automates the random numbers and corresponding hash send phase for players and the owner
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

// Performs the "hit" functionality in blackjack
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
		//Uncomment following lines to see player cards
		/*await contract.methods.showCards().call({from: address})
			.then(console.log);
		await contract.methods.showSplitCards().call({from: address})
			.then(console.log);*/
	});
	await makeEventListener(contract,8,async()=>{
		await contract.methods.numRequest(randNum).send({from: address});		//Randomize
		await timeBurn(contract,ownerKey)
	});
	await contract.methods.submitAutoHashRequest(randNum).send({from: address});
	await timeBurn(contract,ownerKey);
}

// Performs the "double down" functionality in blackjack
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
		//Uncomment following lines to see player cards
		/*await contract.methods.showCards().call({from: address})
			.then(console.log);
		await contract.methods.showSplitCards().call({from: address})
			.then(console.log);*/
	});
	await makeEventListener(contract,8,async()=>{
		await contract.methods.numRequest(randNum).send({from: address});		//Randomize
		await timeBurn(contract,ownerKey)
	});
	await contract.methods.submitAutoHashRequest(randNum).send({from: address});
	await timeBurn(contract,ownerKey);
}

// Performs the "split" functionality in blackjack
async function split(contract,address) {
	await contract.methods.split().send({from: address});
	//Uncomment following lines to see player cards
	/*await contract.methods.showCards().call({from: address})
		.then(console.log);
	await contract.methods.showSplitCards().call({from: address})
		.then(console.log);*/
} 

// Performs the "stand" functionality in blackjack
async function stand (contract,address) {
	await contract.methods.stand().send({from: address});
}

// Resets the randomized number and hash log so that a new random number can be chosen
async function finalRandProcess(contract,address){
	await contract.methods.finalRandProcess().send({from: address});
}

// Allows user or owner to withdraw funds
async function withdraw(contract,address,value) {
	await contract.methods.withdraw((value * Math.pow(10,18)).toString(10)).send({from: address});
}

// Allows players to leave the game
async function leave(contract,address) {
	await contract.methods.leave().send({from: address});
}

// Gets list of games that the user can play
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

// Returns the lobby size
async function returnLobbySize (contract) {
	let lobbySize;
	await contract.methods.playerCount().call().then((res)=>{
		lobbySize = res;
	});
	return lobbySize;
}

// Returns the cards for the specified player
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

// Returns the owner address
async function returnOwnerAddress (contract) {
	let addr;
	await contract.methods.house().call().then((res)=>{
		addr = res;
	});
	return addr;
}

// Retruns the required deposit amount
async function possibleLoss (contract) {
	let pb;
	await contract.methods.possibleLoss().call().then((res)=>{
		pb = res/Math.pow(10,18);
	})
	return pb;
}

// Returns true if the player has finished working with their current hand
async function done (contract,address) {
	let doneHand;
	await contract.methods.done(address).call().then((res)=>{
		doneHand = res;
	})
	return doneHand;
}

// Removes a game from the game list
async function removeOne(contract) {
	await request({
		url: 'http://localhost:3000/games/'+contract.options.address+'/',
		method: 'DELETE'
	  }, (err, res, body) => {
		if (err) { return console.log(err); }
	})
}

// Makes an event listener and listens for the specified event
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