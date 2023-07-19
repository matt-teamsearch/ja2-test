const request = require('request');

const options = {
  url: 'http://mycroft/CcaWebApi/',
  headers: {
    'Content-type': 'application/json',
    'Authorization': 'Bearer A-a8200ee8-65ef-4e2c-9ce6-c346e51e888e"'
  }
};

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    const info = JSON.parse(body);
    console.log(response.qid);
  }
}

module.exports = {
  apiRequest: (req, res) =>{
    request(options, callback);
  }
}
