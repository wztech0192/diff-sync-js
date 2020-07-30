var $status = document.getElementById("status");
var $name = document.getElementById("name");
var $editors = document.getElementById("editors");
var $textfield = document.getElementById("textfield");
var $timeoutIndicator = document.getElementById("timeoutIndicator");
var $timeoutDelayLabel = document.getElementById("timeoutDelayLabel");
var $timeoutDelay = document.getElementById("timeoutDelay");
var $mnLabel = document.getElementById("mnLabel");
var $serverChance = document.getElementById("serverChance");
var $clientChance = document.getElementById("clientChance");
var $field = document.getElementById("field");
var $auto = document.getElementById("auto");

var diffSync = module.exports(jsonpatch, "n", "m");

var interval = null;
$auto.onchange = function () {
    var i = 0;
    if (interval) {
        clearInterval(interval);
        interval = null;
        i = 0;
    } else {
        interval = setInterval(() => {
            $textfield.value = $textfield.value + i++ + ", ";
            sendPatch($textfield.value);
        }, 2000);
    }
};

function onChanceChange() {
    send({
        action: "SET_CHANCE",
        payload: {
            name: this.getAttribute("name"),
            value: this.value,
        },
    });
}
$serverChance.onchange = onChanceChange;
$clientChance.onchange = onChanceChange;

$timeoutDelay.oninput = function () {
    $timeoutDelayLabel.innerHTML = "Patch Delay: " + this.value + "ms";
};

$name.value = localStorage.getItem("name");
$name.onchange = function () {
    var name = this.value;
    localStorage.setItem("name", name);
    send({
        action: "EDITORS",
        payload: {
            name: name,
        },
    });
};

var shadow = {
    n: 0,
    m: 0,
    value: "",
    edits: [],
};
var backup = {
    n: 0,
    value: "",
};

// Create WebSocket connection.
var socket = new WebSocket("ws://142.11.215.231:42998");

// Connection opened
socket.addEventListener("open", function (event) {
    $status.innerHTML = "ONLINE";
    $field.disabled = false;
    send({
        action: "JOIN",
        payload: {
            name: $name.value,
        },
    });
});

// Connection closed
socket.addEventListener("close", function (event) {
    $status.innerHTML = "OFFLINE";
    $field.disabled = true;
});
socket.addEventListener("error", function (event) {});

// Listen for messages
socket.addEventListener("message", function (event) {
    //   console.log(event.data);
    var { action, payload } = JSON.parse(event.data);

    console.log(action, payload);
    switch (action) {
        case "JOIN":
            $editors.innerHTML = payload.names;
            setText(payload.shadow.value);
            shadow = payload.shadow;
            backup = {
                ...shadow,
            };
            $serverChance.value = payload.chance.server;
            $clientChance.value = payload.chance.client;
            break;
        case "UPDATE_NAMES":
            $editors.innerHTML = payload.names;
            break;
        case "SET_CHANCE":
            $serverChance.value = payload.chance.server;
            $clientChance.value = payload.chance.client;
            break;
        case "PATCH":
            diffSync.onReceive({
                payload,
                shadow,
                backup,
                onUpdateMain: (patches) => {
                    console.log("patches", patches);
                    if (patches.length > 0) {
                        let text = $textfield.value;
                        for (let patch of patches) {
                            if (patch.length > 0) {
                                text = diffSync.strPatch(text, patch);
                            }
                        }
                        //update main copy
                        setText(text);
                    }
                    updateMNLabel();
                },
            });
            $timeoutIndicator.innerHTML = "Patched!";

            break;
    }
});

function updateMNLabel() {
    console.log("update", shadow);
    $mnLabel.innerHTML = `N:${shadow.n} M:${shadow.m}`;
}

function send(data) {
    socket.send(JSON.stringify(data));
}

function setText(val) {
    var sel = getInputSelection($textfield);
    $textfield.value = val;
    setInputSelection($textfield, sel.start, sel.end);
}

//DIFFER SYNC

var timeout = null;
$textfield.onkeyup = function () {
    clearTimeout(timeout);

    var delay = parseInt($timeoutDelay.value);

    if (delay > 0) {
        $timeoutIndicator.innerHTML = "Processing...";
        timeout = setTimeout(() => {
            sendPatch(this.value);
        }, delay);
    } else {
        sendPatch(this.value);
    }
};

function sendPatch(text) {
    diffSync.onSend(shadow, text, false, (payload) => {
        updateMNLabel();
        // console.log("**to client:", payload);
        console.log("send", payload);

        send({
            action: "PATCH",
            payload,
        });
    });
}
