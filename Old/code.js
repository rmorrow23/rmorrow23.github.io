
function startFun() {
  //log for debugging purposes
  console.log("startFun started");
  //turn off start button, turn on stop button
  document.getElementById("startButton").disabled = true;
  document.getElementById("stopButton").disabled = false;
  //start marquee movement
  document.getElementById("myMarquee").start();
}

function stopFun() {

  console.log("stopFun started")
  //turn off start button, turn on start button
  document.getElementById("stopButton").disabled = true;
  document.getElementById("startButton").disabled = false;
  //stop marquee from moving
  document.getElementById("myMarquee").stop();
}
