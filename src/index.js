module.exports = class DiffSyncAlghorithm {
    constructor(jsonpatch, thisVersion, senderVersion, ackLimit) {
        this.jsonpatch = jsonpatch;
        this.thisVersion = thisVersion;
        this.senderVersion = senderVersion;
        this.ackLimit = ackLimit;
    }

    initObject(container, mainText) {
        const { jsonpatch, thisVersion, senderVersion } = this;
        if (mainText !== null || mainText !== undefined) {
            container.shadow = {
                [thisVersion]: 0,
                [senderVersion]: 0,
                value: jsonpatch.deepClone(mainText),
                edits: [],
            };
            container.backup = {
                [thisVersion]: 0,
                [senderVersion]: 0,
                value: jsonpatch.deepClone(mainText),
            };
        } else {
            container.shadow = {};
            container.backup = {};
        }
    }

    /**
     * Payload: { [thisVersion], edits }
     */
    onReceive({ payload, shadow, backup, onUpdateMain, afterUpdate, onPatch }) {
        const { jsonpatch, thisVersion, senderVersion, ackLimit } = this;
        console.debug("****************");
        console.debug("--RECEIVED PAYLOAD --");
        console.debug(thisVersion + ": " + payload[thisVersion]);
        console.debug(senderVersion + ": ", payload.edits);
        console.debug("-- CURRENT SHADOW --");
        console.debug(shadow);

        //STEP 4: if the receive version does not match with the shadow version, try to find the match backup or drop the process.
        if (shadow[thisVersion] !== payload[thisVersion]) {
            if (backup[thisVersion] === payload[thisVersion]) {
                console.debug("-- REVERT --");
                console.debug(backup);
                //revert to backup
                shadow.value = json.deepClone(backup.value);
                shadow[thisVersion] = backup[thisVersion];
                shadow.edits = [];
            } else {
                console.debug("-- ** NOT MATCH, DROP THE PROCESS ** --");
                return;
            }
        }

        //generate patch that ignore old n

        var filteredEdits = payload.edits.filter((edit) => edit[senderVersion] >= shadow[senderVersion]);

        if (filteredEdits.length > 0) {
            var patches = filteredEdits.map((edit) => edit.patch);
            const patchOperations = [];
            for (let patch of patches) {
                if (patch.length > 0) {
                    for (let operation of patch) {
                        patchOperations.push(operation);
                    }
                    //STEP 5a, 5b: apply each patch to the shadow value
                    if (onPatch) {
                        onPatch(shadow, patch);
                    } else {
                        shadow.value = jsonpatch.applyPatch(shadow.value, patch);
                        //shadow.value = this.strPatch(shadow.value, patch);
                    }
                }
                //STEP 6: for each patch applied, increment senderVersion
                shadow[senderVersion]++;
            }

            //STEP 7: copy the shadow value and version over to the backup.
            backup[thisVersion] = shadow[thisVersion];
            backup[senderVersion] = shadow[senderVersion];
            //clear old edits
            this.clearOldEdits(shadow, payload[thisVersion]);

            if (patchOperations.length > 0) {
                backup.value = jsonpatch.deepClone(shadow.value);
                onUpdateMain(patches, patchOperations, shadow[thisVersion]);
            }

            console.debug("***RESULT****");
            console.debug("shadow: ", shadow);

            if (afterUpdate) {
                afterUpdate(payload.edits.length > ackLimit);
            }
            console.debug("**********");
        } else {
            console.debug("**XXX* not match " + senderVersion);
        }
    }

    onSend(shadow, mainText, whenSend) {
        const { jsonpatch, thisVersion, senderVersion } = this;
        //STEP 1a, 1b: generate diff
        var patch = jsonpatch.compare(shadow.value, mainText);
        if (patch.length > 0) {
            //STEP 2: push diff into edits stack
            shadow.edits.push({
                [thisVersion]: shadow[thisVersion],
                patch,
            });

            //STEP 3: copy main text over to the shadow and increment thisVersion
            shadow.value = jsonpatch.deepClone(mainText);
            shadow[thisVersion]++;

            whenSend(shadow[senderVersion], shadow.edits);
        }
    }

    clearOldEdits(shadow, version) {
        shadow.edits = shadow.edits.filter((edit) => edit[this.thisVersion] > version);
    }

    strPatch(val, patch) {
        return jsonpatch.applyPatch(val.split(""), patch).newDocument.join("");
    }
};

module.exports = (jsonpatch, thisVersion, senderVersion) => ({
    onReceive({ payload, shadow, backup, onUpdateMain, afterUpdate }) {
        console.debug("****************");
        console.debug("--RECEIVED PAYLOAD --");
        console.debug(thisVersion + ": " + payload[thisVersion]);
        console.debug(senderVersion + ": ", payload.edits);
        console.debug("-------------");

        console.debug("-- CURRENT SHADOW --");
        console.debug(shadow);
        console.debug("----");

        //4
        if (shadow[thisVersion] !== payload[thisVersion]) {
            if (backup[thisVersion] === payload[thisVersion]) {
                console.debug("-- REVERT --");
                console.debug(backup);
                //revert to backup
                shadow.value = backup.value;
                shadow[thisVersion] = backup[thisVersion];
                shadow.edits = [];
                console.debug("----");
            } else {
                console.debug("** not match " + thisVersion);
                return;
            }
        }

        //generate patch that ignore old n

        var filteredEdits = payload.edits.filter((edit) => edit[senderVersion] >= shadow[senderVersion]);

        //5a, 5b
        if (filteredEdits.length > 0) {
            var patches = filteredEdits.map((edit) => edit.patch);

            for (let patch of patches) {
                if (patch.length > 0) {
                    shadow.value = this.strPatch(shadow.value, patch);
                }
                //6
                shadow[senderVersion]++;
            }

            //backup
            //7
            backup.value = shadow.value;
            backup[thisVersion] = shadow[thisVersion];
            backup[senderVersion] = shadow[senderVersion];
            //clear old edits
            shadow.edits = shadow.edits.filter((edit) => edit[thisVersion] > payload[thisVersion]);

            onUpdateMain(patches);

            console.debug("***RESULT****");
            console.debug("shadow: ", shadow);

            if (afterUpdate) {
                afterUpdate();
            }
            console.debug("**********");
        } else {
            console.debug("**XXX* not match " + senderVersion);
        }
    },

    onSend(shadow, mainText, sendAnyway, whenSend) {
        //1a, 1b
        var patch = jsonpatch.compare(shadow.value, mainText);
        if (sendAnyway || patch.length > 0) {
            //2
            shadow.edits.push({
                [thisVersion]: shadow[thisVersion],
                patch,
            });

            //3
            shadow.value = mainText;
            shadow[thisVersion]++;

            var payload = {
                [senderVersion]: shadow[senderVersion],
                edits: shadow.edits,
            };

            whenSend(payload);
        }
    },

    strPatch(val, patch) {
        return this.jsonpatch.applyPatch(val.split(""), patch).newDocument.join("");
    },
});
