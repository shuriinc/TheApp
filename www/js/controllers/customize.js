(function () {
    'use strict';

    angular.module("shuriApp").controller('CustomizeCtrl', ['$scope', '$state', '$stateParams', '$filter', '$window', '$q', '$ionicModal', '$ionicPopup', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', CustomizeCtrl]);

    function CustomizeCtrl($scope, $state, $stateParams, $filter, $window, $q, $ionicModal, $ionicPopup, $ionicHistory, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.title = "Customize"
  
        vm.refreshData = function () {
            vm.showList = false;

            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataPrimitives: dataApi.getPrimitives(shuri_enums.entitytypes.touch)
            }).then(function (d) {
                vm.appUser = d.dataAppUser;
                vm.touchPrimitives = d.dataPrimitives;

                vm.updatable = false;
                vm.appUser.subsMayEdit.forEach(function (sub) { if (sub.group_Id == $stateParams.collectionId) vm.updatable = true; });

                //collections
                vm.databases = [];
                if (vm.updatable && vm.appUser.subsMayEdit && vm.appUser.subsMayEdit.length > 1) {
                    vm.selectedSub = vm.appUser.subsMayEdit[0];
                    vm.appUser.subsMayEdit.forEach(function (sub) {
                        vm.databases.push(sub);
                        if (sub.group_Id == $stateParams.collectionId) vm.selectedSub = sub;
                    });
                    vm.dbName = vm.selectedSub.name;
                    getDataForCollection(vm.selectedSub.group_Id);
                }
                else {
                    dataApi.getMyGroups().then(function (data) {
                        data.forEach(function (grp) {
                            if (grp.id == $stateParams.collectionId) vm.selectedSub = grp;
                        });
                        getDataForCollection($stateParams.collectionId);
                        if (vm.selectedSub) vm.dbName = vm.selectedSub.name;
                    })
                }

            });
        };

        function getDataForCollection(collId) {
            vm.showList = false;
            dataApi.clearCacheItem("kUserTypes" + collId);
            dataApi.clearCacheItem('userTypeLooseTags');
            $q.all({
                dataUT: dataApi.getUserTypes(collId),
                dataUTPublic: dataApi.getUserTypes(appGlobals.guidEmpty),
                dataUTLoose: dataApi.userTypeLooseTags(collId),
            }).then(function (d) {
                vm.usertypesTags = $filter('filter')(d.dataUT, function (ut) { return ut.entityType == shuri_enums.entitytypes.tag; });
                vm.usertypesTouches = $filter('filter')(d.dataUT, function (ut) { return ut.entityType == shuri_enums.entitytypes.touch; });
                vm.usertypesCPDocs = $filter('filter')(d.dataUT, function (ut) { return (ut.entityType == shuri_enums.entitytypes.contactpoint || ut.entityType == shuri_enums.entitytypes.document); });

                vm.userTypesPublic = d.dataUTPublic;
                vm.utLooseTags = d.dataUTLoose;

                loadFriendlyNames();
                vm.showList = true;
                vm.showDB = false;
                //console.log(collId, vm.utLooseTags);

            });

        }

      vm.goPersonalities = function () {
        var st = "home.personality";
        var params = { 'collectionId': vm.collectionId, 'name': vm.dbName };
        $state.go(st, params);
      };

        vm.collectionChange = function () {
            vm.dbName = vm.selectedSub.name;
          vm.collectionId = vm.selectedSub.group_Id;
            getDataForCollection(vm.selectedSub.group_Id);
        }


        vm.customEdit = function (utType, ut) {
            if (vm.updatable) {
                var utId = appGlobals.guidEmpty;
                if (ut) utId = ut.id;
                globals.setHelpView(utType);
                $state.go("home.customEdit", { collectionId: $stateParams.collectionId, utId: utId, utType: utType })
            }
        }

        vm.toggleAll = function () {
            vm.allopen = !vm.allopen;
            vm.cpopen = vm.docopen = vm.peoopen = vm.locopen = vm.tagopen = vm.touopen = vm.allopen;
            vm.buttonWord = (vm.allopen) ? "Collapse All" : "Expand All";

        }

        function loadFriendlyNames() {
            for (var i = 0; i < vm.usertypesCPDocs.length; i++) {
                vm.usertypesCPDocs[i].friendlyPrim = globals.friendlyName(vm.usertypesCPDocs[i].primitiveName);
            }

            for (var i = vm.touchPrimitives.length - 1; i >= 0; i--) {
                vm.touchPrimitives[i].friendlyPrim = vm.touchPrimitives[i].text;

                switch (vm.touchPrimitives[i].text) {
                    case "Update":
                    case "Payment":
                        vm.touchPrimitives.splice(i, 1);
                        break;
                    case "TimedMeeting":
                        vm.touchPrimitives[i].friendlyPrim = "Timed Meeting";
                        break;
                    case "TrackedEmail":
                        vm.touchPrimitives[i].friendlyPrim = "Tracked Email";
                        break;
                    case "MediaCapture":
                        vm.touchPrimitives[i].friendlyPrim = "Media Quote";
                        break;
                }

            }
        }

        //#region New Touch Type Modal

        vm.openModal = function (ut) {
            if (!ut) {
                vm.touchUT = new shuri_userType();
                vm.touchUT.entityType = shuri_enums.entitytypes.touch;
                vm.touchUT.primitive = shuri_enums.touchprimitive.meeting;
                vm.showDeleteB = false;
            }
            else {
                vm.touchUT = ut;
                vm.showDeleteB = (vm.appUser.id == ut.ownedBy_Id);
                vm.savetouchUTEnabled = true;
            }

            $ionicModal.fromTemplateUrl('addTouchType.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                vm.modalC = modal;
                vm.modalC.show();
            });

        }

        vm.closeModalC = function () {
            vm.modalC.hide();
            vm.modalC.remove();
        };

        vm.help = function () {
          var helpTemplate = "";
          helpTemplate = globals.getHelpView("touchTypes_deep");
          if (helpTemplate.template != "") {
            $ionicModal.fromTemplateUrl(helpTemplate.template, {
              scope: $scope,
              animation: 'slide-in-up'
            }).then(function (modal) {
              vm.modalHelp = modal;
              vm.modalHelp.show();
            });
          }
        }

        vm.closeHelp = function () {
            vm.modalHelp.hide();
            vm.modalHelp.remove();
        }

        vm.savetouchUT = function () {
            vm.showList = false;
            vm.touchUT.collection_Id = $stateParams.collectionId;
            //console.log(vm.collection.permType, vm.collection.name);
            dataApi.postEntity("usertypes", "usertype", vm.touchUT).then(function (data) {

                vm.closeModalC();
                vm.refreshData();

            });
        };
        vm.modalCChanged = function () {
            vm.savetouchUTEnabled = (vm.touchUT.name);
        }

        vm.delete = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: "Confirm Delete",
                template: 'Are you sure you want to delete ' + vm.touchUT.name + '?'
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(vm.touchUT.id, shuri_enums.entitytypes.usertype, vm.touchUT).then(function () {
                        vm.closeModalC();
                        vm.refreshData();
                    });
                }
            });

        };

        //#endregion

        vm.cancel = function () {
            $ionicHistory.goBack();
        }

        $scope.$on('$ionicView.enter', function () {
            vm.refreshData();
            globals.sendAppView('customize');
            globals.setHelpView('customize', 2, $stateParams.collectionId);

        });

        dataApi.initialize("").then(function (d) {
            vm.guidEmpty = appGlobals.guidEmpty;
            vm.cpopen = vm.tagopen = vm.touopen = vm.allopen = true;
            vm.buttonWord = "Collapse All";

          if (!$stateParams.collectionId || $stateParams.collectionId == appGlobals.guidEmpty) globals.showAlert("Database ID  Required", "Please contact your developer.");
          else vm.collectionId = $stateParams.collectionId;
        });


    }


})();

