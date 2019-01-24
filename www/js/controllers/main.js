(function () {
    'use strict';

    angular.module("shuriApp").controller('MainCtrl', ['appGlobals', 'connectedService', '$ionicPopup', '$scope', '$rootScope', '$state', '$stateParams', '$sce', '$timeout', '$window', '$filter', '$q', '$http', '$ionicActionSheet', '$ionicModal', '$ionicScrollDelegate', '$ionicLoading', 'globals', 'dataApi', MainCtrl]);

    function MainCtrl(appGlobals, connectedService, $ionicPopup, $scope,$rootScope, $state, $stateParams, $sce, $timeout, $window, $filter, $q, $http, $ionicActionSheet, $ionicModal, $ionicScrollDelegate, $ionicLoading, globals, dataApi) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.onDesktop = !(window.cordova);
        vm.isLoading = true;
      vm.title = "Shuri Home";
      vm.currentDS = dataApi.currentDS();
      vm.appVersion = "Shuri App " + _appVersion;
      vm.year = moment().format("YYYY");

      vm.twitter2Live = _twitter2Live;

        //console.log('Loading...');

        vm.test = function () {
            var url = "https://api.shuri.com/api/sendgridevent";
            console.log(url);
            var newobj = new shuri_group();
            $http({
                method: 'POST',
                url: url,
                data: angular.toJson(newobj),
                headers: { 'Content-Type': 'text/json' }
            })
        .success(function (data) {
          console.log(data);
      })
      .error(function (data, status, headers, config) {
          console.log("test", data, status, headers, config);
      });

            return;
        }

        //#region Twitter Support
        vm.giveTwitterFeedback = function () {
            // new twitter feedback
            $ionicModal.fromTemplateUrl('/templates/modals/twitterFeedback.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                vm.modal = modal;
                vm.modal.show();
                connectedService.twitter.isTwitterAuthenticated().then(function (authenticated) {
                    //console.log(authenticated);
                    if (authenticated) {
                        vm.step = 1;
                    } else {
                        vm.step = 0;
                    }
                });
            });
        };

        vm.authenticateTwitter = function () {
            $ionicLoading.show({ template: 'Accessing Twitter...' });
            connectedService.twitter.twitterInitialize().then(function (result) {
                if (result === true) {
                    vm.step = 1;
                    $ionicLoading.hide();

                } else {
                    alert("There was an error with your credentials")
                    $ionicLoading.hide();
                }
            })
        };

        vm.submitTweet = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Send Tweet?',
                template: "You are about to send this tweet. Continue?"
            });
            confirmPopup.then(function (res) {
                if (!res) return;
                else {
                    $ionicLoading.show({ template: 'Accessing Twitter...' });
                    vm.twitterFeedback = '@ShuriApp ' + vm.twitterFeedback;
                    var tweet = new shuri_touch();
                    tweet.userType_Id = appGlobals.utConstants.tch_twitter;
                    tweet.people.push(vm.appUser);
                    tweet.collection_Id = vm.appUser.defaultCollection_Id;
                    tweet.description = vm.twitterFeedback;
                    tweet.name = 'Tweet - Feedback';
                    dataApi.postTouch(tweet, 'sendnow').then(function () {
                        connectedService.twitter.postTweet(vm.twitterFeedback).then(function () {
                            //console.log("send the tweet");
                            vm.twitterFeedback = '';
                            $ionicLoading.hide();
                            alert('Your Tweet has been sent to the Shuri Devs team. Thank you.')
                            vm.modal.hide();
                            vm.modal.remove();
                        })
                    })
                }
            });
        }

        vm.closeModal = function () {
            vm.modal.hide();
            vm.modal.remove();
        };

        function checkForCredentials() {
            //var tokenObj = $location.search();
            //if (tokenObj.oauth_token && tokenObj.oauth_token_secret && tokenObj.screen_name) {
            //    connectedService.storeUserToken(tokenObj, 'Twitter').then(function () {
            //        $location.search('oauth_token', null);
            //        $location.search('oauth_token_secret', null);
            //        $location.search('screen_name', null);
            //        dataApi.refreshAppUser();
            //    });
            //} else if (tokenObj.access_token && tokenObj.screen_name && tokenObj.service) {
            //    if (tokenObj.service == 'linkedin') {
            //        connectedService.storeUserToken(tokenObj, 'Linkedin').then(function () {
            //            $location.search('oauth_token', null);
            //            $location.search('screen_name', null);
            //            $location.search('service', null);
            //            dataApi.refreshAppUser();
            //        });
            //    } else if (tokenObj.service == 'facebook') {
            //        connectedService.storeUserToken(tokenObj, 'Facebook').then(function () {
            //            $location.search('oauth_token', null);
            //            $location.search('screen_name', null);
            //            $location.search('service', null);
            //            dataApi.refreshAppUser();
            //        });
            //    }
            //}
        }


        //#endregion

        //#region Data
        vm.hardRefresh = function (beQuiet) {
            vm.isLoading = true;
            vm.searchString = "";
            vm.showSearchResults = false;
            vm.hardRefreshStart = moment();
            $rootScope.$broadcast('HardRefresh');

            //if (!beQuiet) $ionicLoading.show({ template: "Refreshing..." });
            dataApi.clearCache();
            dataApi.refreshAppUser().then(function () {
                dataApi.initialize().then(function (data) {
                    refreshRecents();
                    refreshGroups();
                });
            });
        };


        //function checkSubscriptions() {
        //    dataApi.getAppUser().then(function (data) {
        //        vm.appUser = data;
        //        //console.log(vm.appUser);
        //        for (var i = 0; i < vm.appUser.subscriptions.length; i++) {
        //            var sub = vm.appUser.subscriptions[i];
        //            var subscriber = sub.subscribers[0];
        //            if (subscriber) {
        //                if (subscriber.endDt < (new Date(Date.now()).toISOString())) {
        //                    console.log(sub, subscriber);
        //                    if (ionic.Platform.isIOS()) {
        //                        var senddata = { receipt: subscriber.receipt }
        //                        console.log("updating receipt before renewal");
        //                        dataApi.getReceiptIOS(senddata).then(function (receipt) {
        //                            // only returns current subscriptions
        //                            var receipts = receipt.data.receipts;
        //                            sub.renew = false;
        //                            for (var j = 0; j < receipts.length; j++) {
        //                                //   // need to swap out transactionId for productId in subscriber
        //                                //   // if we find one that matches productId, there was a renewal, need to update expiration and post
        //                                if (receipts[j].productId === subscriber.productId) {
        //                                    console.log("going to renew here");
        //                                    subscriber.endDt = new Date(Number(receipts[j].expirationDate)).toUTCString();
        //                                    console.log(subscriber, 'sending this', sub);
        //                                    dataApi.subscribe(subscriber).then(function () {
        //                                        dataApi.refreshAppUser();
        //                                    });
        //                                    console.log("renewed", sub);
        //                                    sub.renew = true;
        //                                };
        //                            };
        //                            console.log(sub);
        //                            if (!sub.renew) {
        //                                console.log('we are unsubscribing now', sub);
        //                                dataApi.clearCache();
        //                                //$ionicHistory.clearCache();
        //                                dataApi.unsubscribe(sub.id).then(function () {
        //                                    dataApi.refreshAppUser().then(function () {
        //                                        refreshGroups()
        //                                    });
        //                                })
        //                            };
        //                        });
        //                    } else if (ionic.Platform.isAndroid()) {
        //                        var data = {
        //                            receipt: subscriber.receipt,
        //                            signature: subscriber.signature
        //                        }
        //                        dataApi.getReceiptAndroid(data).then(function (data) {
        //                            var receipt = data.data.receipt;
        //                            if (receipt.endDt < (new Date(Date.now()).toUTCString())) {
        //                                dataApi.unsubscribe(sub.id).then(function () {
        //                                    dataApi.refreshAppUser().then(function () {
        //                                        refreshGroups();
        //                                    })
        //                                })
        //                            } else {
        //                                subscriber.endDt = receipt.endDt;
        //                                dataApi.subscribe(subscriber).then(function () {
        //                                    dataApi.refreshAppUser();
        //                                });
        //                            }
        //                        })
        //                        // go through the same process of renewal with android
        //                    };
        //                };
        //            }
        //        };
        //    });
        //}

        function refreshRecents() {
            dataApi.recent().then(function (data) {
                vm.recents = data;
            })
        }

        function refreshGroups() {
            //console.log("In");
            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataPrefs: dataApi.getUserPreferences(),
                dataMyGroups: dataApi.getMyGroups()
        })
                .then(function (d) {
                    vm.isLoading = false;
                    $ionicLoading.hide();
                    $scope.$broadcast('scroll.refreshComplete');

                    //------AppUser
                    vm.appUser = d.dataAppUser;
                    var subs = 0;
                    //console.log(vm.appUser);
                    vm.appUser.subscriptions.forEach(function (sub) {
                        if (!(sub.group_Id.toLowerCase() == appGlobals.guidEmpty.toLowerCase() && sub.id.toLowerCase() == appGlobals.guidEmpty.toLowerCase())) subs++;

                        if (sub.familyId && sub.familyId.toLowerCase() == "shuriar") {
                            vm.hasAR = true;
                            //Media only shows with AR Database
                            vm.appUser.subscriptionIds.forEach(function (id) {
                                if (sub.group_Id.toLowerCase() == id.toLowerCase()) vm.showMedia = true;
                            });
                        }
                    });

                  vm.appUser.showMedia = false;

                    vm.showMedia = vm.appUser.showMedia;
                    var subIds = 0;
                    vm.appUser.subscriptionIds.forEach(function (id) {
                        if (!(id.toLowerCase() == appGlobals.guidEmpty.toLowerCase() || id.toLowerCase() == appGlobals.guidSystem.toLowerCase())) subIds++;
                    });

                  console.log(subIds, subs, vm.appUser);
                    if (subs != subIds) vm.defaultWarning = String.format("{0} of {1}", subIds, subs);
                    else vm.defaultWarning = "";

                    try {
                        vm.isStaging = (appGlobals.slottype == shuri_enums.slottype.staging);
                        vm.isStagingAPI = (dataApi.currentDS().name == "Staging" && (vm.isStaging || (appGlobals.slottype == shuri_enums.slottype.production)));
                        //console.log(appGlobals.slottype, vm.isStaging, vm.isStagingAPI);
                    }
                    catch (e) { console.error(e); }

                    //-----preferences
                    vm.preferences = d.dataPrefs;
                  if (vm.preferences && vm.preferences.calsync) vm.hideOutlook = true;
                 // console.log(vm.preferences, vm.preferences.calsync, vm.onDesktop);

                    if (!vm.loadedOnce) {
                        setExpanded();
                        vm.loadedOnce = true;
                    }

                    $timeout(lazyLoadTeams(d.dataMyGroups), 50);
                    $timeout(lazyLoadGroups(d.dataMyGroups), 100);

                

                }, function (err) {
                    vm.isLoading = false;
                    $ionicLoading.hide();
                    $scope.$broadcast('scroll.refreshComplete');
                    globals.showAlert("API Error", err);

                }
            );

        }

        function lazyLoadTeams() {
          vm.teams = [];
          dataApi.getTeams().then(function (data) {
            vm.teams = data;
            vm.teams.forEach(function (grp) {
              var key = "openMainGroup" + grp.id;
              if (sessionStorage.getItem(key)) grp.isOpen = true;
              //if (vm.appUser.isSysAdmin && grp.name != 'Favorites') grp.updatable = true;
            });


          });
        }

        function lazyLoadGroups(grps) {
          var clones = grps.slice(0);
          appGlobals.userPrivateGroups = $filter("filter")(grps, function (g) {
            return g.grpType == shuri_enums.grouptype.private;
          });

          vm.privateGroups = [];
          vm.databases = [];
          //console.log(clones);
          clones.forEach(function (grp) {
            grp.orderer = getOrderer(grp);
            if (grp.name == "Favorites") grp.updatable = false;

            //------------open state UI 
            var key = "openMainGroup" + grp.id;
            if (sessionStorage.getItem(key)) grp.isOpen = true;
            dataApi.getGroupCounts(grp.id).then(function (data) {
              //console.log(data);
              grp.peopleCount = data.peopleCount;
              grp.orgsCount = data.orgsCount;
              grp.tagsCount = data.tagsCount;
              grp.touchesCount = data.touchesCount;
              if (grp.grpType == shuri_enums.grouptype.private) {
                if (!ArrayContainsById(vm.privateGroups, grp.id)) vm.privateGroups.push(grp);
              }
              else if (grp.grpType == shuri_enums.grouptype.collection) {
                if (!ArrayContainsById(vm.databases, grp.id)) vm.databases.push(grp);
              }
              else (console.error("unhandled grptype"));
            });

          });

          //--------------private groups
        }

        function getOrderer(grp) {
            var ord = "2"; //default
            if (grp.id == vm.appUser.defaultCollection_Id) ord = "0";
            //else if (grp.updatable) ord = "1";

            if (grp.name == "Favorites") ord = "9";

            return ord + grp.name;
        }

        //#endregion

        //#region UI
        function setExpanded() {
            var openDBs = false;
            var openTeams = false;
            var openGroups = false;
            var openHelp = false;
            var openRecent = false;
            if (sessionStorage.getItem("openTeams")) openTeams = true;
            if (sessionStorage.getItem("openDBs")) openDBs = true;
            if (sessionStorage.getItem("openRecent")) openRecent = true;
            if (sessionStorage.getItem("openGroups")) openGroups = true;
            if (sessionStorage.getItem("openHelp")) openHelp = true;

            vm.openDBs = openDBs;
            vm.openTeams = openTeams;
            vm.openGroups = openGroups;
            vm.openHelp = openHelp;
            vm.openRecent = openRecent;
        }

        vm.resetExpanded = function () {
            for (var key in sessionStorage) {
                if (key.length > 4 && key.substring(0, 4).toLowerCase() == "open") sessionStorage.removeItem(key);
            }
            for (var key in localStorage) {
              if (key.length > 4 && key.substring(0, 4).toLowerCase() == "open") localStorage.removeItem(key);
              
            }

            //resets from directives
            for (var key in sessionStorage) {
                if (key.length > 7 && key.substring(0, 7).toLowerCase() == "collent") sessionStorage.removeItem(key);
            }

            setExpanded();
        }

        vm.toggleDiv = function (grp) {
            if (grp === 'teams') {
                vm.openTeams = !vm.openTeams;
                if (vm.openTeams) sessionStorage.setItem("openTeams", "true");
                else sessionStorage.removeItem("openTeams");
            }
            else if (grp === 'recent') {
                vm.openRecent = !vm.openRecent;
                if (vm.openRecent) sessionStorage.setItem("openRecent", "true");
                else sessionStorage.removeItem("openRecent");
            }
            else if (grp === 'dbs') {
                vm.openDBs = !vm.openDBs;
                if (vm.openDBs) sessionStorage.setItem("openDBs", "true");
                else sessionStorage.removeItem("openDBs");
            }
            else if (grp === 'groups') {
                vm.openGroups = !vm.openGroups;
                if (vm.openGroups) sessionStorage.setItem("openGroups", "true");
                else sessionStorage.removeItem("openGroups");
            }
            else if (grp === 'help') {
                vm.openHelp = !vm.openHelp;
                if (vm.openHelp) sessionStorage.setItem("openHelp", "true");
                else sessionStorage.removeItem("openHelp");
            }
            else {
                grp.isOpen = !grp.isOpen;
                var stash = grp;
                grp = null;
                grp = stash;
                var key = "openMainGroup" + grp.id;
                if (grp.isOpen) sessionStorage.setItem(key, "true");
                else if (sessionStorage.getItem(key)) sessionStorage.removeItem(key);

            }
        };

        //#endregion

        //#region Add New
        vm.openAddTeam = function (event) {
            if (event) event.stopPropagation();
            $state.go("modal.newGroup", { grpType: shuri_enums.grouptype.team, randomizer: RandomInt(1,999999)});
        }

        vm.openAddGroup = function (event) {
            if (event) event.stopPropagation();
            $state.go("modal.newGroup", { grpType: shuri_enums.grouptype.private, randomizer: RandomInt(1, 999999) });
        }

        vm.openAddDB = function (event) {
            if (event) event.stopPropagation();
            $state.go("modal.newGroup", { grpType: shuri_enums.grouptype.collection, randomizer: RandomInt(1, 999999) });
        }

        
        //#endregion


        //#region Events
        vm.goTo = function (event, group) {
            if (event) event.stopPropagation();
            $state.go('home.groupEdit', { id: group.id });
        }

        vm.getDBs = function () {
            $state.go("home.inappPurchases");
        }

        vm.helpModal = function (nestedModal) {
            $scope.$parent.vmMaster.help(nestedModal);
        }

        vm.makeDefault = function (grp) {
            dataApi.setDefaultCollection(grp.id).then(function (data) {
                $ionicLoading.show({ template: "Default database is now: " + grp.name, duration: 2500 });
                //console.log(vm.group);
                //reload user to get new default
                //dataApi.getAppUser().then(function (data) {
                //vm.appUser = data;
                //var confirmPopup = $ionicPopup.alert({
                //    title: 'New Default DB',
                //    template: vm.group.name + " is now your default database.  New items will be added to it unless otherwise specified."
                //});
                //confirmPopup.then(function (res) {
                //});

                //});
            });
//            vm.goBack();

        }

        vm.addinLink = function(event, linkname)
        {
            if (event) event.stopPropagation();
            var url = "http://shuri.com", target = '_blank';
            if (linkname  == "install") {
                url = "http://outlook.shuri.com/setup.exe";
                $window.open(url);
            }
            else $window.open(url, target);

        }

   

        //#endregion


        //#region Help------------------------------------------------

        vm.gettingStarted = function () {
            if (vm.onDesktop) window.open("https://www.youtube.com/watch?v=SjTitv_Wd5I", "about:blank", "_blank")
            else window.open("https://shuristoragemedia.blob.core.windows.net/public/betaGettingstarted.m4v", '_blank', 'location=no', 'closebuttoncaption=Return');
        };

        vm.getFeedback = function () {
            $window.location.href = "mailto:support@shuri.com?cc=cc@shuri.com&subject=Support%20and%20Feedback";
        }

        //#endregion

        //#region Autocomplete ------------------------------------------------
        vm.placeholderSearch = "Search for anyone/anything";
        vm.pause = 400;
        vm.minLength = 2;
        vm.searchString = "";
        vm.searchStringLast = null;
        vm.addTimer = null;
        vm.hideTimer = null;
        vm.searching = false;
        vm.showResults = false;
        vm.addGroupDuration = 2500;

        vm.keyPressedAdd = function (event, childscope) {
            //console.log(vm.searchString);

            if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                if (!vm.searchString || vm.searchString == "") {
                    vm.showResults = false;
                    vm.searchStringLast = null;
                } else if (isNewSearchNeeded(vm.searchString, vm.searchStringLast, vm.minLength)) {
                    vm.searchStringLast = vm.searchString;
                    vm.showResults = true;
                    vm.searchResults = [];

                    if (vm.addTimer) {
                        $timeout.cancel(vm.addTimer);
                    }

                    vm.searching = true;

                    vm.addTimer = $timeout(function () {
                        vm.timerAddComplete(vm.searchString);
                    }, vm.pause);
                }
            } else {
                event.preventDefault();
            }
            if (vm.searchString.length == 0) {
                vm.resetSearch();
            }
            //else if (vm.searchString.length == 1) {
            //    vm.searching = false;
            //    vm.showSearchResults = true;
            //    vm.searchResults = [];
            //}

        };

        vm.resetSearch = function () {
            vm.searching = false;
            vm.showSearchResults = false;
            vm.searchResults = [];
            $ionicScrollDelegate.scrollTop();

        }

        vm.resetHideResults = function (mode) {
            if (vm.hideTimer) {
                $timeout.cancel(vm.hideTimer);
            };
        };

        vm.hideResults = function () {
            vm.hideTimer = $timeout(function () {
                vm.showResults = false;
            }, vm.pause);
        };

        vm.selectAddResult = function (result) {
            //vm.searchString = "";
            //vm.showSearchResults = false;
            var goState = "";
            var params = null;
            switch (result.entityType) {
                case shuri_enums.entitytypes.person:
                    goState = "home.person";
                    params = { personId: result.id };
                    break;
                case shuri_enums.entitytypes.organization:
                    goState = "home.org";
                    params = { groupId: result.id };
                    break;
                case shuri_enums.entitytypes.touch:
                    goState = "home.touch";
                    params = { id: result.id };
                    break;
                case shuri_enums.entitytypes.tag:
                    goState = "home.tag";
                    params = { tagId: result.id };
                    break;
                case shuri_enums.entitytypes.team:
                case shuri_enums.entitytypes.private:
                case shuri_enums.entitytypes.group:
                    goState = "home.groupEdit";
                    params = { id: result.id };
                    break;

            }
            if (goState != "") {
                $state.go(goState, params);
            }
        };

        function finishSelectAddResult() {
            vm.searchString = vm.searchStringLast = "";
            vm.addResultInProgress = false;
        }

        vm.timerAddComplete = function (str) {
            // Begin the search
            if (str.length >= vm.minLength) {
                vm.searching = true;
                dataApi.autocompleteAllEntity(str, 10).then(function (data) {
                    //data.forEach(function (res) {
                    //    switch (res.entityType) {
                    //        case shuri_enums.entitytypes.person:
                    //            res.cssClass = "bgEnergizedLight";
                    //            break;
                    //        case shuri_enums.entitytypes.organization:
                    //            res.cssClass = "bgCalmLight";
                    //            break;
                    //        case shuri_enums.entitytypes.touch:
                    //            res.cssClass = "bgBalancedLight";
                    //            break;
                    //        case shuri_enums.entitytypes.tag:
                    //            res.cssClass = "bgRoyalLight";
                    //            break;
                    //    }
                    //})
                    //console.log(data);
                    vm.searching = false;
                    vm.showSearchResults = true;
                    vm.searchResults = data;
                    $ionicScrollDelegate.scrollTop();

                });
            }
        };


        function isNewSearchNeeded(newTerm, oldTerm, minLength) {
            return newTerm.length >= minLength && newTerm != oldTerm;
        }

 
        //#endregion

        //#region Global Event 

        $scope.$on('$ionicView.enter', function () {
            vm.title = 'Home';

            //Open to a new group??
            if ($stateParams.showGroupId) {
                $timeout(function () {
                    vm.privateGroups.forEach(function (grp) {
                        if (grp.id == $stateParams.showGroupId) {
                            grp.isOpen = true;
                            var idElem = "privgrp" + grp.id
                            var elem = document.getElementById(idElem);
                            if (elem) elem.scrollIntoView();
                        }
                    });
                    vm.openGroups = true;
                }, 6000)
                console.log($stateParams.showGroupId);
            }
            globals.setHelpView('main');
            if (!vm.appUser) initializeMain();
            dataApi.initialize("main controller").then(function (data) {
                refreshRecents();
            });

        });

        $rootScope.$on('EntityChanged', function (event, data) {
            var foundIt = false;
            var idx, open;
            //console.log(data);
            if (data && data.toLowerCase) {
                data = data.toLowerCase();

                //favs?
                if (data === appGlobals.guidFavorites) {
                    dataApi.getFavorites().then(function (favs) {
                        for (var i = 0; i < vm.privateGroups.length; i++) {
                            if (vm.privateGroups[i].id === appGlobals.guidFavorites) {
                                open = vm.privateGroups[i].isOpen;
                                idx = i;
                                break;
                            }
                        };
                        //console.log(favs, idx);
                        if (idx >= 0) {
                            favs.isOpen = open;
                            favs.orderer = getOrderer(favs);
                            if (!favs.orgsCount) favs.orgsCount = favs.groups.length;
                            if (!favs.peopleCount) favs.peopleCount = favs.people.length;
                            if (!favs.tagsCount) favs.tagsCount = favs.tags.length;
                            vm.privateGroups.splice(idx, 1, favs);
                        }
                    });


                }
                else {
                    //private groups
                  var spliceIndex = -1;
                  if (vm.privateGroups) vm.privateGroups.forEach(function (grp) {
                        if (grp.id.toLowerCase() == data) {
                            foundIt = true;
                            dataApi.getGroup(grp.id, appGlobals.guidEmpty).then(function (refreshedGrp) {
                                for (var i = 0; i < vm.privateGroups.length; i++) {
                                    if (vm.privateGroups[i].id.toLowerCase() === data) {
                                        open = vm.privateGroups[i].isOpen;
                                        idx = i;
                                        break;
                                    }
                                };
                                if (idx >= 0) {
                                    refreshedGrp.isOpen = open;
                                    refreshedGrp.orderer = getOrderer(refreshedGrp);
                                    vm.privateGroups.splice(idx, 1, refreshedGrp);
                                }

                            });

                        }
                    });

                    //teams
                    if (!foundIt && vm.teams) vm.teams.forEach(function (grp) {
                        if (grp.id.toLowerCase() == data) {
                            foundIt = true;
                           // console.log(data);
                            dataApi.getGroup(grp.id, appGlobals.guidEmpty).then(function (refreshedGrp) {
                                for (var i = 0; i < vm.teams.length; i++) {
                                    if (vm.teams[i].id.toLowerCase() === data) {
                                        open = vm.teams[i].isOpen;
                                        idx = i;
                                        break;
                                    }
                                };
                                if (idx >= 0) {
                                    refreshedGrp.isOpen = open;
                                    refreshedGrp.orderer = getOrderer(refreshedGrp);
                                    //console.log(grp, data);
                                    vm.teams.splice(idx, 1, refreshedGrp);
                                }

                            });
                        }
                    });

                    //databases
                    if (!foundIt) vm.databases.forEach(function (grp) {
                        if (grp.id.toLowerCase() == data) {
                            foundIt = true;
                            dataApi.getGroup(grp.id, appGlobals.guidEmpty).then(function (refreshedGrp) {
                                //console.log(refreshedGrp);
                                for (var i = 0; i < vm.databases.length; i++) {
                                    if (vm.databases[i].id.toLowerCase() === data) {
                                        open = vm.databases[i].isOpen;
                                        idx = i;
                                        break;
                                    }
                                };
                                if (idx >= 0) {
                                    refreshedGrp.isOpen = open;
                                    refreshedGrp.orderer = getOrderer(refreshedGrp);
                                    vm.databases.splice(idx, 1, refreshedGrp);
                                }

                            });
                        }
                    });

                    //search results
                    if (!foundIt && vm.searchResults) vm.searchResults.forEach(function (entity) {
                        if (entity.id.toLowerCase() == data) {
                            foundIt = true;
                            dataApi.getEntity(entity.entityType, entity.id).then(function (newEntity) {
                                for (var i = 0; i < vm.searchResults.length; i++) {
                                    if (vm.searchResults[i].id.toLowerCase() === data) {
                                        var stashET = vm.searchResults[i].entityType;
                                        //console.log(newEntity);
                                        newEntity.line1 = newEntity.name;
                                        newEntity.entityType = stashET;
                                        vm.searchResults[i] = newEntity;
                                        break;
                                    }
                                };

                            });
                        }
                    });
                }

            }

        });

        $rootScope.$on('EntityDeleted', function (event, data) {
            var foundIt = false;
            return;
            if (vm.privateGroups) {
                vm.privateGroups.forEach(function (grp) {
                    if (grp.id == data) {
                        grp.changeType = shuri_enums.changetype.remove;
                        foundIt = true;
                    }
                });
            }
            if (vm.teams && !foundIt) {
                vm.teams.forEach(function (grp) {
                    if (grp.id == data) {
                        grp.changeType = shuri_enums.changetype.remove;
                        foundIt = true;
                    }
                });
                if (foundIt) {
                    var tms = $filter('filter')(vm.teams, function (tm) { return tm.changeType < 2; });
                    vm.teams = tms;
                }
            }
            if (vm.databases && !foundIt) {
                vm.databases.forEach(function (grp) {
                    if (grp.id == data) {
                        grp.changeType = shuri_enums.changetype.remove;
                        foundIt = true;
                    }
                });
            }
        });

        $rootScope.$on('RefreshMain', function (event, beQuiet) {
            //console.log(beQuiet);
            vm.hardRefresh(beQuiet);
            refreshRecents();

        });

        $rootScope.$on("EntityCountDecremented", function (event, parentId, entityType) {
            vm.teams.forEach(function (grp) {
                if (grp.id.toLowerCase() == parentId.toLowerCase()) {
                    //console.log("found team");
                    grp.peopleCount--;
                }
            });
            vm.databases.forEach(function (grp) {
                if (grp.id.toLowerCase() == parentId.toLowerCase()) {
                    dataApi.clearCacheItem("group" + grp.id);
                    dataApi.getGroup(grp.id, appGlobals.guidEmpty).then(function (refreshedGrp) {
                        console.log(refreshedGrp);
                        for (var i = 0; i < vm.databases.length; i++) {
                            if (vm.databases[i].id.toLowerCase() === data) {
                                open = vm.databases[i].isOpen;
                                idx = i;
                                break;
                            }
                        };
                        if (idx >= 0) {
                            refreshedGrp.isOpen = open;
                            refreshedGrp.orderer = getOrderer(refreshedGrp);
                            vm.databases.splice(idx, 1, refreshedGrp);
                        }

                    });
                }
            });

        });
        //#endregion

        function initializeMain() {
            dataApi.initialize("main controller").then(function (data) {
                //console.log(data);
                vm.isNarrow = (window.innerWidth < appGlobals.widthSmall);
                vm.isLoading = true;
                //$ionicLoading.show({ template: "Welcome ..." });
                
                refreshGroups();
            }, function (error) { console.error(error); });
        }
    }


})();

