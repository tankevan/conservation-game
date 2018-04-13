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
  this.playerSpeed = 2.5;
  this.startingHealth = 500;
  this.globalHealth = this.startingHealth;
  this.updateNumbers = false;
  this.shouldAddHelper = true;
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

  // player properties
  this.player.canMove = true;
  this.player.targetX = null;
  this.player.targetY = null;
  this.player.targetName = null;
  this.player.targetObj = null;
  this.player.onHand = null;
  this.player.gameActions = []; // contains arrays of [x, y, name, obj]

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

  // creates empty game action order group for the action labels
  this.orderGroup = this.add.group();

  // creates empty helper group
  this.helperGroup = this.add.group();
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
    trash.isTargeted = false;
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
    animal.isTargeted = false;
    animal.on('pointerup', function (pointer) {
      gameScene.clickedSprite(pointer, this.name, this);
    })

    this.animalGroup.add(animal);
  }
}

gameScene.clickedSprite = function(pointer, name, objRef) {
  if (!objRef.clicked && name !== 'recyclingBin') {
    if (!objRef.isTargeted) {
      objRef.clicked = true;
      objRef.isTargeted = true;
      this.player.gameActions.push([objRef.x, objRef.y, name, objRef]);
    }
  } else if (objRef.clicked && name !== 'recyclingBin') {
    objRef.clicked = false;
    objRef.isTargeted = false;
    this.removeAction(objRef.x, objRef.y);
  } else {
    this.player.gameActions.push([objRef.x, objRef.y, name, objRef]); 
  }
  this.updateNumbers = true;
}

