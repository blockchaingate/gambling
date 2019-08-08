window.addEventListener("load", () =>{
        
    // Set up canvas
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");

    let drawer = [];
    let buttons = [];
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
            let fontSize = Math.min(buttons[index].width*2.3/maxWidth,buttons[index].height/(1+indices.length))*0.9;                   
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
        /*createButton =*/ addButton(10, 40, 200, 75, "#4CAF50","white","Create Game",() => {
            buttons = [];
            contractCreationScreen();
        });

        /*joinButton =*/ addButton(-210, 40, 200, 75, "#4CAF50","white","Join Game", () => {
            alert('Button was clicked!');
            //arrRemove(buttons, joinButton);
            //arrRemove(buttons, createButton);
            buttons = [];
            gameSelectScreen();
            makeBackButton();
        });
    }

    function makeBackButton () {
        /*testButton =*/ addButton(110, 40, 200, 75, "#4CAF50","white","back",() => {
            alert('Going back...');
            buttons = [];
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
        addButton(80, 150, 200, 75, "#4CAF50","white","Submit",() => {
            makeContract(acc.address,(input.value()*Math.pow(10,18)).toString(10),(input2.value()*Math.pow(10,18)).toString(10));
            alert('Game Created!');
            //arrRemove(buttons, joinButton);
            //arrRemove(buttons, createButton);
            buttons = [];
            input.destroy();
            input2.destroy();
            drawer.pop();
            makeBackButton();
        })        
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
    }

    function poolScreen() {
        input = new CanvasInput({
            canvas: document.getElementById("canvas"),
            x: -250,
            y: 135,
            width: 480,
            onsubmit: async ()=> {
                await contract.methods.joinGame().send({from: acc.address, value: input.value() * Math.pow(10,18)});
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
                await contract.methods.bet((input.value()*Math.pow(10,18)).toString(10)).send({from: acc.address});
                input.destroy();
                drawer.pop();
            }
            
        });
        drawer.push(()=>{
            ctx.font = "40px Balthazar";
            ctx.fillStyle = "#7bff00";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("How much do you want to bet?", 0, -h/3 + 95);
            input.render();
        });
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

    //Set up screen
    resizeCanvas();

    //Start with login screen
    loginScreen();
    
  });