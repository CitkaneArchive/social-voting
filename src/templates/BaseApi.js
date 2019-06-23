/* eslint-disable object-shorthand */
/**
 * The microservice API provides a common pattern to perform async functions across the domain.
 *
 * It is intended to remove the complexity of boilerplating, and allow funtions to be called as if they were native.
 *
 * This pattern should be preserved across all language templates.
 *
 * For common message envelope standards, please refer to:
 * {@link request}, {@link response}, {@link response-error}
 * @module api
 * @example
 * const Sockets = require('./templates/Sockets');
 * const BaseApi = require('./templates/BaseApi');
 * const sockets = new Sockets({@link serviceShortname});
 * const { api } = new BaseApi(sockets);
 * */
/** @namespace module:api.api/utils */
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

/**
 * Construct a new {@link request} object.
 * @memberof module:api/utils.api/utils
 * @param {reqPath} resource - of the form 'crud.function'.
 * @param {(any|Object[])} args - The arguments to pass to the request
 * @param {ownerId} ownerId - The uid of the entity making the call.
 * @returns {Promise} {@link request}
 * @example
 * api.makeRequestObject('read.user',[
 *  'userid',
 *  { withfriends: true }
 * ], ownerId)
 *  .then((requestObject) => {...});
 */
function makeRequestObject(resource, args = [], ownerId) {
    let thisArgs = args;
    if (!Array.isArray(thisArgs)) thisArgs = [thisArgs];
    return new Promise((resolve, reject) => {
        const split = resource.split('.');
        const action = split[0];
        const command = split[1];
        if (!action || !command) reject(malformedErrorMsg);
        resolve({
            ownerId,
            action,
            command,
            args: thisArgs
        });
    });
}

/**
 * @class
 * @memberof module:api.api/utils
 * @param {serviceShortname} type
 */
function GetReqSocket(type) {
    this.type = type;
    this.socket = zmq.socket('req');
}

GetReqSocket.prototype.send = async function (ownerId, action, command, args) {
    try {
        const request = makeRequestObject(ownerId, action, command, args);
        return this.proxy(request);
    } catch (err) {
        return err;
    }
};
/**
 * Creates a proxy to pass a {@link request} to another microservice
 * @alias module:api.api/utils#proxy
 * @param {request} request
 * @returns {Promise} {@link response} || {@link response-error}
 * @example
 * const request = api.makeRequestObject('delete.user', 'userIdAbc', ownerId);
 * const otherService = api.GetReqSocket('otherService');
 * otherService.proxy(request).then((response) => {...});
 */
GetReqSocket.prototype.proxy = function (request) {
    let mess = request;
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
            /**
             * **Create** for CRUD operations
             * @method module:api#create
             * @param {apiPath} path - The path of the service call.
             * @param {(any|Object[])} args - The arguments to pass to the request
             * @param {ownerId} ownerId - The uid of the entity making the call.
             * @returns {Promise} {@link response} || {@link response-error}
             * @example <caption>Calls the api of an external microservice:</caption>
             * api.create('service.function', ['foo', { bar: true }], {@link ownerId})
             *  .then((response) => {...})
             * */
            create: (path, args, ownerId = null) => this.builder('create', path, args || [], ownerId),
            /**
             * **Read** for CRUD operations
             * @method module:api#read
             * @param {apiPath} path - The path of the service call.
             * @param {(any|Object[])} args - The arguments to pass to the request
             * @param {ownerId} ownerId - The uid of the entity making the call.
             * @returns {Promise} {@link response} || {@link response-error}
             * @example <caption>Calls the api of an external microservice:</caption>
             * api.read('service.function', ['foo', { bar: true }], {@link ownerId})
             *  .then((response) => {...})
             * */
            read: (path, args, ownerId = null) => this.builder('read', path, args || [], ownerId),
            /**
             * **Update** for CRUD operations
             * @method module:api#update
             * @param {apiPath} path - The path of the service call.
             * @param {(any|Object[])} args - The arguments to pass to the request
             * @param {ownerId} ownerId - The uid of the entity making the call.
             * @returns {Promise} {@link response} || {@link response-error}
             * @example <caption>Calls the api of an external microservice:</caption>
             * api.update('service.function', ['foo', { bar: true }], {@link ownerId})
             *  .then((response) => {...})
             * */
            update: (path, args, ownerId = null) => this.builder('update', path, args || [], ownerId),
            /**
             * **Delete** for CRUD operations
             * @method module:api#delete
             * @param {apiPath} path - The path of the service call.
             * @param {(any|Object[])} args - The arguments to pass to the request
             * @param {ownerId} ownerId - The uid of the entity making the call.
             * @returns {Promise} {@link response} || {@link response-error}
             * @example <caption>Calls the api of an external microservice:</caption>
             * api.delete('service.function', ['foo', { bar: true }], {@link ownerId})
             *  .then((response) => {...})
             * */
            delete: (path, args, ownerId = null) => this.builder('delete', path, args || [], ownerId),
            /**
             * **Publish to a topic.**
             * @method module:api#publish
             * @param {String} topic - The topic to publish.
             * @param {any} [payload] - the payload to publish to the topic.
             * @example
             * api.publish('myTopic', <any data>);
             */
            publish: function (...args) { sockets.publish(...args); },
            /**
             * **Subsribe to a topic.**
             * @method module:api#on
             * @param {String} topic - The topic to subscribe to;
             * @param {Sockets~eventCallback} callBack - The function to call when a subscribed topic is received.
             * @example
             * api.on('myTopic', (data) => {...});
             */
            on: function (...args) { sockets.on(...args); },
            /**
             * **Unsubscribe from a topic.**
             * @method module:api#off
             * @param {String} topic - The topic to unsubscribe from.
             * @example
             * api.off('myTopic');
             */
            off: function (...args) { sockets.off(...args); },
            /**
             * @method module:api.api/utils#getReqSocket
             * @param {serviceShortname} type
             * @returns {module:api.api/utils.GetReqSocket} An instance of a request socket.
             */
            getReqSocket: function (type) {
                if (!type) return GetReqSocket;
                return new GetReqSocket(type);
            },

            /**
             * returns a {@link response-error} to a calling api.
             * @method module:api.api/utils#reject
             * @param {number} status - An http status code
             * @param {string} [message] - the message to include in the response
             * @returns {Promise} A promise rejection with a {@link response-error}.
             * @example
             * if (!thingFound) return api.reject(404, 'thing was not found');
             */
            reject: (status, message = 'error') => {
                if (!status || typeof status !== 'number') return Promise.reject(malformedErrorMsg);
                return Promise.reject({ status, message });
            },

            /**
             * returns a {@link response} to a calling api.
             * @method module:api.api/utils#resolve
             * @param {number} status - An http status code
             * @param {any} [payload] - the payload to include in the response
             * @returns {Promise} A promise resolver with a {@link response}.
             * @example
             * if (cache['theThing']) return api.resolve(200, cache['theThing']);
             */
            resolve: (status, payload = false) => {
                if (!status || typeof status !== 'number') return this.api.reject();
                return Promise.resolve({ status, payload });
            },
            makeRequestObject
        };

        this.sockets = sockets;
    }
}

module.exports = BaseApi;
