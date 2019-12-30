  function createThrobber(div, delay) {
    var size = 100;
    var linecount = 40;

    var wrapper = $("<div class=\"throbber-wrapper\"></div>").appendTo(div);

    var canvas = $("<canvas class=\"throbber\"/ width=\""+size+"\" height=\""+size+"\">")
      .appendTo(wrapper);
      
    var timeout = null;
    var start = null;
    var done = false;

    function step(timestamp) {
      if (!start) {
        start = timestamp;
      }

      if (done) {
        return;
      }
      var progress = timestamp - start;

      var angle = Math.floor(timestamp/1000*linecount)*360/linecount;
      var value = "rotate(" + angle + "deg)";
      canvas.css({"transform" : value,
                  "-webkit-transform" : value,
                  "-moz-transform" : value,
                  "-ms-transform" : value});

      window.requestAnimationFrame(step);
    }

    function startThrobber() {
      wrapper.addClass("active");

      try {
        var ctx = canvas[0].getContext("2d");
        ctx.translate(size/2, size/2);
        for (var i=0 ; i < linecount ; ++i) {
          ctx.rotate(-Math.PI*2 / linecount);
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 / linecount).toFixed(2) + ')';
          ctx.lineWidth = 3;
          ctx.moveTo(size/4, 0);
          ctx.lineTo(2*size/4, 0);
          ctx.stroke();
        }
        window.requestAnimationFrame(step);
      } catch(e) {
        // opbject removed before we could start... ignore
      }
    }

    if (delay) {
      timeout = setTimeout(startThrobber, 400);
    } else {
      startThrobber();
    }

    return {
      close: function() {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
        wrapper.remove();
        done = true;
      }
    }
  }


$(function() {

  var output;
  var expectCB = null;
  var packets = 0;

  function expectData(cb) {
    output = "";    
    expectCB = cb;
  }
  function dataReceived(str) {
    console.log("Got data ", str);
    ++packets;
    if (str.startsWith("##")) {      
      console.log("data done");
      if (expectCB) {
        expectCB(output);
        output = "";
        expectCB = "";
      }
    } else {
      output += str;
      $(".output").html(packets + " " + str.length);
    }
  }

  function dataFailure() {
    console.log("Error with data subscription");
  }

  function send(i) {
    if (!!window.cordova) { 
      bluetoothSerial.write(i, writeSuccess, writeFailure);      
    } else {
      console.log("Command", i);
      writeSuccess();
      if (i === "0") {
        setTimeout(function() {
          dataReceived("1577653028,nan,nam\n");
          dataReceived("1577653031,nan,nam\n");
          dataReceived("1577653091,21.60,46.30\n");
          dataReceived("1577653191,21.80,44.30\n");
          dataReceived("1577654091,20.60,43.30\n");
          dataReceived("1577655091,19.60,42.30\n");
          dataReceived("1577663091,nan,nan\n");
          dataReceived("1577853091,22.60,40.30\n");
          dataReceived("##\n");
        })
      } else if (i === "1") {
        setTimeout(function() {
          dataReceived("Time,Temp(C),Humidity(%)\n");
          dataReceived("##\n");
        });
      } else if (i === "2") {
        setTimeout(function() {
          dataReceived("1577853091,22.60,40.30\n");
          dataReceived("##\n");
        });
      }
    };   
  }

  function connectSuccess() {
    console.log("connect success");
    $(".connected").show();
    $(".notconnected").hide();
    if (!!window.cordova) { 
      bluetoothSerial.subscribe('\n', dataReceived, dataFailure);
    }
  }

  function connectFailed() {
    console.log("bluetooth connect failed");
    alert("connect failed");
  }

  function writeSuccess() {
    console.log("Write success");
  }

  function writeFailure() {
    console.log("Write failure");
  }

  $("#get-data").click(function() {
    console.log("get-data");
    expectData(function(data) {
      console.log("Received: ", data);
      $(".output").html(data.replace(/\n/g, "<br>"));
    });
    send("0");
  });

  $("#get-names").click(function() {
    console.log("get-data");
    expectData(function(data) {
      console.log("Received: ", data);
      $(".output").html(data.replace(/\n/g, "<br>"));
    });
    send("1");
  });

  $("#get-current-values").click(function() {
    console.log("get-data");
    expectData(function(data) {
      console.log("Received: ", data);
      $(".output").html(data.replace(/\n/g, "<br>"));
    });
    send("2");
  });


  $("#disconnect").click(function() {
    if (!!window.cordova) {
      console.log("bluetooth disconnect");
      bluetoothSerial.unsubscribe();
      bluetoothSerial.disconnect();
    };
    $(".connected").hide();
    $(".notconnected").show();
    $("#connectionlist").html("");
  });

  function startConnection(id) {
    console.log("starting connection", id);
    if (!!window.cordova) {
      console.log("bluetooth connect");
      var throbber = createThrobber("body", 0)
      bluetoothSerial.connect(id, function() { 
        throbber.close();
        connectSuccess(); 
      }, function() { 
        throbber.close();
        connectFailed();
      });
    } else {
      var throbber = createThrobber("body", 0)
      setTimeout(function() {
        throbber.close();        
        connectSuccess();
      }, 200);
    }
  }
  function connectionsloaded(connections) {
    console.log("loading connections");
    $("#connectionlist").html("");
    var connectionlist = $("#connectionlist");
     for (var i=0 ; i < connections.length ; ++i) {
       var connection = connections[i];
       console.log("Adding connection:", connection.name);
       $(document.createElement("div"))
         .addClass("connection")
         .html(connection.name)
         .attr("uid", connection.address)
         .appendTo(connectionlist)
         .click(function() {
           var elem = $(this);
           var id = elem.attr("uid");
           startConnection(id);
         });
     }
  }

  function connectionsfailure() {
    alert("could not get list");
  }

  function enableButtonPressFeedback(selector) {
    $(document).on("touchstart mousedown", selector, function () {
      $(this).addClass("pressed");
    });
    $(document).on("touchend touchcancel mouseout mouseup", selector, function () {
      $(this).removeClass("pressed");
    });
  }

  enableButtonPressFeedback();
  function initialize() {
    console.log("initializing");
    if (!!window.cordova) {
      $("#listconnections").click(function() {
        bluetoothSerial.list(connectionsloaded, connectionsfailure);
      });

    } else {
      $("#listconnections").click(function() {
        console.log("list connections clicked");
        connectionsloaded([{
          "class": 276,
          "id": "10:BF:48:CB:00:00",
          "address": "10:BF:48:CB:00:00",
          "name": "fake-connection-1"
        }, {
          "class": 7936,
          "id": "00:06:66:4D:00:00",
          "address": "00:06:66:4D:00:00",
          "name": "fake-connection-2"
        }]);
        $(".testmode").show();
      });
    }

    enableButtonPressFeedback(".button, .connection");
  }

  initialize();
});
