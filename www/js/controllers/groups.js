(function () {
    'use strict';

    //#region GroupCtrl
    angular.module("shuriApp").controller('GroupCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$q', '$filter', '$ionicHistory', '$ionicPopup', '$ionicModal', '$ionicActionSheet', 'globals', 'dataApi', 'appGlobals', GroupCtrl]);

    function GroupCtrl($rootScope, $scope, $state, $stateParams, $q, $filter, $ionicHistory, $ionicPopup, $ionicModal, $ionicActionSheet, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };

        //#region Data
        vm.refreshData = function (quiet) {
            vm.runsLong = undefined;
            if (!quiet) vm.showList = false;
            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataGroup: dataApi.getGroup($stateParams.id),
            }).then(function (d) {
                vm.appUser = d.dataAppUser;
                vm.group = d.dataGroup;
                if (vm.group.grpTypename == 'Private') vm.group.grpTypename = 'Group';
                //console.log(vm.group);

                vm.mayManageSubs = vm.group.updatable && (vm.group.ownedByGroupName != 'Shuri Subscriptions Team' || vm.appUser.isReviewer);

                vm.group.deletable = (vm.group.ownedBy_Id == vm.appUser.id && vm.group.id != vm.appUser.defaultCollection_Id);

                //--get the "entitytype" based upon grpType for pickers for private and team.
                vm.entityType = shuri_enums.entitytypes.group;
                if (vm.group.grpType == shuri_enums.grouptype.private) vm.entityType = shuri_enums.entitytypes.private;
                else if (vm.group.grpType == shuri_enums.grouptype.team) vm.entityType = shuri_enums.entitytypes.team;


                if (vm.group.grpType == shuri_enums.grouptype.collection) {

                    $q.all({
                        dataUT: dataApi.getUserTypes(vm.group.id),
                        dataSubs: dataApi.getSubscriptionsForGroup(vm.group.id)
                    }).then(function (d) {

                        vm.subscriptions = d.dataSubs;
                        vm.hasPublicShare = false;
                        //console.log(vm.subscriptions);
                        vm.totalSubscribers = 0;
                        vm.subscriptions.forEach(function (sub) {
                            vm.totalSubscribers += sub.countSubscribers;
                            sub.deletable = (sub.countSubscribers == 0) && sub.updatable;
                            sub.sharedWith = sub.availableToGroupname;
                            if (sub.availableToGroup_Id == appGlobals.guidEmpty) {
                                vm.hasPublicShare = true;
                                if (sub.value > 0) sub.sharedWith = sub.name;
                            }
                            sub.isPending = parseInt(sub.approvalStatus) > 1 && (sub.availableToGroup_Id == vm.guidEmpty);
                        });

                        vm.usertypesTags = $filter('filter')(d.dataUT, function (ut) { return ut.entityType == shuri_enums.entitytypes.tag; });
                        vm.usertypesTouches = $filter('filter')(d.dataUT, function (ut) { return ut.entityType == shuri_enums.entitytypes.touch; });
                        vm.usertypesCPDocs = $filter('filter')(d.dataUT, function (ut) { return (ut.entityType == shuri_enums.entitytypes.contactpoint || ut.entityType == shuri_enums.entitytypes.document); });
                        loadFriendlyNames();

                        loadComplete();

                    });
                }
                else if (vm.group.grpType == shuri_enums.grouptype.team) {
                    dataApi.collectionsForTeam(vm.group.id).then(function (data) {
                        vm.group.collections = data;
                        loadComplete();
                    });
                }
                else loadComplete();
            });
        };

        function loadComplete() {
            //console.log(vm.group);
            vm.title = vm.wordFor(vm.group.grpTypename);
            vm.headerCls = "bar-positive";
            var et = 2;
            switch (vm.group.grpType) {
                case shuri_enums.grouptype.private:
                    vm.headerCls = "groupColor";
                    et = 11;
                    break;
                case shuri_enums.grouptype.organization:
                    vm.headerCls = "bar-calm";
                    et = 9;
                    break;
                case shuri_enums.grouptype.team:
                    vm.headerCls = "teamColor";
                    et = 10;
                    break;
            }
            globals.setHelpView(vm.group.grpTypename);
            globals.sendAppView('group', et, vm.group.id);
            $scope.$broadcast('scroll.refreshComplete');
          //console.log(vm.group.updatable, vm.appUser.licenseStatus);
            vm.showList = true;

        }
        function loadFriendlyNames() {
            for (var i = 0; i < vm.usertypesCPDocs.length; i++) {
                vm.usertypesCPDocs[i].friendlyPrim = vm.usertypesCPDocs[i].primitiveName;
                //console.log(vm.usertypesCPDocs[i]);
                switch (vm.usertypesCPDocs[i].primitiveName) {
                    case "SMHandle":
                        vm.usertypesCPDocs[i].friendlyPrim = "Social Handle";
                        break;
                    case "CustomText":
                        vm.usertypesCPDocs[i].friendlyPrim = "Any Text";
                        break;
                    case "CustomLongText":
                        vm.usertypesCPDocs[i].friendlyPrim = "Any Text - Long";
                        break;
                    case "CustomInteger":
                    case "CustomFloat":
                        vm.usertypesCPDocs[i].friendlyPrim = "Number";
                        break;
                    case "CustomBinary":
                        vm.usertypesCPDocs[i].friendlyPrim = "Checkbox";
                        break;
                    case "CustomDate":
                        vm.usertypesCPDocs[i].friendlyPrim = "Date";
                        break;
                    case "RatingYesNo":
                        vm.usertypesCPDocs[i].friendlyPrim = "Rating: Yes/No";
                        break;
                    case "RatingYesNoMaybe":
                        vm.usertypesCPDocs[i].friendlyPrim = "Rating: Yes/No/Maybe";
                        break;
                    case "Rating0to5":
                        vm.usertypesCPDocs[i].friendlyPrim = "Rating: 5 Stars";
                        break;
                    case "Rating0to100":
                        vm.usertypesCPDocs[i].friendlyPrim = "Rating: 0 to 100";
                        break;
                }

            }
        }

        //#endregion

        //#region Group Actions
        vm.goBack = function () {
            $state.go("home.main");
        }

        vm.viewer = function () {
            globals.showAlert("ToDo", "Create a Viewer");
        }

        vm.promoteGroup = function () {
            //$state.go("edit.promoteGroup", { id: vm.group.id });
            var confirmPopup = $ionicPopup.confirm({
                title: 'Promote To Database?',
                template: 'Promoting a group makes it a database: <font color="red">sharable</font> with the team(s) you choose. <br /><br />Promoting will remove this group\'s people, organizations, and touches from the other databases you control, since items may only be in one database at a time.'
                    + '<br /><br />There is no un-do.'
            });
            confirmPopup.then(function (res) {
                if (res)
                {
                    vm.showList = false;
                    vm.runsLong = true;
                    dataApi.promoteGroup(vm.group.id).then(function (data) {
                        dataApi.clearCache();
                        dataApi.refreshAppUser();
                        $rootScope.$broadcast("RefreshMain");
                        vm.runsLong = undefined;
                        vm.showList = true;
                        globals.showAlert(vm.group.name + ' is now a database.  ');
                        $state.go("home.main");
                    });
                }
            });


        }

        vm.copyMerge = function () {
            globals.showAlert("ToDo", "Create a page to copy and merge groups");
        }


        vm.save = function () {
            if (vm.group.name == "") globals.showAlert('Name is required');
            else {
                //needBC
                dataApi.postEntity("groups", "group", vm.group).then(function (data) {
                    vm.goBack();
                });
            }
        };

        vm.deleteGroup = function () {
          if ((vm.group.id == vm.appUser.defaultCollection_Id)) {
            var confirmPopup = $ionicPopup.alert({
                title: 'Default Database',
                templateUrl: "deleteDefaultGroup.html"
            });
          }
          else {
            vm.nukeGroup = false;

            var confirmPopup = $ionicPopup.confirm({
              title: 'OK to Delete?',
              templateUrl: "deleteGroup.html",
              scope: $scope
            });
            confirmPopup.then(function (res) {
              if (res) {
                vm.showList = false;
                if (vm.nukeGroup) {
                    dataApi.deletePrivateGroupDeep(vm.group).then(function (data) {
                        $rootScope.$broadcast("RefreshMain");
                      vm.goBack();
                  });

                }
                else {
                  dataApi.deleteEntity(vm.group.id, shuri_enums.entitytypes.group).then(function (data) {
                      $rootScope.$broadcast("RefreshMain");
                      vm.goBack();
                  });
                }
              }
            });
          }


        }
        //#endregion

        //#region Team - Add Collection Modal
        vm.addCollection = function () {
            vm.openModalC();

        }

        vm.openModalC = function () {
            vm.collection = new shuri_group();
            vm.collection.name = vm.group.name + " " + vm.wordFor("Collection");

            //check the new name
            dataApi.groupnameOK(vm.collection.name, vm.collection.id).then(function (data) {
                vm.groupnameOK = data;
                // console.log(data);
                if (!vm.groupnameOK) {
                    //console.log("reset name");
                    vm.collection.name = "";
                }
                vm.groupnameChecked = false;
                vm.collection.grpType = shuri_enums.grouptype.collection;
                vm.modalCChanged("own");  //default to ownedByGroup
                $ionicModal.fromTemplateUrl('addCollection.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    vm.modalC = modal;
                    vm.modalC.show();
                });
            });

        }

        vm.closeModalC = function (refresh) {
            if (refresh) vm.refreshData();
            vm.modalC.hide();
            vm.modalC.remove();
        };

        vm.saveCollection = function () {
            var now = UTCNow();
            //console.log(vm.collection.permType, vm.collection.name);
            if (vm.collection.permType && vm.collection.name) {
                if (vm.collection.permType == "own") vm.collection.ownedByGroup_Id = vm.group.id;
                vm.collection.collection_Id = vm.group.id;  //fake collectionId so passes verification - won't be used
                dataApi.postEntity("groups", "group", vm.collection).then(function (data) {
                    vm.collection.id = data;
                    //console.log(data);
                    if (vm.collection.permType == "subscribe") {
                        //create the subscription and subscribe the members
                        var sub = new shuri_subscription();
                        sub.group_Id = vm.collection.id;
                        sub.availableToGroup_Id = vm.group.id;
                        sub.name = vm.group.name;
                        sub.active = true;
                        sub.startDt = now;
                        dataApi.postEntity("subscriptions", "subscription", sub).then(function (data) {
                            //console.log(data);
                            sub.id = data;
                            for (var i = 0; i < vm.group.people.length; i++) {
                                var subscriber = vm.group.people[i];
                                subscriber.subscription_Id = sub.id;
                                subscriber.group_Id = vm.collection.id;
                                subscriber.active = true;
                                subscriber.startDt = now;
                                subscriber.payType = 0;
                                dataApi.postEntity("subscribers", "subscriber", subscriber);
                                //console.log(subscriber);

                            }
                            vm.closeModalC(true);
                        });
                    }
                    else vm.closeModalC(true);

                });
            }
        };

        vm.modalCChanged = function (source) {
            if (source) vm.collection.permType = source;

            vm.saveCollEnabled = (vm.collection.name && vm.collection.permType && vm.groupnameOK);
            //console.log(vm.saveCollEnabled, vm.groupnameOK);
        }
        //#endregion

        //#region Name checks

        vm.groupNameChange = function () {
            if (vm.group.name && vm.group.name.length > 2) {
                vm.groupnameChecked = true;
                dataApi.groupnameOK(vm.group.name, vm.group.id).then(function (data) {
                    vm.groupnameOK = data;
                });
            }
            else vm.groupnameChecked = false;
            vm.isDirty = true;
        }

        vm.newGroupNameChange = function (theName, id) {
            if (theName && theName.length > 2) {
                vm.newGroupnameChecked = true;
                dataApi.newGroupnameOK(theName, id).then(function (data) {
                    vm.newGroupnameOK = data;
                    //vm.modalCChanged();
                });
            }
            else vm.newGroupnameChecked = false;

        }

        vm.newTeamNameChange = function () {
            if (vm.newTeamName && vm.newTeamName.length > 2) {
                vm.teamnameChecked = true;
                dataApi.teamnameOK(vm.newTeamName, appGlobals.guidEmpty).then(function (data) {
                    vm.teamnameOK = data;
                });
            }
            else vm.teamnameChecked = false;
        }

        //#endregion

        //#region Subscribers Modal

        vm.showSubscribers = function (subscript) {
            vm.subscription = subscript;
            //console.log(subscript);
            $ionicModal.fromTemplateUrl('modalSubscribers.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                vm.modalB = modal;
                vm.modalB.show();
            });

        };

        vm.closeModalB = function () {
            vm.modalB.hide();
            vm.modalB.remove();
        };
        //#endregion

        //#region Modal:  Add Subscription
        vm.loadShareTeams = function () {

            dataApi.getTeams().then(function (data) {
                vm.shareWithTeams = $filter('filter')(data, function (team) {
                    return ((!isAlreadySharedWith(team)) && (team.name.toLowerCase() != 'application users' || team.name.toLowerCase() != 'public'));
                });
                if (vm.shareWithTeams && vm.shareWithTeams.length > 0) vm.selectedTeam = vm.shareWithTeams[0];
                //console.log(vm.selectedTeam, vm.shareWithTeams);

                var publicTeam = new shuri_group();
                publicTeam.name = "Public*";
                publicTeam.id = appGlobals.guidEmpty;
                vm.shareWithTeams.push(publicTeam);
                var newTeam = new shuri_group();
                newTeam.name = "(add new Team)";
                newTeam.id = vm.guidSystem;
                vm.shareWithTeams.push(newTeam);

            })
        }

        function isAlreadySharedWith(team) {
            var res = false;
            vm.subscriptions.forEach(function (sub) {
                if (sub.availableToGroup_Id.toLowerCase() == team.id.toLowerCase()) res = true;
            });
            return res;
        }

        vm.approveSubscription = function (subscript) {
            dataApi.approveSubscription(subscript.id).then(function (data) {
                globals.showAlert(subscript.name + ' has been approved.  ');
                vm.goBack();
                vm.closeModalS();
            });
        }


        vm.editSubscription = function (subscript) {
            vm.wordAddEdit = vm.wordFor("Edit");
            vm.loadShareTeams();

            //if (!vm.subscriptionTypes) {
            //    vm.subscriptionTypes = [];
            //    //vm.subscriptionTypes.push({ text: "Demo", value: 0});
            //    vm.subscriptionTypes.push({ text: "No Charge", value: 1 });
            //    vm.subscriptionTypes.push({ text: "Monthly", value: 2 });
            //    vm.subscriptionTypes.push({ text: "Annual", value: 3 });
            //}

            if (!subscript) {
                vm.wordAddEdit = vm.wordFor("Add");
                vm.subscription = new shuri_subscription();
                vm.subscription.name = vm.group.name;
                vm.subscription.description = vm.group.description;
                vm.subscription.group_Id = vm.group.id;
                vm.subscription.subType = shuri_enums.subscriptiontype.private;
                vm.subscription.isNew = true;
            }
            else {
                //console.log(subscript);
                vm.subscription = subscript;
                //get the display names for subtype and availableTo
                //for (var i = 0; i < vm.subscriptionTypes.length; i++) {
                //    if (vm.subscription.subType == vm.subscriptionTypes[i].value) {

                //    }
                //}


            }

            //vm.subChanged();

            var confirmPopup = $ionicPopup.confirm({
                title: 'Create a new Publication?',
                subTitle: 'Members of the team you choose will be able to subscribe to, and then view only (not update) ' + vm.group.name + '.',
                templateUrl: "newSubscription.html",
                scope: $scope
            });
            confirmPopup.then(function (res) {
                if (res) {
                    var newTeam = new shuri_group();
                    newTeam.grpType = shuri_enums.grouptype.team;

                    if ((vm.selectedTeam.id == appGlobals.guidSystem) && (!vm.newTeamName || vm.newTeamName.trim() == "")) globals.showAlert("Error", "You did not enter a new team name");
                    else if (vm.selectedTeam.id == appGlobals.guidSystem) {
                        dataApi.groupnameOK(vm.newTeamName, appGlobals.guidEmpty).then(function (data) {
                            if (data) {
                                newTeam.name = vm.newTeamName;
                                vm.showList = false;
                                dataApi.postEntity("groups", "group", newTeam).then(function (data) {
                                    newTeam.id = data;
                                    createSubscription(vm.newTeamName, vm.group.id, newTeam.id)
                                });
                            }
                            else globals.showAlert("Error", "That name is already in use.");
                        });
                    }
                    else {
                        //existing team
                        createSubscription(vm.selectedTeam.name, vm.group.id, vm.selectedTeam.id)
                    }
                }
            });

        };

        function createSubscription(name, groupId, availableToGroup_Id) {
            vm.showList = false;
            var sub = new shuri_subscription();
            sub.name = name;
            sub.group_Id = groupId;
            sub.availableToGroup_Id = availableToGroup_Id;
            sub.active = true;
            sub.startDt = moment.utc().toISOString();
            //console.log(sub.startDt);
            dataApi.postEntity("subscriptions", "subscription", sub).then(function (data) {
                //console.log(data);
                vm.refreshData();

            });

        }

        vm.subChanged = function () {
            //console.log(vm.selectedTeam);
            vm.subscription.availableToGroup_Id = vm.selectedTeam.id;
            //console.log(vm.subscription.availableToGroup_Id, vm.selectedTeam.id);
            vm.subscription.updateActive = vm.subscription.isNew;
            vm.approvalStatusClasses = "";
            vm.approvalStatus = "unknown";

            switch (vm.subscription.approvalStatus) {
                case shuri_enums.subscriptionapprovalstatus.pending:
                    vm.approvalStatusClasses += " bgEnergized"
                    if (vm.subscription.id == appGlobals.guidEmpty) {
                        vm.approvalStatusClasses += " medText"
                        vm.approvalStatus = vm.wordFor("reqsapproval");
                    }
                    else vm.approvalStatus = "Pending Approval";
                    break;
                case shuri_enums.subscriptionapprovalstatus.approved:
                    vm.approvalStatusClasses += " bgBalanced"
                    vm.approvalStatus = "Approved";
                    vm.subscription.updateActive = vm.subscription.updatable;
                    break;
                case shuri_enums.subscriptionapprovalstatus.disapproved:
                    vm.approvalStatusClasses += " bgAssertive"
                    vm.approvalStatus = "Disapproved";
                    break;
                case shuri_enums.subscriptionapprovalstatus.notrequired:
                    vm.approvalStatus = "Not Required";
                    vm.subscription.updateActive = vm.subscription.updatable;
                    break;
            }

            var req = (vm.subscription.availableToGroup_Id == appGlobals.guidEmpty || vm.subscription.value > 0);
            //if (req) vm.subscription.active = false;
            vm.reqApproval = req;
        };


        vm.saveSubscription = function () {

            dataApi.postEntity("subscriptions", "subscription", vm.subscription).then(function (data) {
                var key = "group" + vm.group.id;
                dataApi.clearCacheItem(key);
                vm.refreshData();
            },
              function (errorObj) {
                  if (errorObj && errorObj.message) {
                      globals.showAlert("Error", errorObj.message);
                  }
                  else if (errorObj) console.log(errorObj);
              });

        }

        vm.deleteSubscription = function (sub) {

            var confirmPopup = $ionicPopup.confirm({
                title: 'Confirm Delete',
                template: "Delete this share?"
            });
            confirmPopup.then(function (res) {
                vm.showList = false;
                dataApi.deleteEntity(sub.id, shuri_enums.entitytypes.subscription).then(function (data) {
                    $rootScope.$broadcast("RefreshMain");
                },
                  function (errorObj) {
                      if (errorObj && errorObj.message) {
                          if (errorObj.message.toLowerCase().indexOf("duplicate name") > -1) globals.showAlert("Duplicate Name", "There is already a group named <b>" + vm.importGroup.name + "</b>.  Import has been refused.  ");
                          else globals.showAlert("Error", errorObj.message);
                      }
                      else if (errorObj) console.log(errorObj);
                  });
            });



        }
        //#endregion


        $scope.$on('$ionicView.enter', function () {
            vm.refreshData();
        });

        $rootScope.$on('EntityChanged', function (event, data) {
            data = data.toLowerCase();
            if (data === vm.group.id.toLowerCase()) {
                dataApi.clearCacheItem("group") + data;
                vm.refreshData(true);

            }

        });

        dataApi.initialize("").then(function (d) {
            vm.guidSystem = appGlobals.guidSystem;  //stash for .html
            vm.guidEmpty = appGlobals.guidEmpty;  //stash for .html
            vm.approvalStatusClasses = "";
            vm.isNarrow = (window.innerWidth <= appGlobals.widthSmall);

            if (!$stateParams.id || ($stateParams.id == appGlobals.guidEmpty)) globals.showAlert("Missing or empty group id", "Error.  Contact your developer.");

        });


    }

    //#endregion
})();