gameScene.removeAction = function(xPos, yPos) {
  this.player.gameActions.forEach((value, index) => {
    if (value[0] === xPos && value[1] === yPos) {
      if ( this.player.gameActions.length >= index + 2 &&  this.player.gameActions[index+1][2] == 'recyclingBin') {
        this.player.gameActions.splice(index, 2);
      } else {
        this.player.gameActions.splice(index, 1);
      }
      this.player.targetX = null;
      this.player.targetY = null;
      this.player.targetName = null;
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
  if (! this.player.targetX && ! this.player.targetY &&  this.player.targetName) {
    if ( this.player.targetName === "trash") {
      if (! this.player.onHand) { this.reachTrash(this.player,  this.player.targetObj) }
    } else if ( this.player.targetName === "recyclingBin") {
      if ( this.player.onHand) { this.reachRecycling(this.player) }
    } else if ( this.player.targetName === 'animal') {
      if (! this.player.onHand) {
        this.player.canMove = false;
        const currObj = gameScene.player.targetObj;
        this.time.delayedCall(2000, function() {
          gameScene.reachAnimal(this.player, currObj);
        }, [], this);
      }
    }
  
    this.player.targetName = null;
    this.player.gameActions.shift();
    this.updateNumbers = true;
  }
  

  // updates with next action if no curr action
  if ( this.player.canMove && ! this.player.targetX && ! this.player.targetY &&  this.player.gameActions.length > 0) {
    // sets next coordinate as target
    const newCoord =  this.player.gameActions[0];
    this.player.targetX = newCoord[0];
    this.player.targetY = newCoord[1];
    this.player.targetName = newCoord[2];
    this.player.targetObj = newCoord[3];
  }

  // move player when new position clicked
  if ( this.player.canMove &&  this.player.targetX && Math.abs( this.player.x -  this.player.targetX) > 2) {
    if (this.player.x >  this.player.targetX) {
      this.movePlayer(this.player, -this.playerSpeed, 0); // move x by playerSpeed and y by 0
    } else {
      this.movePlayer(this.player, this.playerSpeed, 0);
    }
  } else {
    this.player.targetX = null; // set target to null when x-coord reached
  }

  if ( this.player.targetY && Math.abs(this.player.y -  this.player.targetY) > 2) {
    if (this.player.y >  this.player.targetY) {
      this.movePlayer(this.player, 0, -this.playerSpeed);
    } else {
      this.movePlayer(this.player, 0, this.playerSpeed);
    }
  } else {
    this.player.targetY = null;
  }

  // !! helper behavior
  this.helperGroup.children.each((helper) => {
    // if at item, perform action
    if (! helper.targetX && ! helper.targetY &&  helper.targetName) {
      if ( helper.targetName === "trash") {
        if (! helper.onHand) { this.reachTrash(helper,  helper.targetObj) }
      } else if ( helper.targetName === "recyclingBin") {
        if ( helper.onHand) { this.reachRecycling(helper) }
      } else if ( helper.targetName === 'animal') {
        if (!helper.onHand) {
          helper.canMove = false;
          console.log(helper.canMove);
          const currObj = helper.targetObj;
          this.time.delayedCall(2000, function() {
            gameScene.reachAnimal(helper, currObj);
          }, [], this);
        }
      }
    
      helper.targetName = null;
      helper.gameActions.shift();
      this.updateNumbers = true;
    }

    // if no targetX and targetY, get new action
    if (!helper.targetX && !helper.targetY) {
      if (helper.onHand) {
        const target = gameScene.recyclingBin;
        helper.targetX = target.x;
        helper.targetY = target.y;
        helper.targetName = "recyclingBin";
      } else {
        if (helper.collectType === 'trash') {
          const arrSize = gameScene.trashGroup.children.size;
          if (arrSize > 0) {
            for (var i = 0; i < arrSize; i++) {
              const target = gameScene.trashGroup.children.entries[i];
              if (!target.isTargeted) {
                helper.targetX = target.x;
                helper.targetY = target.y;
                helper.targetObj = target;
                helper.targetName = "trash";
                gameScene.trashGroup.children.entries[i].isTargeted = true;
                break;
              }
            };
          }
        } else if (helper.collectType === 'animal') {
          const arrSize = gameScene.animalGroup.children.size;
          if (arrSize > 0) {
            for (var i = 0; i < arrSize; i++) {
              const target = gameScene.animalGroup.children.entries[i];
              if (!target.isTargeted) {
                helper.targetX = target.x;
                helper.targetY = target.y;
                helper.targetName = "animal";
                helper.targetObj = target;
                gameScene.animalGroup.children.entries[i].isTargeted = true;
                break;
              }
            };
          }
        }
      }
    }

    // if not at targetX and targetY, move there
    if (helper.canMove && helper.targetX && Math.abs(helper.x - helper.targetX) > 2) {
      if (helper.x > helper.targetX) {
        this.movePlayer(helper, -helper.playerSpeed, 0); // move x by playerSpeed and y by 0
      } else {
        this.movePlayer(helper, helper.playerSpeed, 0);
      }
    } else {
      helper.targetX = null; // set target to null when x-coord reached
    }
  
    if (helper.canMove && helper.targetY && Math.abs(helper.y - helper.targetY) > 2) {
      if (helper.y > helper.targetY) {
        this.movePlayer(helper, 0, -helper.playerSpeed);
      } else {
        this.movePlayer(helper, 0, this.playerSpeed);
      }
    } else {
      helper.targetY = null;
    }
  });

  // update text of ordering of actions
  if (this.updateNumbers) {
    this.orderGroup.children.each((label) => {
      label.destroy();
    })
    this.orderGroup.children.clear();
    this.player.gameActions.forEach((value, index) => {
      const txt = this.add.text(value[0], value[1], index + 1)
      this.orderGroup.add(txt);
    })
    this.updateNumbers = false;
  }

 //if (this.shouldAddHelper) {
  if (this.helperGroup.children.size < 2) {
    this.addHelper();
  }
};

// *** UPDATE SUB-FUNCTIONS *** 

gameScene.movePlayer = function(player, xMove, yMove) {
  player.x += xMove;
  player.y += yMove;
  if (player.onHand) {
    player.onHand.x += xMove;
    player.onHand.y += yMove;
  }
}

gameScene.reachTrash = function(player, trash) {
  this.trashGroup.remove(trash);
  player.onHand = trash;
  trash.x = player.x;
  trash.y = player.y;
}

gameScene.reachAnimal = function(player, animal) {
  this.animalGroup.remove(animal);
  animal.destroy();
  player.canMove = true;
  this.globalHealth += 10;
  globalHealthText.setText(this.globalHealth);
}

gameScene.reachRecycling = function(player) {
  player.onHand.destroy();
  this.globalHealth += 10;
  globalHealthText.setText(this.globalHealth);
  player.onHand = null;
}

gameScene.addHelper = function() {
  const helperX = this.sys.game.config.width / 2;
  const helperY = this.sys.game.config.height / 2;
  const helper = this.add.sprite(helperX, helperY, 'player')
                         .setScale(0.5);
  
  helper.playerSpeed = 2.5;
  helper.canMove = true;
  helper.targetX = 200;
  helper.targetY = 200;
  helper.targetName = null;
  helper.targetObj = null;
  helper.onHand = null;
  helper.gameActions = []; // contains arrays of [x, y, name, obj]
  if (Math.random() > 0.5) {
    helper.collectType = 'trash';
  } else {
    helper.collectType = 'animal';
  }
  console.log(helper.collectType);

  this.helperGroup.add(helper);
  this.shouldAddHelper = false;
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
