var express = require('express');
var router = express.Router();

var pos = require('pos');
var request = require('request');

router.get('/:id/:url', function(req, res) {
  var id = req.params.id;
  var url = req.params.url;

  request('https://reddit.com/r/writingprompts/comments/' + id + '/' + url + '/' + '.json', function(
    error,
    response,
    body
  ) {
    if (!error) {
      var parsed = JSON.parse(response.body);

      var comments = getValues(parsed, 'body');

      for (i = 0; i < comments.length; i++) {
        if (comments[i].indexOf('####') > 0) {
          comments[i] = 'x';
        }
      }
      var longest = comments.sort(function(a, b) {
        return b.length - a.length;
      })[0];

      var taggedArray = [];

      var words = new pos.Lexer().lex(longest);
      var tagger = new pos.Tagger();
      var taggedWords = tagger.tag(words);
      for (i in taggedWords) {
        var taggedWord = taggedWords[i];
        var word = taggedWord[0];
        var tag = taggedWord[1];
        if (word !== 'A' && word !== 'a' && word !== 'An' && word !== 'an' && word !== 'The' && word !== 'the') {
          taggedArray.push([word, tag]);
        }
      }

      res.json({ story: longest, pos: taggedArray });
    }
  });

  //iterating through responses and selecting the stories
  function getValues(obj, key) {
    var objects = [];
    for (var i in obj) {
      if (!obj.hasOwnProperty(i)) continue;
      if (typeof obj[i] == 'object') {
        objects = objects.concat(getValues(obj[i], key));
      } else if (i == key) {
        objects.push(obj[i]);
      }
    }
    return objects;
  }
});

module.exports = router;
