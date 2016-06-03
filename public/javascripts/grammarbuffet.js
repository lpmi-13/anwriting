var app = angular.module('Grammarbuffet', ['ngResource', 'ngRoute', 'monospaced.elastic', 'angular-growl', 'ngSanitize', 'escaper', 'angularModalService']);

app.config(['$routeProvider', function($routeProvider){
    $routeProvider
        .when('/', {
            templateUrl: 'partials/home.html',
            controller : 'HomeCtrl'
        })
        .when('/fiction', {
            templateUrl: 'partials/fiction.html',
            controller : 'FictionCtrl'
        })
        .when('/fiction/easy/:id/:url', {
            templateUrl: 'partials/easy-fiction-form.html',
            controller : 'EasyFictionCtrl'
        })
        .when('/fiction/regular/:id/:url', {
            templateUrl: 'partials/regular-fiction-form.html',
            controller : 'RegularFictionCtrl'
        })
        .when('/academic', {
            templateUrl: 'partials/academic.html',
            controller : 'AcademicCtrl'
        })
        .when('/academic/easy/:summary', {
            templateUrl: 'partials/easy-academic-form.html',
            controller : 'EasyAcademicCtrl'
        })
        .when('/academic/regular/:summary', {
            templateUrl: 'partials/regular-academic-form.html',
            controller : 'RegularAcademicCtrl'
        })
        .when('/business', {
            templateUrl: 'partials/business.html',
            controller : 'BusinessCtrl'
        })
        .when('/business/easy/news/:url', {
            templateUrl: 'partials/easy-business-form.html',
            controller : 'EasyBusinessCtrl'
        })
        .when('/business/regular/news/:url', {
            templateUrl: 'partials/regular-business-form.html',
            controller : 'RegularBusinessCtrl'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);

app.config(['growlProvider', function(growlProvider) {
    growlProvider.globalTimeToLive(8000);
    growlProvider.globalDisableCountDown(true);
    growlProvider.globalPosition('bottom-right');
}]);

app.service('promptService', function($http) {
    return $http.get('https://www.reddit.com/r/writingprompts.json', { cache : true});
});

app.factory('StoryList', function($resource) {
    return $resource('/stories/:id/:url', {cache : true});
});

app.factory('AbstractList', function($resource) {
    return $resource('/abstracts/:searchTerm', { cache : true});
});

app.factory('ArticleList', function($resource) {
    return $resource('/articleList', {cache : true});
});

app.factory('Article', function($resource) {
    return $resource('/article/:url', {cache : true});
});

app.controller('ModalController', ['$scope', 'close', function($scope, close) {

  $scope.close = close;

}]);

app.controller('HomeCtrl', ['$scope', '$location',
	function ($scope, $location) {
		
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

}]);


app.controller('FictionCtrl', ['$scope', '$resource', 'promptService', '$location',
    function ($scope, $resource, promptService, $location) {

            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }


        $scope.placeholder = 0;

        promptService.then(function(response) {

            var redditJSON = response.data;

            $scope.placeholder = 1;

            var allTitles = getValues(redditJSON, 'title');
            var allIDs = getValues(redditJSON, 'url');

            //screening prompts and urls for ONLY those which are actual writing prompts
            var wpArray = allTitles.filter(function(t) {
                if ((t.indexOf('WP') >= 0) || (t.indexOf('wp') >= 0) || (t.indexOf('Wp') >= 0)) {
                    return t;
                }
            });

            var urlArray = allIDs.filter(function(t) {
                if ((t.indexOf('WP') >= 0) || (t.indexOf('wp') >= 0) || (t.indexOf('Wp') >= 0)) {
                    return t;
                }
            });

            var shortURLs = urlArray.map(function(n) {
                return n.substring(49);
            });

            var prompts = [];

            for (var i = 0; i < wpArray.length; i++) {
                prompts.push([wpArray[i],shortURLs[i]]);
            }

            $scope.redditTitles = prompts;
        });


        //function for iterating through json response and grabbing prompts/urls
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


            //set values for radio buttons
            $scope.formData = {};
            $scope.formData.easyRegular = 'easy';
            
}]);

app.controller('EasyFictionCtrl', ['$scope', '$location', '$routeParams', 'growl', 'StoryList', '$sce', 'ModalService', 
    function ($scope, $location, $routeParams, growl, StoryList, $sce, ModalService) {
       
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

            $scope.showModal = function() {

                // Just provide a template url, a controller and call 'showModal'.
                ModalService.showModal({
                  templateUrl: "partials/modal.html",
                  controller: "ModalController"
                }).then(function(modal) {
                  // The modal object has the element built, if this is a bootstrap modal
                  // you can call 'modal' to show it, if it's a custom modal just show or hide
                  // it as you need to.
                  modal.element.modal();
                  modal.close.then(function(result) {
                    $scope.message = result ? "You said Yes" : "You said No";
                  });
                });

              };


         
        var id = $routeParams.id;
        var url = $routeParams.url;

        $scope.story = "LOADING STORY...";

        $scope.amendedStory = "LOADING STORY...";

        StoryList.get({id : $routeParams.id, url : $routeParams.url}, function(response) {

            $scope.story = response.story;

            $scope.originalHighlights = response.story
                                    .replace(/ a /g, ' aaa ')
                                    .replace(/ an /g, ' aan ')
                                    .replace(/ A /g, ' aaa ')
                                    .replace(/ An /g, ' aan ');
         
            $scope.story_highlights = response.story
                                    .replace(/ a /g, ' aaa ')
                                    .replace(/ an /g, ' aan ')
                                    .replace(/ A /g, ' aaa ')
                                    .replace(/ An /g, ' aan ');

            $scope.amendedStory = response.story
                                    .replace(/ the /g, ' *** ')
                                    .replace(/ a /g, ' *** ')
                                    .replace(/ an /g, ' *** ')
                                    .replace(/ The /g, ' *** ')
                                    .replace(/ A /g, ' *** ')
                                    .replace(/ An /g, ' *** ');

        });       

        $scope.check = function() {
            var storyArray = $scope.story.toLowerCase().split(' ');
            var amendedArray = $scope.amendedStory.toLowerCase().split(' ');

            var differenceCount = 0;

            for (var i = 0; i < storyArray.length; i++) {
                if (storyArray[i] !== amendedArray[i]) {
                    differenceCount += 1;
                }
            }

            console.log('the final count of differences is ' + differenceCount);
            
            if (!angular.equals($scope.story.toLowerCase(), $scope.amendedStory.toLowerCase())){ 
                if (differenceCount > 5) {
                    growl.warning('...not done yet', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else if (differenceCount > 1) {
                    growl.warning('...getting closer', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else {
                    growl.warning('...you\'re almost there!!!', {title: 'We\'re still missing ' + differenceCount + ' thing'});
                } 
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, you fixed all the errors!!!'});
            }
        }

        $scope.goToStories = function() {
            $location.path('/fiction');
        }

        $scope.getHint = function() {
            var storyArray = $scope.story.split(' ');
            var amendedArray = $scope.amendedStory.split(' ');

            var differenceCount = 0;
            var differenceArray = [];

            for (var i = 0; i < storyArray.length; i++) {
                if (storyArray[i] !== amendedArray[i]) {
                    differenceCount += 1;
                    differenceArray.push(i);
                }
            }

            $scope.story_highlights = checkHighlights(storyArray, differenceArray);

            function checkHighlights (originalArray, errorIndexArray) {
                for (var i = 0; i < errorIndexArray.length; i++) {
                    originalArray[errorIndexArray[i]] = '<span class="hl">***</span>'
                }
                var resultText = originalArray.join(' ');
                return resultText;
            }

            growl.warning('...look near the RED marks', {title: 'We\'re still missing ' + differenceCount + ' things'});

            setTimeout(function() {$scope.story_highlights = $scope.originalHighlights}, 8000);
        }

        $scope.switchBool = function (value) {
                    $scope[value] = !$scope[value]
        }

    }]);


app.controller('RegularFictionCtrl', ['$scope', '$resource', '$location', '$routeParams', 'growl', 'StoryList', '$sce', 
    function ($scope, $resource, $location, $routeParams, growl, StoryList, $sce) {
        var id = $routeParams.id;
        var url = $routeParams.url;

            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        $scope.story = "LOADING STORY...";

        $scope.amendedStory = "LOADING STORY..."


        StoryList.get({id : $routeParams.id, url : $routeParams.url}, function(response) {

            $scope.story = response.story;

            $scope.amendedStory = response.story
                                    .replace(/ the /g, ' ')
                                    .replace(/ a /g, ' ')
                                    .replace(/ an /g, ' ')
                                    .replace(/ The /g, ' ')
                                    .replace(/ A /g, ' ')
                                    .replace(/ An /g, ' ');

            $scope.story_highlights = response.story;

            console.log(response.pos);

        });       
    

        $scope.check = function() {
            var storyArray = $scope.story.toLowerCase().split(' ');
            var amendedArray = $scope.amendedStory.toLowerCase().split(' ');

            
            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            if (countA(storyArray) !== countA(amendedArray)){ 
                if (countA(storyArray) > countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough A\'s'});
                } else if (countA(storyArray) < countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many A\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the A\'s!!!'});
            }

            if (countAn(storyArray) !== countAn(amendedArray)){ 
                if (countAn(storyArray) > countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough An\'s'});
                } else if (countAn(storyArray) < countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many An\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the An\'s!!!'});
            }

            if (countThe(storyArray) !== countThe(amendedArray)){ 
                if (countThe(storyArray) > countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough The\'s'});
                } else if (countThe(storyArray) < countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many The\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the The\'s!!!'});
            }
        }

        $scope.goToStories = function() {
            $location.path('/fiction');
        }

        $scope.getHint = function() {
            var storyArray = $scope.story.toLowerCase().split(' ');
            var amendedArray = $scope.amendedStory.toLowerCase().split(' ');

            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            growl.warning('...look near the singular countable nouns', {title: 'We have ' + 
                countA(amendedArray) + ' A\'s, and we need ' + countA(storyArray) + '...' +
                'we have ' + countAn(amendedArray) + ' An\'s, and we need ' + countAn(storyArray) + '...' +
                'we have ' + countThe(amendedArray) + ' The\'s, and we need ' + countThe(storyArray)});
        }

}]);

