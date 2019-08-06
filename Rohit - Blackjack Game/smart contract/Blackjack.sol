pragma solidity 0.5.10;

/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (+) Add timer for self destruct                      |*|
|*| (+) Add timers for VARIOUS phases**                  |*|
|*| (+) Fix playerCount indexes                          |*|
|*| (+) Add tons of error trapping                       |*|
|*|     (such as int overflowand underflow)              |*|
|*| (+) Change if statements to require                  |*|
|*| (+) Delete temp functions                            |*|
|*| (+) Fix function and variable state mutabilities     |*|
|*| (+) Clean up code and code order                     |*|
|*| (+) Clean up require && statements                   |*|
|*| (+) Move some require statements to modifiers        |*|
|*| (+) Change blockNum + 5 to a more reasonable value   |*|
|*| (x) Add insurance option                             |*|
|*| (x) optimize deposit for users                       |*|
|*|                                                      |*|
|*|======================================================|*|
|*|                                                      |*|
|*| (-) = Current objectives                             |*|
|*| (|) = Will complete with client-side program         |*|
|*| (+) = Will complete after client-side program        |*|
|*| (x) = might not add                                  |*|
|*|                                                      |*|
\*|======================================================|*/


contract Blackjack{

    enum GameState {Accepting, ProcessingRandom, VerifyingRandom, PreparingGame, InProgress, Finished}
    enum RandProcessState {AwaitingHashRequest,AwaitingHashResponse, AwaitingNumRequest, AwaitingNumResponse, AwaitingHit}
    event StateChange(uint8 newState);

    struct Player {
        address payable wallet;
        uint256 pool;
        uint256 bet;
        uint256 deposit;
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
        RandProcessState randState;
    }

    GameState state;
    uint256 minBet;
    uint256 maxBet;
    uint256 blockNum;
    bool timerStarted;
    mapping(address => Player) public players;
    mapping(uint8 => address) public playerNums;
    uint8 playerCount;
    uint256 possibleLoss;
    uint8 taskDone;
    address house;
    uint256 globalRand;
    address[] target;

    constructor(uint256 _minBet, uint256 _maxBet) public {
        require (_maxBet < msg.sender.balance / 2 - 5 ether && _minBet <= _maxBet, "Invalid bet params");
        minBet = _minBet;
        maxBet = _maxBet;
        house = msg.sender;
        players[house].wallet = msg.sender;
        state = GameState.Finished;
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

    function resetValid() private {
        players[house].valid = false;
        for (uint8 i = 1; i <= playerCount; i++) {
            players[playerNums[i]].valid = false;
        }
    }

    function startTimer() public onlyDealer() isAccepting() {
        require(!timerStarted, "You can only start the timer once.");
        timerStarted = true;
        blockNum = block.number;
    }

    function proceed() public {
        require(
            state == GameState.ProcessingRandom || state == GameState.VerifyingRandom,
            "You can't proceed now."
        ); //finish adding states later
        require (block.number > blockNum + 5, "Players still have time to make a move.");
        kick();
        state = GameState(uint8(state)+1);
        emit StateChange(uint8(state));
    }

    function kick() private {
        uint256 distributableMoney;
        taskDone = playerCount + 1;
        for (uint8 i = 1; i <= playerCount; i++) {
            if (!players[playerNums[i]].valid) {
                players[house].pool += players[playerNums[i]].bet;
                distributableMoney += players[playerNums[i]].deposit;
                players[playerNums[i]].bet = 0;
                players[playerNums[i]].deposit = 0;
                taskDone--;
            }
        }
        for (uint8 i = 1; i <= playerCount; i++) {
            if (players[playerNums[i]].valid) {
                players[playerNums[i]].pool += distributableMoney / taskDone;
            }
        }
        if (players[house].valid) {
            players[house].pool += distributableMoney / taskDone;
        } else {
            for(uint8 i = 1; i <= playerCount; i++) {
                if (players[playerNums[i]].valid) {
                    players[house].pool -= players[playerNums[i]].bet * 2;
                    players[playerNums[i]].pool += players[playerNums[i]].bet * 3 + players[playerNums[i]].deposit;
                    players[playerNums[i]].bet = 0;
                    players[playerNums[i]].deposit = 0;
                }
            }
        }
    }

    function newGame() public onlyDealer() isFinished(){
        players[house].valid = true;
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
            players[playerNums[i]].randState = RandProcessState.AwaitingHashRequest;
        }
        playerCount = 0;
        possibleLoss = 0;
        taskDone = 0;
        globalRand = 0;
        delete target;
        state = GameState.Accepting;
        emit StateChange(uint8(state)); //temp
    }

    function joinGame() public payable notDealer() isAccepting() { //Might be able to remove some extra redundant commands
        //require(msg.value / 2 >= minBet,"Your pool needs to match the min bet requirements (pool must be atleast twice min bet size)"); //Make money lower or dynamic later
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
            (_bet >= minBet) &&
            (_bet <= maxBet) &&
            (_bet*2 <= players[msg.sender].pool) &&
            (_bet*2 + possibleLoss + 10 ether < house.balance),
            "Your bet was invalid."
        );
        if (players[msg.sender].bet == 0) {
            players[msg.sender].bet = _bet;
            players[msg.sender].pool -= players[msg.sender].bet;
            taskDone++;
        } else {
            players[msg.sender].pool += players[msg.sender].bet;
            players[msg.sender].bet = _bet;
            players[msg.sender].pool -= players[msg.sender].bet;
        }
        players[msg.sender].valid = true;
    }

    function closeGame() public payable onlyDealer() isAccepting() {
        require(players[house].pool + msg.value >= possibleLoss, "You need to send enough funds to match the bets.");
        require(playerCount >= 1, "Wait until there's atleast one other player!");
        require(timerStarted, "You haven't started the timer yet!");
        require (block.number > blockNum + 5, "Players still have time to make a move.");
        kick();
        players[house].pool += msg.value;
        state = GameState.ProcessingRandom;
        emit StateChange(uint8(state));
        taskDone = 0;
        resetValid();
        blockNum = block.number;
    }

    function submitDeposit() public payable onlyPlayer() notDealer() isProcessingRandom() {
        require(msg.value >= possibleLoss * 2, "Your deposit needs to match the bets made");
        players[msg.sender].deposit = msg.value;
    }

    function submitHash(uint256 _hash) public onlyPlayer() isProcessingRandom() {
        require(msg.sender == house || players[msg.sender].deposit != 0, "You haven't made a deposit yet");
        require(_hash != 0, "You can't send a hash of 0");
        if (players[msg.sender].hashNum == 0) {
            taskDone++;
        }
        players[msg.sender].hashNum = _hash;
        players[msg.sender].valid = true;
        if (taskDone == (playerCount + 1)) {
            taskDone = 0;
            state = GameState.VerifyingRandom;
            emit StateChange(uint8(state));
            resetValid();
            blockNum = block.number;
        }
    }

    function submitNumber(uint256 _randNum) public onlyPlayer() isVerifyingRandom() {
        require (
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum) && !players[msg.sender].valid,
            "Your hash does not match your number!"
        );
        players[msg.sender].valid = true;
        taskDone++;
        players[msg.sender].randNum = _randNum;
        if (taskDone == (playerCount + 1)) {
            state = GameState.PreparingGame;
            emit StateChange(uint8(state)); //temp
            prepare();
        }
    }

    function prepare() public isPreparingGame() {
        if (taskDone != playerCount + 1) {
            kick();
        }
        if (!players[house].valid || taskDone == 0 ) {
            state = GameState.Finished;
        } else if (
            (!players[playerNums[1]].valid || players[playerNums[1]].done) &&
            (!players[playerNums[2]].valid || players[playerNums[2]].done) &&
            (!players[playerNums[3]].valid || players[playerNums[3]].done) &&
            (!players[playerNums[4]].valid || players[playerNums[4]].done)
            ) {
            finishGame();
        } else {
            globalRand = players[house].randNum;
            for(uint8 i = 1; i <= playerCount; i++) {
                if (players[playerNums[i]].valid) {
                    globalRand ^= players[playerNums[i]].randNum;
                }
            }
            globalRand = uint256(keccak256(abi.encode(globalRand)));
            state = GameState.InProgress;
            emit StateChange(uint8(state)); //temp
            deal();
        }
    }

    function deal() private {
        globalRand = addCard(globalRand, house);
        for (uint8 i = 1; i <= playerCount; i++){
            if (players[playerNums[i]].valid) {
                if (i == 1){ //Tester code
                    addCard(25, playerNums[i]);
                    addCard(25, playerNums[i]);
                } else {
                globalRand = addCard(globalRand, playerNums[i]);
                globalRand = addCard(globalRand, playerNums[i]);}
                evaluateHand(playerNums[i]);
            }
        }
        resetValid();
        players[house].valid = true;
        blockNum = block.number;
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
            players[_address].valid = true;
            players[_address].done = true;
        }
        if (players[_address].cardSum > 21) {
            if (players[_address].flexibility > 0){
                players[_address].flexibility--;
                players[_address].cardSum -= 10;
            }
            else {
                players[_address].valid = true;
                players[_address].done = true;
            }
        }
    }

    function hashRequest(uint256 _hash) public onlyPlayer() notDealer() isInProgress() {
        if (players[msg.sender].randState == RandProcessState.AwaitingHashRequest){
            players[msg.sender].hashNum = _hash;
            players[msg.sender].randState = RandProcessState.AwaitingHashResponse;
            emit StateChange(uint8(players[msg.sender].randState) + 6); //temp
            target.push(msg.sender);
            players[msg.sender].valid = true;
            players[house].valid = false;
            blockNum = block.number;
        }
    }

    function hashResponse(uint256 _hash, uint8 _index) public onlyDealer() isInProgress() {
        if (players[target[_index]].randState == RandProcessState.AwaitingHashResponse) {
            players[house].hashNum = _hash;
            players[target[_index]].randState = RandProcessState.AwaitingNumRequest;
            emit StateChange(uint8(players[target[_index]].randState) + 6);
            if (target.length == 1) {
                players[house].valid = true;
            }
            players[target[_index]].valid = false;
            blockNum = block.number;
        }
    }

    function numRequest(uint256 _randNum) public onlyPlayer() notDealer() isInProgress() { //Add error trapping
        if (
            players[msg.sender].randState == RandProcessState.AwaitingNumRequest &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum)
            ) {
            players[msg.sender].randNum = _randNum;
            players[msg.sender].randState = RandProcessState.AwaitingNumResponse;
            emit StateChange(uint8(players[msg.sender].randState) + 6);
            players[msg.sender].valid = true;
            players[house].valid = false;
            blockNum = block.number;
        }
    }

    function numResponse(uint256 _randNum, uint8 _index) public onlyDealer() isInProgress() { //Add error trapping
        if (
            players[target[_index]].randState == RandProcessState.AwaitingNumResponse &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum)
            ) {
            players[msg.sender].randNum = _randNum;
            players[target[_index]].randState = RandProcessState.AwaitingHit;
            emit StateChange(uint8(players[target[_index]].randState) + 6);
            blockNum = block.number;
            if (target.length == 1) {
                players[house].valid = true;
            }
            players[target[_index]].valid = false;
        }
    }

    function hit() public onlyPlayer() notDealer() isInProgress() { //Change to require
        if (
            !players[msg.sender].done &&
            players[msg.sender].randState == RandProcessState.AwaitingHit
            ) {
            players[msg.sender].randState = RandProcessState.AwaitingHashRequest;
            emit StateChange(uint8(players[msg.sender].randState) + 6); //temp
            for (uint8 i = 0; i < target.length; i++) {
                if (target[i] == msg.sender) {
                    delete target[i];
                    target[i] = target[target.length-1];
                    target.length--;
                    i = uint8(target.length); //Replace with break statement later
                }
            }
            addCard(uint256(keccak256(abi.encode(players[house].randNum ^ players[msg.sender].randNum))), msg.sender);
            evaluateHand(msg.sender);
            blockNum = block.number;
        }
    }

    function stand() public onlyPlayer() notDealer() isInProgress() {
        if(
            !players[msg.sender].done &&
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length >= 2
            ) {
            players[msg.sender].done = true;
            players[msg.sender].valid = true;
            blockNum = block.number;
        }
    }

    function doubleDown() public onlyPlayer() notDealer() isInProgress(){ //Remove redundant overlapping calls from hit (be careful of async)
        require(
            (players[msg.sender].cardSum >= 9 || players[msg.sender].cardSum <= 11)&&
            players[msg.sender].cards.length >= 2 &&
            !players[msg.sender].done &&
            players[msg.sender].randState == RandProcessState.AwaitingHit,
            "Invalid double down."
        );
        hit();
        players[msg.sender].pool -= players[msg.sender].bet;
        players[msg.sender].bet *= 2;
        players[msg.sender].done = true;
        players[msg.sender].valid = true;
        blockNum = block.number;
    }

    function split() public onlyPlayer() notDealer() isInProgress() {
        if(
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length == 2 &&
            !players[msg.sender].split &&
            players[msg.sender].cards[0] % 13 == players[msg.sender].cards[1] % 13
            ) {
            players[msg.sender].pool -= players[msg.sender].bet; //Bet not incremented since it is used twice for payout
            players[msg.sender].splitCards.push(players[msg.sender].cards[1]); //Might be removing this later depending on client-side but make sure to check over rest of split code then
            players[msg.sender].cards.length--;
            players[msg.sender].split = true;
            players[msg.sender].cardSum /= 2;
            players[msg.sender].altCardSum = players[msg.sender].cardSum;
            blockNum = block.number;
        }
    }

    function transferToSplit() public onlyPlayer() notDealer() isInProgress() {
        if (players[msg.sender].done && players[msg.sender].split && players[msg.sender].splitCards.length == 1) {
            players[msg.sender].splitCards = players[msg.sender].cards;
            players[msg.sender].cards.length = 0;
            players[msg.sender].cards.push(players[msg.sender].splitCards[0]);
            players[msg.sender].altCardSum += players[msg.sender].cardSum;
            players[msg.sender].cardSum = players[msg.sender].altCardSum - players[msg.sender].cardSum;
            players[msg.sender].altCardSum -= players[msg.sender].cardSum;
            players[msg.sender].done = false;
            blockNum = block.number;
        }
    }

    function finalRandProcess() public /*onlyDealer()*/ isInProgress() {
        if (
            (block.number > blockNum + 5) ||
            ((!players[playerNums[1]].valid || (players[playerNums[1]].done && players[playerNums[1]].splitCards.length != 1)) &&
            (!players[playerNums[2]].valid || (players[playerNums[2]].done && players[playerNums[2]].splitCards.length != 1)) &&
            (!players[playerNums[3]].valid || (players[playerNums[3]].done && players[playerNums[3]].splitCards.length != 1)) &&
            (!players[playerNums[4]].valid || (players[playerNums[4]].done && players[playerNums[4]].splitCards.length != 1)))
            ) {
            kick();
            taskDone = 0;
            players[house].hashNum = 0;
            players[house].valid = false;
            for (uint8 i = 1; i <= playerCount; i++) {
                players[playerNums[i]].hashNum = 0;
                players[playerNums[i]].valid = false;
            }
            state = GameState.ProcessingRandom;
            emit StateChange(uint8(state)); //temp
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
                players[playerNums[i]].pool += players[playerNums[i]].deposit;
                players[playerNums[i]].deposit = 0;
            }
        }
        state = GameState.Finished;
        emit StateChange(uint8(state)); //temp
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
        else {
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

    function withdraw (uint256 _amount) public notDealer(){
        if (
            !(msg.sender == playerNums[1] ||
            msg.sender == playerNums[2] ||
            msg.sender == playerNums[3] ||
            msg.sender == playerNums[4]) ||
            (state == GameState.Finished)
            ) {
            if (_amount < players[msg.sender].pool) {
                players[msg.sender].pool -= _amount;
                players[msg.sender].wallet.transfer(_amount);
            } else {
                uint256 transferAmount = players[msg.sender].pool; //To prevent exploits in fallback code
                players[msg.sender].pool = 0;
                players[msg.sender].wallet.transfer(transferAmount);
            }
        }
    }

    function leave () public onlyPlayer() notDealer() {
        require (state == GameState.Finished || state == GameState.Accepting, "You can't leave during the game!");
        withdraw(players[msg.sender].pool);
        for (uint8 i = 1; i <= 4; i++) {
            if(playerNums[i] == msg.sender) {
                delete players[playerNums[i]];
                delete playerNums[i];
            }
        }
    }

    function end () public onlyDealer() {
        require (state == GameState.Finished, "You can't leave during the game!");
        selfdestruct(msg.sender);
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

    function showSplitCards() public view returns (uint8[] memory){
        return players[msg.sender].splitCards;
    }

    function returnCardSum() public view returns (uint8){
        return players[msg.sender].cardSum;
    }

    function submitHashRequest(uint256 n) public onlyPlayer() isInProgress(){
        hashRequest(returnHash(n));
    }
    function submitHashResponse(uint256 n, uint8 _index) public onlyPlayer() isInProgress(){
        hashResponse(returnHash(n),_index);
    }

    function doNothing() public {}
}