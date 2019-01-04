(function () {
    'use strict';

    //#region PersonEditCtrl
    angular.module("shuriApp").controller('PersonEditCtrl', ['$ionicModal', '$ionicHistory', '$ionicPopup', '$scope', '$rootScope', '$state', '$stateParams', '$window', '$q', '$timeout', 'globals', 'dataApi', 'appGlobals', PersonEditCtrl]);

    function PersonEditCtrl($ionicModal, $ionicHistory, $ionicPopup, $scope, $rootScope, $state, $stateParams, $window, $q, $timeout, globals, dataApi, appGlobals) {
      var vm = this;
      vm.isDirty = false;
        vm.title = "Edit Person";
        vm.prefixes = ["Mr.", "Ms.", "Dr.", "Mrs.", "Hon."];
        vm.textareaRows = globals.textareaRows();
        vm.textareaRows = 10;

        vm.refreshData = function () {
            vm.showList = false;
            if ($stateParams.personId) {
                dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.person, $stateParams.personId).then(function () {
                    $q.all({
                        dataAppUser: dataApi.getAppUser(),
                        dataPer: dataApi.getPerson($stateParams.personId, 2, vm.collId)
                    }).then(function (d) {
                        vm.appUser = d.dataAppUser;
                        vm.person = d.dataPer;
                        // console.log(vm.appUser);

                        //console.log(vm.person);
                        vm.isNew = (vm.person.id == appGlobals.guidEmpty);
                        vm.fullControl = false;
                        if (vm.person.updatable) {
                          vm.appUser.subsMayEdit.forEach(function (coll) {
                            if (coll.group_Id == vm.person.collection_Id) vm.fullControl = true;
                          });

                        }

                        var needsPrefix = false;
                        for (var i = 0; i < vm.prefixes.length; i++) {
                            if (vm.prefixes[i] == vm.person.prefix) needsPrefix = true;
                        }
                        if (!needsPrefix) vm.prefixes.push(vm.person.prefix);
                        // vm.title = vm.person.name;
                        if (vm.person.primaryCP_Id && vm.person.primaryCP_Id != appGlobals.guidEmpty) {
                            vm.title = "Registered User";
                            vm.isUser = true;
                        }


                        vm.imageUrl = vm.person.imageUrl;
                        vm.showList = true;
                        globals.setHelpView('personEdit');

                    });

                });
            }
            else globals.showAlert("Error", "Missing parameter(s). ");
        };

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.cancel = function () {
         // if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
         //   $window.removeEventListener('native.keyboardshow', vm.keyboardShowHandler);
         //   $window.removeEventListener('native.keyboardhide', vm.keyboardHideHandler);
         //}
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $ionicHistory.goBack(-1);
        };

        vm.save = function () {
          //console.log(vm.person);
          vm.saving = true;

          ////strip TwitterStream
          //var newDocs = [];
          //vm.person.documents.forEach(function (doc) {
          //    if (doc.changeType && doc.changeType == shuri_enums.changetype.update) newDocs.push(doc);
          //})
          //vm.person.documents = newDocs;

          dataApi.postEntity("people", "person", vm.person, 4).then(function (person) {
            vm.saving = false;
            //console.log(vm.person);
            //was tenure updated?
            var tenGrp = null;
            vm.person.groups.forEach(function (grp) {
              if (grp.changeType == 1) {
                tenGrp = grp;
              }
            });
            if (tenGrp) {
              dataApi.clearCacheItemByEntity(9, tenGrp.id).then(function (data) {
                $rootScope.$broadcast("EntityChanged", tenGrp.id);
              });

            }
            vm.cancel();
          });
        };

        vm.deletePerson = function (person) {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Permanent Delete',
                template: "Permanently delete " + person.name + "? <br /><br /> There is NO un-do for this action."
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(person.id, shuri_enums.entitytypes.person, person).then(function (data) {
                        $state.go("home.main");
                    });
                }
            });
        }

        //#region ta handling
        vm.offset = 186;
        vm.taHeight = (window.innerHeight - vm.offset).toString() + "px";

        vm.keyboardShowHandler = function (e) {
          vm.taHeight = (window.innerHeight - vm.offset).toString() + "px";
          $scope.$apply();
          //var ta = document.getElementById("personTA");
          //ta.setSelectionRange(ta.value.length, ta.value.length);
          //ta.scrollIntoView(false);

        }

        vm.goFullscreen = function () {

          vm.taHeight = (window.innerHeight - vm.offset).toString() + "px";
          $ionicModal.fromTemplateUrl('descriptionFS.html', {
            scope: $scope,
            //focusFirstInput: true,
            animation: 'slide-in-up'
          }).then(function (modal) {
            vm.modalFS = modal;
            vm.modalFS.show();
            vm.before = window.innerHeight;
            var ta = document.getElementById("taDescription");
            ta.focus();
           // if (scope.onDesktop) {
            $timeout(function () {
              var ta = document.getElementById("taDescription");
              vm.mid = window.innerHeight;
              ta.setSelectionRange(ta.value.length, ta.value.length);
             vm.taHeight = (window.innerHeight - vm.offset).toString() + "px";
              vm.after = window.innerHeight;
              console.log(vm.before, vm.mid, vm.after, vm.offset);
            }, 2000);
            //}

          });

          return;
          vm.fullscreen = true;
          var h = (window.innerHeight - vm.offset);
          vm.taHeight = h.toString() + "px";
         var ta = document.getElementById("personTA");
         console.log(window.innerHeight);
         ta.focus();
         // ta.setSelectionRange(ta.value.length, ta.value.length);
         // ta.scrollIntoView(false);

        }

        vm.closeFullscreen = function () {
          vm.modalFS.hide();
          vm.modalFS.remove();
        };



        //vm.keyboardHideHandler = function (e) {
        //  var h = (window.innerHeight - vm.offset);
        //  vm.taHeight = h.toString() + "px";
        //  $scope.$apply();
        //  // $timeout(setTAHeight(), 100);
        //}

        //if (window.cordova) {
        //  $window.addEventListener('native.keyboardshow', vm.keyboardShowHandler);
        //  $window.addEventListener('native.keyboardhide', vm.keyboardHideHandler);
        //}
        //#endregion
        vm.inputChg = function () {
          vm.isDirty = true;
        }

        $scope.$on('$ionicView.enter', function () {
          dataApi.clearCacheItemByEntity(4, data.toLowerCase()).then(function () {
            vm.refreshData();
          });
        });

        dataApi.initialize("").then(function (d) {
            if (!$stateParams.personId) globals.showAlert("Error", "Missing personId - contact your developer.");
            else if ($stateParams.personId == appGlobals.guidEmpty && !$stateParams.collectionId) globals.showAlert("Error", "Need collectionId if new entity - contact your developer.");

            vm.collId = appGlobals.guidEmpty;
            if ($stateParams.collectionId) vm.collId = $stateParams.collectionId;
            globals.sendAppView('personEdit', 4, $stateParams.personId);
            vm.refreshData();
        });


    };
    //#endregion

})();

