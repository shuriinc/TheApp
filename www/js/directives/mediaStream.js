(function () {
  'use strict';

  angular.module("shuriApp").directive('mediaStream', ['$rootScope', '$state', '$stateParams',  '$ionicPopup', '$ionicModal', '$q', '$compile', '$filter', '$timeout', '$ionicListDelegate', '$ionicScrollDelegate', '$window', 'globals', 'dataApi', 'connectedService', 'appGlobals',
    function ($rootScope, $state, $stateParams, $ionicPopup, $ionicModal, $q, $compile, $filter, $timeout, $ionicListDelegate, $ionicScrollDelegate, $window, globals, dataApi, connectedService, appGlobals) {
      return {
        restrict: "E",
        scope: {
          entity: "=",
          entityType: "@"
        },
        templateUrl: "templates/directives/mediaStream.html?" + _cacheBuster,
        link: function (scope, elem, attrs) {
          //---- Initialize
          scope.pageTw = 0;
          scope.pageRs = 0;
          scope.pageAr = 0;
          scope.pageSize = 30;
          scope.hasMoreTw = true;
          scope.hasMoreRs = true;
          scope.hasMoreAr = true;
          scope.viewtab = "tw";

          scope.isDesktop = (!window.cordova);

          //#region Watchers
          var watcherE = scope.$watch('entity', function () {
            if (typeof scope.entity === "undefined" || scope.entity === null) return;
            Initialize();
          });

          var watcherC = scope.$watch('entityType', function () {
            if (typeof scope.entityType === "undefined" || scope.entityType === null) return;
            Initialize();
          });


          //#endregion

          //#region UI
          function Initialize() {
             if (!_twitter2Live) return;
            if (!scope.entity || !scope.entityType) return;

            if (!scope.isInitializing) {
              scope.isInitializing = true;
              try {
                scope.keyView = "collEntMediaStream"
                scope.keyOpen = "openMediaStream"
                if (scope.entityType >= 0) scope.isEntity = true;
                //console.log(scope.isEntity);
                if (scope.isEntity) {
                  scope.keyView += scope.entityType.toString();
                  scope.keyOpen += scope.entity.id.toString();
                }
                scope.smallScale = ($window.innerWidth <= appGlobals.widthSmall);
                //$ionicScrollDelegate.scrollTop();

                if ($window.innerHeight > appGlobals.widthMedium) scope.displayHeight = '475px';
                else scope.displayHeight = '352px';
                //scope.displayHeight = '200px';

                if (localStorage.getItem(scope.keyView)) scope.viewtab = localStorage.getItem(scope.keyView).toLowerCase();
                if (localStorage.getItem(scope.keyOpen) && localStorage.getItem(scope.keyOpen) == "true") scope.isOpen = true;

                //special case:  
                if ($state.current.name == "home.tag" && $stateParams.open && $stateParams.open == "media") scope.isOpen = true;

                AssignUI();

                dataApi.initialize("mediaStream").then(function (data) {
                  //console.log(data);
                  scope.appUser = data.appUser;
                  if (scope.isEntity) {
                    scope.loadMore();
                    scope.isInitializing = false;
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
                        scope.isInitializing = false;

                      });
                    });
                  }
                });
              }
              catch (e) { scope.isInitializing = false; }
            }
          }

          function AssignUI() {
            if (scope.isEntity && scope.viewtab == 'ar') scope.viewtab = "tw";
            switch (scope.viewtab) {
              case "tw":
                scope.classBackground = "bgPositiveLight";
                break;
              case "rs":
                scope.classBackground = "bgCalmLight";
                break;
              case "ar":
                scope.classBackground = "bgTeamLight";
                break;
            }
          }

          //#endregion

          scope.fullscreen = function (event) {
            if (event) event.stopPropagation();
            var filter = "";
            if (scope.viewtab == 'tw' && scope.preferences) filter = scope.preferences.filterObjTw
            if (!scope.viewtab == 'tw' && scope.preferences) filter = scope.preferences.filterObjRs;

            var strFilter = encodeURI(angular.toJson(filter));
            //console.log(strFilter);
            $state.go("modal.viewMedia", { entityType: scope.entityType, entityId: scope.entity.id, viewtab: scope.viewtab, mediaFilter: strFilter })
          }

          scope.switchView = function (view) {
            scope.initialized = false;
            scope.viewtab = view;
            AssignUI();

            localStorage.setItem(scope.keyView, view);
            summarizeFilters();
            $ionicScrollDelegate.$getByHandle('scrollMediaStream').scrollTop();
            loadMoreIfNeeded();
          }

          scope.filterChanged = function () {
            console.log(scope);
            summarizeFilters();
            scope.showSaveFilterButton = (scope.preferences.filterObjTw.groupId != appGlobals.guidEmpty || scope.preferences.filterObjTw.filterText.trim() != "");

            //if (!scope.viewtab == "tw") {
            //scope.showSaveFilterButton = (scope.preferences.filterObjRs.groupId != appGlobals.guidEmpty || scope.preferences.filterObjRs.filterText.trim() != "");
            //}
            //else {
            // 
            //}
          }

          function loadMoreIfNeeded() {
            switch (scope.viewtab) {
              case "tw":
                if (!scope.tweets) loadMoreTwitter();
                break;
              case "rs":
                if (!scope.rssPosts) loadMoreResearch();
                break;
              case "ar":
                if (!scope.artweets) loadMoreAR();
                break;
            }


          }

          scope.loadMore = function () {
            if (scope.isOpen && scope.appUser) {
              switch (scope.viewtab) {
                case "tw":
                  if (scope.hasMoreTw) loadMoreTwitter();
                  else finishLoading();
                  break;
                case "rs":
                  if (scope.hasMoreRs) loadMoreResearch();
                  else finishLoading();
                  break;
                case "ar":
                  if (scope.hasMoreAr) loadMoreAR();
                  else finishLoading();
               break;
              }
            }
            else finishLoading();
          };

          function loadMoreTwitter() {
            scope.pageTw++;
            if (!scope.isLoading) {
              scope.isLoading = true;
              var entityId = appGlobals.guidEmpty;
              var groupId = appGlobals.guidEmpty;
              var filterText = "";

              if (scope.isEntity) entityId = scope.entity.id;

              if (scope.preferences && scope.preferences.filterObjTw) {
                groupId = scope.preferences.filterObjTw.groupId;
                filterText = scope.preferences.filterObjTw.filterText;
              }

              dataApi.queryTwitter(entityId, [groupId], filterText, '', scope.pageTw, scope.pageSize).then(function (data) {
                //console.log(data);
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
                scope.hasMoreTw = (data.length == scope.pageSize);
                finishLoading();
              }, function () { finishLoading(); });

            }
          }

          function AddARTweet(tweet) {
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
            scope.artweets.push(tweet);


          }

          function loadMoreAR() {
            scope.pageAr++;
            if (!scope.isLoading) {
              scope.isLoading = true;
              if (!scope.artweets) scope.artweets = [];
              var entityId = appGlobals.guidEmpty;

              if (scope.isEntity) entityId = scope.entity.id;


              dataApi.queryTwitter(entityId, [], '', 'archat', scope.pageAr, scope.pageSize).then(function (data) {
                //console.log(data);
                data.forEach(function (tweet) {
                  AddARTweet(tweet)
                });
                dataApi.queryTwitter(entityId, [], '', 'analyst relations', scope.pageAr, scope.pageSize).then(function (data) {
                  data.forEach(function (tweet) {
                    AddARTweet(tweet)
                  });
                  scope.hasMoreAr = (data.length == scope.pageSize);
                  finishLoading();
                }, function () { finishLoading(); });
              });

            }
          }

          function loadMoreResearch() {
            scope.pageRs++;
            if (!scope.isLoading) {
              scope.isLoading = true;
              var entityId = appGlobals.guidEmpty;

              if (scope.isEntity) entityId = scope.entity.id;
              dataApi.queryMedia(entityId, "", scope.pageRs, scope.pageSize).then(function (data) {
                //console.log(data);
                data.forEach(function (item) {
                  item.valueObj = angular.fromJson(item.value);
                  item.valueObj.fmtDate = moment(item.valueObj.date).format('MMMM Do, YYYY');
                  //item.valueObj.description = HtmlToPlaintext(item.valueObj.description)
                  if (item.entityType != shuri_enums.entitytypes.organization) item.entityType = shuri_enums.entitytypes.organization;
                });

                if (!scope.rssPosts) scope.rssPosts = data;
                else scope.rssPosts.push.apply(scope.rssPosts, data);
                scope.hasMoreRs = (data.length == scope.pageSize);
                finishLoading();
              }, function () { finishLoading(); });

            }
          }

          function finishLoading() {
            $rootScope.$broadcast('scroll.infiniteScrollComplete');
            scope.isLoading = false;
          }

          //#region Filters
          scope.toggleFilter = function () {
            scope.showFilter = (!scope.showFilter);
          }

          scope.clearFilter = function () {
            var filterObj = scope.preferences.filterObjTw;
            if (!scope.viewtab == "tw") filterObj = scope.preferences.filterObjRs;

            filterObj.groupId = appGlobals.guidEmpty;
            var prefname;
            if (!scope.viewtab == "tw") {
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
          //switch (scope.viewtab) {
          //  case "tw":
          //    break;
          //  case "re":
          //    break;
          //  case "rs":
          //    break;
          //} 

          scope.cancelTwitterFilter = function () {
            scope.showFilter = false;
          };

          scope.saveFilter = function () {
            summarizeFilters();
            refreshDocs();
            scope.showFilter = false;
            var prefname, prefValue;
            if (!scope.viewtab == "tw") {
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
            switch (scope.viewtab) {
              case "tw":
                scope.tweets = [];
                scope.pageTw = 0;
                scope.hasMoreTw = true;
                break;
              case "rs":
                scope.pageRs = 0;
                scope.hasMoreTw = true;
                scope.rssPosts = [];
                break;
              case "ar":
                scope.artweets = [];
                scope.pageTw = 0;
                scope.hasMoreAr = true;
                break;
            }
            scope.loadMore();
            //$ionicScrollDelegate.scrollTop();

          }
          //#endregion

          //#region Button events
          scope.toggleOpen = function () {
            scope.isOpen = !scope.isOpen;
            if (scope.isOpen) {
              localStorage.setItem(scope.keyOpen, "true");
              loadMoreIfNeeded();
            }
            else if (localStorage.getItem(scope.keyOpen)) localStorage.removeItem(scope.keyOpen);
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
              var filterObj = scope.preferences.filterObjTw;
              if (scope.viewtab == "tw") filterObj = scope.preferences.filterObjTw;
              else filterObj = scope.preferences.filterObjRs;

              if (filterObj.groupId != appGlobals.guidEmpty) {
                scope.privateGroups.forEach(function (grp) {
                  if (grp.id.toLowerCase() === filterObj.groupId.toLowerCase()) name = grp.name;
                });
                str += "Group: " + name + " ";
              }
              if (filterObj.filterText.trim() != "") str += "Keyword: " + filterObj.filterText + " ";

              if (str === "") {
                scope.filterSummary = "None";
                scope.showClearFilterButton = false;
              }
              else {
                scope.filterSummary = str;
                scope.showClearFilterButton = true;
              }

            }

          }

          scope.wordFor = function (word) { return globals.wordFor(word); };


          //#endregion

          $rootScope.$on('HardRefresh', function (event) {
            scope.isOpen = false;
          });

          $rootScope.$on('RefreshMain', function (event, beQuiet) {
            //console.log(beQuiet);
            scope.pageTw = 0;
            scope.pageRs = 0;
            scope.pageAr = 0;
            scope.hasMoreTw = true;
            scope.hasMoreRs = true;
            scope.hasMoreAr = true;
            scope.tweets = [];
            scope.artweets = [];
            scope.rssPosts = [];

          });

        }
      };
    }]);

})();
