
const Api = require('../templates/Api');

class ApiVoting extends Api {
    constructor(sockets) {
        super(sockets, 'voting');
    }

    setVote(targetId, dir, ownerId) {
        if (!targetId || !dir || !ownerId) return this.reject(400, 'bad api call');
        const { voting } = this.cache;
        const update = { ...voting };
        try {
            if (!update[targetId]) update[targetId] = {};
            if (update[targetId][ownerId]) {
                if (update[targetId][ownerId] === dir) return this.reject(403, 'Cannot vote twice');
                delete update[targetId][ownerId];
            } else {
                update[targetId][ownerId] = dir;
            }
            this.save(update);
            this.cache.voting = update;
            return this.resolve(200, targetId);
        } catch (err) {
            return this.reject(500, err.message);
        }
    }

    getVotesForEntity(entityId, ownerId) {
        if (!entityId || !ownerId) return this.reject(400, 'bad api call');
        const { voting } = this.cache;
        let total = 0;
        if (!voting[entityId]) return this.resolve(200, { total, voted: false });
        Object.keys(voting[entityId]).forEach((vote) => {
            if (voting[entityId][vote] === '+') total += 1;
            if (voting[entityId][vote] === '-') total -= 1;
        });
        return this.resolve(200, { total, voted: voting[entityId][ownerId] || false });
    }
}

module.exports = ApiVoting;
