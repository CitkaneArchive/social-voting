/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable func-names */
/* eslint-disable class-methods-use-this */

const zmq = require('zeromq');
const config = require('config');

const network = config.get('network');
const serverTimeout = 2000;
const serverTimeoutMsg = {
    status: 408,
    message: 'Server timed out for request'
};
const serverErrorMsg = {
    status: 500,
    message: 'internal server error'
};
const malformedErrorMsg = {
    status: 400,
    message: 'malformed api call'
};

function makeMessage(ownerId, action, command, args = []) {
    let thisArgs = args;
    if (!Array.isArray(thisArgs)) thisArgs = [thisArgs];
    return JSON.stringify({
        ownerId,
        action,
        command,
        args: thisArgs
    });
}

function GetReqSocket(type) {
    this.type = type;
    this.socket = zmq.socket('req');
}

GetReqSocket.prototype.send = function (ownerId, action, command, args) {
    const message = makeMessage(ownerId, action, command, args);
    return this.proxy(message);
};

GetReqSocket.prototype.proxy = function (message) {
    let mess = message;
    if (typeof mess === 'object') mess = JSON.stringify(mess);
    return new Promise((resolve, reject) => {
        const socket = zmq.socket('req');
        socket.connect(`tcp://${network[this.type].host}:${network[this.type].crud}`);
        socket.send(mess);
        const timer = setTimeout(() => {
            socket.close();
            reject(serverTimeoutMsg);
        }, serverTimeout);
        socket.on('message', (msg) => {
            try {
                const m = JSON.parse(msg.toString());
                resolve(m);
            } catch (err) {
                console.log(err);
                reject(serverErrorMsg);
            } finally {
                clearTimeout(timer);
                socket.close();
            }
        });
    });
};

class BaseApi {
    constructor(sockets) {
        this.builder = (action, path, args = [], ownerId) => {
            let thisArgs = args;
            const route = path.split('.');
            if (route.length !== 2) return this.reject();
            const type = route[0];
            const command = route[1];
            if (!Array.isArray(thisArgs)) thisArgs = [thisArgs];
            const req = this.getReqSocket(type);
            return req.send(ownerId, action, command, args);
        };
        this.api = {
            create: (path, args, ownerId = null) => this.builder('create', path, args || [], ownerId),
            read: (path, args, ownerId = null) => this.builder('read', path, args || [], ownerId),
            update: (path, args, ownerId = null) => this.builder('update', path, args || [], ownerId),
            delete: (path, args, ownerId = null) => this.builder('delete', path, args || [], ownerId)
        };
        /** @namespace module:voting.pubsub */
        this.sockets = sockets;
        /**
         * Publish a payload to a topic for all subscribed microservices.
         * @method module:voting.pubsub#publish
         * @param {String} topic - The topic to publish.
         * @param {any} data - the payload to publish to the topic.
         */
        this.publish = function (...args) { return sockets.publish(args); };
        /**
         * Subscribe to a topic.
         * @method module:voting.pubsub#subscribe
         * @param {String} topic - The topic to subscribe to.
         */
        this.subscribe = function (...args) { return sockets.subscribe(args); };
        /**
         * Unsubscribe from a topic.
         * @method module:voting.pubsub#unsubscribe
         * @param {String} topic - The topic to unsubscribe from.
         */
        this.unsubscribe = function (...args) { return sockets.unsubscribe(args); };
        /**
         * @method module:voting.pubsub#on
         * @param {String} topic - The topic to subscribe to;
         * @param {Function} callBack - The function to call when a subscribed topic is recieved.
         * @example
         * api.on('myTopic', (data) => {...});
         */
        this.on = function (...args) { return sockets.subscriber.on(args); };
    }

    getReqSocket(type) {
        return new GetReqSocket(type);
    }

    reject(status, message = 'error') {
        if (!status || typeof status !== 'number') return Promise.reject(malformedErrorMsg);
        return Promise.reject({ status, message });
    }

    resolve(status, payload = false) {
        if (!status || typeof status !== 'number') return this.reject();
        return Promise.resolve({ status, payload });
    }

    checkStatus(response) {
        if (!response.status || typeof response.status !== 'number') return this.reject();
        if (response.status > 199 && response.status < 300) return response;
        return Promise.reject(response);
    }
}

module.exports = BaseApi;
