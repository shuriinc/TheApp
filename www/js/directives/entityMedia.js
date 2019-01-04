(function () {
    'use strict';

    angular.module("shuriApp").directive('entityMedia', ['$q', '$ionicScrollDelegate', '$state', '$compile', '$filter', '$timeout', '$ionicModal', '$ionicPopup', '$ionicListDelegate', '$window', 'globals', 'connectedService', 'dataApi', 'appGlobals',
        function ($q, $ionicScrollDelegate, $state, $compile, $filter, $timeout, $ionicModal, $ionicPopup, $ionicListDelegate, $window, globals, connectedService, dataApi, appGlobals) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    entityType: '=',
                },
                templateUrl: "templates/directives/entityMedia.html",
                link: function (scope, elem, attrs) {
                    scope.hideHeader = true;
                    scope.isPaged = false;
                    scope.isLoaded = false;
                    scope.tweets = [];
                    scope.rssPosts = [];
                    scope.itemCount = 0;

                    scope.title = "Initializing";
                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    //#region Watchers
                    var watcherEntity = scope.$watch('entity', function () {
                        if (scope.entity === undefined) return;
                        scope.refresh();
                    })

                    scope.selectTab = function(type){
                      if(type == 'twitter'){
                        scope.twitterSelected = true;
                        scope.researchSelected = false;
                        scope.refresh(type);
                      } else {
                        scope.researchSelected = true;
                        scope.twitterSelected = false;
                        scope.refresh(type);
                      }
                    }

                    scope.refresh = function (type) {
                        dataApi.initialize().then(function (d) {
                            scope.appUser = d.appUser;
                            if (!type) type = localStorage.getItem("mediaType");
                            if (window.innerWidth < 500) adjustUI();
                            scope.page = 1;
                            scope.pageSize = 20;
                            scope.isLoaded = false;
                            scope.twitterSelected = false;
                            scope.researchSelected = false;

                            if ($window.innerHeight > 700) {
                                scope.displayHeight = '475px';
                            } else {
                                scope.displayHeight = '352px';
                            }
                            if (!type || type == 'twitter') {
                                localStorage.setItem("mediaType", "twitter");
                                scope.twitterSelected = true;
                                if (!scope.tweets.length) {
                                    var tempT = [];
                                    for (var i = 0; i < scope.entity.documents.length; i++) {
                                        if (scope.entity.documents[i].userType_Id == appGlobals.utConstants.doc_twitterStream) {
                                            scope.hideHeader = false;
                                            tempT.push(scope.entity.documents[i]);
                                        }
                                    }
                                    if (tempT.length) scope.filterTweets(tempT);
                                    else scope.isLoaded = true;
                                } else scope.isLoaded = true;
                            } else {
                                localStorage.setItem("mediaType", "research");
                                scope.researchSelected = true;
                                if (!scope.rssPosts.length) {
                                    var tempR = [];
                                    for (var i = 0; i < scope.entity.documents.length; i++) {
                                        if (scope.entity.documents[i].userType_Id == appGlobals.utConstants.doc_researchItems) {
                                            scope.hideHeader = false;
                                            tempR.push(scope.entity.documents[i]);
                                        }
                                    }
                                    if (tempR.length) scope.filterResearch(tempR);
                                    else scope.isLoaded = true;
                                } else scope.isLoaded = true;
                            }

                        });
                    };

                    scope.filterResearch = function (data) {
                      data.forEach(function (item) {
                        item.value = angular.fromJson(item.value);
                        item.value.fmtDate = moment(Number(item.value.date)).format('MMMM Do, YYYY');
                        item.value.description = htmlToPlaintext(item.value.description)
                        if (item.value.description.length > 250) {
                          item.value.description =  (item.value.description.substring(0, 250) + "...");
                        }

                        scope.rssPosts.push(item);

                      });
                      scope.isScrolling = false;
                      scope.isLoaded = true;
                    };


                    scope.filterTweets = function(data){
                      for(var i = 0; i < data.length; i++){
                        var doc_tweet = data[i];
                        if(doc_tweet.userType_Id == appGlobals.utConstants.doc_twitterStream){
                          doc_tweet.value = angular.fromJson(doc_tweet.value);
                          if(doc_tweet.value !== null && typeof doc_tweet.value === 'object') {
                            doc_tweet.value.newtimestamp = moment(Number(doc_tweet.value.timestamp)).format('MMMM Do, YYYY');
                            scope.tweets.push(doc_tweet);
                          } else {
                            console.log('bad value', doc_tweet);
                          }
                          checkTweet(doc_tweet);
                        }
                      }
                      scope.findTenure(scope.tweets).then(function(){
                        scope.isScrolling = false;
                        scope.isLoaded = true;
                      });
                    };

                    scope.findTenure = function(tweets){
                      var deferred = $q.defer();
                      if(scope.entityType == 4){
                        tweets.forEach(function(tweet){
                          if(scope.entityType == shuri_enums.entitytypes.person){
                            for(var i = 0; i < scope.entity.groups.length; i++){
                              if(scope.entity.groups[0].grpType == shuri_enums.grouptype.organization){
                                if(scope.entity.groups[i].endDt == null){
                                  tweet.value.currentEmployer = scope.entity.groups[i];
                                  if(tweet == tweets[tweets.length - 1]){
                                    deferred.resolve();
                                  }
                                }
                              }
                            }
                          } else {
                            tweet.value.currentEmployer = scope.entity;
                            if(tweet == tweets[tweets.length - 1]){
                              deferred.resolve();
                            }
                          };
                        })
                      }
                      return deferred.promise;
                    };

                    function checkTweet(tweet){
                      if(tweet.value.people){
                        for(var i = 0; i < tweet.value.people.length; i++){
                          var person = tweet.value.people[i];
                          // console.log(person);
                          if(person != null){
                            if(person.id == scope.appUser.id){
                              tweet.currentEntity = person;
                              tweet.currentEntity.new = false;
                              // console.log(tweet);
                            }
                          }
                        };
                      } else {
                        tweet.currentEntity = {};
                        tweet.currentEntity.id = scope.appUser.id;
                        tweet.currentEntity.new = true;
                        tweet.value.people = [];
                      }
                    };

                    scope.goTo = function (url) {
                      if (url.indexOf('http') >= 0) {
                          var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
                      }
                      else {
                        var win = window.open("http://" + url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
                      }
                    };

                    function htmlToPlaintext(text) {
                      return text ? String(text).replace(/<[^>]+>/gm, '') : '';
                    }

                    function adjustUI() {
                      scope.smallScale = true;
                    }

                    scope.goToOrg = function (id) {
                      $state.go("home.org" , { "groupId": id });
                    };

                    scope.getFeedback = function (entity) {
                      $window.location.href = "mailto:support@shuri.com?cc=cc@shuri.com&subject=Feedback%20for%20" + entity + "%20Research%20Feed";
                    }

                    scope.likeTweet = function(tweet){
                      connectedService.twitter.isTwitterAuthenticated().then(function(authenticated){
                        if(authenticated){
                          tweet.currentEntity.liked = !tweet.currentEntity.liked;
                          if(tweet.currentEntity.liked) var liked = false;
                          else var liked = true;
                          connectedService.twitter.likeTweet(tweet.value.id_str, liked).then(function(data){
                            if(data){
                                var postedTweet = angular.copy(tweet);
                                if(tweet.currentEntity.new){
                                  postedTweet.currentEntity.new = false;
                                  postedTweet.value.people.push(tweet.currentEntity);
                                } else {
                                  for(var i = 0; i < postedTweet.value.people.length; i++){
                                    if(postedTweet.value.people[i].id == scope.appUser.id){
                                      postedTweet.value.people[i].liked = !postedTweet.value.people[i].liked;
                                    }
                                  }
                                }
                                postedTweet.value = angular.toJson(postedTweet.value);
                                dataApi.postEntity('documents', 'document', postedTweet).then(function(doc){
                                  // console.log(tweet.currentEntity.liked);
                                  // console.log('finished posting entityt');
                                });
                            }
                          }, function(err){
                            console.log(err);
                          })
                        } else {
                          alert("You must log into twitter to like a tweet")
                        }
                      });
                    };

                    scope.retweet = function(tweet){
                      connectedService.twitter.isTwitterAuthenticated().then(function(authenticated){
                        if(authenticated){
                          tweet.currentEntity.retweet = !tweet.currentEntity.retweet;
                          if(tweet.currentEntity.retweet) var retweet = false;
                          else var retweet = true;
                          connectedService.twitter.retweet(tweet.value.id_str, retweet).then(function(data){
                            if(data){
                                var postedTweet = angular.copy(tweet);
                                if(tweet.currentEntity.new){
                                  postedTweet.currentEntity.new = false;
                                  postedTweet.value.people.push(tweet.currentEntity);
                                } else {
                                  for(var i = 0; i < postedTweet.value.people.length; i++){
                                    if(postedTweet.value.people[i].id == scope.appUser.id){
                                      postedTweet.value.people[i].retweet = !postedTweet.value.people[i].retweet;
                                    }
                                  }
                                }
                                postedTweet.value = angular.toJson(postedTweet.value);
                                dataApi.postEntity('documents', 'document', postedTweet).then(function(doc){
                                  // console.log(tweet.currentEntity.liked);
                                  // console.log('finished posting entityt');
                                });
                            }
                          }, function(err){
                            console.log(err);
                          })
                        } else {
                          alert("You must log into twitter to like a tweet")
                        }
                      });
                    };




                    scope.enlargePhoto = function(url){
                        $ionicModal.fromTemplateUrl('enlargePhoto.html', {
                          scope: scope,
                          animation: 'slide-in-up'
                        }).then(function(modal) {
                          scope.enlargeModal = modal;
                          scope.enlargedImageUrl = url;
                          scope.enlargeModal.show();
                        });
                    };

                    scope.cancelEnlargeModal = function(){
                      scope.enlargeModal.hide();
                      scope.enlargeModal.remove();
                      scope.enlargedImageUrl = null;
                    };



                    scope.replyTweet = function(tweet){
                      scope.current = tweet;
                      connectedService.twitter.isTwitterAuthenticated().then(function(authenticated){
                        if(authenticated){
                          $ionicModal.fromTemplateUrl('replyTweet.html', {
                            scope: scope,
                            animation: 'slide-in-up'
                          }).then(function(modal) {
                            scope.modal = modal;
                            scope.modal.show();
                          });
                        } else {
                          alert('You must log into twitter to reply to a tweet in your feed');
                        }
                      });
                    };

                    scope.cancelTweet = function(){
                      scope.current = null;
                      scope.status = null;
                      scope.modal.hide();
                      scope.modal.remove();
                    };

                    scope.submitReply = function(status){
                      status = '@' + scope.current.value.userSn + ' ' + status;
                      connectedService.twitter.isTwitterAuthenticated().then(function(authenticated){
                        if(authenticated){
                          connectedService.twitter.postTweet(status, scope.current.value.id_str).then(function(data){
                            if(data){
                                dataApi.getPerson(scope.appUser.id, 0).then(function(person){
                                var newTouch = new shuri_touch();
                                newTouch.description = status;
                                newTouch.name = 'Touch ' + status;
                                newTouch.userType_Id = _utConstants.tch_socialMediaPost;
                                newTouch.people.push(person);
                                newTouch.collection_Id = scope.appUser.privateCollection_Id;
                                dataApi.postTouch(newTouch, 'sendnow').then(function (data) {
                                  alert('You have submitted a reply to ' + scope.current.value.userSn)
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

                    scope.addTouch = function(tweet){
                      console.log(tweet);
                      var confirmPopup = $ionicPopup.confirm({
                          title: "Convert to Touch",
                          template: 'Are you sure you want to create a touch from this tweet?'
                      });
                      confirmPopup.then(function (res) {
                          if (res) {
                            // dataApi.getPerson(scope.appUser.id).then(function(person){
                            var promiseObj = {};
                            promiseObj.dataAppUser = dataApi.getPerson(scope.appUser.id, 0);
                            if(tweet.entityType == shuri_enums.entitytypes.person){
                                promiseObj.dataEntity = dataApi.getPerson(tweet.entity_Id, 0);
                            } else if(tweet.entityType == shuri_enums.entitytypes.organization){
                              promiseObj.dataEntity = dataApi.getOrg(tweet.entity_Id, appGlobals.guidEmpty, 0, "entityMedia");
                            }

                            $q.all(promiseObj).then(function (d) {

                              var appUser = d.dataAppUser;
                              var person = d.dataEntity;
                              appUser.changeType = 1;
                              person.changeType = 1;

                              var newTweet = angular.copy(tweet);
                              var newTouch = new shuri_touch();
                              var description = {description: newTweet.value.text, tw: true};
                              newTouch.description = angular.toJson(description);
                              newTouch.name = 'Touch ' + newTweet.value.text;
                              newTouch.userType_Id = _utConstants.tch_socialMediaPost;
                              newTouch.collection_Id = scope.appUser.privateCollection_Id;
                              newTouch.people.push(person);
                              newTouch.people.push(appUser);
                              tweet.currentEntity.touchCreated = true;
                              newTweet.currentEntity.touchCreated = true;
                              newTweet.value = angular.toJson(newTweet.value);
                              newTweet.changeType = 1;
                              newTouch.documents.push(newTweet);
                              console.log(newTouch);
                              dataApi.postTouch(newTouch, 'sendnow').then(function (data) {
                                newTweet.value = angular.fromJson(newTweet.value);
                                if(tweet.currentEntity.new){
                                  newTweet.currentEntity.new = false;
                                  newTweet.value.people.push(newTweet.currentEntity);
                                } else {
                                  for(var i = 0; i < newTweet.value.people.length; i++){
                                    if(newTweet.value.people[i].id == scope.appUser.id){
                                      newTweet.value.people[i].touchCreated = true;
                                    }
                                  }
                                }
                                newTweet.value = angular.toJson(newTweet.value);
                                dataApi.postEntity('documents', 'document', newTweet).then(function(doc){
                                  console.log(doc);
                                  // tweet.value = angular.fromJson(tweet.value);
                                })
                              });
                            });
                          }

                      });
                    };

                    scope.loadMore = function (type) {
                      if (scope.isScrolling || !scope.isPaged) return false;
                      else {
                        scope.isScrolling = true;

                        scope.page++;
                        console.log(appGlobals.utConstants);

                        if (type === "twitter") {
                          if (!scope.tweets) scope.tweets = [];
                          dataApi.getDocuments(appGlobals.utConstants.doc_twitterStream, scope.page, scope.pageSize).then(function (data) {
                              scope.filterTweets(data)
                          });
                        }
                        else if (type === "research") {
                          if (!scope.rssPosts) scope.rssPosts = [];
                          dataApi.getDocuments(appGlobals.utConstants.doc_researchItems, scope.page, scope.pageSize).then(function (data) {
                            finishLoadMore(data, type);
                          });
                        }
                      }
                    };

                    function finishLoadMore(data, type) {
                      scope.hasMore = (data.length == scope.pageSize);
                      if (type === "twitter") {
                        for(var i = 0; i < data.length; i++){
                          var doc_tweet = data[i];
                          if(doc_tweet.userType_Id == appGlobals.utConstants.doc_twitterStream){
                            doc_tweet.value = angular.fromJson(doc_tweet.value);
                            if(doc_tweet.value !== null && typeof doc_tweet.value === 'object') {
                              doc_tweet.value.newtimestamp = moment(Number(doc_tweet.value.timestamp)).format('MMMM Do, YYYY');
                              scope.tweets.push(doc_tweet);
                            }
                          }
                        }
                        // scope.tweets.push.apply(scope.tweets, data);
                        scope.isPaged = !(scope.page == 1 && scope.tweets.length == scope.tweetCount);
                        scope.isScrolling = false;
                      }
                      else if (type === "research") {
                        scope.filterResearch(data);
                        scope.isPaged = !(scope.page == 1 && scope.rssPosts.length == scope.postCount);
                        scope.isScrolling = false;
                      }
                      if (scope.entityType == shuri_enums.entitytypes.person) twitterSelected = true;
                    }



                    //#endregion



                }
            };
        }]);

})();
