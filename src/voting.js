/** @module voting */
const path = require('path');
// eslint-disable-next-line no-underscore-dangle
global.__rootDir = path.join(__dirname, '../');

const Sockets = require('./templates/Sockets');
const BaseApi = require('./templates/BaseApi');
const ApiVoting = require('./api/ApiVoting');

const sockets = new Sockets('voting');
const { api } = new BaseApi(sockets);
const voting = new ApiVoting(sockets, api);
const bffSubscriptions = [
    'voting/voted'
];
api.publish('bff/makesubscriptions', bffSubscriptions);
/**
 * Publishes a list of topics for the bff to subscribe to
 * @event module:voting.bff/makesubscriptions
 * @type {Object[]}
 */
/**
 * Publishes the uid of the entity that has been voted on.
 * @event module:voting.voting/voted
 * @type {string}
 */

/**
  * Event listeners for voting module
  * @namespace module:voting.listening
  */
/**
  * Deletes voting for a given entity.
  * @method module:voting.listening#voting/delete
  * @param {string} entityId - the uid of the entity for which votes are to be deleted.
  * @listens voting/delete
  */
api.on('voting/delete', (entityId) => {
    voting.deleteVote(entityId);
});

const apiInterface = {
    /**
     * @interface
     * @memberof module:voting
     * @example <caption>Called from external microservice</caption>
     * api.read('voting.<method>', parameter || [parameters], {@link ownerId})
     * */
    read: {
        /**
         * provides a list of topics for the frontend/bff to subscribe to
         * @method module:voting.read#bffSubscriptions
         * @param {request} request - the standard request wrapper
         * @param {Object[]} request.params - an empty array
         * @param {ownerId} request.ownerId -The uid of the entity making the call.
         * @example {@link module:api}.read('voting.bffSubscriptions', [], {@link ownerId});
         * @returns {(response|response-error)} 200:{Object[string]} an array of topics.
         */
        bffSubscriptions: () => api.resolve(200, bffSubscriptions),
        /**
         * provides the votes for a given entity
         * @method module:voting.read#votes
         * @param {request} request - the standard request wrapper
         * @param {string} request.params - the uid of the entity votes are being requested for.
         * @param {ownerId} request.ownerId -The uid of the entity making the call.
         * @example {@link module:api}.read('voting.votes', 'uid123', {@link ownerId});
         * @returns {(response|response-error)} 200:{@link module:voting#vote} a vote object.
         */
        votes: request => voting.getVotesForEntity(request.args[0], request.ownerId)
    },
    /**
     * @interface
     * @memberof module:voting
     * @example <caption>Called from external microservice</caption>
     * api.update('voting.<method>', parameter || [parameters], {@link ownerId})
     * */
    update: {
        /**
         * casts votes for a given entity
         * @method module:voting.update#vote
         * @param {request} request - the standard request wrapper
         * @param {Object[]} request.params - an array of request parameters.
         * @param {string} request.params.targetId - the uid of the entity that is being voted for.
         * @param {string} request.params.dir - the direction of the vote ('+' or '-')
         * @param {ownerId} request.ownerId -The uid of the entity making the call.
         * @example {@link module:api}.update('voting.vote', ['uid123', '+'], {@link ownerId});
         * @emits module:voting.voting/voted
         */
        vote: request => voting.setVote(request.args[0], request.args[1], request.ownerId)
            .then((response) => {
                api.publish('voting/voted', response.payload);
                return response;
            })
    }
};

sockets.makeResponder(apiInterface);

function gracefulShutdown() {
    console.log('Gracefully shutting down social-voting');
    process.exit();
}
module.exports = {
    apiInterface,
    api,
    sockets,
    gracefulShutdown
};
