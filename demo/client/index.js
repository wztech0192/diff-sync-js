var module = {
    exports: undefined
};

window.onload = function () {
    var $status = document.getElementById("status");
    var $name = document.getElementById("name");
    var $editors = document.getElementById("editors");
    var $textfield = document.getElementById("textfield");
    var $timeoutIndicator = document.getElementById("timeoutIndicator");
    var $timeoutDelayLabel = document.getElementById("timeoutDelayLabel");
    var $timeoutDelay = document.getElementById("timeoutDelay");

    const presetDelay = parseInt(localStorage.getItem("timeoutDelay"));
    if (!isNaN(presetDelay)) {
        $timeoutDelay.value = presetDelay;
        $timeoutDelayLabel.innerHTML = "Patch Delay: " + presetDelay + "ms";
    }

    var $mnLabel = document.getElementById("mnLabel");
    var $serverChance = document.getElementById("serverChance");
    var $clientChance = document.getElementById("clientChance");
    var $field = document.getElementById("field");
    var $auto = document.getElementById("auto");

    var diffSync = new module.exports({
        jsonpatch,
        thisVersion: "n",
        senderVersion: "m",
        useBackup: true,
        debug: true
    });

    $timeoutDelay.oninput = function () {
        localStorage.setItem("timeoutDelay", this.value);
        $timeoutDelayLabel.innerHTML = "Patch Delay: " + this.value + "ms";
    };

    $name.value = localStorage.getItem("name");

    function connectSocket() {
        var container = {};

        // Create WebSocket connection.
        const url = window.location.hostname.includes("wztechs") ? "ws://142.11.215.231:42998" : "ws://localhost:42998";
        var socket = new WebSocket(url);
        // Connection opened
        socket.addEventListener("open", function (event) {
            $status.innerHTML = "ONLINE";
            $field.disabled = false;
            send({
                type: "JOIN",
                payload: {
                    name: $name.value
                }
            });
        });

        // Connection closed
        socket.addEventListener("close", function (event) {
            $status.innerHTML = "OFFLINE";
            $field.disabled = true;

            setTimeout(() => {
                //reconnect
                connectSocket();
            }, 5000);
        });
        socket.addEventListener("error", function (event) {});

        // Listen for messages
        socket.addEventListener("message", function (event) {
            var { type, payload } = JSON.parse(event.data);

            //console.log(type, payload);
            switch (type) {
                case "JOIN":
                    $editors.innerHTML = payload.names;
                    setText(payload.shadow.value);
                    diffSync.initObject(container, payload.shadow.value);
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
                case "ACK":
                    console.log("RECEIVE ACK:", payload.n);
                    diffSync.onAck(container, payload);
                    break;
                case "PATCH":
                    console.log("RECEIVE: ", payload);

                    diffSync.onReceive({
                        payload,
                        container,
                        onUpdateShadow(shadow, operations) {
                            return diffSync.strPatch(shadow.value, operations);
                        },
                        onUpdateMain(patches, operations) {
                            if (patches.length > 0) {
                                let text = diffSync.strPatch($textfield.value, operations);
                                //update main copy
                                setText(text);
                            }
                            updateMNLabel();
                        },
                        afterUpdate() {
                            diffSync.onSend({
                                container: container,
                                mainText: $textfield.value,
                                whenSend(m, edits) {
                                    console.log("SEND PATCH AFTER UPDATE", m, payload);
                                    send({
                                        type: "PATCH",
                                        payload: {
                                            m,
                                            edits
                                        }
                                    });
                                },
                                whenUnchange(m) {
                                    send({
                                        type: "ACK",
                                        payload: {
                                            m
                                        }
                                    });
                                }
                            });
                        }
                    });

                    break;
            }
        });

        $name.onchange = function () {
            var name = this.value;
            localStorage.setItem("name", name);
            send({
                type: "EDITORS",
                payload: {
                    name: name
                }
            });
        };

        var interval = null;
        $auto.onchange = function () {
            var i = 0;
            if (interval) {
                clearInterval(interval);
                interval = null;
                i = 0;
            } else {
                interval = setInterval(() => {
                    $textfield.value = $textfield.value + i++ + ",";
                    sendPatch($textfield.value);
                }, 300);
            }
        };

        function onChanceChange() {
            send({
                type: "SET_CHANCE",
                payload: {
                    name: this.getAttribute("name"),
                    value: this.value
                }
            });
        }
        $serverChance.onchange = onChanceChange;
        $clientChance.onchange = onChanceChange;

        function updateMNLabel() {
            const shadow = container.shadow;
            $mnLabel.innerHTML = `N:${shadow.n} M:${shadow.m}`;
        }

        function send(data) {
            socket.send(JSON.stringify(data));
        }

        function setText(val) {
            var sel = getInputSelection($textfield);
            var textVal = $textfield.value;
            var isFrontChange = val.substring(0, sel.start) !== textVal.substring(0, sel.start);
            if (isFrontChange) {
                var charDiff = textVal.length - val.length;
                sel.start -= charDiff;
                sel.end -= charDiff;
            }
            $textfield.value = val;
            setInputSelection($textfield, sel.start, sel.end);
        }

        //DIFFER SYNC
        var timeout = null;
        function processSend(value) {
            clearTimeout(timeout);

            var delay = parseInt($timeoutDelay.value);

            if (delay > 0) {
                $timeoutIndicator.innerHTML = "Processing...";
                timeout = setTimeout(() => {
                    $timeoutIndicator.innerHTML = "Sent!";
                    sendPatch(value);
                }, delay);
            } else {
                sendPatch(value);
            }
        }

        $textfield.onpaste = $textfield.oncut = function (e) {
            processSend(this.value);
        };

        $textfield.onkeyup = function (e) {
            if (e.type === "keyup") {
                processSend(this.value);
            }
        };

        function sendPatch(text) {
            diffSync.onSend({
                container,
                mainText: text,
                whenSend(m, edits) {
                    updateMNLabel();
                    const payload = {
                        m,
                        edits
                    };
                    console.log("SEND: ", payload);

                    send({
                        type: "PATCH",
                        payload
                    });
                }
            });
        }
    }
    connectSocket();
};
