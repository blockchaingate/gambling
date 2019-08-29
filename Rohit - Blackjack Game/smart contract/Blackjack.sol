pragma solidity 0.4.24;

/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Implement self-destruct function                 |*|
|*| (-) Add timers for various phases                    |*|
|*| (-) Add error trapping for issues such as            |*|
|*|     int overflow and underflow                       |*|
|*| (-) Explicitly include function and variable state   |*|
|*|      mutabilities                                    |*|
|*| (+) Delete temp functions                            |*|
|*| (+) Change blockNum + 5 to an appropriate value      |*|
|*|                                                      |*|
|*| ==================================================== |*|
|*|                                                      |*|
|*| (-) = Current objectives                             |*|
|*| (+) = Will complete after kanban deploy              |*|
|*|                                                      |*|
\*|======================================================|*/


contract Blackjack{

    enum GameState {Accepting, ProcessingRandom, VerifyingRandom, PreparingGame, InProgress, Finished}
    enum RandProcessState {AwaitingHashRequest,AwaitingHashResponse, AwaitingNumRequest, AwaitingNumResponse, AwaitingHit}
    event StateChange(uint256 newState);

    struct Player {
        address wallet;
        uint256 pool;
        uint256 bet;
        uint256 deposit;
        uint256[] cards;
        uint256[] splitCards;
        bool split;
        uint256 hashNum;
        uint256 randNum;
        bool valid;
        bool blackjack;
        uint256 cardSum;
        uint256 altCardSum;
        uint256 flexibility;
        bool done;
        RandProcessState randState;
    }

    GameState state;
    uint256 private minBet;
    uint256 private maxBet;
    uint256 private blockNum;
    mapping(address => Player) public players;
    mapping(uint256 => address) public playerNums;
    uint256 public playerCount;
    uint256 public possibleLoss;
    uint256 private taskDone;
    address public house;
    uint256 public globalRand;
    address[] private target;
    uint256[4] private hashNums;
    uint256[4] private randNums;

    constructor(uint256 _minBet, uint256 _maxBet) public {
        require (_maxBet >= 1 ether && _maxBet < msg.sender.balance / 2 - 5 ether && _minBet <= _maxBet, "Invalid min or max bet.");
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

    // Resets the validity check for all players
    function resetValid() private {
        players[house].valid = false;
        for (uint256 i = 1; i <= playerCount; i++) {
            players[playerNums[i]].valid = false;
        }
    }

    // Forces execution to continue if players or dealers are taking too long
    function proceed() public {
        require(
            state == GameState.ProcessingRandom || state == GameState.VerifyingRandom,
            "You can't proceed now."
        ); //finish adding states later
        require (block.number > blockNum + 5, "Players still have time to make a move.");
        kick();
        state = GameState(uint256(state)+1);
        emit StateChange(uint256(state));
    }

    // Removes any invalid player
    function kick() private {
        uint256 distributableMoney;
        taskDone = playerCount + 1;
        for (uint256 i = 1; i <= playerCount; i++) {
            if (!players[playerNums[i]].valid) {
                players[house].pool += players[playerNums[i]].bet;
                distributableMoney += players[playerNums[i]].deposit;
                players[playerNums[i]].bet = 0;
                players[playerNums[i]].deposit = 0;
                taskDone--;
            }
        }
        for (uint256 ii = 1; ii <= playerCount; ii++) {
            if (players[playerNums[ii]].valid) {
                players[playerNums[ii]].pool += distributableMoney / taskDone;
            }
        }
        if (players[house].valid) {
            players[house].pool += distributableMoney / taskDone;
        } else {
            for(uint256 iii = 1; iii <= playerCount; iii++) {
                if (players[playerNums[iii]].valid) {
                    players[house].pool -= players[playerNums[iii]].bet * 2;
                    players[playerNums[iii]].pool += players[playerNums[iii]].bet * 3 + players[playerNums[iii]].deposit;
                    players[playerNums[iii]].bet = 0;
                    players[playerNums[iii]].deposit = 0;
                }
            }
        }
    }

    // Creates a new game by resetting all necessary values
    function newGame() public onlyDealer() isFinished(){
        delete players[house].cards;
        delete players[house].splitCards;
        players[house].valid = true;
        players[house].hashNum = 0; //Might be able to remove this
        players[house].randNum = 0; //Check this (stuff under too)
        players[house].blackjack = false;
        players[house].flexibility = 0;
        players[house].cardSum = 0;
        for (uint256 i = 1; i <= playerCount; i++) { //Reset everything except user address and balances
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
        for (uint256 ii = 1; ii <= 4; ii++) {
            if (players[playerNums[ii]].pool != 0) {
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
        emit StateChange(uint256(state)); //temp
        blockNum = block.number;
    }

    // Allows players to join the game
    function joinGame() public payable notDealer() isAccepting() { //Might be able to remove some extra redundant commands
        require(msg.value >= minBet * 2,"Your pool needs to match the min bet requirements (pool must be atleast twice min bet size).");
        require(playerCount < 4, "The max amount of players has been reached! Wait for a new game to start.");
        require(playerNums[1]!=msg.sender && playerNums[2]!=msg.sender && playerNums[3]!=msg.sender, "You already joined.");
        playerCount++;
        uint256 counter = 1;
        while (players[playerNums[counter]].pool != 0) {
            counter++;
        }
        playerNums[counter] = msg.sender;
        players[msg.sender].wallet = msg.sender;
        players[msg.sender].pool = msg.value;
    }

    // Allows players submit a bet
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
        possibleLoss += _bet * 2;
        players[msg.sender].valid = true;
    }

    // Close the lobby and start the necessary preperation stages
    function closeGame() public payable onlyDealer() isAccepting() {
        require(players[house].pool + msg.value >= possibleLoss, "You need to send enough funds to match the bets.");
        require(playerCount >= 1, "Please wait until there's atleast one other player.");
        require (block.number > blockNum + 5 || taskDone == playerCount, "Players still have time to make a move.");
        kick();
        players[house].pool += msg.value;
        state = GameState.ProcessingRandom;
        taskDone = 0;
        resetValid();
        blockNum = block.number;
        emit StateChange(uint256(state));
    }

    // Submit a deposit that is taken if user cheats
    function submitDeposit() public payable onlyPlayer() notDealer() isProcessingRandom() {
        require(msg.value >= possibleLoss * 2, "Your deposit needs to match the bets made.");
        require(players[msg.sender].deposit == 0, "You already made a deposit");
        players[msg.sender].deposit = msg.value;
    }

    // Submit the user's number and address hashed
    function submitHash(uint256 _hash) public onlyPlayer() isProcessingRandom() {
        require(msg.sender == house || players[msg.sender].deposit != 0, "You haven't made a deposit yet!");
        require(_hash != 0, "You can't send a hash of 0.");
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
            emit StateChange(uint256(state));
        }
    }

    // Submit the user's number corresponding to their hash
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

    // Eliminate any invalid players and move on to the appropriate game state
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
            for(uint256 i = 1; i <= playerCount; i++) {
                if (players[playerNums[i]].valid) {
                    globalRand ^= players[playerNums[i]].randNum;
                }
            }
            globalRand = uint256(keccak256(abi.encode(globalRand)));
            deal();
            state = GameState.InProgress;
            emit StateChange(uint256(state));
        }
    }

    // Deal the initial two cards to every player and the inital card to the dealer
    function deal() private {
        globalRand = addCard(globalRand, house);
        for (uint256 i = 1; i <= playerCount; i++){
            if (players[playerNums[i]].valid) {
                globalRand = addCard(globalRand, playerNums[i]);
                globalRand = addCard(globalRand, playerNums[i]);
                evaluateHand(playerNums[i]);
            }
        }
        resetValid();
        players[house].valid = true;
        blockNum = block.number;
    }

    // Add a card to a hand, increase the card total of that hand, and then modify the random seed for the next use
    function addCard(uint256 _randNum, address _address) private returns (uint256 remainder) {
        players[_address].cards.push(uint256 (_randNum % 52 + 1));
        players[_address].cardSum += cardVal (uint256 (_randNum % 52 + 1), _address);
        remainder = _randNum / 52;
    }

    // Return the value of the card
    function cardVal(uint256 _num,address _address) private returns (uint256 val){
        val = _num % 13;
        if (val >= 10 || val == 0) {
            val = 10;
        }
        if (val == 1) {
            val = 11;
            players[_address].flexibility++;
        }
    }

    // Calculate hand total and see if the user is finished
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

    // Player submits a hash of their number and address
    function hashRequest(uint256 _hash) public onlyPlayer() notDealer() isInProgress() {
        require (players[msg.sender].randState == RandProcessState.AwaitingHashRequest, "You can't submit a hash right now!");
        players[msg.sender].hashNum = _hash;
        players[msg.sender].randState = RandProcessState.AwaitingHashResponse;
        target.push(msg.sender);
        players[msg.sender].valid = true;
        players[house].valid = false;
        blockNum = block.number;
        emit StateChange(uint256(players[msg.sender].randState) + 6); //temp
    }

    // Dealer submits a hash of their number and address
    function hashResponse(uint256 _hash) public onlyDealer() isInProgress() {
        for(uint i = 0; i < target.length; i++) {
            if (players[target[i]].randState == RandProcessState.AwaitingHashResponse){
                hashNums[i] = _hash;
                players[target[i]].randState = RandProcessState.AwaitingNumRequest;
                players[target[i]].valid = false;
                if (target.length == 1) {
                    players[house].valid = true;
                }
                blockNum = block.number;
                emit StateChange(uint256(players[target[i]].randState) + 6);
            }
        }
    }

    // Player submits a number corresponding to their hash
    function numRequest(uint256 _randNum) public onlyPlayer() notDealer() isInProgress() { //Add error trapping
        require(
            players[msg.sender].randState == RandProcessState.AwaitingNumRequest &&
            keccak256(abi.encode(_randNum, msg.sender)) == bytes32(players[msg.sender].hashNum),
            "You can't submit a number right now!"
        );
        players[msg.sender].randNum = _randNum;
        players[msg.sender].randState = RandProcessState.AwaitingNumResponse;
        players[msg.sender].valid = true;
        players[house].valid = false;
        blockNum = block.number;
        emit StateChange(uint256(players[msg.sender].randState) + 6);
    }

    // Dealer submits a number corresponding to their hash
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
                emit StateChange(uint256(players[target[i]].randState) + 6);
            }
        }
    }

    // Add another card to the player hand if able to
    function hit() public onlyPlayer() notDealer() isInProgress() {
        require(verifyHit() && players[msg.sender].randState == RandProcessState.AwaitingHit, "Invalid hit.");
        players[msg.sender].randState = RandProcessState.AwaitingHashRequest;
        for (uint256 i = 0; i < target.length; i++) {
            if (target[i] == msg.sender) {
                addCard(uint256(keccak256(abi.encode(randNums[i] ^ players[msg.sender].randNum))), msg.sender);
                target[i] = target[target.length-1];
                target.length--;
                delete randNums[i];
                i = uint256(target.length); //Replace with break statement later
            }
        }
        evaluateHand(msg.sender);
        transferToSplit();
        blockNum = block.number;
        emit StateChange(uint256(players[msg.sender].randState) + 6); //temp
    }

    // Returns true If user is allowed to use the hit command, false otherwise
    function verifyHit() public view isInProgress() returns(bool verified){
        verified = !players[msg.sender].done;
    }

    // Signal that user is done working with the current hand if able to
    function stand() public onlyPlayer() notDealer() isInProgress() {
        require(
            !players[msg.sender].done &&
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length >= 2,
            "Invalid stand."
        );
        players[msg.sender].done = true;
        players[msg.sender].valid = true;
        transferToSplit();
        blockNum = block.number;
    }

    // If card total is 9,10 or 11, double bet, hit and "stand" if able to
    function doubleDown() public onlyPlayer() notDealer() isInProgress(){
        require(verifyDoubleDown() && players[msg.sender].randState == RandProcessState.AwaitingHit, "Invalid double down.");
        hit();
        players[msg.sender].pool -= players[msg.sender].bet;
        players[msg.sender].bet *= 2;
        players[msg.sender].done = true;
        players[msg.sender].valid = true;
        blockNum = block.number;
    }

    // Returns true if the user is allowed to double down, false otherwise
    function verifyDoubleDown() public view isInProgress() returns(bool verified){
        verified = verifyHit() &&
                   players[msg.sender].cardSum >= 9 &&
                   players[msg.sender].cardSum <= 11 &&
                   players[msg.sender].cards.length >= 2 &&
                   !players[msg.sender].split;
    }

    // If initial two cards are duplicate, split them into two hands if able to
    function split() public onlyPlayer() notDealer() isInProgress() {
        require(
            players[msg.sender].randState == RandProcessState.AwaitingHashRequest &&
            players[msg.sender].cards.length == 2 &&
            !players[msg.sender].split &&
            players[msg.sender].cards[0] % 13 == players[msg.sender].cards[1] % 13,
            "Invalid split."
        );
        players[msg.sender].pool -= players[msg.sender].bet; //Bet not incremented since it is used twice for payout
        players[msg.sender].splitCards.push(players[msg.sender].cards[1]);
        players[msg.sender].cards.length--;
        players[msg.sender].split = true;
        players[msg.sender].cardSum /= 2;
        players[msg.sender].altCardSum = players[msg.sender].cardSum;
        blockNum = block.number;
    }

    // If the player still has a split hand and is allowed to work on it, move to that hand
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

    // Resets the values needed to redo the random number generation process
    function finalRandProcess() public isInProgress() {

        // Only if out of time or everyone is done
        require (
            (block.number > blockNum + 5) ||
            (finished(playerNums[1]) && finished(playerNums[2]) && finished(playerNums[3]) && finished(playerNums[4])),
            "Players still have time to make their moves!"
        );

        // Remove invalid players
        kick();

        // Reset necessary values to randomize a number again
        taskDone = 0;
        players[house].hashNum = 0;
        players[house].valid = false;
        for (uint256 i = 1; i <= playerCount; i++) {
            players[playerNums[i]].hashNum = 0;
            players[playerNums[i]].valid = false;
        }
        state = GameState.ProcessingRandom;
        emit StateChange(uint256(state)); //temp
    }

    // Returns true if player is done the game, false otherwise
    function finished(address _address) private view returns (bool){
        return players[_address].bet == 0 || (players[_address].done && players[_address].splitCards.length != 1);
    }

    // Add appropriate amount of cards to dealer hand and pay players accordingly
    function finishGame() private {
        revealDealerCards();
        for (uint256 i = 1; i <= playerCount; i++) {
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
        emit StateChange(uint256(state)); //temp
    }

    // Add appropriate amount of cards to dealer hand
    function revealDealerCards() private {
        while (players[house].cardSum < 17) {
            globalRand = addCard(globalRand, house);
            evaluateHand(house);
        }
    }

    // Sets user win values based on each hand
    function payOut(address _address, uint256 _cardSum) private {
        if (_cardSum > 21) {
            players[house].pool += players[_address].bet;
        }
        else {
            if (_cardSum == players[house].cardSum) {
                if (players[_address].blackjack) {
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

    // Withdraws all of users money deposited in contract
    function withdraw (uint256 _amount) public {
        // If player, game must be done
        require (
            !(msg.sender == house ||
            msg.sender == playerNums[1] ||
            msg.sender == playerNums[2] ||
            msg.sender == playerNums[3] ||
            msg.sender == playerNums[4]) ||
            state == GameState.Finished ||
            state == GameState.Accepting,
            "You can't withdraw now."
        );

        // Adds shifts bet to pool - Might not need
        players[msg.sender].pool += players[msg.sender].bet;
        players[msg.sender].bet = 0;

        // Sets possible loss accordingly - Might be incorrect
        possibleLoss -= players[msg.sender].pool;

        // Withdraws appropriate amount
        if (_amount < players[msg.sender].pool) {
            players[msg.sender].pool -= _amount;
            players[msg.sender].wallet.transfer(_amount);
        } else {
            uint256 transferAmount = players[msg.sender].pool; //To prevent exploits in fallback code
            players[msg.sender].pool = 0;
            players[msg.sender].wallet.transfer(transferAmount);
        }
    }

    // Withdraws and removes player from lobby
    function leave () public onlyPlayer() notDealer() {
        require (state == GameState.Finished || state == GameState.Accepting, "You can't leave during the game!");

        // Make sure all money is withdrawed by setting to 2x total just in case
        withdraw(players[msg.sender].pool*2);

        // Remove player from lobby
        for (uint256 i = 1; i <= 4; i++) {
            if(playerNums[i] == msg.sender) {
                delete players[playerNums[i]];
                delete playerNums[i];
                playerCount--;
            }
        }

    }

    // Implement at a later time - Should allow contract self-destruct after finish
    /*function end () public onlyDealer() {
        require (state == GameState.Finished, "You can't leave during the game!");
        selfdestruct(msg.sender);
    }*/

    // Converts a number and user address into a hash
    function returnHash(uint256 n) public view returns (uint256){
        return uint256(keccak256(abi.encode(n, msg.sender)));
    }

    // Returns user's deposit
    function returnDeposit() public view returns (uint256){
        return players[msg.sender].deposit;
    }

    // WARNING: Next three functions need to be checked to ensure that blockchain cannot see param values

    // Sends a number hashed to corresponding method
    function submitAutoHash(uint256 n) public onlyPlayer() isProcessingRandom(){
        submitHash(returnHash(n));
    }

    // Sends a number hashed to corresponding method
    function submitAutoHashRequest(uint256 n) public onlyPlayer() notDealer() isInProgress(){
        hashRequest(returnHash(n));
    }

    // Sends a number hashed to corresponding method
    function submitAutoHashResponse(uint256 n) public onlyPlayer() isInProgress(){
        hashResponse(returnHash(n));
    }

    // Returns true if user has completed their current hand, false otherwise
    function done(address _address) public view returns(bool){
        return players[_address].done;
    }

//============================================The following functions are for testing purposes only. They will be removed on final build============================================\\

    function showCards() public view returns (uint256[] memory){
        return players[msg.sender].cards;
    }

    function showSplitCards() public view returns (uint256[] memory){
        return players[msg.sender].splitCards;
    }

    function returnCardSum() public view returns (uint256){
        return players[msg.sender].cardSum;
    }

    function doNothing() public pure{}
}