// create a new scene named "Game"
let gameScene = new Phaser.Scene('Game');

// game parameters
// gameScene.playerSpeed = 1.5;
// gameScene.enemySpeed = 2;
// gameScene.enemyMaxY = 280;
// gameScene.enemyMinY = 80;
// gameScene.isPlayerAlive = true;

// some parameters for our scene
gameScene.init = function() {
  this.canMove = true;
  this.playerSpeed = 2.5;
  this.targetX = null;
  this.targetY = null;
  this.targetName = null;
  this.targetObj = null;
  this.startingHealth = 500;
  this.globalHealth = this.startingHealth;

  this.onHand = null;
  this.gameActions = []; // contains arrays of [x, y, name, obj]
  this.updateNumbers = false;
}

// load asset files for our game
gameScene.preload = function() {

  // load images
  this.load.image('background', 'assets/background.png');
  this.load.image('player', 'assets/player.png');
  this.load.image('dragon', 'assets/dragon.png');
  this.load.image('treasure', 'assets/treasure.png');
};


// ***************************
// *** GAME CREATE SECTION ***
// ***************************

// executed once, after assets were loaded
gameScene.create = function() {

  // background
  let bg = this.add.sprite(0, 0, 'background');

  // change origin to the top-left of the sprite
  bg.setOrigin(0, 0);

  // player
  this.player = this.add.sprite(40, this.sys.game.config.height / 2, 'player');

  // scale down
  this.player.setScale(0.5);

  // add dragon trash bin
  this.recyclingBin = this.add.sprite(30, 80, 'dragon');
  this.recyclingBin.setScale(0.5);
  this.recyclingBin.setInteractive();
  this.recyclingBin.name = "recyclingBin";
  this.recyclingBin.on('pointerup', function(pointer) {
    gameScene.clickedSprite(pointer, gameScene.recyclingBin.name, gameScene.recyclingBin);
  })

  // player is alive
  this.isPlayerAlive = true;

  // set game timer
  this.timedEvent = this.time.addEvent({
    delay: 1000,
    callback: countDown,
    callbackScope: this,
    loop: true
  });

  globalHealthText = this.add.text(10, 10, this.globalHealth);

  // set timer to create trash every 2 seconds
  this.trashGroup = this.add.group();

  this.trashEvent = this.time.addEvent({
    delay: 1000,
    callback: addTrash,
    callbackScope: this,
    loop: true,
  });

  // set timer to create animal every 5 seconds
  this.animalGroup = this.add.group();

  this.animalEvent = this.time.addEvent({
    delay: 1000,
    callback: addAnimal,
    callbackScope: this,
    loop: true,
  });

  // creates empty game action order group
  this.orderGroup = this.add.group();
};

// *** CREATE SUB-FUNCTIONS *** 

function countDown() {
  if (this.globalHealth > 0) {
    this.globalHealth -= 1;
    globalHealthText.setText(this.globalHealth);
  } else {
    this.gameOver();
  }
}

function addTrash() {
  if (this.trashGroup.children.size < 5) {
    const trashX = Math.random() * this.sys.game.config.width;
    const trashY = Math.random() * this.sys.game.config.height;
    const trash = this.add.sprite(trashX, trashY, 'treasure')
                          .setScale(0.6)
                          .setInteractive();

    trash.name = "trash";
    trash.clicked = false;
    trash.on('pointerup', function (pointer) {
      const name = this.name; // pass name of object for identification
      gameScene.clickedSprite(pointer, name, this);
    });
    // trash.on('pointerout', function (pointer) {
    //   gameScene.unclickedSprite(this.x, this.y);
    // })

    this.trashGroup.add(trash);
  }
}

function addAnimal() {
  if (this.animalGroup.children.size < 5) {
    const animalX = Math.random() * this.sys.game.config.width;
    const animalY = Math.random() * this.sys.game.config.height;
    const animal = this.add.sprite(animalX, animalY, 'dragon')
                           .setScale(0.3)
                           .setInteractive();
    
    animal.name = "animal";
    animal.clicked = false;
    animal.on('pointerup', function (pointer) {
      gameScene.clickedSprite(pointer, this.name, this);
    })

    this.animalGroup.add(animal);
  }
}

gameScene.clickedSprite = function(pointer, name, objRef) {
  if (!objRef.clicked && name !== 'recyclingBin') {
    objRef.clicked = true;
    this.gameActions.push([objRef.x, objRef.y, name, objRef]);
  } else if (objRef.clicked && name !== 'recyclingBin') {
    objRef.clicked = false;
    this.removeAction(objRef.x, objRef.y);
  } else {
    this.gameActions.push([objRef.x, objRef.y, name, objRef]);
  }
  this.updateNumbers = true;
}