(function () {
    'use strict';

    //#region PromoteGroup
    angular.module("shuriApp").controller('PromoteGroupCtrl', ['$scope', '$state', '$stateParams', '$q', '$filter', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', PromoteGroupCtrl]);

    function PromoteGroupCtrl($scope, $state, $stateParams, $q, $filter, $ionicHistory, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };

        //#region Data
        vm.refreshData = function () {
            vm.runsLong = undefined;
            vm.showList = false;
            $q.all({
                dataTeams: dataApi.getTeams(),
                dataGroup: dataApi.getGroup($stateParams.id),
            }).then(function (d) {
                vm.group = d.dataGroup;
                if (vm.group.grpTypename == 'Private') vm.group.grpTypename = 'Group';

                vm.editingTeams = d.dataTeams;

                var noTeam = new shuri_group();
                noTeam.name = "(none)";
                noTeam.id = vm.guidEmpty;
                vm.editingTeams.push(noTeam);

                var newTeam = new shuri_group();
                newTeam.name = "(add new Team)";
                newTeam.id = vm.guidSystem;
                vm.editingTeams.push(newTeam);

                vm.editingTeamId = vm.group.ownedByGroup_Id;
                setShowAssignEditingTeam();

                vm.showList = true;
                globals.sendAppView('promoteGroup', 2, vm.group.id);


            });
        };
        vm.editingTeamIdChanged = function () {
            console.log(vm.editingTeamId);
            setShowAssignEditingTeam();
        }
        vm.newGroupNameChange = function (theName, id) {
            if (theName && theName.length > 2) {
                vm.newGroupnameChecked = true;
                dataApi.groupnameOK(theName, id).then(function (data) {
                    vm.newGroupnameOK = data;
                });
            }
            else vm.newGroupnameChecked = false;

        }
        //#endregion

        function setShowAssignEditingTeam() {
            vm.showAssignEditingTeam = (vm.editingTeamId && vm.editingTeamId != appGlobals.guidEmpty);

        }

        vm.cancel = function () {
            $ionicHistory.goBack();
        }

        vm.promote = function () {
            console.log(vm.editingTeamId);
            vm.runsLong = true;
            if (vm.editingTeamId == vm.guidSystem) {
                //create the new team
                var newTeam = new shuri_group();
                newTeam.grpType = shuri_enums.grouptype.team;

                if (!vm.newTeamName || vm.newTeamName.trim() == "") globals.showAlert("Error", "You did not enter a new team name");
                else  {
                    dataApi.groupnameOK(vm.newTeamName, appGlobals.guidEmpty).then(function (data) {
                        if (data) {
                            newTeam.name = vm.newTeamName;
                            vm.showList = false;
                            dataApi.postEntity("groups", "group", newTeam).then(function (data) {
                                newTeam.id = vm.editingTeamId = data;
                                promoteGroup();
                            });
                        }
                        else globals.showAlert("Error", "That group name is already in use.");
                    });
                }

            }
            else promoteGroup();
        }

        function promoteGroup() {
            vm.showList = false;
            dataApi.promoteGroup(vm.group.id, vm.editingTeamId).then(function (data) {
               dataApi.clearCache();
               dataApi.refreshAppUser()
                vm.runsLong = undefined;
                vm.showList = true;
               globals.showAlert(vm.group.name + ' is now a database.  ');
               $state.go("home.main");
            });

        }

        $scope.$on('$ionicView.enter', function () {
            vm.refreshData();
        });

         dataApi.initialize("").then(function (d) {
             vm.guidSystem = appGlobals.guidSystem;  //stash for .html
             vm.guidEmpty = appGlobals.guidEmpty;  //stash for .html
             vm.title = "Promote Group to Database";

             if (!$stateParams.id || ($stateParams.id == appGlobals.guidEmpty)) globals.showAlert("Missing or empty group id", "Error.  Contact your developer.");
         });
   }

        //#endregion

})();



(function () {
    'use strict';
    //#region OrgCtrl
    angular.module("shuriApp").controller('OrgCtrl', ['$scope', '$rootScope', '$q', '$state', '$stateParams', '$ionicHistory', '$ionicPopup', '$ionicLoading', '$window', 'globals', 'dataApi', 'appGlobals', OrgCtrl]);

    function OrgCtrl($scope, $rootScope, $q, $state, $stateParams, $ionicHistory, $ionicPopup, $ionicLoading, $window, globals, dataApi, appGlobals) {
        var vm = this;
      vm.title = "Organization";
      vm.twitter2Live = _twitter2Live;
        vm.hardRefresh = function () {
            dataApi.clearCache();
            $rootScope.$broadcast("EntityChanged", $stateParams.groupId);
            vm.refreshData($stateParams.groupId);
            $scope.$broadcast('scroll.refreshComplete');
       }

        vm.refreshData = function (orgId) {
            if (!orgId) console.error("Error", "Missing groupId - contact your developer.");
            else {
                $q.all({
                    dataAppUser: dataApi.getAppUser(),
                    dataOrg: dataApi.getOrg(orgId, vm.collId, 2, "orgView")
                }).then(function (d) {
                  //console.log(d.dataOrg);
                    vm.appUser = d.dataAppUser;
                    vm.org = d.dataOrg;
                    if (vm.org.id === appGlobals.guidEmpty) {
                      vm.notFoundMessage = "Unable to locate that organization. ";
                      if (vm.appUser.isFiltered) vm.notFoundMessage += "Is it in a filtered-out database?";
                      vm.notFound = true;

                    }
                    else {
                      vm.notFound = false;

                      vm.fullControl = false;
                      if (vm.org.updatable) {
                        vm.appUser.subsMayEdit.forEach(function (coll) {
                          if (vm.org.collection_Id === coll.group_Id && coll.updatableGroup) vm.fullControl = true;
                        });

                      }
                      //----------Open/close pref
                      vm.hideSummaryPref = String.format("hideSummary_Org");
                      dataApi.getUserPreference(vm.hideSummaryPref).then(function (pref) { if (pref) vm.hideSummary = (pref === "true"); })
                    }
                    //console.log(vm.org.updatable, vm.appUser.isReviewer);

                    $ionicLoading.hide();
                    $scope.$broadcast('scroll.refreshComplete');

                }, function (err) {
                    console.error(err);
                    $ionicLoading.hide();
                    $scope.$broadcast('scroll.refreshComplete');

                });
            }
        };

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.toggleSummary = function () {
            vm.hideSummary = !vm.hideSummary;
            dataApi.postUserPreference(vm.hideSummaryPref, vm.hideSummary.toString(), false);
        }

        vm.fullscreenSummary = function (event) {
          if (event) event.stopPropagation();
          $state.go("edit.textarea", { entityId: vm.org.id, entityType: 9 });
        }

        vm.buttonClasses = function (name) {
            var bc = 'button icon  ';
            if (name == "cancel") {
                bc += " ion-close-round "
                if (!vm.isDirty) bc += ' button-outline  button-energized';
                else bc += ' button-stable ';
            }
            else {
                bc += ' ok-confirm  ion-checkmark-round ';
            }
            return bc;
        };

        vm.cancel = function () {
            vm.isDirty = false;
            vm.org = null;
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $ionicHistory.goBack();
        }

        vm.toggleAvatar = function () {
            vm.showAvatar = !vm.showAvatar;

            //user clicked; remember pref
            //var key = "hideAvatar" + vm.org.id;
            //if (localStorage.getItem(key)) localStorage.removeItem(key);
            //localStorage.setItem(key, vm.hideAvatar.toString());

        }

        $rootScope.$on('EntityChanged', function (event, data) {
            if (data && vm.org && vm.org.id.toLowerCase() == data.toLowerCase()) {
                //console.log("Org ent chg", data);
                //var key = String.format("organization{0}", data.toLowerCase());
                dataApi.clearCacheItemByEntity(9, data).then(function () {
                    vm.refreshData(data);
                });
            }
        });

        $scope.$on('$ionicView.enter', function () {
          dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.organization, $stateParams.groupId).then(function () {
            //console.log("entered");
            vm.refreshData($stateParams.groupId);

          })
        });

        dataApi.initialize("").then(function (d) {
            if ($stateParams.groupId == appGlobals.guidEmpty && !$stateParams.collectionId) console.error("Need collectionId if new entity - contact your developer.");
            $ionicLoading.show({ template: 'Loading the organization...' });

            vm.collId = appGlobals.guidEmpty;
            if ($stateParams.collectionId) vm.collId = $stateParams.collectionId;
            globals.sendAppView("org", 9, $stateParams.groupId);
            globals.setHelpView("org");
            //console.log("Org load");
            vm.refreshData($stateParams.groupId);
        });

    };

    //#endregion
})();


