const stations = require('./nyc-subway-stops.json');
const fs = require('fs-extra');
const path = require('path');

const hexIds = stations.features.map(feature => feature.properties.hex_id).sort((a, b) => a - b);
console.log(hexIds)

hexIds.forEach((hexId) => {
  fs.copySync(path.resolve(__dirname, `./${hexId}.json`), `./stations/${hexId}.json`);
});
