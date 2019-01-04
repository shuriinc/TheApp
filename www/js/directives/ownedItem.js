
(function () {
    'use strict';
    angular.module("shuriApp").directive('ownedItem', ['$rootScope', '$ionicHistory', '$window', '$state', '$q', 'dataApi', 'globals', 'appGlobals',
     function ($rootScope, $ionicHistory, $window, $state, $q, dataApi, globals, appGlobals) {
         return {
             restrict: "E",
             scope: {
                 entity: '=',
                 entityType: '=',
                 isDirty: '=',
                 updatable: '=',
                 startOpen: '='
             },
             templateUrl: "templates/directives/ownedItem.html?" + _cacheBuster,
             link: function (scope, element, attrs) {
                 scope.guidEmpty = appGlobals.guidEmpty;
                 scope.showDelete = false;
                 scope.wordFor = function (word) { return globals.wordFor(word); };
                 scope.collectionLabel = scope.wordFor("Collection");
                 scope.objModel = {};

                 var watcherI = scope.$watch('entity', function () {
                     if (typeof scope.entity === "undefined" || scope.entity === null) return;
                     if (scope.entity.id != appGlobals.guidEmpty && scope.entity.collection_Id == appGlobals.guidEmpty) console.error("Existing Entity has no collection_Id");
                     scope.originalCollectionId = scope.entity.collection_Id;
                     AssignUI();
                 });

                 var watcherT = scope.$watch('entityType', function () {
                     if (scope.entityType === undefined) return;
                     AssignUI();
                 });

                 var watcherU = scope.$watch('updatable', function () {
                     if (scope.updatable === undefined) return;
                     scope.updatableSet = true;
                     scope.updatable = (scope.updatable == true || scope.updatable == "true");
                     AssignUI();
                 });

                 var watcherSO = scope.$watch('startOpen', function () {
                     if (scope.startOpen === undefined) return;
                 });

                 function AssignUI() {
                     if (!scope.entity || !scope.entityType || !scope.updatableSet) return;
                     //console.log("entity");

                     scope.isNew = (scope.entity.id == appGlobals.guidEmpty);
                     scope.isLooseTag = (scope.entityType == 5 && scope.entity.userType_Id && scope.entity.userType_Id == appGlobals.guidLooseTags);
                     //console.log(scope.objModel, scope.isInEdit);

                     //-------------------------Open/Close-----------------------------
                     var prefKeyDivOpen = String.format("oiDivOpen{0}{1}", scope.entityType, scope.updatable);
                     if (sessionStorage.getItem(prefKeyDivOpen)) scope.oiDivOpen = sessionStorage.getItem(prefKeyDivOpen).toString().toLowerCase() == "true";
                     if (scope.entityType == shuri_enums.entitytypes.document) scope.oiDivOpen = true; //force doc open
                     if (scope.startOpen || scope.isNew) scope.oiDivOpen = true;

                     if (scope.entityType > 9 || (scope.entityType == shuri_enums.entitytypes.group && (scope.entity.grpType == shuri_enums.grouptype.collection || scope.entity.grpType == shuri_enums.grouptype.team || scope.entity.grpType == shuri_enums.grouptype.private))) {
                         scope.hidecollectionName = true;
                     }

                     dataApi.getAppUser().then(function (d) {
                         scope.appUser = d;

                         var theDBId = scope.entity.collection_Id;
                         if (!theDBId || theDBId == appGlobals.guidEmpty) {
                             theDBId = scope.entity.collection_Id = scope.appUser.defaultCollection_Id;
                         }

                         //----------------------Owner ------------------------------------------------
                         scope.isOwner = (scope.entity.ownedBy_Id == scope.appUser.id);
                         scope.hideOwner = (!scope.entity.ownedByName || scope.entity.ownedByName == '');

                         scope.objModel.isReadOnlyTeam = !(scope.updatable && (scope.isOwner || scope.isNew));
                         scope.objModel.isReadOnlyDB = !(scope.updatable && (scope.isOwner || scope.isNew));

                         scope.isInEdit = false;
                         if ($state.current.name.toLowerCase().indexOf("edit") >= 0) scope.isInEdit = true;
                         if ($state.current.name == "modal.newGroup") scope.isInEdit = true;
                         if (scope.isInEdit) scope.oiDivOpen = true;


                         //AR DB special handling
                         scope.useNameOverride = (theDBId.toLowerCase() === appGlobals.guidARDB);

                         //Usertypes may never move databases
                         if (scope.entityType == shuri_enums.entitytypes.usertype) {
                             scope.objModel.isReadOnlyDB = scope.hidecollectionName = !scope.isNew;
                             scope.objModel.isReadOnlyTeam = !(scope.isOwner || scope.isNew);
                         }
                         else if (scope.isLooseTag && scope.isInEdit) scope.objModel.isReadOnlyDB = scope.objModel.isReadOnlyTeam = false;

                         scope.appUser.subscriptions.forEach(function (sub) {
                             if (scope.entity.collection_Id == sub.group_Id) {
                                 scope.entity.collectionName = sub.name;
                             }
                         });

                         if (scope.objModel.isReadOnlyDB) {
                             if (!scope.entity.collectionName || scope.entity.collectionName == "") {
                                 scope.entity.collectionName = '[not found]';
                             }
                             if (scope.entity.collectionName == '[not found]') scope.hidecollectionName = true;

                             if (!scope.entity.ownedByGroupName || scope.entity.ownedByGroupName == "undefined" || scope.entity.ownedByGroupName == "") scope.entity.ownedByGroupName = "(none)";
                         }

                         else {
                             //-------------------------Updatable  ----------------------------------------
                             var userMayEdit = false;
                             scope.collections = [];
                             scope.appUser.subsMayEdit.forEach(function (sub) {
                                 if (sub.group_Id == theDBId) {
                                     userMayEdit = true;
                                     scope.objModel.selectedSub = sub;
                                 }
                                 scope.collections.push(sub);
                             });
                         }

                         if (!scope.objModel.isReadOnlyTeam) {
                             scope.editingTeams = [];
                             refreshTeams(theDBId).then(function (data) {
                                 //console.log(data);
                                 scope.editingTeams = data;
                                 scope.objModel.editingTeamId = appGlobals.guidSystem; //default
                                 if (scope.entity.ownedByGroup_Id && scope.entity.ownedByGroup_Id != null) {
                                     scope.editingTeams.forEach(function (tm) {
                                         if (tm.id === scope.entity.ownedByGroup_Id) scope.objModel.editingTeamId = tm.id;
                                     });
                                 }
                                 else if (scope.isNew) {
                                     //get team from DB
                                     var dbOwnedByGroupId;
                                     //console.log(scope.collections, scope.entity.collection_Id);
                                     scope.collections.forEach(function (coll) {
                                         if (coll.group_Id == theDBId) dbOwnedByGroupId = coll.ownedByGroup_Id
                                     });
                                     if (dbOwnedByGroupId) {
                                         scope.editingTeams.forEach(function (tm) {
                                             if (tm.id === scope.entity.ownedByGroup_Id) scope.objModel.editingTeamId = tm.id;
                                         });
                                     }
                                 }

                                 if (scope.updatable && scope.editingTeams.length == 0) scope.hideEditingTeam = true;


                             });
                         }

                         if (scope.isLooseTag) {
                             scope.hidecollectionName = true;
                             if (scope.entity.ownedBy_Id == scope.appUser.id) {
                                 scope.objModel.isReadOnlyDB = scope.isReadOnlyTeam = !scope.isInEdit;
                                 refreshTeams().then(function (teams) {
                                     scope.editingTeams = teams;
                                     scope.objModel.editingTeamId = appGlobals.guidSystem; //default
                                     if (scope.entity.ownedByGroup_Id) {
                                         scope.editingTeams.forEach(function (tm) {
                                             if (tm.id === scope.entity.ownedByGroup_Id) scope.objModel.editingTeamId = tm.id;
                                         });
                                     }

                                 });
                             }
                             else scope.objModel.isReadOnlyDB = scope.isReadOnlyTeam = true;
                         }

                         //console.log(scope.objModel, scope.isInEdit);

                     });
                 }


                 scope.collectionChanged = function () {
                     var sub = scope.objModel.selectedSub;
                     var dbId = sub.group_Id;
                     //console.log(sub);

                     scope.entity.collectionChanged = true;
                     scope.entity.originalCollectionId = scope.originalCollectionId;
                     scope.entity.collection_Id = dbId;
                     scope.isDirty = true;

                     refreshTeams(dbId).then(function (data) {
                         //console.log(data);
                         scope.editingTeams = data;
                         if (scope.editingTeams.length == 1) {
                             scope.hideEditingTeam = true;
                             scope.objModel.editingTeamId = appGlobals.guidSystem;
                             scope.entity.ownedByGroup_Id = undefined;
                         }
                         else {
                             scope.hideEditingTeam = false;

                             var teamId = null;

                             //set the new editing team id.  1. if it was NONE, keep it NONE; 2.  if the old one is available, use it.; 3. use the new collection's editing team
                             if (scope.isNew && !scope.collectionChangedOnce) {
                                 scope.collectionChangedOnce = true;
                                 //get team from DB
                                 var dbOwnedByGroupId;
                                 //console.log(scope.collections, theDBId);
                                 scope.collections.forEach(function (coll) {
                                     if (coll.group_Id == dbId) dbOwnedByGroupId = coll.ownedByGroup_Id
                                 });
                                 if (dbOwnedByGroupId) {
                                     scope.editingTeams.forEach(function (tm) {
                                         if (tm.id === scope.entity.ownedByGroup_Id) teamId = tm.id;
                                     });
                                 }
                             }
                             else if (!scope.entity.ownedByGroup_Id || scope.entity.ownedByGroup_Id == null) {
                                 teamId = appGlobals.guidSystem;
                             }
                             else {
                                 scope.editingTeams.forEach(function (tm) {
                                     if (tm.id === scope.entity.ownedByGroup_Id) teamId = tm.id;
                                 });
                             }

                             if (teamId == null) {
                                 //get the group to get the editing team
                                 dataApi.getGroup(dbId).then(function (newDb) {
                                     //console.log(newDb);
                                     teamId = newDb.ownedByGroup_Id;

                                     if (teamId == null) {
                                         teamId = appGlobals.guidSystem;
                                     }

                                     scope.objModel.editingTeamId = teamId;
                                     scope.ownedByGroupChanged();
                                     //console.log(scope.editingTeams, scope.objModel.editingTeamId);

                                 });
                             }
                             else {
                                 scope.objModel.editingTeamId = teamId;
                                 scope.ownedByGroupChanged();
                             }
                         }
                     });
                 }

                 scope.ownedByGroupChanged = function () {
                     scope.isDirty = true;
                     var id = scope.objModel.editingTeamId;
                     if (id == appGlobals.guidSystem) scope.entity.ownedByGroup_Id = undefined;
                     else scope.entity.ownedByGroup_Id = id;
                     //console.log("ownedByGroup changed");
                 }

                 scope.toggleDiv = function () {
                     scope.oiDivOpen = !(scope.oiDivOpen);
                     //persist pref
                     var prefKeyDivOpen = String.format("oiDivOpen{0}{1}", scope.entityType, scope.updatable);
                     sessionStorage.setItem(prefKeyDivOpen, scope.oiDivOpen);
                 }

                 scope.showPermissions = function (event) {
                     if (event) event.stopPropagation();

                     var et = scope.entityType;

                     if (et == 2) {
                         switch (scope.entity.grpType) {
                             case shuri_enums.grouptype.collection:
                                 et = shuri_enums.entitytypes.subscription;
                                 break;
                             case shuri_enums.grouptype.private:
                                 et = shuri_enums.entitytypes.private;
                                 break;
                             case shuri_enums.grouptype.team:
                                 et = shuri_enums.entitytypes.team;
                                 break;
                             case shuri_enums.grouptype.organization:
                                 et = shuri_enums.entitytypes.organization;
                                 break;
                         }
                     }

                     appGlobals.objModal = scope.entity;
                     $state.go("modal.permissions", { id: scope.entity.id, entityType: et });

                 }

                 scope.closePermissions = function () {
                     scope.modalC.hide();
                     scope.modalC.remove();
                 }

                 scope.changeEntityOwner = function () {
                     //if (scope.isOwner && scope.appUser && scope.appUser.isSysAdmin) {
                     appGlobals.objModal = scope.entity;
                     $state.go("modal.changeOwner", { entityType: scope.entityType });
                     //}
                 }


                 function refreshTeams(dbId) {
                     //console.log("refreshTeams");
                     //Editing teams depend upon the DB ownedByGroup - must be equal or a subset
                     if (!scope.entity || !scope.entityType) return;

                     return $q(function (resolve, reject) {
                         //special cases:  teams, groups, dbs, loose tag
                         if (scope.entityType > 9
                              || scope.isLooseTag
                              || (scope.entityType == shuri_enums.entitytypes.group
                                    && (scope.entity.grpType == shuri_enums.grouptype.collection || scope.entity.grpType == shuri_enums.grouptype.team || scope.entity.grpType == shuri_enums.grouptype.private)
                                 )
                             ) {
                             dataApi.getTeams().then(function (teams) {
                                 if (!ArrayContainsById(teams, appGlobals.guidSystem)) {
                                     var noneTeam = new shuri_group();
                                     noneTeam.name = "(none)";
                                     noneTeam.id = appGlobals.guidSystem;
                                     noneTeam.grpType = 2;
                                     teams.push(noneTeam);

                                 }

                                 resolve(teams);

                             });
                         }
                         else {
                             dataApi.getEditTeamsDB(dbId).then(function (data) {
                                 var teams = data.splice(0);
                                 var noneTeam = new shuri_group();
                                 noneTeam.name = "(none)";
                                 noneTeam.id = appGlobals.guidSystem;
                                 noneTeam.grpType = 2;
                                 teams.push(noneTeam);

                                 resolve(teams);
                             }, function (err) { reject(err); });
                         }
                     });

                 }


             }
         };
     }]);

})();
