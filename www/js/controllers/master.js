(function () {
    'use strict';

    angular.module("shuriApp").controller('MasterCtrl', ['$scope', '$rootScope', '$stateParams', '$state', '$filter', '$ionicActionSheet', '$ionicModal', '$ionicHistory', '$templateCache', '$window', 'dataApi', 'globals', 'appGlobals', MasterCtrl]);

    function MasterCtrl($scope, $rootScope, $stateParams, $state, $filter, $ionicActionSheet, $ionicModal, $ionicHistory, $templateCache, $window, dataApi, globals, appGlobals) {
      var vmMaster = this;

      vmMaster.showHome = vmMaster.showZoom = vmMaster.showHelp = vmMaster.showBackbutton = false;
      vmMaster.showFilter = vmMaster.showTabs = vmMaster.showQueryButtons = false;
      vmMaster.showMenu = vmMaster.showAddTouch = false;
      vmMaster.isWide = (window.innerWidth >= appGlobals.widthMedium);
      vmMaster.isSmall = (window.innerWidth <= appGlobals.widthSmall);
      vmMaster.isMedium = (!vmMaster.isWide && !vmMaster.isSmall);
      vmMaster.onDesktop = !(window.cordova);

         //#region Event handlers
 
        vmMaster.goBack = function (step) {
            $ionicHistory.goBack(step);
        };

        vmMaster.goHome = function () {
            $state.go("home.main");
        };

        vmMaster.wordFor = function (word) { return globals.wordFor(word); };

        vmMaster.showActionMenu = function () {
            dataApi.getAppUser().then(function (data) {
                vmMaster.appUser = data;
                var mybuttons = [];

                //if ($state.current.name != "home.main") mybuttons.push({ text: '<div class=""><i class="icon ion-home"></i> Home</div>', itemname: 'home' });
                mybuttons.push({ text: '<div class=""><i class="icon ion-cash"></i>Purchases</div>', itemname: 'purchases' });
                mybuttons.push({ text: '<div class=""><i class="icon ion-key"></i> Account</div>', itemname: 'account' });
                mybuttons.push({ text: '<div class=""><i class="icon ion-folder"></i>Files</div>', itemname: 'files' });
                if (vmMaster.appUser.username.indexOf("rshuri1") > -1) mybuttons.push({ text: '<div class=""><i class="icon shuri-file-excel"></i>Import</div>', itemname: 'import' });
                if (vmMaster.appUser.username.indexOf("rshuri1") > -1) mybuttons.push({ text: '<div class=""><i class="icon ion-android-contacts"></i>Sync Contacts</div>', itemname: 'contacts' });

                if (vmMaster.appUser.isWorker) mybuttons.push({ text: '<div class=""><i class="icon ion-gear-b"></i>Work Queue</div>', itemname: 'workq' });
                if (vmMaster.appUser.isSysAdmin) mybuttons.push({ text: '<div class=""><i class="icon ion-gear-b"></i>Admin</div>', itemname: 'admin' });

                mybuttons.push({ text: '<div class=""><i class="icon ion-close-round medText"></i>Logout</div>', itemname: 'logout' });

                var hideSheet = $ionicActionSheet.show({
                    buttons: mybuttons,
                    //titleText: String.format("{0}<br />Shuri App Menu", vmMaster.appUser.name),
                    titleText: vmMaster.appUser.name,
                    destructiveText: 'Cancel',
                    cssClass: 'no-scroll',
                    //destructiveText: (scope.entity.deletable && !scope.isNew && (!scope.isOnEditPage || scope.parentEntityType === shuri_enums.entitytypes.usertype)) ? '<div class="assertive"><i class="icon ion-trash-b"></i>Delete</div>' : null,
                    destructiveButtonClicked: function () {
                        hideSheet();
                    },
                    buttonClicked: function (index) {
                        doAction(this.buttons[index].itemname);
                        hideSheet();
                    },
                });
            });

        };

        function doAction(itemname) {
                switch (itemname) {
                    case "account":
                        $state.go("home.account");
                        break;
                    case "admin":
                        if (vmMaster.appUser.isSysAdmin) $state.go("home.sysAdmin");
                        break;
                    case "contacts":
                        $state.go("home.contacts");
                        break;
                    case "customize":
                        $state.go("home.customize", { collectionId: vmMaster.appUser.defaultCollection_Id });
                        break;
                    case "files":
                        $state.go("home.files");
                        break;
                    case "home":
                        $state.go("home.main");
                        break;
                    case "import":
                        $state.go("home.importXls");
                        break;
                    case "logout":
                        vmMaster.logout();
                        break;
                    case "purchases":
                        $state.go("home.inappPurchases", {tab: 'purchases'});
                        break; review
                    case "workq":
                        $state.go("home.workQueue");
                        break; 
                }
         }

        vmMaster.toggleZoom = function () {
            vmMaster.expandUI = !vmMaster.expandUI;
            if (vmMaster.expandUI) localStorage.setItem("expandUI", "true");
            else if (localStorage.getItem("expandUI")) localStorage.removeItem("expandUI");
            AssignUI();
        };

        vmMaster.logout = function () {
            $ionicHistory.clearHistory();
            $ionicHistory.clearCache();
            $templateCache.removeAll();
            appGlobals.forceQueryRefresh = true;
            dataApi.refreshAppUser().then(function () {
                dataApi.logout().then(function () {
                    //$scope.$broadcast("RefreshMain");
                    $window.location.reload();
                 })
            });
        };

        //#endregion

        //#region Help
        vmMaster.modalPages = [];

        vmMaster.deepModal = function (deepModal) {
            vmMaster.showOk = false;
            vmMaster.modalHelp.hide();
            vmMaster.modalHelp.remove();
            vmMaster.help(deepModal);
            vmMaster.modalPages.push(deepModal);
        }


        vmMaster.help = function (nestedModal) {
            var helpTemplate = "";
            helpTemplate = globals.getHelpView(nestedModal);

            if (helpTemplate.template != "") {
                $ionicModal.fromTemplateUrl(helpTemplate.template, {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    vmMaster.modalHelp = modal;
                    if (!vmMaster.modalPages) vmMaster.modalPages = [];
                    if ((!vmMaster.modalPages.length)) {
                        vmMaster.modalPages.push(helpTemplate.view);
                        vmMaster.showOk = true;
                    }
                    vmMaster.modalHelp.template = helpTemplate.view;
                    vmMaster.modalHelp.show();
                });
            }
        }
        vmMaster.closeHelp = function () {
            vmMaster.modalPages.pop();
            vmMaster.modalHelp.hide();
            vmMaster.modalHelp.remove();
            if (vmMaster.modalPages.length === 1) vmMaster.showOk = true;
            if (vmMaster.modalPages.length) vmMaster.help(vmMaster.modalPages[vmMaster.modalPages.length - 1]);
        }
        vmMaster.closeAllHelp = function () {
          vmMaster.modalPages = [];
          vmMaster.modalHelp.hide();
          vmMaster.modalHelp.remove();
          vmMaster.showOk = true;
        }
        //#endregion

        function AssignUI() {
            var state = $state.current;
            //state.hasHelp = false;

            if (window.cordova) vmMaster.cssClass = '';
            else if (localStorage.getItem("expandUI") && localStorage.getItem("expandUI") == "true") {
              vmMaster.cssClass = 'full-screen2';
              vmMaster.expandUI = true;
            }
            //so developers can use device mode - comment out when finished
            else if (document.location.href.toLowerCase().indexOf("local") >= 0) vmMaster.cssClass = '';
            else if (localStorage.getItem(appGlobals.keys.deviceMode)) vmMaster.cssClass = '';
            else vmMaster.cssClass = 'on-desktop';

            vmMaster.showHome = !(state.name === "home.main");
            vmMaster.showZoom = (state.name === "home.main");
            vmMaster.showHelp = state.hasHelp;
            vmMaster.showBackbutton = !(state.hideNavBack);
            //console.log(state, vmMaster.showBackbutton);

            //defaults
            vmMaster.showAddTouch = vmMaster.showTabs = true;
            vmMaster.showFilter = vmMaster.hideTitle =  false;
            //console.log(state)
            switch (state.name) {
              case 'home.main':
              case "home.queryOrgs":
              case "home.queryPeople":
              case "home.queryTags":
              case "home.queryTouches":
              case "home.person":
              case "home.tag":
              case "home.touch":
                vmMaster.showFilter = true;
                break;
              case "home.org":
                vmMaster.showFilter = true;
                vmMaster.showTabs = false;
                break;
              case "home.personEdit":
              case "home.orgEdit":
              case "home.tagEdit":
              case "home.customize":
              case "home.customEdit":
              case "home.touchEdit":
                vmMaster.showAddTouch = vmMaster.showMenu = vmMaster.showHome = false;
                vmMaster.showTabs = false;
                break;
              case "home.importXls":
                vmMaster.showAddTouch = false;
                vmMaster.showTabs = false;
                break;
              case "home.inappPurchases":
                vmMaster.showTabs = false;
                break;
              case "edit.textarea":
                vmMaster.hideEditZoom = true;
                break;
              case "edit.textareaCordova":
                vmMaster.hideTitle = true;
                vmMaster.showTabs = false;
                break;
              case "home.org":
                if (vmMaster.appUser.isReviewer) vmMaster.showTabs = false;
                //console.log(vmMaster.appUser.isReviewer, vmMaster.appUser, vmMaster.showTabs = true);
                break;
            }

            if (vmMaster.showFilter) {
                //var ids = $filter("filter")(vmMaster.appUser.subscriptionIds, function (id) { return (id != appGlobals.guidEmpty && id != appGlobals.guidSystem.toLowerCase()); });
                //var subs = $filter("filter")(vmMaster.appUser.subscriptions, function (sub) { return (sub.group_Id != appGlobals.guidEmpty && sub.group_Id != appGlobals.guidSystem.toLowerCase()); });
                //console.log(ids, subs, appGlobals.guidSystem);
              vmMaster.isFiltered = vmMaster.appUser.isFiltered;
            }
            //console.log(vmMaster.cssClass);

        };


        vmMaster.addNewItem = function (itemname) {
            //console.log(itemname);
            dataApi.getAppUser().then(function (data) {
                vmMaster.appUser = data;
                var collectionId = vmMaster.appUser.defaultCollection_Id;
                //console.log(itemname);
                var addState = "";
                var params = {};
                switch (itemname) {
                    case "Touch":
                        addState = "home.touchEdit";
                        params.id = appGlobals.guidEmpty;
                        params.collectionId = collectionId;
                        params.returnState = "goback";// $state.current.name;
                        params.randomizer = RandomInt(1,999999);
                        if ($state.current.name == "home.person") {
                          params.entityId = $stateParams.personId;
                          params.entityType = 4;
                        }
                        else if ($state.current.name == "home.org") {
                          params.entityId = $stateParams.groupId;
                          params.entityType = 9;
                        }

                        //params.returnState = "goBack";
                        break;
                        //case "Person":
                        //    addState = "edit.personEdit";
                        //    params.personId = appGlobals.guidEmpty;
                        //    params.collectionId = collectionId;
                        //    break;
                        //case "Organization":
                        //    addState = "edit.orgEdit";
                        //    params.groupId = appGlobals.guidEmpty;
                        //    params.collectionId = collectionId;
                        //    break;
                        //case "Team":
                        //    getNewGroup(shuri_enums.grouptype.team, collectionId);
                        //    break;
                        //case "Group":
                        //    getNewGroup(shuri_enums.grouptype.private, collectionId);
                        //    break;
                        //case "Collection":
                        //    getNewGroup(shuri_enums.grouptype.collection, collectionId);
                        //    break;
                }
                if (addState != "") {
                    params.collectionId = collectionId;
                    $state.go(addState, params);
                }
            });
        }

        $scope.$on('$ionicView.enter', function () {
            refreshMaster();
        });

        $rootScope.$on('license.refreshed', function () {
            refreshMaster();
        });


        function refreshMaster() {
            vmMaster.refreshing = true;
            dataApi.initialize("Master").then(function (data) {
                //console.log(data);
                vmMaster.appUser = data.appUser;
                //if (!appGlobals.queryEntityType) {
                //    appGlobals.queryEntityType = 4;
                //}
                //console.log(appGlobals.queryEntityType);

                AssignUI();
                vmMaster.refreshing = false;

            });
        }

        refreshMaster();

      }


    angular.module("shuriApp").controller('MasterModalCtrl', ['$scope', '$rootScope', '$ionicHistory', '$ionicModal', '$state', '$window', 'dataApi', 'globals', 'appGlobals', MasterModalCtrl]);

    function MasterModalCtrl($scope, $rootScope, $ionicHistory, $ionicModal, $state, $window, dataApi, globals, appGlobals) {
        var vmMaster = this;
        if (!window.cordova) vmMaster.cssClass = 'on-desktop';

        //#region Event handlers

        vmMaster.goBack = function (step) {
            $window.history.go(-1);
        };

        vmMaster.wordFor = function (word) { return globals.wordFor(word); };


        function AssignUI() {
            var state = $state.current;

            vmMaster.isWide = (window.innerWidth >= appGlobals.widthMedium);
            vmMaster.isSmall = (window.innerWidth <= appGlobals.widthSmall);
            vmMaster.isMedium = (!vmMaster.isWide && !vmMaster.isSmall);
            vmMaster.onDesktop = !(window.cordova);
            //console.log(vmMaster.isWide, vmMaster.isMedium, vmMaster.isSmall);

            if (window.cordova) vmMaster.cssClass = '';
                //so developers can use device mode - comment out when finished
            else if (document.location.href.toLowerCase().indexOf("local") >= 0) vmMaster.cssClass = '';
            else if (localStorage.getItem(appGlobals.keys.deviceMode)) vmMaster.cssClass = '';
            else if (vmMaster.expandUI) vmMaster.cssClass = 'full-screen';
            else vmMaster.cssClass = 'on-desktop';
            //console.log(vmMaster.cssClass);

        };

        //#region Help
        vmMaster.modalPages = [];

        vmMaster.deepModal = function (deepModal) {
            vmMaster.showOk = false;
            vmMaster.modalHelp.hide();
            vmMaster.modalHelp.remove();
            vmMaster.help(deepModal);
            vmMaster.modalPages.push(deepModal);
        }


        vmMaster.help = function (nestedModal) {
            var helpTemplate = "";
            helpTemplate = globals.getHelpView(nestedModal);

            if (helpTemplate.template != "") {
                $ionicModal.fromTemplateUrl(helpTemplate.template, {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    vmMaster.modalHelp = modal;
                    if (!vmMaster.modalPages) vmMaster.modalPages = [];
                    if ((!vmMaster.modalPages.length)) {
                        vmMaster.modalPages.push(helpTemplate.view);
                        vmMaster.showOk = true;
                    }
                    vmMaster.modalHelp.template = helpTemplate.view;
                    vmMaster.modalHelp.show();
                });
            }
        }
        vmMaster.closeHelp = function () {
            vmMaster.modalPages.pop();
            vmMaster.modalHelp.hide();
            vmMaster.modalHelp.remove();
            if (vmMaster.modalPages.length === 1) vmMaster.showOk = true;
            if (vmMaster.modalPages.length) vmMaster.help(vmMaster.modalPages[vmMaster.modalPages.length - 1]);
        }
        vmMaster.closeAllHelp = function () {
            vmMaster.modalPages = [];
            vmMaster.modalHelp.hide();
            vmMaster.modalHelp.remove();
            vmMaster.showOk = true;
        }
        //#endregion

        $scope.$on('$ionicView.enter', function () {
            AssignUI();
        });

    }



})();
