(function () {
  'use strict';

  angular.module("shuriApp").directive('tweetCard', ['$state', '$ionicModal', 'connectedService', 'dataApi', tweetCard]);

  function tweetCard($state, $ionicModal, connectedService, dataApi) {
    return {
      restrict: "E",
      scope: {
        tweetdoc: '=',
        isEntity: '@'
      },
      templateUrl: "templates/directives/tweetCard.html?" + _cacheBuster,
      link: function (scope, elem, attrs) {
        scope.onDesktop = !(window.cordova);
        scope.twitter3Live =  _twitter3Live;
        var watcherT = scope.$watch('tweetdoc', function () {
          if (scope.tweetdoc === undefined) return;
          scope.tweet = scope.tweetdoc;
          //console.log(scope.tweet);
        })
        var watcherI = scope.$watch('isEntity', function () {
          if (scope.isEntity === undefined) return;
          scope.hideViewProfile = !(scope.isEntity || scope.isEntity == "true");
        })

        scope.goTweet = function () {
          var url = "https://twitter.com/" + scope.tweet.valueObj.UserSn + "/status/" + scope.tweet.valueObj.Id;
          var winUser;
          if (window.cordova) {
            winUser = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
          }
          else winUser = window.open(url, "_blank");
        }

        scope.viewEntity = function () {
          if (scope.tweet.entity_Id) {
            if (scope.tweet.entityType == 9) $state.go('home.org', { groupId: scope.tweet.entity_Id });
            else $state.go('home.person', { personId: scope.tweet.entity_Id });
          }
        }
        scope.addTouch = function () {
          window.alert("Save as touch here");
        }

        //#region Twitter Actions

        scope.likeTweet = function (tweet) {
          connectedService.twitter.isTwitterAuthenticated().then(function (authenticated) {
            if (authenticated) {
              tweet.currentEntity.liked = !tweet.currentEntity.liked;
              if (tweet.currentEntity.liked) var liked = false;
              else var liked = true;
              connectedService.twitter.likeTweet(tweet.valueObj.id_str, liked).then(function (data) {
                if (data) {
                  var postedTweet = angular.copy(tweet);
                  if (tweet.currentEntity.isNew) {
                    postedTweet.currentEntity.isNew = false;
                    postedTweet.valueObj.people.push(tweet.currentEntity);
                  } else {
                    for (var i = 0; i < postedTweet.valueObj.people.length; i++) {
                      if (postedTweet.valueObj.people[i].id == scope.appUser.id) {
                        postedTweet.valueObj.people[i].liked = !postedTweet.valueObj.people[i].liked;
                      }
                    }
                  }
                  postedTweet.valueObj = angular.toJson(postedTweet.valueObj);
                  dataApi.postEntity('documents', 'document', postedTweet).then(function (doc) {
                  });
                }
              }, function (err) {
                console.log(err);
              })
            } else {
              alert("You must log into twitter to like a tweet")
            }
          });
        };

        scope.retweet = function (tweet) {
          connectedService.twitter.isTwitterAuthenticated().then(function (authenticated) {
            if (authenticated) {
              tweet.currentEntity.retweet = !tweet.currentEntity.retweet;
              if (tweet.currentEntity.retweet) var retweet = false;
              else var retweet = true;
              connectedService.twitter.retweet(tweet.valueObj.id_str, retweet).then(function (data) {
                if (data) {
                  var postedTweet = angular.copy(tweet);
                  if (tweet.currentEntity.isNew) {
                    postedTweet.currentEntity.isNew = false;
                    postedTweet.valueObj.people.push(tweet.currentEntity);
                  } else {
                    for (var i = 0; i < postedTweet.valueObj.people.length; i++) {
                      if (postedTweet.valueObj.people[i].id == scope.appUser.id) {
                        postedTweet.valueObj.people[i].retweet = !postedTweet.valueObj.people[i].retweet;
                      }
                    }
                  }
                  postedTweet.valueObj = angular.toJson(postedTweet.valueObj);
                  dataApi.postEntity('documents', 'document', postedTweet).then(function (doc) {
                  });
                }
              }, function (err) {
                console.log(err);
              })
            } else {
              alert("You must log into twitter to retweet")
            }
          });
        };

        scope.replyTweet = function (tweet) {
          scope.current = tweet;
          connectedService.twitter.isTwitterAuthenticated().then(function (authenticated) {
            if (authenticated) {
              $ionicModal.fromTemplateUrl('replyTweet.html', {
                scope: scope,
                animation: 'slide-in-up'
              }).then(function (modal) {
                scope.replyModal = modal;
                scope.replyModal.show();
              });
            } else {
              alert('You must log into twitter to reply to a tweet');
            }
          });
        };

        scope.submitReply = function (status) {
          status = '@' + scope.current.valueObj.userSn + ' ' + status;
          connectedService.twitter.isTwitterAuthenticated().then(function (authenticated) {
            if (authenticated) {
              connectedService.twitter.postTweet(status, scope.current.valueObj.id_str).then(function (data) {
                if (data) {
                  dataApi.getPerson(scope.appUser.id, 0).then(function (person) {
                    var newTouch = new shuri_touch();
                    newTouch.description = status;
                    newTouch.name = 'Touch ' + status;
                    newTouch.userType_Id = appGlobals.utConstants.tch_mediaCapture;
                    newTouch.people.push(person);
                    newTouch.collection_Id = scope.appUser.privateCollection_Id;
                    dataApi.postTouch(newTouch, 'sendnow').then(function (data) {
                      alert('You have submitted a reply to ' + scope.current.valueObj.userSn)
                      scope.cancelTweet();
                    });
                  });
                }
              })
            } else {
              scope.cancelTweet();
              alert("You must log into Twitter to reply to a tweet in your feed.")
            }
          });
        };

        scope.enlargePhoto = function (url) {
          $ionicModal.fromTemplateUrl('enlargePhoto.html', {
            scope: scope,
            animation: 'slide-in-up'
          }).then(function (modal) {
            scope.enlargeModal = modal;
            scope.enlargedImageUrl = url;
            scope.enlargeModal.show();
          });
        };

        scope.cancelEnlargeModal = function () {
          scope.enlargeModal.hide();
          scope.enlargeModal.remove();
          scope.enlargedImageUrl = null;
        };

        scope.goUser = function () {
          var url = "https://twitter.com/" + scope.tweet.valueObj.UserSn;
          var winUser;
          if (window.cordova) {
            winUser = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
          }
          else winUser = window.open(url, "_blank");

        };
        //#endregion

      }
    };
  }

})();