(function () {
    'use strict';
    angular.module("shuriApp").controller('CustomEditCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$q', '$window', '$ionicPopup', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', CustomEditCtrl]);
    function CustomEditCtrl($rootScope, $scope, $state, $stateParams, $q, $window, $ionicPopup, $ionicHistory, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); }
        vm.title = vm.wordFor("Customize");


        vm.refreshData = function () {
            vm.showList = false;

            loadPrimitives();

            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataPrimitives: dataApi.getPrimitives(shuri_enums.entitytypes.touch)
            }).then(function (d) {
                vm.appUser = d.dataAppUser;
                vm.touchPrimitives = d.dataPrimitives;

                if ($stateParams.utId == appGlobals.guidEmpty) {
                    vm.usertype = new shuri_userType();
                    vm.isNew = true;
                    vm.usertype.updatable = true;
                    vm.usertype.collection_Id = $stateParams.collectionId;
                    vm.customizablePrimitive = true;
                    vm.subtitle = "New Custom Field";
                    loadComplete();
                }
                else {
                    dataApi.getUserType($stateParams.utId).then(
                             function (data) {
                                 vm.usertype = data;
                                 if (vm.usertype.entityType == shuri_enums.entitytypes.tag) {
                                     vm.usertype.tagsCount = vm.usertype.tags.length;
                                     vm.customType = "tagset";
                                 }
                                 vm.friendlyPrim = globals.friendlyName(vm.usertype.primitiveName);
                                 vm.isNew = false;
                                 vm.customizablePrimitive = false;
                                 for (var i = 0; i < vm.primitives.length; i++) {
                                     if (vm.primitives[i].entityType == vm.usertype.entityType && vm.primitives[i].primitive == vm.usertype.primitive) {
                                         vm.selectedPrim = vm.primitives[i];
                                         vm.customizablePrimitive = true;
                                         break;
                                     }
                                 }
                                 vm.showDelete = (vm.appUser.id == vm.usertype.ownedBy_Id);
                                 syncPrims(vm.usertype)
                                 loadComplete();

                             });

                }


            });

        };

        //#region Event Handlers
        vm.customChanged = function () {

            vm.isDirty = (vm.usertype.name
                && ((vm.usertype.forPeople || vm.usertype.forOrgs || vm.usertype.forTouches) || vm.usertype.entityType == shuri_enums.entitytypes.tag)
                                && (vm.selectedPrim || !vm.showPrims)
                );
            //console.log(vm.usertype.name,((vm.usertype.forPeople || vm.usertype.forOrgs || vm.usertype.forTouches) || vm.usertype.entityType == shuri_enums.entitytypes.tag), (vm.selectedPrim || !vm.showPrims)     );
        }

        vm.primChanged = function (prim) {
            //can only be set at create or if text to text
            if (vm.isNew || (prim.isText && vm.isTextSelected)) {
                vm.usertype.entityType = prim.entityType;
                vm.usertype.primitive = prim.primitive;
                syncPrims(prim);
                vm.customChanged();
            }

        }


        vm.cancel = function () {
            
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $ionicHistory.goBack();
        }

        vm.save = function () {
            if (!vm.usertype.name || vm.usertype.name == "") globals.showAlert("Name Required", "Please enter a name.");
            else if (!(vm.usertype.forPeople || vm.usertype.forOrgs || vm.usertype.forTouches) && vm.usertype.entityType != shuri_enums.entitytypes.tag) globals.showAlert("Applies to Required", "A custom field must be associated to one or more entity.");
            else if (!(vm.selectedPrim || !vm.showPrims)) globals.showAlert("Type Required", "Please choose one of the types of information that your custom field will contain.");
            else {
                dataApi.postEntity("usertypes", "usertype", vm.usertype).then(function (data) {
                    dataApi.refreshAppUser().then(function () {
                        $rootScope.$broadcast("RefreshMain", true);
                        vm.cancel();

                    });
                }, function (errorObj) {
                    vm.showList = true;
                    //console.log(errorObj);
                    if (errorObj && errorObj.message) {
                        if (errorObj.message.toLowerCase().indexOf("duplicate name") > -1) globals.showAlert("Duplicate Name", "There is already an item named <b>" + vm.usertype.name + "</b>.   ");
                        else globals.showAlert("Error", errorObj.message);
                    }
                    else if (errorObj) console.log(errorObj);

                });
            }
        }

        vm.delete = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: "Confirm Delete",
                template: 'Are you sure you want to delete ' + vm.usertype.name + '?'
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(vm.usertype.id, shuri_enums.entitytypes.usertype, vm.usertype).then(function () {
                        $rootScope.$broadcast("RefreshMain", true);
                        $ionicHistory.goBack();
                    });
                }
            });

        };

        vm.infoGlobal = function () {
            console.log("II");
            //globals.showAlert("Make Global", "Turn this on to apply this custom field to all databases.");
        };
        //#endregion

        //#region private methods
        function syncPrims(prim) {
            //update the UI like Radio button
            vm.isTextSelected = false;
            for (var i = 0; i < vm.primitives.length; i++) {
                if (vm.primitives[i].entityType === prim.entityType &&
                    vm.primitives[i].primitive === prim.primitive) {
                    vm.primitives[i].isSelected = true;
                    vm.selectedPrim = true;
                    vm.isTextSelected = vm.primitives[i].isText;
                }
                else vm.primitives[i].isSelected = false;
            }

        }

         function loadPrimitives() {
            if (!vm.primitives) {
                vm.primitives = [
                    { name: "Email", primitive: 1, entityType: 0, description: "A valid email address." },
                    { name: "Phone", primitive: 2, entityType: 0, description: "Any phone number" },
                    { name: "Link", primitive: 3, entityType: 0, description: "Any browser URL" },
                    { name: "Date", primitive: 7, entityType: 1, description: "A valid date.  A date picker will be provided." },
                    { name: "Any Text", primitive: 2, entityType: 1, description: "Accommodates anything that fits on 1 line", isText: true },
                    { name: "Any Text - Long", primitive: 3, entityType: 1, description: "Lots of text (multiple lines)", isText: true },
                    { name: "Number", primitive: 5, entityType: 1, description: "Any number, fraction, or currency" },
                    { name: "On/Off Slider", primitive: 6, entityType: 1, description: "Anything binary like yes/no, on/off, true/false" },
                    { name: "Rating: Thumbs Up/Down", primitive: 8, entityType: 1, description: "Rate thumbs-up or thumbs-down" },
                    { name: "Rating: Yes/No/Maybe", primitive: 9, entityType: 1, description: "Assign yes/no/maybe as in an invitation" },
                    { name: "Rating: 5 Stars", primitive: 10, entityType: 1, description: "1-5 stars" },
                    { name: "Rating: 0 to 100", primitive: 11, entityType: 1, description: "An integer rating from 0 to 100.  A sliding rater will be provided." },

                ];
            }
        }

 

        function loadComplete() {
            switch (vm.customType) {
                case "tagset":
                    vm.title = vm.wordFor('Tag') + " " + vm.wordFor('Set');
                    vm.subtitle = ((vm.isNew) ? "New" : vm.usertype.name);
                    vm.nameLabel = vm.wordFor('Name');
                    if (vm.usertype.name) {
                        if (vm.usertype.name == ' Tags') {
                            vm.title = "Tags in no Set";
                            vm.subtitle = "My Loose Tags ";
                            vm.isLooseTags = true;
                        }
                    }
                    vm.showPrims = false;

                    vm.usertype.entityType = shuri_enums.entitytypes.tag;
                    vm.usertype.primitive = 0;
                   // console.log(vm);
                    break;
                case "custom":
                    vm.nameLabel = vm.wordFor('Label');
                    vm.showPrims = true;
                    vm.title = vm.wordFor("Custom") + " " + vm.wordFor("Field");
                    vm.subtitle = (vm.isNew) ? "New" : vm.usertype.name;
                    break;
            }
            vm.showList = true;

        }

        //#endregion

        $rootScope.$on('EntityChanged', function (event, data) {
            if (vm.usertype && vm.usertype.id.toLowerCase() == data.toLowerCase()) {
                //console.log("usertype chg");
                vm.refreshData(data);
            }
        });

        dataApi.initialize("").then(function (d) {
            vm.guidEmpty = appGlobals.guidEmpty;

            if ($stateParams.utId == appGlobals.guidEmpty) {
                if (!$stateParams.utType || !$stateParams.collectionId || $stateParams.utType == vm.guidEmpty || $stateParams.collectionId == vm.guidEmpty || $stateParams.utType == "" || $stateParams.collectionId == "") globals.showAlert("Invalid parameters", "Please contact your developer.");
            }

            if ($stateParams.utType) vm.customType = $stateParams.utType;
            vm.refreshData();
            globals.sendAppView('customEdit', 8, $stateParams.utId);
        });


    }




})();

