const CMD_GET_DATA="0";
const CMD_GET_NAMES="1";
const CMD_GET_CURRENT_VALUES="2";

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
      if (expectCB) {
        console.log("data done, sending");
        var cb = expectCB;
        expectCB = null;
        cb(output);
      } else {
        console.log("data done, no cb");
        output = "";
      }
    } else {
      output += str;
      $(".output").html(packets + " " + str.length);
    }
  }

  function dataFailure() {
    console.log("Error with data subscription");
  }

  function executeBTCommand(i) {
    var deferred = $.Deferred();
    expectData(function(data) {
      deferred.resolve(data);
    });
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
    return deferred;

  }

  function connectSuccess() {
    console.log("connect success");
    $(".connected").show();
    $(".notconnected").hide();
    if (!!window.cordova) { 
      bluetoothSerial.subscribe('\n', dataReceived, dataFailure);
    }
    getCurrentValues();
  }

  function connectFailed() {
    console.log("bluetooth connect failed");
    alert("connect failed");
    disconnect();
  }

  function writeSuccess() {
    console.log("Write success");
  }

  function writeFailure() {
    console.log("Write failure");
  }

  function processValue(nr, value) {
    if (nr !== 0) {
      return value;
    }
    var newDate = new Date();
    newDate.setTime(parseInt(value)*1000);
    return newDate.toUTCString();
  }

  function getAllValues() {
    console.log("get-current_values");
    executeBTCommand(CMD_GET_NAMES)
      .then(function(names) { 
        console.log("Received names: ", names);
        executeBTCommand(CMD_GET_DATA)
          .then(function(data) {
            console.log("Received data: ", data);            
            var namelist = names.split(",");
            var datarows = data.split("\n");
             
            $(".output").empty();

            var table = $(document.createElement("table"))
              .appendTo($(".output"));

            var headers = $(document.createElement("tr"))
              .appendTo(table);

            for (var i=0 ; i < namelist.length ; ++i) {
              $(document.createElement("th"))
                .text(namelist[i])
                .appendTo(headers);
            }

            for (var i=datarows.length-1 ; i > 0 ; --i) {
              var valuelist = datarows[i].split(",");
              if (valuelist.length != namelist.length) {
                continue;
             }
              var row = $(document.createElement("tr"))
                .appendTo(table);
              for (var j=0; j < valuelist.length ; ++j) {
                $(document.createElement("td"))
                  .text(processValue(j, valuelist[j]))
                  .appendTo(row);
              }              
            }
          });
      });               
  }

  $("#get-data").click(getAllValues);

  function getCurrentValues() {
    console.log("get-current_values");
    executeBTCommand(CMD_GET_NAMES)
      .then(function(names) { 
        console.log("Received names: ", names);
        executeBTCommand(CMD_GET_CURRENT_VALUES)
          .then(function(values) {
            console.log("Received values: ", values);
            var namelist = names.split(",");
            var valuelist = values.split(",");
            $(".output").empty();
            
            console.log(namelist);
            console.log(valuelist);

            var table = $(document.createElement("table"))
              .appendTo($(".output"));

            for (var i=0; i < namelist.length ; ++i) {
              console.log("adding row");
              var row = $(document.createElement("tr"))
                .appendTo(table);
              var name = $(document.createElement("td"))
                .text(namelist[i])
                .appendTo(row);
              var value = $(document.createElement("td"))
                .text(processValue(i, valuelist[i]))
                .appendTo(row);
            }
          });
      });               
  }
  $("#get-current-values").click(getCurrentValues);


  function disconnect() {
    if (!!window.cordova) {
      console.log("bluetooth disconnect");
      bluetoothSerial.unsubscribe();
      bluetoothSerial.disconnect();
    };
    $(".connected").hide();
    $(".notconnected").show();
    $("#connectionlist").html("");
    $(".output").empty();
  }

  $("#disconnect").click(disconnect);

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
