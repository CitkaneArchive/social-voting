/* global __rootDir */

const fs = require('fs-extra');
const path = require('path');
const BaseApi = require('./BaseApi');

const cache = {};

function save(location, payload) {
    return fs.writeJson(location, payload, { spaces: 4 });
}

class Api extends BaseApi {
    constructor(sockets, type = false, initialPayload = {}) {
        super(sockets);
        if (type) {
            const storePath = path.join(__rootDir, 'store');
            fs.ensureDirSync(storePath);
            this.cache = cache;
            this.storePath = storePath;
            const typeStorePath = path.join(this.storePath, type);
            const typeStore = path.join(typeStorePath, `${type}.json`);
            fs.ensureDirSync(typeStorePath);
            if (!fs.existsSync(typeStore)) {
                fs.writeJsonSync(typeStore, initialPayload, { spaces: 4 });
            }
            this.cache[type] = fs.readJsonSync(typeStore);
            this.save = payload => save(typeStore, payload);
        }
    }
}

module.exports = Api;
