import Ember from 'ember';

export default Ember.Route.extend({
  model() {
    return fetch('/data/nyc-subway-stops.geojson')
      .then(res => res.json());
  },
});