gameScene.removeAction = function(xPos, yPos) {
  this.gameActions.forEach((value, index) => {
    if (value[0] === xPos && value[1] === yPos) {
      console.log("deleting action");
      if (this.gameActions.length >= index + 2 && this.gameActions[index+1][2] == 'recyclingBin') {
        this.gameActions.splice(index, 2);
      } else {
        this.gameActions.splice(index, 1);
      }
      this.targetX = null;
      this.targetY = null;
      this.targetName = null;
    }
  })
}

// ***************************
// *** GAME UPDATE SECTION ***
// ***************************

// executed on every frame (60 times per second)
gameScene.update = function() {

  // only if the player is alive
  if (!this.isPlayerAlive) {
    return;
  }

  // resolve previous action since coord is reached
  if (!this.targetX && !this.targetY && this.targetName) {
    if (this.targetName === "trash") {
      if (!this.onHand) { this.reachTrash(this.targetObj) }
    } else if (this.targetName === "recyclingBin") {
      if (this.onHand) { this.reachRecycling() }
    } else if (this.targetName === 'animal') {
      if (!this.onHand) {
        this.canMove = false;
        console.log(this.canMove);
        const currObj = gameScene.targetObj;
        this.time.delayedCall(2000, function() {
          gameScene.reachAnimal(currObj);
        }, [], this);
      }
    }
  
    this.targetName = null;
    this.gameActions.shift();
    this.updateNumbers = true;
  }
  

  // updates with next action if no curr action
  if (this.canMove && !this.targetX && !this.targetY && this.gameActions.length > 0) {
    // sets next coordinate as target
    const newCoord = this.gameActions[0];
    this.targetX = newCoord[0];
    this.targetY = newCoord[1];
    this.targetName = newCoord[2];
    this.targetObj = newCoord[3];
  }

  // move player when new position clicked
  if (this.canMove && this.targetX && Math.abs(this.player.x - this.targetX) > 2) {
    if (this.player.x > this.targetX) {
      this.movePlayer(-this.playerSpeed, 0); // move x by playerSpeed and y by 0
    } else {
      this.movePlayer(this.playerSpeed, 0);
    }
  } else {
    this.targetX = null; // set target to null when x-coord reached
  }

  if (this.targetY && Math.abs(this.player.y - this.targetY) > 2) {
    if (this.player.y > this.targetY) {
      this.movePlayer(0, -this.playerSpeed);
    } else {
      this.movePlayer(0, this.playerSpeed);
    }
  } else {
    this.targetY = null;
  }

  // update text of ordering of actions
  if (this.updateNumbers) {
    this.orderGroup.children.each((label) => {
      label.destroy();
    })
    this.orderGroup.children.clear();
    this.gameActions.forEach((value, index) => {
      const txt = this.add.text(value[0], value[1], index + 1)
      this.orderGroup.add(txt);
    })
    this.updateNumbers = false;
  }
};

// *** UPDATE SUB-FUNCTIONS *** 

gameScene.movePlayer = function(xMove, yMove) {
  this.player.x += xMove;
  this.player.y += yMove;
  if (this.onHand) {
    this.onHand.x += xMove;
    this.onHand.y += yMove;
  }
}

gameScene.reachTrash = function(trash) {
  this.trashGroup.remove(trash);
  this.onHand = trash;
  trash.x = this.player.x;
  trash.y = this.player.y;
}

gameScene.reachAnimal = function(animal) {
  this.animalGroup.remove(animal);
  animal.destroy();
  this.canMove = true;
  console.log(this.canMove);
}

gameScene.reachRecycling = function() {
  this.onHand.destroy();
  this.globalHealth += 10;
  globalHealthText.setText(this.globalHealth);
  this.onHand = null;
}

// *************************
// *** GAME OVER SECTION ***
// ************************* 
gameScene.gameOver = function() {

  // flag to set player is dead
  this.isPlayerAlive = false;

  // shake the camera
  this.cameras.main.shake(500);

  // fade camera
  this.time.delayedCall(250, function() {
    this.cameras.main.fade(250);
  }, [], this);

  // restart game
  this.time.delayedCall(500, function() {
    this.scene.manager.bootScene(this);
  }, [], this);

  // reset camera effects
  this.time.delayedCall(600, function() {
    this.cameras.main.resetFX();
  }, [], this);

  // clear variables
  this.timedEvent.destroy(); // destroy timer event
  this.trashEvent.destroy(); // destroy trash event
  this.trashGroup.children.clear();
  

};

// our game's configuration
let config = {
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  scene: gameScene
};

// create the game, and pass it the configuration
let game = new Phaser.Game(config);
