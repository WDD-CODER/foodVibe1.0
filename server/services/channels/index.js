'use strict';
/**
 * Plan 675 (C-CHANNEL): the only place that knows a channel by name. `channelFor(conversation)` returns the transport
 * `{ name, real, clientSource, send }` of `conversation.channel`; nothing else in the app compares a channel name.
 */
const { newId } = require('../../utils/id');
const { guestActor } = require('../../utils/actor');
const simChannel = require('./sim-channel');

const BUILT = { sim: simChannel };
const overrides = new Map();

/** Stand-in for a channel whose transport file is not built yet (WhatsApp until plan 683): never sends. */
function standIn(name) {
  return {
    name,
    real: true,
    clientSource: 'whatsapp',
    send: async () => ({ providerMessageId: 'none:' + newId(), status: 'failed' }),
  };
}

function channelFor(conversation) {
  const name = conversation && conversation.channel;
  if (overrides.has(name)) return overrides.get(name);
  return BUILT[name] || standIn(name);
}

function setChannelForTest(name, transport) {
  overrides.set(name, transport);
}

function resetChannelsForTest() {
  overrides.clear();
}

/** The `createdBy` of a client a real channel creates (a guest write, C-GUEST). */
const defaultActor = () => guestActor('whatsapp');

module.exports = { defaultActor, channelFor, setChannelForTest, resetChannelsForTest };