(function () {
    'use strict';
    //#region OrgEditCtrl
    angular.module("shuriApp").controller('OrgEditCtrl', ['$scope', '$rootScope', '$q', '$state', '$stateParams', '$ionicHistory', '$ionicPopup', '$ionicLoading', '$ionicScrollDelegate', '$ionicModal', '$timeout', '$window', 'globals', 'dataApi', 'appGlobals', OrgEditCtrl]);

    function OrgEditCtrl($scope, $rootScope, $q, $state, $stateParams, $ionicHistory, $ionicPopup, $ionicLoading, $ionicScrollDelegate, $ionicModal, $timeout, $window, globals, dataApi, appGlobals) {
      var vm = this;
      vm.textareaRows = globals.textareaRows();

        vm.refreshData = function (orgId) {
            if (!orgId) console.error("Error", "Missing groupId - contact your developer.");
            else {
                vm.showOrg = false;
                $ionicLoading.show({ template: 'Loading the organization...' });
                dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.organization, orgId).then(function () {
                    $q.all({
                        dataAppUser: dataApi.getAppUser(),
                        dataOrg: dataApi.getOrg(orgId, vm.collId, 2, "orgEdit")
                    }).then(function (d) {
                        vm.appUser = d.dataAppUser;
                        vm.org = d.dataOrg;
                        vm.isNew = (vm.org.id == appGlobals.guidEmpty);
                        vm.fullControl = false;
                        vm.appUser.subsMayEdit.forEach(function (coll) {
                            if (coll.group_Id == vm.org.collection_Id) vm.fullControl = true;
                        });
                        vm.title = 'Organization';
                        //console.log(vm.org);
                        vm.showOrg = true;
                        $ionicLoading.hide();
                    }, function (err) {
                        console.error(err);
                        vm.showOrg = true;
                        $ionicLoading.hide();
                    });

                });
            }
        };

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.cancel = function () {
            vm.isDirty = false;
            vm.org = null;
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $ionicHistory.goBack();
        }

        vm.makeDirty = function () { vm.isDirty = true;}

        vm.save = function () {
            if (vm.org.id == appGlobals.guidEmpty) vm.org.grpType = 3;
            //console.log(vm.org);
            dataApi.postEntity("groups", "organization", vm.org, 9).then(function (org) {
              //was tenure updated?
              var tenPerson = null;
              vm.org.people.forEach(function (per) {
                if (per.changeType == 1) {
                  tenPerson = per;
                }
              });
              if (tenPerson) {
                dataApi.clearCacheItemByEntity(4, tenPerson.id).then(function (data) {
                  $rootScope.$broadcast("EntityChanged", tenPerson.id);
                });

              }


              if (vm.org.tenureEntityType) {
                clearCacheItemByEntity(vm.org.tenureEntityType, vm.org.tenureEntityId).then(function (data) {
                  //console.log(relatedEntityType);
                  $rootScope.$broadcast("EntityChanged", vm.org.tenureEntityId);
                });

              }

                vm.cancel();
            });
        };

        vm.delete = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Permanent Delete',
                template: "Permanently delete " + vm.org.name + "? <br /><br /> There is NO un-do for this action."
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(vm.org.id, shuri_enums.entitytypes.organization, vm.org).then(function (data) {
                        $state.go("home.main");
                    });
                }
            });
        }


        $scope.$on('$ionicView.enter', function () {
          if ($stateParams.groupId !== appGlobals.guidEmpty) dataApi.clearCacheItemByEntity(9, $stateParams.groupId).then(function () {
            vm.refreshData();
          });
        });

        dataApi.initialize("").then(function (d) {
            if ($stateParams.groupId == appGlobals.guidEmpty && !$stateParams.collectionId) console.error("Need collectionId if new entity - contact your developer.");

            vm.collId = appGlobals.guidEmpty;
            if ($stateParams.collectionId) vm.collId = $stateParams.collectionId;

            vm.refreshData($stateParams.groupId);
            globals.setHelpView('orgEdit');
            globals.sendAppView('orgEdit', 9, $stateParams.groupId);
        });


    };

    //#endregion
})();
