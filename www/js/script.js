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

  function dataReceived(str) {
    $("#speed").html(str);
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
    };   
  }

  function connectSuccess() {
    console.log("connect success");
    $(".connected").show();
    $(".notconnected").hide();
    if (!!window.cordova) { 
      bluetoothSerial.subscribe('\n', dataReceived, dataFailure);
      send('5');
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

  $("#stop").click(function() {
    send("0");
  });

  $("#start").click(function() {
    send("1");
  });

  $("#faster").click(function() {
    send("2");
  });

  $("#slower").click(function() {
    send("3");
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
      }, 1000);
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
