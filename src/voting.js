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
    'voting-voted'
];
api.publish('bff.makesubscriptions', bffSubscriptions);

const apiInterface = {
    create: {
    },
    read: {
        bffSubscriptions: () => api.resolve(200, bffSubscriptions),

        votes: request => voting.getVotesForEntity(request.args[0], request.ownerId)
    },
    update: {
        vote: request => voting.setVote(request.args[0], request.args[1], request.ownerId)
            .then((response) => {
                api.publish('voting-voted', response.payload);
                return response;
            })
    },
    delete: {
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
