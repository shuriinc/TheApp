(function () {
  'use strict';

  angular.module("shuriApp").directive('mediaFeed', ['$rootScope', '$ionicPopup', '$ionicModal', '$q', '$state', '$compile', '$filter', '$timeout', '$ionicListDelegate', '$ionicScrollDelegate', '$window', 'globals', 'dataApi', 'connectedService', 'appGlobals',
    function ($rootScope, $ionicPopup, $ionicModal, $q, $state, $compile, $filter, $timeout, $ionicListDelegate, $ionicScrollDelegate, $window, globals, dataApi, connectedService, appGlobals) {
      return {
        restrict: "E",
        scope: {
          entity: "=",
          entityType: "@"
        },
        templateUrl: "templates/directives/mediaFeed.html?" + _cacheBuster,
        link: function (scope, elem, attrs) {
          //---- Initialize
          scope.pageTw = 0;
          scope.pageRs = 0;
          scope.pageSize = 30;
          scope.hasMore = true;
          scope.isTwitter = true;
          scope.entityType = -1
          scope.isEntity = false;
          scope.isDesktop = (!window.cordova);

          //#region Watchers
          var watcherE = scope.$watch('entity', function () {
            if (typeof scope.entity === "undefined" || scope.entity === null) return;
            AssignUI();
          });

          var watcherC = scope.$watch('entityType', function () {
            if (typeof scope.entityType === "undefined" || scope.entityType === null) return;
            AssignUI();
          });


          //#endregion

          //#region UI
          function AssignUI() {
            if (!scope.entity || !scope.entityType) return;
            if (!scope.initialized) {
              scope.initialized = true;
              //console.log(scope.entity, scope.entityType);

              scope.keyView = "collEntMediaView"
              scope.keyOpen = "openMedia"
              if (scope.entityType > 0) scope.isEntity = true;
              if (scope.isEntity) {
                scope.keyView += scope.entityType.toString();
                scope.keyOpen += scope.entityType.toString();
              }
              scope.smallScale = ($window.innerWidth <= appGlobals.widthSmall);
              //$ionicScrollDelegate.scrollTop();

              if ($window.innerHeight > appGlobals.widthMedium) scope.displayHeight = '475px';
              else scope.displayHeight = '352px';
              //scope.displayHeight = '200px';

              if (localStorage.getItem(scope.keyView) && localStorage.getItem(scope.keyView) == "research") scope.isTwitter = false;
              if (sessionStorage.getItem(scope.keyOpen) && sessionStorage.getItem(scope.keyOpen) == "true") scope.isOpen = true;

              dataApi.initialize("mediaFeed").then(function (data) {

                scope.appUser = data.appUser;
                if (scope.isEntity) {
                  scope.loadMore();
                }
                else {
                  dataApi.getPrivateGroupsForEntity(-1, appGlobals.guidEmpty).then(function (data) {
                    scope.privateGroups = $filter('filter')(data, function (grp) { return grp.grpType == 0; });
                    var allGroup = new shuri_group();
                    allGroup.name = 'All Groups';
                    allGroup.id = appGlobals.guidEmpty;
                    scope.privateGroups.push(allGroup);

                    dataApi.getUserPreferences().then(function (data) {
                      scope.preferences = data;
                      summarizeFilters();
                      scope.loadMore();

                    });
                  });
                }
              });
            }

          }
          //#endregion

          scope.fullscreen = function (event) {
            if (event) event.stopPropagation();
            var filter = "";
            if (scope.isTwitter && scope.preferences) filter = scope.preferences.filterObjTw
            if (!scope.isTwitter && scope.preferences) filter = scope.preferences.filterObjRs;

            var strFilter = encodeURI(angular.toJson(filter));
            //console.log(strFilter);
            $state.go("modal.viewMedia", { entityType: scope.entityType, entityId: scope.entity.id, media: (scope.isTwitter ? "Twitter" : "RSS"), mediaFilter: strFilter })
          }

          scope.switchView = function (view) {
            if (view === 'research') scope.isTwitter = false;
            else scope.isTwitter = true;

            if ((scope.isTwitter && !scope.tweets) || (!scope.isTwitter && !scope.rssPosts)) scope.loadMore();

            localStorage.setItem(scope.keyView, view);
            summarizeFilters();
            $ionicScrollDelegate.$getByHandle('scrollMediaFeed').scrollTop();
          }

          scope.filterChanged = function () {
            summarizeFilters();

            if (!scope.isTwitter) {
              scope.showSaveFilterButton = (scope.preferences.filterObjRs.groupId != appGlobals.guidEmpty || scope.preferences.filterObjRs.filterText.trim() != "");
            }
            else {
              scope.showSaveFilterButton = (scope.preferences.filterObjTw.groupId != appGlobals.guidEmpty || scope.preferences.filterObjTw.filterText.trim() != "");
            }
          }

          scope.loadMore = function () {
            if (scope.hasMore && scope.isOpen) {
              if (scope.isTwitter) loadMoreTwitter();
              else loadMoreResearch();

            }
          };

          function loadMoreTwitter() {
            scope.pageTw++;

            console.log(appGlobals.guidDocTwitter, groupId, filterText, scope.pageTw, scope.pageSize);
            if (!scope.isEntity) {
              var groupId = scope.preferences.filterObjTw.groupId;
              var filterText = scope.preferences.filterObjTw.filterText;
              dataApi.getDocumentsExt(appGlobals.guidDocTwitter, groupId, filterText, scope.pageTw, scope.pageSize).then(function (data) {
                console.log(data);
                finishLoadingTwitter(data);
              });
            }
            else {
              dataApi.documentsForEntity(scope.entityType, scope.entity.id, appGlobals.guidDocTwitter, scope.pageTw, scope.pageSize).then(function (data) {
                finishLoadingTwitter(data);
              });

            }
          }

          function finishLoadingTwitter(data) {
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
            data.forEach(function (tweet) {
              tweet.createdDtLoc = new Date(tweet.createdDt + "Z");
              tweet.valueObj = angular.fromJson(tweet.value);
              tweet.valueObj.newtimestamp = moment(Number(tweet.valueObj.timestamp)).format('MMMM Do, YYYY');
              if (tweet.valueObj.people) {
                tweet.valueObj.people.forEach(function (person) {
                  if (person.id.toLowerCase() === scope.appUser.id.toLowerCase()) {
                    tweet.currentEntity = person;
                    tweet.currentEntity.isNew = false;
                  }
                });
              }
              else tweet.currentEntity = { id: scope.appUser.id, isNew: true, people: [] };


            });

            if (!scope.tweets) scope.tweets = data;
            else scope.tweets.push.apply(scope.tweets, data);
            scope.hasMore = (data.length == scope.pageSize);

          }

          function loadMoreResearch() {
            scope.pageRs++;
            if (!scope.isEntity) {
              var groupId = scope.preferences.filterObjRs.groupId;
              var filterText = scope.preferences.filterObjRs.filterText;
              dataApi.getDocumentsExt(appGlobals.guidDocResearch, groupId, filterText, scope.pageRs, scope.pageSize).then(function (data) {
                finishLoadingResearch(data);
              });
            }
            else {
              dataApi.documentsForEntity(scope.entityType, scope.entity.id, appGlobals.guidDocResearch, scope.pageRs, scope.pageSize).then(function (data) {
                //console.log(data);
                finishLoadingResearch(data);
              });
            }
          }

          function finishLoadingResearch(data) {
            data.forEach(function (item) {
              item.valueObj = angular.fromJson(item.value);
              item.valueObj.fmtDate = moment(item.valueObj.date).format('MMMM Do, YYYY');
              item.valueObj.description = HtmlToPlaintext(item.valueObj.description)
              if (item.entityType != shuri_enums.entitytypes.organization) item.entityType = shuri_enums.entitytypes.organization;
            });

            if (!scope.rssPosts) scope.rssPosts = data;
            else scope.rssPosts.push.apply(scope.rssPosts, data);
            scope.hasMore = (data.length == scope.pageSize);
            $rootScope.$broadcast('scroll.infiniteScrollComplete');

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
                alert("You must log into twitter to like a tweet")
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
                alert('You must log into twitter to reply to a tweet in your feed');
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
          //#endregion

          //#region Filters
          scope.toggleFilter = function () {
            scope.showFilter = (!scope.showFilter);
          }

          scope.clearFilter = function () {
            var filterObj = scope.preferences.filterObjTw;
            if (!scope.isTwitter) filterObj = scope.preferences.filterObjRs;

            filterObj.groupId = appGlobals.guidEmpty;
            var prefname;
            if (!scope.isTwitter) {
              prefname = "filterObjRs";
            }
            else {
              prefname = "filterObjTw";
            }
            dataApi.deleteUserPreference(prefname, true).then(function (data) {
              filterObj.filterText = '';
              refreshDocs();
              scope.showFilter = false;
              scope.filterChanged();
              dataApi.clearCacheItem("userpreferences");
              //$ionicScrollDelegate.scrollTop();
            }, function (err) { console.error(err); });



          };

          scope.cancelTwitterFilter = function () {
            scope.showFilter = false;
          };

          scope.saveFilter = function () {
            summarizeFilters();
            refreshDocs();
            scope.showFilter = false;
            var prefname, prefValue;
            if (!scope.isTwitter) {
              prefname = "filterObjRs";
              prefValue = angular.toJson(scope.preferences.filterObjRs);
            }
            else {
              prefname = "filterObjTw";
              prefValue = angular.toJson(scope.preferences.filterObjTw);
            }
            dataApi.postUserPreference(prefname, prefValue, true).then(function (data) {
              scope.appUser = data;
            });
          }

          function refreshDocs() {
            if (scope.isTwitter) {
              scope.tweets = null;
              scope.pageTw = 0;
            }
            else {
              scope.pageRs = 0;
              scope.rssPosts = null;
            }
            scope.loadMore();
            //$ionicScrollDelegate.scrollTop();

          }
          //#endregion

          //#region Button events
          scope.toggleOpen = function () {
            scope.isOpen = !scope.isOpen;
            if (scope.isOpen) {
              sessionStorage.setItem(scope.keyOpen, "true");
              if ((scope.isTwitter && !scope.tweets) || (!scope.isTwitter && !scope.rssPosts)) scope.loadMore();
            }
            else if (sessionStorage.getItem(scope.keyOpen)) sessionStorage.removeItem(scope.keyOpen);
          }

          scope.cancelTweet = function () {
            scope.current = null;
            scope.status = null;
            scope.replyModal.hide();
            scope.replyModal.remove();
          };

          scope.addTouch = function (tweet) {
            $state.go('home.touchEdit', { id: appGlobals.guidEmpty, entityId: tweet.id, entityType: 1, collectionId: scope.appUser.defaultCollection_Id, returnState: 'goBack' });
          }

          scope.goToRss = function (url) {
            if (url.indexOf('http') >= 0) {
              var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
            }
            else {
              var win = window.open("http://" + url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
            }
          };

          scope.goToOrg = function (id) {
            $state.go("home.org", { "groupId": id });
          };

          scope.goToUrl = function (tweet) {
            if (tweet.entityType == shuri_enums.entitytypes.person) {
              $state.go("home.person", { "personId": tweet.entity_Id });
            } else if (tweet.entityType == shuri_enums.entitytypes.organization) {
              $state.go("home.org", { "groupId": tweet.entity_Id });
            }
          };

          //#endregion

          //#region Helpers
          function summarizeFilters() {
            if (!scope.isEntity) {
              var str = "", name = "";
              var filterObj = null;
              if (scope.isTwitter) filterObj = scope.preferences.filterObjTw;
              else filterObj = scope.preferences.filterObjRs;

              if (filterObj.groupId != appGlobals.guidEmpty) {
                scope.privateGroups.forEach(function (grp) {
                  if (grp.id.toLowerCase() === filterObj.groupId.toLowerCase()) name = grp.name;
                });
                str += "Group: " + name + " ";
              }
              if (filterObj.filterText.trim() != "") str += "Keyword: " + filterObj.filterText + " ";

              if (str === "") scope.filterSummary = "None";
              else scope.filterSummary = str;
            }

          }

          scope.wordFor = function (word) { return globals.wordFor(word); };


          //#endregion

          $rootScope.$on('HardRefresh', function (event) {
            scope.isOpen = false;
          });

        }
      };
    }]);

})();