app.controller('AcademicCtrl', ['$scope', '$resource', 'AbstractList', '$routeParams', '$location',
    function ($scope, $resource, AbstractList, $routeParams, $location) {

            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        var term = $scope.text;
        $scope.formData = {};

        $scope.getAbstracts = function() {

            
            AbstractList.get({searchTerm : $scope.formData.text}, function(response) {

                var abstractArray = response.feed.entry;

                $scope.abstracts = abstractArray;

            });
        }

            $scope.formData.easyRegular = 'easy';
            
}]);

app.controller('EasyAcademicCtrl', ['$scope', '$location', '$routeParams', 'growl', '$sce', 
    function ($scope, $location, $routeParams, growl, $sce) {
       
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        // var escaped = $sce.trustAsHtml($routeParams.summary);

        var summary = $routeParams.summary.replace(/_/g, ' ');

        summary = summary.trimLeft();

        $scope.summary = summary;

        $scope.originalHighlights = summary
                                .replace(/ a /g, ' aaa ')
                                .replace(/ an /g, ' aan ')
                                .replace(/ A /g, ' aaa ')
                                .replace(/ An /g, ' aan ');
                                
        $scope.summary_highlights = summary
                                .replace(/ a /g, ' aaa ')
                                .replace(/ an /g, ' aan ')
                                .replace(/ A /g, ' aaa ')
                                .replace(/ An /g, ' aan ');
       
        $scope.amendedSummary = summary
                                .replace(/ the /g, ' *** ')
                                .replace(/ a /g, ' *** ')
                                .replace(/ an /g, ' *** ')
                                .replace(/ The /g, ' *** ')
                                .replace(/ A /g, ' *** ')
                                .replace(/ An /g, ' *** ');
        

        $scope.check = function() {
            var summaryArray = $scope.summary.split(' ');
            var amendedSummaryArray = $scope.amendedSummary.split(' ');

            var differenceCount = 0;

            for (var i = 0; i < summaryArray.length; i++) {
                if (summaryArray[i] !== amendedSummaryArray[i]) {
                    differenceCount += 1;
                }
            }

            console.log('the final count of differences is ' + differenceCount);
            
            if (!angular.equals($scope.summary.toLowerCase(), $scope.amendedSummary.toLowerCase())){ 
                if (differenceCount > 5) {
                    growl.warning('...not done yet', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else if (differenceCount > 1) {
                    growl.warning('...getting closer', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else {
                    growl.warning('...you\'re almost there!!!', {title: 'We\'re still missing ' + differenceCount + ' thing'});
                } 
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, you fixed all the errors!!!'});
            }
        }

        $scope.goToTitles = function() {
            $location.path('/academic');
        }

        $scope.getHint = function() {
            var summaryArray = $scope.summary.split(' ');
            var amendedSummaryArray = $scope.amendedSummary.split(' ');


            var differenceCount = 0;

            for (var i = 0; i < summaryArray.length; i++) {
                if (summaryArray[i] !== amendedSummaryArray[i]) {
                    differenceCount += 1;
                }
            }

            var differenceArray = [];

            for (var i = 0; i < summaryArray.length; i++) {
                if (summaryArray[i] !== amendedSummaryArray[i]) {
                    differenceArray.push(i);
                }
            }

            $scope.summary_highlights = checkHighlights(summaryArray, differenceArray);

            function checkHighlights (originalArray, errorIndexArray) {
                for (var i = 0; i < errorIndexArray.length; i++) {
                    originalArray[errorIndexArray[i]] = '<span class="hl">***</span>'
                }
                var resultText = originalArray.join(' ');
                return resultText;
            }

            growl.warning('...look near the red marks', {title: 'We\'re still missing ' + differenceCount + ' things'});

            setTimeout(function() {$scope.summary_highlights = $scope.originalHighlights}, 8000);
        }

}]);


app.controller('RegularAcademicCtrl', ['$scope', '$resource', '$location', '$routeParams', 'growl', '$sce', 
    function ($scope, $resource, $location, $routeParams, growl, $sce) {
  
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        var summary = $routeParams.summary.replace(/_/g, ' ');

        summary = summary.trimLeft();

        $scope.summary = summary;

        $scope.amendedSummary = summary
                                .replace(/ the /g, ' ')
                                .replace(/ a /g, ' ')
                                .replace(/ an /g, ' ')
                                .replace(/ The /g, ' ')
                                .replace(/ A /g, ' ')
                                .replace(/ An /g, ' ');
        
        $scope.summary_highlights = summary;

        $scope.check = function() {
            var summaryArray = $scope.summary.toLowerCase().split(' ');
            var amendedArray = $scope.amendedSummary.toLowerCase().split(' ');

            
            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            if (countA(summaryArray) !== countA(amendedArray)){ 
                if (countA(summaryArray) > countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough A\'s'});
                } else if (countA(summaryArray) < countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many A\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the A\'s!!!'});
            }

            if (countAn(summaryArray) !== countAn(amendedArray)){ 
                if (countAn(summaryArray) > countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough An\'s'});
                } else if (countAn(summaryArray) < countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many An\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the An\'s!!!'});
            }

            if (countThe(summaryArray) !== countThe(amendedArray)){ 
                if (countThe(summaryArray) > countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough The\'s'});
                } else if (countThe(summaryArray) < countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many The\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the The\'s!!!'});
            }
        }

        $scope.goToTitles = function() {
            $location.path('/academic');
        }

        $scope.getHint = function() {
            var summaryArray = $scope.summary.toLowerCase().split(' ');
            var amendedArray = $scope.amendedSummary.toLowerCase().split(' ');

            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            growl.warning('...look near the singular countable nouns', {title: 'We have ' + 
                countA(amendedArray) + ' A\'s, and we need ' + countA(summaryArray) + '...' +
                'we have ' + countAn(amendedArray) + ' An\'s, and we need ' + countAn(summaryArray) + '...' +
                'we have ' + countThe(amendedArray) + ' The\'s, and we need ' + countThe(summaryArray)});
        }

}]);


