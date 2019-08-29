/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Add more information to the dealer screens       |*|
|*| (-) Shift revert statements into alerts              |*|
|*|                                                      |*|
|*| ==================================================== |*|
|*|                                                      |*|
|*| (-) = Current objectives                             |*|
|*|                                                      |*|
\*|======================================================|*/

window.addEventListener("load", () =>{
    
    // Set up canvas
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    let w,h;

    let input;
    let drawer = [];

    let buttons = [];
    let cards = [];
    let cards2 = [];
    let dealerCards = [];
    let standing = false;
    let isDone = false;

    let contract;
    let games = [];
    let acc;
    let privateKey;    

    // Adds a button to be drawn from the screen
    function addButton (_x,_y,_width,_height,_buttonColour,_textColour,_text,_func) {
        //Add button to array
        let button = {
            x: _x,
            y: _y,
            width: _width,
            height: _height,
            buttonColour: _buttonColour,
            textColour: _textColour,
            text: _text,
            func: _func
        };
        buttons.push(button);
    }

    // Adds a card to be drawn to the screen
    function addCard (_image,arr) {
        //Add card to array
        let card = {
            image: _image,
        };
        arr.push(card);
    }

    // Resize canvas event listener function
    function resizeCanvas() {
        w = document.body.offsetWidth;
        h = document.body.offsetHeight;
        ctx.canvas.width  = w;
        ctx.canvas.height = h;
        ctx.translate(w/2,h/2);
        draw();
    }

    // Clicking event listener function
    function checkClicks(event) {
        for (let index = 0; index < buttons.length; index++) {
            if (
                event.x > buttons[index].x + w/2 && 
                event.x < buttons[index].x  + buttons[index].width + w/2 &&
                event.y > -h/3 + buttons[index].y + h/2 && 
                event.y < -h/3 + buttons[index].y + buttons[index].height + h/2
                ) {
                // Executes if button was clicked
                buttons[index].func();
                break;
            }
        }
    }       
    
    // Draws the title to the screen
    function drawTitle () {
        ctx.clearRect(-w/2,-h/2,w,h)
        ctx.font = "100px Algerian";
        ctx.fillStyle = "rgb(255,223,0)";
        ctx.textAlign = "center";
        ctx.fillText("Blackjack", 0, -h/2.5); 
    }

    // Draws buttons to the screen
    function drawButtons () {
        for (let index = 0; index < buttons.length; index++) {
            //Draw the button box
            ctx.fillStyle = buttons[index].buttonColour;
            ctx.fillRect(buttons[index].x, -h/3 + buttons[index].y, buttons[index].width, buttons[index].height);

            //find indices of \n (new lines)
            let regex = /\n/gi, result, indices = [];
            while ( (result = regex.exec(buttons[index].text)) ) {
                indices.push(result.index);
            }

            //Split text by newline
            let lines = buttons[index].text.split('\n');

            //Specify max width for text
            let maxWidth = 0;
            for (let i = 0; i < lines.length; i++) {
                maxWidth = Math.max(maxWidth,lines[i].length);
            }

            //Format text
            let fontSize = Math.min(buttons[index].width*2.3/maxWidth,buttons[index].height/(1+indices.length))*0.8;                   
            ctx.font = fontSize + "px Balthazar";
            ctx.fillStyle = buttons[index].textColour;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            //Output text by specified line
            for (let  i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], buttons[index].x + buttons[index].width/2, -h/3 + buttons[index].y + buttons[index].height*((1+i)/(2+indices.length)));
            }
        }
    }

    // Draws cards to the screen
    function drawCards () {
        
        // Draws the backdrop text for the game screen
        ctx.font = "40px Balthazar";
        ctx.fillStyle = "#7bff00";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("Hand 1", -235, -h/3 + 270);
        ctx.fillText("Hand 2", -235, -h/3 + 390);
        ctx.fillText("Dealer Hand", -235, -h/3 + 510);

        // Highlights backdrops if player can make a move
        if (cards2.length <= 1 && !standing && !isDone) {
            ctx.fillStyle = "brown";
        } else {
            ctx.fillStyle = "#DEB887";
        }
        ctx.fillRect(-210,-h/3+225,425,110);
        if ((cards2.length >= 2 || standing) && !isDone) {
            ctx.fillStyle = "brown";
        } else {
            ctx.fillStyle = "#DEB887";
        }

        // Draws the backdrops
        ctx.fillRect(-210,-h/3+345,425,110);
        ctx.fillStyle = "#DEB887";
        ctx.fillRect(-210,-h/3+465,425,110);

        // Draw player hand 1
        for (let index = 0; index < cards.length; index++) {
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(cards[index].image, -205+70 * index, -h/3 + 230, 65, 100);
        }

        // Draw player hand 2
        for (let index = 0; index < cards2.length; index++) {
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(cards2[index].image, -205+70 * index, -h/3 + 350, 65, 100);
        }

        // Draw dealer hand
        for (let index = 0; index < dealerCards.length; index++) {
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(dealerCards[index].image, -205+70 * index, -h/3 + 470, 65, 100);
        }
    }

    // Allows users to log in with their private key
    function loginScreen(){
        // Testing private keys - Will be removed on final build
        console.log("e6974be75995c317b182ff6e7b33058e7ba3328354305040a075d544db240886");
        console.log("5275f72548b49081aab8b9f71dfca866247dddefb706f4cfa751284d5221027e");
        console.log("2d85d928177456a12b6564864920e5ff672b262496477b7406659a3d418e5a2c");

        // Creates the input field for private key login
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -265,
            y: 135,
            width: 510,
            fontSize: 13,
            fontFamily: "Courier",
            onsubmit: ()=> {
                privateKey = "0x" + input.value();
                acc = web3.eth.accounts.privateKeyToAccount(privateKey);
                input.destroy();
                drawer.pop();
                menuScreen();
            }
            
        });

        // Draws text to the screen and renders the input field
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Please enter your private key", 0, -h/3 + 70 + 25);
            input.render();
        });
    }

    // Function to make create and join game buttons
    function menuScreen () {

        // Allows user to create a game and become the dealer
        addButton(10, 40, 200, 75, "#4CAF50","white","Create Game",() => {
            buttons = [];
            contractCreationScreen();
        });

        // Allows user to create a game and become the player
        addButton(-210, 40, 200, 75, "#4CAF50","white","Join Game", () => {
            buttons = [];
            gameSelectScreen();
        });
    }

    // Displays a back button
    function makeBackButton (x,y) {

        // Goes back to main menu
        addButton(x, y, 200, 75, "#4CAF50","white","Back",() => {
            buttons = [];
            drawer.length = 2;
            menuScreen();
        });
    }

    // Allows the dealer to create a game
    function contractCreationScreen () {
        
        // Creates input field for min bet
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -280,
            y: 125,
            width: 280,
            onsubmit: submit     
        });

        // Creates input field for max bet
        input2 = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -280,
            y: 225,
            width: 280,
            onsubmit: submit
        });

        // Draws text to the screen and renders the input fields
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Minimum Bet Value", -130, -h/3 + 105);
            ctx.fillText("Maximum Bet Value", -130, -h/3 + 205);
            input.render();
            input2.render();
        });

        //Goes back to main menu
        makeBackButton(80, 175);

        // Allows submission of min and max bet values through the button
        addButton(80, 80, 200, 75, "#4CAF50","white","Submit",submit);

        // Makes a contract based on the min and max bet values
        async function submit() {
            contract = await makeContract(acc.address,input.value(),input2.value());
            alert('Game Created!');
            buttons = [];
            input.destroy();
            input2.destroy();
            drawer.pop();
            closeGameScreen();
        }
    }

    // Shows the current lobby size and allows the dealer to close the lobby
    async function closeGameScreen() {
        await timeBurn(contract,acc.address); //Testing code - Will be removed on final build
        let time = Date.now();
        
        //Returns lobby size
        async function setLobbySize () { //To run async fuction synchronously
            lobbySize = await returnLobbySize(contract);
        }
        let lobbySize = 0;

        // Draws text to the screen
        drawer.push(async ()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (Date.now() - time > 1000) {
                setLobbySize();
                time = Date.now();
            }
            ctx.fillText("Lobby Size: " + lobbySize, 0, -h/3 + 70 + 25);
        });
        
        // Allows dealer to close the lobby and start the game
        addButton(-100, 125, 200, 75, "#4CAF50","white","Close Game",async () => {
                let deposit = await possibleLoss(contract);
                if (deposit != 0 && lobbySize >= 1) {
                    alert("The game will now take "+deposit+ " ether as a deposit. You will get your money back if you follow the rules.");
                }
                await automateRand(contract,acc.address,()=>{});
                await closeGame(contract,acc.address,deposit);
                drawer.pop();
                buttons = [];
                dealerGameScreen();
        });
        //makeBackButton(80, 210);
    }

    // Displays an option to proceed - Note: Should edit to show more info
    function dealerGameScreen() {

        // Allows the dealer to finish the game
        addButton(-100, 200, 200, 75,"#4CAF50","white","Proceed", async () => {
            await finalRandProcess(contract,acc.address);
            buttons = [];
            drawer.pop();
            dealerFinishedScreen();
        });
 
        // Draws text to the screen
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Please wait while the players make their moves", 0, -h/3 + 95);
        });
    }

    // Displays an option to go back or continue - Note: Should edit to show more info
    function dealerFinishedScreen() {

        // Allows the dealer to create a new game
        addButton(-100, 40, 200, 75, "#4CAF50","white","New Game",async () => {
            await contract.methods.showCards().call({from: acc.address}).then(console.log);
            drawer.length = 2;
            buttons = [];
            newGame(contract,acc.address);
            closeGameScreen();
        });

        // Allows the dealer to withdraw their funds and leave
        addButton(-100, 125, 200, 75, "#4CAF50","white","Withdraw and Leave",async () => {
            await withdraw(contract,acc.address,100);
            await contract.methods.showCards().call({from: acc.address}).then(console.log);
            await removeOne(contract);
            drawer.length = 2;
            buttons = [];
            contract = null;
            menuScreen();
        });
    }

    // Allows the player to choose between the avaliable games
    async function gameSelectScreen () {
        games =	await getGames();
        for (let i = 0; i < games.length; i++) {
            let colShift = (i >= 5 ? 210 : 0), rowCountShift = (i >= 5 ? 5 : 0); 

            // Creates a button to allow players to join the specified game
            addButton(-310+colShift, 85*(i+1-rowCountShift)-45, 200, 75, "#85217e","white","Min Bet: "+ (games[i].minBet/Math.pow(10,18)).toString()+" Ether\nMax Bet: " + (games[i].maxBet/Math.pow(10,18)).toString()+ " Ether",async () => {
                contract = await new web3.eth.Contract(JSON.parse(cBlackjack.abi), games[i].address, {
                    gasLimit: 6721975,
                    gasPrice: 1
                });
                buttons = [];
                poolScreen();
            });
        }

        // Creates a button to return to main menu
        makeBackButton(110, 40);
    }

    // Allows the player to specify a pool from where they can bet money
    function poolScreen() {

        // Input box to allow players to specify their pool amount
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -250,
            y: 135,
            width: 480,
            onsubmit: async ()=> {
                await joinGame(contract,acc.address,input.value());
                input.destroy();
                drawer.pop();
                betScreen();
            }
            
        });

        // Draws text to the screen and renders input box
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Please set a bet threshold in Ether", 0, -h/3 + 85);
            ctx.font = "20px Balthazar";
            ctx.fillText("(Some ether will be sent to the contract and will act as your pool)", 0, -h/3 + 115);
            input.render();
        });
    }

    // Allows the player to bet
    function betScreen() {

        // Input box to allow players to specify their bet amount
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -250,
            y: 135,
            width: 480,
            onsubmit: async ()=> {
                await bet(contract,acc.address,input.value());
                buttons = [];
                input.destroy();
                drawer.pop();
                awaitGameStartScreen();
            }
        });

        // Allows players to withdraw their funds and leave
        addButton(-100, 175, 200, 75, "#4CAF50","white","Withdraw and Leave",async () => {
            input.destroy();
            await leave(contract,acc.address);
            cards = [];
            cards2 = [];
            dealerCards = [];
            drawer.length = 2;
            buttons = [];
            contract = null;
            menuScreen();
        });

        // Draws text to the screen and renders the input box
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("How much ether do you want to bet?", 0, -h/3 + 95);
            input.render();
        });
    }

    // Displays a wait messsage to wait for the dealer to initiate the game
    async function awaitGameStartScreen () {

        //Automates sending random numbers and hashs for the player
        listener = await automateRand(contract,acc.address, async ()=>{

            // Notifies user that a security deposit will be taken and takes the deposit (if one hasnt been made already)
            let deposit = await possibleLoss(contract);
            console.log(deposit);
            if (deposit != 0) {
                alert("The game will now take "+deposit*2+ " ether as a deposit. You will get your money back if you follow the rules.");
            }
            await submitDeposit(contract, acc.address, deposit*2);

            //Initiates the game screen when appropriate
            await makeEventListener(contract, 4, () =>{
                buttons = [];
                drawer.pop();
                playerGameScreen();
            });
        });

        // Allows players to withdraw their funds and leave
        addButton(-100, 135, 200, 75, "#4CAF50","white","Withdraw and Leave",async () => {
            listener.unsubscribe();
            await leave(contract,acc.address);
            cards = [];
            cards2 = [];
            dealerCards = [];
            drawer.length = 2;
            buttons = [];
            contract = null;
            menuScreen();
        });

        // Draws text to the screen
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Please wait for the game to start", 0, -h/3 + 95);
        });
    }

    // Displays the game screen
    async function playerGameScreen() {

        // Draws cards and their backdrops to the screen
        drawer.push(drawCards);

        let cardCount;
        let splitCardCount;

        // Creates button to perform the "hit" functionality in blackjack
        addButton(-210, 40, 200, 75, "#4CAF50","white","Hit",async () => {
            await hit(contract, acc.address);

            // Draw the newly made card in the appropriate hand
            let cardVals = await returnCards(contract,acc.address,false);
            let splitCardVals = await returnCards(contract,acc.address,true);          
            if (cardVals.length != cardCount || splitCardVals.length != splitCardCount) {
                let image = new Image();

                if (splitCardVals.length != splitCardCount && !standing) {
                    image.onload = function () {
                        addCard(image, cards);
                    }
                    image.src = '/' + splitCardVals[splitCardVals.length-1]+ '.png';
                } else if (splitCardVals.length > 1) {
                    image.onload = function () {
                        addCard(image, cards2);
                    }
                    image.src = '/' + cardVals[cardVals.length-1]+ '.png';
                } else {
                    image.onload = function () {
                        addCard(image, cards);
                    }
                    image.src = '/' + cardVals[cardVals.length-1]+ '.png';
                }

                cardCount = cardVals.length;
                splitCardCount = splitCardVals.length;

                // Set values for checking backdrop highlighting
                isDone = await done(contract,acc.address);
            }
        });

        // Creates button to perform the "stand" functionality in blackjack
        addButton(10, 40, 200, 75, "#4CAF50","white","Stand",async () => {
            await stand(contract,acc.address);

            // Set values for checking backdrop highlighting and card placement
            standing = true;
            isDone = await done(contract,acc.address);
        });

        // Creates button to perform the "double down" functionality in blackjack
        addButton(-210, 125, 200, 75, "#4CAF50","white","Double Down",async () => {
            await doubleDown(contract, acc.address);
            
            // Draw the newly made card
            let cardVals = await returnCards(contract,acc.address,false);
            if (cardVals.length != cardCount) {
                let image = new Image();
                image.onload = function () {
                    addCard(image, cards);
                }
                image.src = '/' + cardVals[cardVals.length-1]+ '.png';
                cardCount = cardVals.length;
            }

            // Set values for checking backdrop highlighting
            isDone = await done(contract,acc.address);
        });

        // Creates button to perform the "split" functionality in blackjack
        addButton(10, 125, 200, 75, "#4CAF50","white","Split",async () => {
            await split(contract, acc.address);
            
            // Move second card in hand 1 to hand 2
            cards2.push(cards.pop());
            cardCount = 1;
            splitCardCount = 1;
        });

        //Load in player cards
        let cardVals = await returnCards(contract,acc.address,false);
        cardCount = 2;
        splitCardCount = 0
        for (let i = 0; i < cardVals.length; i++){
            let image = new Image();
            image.onload = function () {
                addCard(image, cards);
            }
            image.src = '/'+cardVals[i]+'.png';
        }

        // Set values for checking backdrop highlighting
        isDone = await done(contract,acc.address);

        //Load in dealer cards
        let dealerVals = await returnCards(contract,await returnOwnerAddress(contract),false);
        let image = new Image();
        image.onload = function () {
            addCard(image, dealerCards);
        }
        image.src = '/'+dealerVals[dealerVals.length-1]+'.png';

        //Display final dealer cards once game is done
        await makeEventListener(contract, 5, async () =>{
            buttons = [];
            playerFinishedScreen();
        });
    }

    // Displays the dealer cards and options to continue or go back
    async function playerFinishedScreen () {

        // Create button to allow player to continue playing
        await addButton(-100, 40, 200, 75, "#4CAF50","white","Stay",async () => {
            
            // Reset necessary values
            cards = [];
            cards2 = [];
            dealerCards = [];
            standing = false;
            isDone = false;
            drawer.length = 2;
            buttons = [];
            betScreen();
        });

        // Create button to allow player to withdraw their funds and leave
        await addButton(-100, 125, 200, 75, "#4CAF50","white","Withdraw and Leave",async () => {
            await leave(contract,acc.address);

            // Reset necessary values
            cards = [];
            cards2 = [];
            dealerCards = [];
            standing = false;
            isDone = false;
            drawer.length = 2;
            buttons = [];
            contract = null;
            menuScreen();
        });

        // Draw the final dealer cards
        let dealerVals = await returnCards(contract,await returnOwnerAddress(contract),false);
        for (let i = 1; i < dealerVals.length; i++){
            await setTimeout(()=>{
                let image = new Image();
                image.onload = function () {
                    addCard(image, dealerCards);
                }
                image.src = '/'+dealerVals[i]+'.png';
            },i*2000);
        }
    }

    // Draw all elements dynamic to window size
    function draw() {
        for (let i = 0; i < drawer.length; i++){
            drawer[i]();
        }
    }
    
    // Continuously draw to screen
    function step () {
        draw();
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    //Add event listeners
    window.addEventListener('resize', resizeCanvas, false);
    canvas.addEventListener('click', checkClicks);

    //Set up drawers
    drawer.push(drawTitle);
    drawer.push(drawButtons);  

    //Set up screen
    resizeCanvas();

    //Start with login screen
    loginScreen();
});