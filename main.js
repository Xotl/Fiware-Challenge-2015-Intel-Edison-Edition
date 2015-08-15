var mraa = require('mraa'), //require mraa
    request = require('request');


var button = new mraa.Gpio(6);// pin J17-7
    myLed = new m.Gpio(13); // pin J17-14


button.dir(mraa.DIR_IN); //set the gpio direction to input
myLed.dir(m.DIR_OUT); //set the gpio direction to output
myLed.write(0);// Make sure is turned off.

var fastBlink = function (callback) {
  var waitTime = 200;
  myLed.write(1);
  setTimeout(function() {
    myLed.write(0);
    setTimeout(function() {
      myLed.write(1);
      setTimeout(function() {
        myLed.write(0);
        setTimeout(function() {
          myLed.write(1);
          callback();
        }, 1000);
      }, waitTime);
    }, waitTime);
  }, waitTime);
};

var sendDataAndrestart = function(liters) {

  var blink = 1;
  var ultraFastBlinkInterval = setInterval(function() {
    myLed.write(ledState ? 1 : 0);
  }, 200);


  // Send data
  request.get('http://reto-fiware-cp15.herokuapp.com/api/postUserData', { liters: liters })
  .on('response', function(response) {
    clearInterval(ultraFastBlinkInterval);
    myLed.write(0);// Make sure is turned off.
    if (response.statusCode != 200) {
      console.log(response);
    }

    waitForWakeUp();
  })
  .on('error', function(err) {
    clearInterval(ultraFastBlinkInterval);
    myLed.write(0);// Make sure is turned off.
    console.log(err);
    waitForWakeUp();
  });
};

var waitForWakeUp = function() {
  var newState = button.read(); //read the digital value of the pin

  if (newState === 0) {
    // Continue waiting
    setTimeout(waitForWakeUp, 2000); //call the indicated function after 1 second (1000 milliseconds)
    return;
  }

  // Wake Up signal to User (fast blink)
  fastBlink(function () {

    // Wait for the gas filling
    var waitForStartFillingInterval = setInterval(function() {
      if (button.read() === 1) {
        myLed.write(0);
        clearInterval(waitForStartFillingInterval);

        // Count mililiters (1000 ms == 1 liter of gas)
        var gasMililiters = 0;
        var fillingInterval = setInterval(function() {
          if (button.read() === 0) {
            clearInterval(fillingInterval);
            sendDataAndrestart();
            return;
          }

          gasMililiters += 10;
        }, 10);
      }
    }, 10);
  });
};

waitForWakeUp();
