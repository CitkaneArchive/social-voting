/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
const { MessageProviderPact } = require('@pact-foundation/pact');
const config = require('config');
const { expect } = require('chai');
const {
    apiInterface,
    gracefulShutdown
} = require('../../src/voting');
const { version } = require('../../package.json');

const LOG_LEVEL = process.env.LOG_LEVEL || 'WARN';
const pacts = config.get('pacts');
const pactBrokerUrl = `${pacts.broker}:${pacts.brokerPort}`;

function makePact(messageProviders) {
    return new MessageProviderPact({
        messageProviders,
        logLevel: LOG_LEVEL,
        provider: 'social-voting',
        providerVersion: version,
        pactBrokerUrl,
        publishVerificationResult: true
    });
}

describe('social-voting consumer expectations', async () => {
    const messageProviders = {};

    after(() => {
        setTimeout(() => { gracefulShutdown(); }, 1000);
    });
    describe('ENVIRONMENT', () => {
        it('is running in test environment', () => {
            expect(process.env.NODE_ENV).to.equal('test');
        });
    });
    describe('add consumer requirement contracts to pact', () => {
        describe('CRUD read', () => {
            it('read.bffSubscriptions', () => {
                messageProviders['voting.read.bffSubscriptions'] = async (message) => {
                    const request = message.providerStates[0].name;
                    try {
                        return await apiInterface.read.bffSubscriptions(request);
                    } catch (err) {
                        return err;
                    }
                };
            });
        });
    });
    describe('fulfills all contract requirements', () => {
        it('verify against broker', () => makePact(messageProviders).verify());
    });
});
