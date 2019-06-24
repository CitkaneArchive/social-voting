/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable import/no-extraneous-dependencies */

const chai = require('chai');
const { sockets, gracefulShutdown } = require('../../src/voting');

const { expect } = chai;

describe('social-voting consumer', () => {
    after(() => {
        setTimeout(() => {
            gracefulShutdown();
        }, 1000);
    });

    it('is running in test environment', () => {
        expect(process.env.NODE_ENV).to.equal('test');
    });

    it('publishes a list of subscription topics to \'bff/makesubscriptions\'', () => {
        let lastMessage;
        let topic;
        let topics;
        try {
            [lastMessage] = sockets.publisher._outgoing.lastBatch.content;
            [topic, topics] = JSON.parse(lastMessage.toString());
            topics = JSON.parse(topics);
        } catch (err) {
            throw err;
        }
        expect(topic).to.equal('bff/makesubscriptions');
        expect(topics.length).to.equal(1);
    });
});
