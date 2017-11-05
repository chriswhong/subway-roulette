import { module } from 'qunit';
import Ember from 'ember';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';

const { RSVP: { resolve } } = Ember;

export default function(name, options = {}) {
  module(name, {
    beforeEach() {
      this.application = startApp();

      if (options.beforeEach) {
        return options.beforeEach.apply(this, arguments); // eslint-disable-line
      }
      return null;
    },

    afterEach() {
      let afterEach = options.afterEach && options.afterEach.apply(this, arguments); // eslint-disable-line
      return resolve(afterEach).then(() => destroyApp(this.application));
    },
  });
}
