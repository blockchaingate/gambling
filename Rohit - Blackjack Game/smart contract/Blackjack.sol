pragma solidity 0.5.10;

/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (+) Make "require" warning text format consistent    |*|
|*| (+) Remove option & function to manually start timer |*|
|*| (+) Make sure everyone is gone (self destruct)       |*|
|*| (+) Add timers for VARIOUS phases**                  |*|
|*| (+) Fix playerCount indexes                          |*|
|*| (+) Add tons of error trapping                       |*|
|*|     (such as int overflow and underflow              |*|
|*| (+) Change if statements to require                  |*|
|*| (+) Delete temp functions                            |*|
|*| (+) Fix function and variable state mutabilities     |*|
|*| (+) Clean up code and code order                     |*|
|*| (+) Clean up require && statements                   |*|
|*| (+) Move some require statements to modifiers        |*|
|*| (+) Change blockNum + 5 to a more reasonable value   |*|
|*|                                                      |*|
|*|======================================================|*|
|*|                                                      |*|
|*| (-) = Current objectives                             |*|
|*| (+) = Will complete after client-side program        |*|
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
    uint8 public playerCount;
    uint256 public possibleLoss;
    uint8 taskDone;
    address public house;
    uint256 public globalRand;
    address[] target;
    uint256[4] hashNums;
    uint256[4] randNums;

    constructor(uint256 _minBet, uint256 _maxBet) public {
        require (_maxBet >= 1 ether && _maxBet < msg.sender.balance / 2 - 5 ether && _minBet <= _maxBet, "Invalid bet params");
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
        require(state == GameState.ProcessingRandom, "Sorry, the hash submit window has elapsed.");
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
        timerStarted = false;
        playerCount = 0;
        for (uint8 i = 1; i <= 4; i++) {
            if (players[playerNums[i]].pool != 0) {
                playerCount++;
            }
        }
        possibleLoss = 0;
        taskDone = 0;
        globalRand = 0;
        delete target;
        delete hashNums;
        delete randNums;
        state = GameState.Accepting;
        emit StateChange(uint8(state)); //temp
        startTimer();
    }

    function joinGame() public payable notDealer() isAccepting() { //Might be able to remove some extra redundant commands
        require(msg.value >= minBet * 2,"Your pool needs to match the min bet requirements (pool must be atleast twice min bet size)");
        require(playerCount < 4, "The max amount of players has been reached! Wait for a new game to start.");
        require(playerNums[1]!=msg.sender && playerNums[2]!=msg.sender && playerNums[3]!=msg.sender, "You already joined.");
        playerCount++;
        uint8 counter = 1;
        while (players[playerNums[counter]].pool != 0) {
            counter++;
        }
        playerNums[counter] = msg.sender;
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
        require (block.number > blockNum + 5 || taskDone == playerCount, "Players still have time to make a move.");
        kick();
        players[house].pool += msg.value;
        state = GameState.ProcessingRandom;
        taskDone = 0;
        resetValid();
        blockNum = block.number;
        emit StateChange(uint8(state));
    }

    function submitDeposit() public payable onlyPlayer() notDealer() isProcessingRandom() {
        require(msg.value >= possibleLoss * 2, "Your deposit needs to match the bets made");
        require(players[msg.sender].deposit == 0, "You already made a deposit");
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
            resetValid();
            blockNum = block.number;
            emit StateChange(uint8(state));
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
            deal();
            state = GameState.InProgress;
            emit StateChange(uint8(state));
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
            target.push(msg.sender);
            players[msg.sender].valid = true;
            players[house].valid = false;
            blockNum = block.number;
            emit StateChange(uint8(players[msg.sender].randState) + 6); //temp
        }
    }

    function hashResponse(uint256 _hash) public onlyDealer() isInProgress() {
        //if (players[target[_index]].randState == RandProcessState.AwaitingHashResponse) {
        for(uint i = 0; i < target.length; i++) {
            if (players[target[i]].randState == RandProcessState.AwaitingHashResponse){
                hashNums[i] = _hash;
                players[target[i]].randState = RandProcessState.AwaitingNumRequest;
                players[target[i]].valid = false;
                if (target.length == 1) {
                    players[house].valid = true;
                }
                blockNum = block.number;
                emit StateChange(uint8(players[target[i]].randState) + 6);
            }
        }
        //}
    }

    function numRequest(uint256 _randNum) public onlyPlayer() notDealer() isInProgress() { //Add error trapping
        if (
            players[msg.sender].randState == RandProcessState.AwaitingNumRequest &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum)
            ) {
            players[msg.sender].randNum = _randNum;
            players[msg.sender].randState = RandProcessState.AwaitingNumResponse;
            players[msg.sender].valid = true;
            players[house].valid = false;
            blockNum = block.number;
            emit StateChange(uint8(players[msg.sender].randState) + 6);
        }
    }

    function numResponse(uint256 _randNum) public onlyDealer() isInProgress() { //Add error trapping
        for (uint i = 0; i < target.length; i++){
            if (
                players[target[i]].randState == RandProcessState.AwaitingNumResponse &&
                keccak256(abi.encode(_randNum, msg.sender)) == bytes32(hashNums[i])
                ) {
                delete hashNums[i];
                randNums[i] = _randNum;
                players[target[i]].randState = RandProcessState.AwaitingHit;
                blockNum = block.number;
                if (target.length == 1) {
                    players[house].valid = true;
                }
                players[target[i]].valid = false;
                emit StateChange(uint8(players[target[i]].randState) + 6);
            }
        }
    }

    function hit() public onlyPlayer() notDealer() isInProgress() {
        require(verifyHit() && players[msg.sender].randState == RandProcessState.AwaitingHit, "Invalid hit");
        players[msg.sender].randState = RandProcessState.AwaitingHashRequest;
        for (uint8 i = 0; i < target.length; i++) {
            if (target[i] == msg.sender) {
                addCard(uint256(keccak256(abi.encode(randNums[i] ^ players[msg.sender].randNum))), msg.sender);
                target[i] = target[target.length-1];
                target.length--;
                delete randNums[i];
                i = uint8(target.length); //Replace with break statement later
            }
        }
        evaluateHand(msg.sender);
        transferToSplit();
        blockNum = block.number;
        emit StateChange(uint8(players[msg.sender].randState) + 6); //temp
    }

    function verifyHit() public view isInProgress() returns(bool verified){
        verified = !players[msg.sender].done;
    }

    function stand() public onlyPlayer() notDealer() isInProgress() {
        require(
            !players[msg.sender].done &&
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length >= 2,
            "Invalid stand"
        );
        players[msg.sender].done = true;
        players[msg.sender].valid = true;
        transferToSplit();
        blockNum = block.number;
    }

    function doubleDown() public onlyPlayer() notDealer() isInProgress(){
        require(verifyDoubleDown() && players[msg.sender].randState == RandProcessState.AwaitingHit, "Invalid double down.");
        hit();
        players[msg.sender].pool -= players[msg.sender].bet;
        players[msg.sender].bet *= 2;
        players[msg.sender].done = true;
        players[msg.sender].valid = true;
        blockNum = block.number;
    }

    function verifyDoubleDown() public view isInProgress() returns(bool verified){
        verified = verifyHit() &&
                   players[msg.sender].cardSum >= 9 &&
                   players[msg.sender].cardSum <= 11 &&
                   players[msg.sender].cards.length >= 2 &&
                   !players[msg.sender].split;
    }

    function split() public onlyPlayer() notDealer() isInProgress() {
        require(
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length == 2 &&
            !players[msg.sender].split &&
            players[msg.sender].cards[0] % 13 == players[msg.sender].cards[1] % 13,
            "You can't split now"
        );
        players[msg.sender].pool -= players[msg.sender].bet; //Bet not incremented since it is used twice for payout
        players[msg.sender].splitCards.push(players[msg.sender].cards[1]);
        players[msg.sender].cards.length--;
        players[msg.sender].split = true;
        players[msg.sender].cardSum /= 2;
        players[msg.sender].altCardSum = players[msg.sender].cardSum;
        blockNum = block.number;
    }

    function transferToSplit() private {
        if (players[msg.sender].done && players[msg.sender].split && players[msg.sender].splitCards.length == 1) {
            players[msg.sender].splitCards = players[msg.sender].cards;
            players[msg.sender].cards.length = 0;
            players[msg.sender].cards.push(players[msg.sender].splitCards[0]);
            players[msg.sender].altCardSum += players[msg.sender].cardSum;
            players[msg.sender].cardSum = players[msg.sender].altCardSum - players[msg.sender].cardSum;
            players[msg.sender].altCardSum -= players[msg.sender].cardSum;
            players[msg.sender].flexibility = 0;
            players[msg.sender].done = false;
            players[msg.sender].valid = false;
        }
    }

    function finalRandProcess() public /*onlyDealer()*/ isInProgress() {
        require (
            (block.number > blockNum + 5) ||
            (finished(playerNums[1]) && finished(playerNums[2]) && finished(playerNums[3]) && finished(playerNums[4])),
            "Players still have time to make their moves"
        );
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

    function finished(address _address) private view returns (bool){
        return players[_address].bet == 0 || (players[_address].done && players[_address].splitCards.length != 1);
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
            } else {
                players[house].pool += players[_address].bet;
            }
        }
    }

    function withdraw (uint256 _amount) public /*notDealer()*/{
        require (
            !(msg.sender == house ||
            msg.sender == playerNums[1] ||
            msg.sender == playerNums[2] ||
            msg.sender == playerNums[3] ||
            msg.sender == playerNums[4]) ||
            state == GameState.Finished ||
            state == GameState.Accepting,
            "You can't withdraw now"
        );
        players[msg.sender].pool += players[msg.sender].bet;
        players[msg.sender].bet = 0;
        possibleLoss -= players[msg.sender].pool;
        if (_amount < players[msg.sender].pool) {
            players[msg.sender].pool -= _amount;
            players[msg.sender].wallet.transfer(_amount);
        } else {
            uint256 transferAmount = players[msg.sender].pool; //To prevent exploits in fallback code
            players[msg.sender].pool = 0;
            players[msg.sender].wallet.transfer(transferAmount);
        }
    }

    function leave () public onlyPlayer() notDealer() {
        require (state == GameState.Finished || state == GameState.Accepting, "You can't leave during the game!");
        withdraw(players[msg.sender].pool*2);
        for (uint8 i = 1; i <= 4; i++) {
            if(playerNums[i] == msg.sender) {
                delete players[playerNums[i]];
                delete playerNums[i];
                playerCount--;
            }
        }
    }

    /*function end () public onlyDealer() {
        require (state == GameState.Finished, "You can't leave during the game!");
        selfdestruct(msg.sender);
    }*/

    function returnHash(uint256 n) public view returns (uint256){
        return uint256(keccak256(abi.encode(n, msg.sender)));
    }

    function returnDeposit() public view returns (uint256){
        return players[msg.sender].deposit;
    }

    function submitAutoHash(uint256 n) public onlyPlayer() isProcessingRandom(){
        submitHash(returnHash(n));
    }

    function submitAutoHashRequest(uint256 n) public onlyPlayer() isInProgress(){
        hashRequest(returnHash(n));
    }

    function submitAutoHashResponse(uint256 n) public onlyPlayer() isInProgress(){
        hashResponse(returnHash(n));
    }

    function done(address _address) public view returns(bool){
        return players[_address].done;
    }

//============================================The following functions are for testing purposes only. They will be removed on final build============================================\\

    function showCards() public view returns (uint8[] memory){
        return players[msg.sender].cards;
    }

    function showSplitCards() public view returns (uint8[] memory){
        return players[msg.sender].splitCards;
    }

    function returnCardSum() public view returns (uint8){
        return players[msg.sender].cardSum;
    }

    function doNothing() public {}
}