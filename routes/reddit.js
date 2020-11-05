var express = require('express');
var router = express.Router();

var request = require('request');
var redditResponse = '';

router.get('/', function(req, res) {
  var redditResponse = '';

  request('https://reddit.com/r/writingprompts.json', function(error, response, body) {
    if (!error) {
      redditResponse = body;
      return res.json(redditResponse);
    }
  });
});

module.exports = router;
