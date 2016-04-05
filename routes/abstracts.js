var express = require('express');
var router = express.Router();

var request = require('request');
var parseString = require('xml2js').parseString;

router.get('/:searchTerm', function(req, res) {

	var searchTerm = req.params.searchTerm;

    request('http://export.arxiv.org/api/query?search_query=all:' + searchTerm + '&start=0&max_results=30',
        function(error, response, body) {
            if (!error) {
                var xml = body;

                parseString(xml, function(err, result) {
                    res.json(result);
                });
            }
        });
});

module.exports = router;