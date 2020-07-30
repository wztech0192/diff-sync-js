/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var jsonpatch = require("fast-json-patch");
var WebSocket = require("ws");
var getDiffSync = require("../../src/index");
var wss = new WebSocket.Server({ port: 42998 });
var text = "";

var diffSync = getDiffSync(jsonpatch, "m", "n");

var editors = [];
var chance = {
    server: 1,
    client: 1,
};

wss.on("connection", function (ws, req) {
    var shadow = {
        n: 0,
        m: 0,
        value: text,
        edits: [],
    };
    var backup = {
        ...shadow,
    };
    ws.mdata = {
        shadow: shadow,
    };
    editors.push(ws);

    ws.on("message", function (json) {
        try {
            var data = JSON.parse(json);
            var { action, payload } = data;
            console.log(data);
            switch (action) {
                case "SET_CHANCE": {
                    chance[payload.name] = payload.value;
                    sendAll(
                        {
                            action: "SET_CHANCE",
                            payload: {
                                chance,
                            },
                        },
                        [ws]
                    );
                    break;
                }
                case "PATCH": {
                    if (Math.random() >= 1 - chance.server) {
                        diffSync.onReceive({
                            payload,
                            shadow,
                            backup,
                            onUpdateMain: (patches) => {
                                for (let patch of patches) {
                                    if (patch.length > 0) {
                                        //update server copy
                                        text = diffSync.strPatch(text, patch);
                                    }
                                }
                                console.log("main: ", text);
                            },
                            afterUpdate: () => {
                                editors.forEach((editor) =>
                                    diffSync.onSend(editor.mdata.shadow, text, editor === ws, (payload) => {
                                        if (Math.random() >= 1 - chance.client) {
                                            console.log("Payload to: ", editor.mdata.name, payload);
                                            // console.log("**to client:", payload);
                                            send(editor, {
                                                action: "PATCH",
                                                payload,
                                            });
                                        }
                                    })
                                );
                            },
                        });
                    }
                    break;
                }
                case "JOIN":
                    ws.mdata.name = payload.name || "Anonymous";
                    send(ws, {
                        action: "JOIN",
                        payload: {
                            names: getNames(),
                            shadow: shadow,
                            chance,
                        },
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
        editors = editors.filter((editor) => editor !== ws);
        updateNames([ws]);
    });
});

function updateNames(excepts) {
    sendAll(
        {
            action: "UPDATE_NAMES",
            payload: {
                names: getNames(),
            },
        },
        excepts
    );
}

function getNames() {
    return editors.map((editor) => editor.mdata.name).join(", ");
}
function data2json(data) {
    return typeof data === "string" ? data : JSON.stringify(data);
}
function send(ws, data) {
    ws.send(data2json(data));
}

function sendAll(data, excepts = []) {
    var json = data2json(data);
    editors.forEach((editor) => {
        if (!excepts.includes(editor)) {
            editor.send(json);
        }
    });
}