app.controller('BusinessCtrl', ['$scope', '$resource', 'ArticleList', '$location',
    function ($scope, $resource, ArticleList, $location) {

            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        ArticleList.query(function(response) {
            var rawArray = response;

            $scope.articles = rawArray;
        });  

            $scope.placeholder = 1;


            //set values for radio buttons
            $scope.formData = {};
            $scope.formData.easyRegular = 'easy';
            
}]);


app.controller('EasyBusinessCtrl', ['$scope', '$location', '$routeParams', 'growl', 'Article', '$sce', 
    function ($scope, $location, $routeParams, growl, Article, $sce) {
        
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        var url = $routeParams.url;

        $scope.amendedArticle = "LOADING STORY..."

        Article.get({url : $routeParams.url}, function(response) {
        
            var text = response.response;

            $scope.article = text;
                                  
            $scope.originalHighlights = text
                                    .replace(/ a /g, ' aaa ')
                                    .replace(/ an /g, ' aan ')
                                    .replace(/ A /g, ' aaa ')
                                    .replace(/ An /g, ' aan ');  

            $scope.article_highlights = text
                                    .replace(/ a /g, ' aaa ')
                                    .replace(/ an /g, ' aan ')
                                    .replace(/ A /g, ' aaa ')
                                    .replace(/ An /g, ' aan ');

            $scope.amendedArticle = text
                                    .replace(/ the /g, ' *** ')
                                    .replace(/ a /g, ' *** ')
                                    .replace(/ an /g, ' *** ')
                                    .replace(/ The /g, ' *** ')
                                    .replace(/ A /g, ' *** ')
                                    .replace(/ An /g, ' *** ');

        });

        $scope.check = function() {
            var articleArray = $scope.article.split(' ');
            var amendedArticleArray = $scope.amendedArticle.split(' ');

            var differenceCount = 0;

            for (var i = 0; i < articleArray.length; i++) {
                if (articleArray[i] !== amendedArticleArray[i]) {
                    differenceCount += 1;
                }
            }

            console.log('the final count of differences is ' + differenceCount);
            
            if (!angular.equals($scope.article.toLowerCase(), $scope.amendedArticle.toLowerCase())){ 
                if (differenceCount > 5) {
                    growl.warning('...not done yet', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else if (differenceCount > 1) {
                    growl.warning('...getting closer', {title: 'We\'re still missing ' + differenceCount + ' things'});
                } else {
                    growl.warning('...you\'re almost there!!!', {title: 'We\'re still missing ' + differenceCount + ' thing'});
                } 
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, you fixed all the errors!!!'});
            }
        }

        $scope.goToHeadlines = function() {
            $location.path('/business');
        }

        $scope.getHint = function() {
            var articleArray = $scope.article.split(' ');
            var amendedArticleArray = $scope.amendedArticle.split(' ');


            var differenceCount = 0;

            for (var i = 0; i < articleArray.length; i++) {
                if (articleArray[i] !== amendedArticleArray[i]) {
                    differenceCount += 1;
                }
            }

            var differenceArray = [];

            for (var i = 0; i < articleArray.length; i++) {
                if (articleArray[i] !== amendedArticleArray[i]) {
                    differenceArray.push(i);
                }
            }

            $scope.article_highlights = checkHighlights(articleArray, differenceArray);

            function checkHighlights (originalArray, errorIndexArray) {
                for (var i = 0; i < errorIndexArray.length; i++) {
                    originalArray[errorIndexArray[i]] = '<span class="hl">***</span>'
                }
                console.log(originalArray);
                var resultText = originalArray.join(' ');
                return resultText;
            }

            growl.warning('...look near the red marks', {title: 'We\'re still missing ' + differenceCount + ' things'});

            setTimeout(function() {$scope.article_highlights = $scope.originalHighlights}, 8000);
        }

}]);


app.controller('RegularBusinessCtrl', ['$scope', '$resource', '$location', '$routeParams', 'growl', 'Article', '$sce', 
    function ($scope, $resource, $location, $routeParams, growl, Article, $sce) {
       
            $scope.goToHome = function() {
                $location.path('/');
            }

            $scope.goToBusiness = function() {
                $location.path('/business');
            }

            $scope.goToAcademic = function() {
                $location.path('/academic');
            }

            $scope.goToFiction = function() {
                $location.path('/fiction');
            }

        var url = $routeParams.url;

        $scope.amendedArticle = "LOADING STORY...";

        Article.get({url : $routeParams.url}, function(response) {
        
            var text = response.response;

            $scope.article = text;

            $scope.amendedArticle = text
                                    .replace(/ the /g, ' ')
                                    .replace(/ a /g, ' ')
                                    .replace(/ an /g, ' ')
                                    .replace(/ The /g, ' ')
                                    .replace(/ A /g, ' ')
                                    .replace(/ An /g, ' ');  

            $scope.article_highlights = text;

        });

        $scope.check = function() {
            var articleArray = $scope.article.toLowerCase().split(' ');
            var amendedArray = $scope.amendedArticle.toLowerCase().split(' ');

            
            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            if (countA(articleArray) !== countA(amendedArray)){ 
                if (countA(articleArray) > countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough A\'s'});
                } else if (countA(articleArray) < countA(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many A\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the A\'s!!!'});
            }

            if (countAn(articleArray) !== countAn(amendedArray)){ 
                if (countAn(articleArray) > countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough An\'s'});
                } else if (countAn(articleArray) < countAn(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many An\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the An\'s!!!'});
            }

            if (countThe(articleArray) !== countThe(amendedArray)){ 
                if (countThe(articleArray) > countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We don\'t have enough The\'s'});
                } else if (countThe(articleArray) < countThe(amendedArray)) {
                    growl.warning('...OOPS!', {title: 'We have too many The\'s'});
                }
            } else {
                growl.success('SUCCESS!!!', {title: 'Nice Work, we have all the The\'s!!!'});
            }
        }

        $scope.goToHeadlines = function() {
            $location.path('/business');
        }

        $scope.getHint = function() {
            var articleArray = $scope.article.toLowerCase().split(' ');
            var amendedArray = $scope.amendedArticle.toLowerCase().split(' ');

            function countA(array) {
                var aCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'a' || array[i] == 'A'){
                        aCount++;
                    }
                }
                return aCount;
            }

            function countAn(array) {
                var anCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'an' || array[i] == 'An'){
                        anCount++;
                    }
                }
                return anCount;
            }

            function countThe(array) {
                var theCount = 0;

                for (var i = 0; i < array.length; i++) {
                    if (array[i] == 'the' || array[i] == 'The'){
                        theCount++;
                    }
                }
                return theCount;
            }

            growl.warning('...look near the singular countable nouns', {title: 'We have ' + 
                countA(amendedArray) + ' A\'s, and we need ' + countA(articleArray) + '...' +
                'we have ' + countAn(amendedArray) + ' An\'s, and we need ' + countAn(articleArray) + '...' +
                'we have ' + countThe(amendedArray) + ' The\'s, and we need ' + countThe(articleArray)});
        }

}]);