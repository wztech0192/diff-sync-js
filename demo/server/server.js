/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var jsonpatch = require("fast-json-patch");
var WebSocket = require("ws");
var DiffSyncAlghorithm = require("../../src/index");
var wss = new WebSocket.Server({ port: 42998 });
console.clear();
var diffSync = new DiffSyncAlghorithm({
    jsonpatch: jsonpatch,
    thisVersion: "m",
    senderVersion: "n",
    useBackup: true,
    debug: true
});

var mainText = "";
var editors = [];

//used to simulate packet loss
var chance = {
    server: 1,
    client: 1
};

wss.on("connection", function (ws, req) {
    //diff sync container
    var container = {};
    ws.mdata = {
        container
    };

    //intiialize container
    diffSync.initObject(container, mainText);

    editors.push(ws);

    ws.on("message", function (json) {
        try {
            var data = JSON.parse(json);
            var { type, payload } = data;
            switch (type) {
                case "SET_CHANCE": {
                    chance[payload.name] = payload.value;
                    sendAll(
                        {
                            type: "SET_CHANCE",
                            payload: {
                                chance
                            }
                        },
                        [ws]
                    );
                    break;
                }
                case "ACK":
                    diffSync.onAck(container, payload);
                    break;
                case "PATCH": {
                    if (Math.random() >= 1 - chance.server) {
                        diffSync.onReceive({
                            payload,
                            container,
                            onUpdateShadow(shadow, operations) {
                                return diffSync.strPatch(shadow.value, operations);
                            },
                            onUpdateMain(patches, operations) {
                                mainText = diffSync.strPatch(mainText, operations);
                                console.log("main: ", mainText);
                            },
                            afterUpdate() {
                                editors.forEach(editor =>
                                    diffSync.onSend({
                                        container: editor.mdata.container,
                                        mainText: mainText,
                                        whenSend(n, edits) {
                                            if (Math.random() >= 1 - chance.client) {
                                                console.log("**to client:", payload);
                                                send(editor, {
                                                    type: "PATCH",
                                                    payload: {
                                                        n,
                                                        edits
                                                    }
                                                });
                                            }
                                        },
                                        whenUnchange(n) {
                                            if (ws === editor) {
                                                send(editor, {
                                                    type: "ACK",
                                                    payload: {
                                                        n
                                                    }
                                                });
                                            }
                                        }
                                    })
                                );
                            }
                        });
                    }
                    break;
                }
                case "JOIN":
                    ws.mdata.name = payload.name || "Anonymous";
                    send(ws, {
                        type: "JOIN",
                        payload: {
                            names: getNames(),
                            shadow: container.shadow,
                            chance
                        }
                    });
                    updateNames([ws]);
                    break;
                case "EDITORS":
                    ws.mdata.name = payload.name || "Anonymous";
                    updateNames();
                    break;
            }
        } catch (e) {
            console.log(e);
        }
    });

    //LEAVE
    ws.on("close", function (e) {
        editors = editors.filter(editor => editor !== ws);
        updateNames([ws]);
    });
});

function updateNames(excepts) {
    sendAll(
        {
            type: "UPDATE_NAMES",
            payload: {
                names: getNames()
            }
        },
        excepts
    );
}

function getNames() {
    return editors.map(editor => editor.mdata.name).join(", ");
}
function data2json(data) {
    return typeof data === "string" ? data : JSON.stringify(data);
}
function send(ws, data) {
    ws.send(data2json(data));
}

function sendAll(data, excepts = []) {
    var json = data2json(data);
    editors.forEach(editor => {
        if (!excepts.includes(editor)) {
            editor.send(json);
        }
    });
}
