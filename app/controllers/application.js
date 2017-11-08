import Ember from 'ember';

const { service } = Ember.inject;

export default Ember.Controller.extend({
  mapservice: service(),

  center: [-73.8949, 40.7169],

  zoom: 9.59,

  highlightedStationSource: Ember.computed('mapservice.highlightCoordinates', function() {
    const coordinates = this.get('mapservice.highlightCoordinates');
    return {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates,
        },
        properties: {},
      },
    };
  }),

  highlightedStationLayer: {
    id: 'highlighted-station',
    minzoom: 11,
    type: 'circle',
    paint: {
      'circle-color': 'steelblue',
      'circle-opacity': 0.6,
      'circle-stroke-opacity': 0.6,
      'circle-radius': {
        stops: [
          [10, 15],
          [14, 20],
        ],
      },
      'circle-stroke-width': 0,
      'circle-pitch-scale': 'map',
    },
  },

  nycSubwayRoutesSource: {
    type: 'geojson',
    data: '/data/nyc-subway-routes.geojson',
  },

  nycSubwayRoutesLayer: {
    id: 'subway-routes',
    type: 'line',
    paint: {
      'line-color': {
        property: 'rt_symbol',
        type: 'categorical',
        stops: [
          ['1', 'rgba(238, 53, 46, 1)'],
          ['4', 'rgba(0, 147, 60, 1)'],
          ['7', 'rgba(185, 51, 173, 1)'],
          ['A', 'rgba(0, 57, 166, 1)'],
          ['B', 'rgba(255, 99, 25, 1)'],
          ['G', 'rgba(108, 190, 69, 1)'],
          ['J', 'rgba(153, 102, 51, 1)'],
          ['L', 'rgba(167, 169, 172, 1)'],
          ['N', 'rgba(252, 204, 10, 1)'],
          ['SI', 'rgba(0, 57, 166, 1)'],
        ],
      },
      'line-width': {
        stops: [
          [10, 1],
          [15, 4],
        ],
      },
    },
  },

  nycSubwayStopsSource: Ember.computed('model', function() {
    const data = this.get('model');
    return {
      type: 'geojson',
      data,
    };
  }),

  nycSubwayStopsLayer: {
    id: 'subway_stations',
    minzoom: 11,
    type: 'circle',
    paint: {
      'circle-color': 'rgba(255, 255, 255, 1)',
      'circle-opacity': {
        stops: [
          [11, 0],
          [12, 1],

        ],
      },
      'circle-stroke-opacity': {
        stops: [
          [11, 0],
          [12, 1],
        ],
      },
      'circle-radius': {
        stops: [
          [10, 2],
          [14, 5],
        ],
      },
      'circle-stroke-width': 1,
      'circle-pitch-scale': 'map',
    },
  },

  nycSubwayStopsLabelsLayer: {
    id: 'subway-stops-labels',
    minzoom: 13,
    type: 'symbol',
    layout: {
      'text-field': '{name} Station',
      'symbol-placement': 'point',
      'symbol-spacing': 250,
      'symbol-avoid-edges': false,
      'text-size': 14,
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#FFF',
      'text-halo-color': '#212121',
      'text-halo-width': 1,
      'text-translate': [1, 20],
      'text-opacity': {
        stops: [
          [13, 0],
          [14, 1],
        ],
      },
    },
  },

  actions: {
    chooseStation() {
      const stations = this.get('model').features;
      const selected = stations[Math.floor(Math.random() * stations.length)];
      const stationId = selected.properties.cartodb_id;

      this.transitionToRoute('station', stationId);

      // this.set('selected', selected);
      //
      // const map = this.get('map');
      // map.fitBounds(bbox(selected), {
      //   padding: 40,
      //   maxZoom: 15,
      // });
    },

    handleMapLoaded(map) {
      window.map = map;
      this.set('map', map);
    },
  },
});
