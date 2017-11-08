import Ember from 'ember';

export default Ember.Service.extend({
  highlightCoordinates: [0, 0],

  fitBoundsOptions: {
    padding: 40,
    maxZoom: 15,
  },

  bounds: [],

  shouldFitBounds: false,
});
