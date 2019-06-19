/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
const zmq = require('zeromq');
const config = require('config');

const network = config.get('network');
const serverErrorMsg = {
    status: 500,
    message: 'internal server error'
};

class Sockets {
    /**
     * @classdesc Utilities to manage the zmq port bindings and socket types.
     * @param {String} serviceName -The name of the microservice. Corresponds to config keys.
     */
    constructor(serviceName) {
        this.publisher = zmq.socket('push');
        this.responder = zmq.socket('router');
        this.subscriber = zmq.socket('sub');
        const publisher = `tcp://${network[serviceName].host}:${network[serviceName].publish}`;
        const responder = `tcp://${network[serviceName].host}:${network[serviceName].crud}`;
        const subscriber = `tcp://${network.pubsub.host}:${network.pubsub.port}`;
        console.log('zmq publisher: ', publisher);
        console.log('zmq responder:', responder);
        console.log('zmq subscriber:', subscriber);

        this.publisher.bindSync(publisher);
        this.responder.bindSync(responder);
        this.subscriber.connect(subscriber);
    }

    /** Respond with a generic error {@link response} */
    throwError(identity, err) {
        console.error(new Error(err));
        this.responder.send([identity, '', JSON.stringify(serverErrorMsg)]);
    }

    /** Publish to the pubsubProxy */
    publish(topic, data) {
        try {
            const m = JSON.stringify([topic, JSON.stringify(data)]);
            this.publisher.send(m);
        } catch (err) {
            console.error(err);
        }
    }

    /** Subscribe to  a topic */
    subscribe(topic) {
        this.subscriber.subscribe(topic);
    }

    /** Unsubscribe from a topic */
    unsubscribe(topic) {
        this.subscriber.unsubscribe(topic);
    }

    /** Create the interface for request/response and pub/sub */
    makeResponder(apiInterface) {
        this.responder.on('message', (...args) => {
            const identity = args[0];
            try {
                const request = JSON.parse(args[2].toString());
                if (
                    !apiInterface[request.action]
                    || !apiInterface[request.action][request.command]
                ) {
                    return this.throwError(identity, 'Malformed api call');
                }
                apiInterface[request.action][request.command](request)
                    .then((response) => {
                        this.responder.send([identity, '', JSON.stringify(response)]);
                    })
                    .catch((err) => {
                        this.responder.send([identity, '', JSON.stringify(err)]);
                    });
            } catch (err) {
                console.error(err);
                this.throwError(identity, err);
            }
            return null;
        });
    }
}

module.exports = Sockets;
