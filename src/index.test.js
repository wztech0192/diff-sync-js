import DiffSyncAlghorithm from "./index";
import jsonpatch from "fast-json-patch";
import faker from "faker";

class FakeDiffSyncEnv {
    mainText = "";

    receivers = [];

    shouldReceive = true;

    patchCount = 0;

    sendCount = 0;

    constructor(name, thisVersion, senderVersion) {
        this.name = name;

        this.thisVersion = thisVersion;

        this.senderVersion = senderVersion;
    }

    //get the receive who sent

    getReceiver(env) {
        return this.receivers.find(r => r.env === env);
    }

    update(mainText) {
        this.mainText = mainText;

        //send patch to all receivers

        this.receivers.forEach(({ diffSync, container, env }) =>
            diffSync.onSend({
                container: container,

                mainText: this.mainText,

                whenSend: (k, edits) => {
                    env.patch(this, {
                        [this.senderVersion]: k,

                        edits
                    });
                }
            })
        );
    }

    //send ack to the receiver

    ack(env, payload) {
        const myReceiver = this.getReceiver(env);

        if (myReceiver) {
            const { diffSync, container } = myReceiver;

            diffSync.onAck(container, payload);
        }
    }

    //patch the main copy

    patch(env, payload) {
        if (this.shouldReceive) {
            this.patchCount++;

            const myReceiver = this.getReceiver(env);

            if (myReceiver) {
                const { diffSync, container } = myReceiver;

                diffSync.onReceive({
                    payload,

                    container,

                    onUpdateShadow: (shadow, operations) => {
                        return diffSync.strPatch(shadow.value, operations);
                    },

                    onUpdateMain: (patches, operations) => {
                        this.mainText = diffSync.strPatch(this.mainText, operations);
                    },

                    afterUpdate: () => {
                        this.receivers.forEach(({ diffSync, container, env }) =>
                            diffSync.onSend({
                                container: container,

                                mainText: this.mainText,

                                whenSend: (k, edits) => {
                                    env.patch(this, {
                                        [this.senderVersion]: k,

                                        edits
                                    });
                                },

                                whenUnchange: k => {
                                    if (myReceiver.env === env) {
                                        env.ack(this, {
                                            [this.senderVersion]: k
                                        });
                                    }
                                }
                            })
                        );
                    }
                });
            }
        }
    }

    //join receivers

    join(diffSyncEnv) {
        const diffSync = new DiffSyncAlghorithm({
            jsonpatch: jsonpatch,

            thisVersion: this.thisVersion,

            senderVersion: this.senderVersion,

            useBackup: true
        });

        const container = {};

        diffSync.initObject(container, this.mainText);

        this.receivers.push({
            env: diffSyncEnv,

            container,

            diffSync
        });
    }
}

const setup = () => {
    const server = new FakeDiffSyncEnv("server", "m", "n");

    const client_a = new FakeDiffSyncEnv("client_a", "n", "m");

    const client_b = new FakeDiffSyncEnv("client_b", "n", "m");

    client_a.join(server);

    client_b.join(server);

    server.join(client_a);

    server.join(client_b);

    return { server, client_a, client_b };
};

