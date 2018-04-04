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
  this.targetX = 40;
  this.targetY = this.sys.game.config.height / 2;
  this.startingHealth = 50;
  this.globalHealth = this.startingHealth;

  this.onHand = null;
}

// load asset files for our game
gameScene.preload = function() {

  // load images
  this.load.image('background', 'assets/background.png');
  this.load.image('player', 'assets/player.png');
  this.load.image('dragon', 'assets/dragon.png');
  this.load.image('treasure', 'assets/treasure.png');
};

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
};

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
    const trash = this.add.sprite(trashX, trashY, 'treasure').setScale(0.6);
    this.trashGroup.add(trash);
  }
}

// executed on every frame (60 times per second)
gameScene.update = function() {

  // only if the player is alive
  if (!this.isPlayerAlive) {
    return;
  }

  // check for active input
  if (this.input.activePointer.isDown) {
    // player walks
    this.targetX = this.input.activePointer.x;
    this.targetY = this.input.activePointer.y;
  }
  
  // move player when new position clicked
  if (Math.abs(this.player.x - this.targetX) > 1) {
    if (this.player.x > this.targetX) {
      this.movePlayer(-this.playerSpeed, 0); // move x by playerSpeed and y by 0
    } else {
      this.movePlayer(this.playerSpeed, 0);
    }
  }

  if (Math.abs(this.player.y - this.targetY) > 1) {
    if (this.player.y > this.targetY) {
      this.movePlayer(0, -this.playerSpeed);
    } else {
      this.movePlayer(0, this.playerSpeed);
    }
  }

  // check for collision with trash and no item onHand
  Phaser.Actions.Call(this.trashGroup.getChildren(), (trash) => {
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), trash.getBounds()) && !this.onHand) {
      this.trashGroup.remove(trash);
      this.onHand = trash;
      trash.x = this.player.x;
      trash.y = this.player.y;
    }
  });

  // check if player is at recycling bin and item onHand
  if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.recyclingBin.getBounds()) && this.onHand) {
    this.onHand.destroy();
    this.globalHealth += 10;
    globalHealthText.setText(this.globalHealth);
    this.onHand = null;
  }
};

gameScene.movePlayer = function(xMove, yMove) {
  this.player.x += xMove;
  this.player.y += yMove;
  if (this.onHand) {
    this.onHand.x += xMove;
    this.onHand.y += yMove;
  }
}

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

  // destroy timerEvent
  this.timedEvent.destroy();
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
