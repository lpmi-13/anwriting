angular.module('escaper', []).filter('escapeHtml', function() {
  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '/': '&#x2F;'
  };

  return function(str) {
    return String(str).replace(/[&<>"\/]/g, function(s) {
      return entityMap[s];
    });
  };
});
