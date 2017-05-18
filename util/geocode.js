'use strict';

const Papa = require('babyparse');
const geocoder = require('node-geocoder');
const fs = require('fs');
const http = require('http');
var APIKEY_FILE_URL = 'APIKEY.txt'
var shops = {
  shopslist: []
};
var shopsWithLocation = {
  shopslist: []
};
var i = 0;

var maxSocketsAgent = http.Agent({maxSockets: 100});

var options = {
  provider: 'opencage',
  apiKey:  fs.readFileSync(APIKEY_FILE_URL, {encoding: 'utf8'})
};

var geo = geocoder(options);

//Country code as in the csv-files, full country name, ISO 3166-1 alpha-2
var SHOP_FILES_URLS = [["AT","Austria", "at"], ["BE","Belgium", "be"], ["CH","Switzerland", "ch"], ["DE","Germany", "de"], ["LU","Luxembourg", "lu"], ["NL","Netherlands", "nl"], ["UK","UK", "gb"]]
  .map(function(country) {
    country = {
      country: country[1],
      iso: country[2],
      url: "..\\..\\data\\input\\Fairphone physical touch points " + country[0] + " - " + country[1] + ".csv"
    };
    return country;
});


async function main() {
  console.log(options.apiKey);
  let accu = SHOP_FILES_URLS.map(async function(csvfile) {
    new Promise(function(resolve,reject) {
      Papa.parse(fs.readFileSync(csvfile.url, {encoding: 'utf8'}), {
        header: true,
        complete: function(json) {
          json.data.forEach(function(shop,index,array) {
            shop.country = csvfile.country;
            shops.shopslist.push(shop);
          });
          resolve();
        }
      });
    });
  });

  await Promise.all(accu);

  accu = shops.shopslist.map(async function(shop) {
    try {
      let result = await (geo.geocode({
        address: shop["Address"]+', '+shop["Zipcode"]+', '+shop["City"]+', '+shop.country,
        countrycode: shop.iso,
        limit: 1,
        no_annotations: 1
      }));
      shop.location = {'lat': result[0].latitude, 'lng': result[0].longitude};
      shopsWithLocation.shopslist.push(shop);
    } catch(err) {
      shopsWithLocation.shopslist.push(shop);
      i++;
      console.log(shop["Name Retailer/Venue/Museum"]+', '+shop["Address"]+', '+shop["Zipcode"]+', '+shop["City"]+', '+shop.country+' will be saved without location!');
      console.log(err);
    };
  });

  await Promise.all(accu);

  fs.writeFileSync('..\\..\\data\\output\\shops.json',JSON.stringify(shopsWithLocation));
  console.log('All but '+i+' shops with locations were saved to file! Hooray!!!');


}

main();
