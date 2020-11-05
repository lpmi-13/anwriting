var express = require('express');
var router = express.Router();

var request = require('request');
var cheerio = require('cheerio');

router.get('/', function(req, res) {
  request('https://bbc.co.uk/news/business/', function(error, response, body) {
    if (!error) {
      $ = cheerio.load(body);

      var hrefArray = [];

      $('a[href^="/news/business-"]').each(function() {
        if (
          $(this)
            .text()
            .indexOf('Video') >= 0 ||
          $(this)
            .text()
            .indexOf('Full article') >= 0
        ) {
          return;
        } else {
          var href = $(this).attr('href');
          var text = $(this).text();
          hrefArray.push({ href: href, text: text });
        }
      });
      res.send(hrefArray);
    }
  });
});

module.exports = router;
