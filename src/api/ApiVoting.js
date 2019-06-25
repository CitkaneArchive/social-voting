
const Api = require('../templates/Api');

let api;
class ApiVoting extends Api {
    constructor(sockets, baseApi) {
        super(sockets, 'voting');
        api = baseApi;
    }

    setVote(targetId, dir, ownerId) {
        if (!targetId || !dir || !ownerId || (dir !== '+' && dir !== '-')) return api.reject(400, 'bad api call');
        const { voting } = this.cache;
        const update = { ...voting };
        try {
            if (!update[targetId]) update[targetId] = {};
            if (update[targetId][ownerId]) {
                if (update[targetId][ownerId] === dir) return api.reject(403, 'Cannot vote twice');
                delete update[targetId][ownerId];
            } else {
                update[targetId][ownerId] = dir;
            }
            this.save(update);
            this.cache.voting = update;
            return api.resolve(200, targetId);
        } catch (err) {
            return api.reject(500, err.message);
        }
    }

    getVotesForEntity(entityId, ownerId) {
        if (!entityId || !ownerId) return api.reject(400, 'bad api call');
        const { voting } = this.cache;
        let total = 0;
        if (!voting[entityId]) return api.resolve(200, { total, voted: false });
        Object.keys(voting[entityId]).forEach((vote) => {
            if (voting[entityId][vote] === '+') total += 1;
            if (voting[entityId][vote] === '-') total -= 1;
        });
        return api.resolve(200, { total, voted: voting[entityId][ownerId] || false });
    }

    deleteVote(entityId) {
        const { voting } = this.cache;
        if (!entityId || !voting[entityId]) return;
        const update = { ...voting };
        try {
            delete update[entityId];
            this.save(update);
            this.cache.voting = update;
        } catch (err) {
            console.error(err);
        }
    }
}

module.exports = ApiVoting;
