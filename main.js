var mraa = require('mraa') //require mraa
    request = require('request');


var button = new mraa.Gpio(6), // pin J17-7
    myLed = new mraa.Gpio(13), // pin J17-14
    BUTTON_DOWN = 0,
    BUTTON_UP= 1;




button.dir(mraa.DIR_IN); //set the gpio direction to input
myLed.dir(mraa.DIR_OUT); //set the gpio direction to output
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
  var blink = 0;
  var ultraFastBlinkInterval = setInterval(function() {
    blink = blink ? 0 : 1;
    myLed.write(blink);
  }, 50);


  console.log('Sending data...');
  // Send data
  request.get('http://reto-fiware-cp15.herokuapp.com/api/postUserData?liters=' + liters)
  .on('response', function(response, body) {
    clearInterval(ultraFastBlinkInterval);
    myLed.write(0);// Make sure is turned off.
    if (response.statusCode != 200) {
      console.log('An Error ' + response.statusCode + ' received from server');
    }

    console.log('Data sent, restarting.');
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

  if (button.read() === BUTTON_UP) {
    console.log('Waiting to wake up...');
    // Continue waiting
    setTimeout(waitForWakeUp, 2000); //call the indicated function after 1 second (1000 milliseconds)
    return;
  }

  console.log('Waked up!');


  // Wake Up signal to User (fast blink)
  fastBlink(function () {

    console.log('Waiting to received gas...');
    // Wait for the gas filling
    var waitForStartFillingInterval = setInterval(function() {

      if (button.read() === BUTTON_DOWN) {
        myLed.write(0);
        clearInterval(waitForStartFillingInterval);

        console.log('Receiving gas!');

        // Count mililiters (1000 ms == 1 liter of gas)
        var time = process.hrtime();
        var fillingInterval = setInterval(function() {
          var diff = process.hrtime(time);
          diff = diff[0] + (diff[1] * 1e-9);
          if (button.read() === BUTTON_UP) {
            clearInterval(fillingInterval);
            sendDataAndrestart(diff);
          }
        }, 1);
      }
    }, 1);
  });
};

waitForWakeUp();
