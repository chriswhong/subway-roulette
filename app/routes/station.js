import Ember from 'ember';
import bbox from 'npm:@turf/bbox';

const { service } = Ember.inject;

export default Ember.Route.extend({
  mapservice: service(),

  model(params) {
    const stationsFC = this.modelFor('application');
    return stationsFC.features.find(d => d.properties.cartodb_id === parseInt(params.stationId, 10));
  },

  afterModel(model) {
    this.set('mapservice.bounds', bbox(model));
    this.set('mapservice.highlightCoordinates', model.geometry.coordinates);
    this.set('mapservice.shouldFitBounds', true);
  },
});
