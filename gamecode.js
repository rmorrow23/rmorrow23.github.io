
function playCraps() {
  //this is a function to play Craps in the game.html
  // for craps, sum of 7 or 11 is a loss, doubles that are even win!


  console.log("playCraps() started");
  //calculate die 1
  var die1 = Math.ceil(Math.random() * 6);
  console.log("die1 result = " + die1);
  document.getElementById("die1Res").src = "dice_" + die1 + ".png";
  // calculate die 2
  var die2 = Math.ceil(Math.random() * 6);
  console.log("die2 result = " + die2);
  document.getElementById("die2Res").src = "dice_" + die2 + ".png";
  // adds the two die together with a sum
  var sum = die1 + die2;
  console.log("sum result = " + sum);
  document.getElementById("sumRes").innerHTML = "= " + sum;

  // check for 7 or 11 meaning loss
  if (sum == 7 || sum == 11) {
    document.getElementById("gameRes").innerHTML =
      "You lost!"
    sleep(800).then(() => {
      alert("Well Crap, You Lost.")
    });
  } //check for doubles and even for the win
  else if (die1 == die2 && die1 % die2 == 0) {
    document.getElementById("gameRes").innerHTML =
      "You Lost"
    sleep(800).then(() => {
      alert("You Won!")
    });

  } // did not win, did not lose so a push
  else {
    document.getElementById("gameRes").innerHTML =
      "You Pushed!"
    sleep(800).then(() => {
      alert("You Did Not Win or Lose You Pushed!")
    });
  }

}
//This Function changes the visibility of the components
function roll() {
  die1Res.style.display = "none"
  die2Res.style.display = "none"
  stay.style.display = "none"
  Roll.style.display = "inline"
  stay2.style.display = "none"
  Roll2.style.display = "inline"
  sleep(1000).then(() => {
    die1Res.style.display = "inline"
    die2Res.style.display = "inline"
    Roll.style.display = "none"
    Roll2.style.display = "none"
  });
  sleep(1000).then(() => { playCraps() });

}
//This creates a delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


