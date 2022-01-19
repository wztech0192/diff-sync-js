# diff-sync-js

A JavaScript implementation of Neil Fraser Differential Synchronization Algorithm

Diff Sync Writing: https://neil.fraser.name/writing/sync/

## Use Case

Differential synchronization algorithm keep two or more copies of the same document synchronized with each other in real-time. The algorithm offers scalability, fault-tolerance, and responsive collaborative editing across an unreliable network.

## Demo

http://wztechs.com/diff-sync-text-editor/demo/client/

## How to install

When use npm
`npm install diff-sync-js`

When use html
`<script src="./dist/diffSync.js"></script>`

## Dependencies

`json-fast-patch`

## To Test

`npm run test`

## How to use

1. Initial diffSync instance

```
    var diffSync = new DiffSyncAlghorithm({
        jsonpatch: jsonpatch,
        thisVersion: "m",
        senderVersion: "n",
        useBackup: true,
        debug: true
    });
```

2. Initialize container

```
    var container = {};
    diffSync.initObject(container, mainText);
```

3. When Send Payload

```
    diffSync.onSend({
        container,
        mainText,
        whenSend(senderVersion, edits) {
            send({
                type: "PATCH",
                {
                    senderVersion,
                    edits
                }
            });
        }
    });
```

4. When Receive Payload

```
    diffSync.onReceive({
        payload,
        container,
        onUpdateMain(patches, operations) {
            mainText = jsonpatch.applyPatch(mainText, operations).newDocument;
        },
        afterUpdate(senderVersion) {
            send({
                type: "ACK",
                payload: {
                    senderVersion
                }
            });
        }
    });
```

5. When Receive Ack

```
    diffSync.onAck(container, payload);
```

## API

constructor

```
     /**
     * @param {object} options.jsonpatch json-fast-patch library instance (REQUIRED)
     * @param {string} options.thisVersion version tag of the receiving end
     * @param {string} options.senderVersion version tag of the sending end
     * @param {boolean} options.useBackup indicate if use backup copy (DEFAULT true)
     * @param {boolean} options.debug indicate if print out debug message (DEFAULT false)
     */
    constructor({ jsonpatch, thisVersion, senderVersion, useBackup = true, debug = false })

```

initObject

```
    /**
     * Initialize the container
     * @param {object} container any
     * @param {object} mainText any
     */
    initObject(container, mainText)
```

onReceive

```
    /**
     * On Receive Packet
     * @param {object} options.payload payload object that contains {thisVersion, edits}. Edits should be a list of {senderVersion, patch}
     * @param {object} options.container container object {shadow, backup}
     * @param {func} options.onUpdateMain (patches, patchOperations, shadow[thisVersion]) => void
     * @param {func} options.afterUpdate (shadow[senderVersion]) => void
     * @param {func} options.onUpdateShadow (shadow, patch) => newShadowValue
     */
    onReceive({ payload, container, onUpdateMain, afterUpdate, onUpdateShadow })
```

onSend

```
    /**
     * On Sending Packet
     * @param {object} options.container container object {shadow, backup}
     * @param {object} options.mainText any
     * @param {func} options.whenSend (shadow[senderVersion], shadow.edits) => void
     * @param {func} options.whenUnchange (shadow[senderVersion]) => void
     */
    onSend({ container, mainText, whenSend, whenUnchange })

```

onAck

```
     /**
     * Acknowledge the other side when no change were made
     * @param {object} container container object {shadow, backup}
     * @param {object} payload payload object that contains {thisVersion, edits}. Edits should be a list of {senderVersion, patch}
     */
    onAck(container, payload)
```

onAck

```
    /**
     * Acknowledge the other side when no change were made
     * @param container container object {shadow, backup}
     * @param payload payload object that contains {thisVersion, edits}. Edits should be a list of {senderVersion, patch}
     */
    onAck(container, payload)
```

clearOldEdits

```
    /**
     * clear old edits
     * @param {object} shadow
     * @param {string} version
     */
    clearOldEdits(shadow, version)
```

strPatch

```
    /**
     * apply patch to string
     * @param {string} val
     * @param {patch} patch
     * @return string
     */
    strPatch(val, patch)
```