(function () {
  'use strict';

  angular.module("shuriApp").directive('rssCard', ['$state', '$stateParams', '$ionicModal', 'dataApi', 'appGlobals', rssCard]);

  function rssCard($state, $stateParams, $ionicModal, dataApi, appGlobals) {
    return {
      restrict: "E",
      scope: {
        rssdoc: '=',
        isEntity: '@'
      },
      templateUrl: "templates/directives/rssCard.html?" + _cacheBuster,
      link: function (scope, elem, attrs) {
        scope.onDesktop = !(window.cordova);
        scope.hideAt = (window.innerWidth <= appGlobals.widthMedium) ? 420 : 1024;
        scope.twitter3Live = _twitter3Live;

        if ($state.current.name == "home.tag") {
          scope.entityId = $stateParams.tagId;
         // console.log(scope.entityId);
        }

        var watcherD = scope.$watch('rssdoc', function () {
          if (scope.rssdoc === undefined) return;
          scope.rssdoc.isLong = (scope.rssdoc.valueObj.description.length >= scope.hideAt);
          if (scope.rssdoc.groups && scope.rssdoc.groups.length > 0 && scope.rssdoc.groups[0].grpType == 3) scope.rssdoc.org = scope.rssdoc.groups[0];
          SetDescription();
          //console.log(scope.rssdoc);
     });

        var watcherI = scope.$watch('isEntity', function () {
          if (scope.isEntity === undefined) return;
          scope.hideViewProfile = !(scope.isEntity || scope.isEntity == "true");
        });

        function SetDescription() {
          if (!scope.rssdoc.isLong) scope.rssdoc.description = scope.rssdoc.valueObj.description;
          else if (scope.rssdoc.showAll) scope.rssdoc.description = scope.rssdoc.valueObj.description;
          else {
            scope.rssdoc.description = scope.rssdoc.valueObj.description.substring(0, scope.hideAt)
            }

          //scope.tags = "What";
         // scope.rssdoc.tags.forEach(function (t) { t => scope.tags = (scope.tags + t.name + " "); console.log(scope.tags) });
          //console.log(scope.rssdoc.tags, scope.tags);
        }



        scope.viewEntity = function () {
          if (scope.rssdoc.entity_Id) {
            if (scope.rssdoc.entityType == 9) $state.go('home.org', { groupId: scope.rssdoc.entity_Id });
            else $state.go('home.person', { personId: scope.rssdoc.entity_Id });
          }
        }
        scope.addTouch = function () {
          window.alert("Save as touch here");
        }

        scope.goToRss = function (url) {
          var url = scope.rssdoc.name;
          if (url.indexOf('http') >= 0) {
            var win = window.open(url, '_shuri', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
          }
          else {
            var win = window.open("http://" + url, '_shuri', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
          }
        };

        scope.toggleDesc = function () {
          scope.rssdoc.showAll = !scope.rssdoc.showAll;
          SetDescription();
        }
      }
    };
  }

})();