describe("Symmetric differential synchronization test by simulate one server and two client. Ensure all main copies are synchronized.", () => {
    test("Fake envs setup correctly", () => {
        const { server, client_a, client_b } = setup();

        expect(server.receivers.map(r => r.env.name)).toEqual(["client_a", "client_b"]);

        expect(client_a.receivers.map(r => r.env.name)).toEqual(["server"]);

        expect(client_b.receivers.map(r => r.env.name)).toEqual(["server"]);
    });

    test("All main copies sync in a perfect network", () => {
        const { server, client_a, client_b } = setup();

        client_a.update("AxA");

        expect(server.mainText).toBe("AxA");

        expect(client_b.mainText).toBe("AxA");

        client_b.update("AxABxB");

        expect(server.mainText).toBe("AxABxB");

        expect(client_a.mainText).toBe("AxABxB");

        client_a.update("!AxABxB");

        expect(server.mainText).toBe("!AxABxB");

        expect(client_b.mainText).toBe("!AxABxB");

        client_b.update("!AxABxB!");

        expect(server.mainText).toBe("!AxABxB!");

        expect(client_a.mainText).toBe("!AxABxB!");
    });

    test("All main copies sync when the server have bad network", () => {
        const { server, client_a, client_b } = setup();

        server.shouldReceive = false;

        client_a.update("AxA");

        expect(server.mainText).toBe(""); //server did not receive client_a patch

        expect(client_b.mainText).toBe("");

        client_b.update("CxC");

        expect(server.mainText).toBe(""); //server did not receive client_a patch

        expect(client_a.mainText).toBe("AxA");

        server.shouldReceive = true;

        //client_a sync the server, server sync client_b, client_b send local update back to the server, then server update client_a

        client_a.update("AxABxB");

        expect(client_b.mainText).toBe("AxABxBCxC");

        expect(server.mainText).toBe("AxABxBCxC");

        expect(client_a.mainText).toBe("AxABxBCxC");

        expect(server.patchCount).toBe(2);

        client_b.update("AxACxC");

        expect(server.mainText).toBe("AxACxC");

        expect(client_a.mainText).toBe("AxACxC");

        expect(client_b.mainText).toBe("AxACxC");

        expect(server.patchCount).toBe(3);
    });

    test("All main copies sync when client B have bad network", () => {
        const { server, client_a, client_b } = setup();

        client_b.shouldReceive = false;

        client_a.update("AxA");

        expect(server.mainText).toBe("AxA");

        expect(client_b.mainText).toBe(""); //client_b did not receive server patch

        client_b.update("BxB");

        expect(server.mainText).toBe("BxBAxA"); //server append patch from client_b

        expect(client_a.mainText).toBe("BxBAxA");

        expect(client_b.mainText).toBe("BxB"); //client_b did not receive from server patch

        client_b.shouldReceive = true;

        client_b.update("CxCBxB");

        expect(server.mainText).toBe("CxCBxBAxA");

        expect(client_b.mainText).toBe("CxCBxBAxA"); //client_b did receive from server patch and synchronized

        expect(client_a.mainText).toBe("CxCBxBAxA");

        client_a.update("CxCBxBAxAZxZ");

        expect(server.mainText).toBe("CxCBxBAxAZxZ");

        expect(client_b.mainText).toBe("CxCBxBAxAZxZ");
    });

    test("All main copies sync when both clients have bad network", () => {
        const { server, client_a, client_b } = setup();

        client_a.shouldReceive = false;

        client_b.shouldReceive = false;

        client_a.update("AxA");

        expect(server.mainText).toBe("AxA"); //server receive patch from client_a

        expect(client_b.mainText).toBe(""); //client_b did not receive server patch

        expect(client_a.mainText).toBe("AxA");

        client_b.update("BxB");

        expect(server.mainText).toBe("BxBAxA"); //server append patch from client_b

        expect(client_a.mainText).toBe("AxA"); //client_b did not receive server patch

        expect(client_b.mainText).toBe("BxB"); //client_a did not receive from server patch

        client_b.shouldReceive = true;

        client_b.update("CxCBxB");

        expect(server.mainText).toBe("CxCBxBAxA");

        expect(client_b.mainText).toBe("CxCBxBAxA"); //client_b did receive from server patch and synchronized

        expect(client_a.mainText).toBe("AxA"); //client_a did not receive from server patch

        client_a.update("DxD");

        expect(server.mainText).toBe("DxDBxBAxA");

        expect(client_b.mainText).toBe("DxDBxBAxA"); //client_b did receive from server patch and synchronized

        expect(client_a.mainText).toBe("DxD"); //client_a did not receive from server patch

        client_a.shouldReceive = true;

        //client_b sync the server, server sync client_a

        client_b.update("DxDCxCBxBAxA");

        expect(server.mainText).toBe("DxDCxCBxBAxA");

        expect(client_a.mainText).toBe("DxDCxCBxBAxA");

        expect(client_b.mainText).toBe("DxDCxCBxBAxA");
    });

    test("high traffic synchronization in bad network of 4 clients", () => {
        const { server, client_a, client_b } = setup();

        const client_c = new FakeDiffSyncEnv("client_c", "n", "m");

        const client_d = new FakeDiffSyncEnv("client_d", "n", "m");

        client_c.join(server);

        client_d.join(server);

        server.join(client_c);

        server.join(client_d);

        const clients = [client_a, client_b, client_c, client_d];

        for (let i = 0; i < 30; i++) {
            //each env have 75% to receive patch

            for (let client of clients) {
                client.shouldReceive = Math.random() >= 0.75;
            }

            server.shouldReceive = Math.random() >= 0.75;

            //shuffle the client order

            clients.sort(() => (Math.random() > 0.5 ? 1 : -1));

            //random number from 1 to 4 of clients update

            for (let i = 0; i < Math.round(Math.random() * 3) + 1; i++) {
                clients[i].update(Math.random() >= 0.5 ? faker.random.words() : clients[i].mainText + faker.random.words());
            }
        }

        server.shouldReceive = true;

        for (let client of clients) {
            client.shouldReceive = true;
        }

        for (let client of clients) {
            client.update(client.mainText + 1);
        }

        for (let client of clients) {
            expect(client.mainText).toBe(server.mainText);
        }
    });
});
