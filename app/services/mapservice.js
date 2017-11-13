import Ember from 'ember';

export default Ember.Service.extend({
  highlightCoordinates: [0, 0],

  fitBoundsOptions: {
    padding: 40,
    maxZoom: 16,
  },

  bounds: [],

  shouldFitBounds: false,
});
