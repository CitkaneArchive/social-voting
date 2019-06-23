/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
const zmq = require('zeromq');
const config = require('config');

const network = config.get('network');
const serverErrorMsg = {
    status: 500,
    message: 'internal server error'
};

const events = {};
const subscriber = zmq.socket('sub');
const subscriberUrl = `tcp://${network.pubsub.host}:${network.pubsub.port}`;

subscriber.on('message', (topic, message) => {
    const t = topic.toString();
    if (!events[t] || typeof events[t] !== 'function') return;
    let payload;
    try {
        payload = JSON.parse(message.toString());
    } catch (err) {
        payload = message.toString();
    } finally {
        /**
         * @callback Sockets~eventCallback
         * @param {any} [payload] - the event data payload.
         */
        events[t](payload);
    }
});
subscriber.connect(subscriberUrl);
console.log('zmq subscriber:', subscriberUrl);

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

        this.publisher.bindSync(publisher);
        console.log('zmq publisher: ', publisher);
        this.responder.bindSync(responder);
        console.log('zmq responder:', responder);
    }

    /**
     * Respond with a generic error {@link response}
     * @param {blob} indentity - The zmq identifier blob passed from the request
     * @param {string} [err] - a message to log on the server side.
     * */
    throwError(identity, err) {
        console.error(new Error(err));
        this.responder.send([identity, '', JSON.stringify(serverErrorMsg)]);
    }

    /**
     * **Publish to the pubsubProxy**
     * @param {string} topic - the topic to publish to.
     * @param {any} [data] - The data to publish to the topic.
     * */
    publish(topic, data) {
        try {
            const m = JSON.stringify([topic, JSON.stringify(data)]);
            this.publisher.send(m);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * **Subscribe to  a topic**
     * @param {string} topic - The topic to subscribe to.
     * @param {Sockets~eventCallback} callback - The callback action to a subscription event.
     * */
    on(topic, callback) {
        if (!events[topic]) subscriber.subscribe(topic);
        events[topic] = callback;
    }

    /**
     * **Unsubscribe from a topic**
     * @param {string} topic - The topic to unsubscribe from.
     * */
    off(topic) {
        delete events[topic];
        subscriber.unsubscribe(topic);
    }

    /**
     * Create the zmq interface for request/response
     * @param {module:voting.apiInterface} apiInterface - The public interface to the Api
     * */
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
