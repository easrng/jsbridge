const RealWebSocket = WebSocket;                                                        // Stash reference to real Web Socket
let jsbridge = {};                                                                      // Make an empty object for us to use later 

class WebSocketLogger extends RealWebSocket {                                           // Make a class that wraps the web socket object
  constructor(...args) {
    super(...args);                                                                     // Initialize real WebSocket
    
    
    RealWebSocket.prototype.addEventListener.call(this, "message", (...e) => {          // When we receive a message
      try {
        let msg = JSON.parse(e[0].data);                                                // If it's for the jsbridge variable
        if (msg.name == "☁ jsbridge") {
          return;                                                                       // ignore it.
        }
      } catch (e) {}

      if (this._mh) this._mh(...e);                                                     // Otherwise, tell Scratch about it.
    });

    
    
    if (args[0].indexOf("clouddata.scratch.mit.edu") != -1) {                           // If this is for cloud data
      jsbridge.ws = this;                                                               // save a reference to it in the jsbridge object
    }
  }
  send(...args) {
    console.log("send", args);                                                          // When Scratch sends a message,
    try {
      let msg = JSON.parse(args[0]);
      if (msg.name == "☁ jsbridge") {                                                  // if it is to set the jsbridge value
        jsbridge._value = msg.value;                                                    // intercept it and set jsbridge.value
        return;                                                                         // and don't let it get to the cloud.
      }
    } catch (e) {}
    return RealWebSocket.prototype.send.call(this, ...args);                            // Otherwise, send the message.
  }

  set onmessage(val) {
    this._mh = val;                                                                     // Store Scratch's message handler for us to call.
  }
}
window.WebSocket = WebSocketLogger;                                                     // Make Scratch use our fake WebSocket

jsbridge.__defineSetter__("value", val => {                                             // When other scripts by someone else set jsbridge.value
  let me = new MessageEvent("message", {                                                // make a fake message event so Scratch to set the variable too,
    data: JSON.stringify({
      method: "set",
      project_id: window.location.pathname.split("/")[2],
      name: "☁ jsbridge",
      value: val
    })
  });
  if (jsbridge.ws._mh) jsbridge.ws._mh(me);                                              // and send the event to Scratch.
  jsbridge._value = val;
});

jsbridge.__defineGetter__("value", val => jsbridge._value);                              // When other scripts by someone else get jsbridge.value, give them the value.
