const path = require('path');
// eslint-disable-next-line no-underscore-dangle
global.__rootDir = path.join(__dirname, '../');

const Sockets = require('./templates/Sockets');
const ApiVoting = require('./api/ApiVoting');

const sockets = new Sockets('voting');
const api = new ApiVoting(sockets);
const bffSubscriptions = [
    'voting-voted'
];
sockets.publish('bff.makesubscriptions', bffSubscriptions);

const apiInterface = {
    create: {
    },
    read: {
        bffSubscriptions: () => api.resolve(200, bffSubscriptions),

        votes: request => api.getVotesForEntity(request.args[0], request.ownerId)
    },
    update: {
        vote: request => api.setVote(request.args[0], request.args[1], request.ownerId)
            .then((response) => {
                api.sockets.publish('voting-voted', response.payload);
                return response;
            })
    },
    delete: {
    }
};

sockets.makeResponder(apiInterface);
