angular.module('underscoreFilter', []).filter('unders', function() {
  return function(input) {
    return input.replace(/ /g, '_');
  };
});