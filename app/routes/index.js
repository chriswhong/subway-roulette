import Ember from 'ember';
import fetch from 'fetch';

export default Ember.Route.extend({
  model() {
    return fetch('data/nyc-subway-stops.geojson')
      .then(res => res.json());
  },
});
