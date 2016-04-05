var express = require('express');
var router = express.Router();

var request = require('request');
var cheerio = require('cheerio');

router.get('/:url', function(req, res) {

	var base = 'http://bbc.co.uk/news/';
	var url = req.params.url;


	request(base + url, function (error, response, body) {

		if (!error) {

			var $ = cheerio.load(body);

			var intro = $('.story-body__introduction').nextAll('p').text();
			console.log(intro);
			res.send({response : intro});
        }
	});

});

module.exports = router;