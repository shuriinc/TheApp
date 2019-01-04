(function () {
    'use strict';

    //#region TagEditCtrl
    angular.module("shuriApp").controller('TagEditCtrl', ['$ionicPopup', '$scope', '$state', '$filter', '$q', '$stateParams', '$window', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', TagEditCtrl]);

    function TagEditCtrl($ionicPopup, $scope, $state, $filter, $q, $stateParams, $window, $ionicHistory, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.isNew = ($stateParams.tagId == appGlobals.guidEmpty);
        vm.title = 'Edit Tag';

        vm.refreshData = function () {
            vm.showList = false;

            $q.all({
                dataUser: dataApi.getAppUser(),
                dataTag: dataApi.getTag($stateParams.tagId, true),
                dataUTs: dataApi.getUserTypes("forimport"),
            }).then(function (d) {
                vm.tag = d.dataTag;
                if (vm.tag.updatable) vm.ownsTag = true;

                vm.appUser = d.dataUser;
                vm.tagUTs = $filter("filter")(d.dataUTs, function (ut) {
                    return (ut.entityType == shuri_enums.entitytypes.tag && (ut.updatable == true || ut.name.trim() == "Tags"));
                })
                vm.tagUTs.forEach(function (ut) {
                    if (ut.name == " Tags") {
                        ut.text = "Loose Tags";
                        if (vm.tag.userType_Id == ut.id) vm.tag.typename = ut.name;
                    }
                    else ut.text = ut.name;
                });

                if (vm.isNew) {
                    //must provide the usertype (tagset) if new
                    if (!$stateParams.userType_Id) globals.showAlert("Error", "No Tag Set Id was provided. Contact your developer.");
                    else {
                        vm.tag.userType_Id = $stateParams.userType_Id;
                        //get the name
                        for (var i = 0; i < vm.tagUTs.length; i++) {
                            if (vm.tagUTs[i].id == vm.tag.userType_Id) {
                                vm.tag.typename = vm.tagUTs[i].name;
                                break;
                            }
                        }
                    }
                }
                vm.isLooseTag = (vm.tag.userType_Id === appGlobals.guidLooseTags);
                if (vm.isLooseTag) {
                    vm.ownsTag = (vm.appUser === vm.tag.ownedBy_Id);
                }
                vm.showList = true;
                // vm.title = vm.tag.name;
                globals.sendAppView('tagEdit', 5, $stateParams.tagId);

            });
        }

        vm.typeChanged = function (input) {
            vm.tag.changeType = shuri_enums.changetype.update;
            vm.isDirty = true;
        }

        vm.save = function () {
            console.log(vm.tag);

            //needBC
            dataApi.postEntity("tags", "tag", vm.tag).then(function (tag) {
                    vm.cancel();
                //console.log(tag);
                //may need a hard refresh because tags & usertypes are stored in appUser
            });
        };

        vm.cancel = function () {
            if(vm.isDirty){
              dataApi.clearCacheItem("tag" + vm.tag.id);
            }
            //console.log(tag);
            $ionicHistory.goBack();
        }

        vm.deleteTag = function(tag){
          var confirmPopup = $ionicPopup.confirm({
              title: 'Permanent Delete',
              template: "Permanently delete " + tag.name + "? <br /><br /> There is NO un-do for this action."
          });
          confirmPopup.then(function (res) {
            if (res) {
              dataApi.deleteEntity(tag.id, shuri_enums.entitytypes.tag, tag).then(function (data) {
                  $state.go("home.main");
              });
            }
          });
        }

        $scope.$on('$ionicView.enter', function () {
            if ($stateParams.tagId == appGlobals.guidEmpty) {
                vm.title = "Edit Tag"
                vm.tag = null;
            }
            vm.refreshData();
        });
    };

    //#endregion

})();


(function () {
    'use strict';

    //#region TagCtrl
    angular.module("shuriApp").controller('TagCtrl', ['$scope', '$rootScope', '$state', '$filter', '$q', '$stateParams', '$window', '$ionicHistory', '$ionicModal', 'globals', 'dataApi', 'appGlobals', TagCtrl]);

    function TagCtrl($scope, $rootScope, $state, $filter, $q, $stateParams, $window, $ionicHistory, $ionicModal, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.title = vm.wordFor("Tag");
      vm.twitter2Live = _twitter2Live;

        vm.refreshData = function (tagId) {
            vm.showList = false;

            $q.all({
                dataUser: dataApi.getAppUser(),
                dataTag: dataApi.getTag(tagId, true),
            }).then(function (d) {
                vm.appUser = d.dataUser;
                vm.tag = d.dataTag;
                if (vm.tag.typename == ' Tags') {
                    vm.tag.typename = 'Loose Tag';
                    vm.tag.isLoose = true;
                }
                //console.log(vm.tag.userType_Id.toUpperCase() == 'A2E53FB1-8120-4A90-9422-0D5A3B3C959D');
                vm.showList = true;
                //console.log(vm.tag);

                vm.showSharing = (vm.tag.userType_Id.toLowerCase() == appGlobals.guidLooseTags)

            });

        };

        vm.editTag = function () {
            $state.go("edit.tagEdit", { tagId: vm.tag.id });

        }

        vm.gotoUT = function () {
            $state.go("home.customEdit", { utId: vm.tag.userType_Id, utType: 5 });
        };

        vm.openLooseToUT = function () {
            dataApi.getUserTypes().then(function (data) {
                vm.tagsets = $filter("filter")(data, function (ut) {
                    return (ut.entityType == 5 && ut.name != " Tags" && ut.updatable);
                });

                $ionicModal.fromTemplateUrl('looseTagToUT.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    vm.modalMoveTag = modal;
                    vm.modalMoveTag.show();
                });
            });


        };

        vm.closeModalMoveTag = function (ut) {
            if (ut) {
                vm.tag.userType_Id = ut.id;
                dataApi.postEntity("Tags", "tag", vm.tag).then(function () {
                    $rootScope.$broadcast("RefreshMain", true);

                    vm.refreshData(vm.tag.id);
                });
            }
            vm.modalMoveTag.hide();
            vm.modalMoveTag.remove();

        }

        $scope.$on('$ionicView.enter', function () {
            dataApi.initialize("").then(function (d) {
              if (!$stateParams.tagId || $stateParams.tagId == appGlobals.guidEmpty) console.error("No Tag Set Id was provided. Contact your developer.");

                globals.sendAppView('tag', 5, $stateParams.tagId);
                globals.setHelpView('tag');
                vm.refreshData($stateParams.tagId);

            });

        });



        $rootScope.$on('EntityChanged', function (event, data) {
            if (vm.tag && vm.tag.id == data) vm.refreshData(data);
        });


        //#endregion
    };

})();



(function () {
    'use strict';

//#region TagsCtrl
    angular.module("shuriApp").controller('TagsCtrl', ['$rootScope', '$scope', '$filter', '$timeout', '$q', '$ionicModal', '$ionicScrollDelegate', '$ionicListDelegate', '$state', '$stateParams', '$ionicPopup', 'globals', 'dataApi', 'appGlobals', TagsCtrl]);

    function TagsCtrl($rootScope, $scope, $filter, $timeout, $q, $ionicModal, $ionicScrollDelegate, $ionicListDelegate, $state, $stateParams, $ionicPopup, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };

    vm.allExpanded = false;

    vm.refreshData = function () {
        $q.all({
            dataUser: dataApi.getAppUser(),
            dataUTs: dataApi.getUserTypesTags(shuri_enums.entitytypes.all, false)
        }).then(function (d) {
            vm.appUser = d.dataUser;
            vm.tagUTs = d.dataUTs;

           vm.tagUTs.forEach(function (ut) {
               //set expanded
               var key = "openTabsUT" + ut.id;
               ut.hide = !(localStorage.getItem(key));
               ut.isLoose = (ut.id == appGlobals.guidLooseTags);
               //set each tag permissions based upon it's UT
               ut.tags.forEach(function (tag) {
                   if (!ut.isLoose) {
                       tag.updatable = ut.updatable;
                       tag.deletable = ut.deletable;

                   }
               });
           });
           $scope.$broadcast('scroll.refreshComplete');

        });
    };

    vm.goTo = function (tag) {
            $state.go("home.tag", { tagId: tag.id });
    }

    vm.addTagSet = function () {
        $state.go("home.customEdit", { utId: appGlobals.guidEmpty, collectionId: vm.appUser.defaultCollection_Id, utType: 'tagset' });

    }

    vm.editItem = function (evt, tag) {
        if (evt) evt.stopPropagation();
        $ionicListDelegate.closeOptionButtons();

        if (tag.updatable) {
            $state.go("edit.tagEdit", { tagId: tag.id });
        }
    }

    vm.removeItem = function (evt, tag) {
        if (evt) evt.stopPropagation();
        $ionicListDelegate.closeOptionButtons();

        var confirmPopup = $ionicPopup.confirm({
                title: "Permanent Delete",
                template: "Permanently delete the tag: " + tag.name + "? <br /><br /> There is NO un-do."
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(tag.id, shuri_enums.entitytypes.tag).then(function (data) {
                        dataApi.refreshAppUser().then(function () {
                            vm.refreshData();

                        });
                    });
                }
            });

        //console.log(tag, index, vm.entity.tags);
    }

    vm.hardRefresh = function () {
        vm.tagUTs.forEach(function (ut) {
            var key = "openTabsUT" + ut.id;
            if (localStorage.getItem(key)) localStorage.removeItem(key);
        });
        vm.refreshData();
    }

    vm.toggleOpenUT = function (usertype) {
        usertype.hide = !usertype.hide;
        var key = "openTabsUT" + usertype.id;
        if (!usertype.hide) localStorage.setItem(key, "true");
        else if (localStorage.getItem(key)) localStorage.removeItem(key);

    }

    vm.expandAll = function (expand) {
        vm.allExpanded = expand;

        for (var i = 0; i < vm.tagUTs.length; i++) {
            vm.tagUTs[i].hide = !vm.allExpanded;
        }
        if (!vm.allExpanded) $ionicScrollDelegate.scrollTop();
    };

    vm.editTagSet = function (event, userType) {
        if (event) event.stopPropagation();
        $state.go("home.customEdit", { utId: userType.id, collectionId: userType.collection_Id, returnState: "home.queryTags" });

    }

    vm.customize = function (userType) {
        $state.go("home.customize", { collectionId: vm.appUser.defaultCollection_Id });
    }


    $scope.$on('$ionicView.enter', function () {
        vm.refreshData();
    });
};

//#endregion

})();
