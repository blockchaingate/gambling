pragma solidity 0.5.10;

/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Test all basic functionality                     |*|
|*| (-) Implment timers to let anyone call               |*|
|*| (-) Move some functions from dealer to automatic     |*|
|*| (-) Change if statements to require                  |*|
|*| (-) Delete temp functions                            |*|
|*| (-) Add tons of error trapping                       |*|
|*| (-) Fix function and variable state mutabilities     |*|
|*| (-) Clean up code and code order                     |*|
|*| (-) Force players to call functions with incentives  |*|
|*| (-) Keep everyone's money in the contract until end  |*|
|*| (-) Create money pool for users where they bet a     |*|
|*|     portion of it in order to have individual        |*|
|*|     transaction methods                              |*|
|*| (-) Run hit phase in parallel                        |*|
|*| (-) Add deposit for players                          |*|
|*| (-) Add insurance option                             |*|
|*|                                                      |*|
\*|======================================================|*/


contract Blackjack{

    enum GameState {Accepting, ProcessingRandom, VerifyingRandom, PreparingGame, InProgress, Finished}
    GameState state;

    struct Player {
        address payable wallet;
        uint256 pool;
        uint256 bet;
        uint8[] cards;
        uint8[] splitCards;
        bool split;
        uint256 hashNum;
        uint256 randNum;
        bool valid;
        bool blackjack;
        uint8 cardSum;
        uint8 altCardSum;
        uint8 flexibility;
        bool done;
    }

    mapping(address => Player) public players;
    mapping(uint8 => address) public playerNums;
    uint8 playerCount;
    uint256 possibleLoss;
    uint8 submitCount; //merge with below and add to bet function
    uint8 validCount;
    address house;
    uint256 globalRand;
    address hitTarget;
    enum RandProcessState {AwaitingHashRequest,AwaitingHashResponse, AwaitingNumRequest, AwaitingNumResponse, AwaitingHit}
    RandProcessState randState;

    constructor() public {
        house = msg.sender;
        players[house].wallet = msg.sender;
        state = GameState.Finished;
        //playerCount = 0;
    }

    modifier isAccepting {
        require(state == GameState.Accepting, "The game is no longer accpeting players. Please wait for a new game to start.");
        _;
    }

    modifier isProcessingRandom {
        require(state == GameState.ProcessingRandom, "Sorry, the hash sumbit window has elapsed.");
        _;
    }

    modifier isVerifyingRandom {
        require(state == GameState.VerifyingRandom, "Sorry, the hash verifying window has elapsed.");
        _;
    }

    modifier isPreparingGame {
        require(state == GameState.PreparingGame, "The game is not in its preparation stage right now.");
        _;
    }

    modifier isInProgress {
        require(state == GameState.InProgress, "There is no game in progress.");
        _;
    }

    modifier isFinished {
        require(state == GameState.Finished, "Please wait for the game to finish.");
        _;
    }

    modifier onlyDealer {
        require(msg.sender == house, "Only the dealer can use this command!");
        _;
    }

    modifier notDealer {
        require(msg.sender != house, "The dealer can't use this command!");
        _;
    }

    modifier onlyPlayer {
        require(
            msg.sender == house ||
            msg.sender == playerNums[1] ||
            msg.sender == playerNums[2] ||
            msg.sender == playerNums[3] ||
            msg.sender == playerNums[4],
            "Only players can use this command!"
        );
        _;
    }

    function newGame() public onlyDealer() isFinished(){
        players[house].valid = false; //Might be able to remove this
        players[house].hashNum = 0; //Might be able to remove this
        players[house].randNum = 0; //Check this
        for (uint8 i = 1; i <= playerCount; i++) { //Reset everything except user address and balances
            delete players[playerNums[i]].cards;
            delete players[playerNums[i]].splitCards;
            players[playerNums[i]].split = false;
            players[playerNums[i]].hashNum = 0;
            players[playerNums[i]].randNum = 0;
            players[playerNums[i]].valid = false;
            players[playerNums[i]].blackjack = false;
            players[playerNums[i]].cardSum = 0;
            players[playerNums[i]].altCardSum = 0;
            players[playerNums[i]].flexibility = 0;
            players[playerNums[i]].done = false;
        }
        playerCount = 0;
        possibleLoss = 0;
        submitCount = 0;
        validCount = 0;
        globalRand = 0;
        delete hitTarget;
        state = GameState.Accepting;
        randState = RandProcessState.AwaitingHashRequest;
    }

    function joinGame() public payable notDealer() isAccepting() { //Might be able to remove some extra redundant commands
        require(msg.value > 2, "Your pool must be atleast 2 Ether");
        require(playerCount < 4, "The max amount of players has been reached! Wait for a new game to start.");
        require(playerNums[1]!=msg.sender && playerNums[2]!=msg.sender && playerNums[3]!=msg.sender, "You already joined.");
        playerCount++;
        while (players[playerNums[playerCount]].pool != 0) {
            playerCount++;
        }
        playerNums[playerCount] = msg.sender;
        players[msg.sender].wallet = msg.sender;
        possibleLoss += msg.value;
        players[msg.sender].pool = msg.value;
    }

    function bet(uint256 _bet) public onlyPlayer() notDealer() isAccepting() {
        require(
            (_bet > 0) &&
            (_bet*2 <= players[msg.sender].pool) &&
            (_bet*2 + possibleLoss + 10 < house.balance),
            "Your bet was invalid."
        );
        players[msg.sender].bet = _bet;
        players[msg.sender].pool -= players[msg.sender].bet;
    }

    function closeGame() public payable onlyDealer() isAccepting() {
        require(players[house].pool + msg.value >= possibleLoss, "You need to send enough funds to match the bets.");
        require(playerCount >= 1, "Wait until there's atleast one other player!");
        players[house].pool += msg.value;
        state = GameState.ProcessingRandom;
    }

    function submitHash(uint256 _hash) public onlyPlayer() isProcessingRandom() {
        require(_hash != 0, "You can't send a hash of 0");
        if (players[msg.sender].hashNum == 0) {
            submitCount++;
        }
        players[msg.sender].hashNum = _hash;
        if (submitCount == (playerCount + 1)) {
            state = GameState.VerifyingRandom;
        }
    }

    function submitNumber(uint256 _randNum) public onlyPlayer() isVerifyingRandom() {
        if (keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum) && !players[msg.sender].valid) {
            players[msg.sender].valid = true;
            validCount++;
            players[msg.sender].randNum = _randNum;
            if (validCount == (playerCount + 1)) {
                state = GameState.PreparingGame;
            }
        }
    }

    function prepare() public onlyDealer() isPreparingGame() {
        if (validCount != playerCount + 1){
            for (uint8 i = 1; i <= playerCount; i++) {
                if (!players[playerNums[i]].valid) {
                    players[house].pool += players[playerNums[i]].bet;
                    players[playerNums[i]].bet = 0;
                }
            }
            if (!players[house].valid) {
                for(uint8 i = 1; i <= playerCount; i++) {
                    if (players[playerNums[i]].valid) {
                        players[house].pool -= players[playerNums[i]].bet * 2;
                        players[playerNums[i]].pool += players[playerNums[i]].bet * 3;
                        players[playerNums[i]].bet = 0;
                    }
                }
            }
        }


        if (validCount == 0 || !players[house].valid)
        {
            state = GameState.Finished;
        }
        else if (
            (!players[playerNums[1]].valid || players[playerNums[1]].done) &&
            (!players[playerNums[2]].valid || players[playerNums[2]].done) &&
            (!players[playerNums[3]].valid || players[playerNums[3]].done) &&
            (!players[playerNums[4]].valid || players[playerNums[4]].done)
            ) {
            finishGame();
        } else { //(validCount >= 1 && players[house].valid)
            globalRand = players[house].randNum;
            for(uint8 i = 1; i <= playerCount; i++) {
                if (players[playerNums[i]].valid) {
                    globalRand ^= players[playerNums[i]].randNum;
                }
            }
            globalRand = uint256(keccak256(abi.encode(globalRand)));
            state = GameState.InProgress;
            deal();
        }
    }

    function deal() private {
        globalRand = addCard(globalRand, house);
        for (uint8 i = 1; i <= playerCount; i++){
            if (players[playerNums[i]].valid) {
                globalRand = addCard(globalRand, playerNums[i]);
                globalRand = addCard(globalRand, playerNums[i]);
                evaluateHand(playerNums[i]);
            }
        }
    }

    function addCard(uint256 _randNum, address _address) private returns (uint256 remainder) {
        players[_address].cards.push(uint8 (_randNum % 52 + 1));
        players[_address].cardSum += cardVal (uint8 (_randNum % 52 + 1), _address);
        remainder = _randNum / 52;
    }

    function cardVal(uint8 _num,address _address) private returns (uint8 val){
        val = _num % 13;
        if (val >= 10 || val == 0) {
            val = 10;
        }
        if (val == 1) {
            val = 11;
            players[_address].flexibility++;
        }
    }

    function evaluateHand(address _address) private {
        if (players[_address].cardSum == 21) {
            if (players[_address].cards.length == 2 && !players[_address].split) {
                players[_address].blackjack = true;
            }
            players[_address].done = true;
        }
        if (players[_address].cardSum > 21) {
            if (players[_address].flexibility > 0){
                players[_address].flexibility--;
                players[_address].cardSum -= 10;
            }
            else {
                players[_address].done = true;
            }
        }
    }

    function hashRequest(uint256 _hash) public onlyPlayer() notDealer() isInProgress() {
        if (randState == RandProcessState.AwaitingHashRequest){
            players[msg.sender].hashNum = _hash;
            randState = RandProcessState.AwaitingHashResponse;
            hitTarget = msg.sender;
        }
    }

    function hashResponse(uint256 _hash) public onlyDealer() isInProgress() {
        if (randState == RandProcessState.AwaitingHashResponse) {
            players[house].hashNum = _hash;
            randState = RandProcessState.AwaitingNumRequest;
        }
    }

    function numRequest(uint256 _randNum) public onlyPlayer() notDealer() isInProgress() { //Add error trapping
        if (
            randState == RandProcessState.AwaitingNumRequest &&
            msg.sender == hitTarget &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum)
            ) {
            players[msg.sender].randNum = _randNum;
            randState = RandProcessState.AwaitingNumResponse;
        }
    }

    function numResponse(uint256 _randNum) public onlyDealer() isInProgress() { //Add error trapping
        if (
            randState == RandProcessState.AwaitingNumResponse &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum)
            ) {
            players[msg.sender].randNum = _randNum;
            randState = RandProcessState.AwaitingHit;
        }
    }

    function hit() public onlyPlayer() notDealer() isInProgress() {
        if (
            !players[msg.sender].done &&
            msg.sender == hitTarget &&
            randState == RandProcessState.AwaitingHit
            ) {
            randState = RandProcessState.AwaitingHashRequest;
            addCard(players[house].randNum ^ players[hitTarget].randNum, hitTarget);
            evaluateHand(hitTarget);
        }
    }

    function stand() public onlyPlayer() notDealer() isInProgress() {
        if(!players[msg.sender].done && randState == RandProcessState.AwaitingHashRequest) {
            players[msg.sender].done = true;
        }
    }

    function doubleDown() public onlyPlayer() notDealer() isInProgress(){
        require(players[msg.sender].cardSum >= 9 || players[msg.sender].cardSum <= 11, "Your card total must be a 9, 10, or 11 to double down.");
        hit();
        players[msg.sender].pool -= players[msg.sender].bet;
        players[msg.sender].bet *= 2;
        players[msg.sender].done = true;
    }

    function split() public payable onlyPlayer() notDealer() isInProgress() {
        if(
            randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length == 2 &&
            !players[msg.sender].split &&
            players[msg.sender].cards[0] % 13 == players[msg.sender].cards[1] % 13
            ) {
            players[msg.sender].pool -= players[msg.sender].bet; //Bet not incremented since it is used twice for payout
            players[msg.sender].splitCards.push(players[msg.sender].cards[1]);
            players[msg.sender].cards.length--;
            players[msg.sender].split = true;
            players[msg.sender].cardSum /= 2;
        }
    }

    function transferToSplit() public onlyPlayer() notDealer() isInProgress() {
        if (players[msg.sender].done && players[msg.sender].split) {
            players[msg.sender].cards = players[msg.sender].splitCards;
            players[msg.sender].altCardSum = players[msg.sender].cardSum;
            players[msg.sender].cardSum = 0;
            players[msg.sender].done = false;
        }
    }

    function finalRandProcess() public onlyDealer() isInProgress() {
        if (
            (!players[playerNums[1]].valid || players[playerNums[1]].done) &&
            (!players[playerNums[2]].valid || players[playerNums[2]].done) &&
            (!players[playerNums[3]].valid || players[playerNums[3]].done) &&
            (!players[playerNums[4]].valid || players[playerNums[4]].done)
            ) {
            submitCount = 0;
            validCount = 0;
            players[house].hashNum = 0;
            players[house].valid = false;
            for (uint8 i = 1; i <= playerCount; i++) {
                players[playerNums[i]].hashNum = 0;
                players[playerNums[i]].valid = false;
            }
            state = GameState.ProcessingRandom;
        }
    }

    function finishGame() private {
        revealDealerCards();
        for (uint8 i = 1; i <= playerCount; i++) {
            if (players[playerNums[i]].valid){
                if (players[playerNums[i]].split) {
                    payOut(playerNums[i], players[playerNums[i]].altCardSum);
                }
                payOut(playerNums[i], players[playerNums[i]].cardSum);
                players[playerNums[i]].bet = 0;
            }
        }
        state = GameState.Finished;
    }

    function revealDealerCards() private {
        {
            while (players[house].cardSum < 17) {
                globalRand = addCard(globalRand, house);
                evaluateHand(house);
            }
        }
    }

    function payOut(address _address, uint8 _cardSum) private {
        if (_cardSum > 21) {
            players[house].pool += players[_address].bet;
        }
        else { // (_cardSum <= 21)
            if (_cardSum == players[house].cardSum)
            {
                if (players[_address].blackjack){
                    if (players[house].blackjack) {
                        players[_address].pool += players[_address].bet;
                    } else {
                        players[house].pool -= players[_address].bet * 2;
                        players[_address].pool += players[_address].bet * 3;
                    }
                } else {
                    if (players[house].blackjack) {
                        players[house].pool += players[_address].bet;
                    } else {
                        players[_address].pool += players[_address].bet;
                    }
                }
            } else if (players[house].cardSum > 21) {
                players[house].pool -= players[_address].bet;
                players[_address].pool += players[_address].bet * 2;
            } else if (_cardSum > players[house].cardSum) {
                players[house].pool -= players[_address].bet;
                players[_address].pool += players[_address].bet * 2;
            }
        }
    }

    function withdraw (uint256 _amount) public {
        if (
            !(msg.sender == house ||
            msg.sender == playerNums[1] ||
            msg.sender == playerNums[2] ||
            msg.sender == playerNums[3] ||
            msg.sender == playerNums[4]) ||
            (state == GameState.Finished)
            ) {
            if (_amount <= players[msg.sender].pool) {
                players[msg.sender].pool -= _amount;
                players[msg.sender].wallet.transfer(_amount);
            } else {
                uint256 transferAmount = players[msg.sender].pool;
                players[msg.sender].pool = 0;
                players[msg.sender].wallet.transfer(transferAmount);
            }
        }
    }

//============================================The following functions are for testing purposes only. They will be removed on final build============================================\\

    function returnHash(uint256 n) public view returns (uint256){
        return uint256(keccak256(abi.encode(n, msg.sender)));
    }

    function submitReturnHash(uint256 n) public onlyPlayer() isProcessingRandom(){
        submitHash(returnHash(n));
    }

    function showCards() public view returns (uint8[] memory){
        return players[msg.sender].cards;
    }

    function returnCardSum() public view returns (uint8){
        return players[msg.sender].cardSum;
    }

    function submitHashRequest(uint256 n) public onlyPlayer() isInProgress(){
        hashRequest(returnHash(n));
    }
    function submitHashResponse(uint256 n) public onlyPlayer() isInProgress(){
        hashResponse(returnHash(n));
    }

    function returnSubmitCount() public view returns (uint8) {
        return submitCount;
    }
}