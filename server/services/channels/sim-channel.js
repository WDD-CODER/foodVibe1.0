'use strict';
/** Plan 675 (C-CHANNEL): the simulator transport. It makes a local id and answers `delivered`; nothing else. */
const { newId } = require('../../utils/id');

module.exports = {
  name: 'sim',
  real: false,
  clientSource: 'manual',
  async send() {
    return { providerMessageId: 'sim:' + newId(), status: 'delivered' };
  },
};