(function () {
    'use strict';

    //#region PersonCtrl
    angular.module("shuriApp").controller('PersonCtrl', ['$ionicHistory', '$ionicPopup', '$ionicLoading', '$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$window', '$q', '$filter', 'globals', 'dataApi', 'appGlobals', PersonCtrl]);

    function PersonCtrl($ionicHistory, $ionicPopup, $ionicLoading, $scope, $rootScope, $state, $stateParams, $timeout, $window, $q, $filter, globals, dataApi, appGlobals) {
        var vm = this;
        vm.isDirty = false;
        vm.title = "Person";
        vm.detailsKey = "hideDetails";
        vm.color = "energized";
        vm.barColor = "bar-energized";
        vm.bgLight = "bgEnergizedLight";
      vm.twitter2Live = _twitter2Live;

        vm.hardRefresh = function () {
            dataApi.clearCache();
            $rootScope.$broadcast("EntityChanged", $stateParams.personId);
            if ($stateParams.personId) vm.refreshData($stateParams.personId);
            else if (vm.person) vm.refreshData(vm.person.id);

            $scope.$broadcast('scroll.refreshComplete');
        }

        vm.refreshData = function (personId) {
            if (personId) {
                $q.all({
                    dataAppUser: dataApi.getAppUser(),
                    dataPer: dataApi.getPerson(personId, 2)
                }).then(function (d) {
                    vm.appUser = d.dataAppUser;
                    vm.person = d.dataPer;
                    //console.log(vm.appUser, vm.person);
                    if (vm.person.id === appGlobals.guidEmpty) {
                      vm.notFoundMessage = "Unable to locate that person. ";
                      if (vm.appUser.isFiltered) vm.notFoundMessage += "Are they in a filtered-out database?";
                      vm.notFound = true;

                    }
                    else {
                      vm.notFound = false;

                      vm.fullControl = false;
                      if (vm.person.updatable) {
                        vm.appUser.subsMayEdit.forEach(function (coll) {
                          if (vm.person.collection_Id === coll.group_Id && coll.updatableGroup) vm.fullControl = true;
                        });

                      }

                      //console.log(vm.fullControl, vm.appUser.subsMayEdit, vm.person.collection_Id );
                      //var key = "showAvatar" + vm.person.id;
                      //if (localStorage.getItem(key)) vm.showAvatar = true;
                      if ($state.current.name == "home.user") {
                        vm.title = "App User";
                        vm.isUserPage = true;
                        //set max sizes for image
                        vm.maxWidthImage = (parseInt(window.innerWidth * 0.9)).toString() + "px";
                        vm.maxHeightImage = (parseInt(window.innerHeight * 0.5)).toString() + "px";
                      }

                      //console.log(vm.person);
                      if (vm.person.primaryCP_Id && vm.person.primaryCP_Id != appGlobals.guidEmpty) {
                        vm.title = "Registered User";
                        vm.color = "teamColor";
                        vm.barColor = "bgTeam";
                        vm.bgLight = "bgTeamLight";
                        vm.isUser = true;
                      }
                      setTenureUI();

                      //----------Open/close pref
                      vm.hideSummaryPref = String.format("hideSummary_Person");
                      dataApi.getUserPreference(vm.hideSummaryPref).then(function (pref) {
                        if (pref) vm.hideSummary = (pref === "true");
                        $scope.$broadcast('scroll.refreshComplete');
                      })
                    }
                    $ionicLoading.hide();
                    vm.showList = true;
                    $scope.$broadcast('scroll.refreshComplete');

                }, function (err) {
                    $ionicLoading.hide();
                    vm.showList = true;
                    console.log("dataper", vm.person);
                   $scope.$broadcast('scroll.refreshComplete');


                });
            }
            else {
                console.error("No PersonId passed in.", $stateParams);
            }
        }

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.cancel = function () {
            $ionicHistory.goBack();
        };

        vm.toggleSummary = function () {
            vm.hideSummary = !vm.hideSummary;
            dataApi.postUserPreference(vm.hideSummaryPref, vm.hideSummary.toString(), false);
        }

        vm.toggleAvatar = function () {
            vm.showAvatar = !vm.showAvatar;

            //var key = "showAvatar" + vm.person.id;
            //if (localStorage.getItem(key)) localStorage.removeItem(key);
            //localStorage.setItem(key, vm.showAvatar.toString());

        }
        vm.fullscreenSummary = function (event) {
          if (event) event.stopPropagation();
          $state.go("edit.textarea", { entityId: vm.person.id, entityType: 4 });
        }


        vm.deletePerson = function (person) {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Permanent Delete',
                template: "Permanently delete " + person.name + "? <br /><br /> There is NO un-do for this action."
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(person.id, shuri_enums.entitytypes.person, person).then(function (data) {
                        $state.go("home.main");
                    });
                }
            });
        }


        function setTenureUI() {
            vm.currentOrg = "";
            vm.currentTitle = "";

            var orgs = $filter('filter')(vm.person.groups, function (grp) { return grp.grpType == shuri_enums.grouptype.organization });
            orgs.forEach(function (org) {
                if (!org.endDt) {
                    if (vm.currentOrg == "") {
                        vm.currentOrg = org.name;
                        vm.currentTitle = org.title;
                    }
                    else {
                        vm.currentOrg += ", " + org.name;
                        vm.currentTitle = "";  //lose the title if more than 1 org
                    }
                }
            });
        };

        $rootScope.$on('EntityChanged', function (event, data) {
            if (data && vm.person && vm.person.id.toLowerCase() == data.toLowerCase()) {
               // console.log("Person chg", data);
              dataApi.clearCacheItemByEntity(4, data.toLowerCase()).then(function () {
                $timeout(function () { vm.refreshData(data); }, 500);
                });
            }
        });

        $scope.$on('$ionicView.enter', function () {
            dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.person, $stateParams.personId);

            vm.refreshData($stateParams.personId);
        });

        dataApi.initialize("").then(function (d) {
            globals.sendAppView('person', 4, $stateParams.personId);
            globals.setHelpView('person');
            $ionicLoading.show({ template: 'Loading person...' });
            vm.refreshData($stateParams.personId);
        });

    }
    //#endregion
})();
