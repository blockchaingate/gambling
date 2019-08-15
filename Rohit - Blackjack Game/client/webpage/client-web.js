/*|======================To-do list======================|*\
|*|                                                      |*|
|*| (-) Make api format uniform for HTML JS              |*|
|*| (-) Organize (such as move makeBackButton() into     |*|
|*|     screen functions                                 |*|
|*| (+) Fix temporary event listener callback hell       |*|
|*|                                                      |*|
|*|======================================================|*|
|*|                                                      |*|
|*| (-) = Current objectives                             |*|
|*| (+) = Will complete after client-side program        |*|
|*|                                                      |*|
\*|======================================================|*/

window.addEventListener("load", () =>{
    
    // Set up canvas
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    
    let drawer = [];
    let buttons = [];
    let cards = []
    //let joinButton, createButton, testButton;
    let w,h;

    let contract;
    let games = [];
    let acc;
    let privateKey;

    let input;

    // Function to remove an element from an array
    function arrRemove(arr,element) {
        let index = arr.indexOf(element);
        if (index != -1) {
            arr.splice(index,1);
        }
    }

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
        //return button;
    }

    function addCard (_image,_x,_y,_width,_height) {
      
        //Add button to array
        let card = {
            image: _image,
            x: _x,
            y: _y,
            width: _width,
            height: _height
        };
        cards.push(card);
        //return button;
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
    
    function drawTitle () {
        // Draw Title
        ctx.clearRect(-w/2,-h/2,w,h)
        ctx.font = "100px Algerian";
        ctx.fillStyle = "rgb(255,223,0)";
        ctx.textAlign = "center";
        ctx.fillText("Blackjack", 0, -h/2.5); 
    }

    function drawButtons () {
        for (let index = 0; index < buttons.length; index++) {
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

    function drawCards () {
        for (let index = 0; index < cards.length; index++) {
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(cards[index].image,cards[index].x,cards[index].y,cards[index].width,cards[index].height);
        }
    }

    function loginScreen(){
        console.log("e6974be75995c317b182ff6e7b33058e7ba3328354305040a075d544db240886")
        console.log("5275f72548b49081aab8b9f71dfca866247dddefb706f4cfa751284d5221027e")
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
        addButton(10, 40, 200, 75, "#4CAF50","white","Create Game",() => {
            buttons = [];
            contractCreationScreen();
        });

        /*joinButton =*/ addButton(-210, 40, 200, 75, "#4CAF50","white","Join Game", () => {
            alert('Button was clicked!');
            //arrRemove(buttons, joinButton);
            //arrRemove(buttons, createButton);
            buttons = [];
            gameSelectScreen();
        });
    }

    function makeBackButton (x,y) {
        /*testButton =*/ addButton(x, y, 200, 75, "#4CAF50","white","Back",() => {
            alert('Going back...');
            buttons = [];
            drawer.length = 2;
            //arrRemove(buttons, testButton);
            menuScreen();
        });
    }

    function contractCreationScreen () {
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -280,
            y: 125,
            width: 280     
        });
        input2 = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -280,
            y: 225,
            width: 280            
        });

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
        makeBackButton(80, 175);
        addButton(80, 80, 200, 75, "#4CAF50","white","Submit",async () => {
            contract = await makeContract(acc.address,input.value(),input2.value());
            alert('Game Created!');
            //arrRemove(buttons, joinButton);
            //arrRemove(buttons, createButton);
            buttons = [];
            input.destroy();
            input2.destroy();
            drawer.pop();
            closeGameScreen();
        })        
    }

    async function closeGameScreen() {
        await startTimer(contract,acc.address); // Tester code
        await timeBurn(contract,acc.address); //Tester code
        addButton(80, 40, 200, 75, "#4CAF50","white","Check Lobby Size",async () => {
            await contract.methods.playerCount().call().then(alert); //Replace with event listener
        });
        addButton(80, 125, 200, 75, "#4CAF50","white","Close Game",async () => {
            await automateRand(contract,acc.address,()=>{});
            await closeGame(contract,acc.address,10); //Make dynamic later
            alert("Game Closed");
        });
        //makeBackButton(80, 210);
    }

    async function gameSelectScreen () {
        games =	await getGames();
        for (let i = 0; i < games.length; i++) {
            let colShift = (i >= 5 ? 210 : 0), rowCountShift = (i >= 5 ? 5 : 0); 
            addButton(-310+colShift, 85*(i+1-rowCountShift)-45, 200, 75, "#85217e","white","Min Bet: "+ (games[i].minBet/Math.pow(10,18)).toString()+" Ether\nMax Bet: " + (games[i].maxBet/Math.pow(10,18)).toString()+ " Ether",async () => {
                contract = await new web3.eth.Contract(JSON.parse(cBlackjack.abi), games[i].address, {
                    gasLimit: 6721975,
                    gasPrice: 1
                });
                buttons = [];
                poolScreen();
            });
        }
        makeBackButton(110, 40);
    }

    function poolScreen() {
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

    function betScreen() {
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -250,
            y: 135,
            width: 480,
            onsubmit: async ()=> {
                await bet(contract,acc.address,input.value());
                input.destroy();
                drawer.pop();
                awaitGameStartScreen();
            }
            
        });
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("How much ether do you want to bet?", 0, -h/3 + 95);
            input.render();
        });
    }

    async function awaitGameStartScreen () {
        await automateRand(contract,acc.address, async ()=>{
            await submitDeposit(contract, acc.address, 10);//Make dynamic later
            await makeEventListener(contract, 4, () =>{
                drawer.pop();
                gameScreen();
            });
        });
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Please wait for the game to start", 0, -h/3 + 95);
        });
    }

    async function gameScreen() {
        addButton(-210, 40, 200, 75, "#4CAF50","white","Hit",async () => {
        });
        addButton(10, 40, 200, 75, "#4CAF50","white","Stand",async () => {
        });
        addButton(-210, 125, 200, 75, "#4CAF50","white","Double Down",async () => {
        });
        addButton(10, 125, 200, 75, "#4CAF50","white","Split",async () => {
        });

        //Load in cards
        let cardVals = await returnCards(contract,acc.address);
        console.log(cardVals);
        for (let i = 0; i < cardVals.length; i++){
            let image = new Image();
            image.onload = function () {
                addCard(image, -210+70*i, -h/3+220, 65, 100);
            }
            image.src = '/'+cardVals[i]+'.png';
        }
    }

    // Draw all elements dynamic to window size
    function draw() {
        for (let i = 0; i < drawer.length; i++){
            drawer[i]();
        }
    }
    
    // Animate
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
    drawer.push(drawCards);
    //Set up screen
    resizeCanvas();

    //Start with login screen
    loginScreen();
    
});