(function () {
  'use strict';

  angular.module("shuriApp").controller('PersonalityCtrl', ['$scope', '$state', '$stateParams', '$filter', '$window', '$q', '$ionicModal', '$ionicPopup', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', PersonalityCtrl]);

  function PersonalityCtrl($scope, $state, $stateParams, $filter, $window, $q, $ionicModal, $ionicPopup, $ionicHistory, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); }

    vm.refreshData = function () {
      vm.personalities = [];

      vm.personalities.push(perSales());
      vm.personalities.push(perPR());
      var grp = new shuri_group();
      grp.name = "Choose one...";
      vm.selectedPer = grp;
      vm.personalities.push(grp);
    };

    function perSales() {
      var pSales = new shuri_group();
      pSales.name = "Sales";
      pSales.description = "A useful set for Sales";

      var uTags = new shuri_userType();
      uTags.entityType = shuri_enums.entitytypes.tag;
      uTags.name = "Sales Stage";
      uTags.description = "Track sales efforts according to their stage of the sales process."
      uTags.forOrgs = uTags.forPeople = uTags.forTouches = 1;
      uTags.tags.push({ name: 'Prospect', id: '1' });
      uTags.tags.push({ name: 'Qualification', id: '2' });
      uTags.tags.push({ name: 'Needs Analysis', id: '3' });
      uTags.tags.push({ name: 'Proposal', id: '4' });
      uTags.tags.push({ name: 'Negotiation', id: '5' });
      uTags.tags.push({ name: 'Closed Lost', id: '6' });
      uTags.tags.push({ name: 'Closed Won', id: '7' });
      pSales.userTypes.push(uTags);

      var uType1 = new shuri_userType();
      uType1.entityType = shuri_enums.entitytypes.touch;
      uType1.primitive = shuri_enums.touchprimitive.meeting;
      uType1.name = "Cold call";
      uType1.description = "Initial prospect outreach.";
      pSales.userTypes.push(uType1);

      var uType2 = new shuri_userType();
      uType2.entityType = shuri_enums.entitytypes.touch;
      uType2.primitive = shuri_enums.touchprimitive.meeting;
      uType2.name = "In person";
      uType2.description = "In person meeting";
      pSales.userTypes.push(uType2);

      var uType3 = new shuri_userType();
      uType3.entityType = shuri_enums.entitytypes.touch;
      uType3.primitive = shuri_enums.touchprimitive.meeting;
      uType3.name = "Inbound";
      uType3.description = "Inbound query for information";
      pSales.userTypes.push(uType3);

      var uType4 = new shuri_userType();
      uType4.entityType = shuri_enums.entitytypes.touch;
      uType4.primitive = shuri_enums.touchprimitive.trackedemail;
      uType4.name = "Newsletter / Tracked Email";
      uType4.description = "Periodic tracked email to people";
      pSales.userTypes.push(uType4);

      var uType5 = new shuri_userType();
      uType5.entityType = shuri_enums.entitytypes.touch;
      uType5.primitive = shuri_enums.touchprimitive.meeting;
      uType5.name = "Phone";
      uType5.description = "Phone-based meeting";
      pSales.userTypes.push(uType5);

      var uCF1 = new shuri_userType();
      uCF1.forOrgs = uCF1.forPeople = uCF1.forTouches = 1;
      uCF1.entityType = shuri_enums.entitytypes.document;
      uCF1.primitive = shuri_enums.documentprimitive.customlongtext;
      uCF1.friendlyPrim = "Long Text";
      uCF1.name = "Sales notes";
      uCF1.description = "Personal and sales notes about this contact or touch";
      pSales.userTypes.push(uCF1);

      var uCF2 = new shuri_userType();
      uCF2.forTouches = 1;
      uCF2.entityType = shuri_enums.entitytypes.document;
      uCF2.primitive = shuri_enums.documentprimitive.customdate;
      uCF2.friendlyPrim = "Date";
      uCF2.name = "Close date";
      uCF2.description = "";
      pSales.userTypes.push(uCF2);

      var uCF3 = new shuri_userType();
      uCF3.forTouches = 1;
      uCF3.entityType = shuri_enums.entitytypes.document;
      uCF3.primitive = shuri_enums.documentprimitive.currency;
      uCF3.friendlyPrim = "Currency";
      uCF3.name = "Sales Amount";
      uCF3.description = "Potential or actual opportunity value";
      pSales.userTypes.push(uCF3);

      var uCF4 = new shuri_userType();
      uCF4.forTouches = 1;
      uCF4.entityType = shuri_enums.entitytypes.document;
      uCF4.primitive = shuri_enums.documentprimitive.rating0to100;
      uCF4.friendlyPrim = "Rating 0-100";
      uCF4.name = "Close probability";
      uCF4.description = "Probability of closing on a scale of 0-100% ";
      pSales.userTypes.push(uCF4);

      return pSales;
    }

    function perPR() {
      var pPR = new shuri_group();
      pPR.name = "Public Relations";
      pPR.description = "A useful set for Public Relations";

      var uTags = new shuri_userType();
      uTags.entityType = shuri_enums.entitytypes.tag;
      uTags.name = "Person Type";
      uTags.description = "Track the actors in your relationships by role."
      uTags.forPeople = 1;
      uTags.tags.push({ name: 'Editor', id: '1' });
      uTags.tags.push({ name: 'Press', id: '2' });
      uTags.tags.push({ name: 'Freelance', id: '3' });
      uTags.tags.push({ name: 'Social Media Influencer', id: '4' });
      uTags.tags.push({ name: 'PR Pro', id: '5' });
      uTags.tags.push({ name: 'Media Admin', id: '6' });
      uTags.tags.push({ name: 'Writer', id: '7' });
      pPR.userTypes.push(uTags);

      var uTags1 = new shuri_userType();
      uTags1.entityType = shuri_enums.entitytypes.tag;
      uTags1.name = "Outlet Type";
      uTags1.description = "Categorize the outlets."
      uTags1.forOrgs = uTags1.forPeople = 1;
      uTags1.tags.push({ name: 'Social Media', id: '1' });
      uTags1.tags.push({ name: 'Newspaper', id: '2' });
      uTags1.tags.push({ name: 'Television', id: '3' });
      uTags1.tags.push({ name: 'Multiple', id: '4' });
      pPR.userTypes.push(uTags1);

      var uType1 = new shuri_userType();
      uType1.entityType = shuri_enums.entitytypes.touch;
      uType1.primitive = shuri_enums.touchprimitive.meeting;
      uType1.typename = shuri_enums.touchprimitive.meeting;
      uType1.name = "Media call";
      uType1.description = "Media outreach.";
      pPR.userTypes.push(uType1);

      var uType3 = new shuri_userType();
      uType3.entityType = shuri_enums.entitytypes.touch;
      uType3.primitive = shuri_enums.touchprimitive.meeting;
      uType3.name = "Inbound";
      uType3.description = "Inbound query for information";
      pPR.userTypes.push(uType3);

      var uType4 = new shuri_userType();
      uType4.entityType = shuri_enums.entitytypes.touch;
      uType4.primitive = shuri_enums.touchprimitive.trackedemail;
      uType4.name = "Press Release";
      uType4.description = "Periodic tracked email to people";
      pPR.userTypes.push(uType4);

      var uCF1 = new shuri_userType();
      uCF1.forOrgs = uCF1.forPeople = uCF1.forTouches = 1;
      uCF1.entityType = shuri_enums.entitytypes.document;
      uCF1.primitive = shuri_enums.documentprimitive.customlongtext;
      uCF1.friendlyPrim = "Long Text";
      uCF1.name = "Pitch notes";
      uCF1.description = "Personal and private notes about pitching this contact or additional touch details";
      pPR.userTypes.push(uCF1);

      var uCF2 = new shuri_userType();
      uCF2.forTouches = 1;
      uCF2.entityType = shuri_enums.entitytypes.document;
      uCF2.primitive = shuri_enums.documentprimitive.customdate;
      uCF1.friendlyPrim = "Date";
      uCF2.name = "Follow-up date";
      uCF2.description = "Due date for the follow-up";
      pPR.userTypes.push(uCF2);

      var uCF3 = new shuri_userType();
      uCF3.forTouches = 1;
      uCF3.entityType = shuri_enums.entitytypes.document;
      uCF3.primitive = shuri_enums.documentprimitive.custombinary;
      uCF1.friendlyPrim = "Checkbox";
      uCF3.name = "Follow-up complete";
      uCF3.description = "Checked when the follow-up has been accomplished";
      pPR.userTypes.push(uCF3);

      var uCF4 = new shuri_userType();
      uCF4.forTouches = 1;
      uCF4.entityType = shuri_enums.entitytypes.document;
      uCF4.primitive = shuri_enums.documentprimitive.rating0to100;
      uCF1.friendlyPrim = "Rating 0-100";
      uCF4.name = "Follow-up";
      uCF4.description = "Describe the task(s) required for this follow-up";
      pPR.userTypes.push(uCF4);

      return pPR;
    }

    vm.personalityChange = function (per) {
      console.log(per);
      vm.usertypesTags = $filter('filter')(per.userTypes, function (ut) { return ut.entityType == shuri_enums.entitytypes.tag; });
      vm.usertypesTouches = $filter('filter')(per.userTypes, function (ut) { return ut.entityType == shuri_enums.entitytypes.touch; });
      vm.usertypesCPDocs = $filter('filter')(per.userTypes, function (ut) { return (ut.entityType == shuri_enums.entitytypes.contactpoint || ut.entityType == shuri_enums.entitytypes.document); });

    }
 
    vm.cancel = function () {
      $ionicHistory.goBack();
    }

    $scope.$on('$ionicView.enter', function () {
      if (!$stateParams.collectionId || $stateParams.collectionId == appGlobals.guidEmpty) globals.showAlert("Database ID  Required", "Please contact your developer.");
      else vm.collectionId = $stateParams.collectionId;
      if (!$stateParams.name || $stateParams.name == '') globals.showAlert("Database name  Required", "Please contact your developer.");
      else vm.dbName = $stateParams.name;

      vm.refreshData();
    });


  }


})();

