(function () {
  'use strict';

  angular.module("shuriApp").directive('itemEntity', ['$rootScope', '$state', '$q', '$compile', '$filter', '$timeout', '$ionicModal', '$ionicPopup', '$ionicListDelegate', '$ionicScrollDelegate', '$ionicActionSheet', '$ionicLoading', '$window', 'ionicDatePicker', 'globals', 'dataApi', 'appGlobals', itemEntity]);

  function itemEntity($rootScope, $state, $q, $compile, $filter, $timeout, $ionicModal, $ionicPopup, $ionicListDelegate, $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $window, ionicDatePicker, globals, dataApi, appGlobals) {
    return {
      restrict: "E",
      scope: {
        entity: '=',
        entityType: '=',
        parentEntity: '=',      //for removes
        parentEntityType: '=',  //for removes
        manageUpdates: '=',
        hideAction: '=?bind',
        appuserId: '=',
        singleLine: '=',        //for condensing items like tags
        showCheckbox: '='
      },
      templateUrl: "templates/directives/itemEntity1.html?" + _cacheBuster,
      link: function (scope, elem, attrs) {
        scope.addGroupDuration = 1200;
        scope.dateFormatInput = "yyyy-MM-dd";
        scope.minutesNew = 60;
        scope.onDesktop = !(window.cordova);
        scope.cssClass = "";
        scope.wordFor = function (word) { return globals.wordFor(word); };

        //#region Watchers

        var watcherEC = scope.$watch('entity', function () {
          if (scope.entity === undefined) return;
          if (scope.entity.createdDt && !(scope.entity.place_Id)) {  //no "new" locations
            if (moment.utc().subtract(scope.minutesNew, 'minutes').isBefore(moment.utc(scope.entity.createdDt))) scope.entity.isNew = true;
          }
          //console.log(scope.entity);
          assignUI();
        })

        var watcherET = scope.$watch('entityType', function () {
          if (scope.entityType === undefined) return;
          //console.log(scope.entityType);
          assignUI();
        })

        var watcherPE = scope.$watch('parentEntity', function () {
          if (scope.parentEntity === undefined) return;
          assignUI();
        })

        var watcherPT = scope.$watch('parentEntityType', function () {
          if (scope.parentEntityType === undefined) return;
          assignUI();
        })


        var watcherRM = scope.$watch('showCheckbox', function () {
          if (scope.showCheckbox === undefined) return;
          assignUI();
        })

        var watcherMU = scope.$watch('manageUpdates', function () {
          if (typeof scope.manageUpdates === "undefined") return;
          scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");

        })


        function assignUI() {
          //console.log(scope.entityType, scope.entity, scope.parentEntity, scope.parentEntityType);
          if (scope.entityType && scope.entity && scope.parentEntity && scope.parentEntityType) {

            if (scope.entity.name && !scope.entity.line1) scope.entity.line1 = scope.entity.name;

            if (!scope.entity.entityType) scope.entity.entityType = scope.entityType;
            else if (scope.entity.entityType == shuri_enums.entitytypes.personteam) scope.entity.entityType = shuri_enums.entitytypes.person;
            //else if (scope.entity.entityType == shuri_enums.entitytypes.team) scope.entity.entityType = shuri_enums.entitytypes.person;

            //console.log(scope.entity);

            if (scope.entityType == shuri_enums.entitytypes.person && scope.parentEntityType == shuri_enums.entitytypes.organization
              || scope.entityType == shuri_enums.entitytypes.organization && scope.parentEntityType == shuri_enums.entitytypes.person) scope.hasTenure = true;
            else if (scope.parentEntityType == shuri_enums.entitytypes.all && scope.entity.tenuredId && scope.entity.tenuredId != appGlobals.guidEmpty) scope.hasTenure = true;

            //pre-fetch UI
            switch (scope.entity.entityType) {
              case shuri_enums.entitytypes.organization:
                scope.entity.backgroundColor = "bgCalmLight";
                scope.entity.color = "calm";
                scope.hasAvatar = true;
                if (scope.hasTenure) {
                  scope.entity.line2 = scope.entity.title;
                  setTenure();
                }
                break;
              case shuri_enums.entitytypes.private:
                scope.entity.backgroundColor = "bgGroupsLight";
                scope.hasAvatar = false;
                break;
              case shuri_enums.entitytypes.person:
                scope.entity.backgroundColor = "bgEnergizedLight";
                scope.entity.color = "energized";
                scope.hasAvatar = true;

                if (scope.parentEntityType == shuri_enums.entitytypes.team) scope.entity.backgroundColor = "bgTeamLight";

                if (scope.hasTenure) {
                  scope.entity.line2 = scope.entity.title;
                  setTenure();
                }
                else {
                  //check for org(s) for UI
                  if (scope.entity.groups && scope.entity.groups.length > 0 && (!scope.entity.line2 || scope.entity.line2 == "")) {
                    scope.entity.line2 = "";
                    var orgsUnsort = $filter('filter')(scope.entity.groups, function (grp) { return (grp.grpType == shuri_enums.grouptype.organization && !grp.endDt); });
                    var orgs = $filter('orderBy')(orgsUnsort, ['startDt', 'name']);
                    orgs.forEach(function (org) {
                      if (scope.entity.line2 == "") {
                        scope.entity.line2 = org.name;
                      }
                      else {
                        scope.entity.line2 += ", " + org.name;
                      }
                      // console.log(org);
                    });

                  }
                }

                break;
              case shuri_enums.entitytypes.tag:
                scope.entity.backgroundColor = "bgRoyalLight";
                if (!scope.singleLine) {
                  if (scope.entity.typename && scope.entity.typename === " Tags") scope.entity.line2 = "Loose Tags";
                  else if (scope.entity.typename) scope.entity.line2 = scope.entity.typename;
                  else if (scope.entity.imageUrlThumb) scope.entity.line2 = scope.entity.imageUrlThumb;
                }
                break;
              case shuri_enums.entitytypes.touch:
                scope.entity.backgroundColor = "bgBalancedLight";
                break;
              case shuri_enums.entitytypes.team:
              case shuri_enums.entitytypes.user:
                scope.entity.backgroundColor = "bgTeamLight";
                scope.hasAvatar = true;
                break;
              case shuri_enums.entitytypes.document:  //db 
              case shuri_enums.entitytypes.group:  //db 
                scope.entity.backgroundColor = "bgPositive";
                scope.hasAvatar = true;
                break;
              case shuri_enums.entitytypes.location:
                scope.entity.backgroundColor = "bgTeamLight";
                scope.entity.line1 = scope.entity.name = scope.entity.address;
                scope.entity.isNew = false;
                //console.log(scope.parentEntity);
                break;
              default:
                console.error("Unhandled entitytype", scope.entity.entityType);
                break;
            }

            scope.mayRemove = false;
            scope.isNew = (scope.entity.id == appGlobals.guidEmpty);
            scope.isOnEditPage = ($state.current.name.toLowerCase().indexOf("edit") > -1);
            scope.isOnQueryPage = ($state.current.name.indexOf("home.query") > -1);
            //determine if curated DB 
            scope.isCurated = (scope.parentEntity.collection_Id == appGlobals.guidARDB);

            scope.mayRemove = (scope.parentEntity && scope.parentEntity.updatable && !scope.isOnQueryPage) || scope.isNew;
            //if (scope.entity.entityType == 3) console.log(scope.isCurated);
            if (scope.isCurated) {
              scope.mayRemove = scope.entity.deletable;
              if (scope.entityType == shuri_enums.entitytypes.private) scope.mayRemove = scope.entity.updatable;
              //public entity?
              if (!scope.mayRemove && scope.isOnEditPage && (scope.entity.ownedBy_Id == appGlobals.guidEmpty)) scope.mayRemove = true;
            }
            else if (scope.isFavorite) scope.mayRemove = true;
            else if (scope.parentEntityType === shuri_enums.entitytypes.usertype) scope.mayRemove = false;
            else if (scope.entityType === shuri_enums.entitytypes.tag) scope.mayRemove = (scope.entity.updatable || scope.parentEntity.updatable);   //is this user's tag??

            //hide the menu icon ???
            if (scope.parentEntityType == shuri_enums.entitytypes.team && scope.entityType == shuri_enums.entitytypes.user) scope.hideAction = true;
            else if (scope.parentEntityType === shuri_enums.entitytypes.team) scope.hideAction = !scope.mayRemove;
            else if (scope.parentEntityType === shuri_enums.entitytypes.usage) scope.hideAction = true;
            else if (scope.entityType == shuri_enums.entitytypes.location) {
              scope.isLoc = true;
              dataApi.getAppUser().then(function (data) {
                scope.appUser = data;
                //console.log(scope.entity, scope.appUser);
                scope.hideAction = !(scope.entity.updatable || (scope.isCurated && scope.appUser.isWorker));
                scope.mayRemove = !scope.hideAction;
              });

            }
            else if (!scope.mayRemove && scope.isOnEditPage && !(scope.parentEntityType === shuri_enums.entitytypes.usertype)) scope.hideAction = true;

            if (scope.parentEntityType === shuri_enums.entitytypes.team && scope.appuserId == scope.entity.id) {
              if (scope.parentEntity.ownedBy_Id == scope.appuserId) {
                scope.hideAction = true;
                scope.mayRemove = false;
              }
              else {
                //users can remove themselves from any team they do NOT own
                scope.hideAction = false;
                scope.mayRemove = true;
              }
            }

            //this an autocomplete result or tenured situation; get the full record
            //if (scope.entity.entityType == 5) console.log(scope.entity, scope.parentEntity.updatable, scope.isCurated);
            if (false && !scope.entity.isFullyLoaded && scope.entity.id != appGlobals.guidEmpty && !scope.entity.createdDt) {
              var stashET = scope.entity.entityType;
              dataApi.getEntity(scope.entity.entityType, scope.entity.id).then(function (data) {
                //console.log(data);
                scope.entity = data;
                scope.entity.entityType = stashET;
                scope.entity.sorter = scope.entity.name;
                scope.entity.isFullyLoaded = true;
                finishAssignUI();
              });
            }
            else finishAssignUI();

          }

          function finishAssignUI() {

            if (!scope.entity.entityType) scope.entity.entityType = scope.entityType;
            switch (scope.entity.entityType) {
              case shuri_enums.entitytypes.organization:
                scope.entity.backgroundColor = "bgCalmLight";
                scope.entity.color = "calm";
                scope.hasAvatar = true;
                if (scope.hasTenure) {
                  scope.entity.line2 = scope.entity.title;
                  setTenure();
                }
                break;
              case shuri_enums.entitytypes.private:
                scope.entity.backgroundColor = "bgGroupsLight";
                scope.hasAvatar = false;
                break;
              case shuri_enums.entitytypes.person:
                scope.entity.backgroundColor = "bgEnergizedLight";
                scope.entity.color = "energized";
                scope.hasAvatar = true;

                if (scope.parentEntityType == shuri_enums.entitytypes.team) scope.entity.backgroundColor = "bgTeamLight";

                if (scope.hasTenure) {
                  scope.entity.line2 = scope.entity.title;
                  setTenure();
                  //console.log(scope.entity);
                }

                break;
              case shuri_enums.entitytypes.tag:
                scope.entity.backgroundColor = "bgRoyalLight";
                if (!scope.singleLine) {
                  if (scope.entity.typename && scope.entity.typename === " Tags") scope.entity.line2 = "Loose Tags";
                  else if (scope.entity.typename) scope.entity.line2 = scope.entity.typename;
                  else if (scope.entity.imageUrlThumb) scope.entity.line2 = scope.entity.imageUrlThumb;
                }
                break;
              case shuri_enums.entitytypes.touch:
                var dt, typename;
                if (scope.entity.dateStart && scope.entity.typename) {
                  dt = moment.utc(scope.entity.dateStart).add(moment(scope.entity.dateStart).utcOffset(), "minutes");
                  typename = scope.entity.typename;
                  //Scheduled? then adjust date to scheduled or sent.
                  if (scope.entity.isScheduled) {
                    if (scope.entity.dateSent) dt = moment.utc(scope.entity.dateSent).add(moment(scope.entity.dateSent).utcOffset(), "minutes");
                    else dt = moment.utc(scope.entity.dateSchedule).add(moment(scope.entity.dateSchedule).utcOffset(), "minutes");
                  }
                }
                else if (scope.entity.imageUrlThumb && scope.entity.imageUrlThumb.indexOf("|") >= 19) {
                  var idx = scope.entity.imageUrlThumb.indexOf("|");
                  var dtPt = scope.entity.imageUrlThumb.substring(0, 19);
                  dt = moment.utc(dtPt).add(moment(dtPt).utcOffset(), "minutes");
                  typename = scope.entity.imageUrlThumb.substring(idx + 1);
                }

                //console.log(dt);
                scope.entity.line2 = typename + ((dt) ? " -  " + dt.format("ll") : "");
                if (moment().isBefore(dt)) {
                  scope.entity.backgroundColor = "bgBalancedLight2";
                  scope.entity.isFuture = true;
                  //console.log(scope.entity.isFuture);
                }

                break;
              case shuri_enums.entitytypes.team:
              case shuri_enums.entitytypes.user:
                if (scope.entity.nickname) scope.entity.line2 = scope.entity.nickname;
                scope.entity.backgroundColor = "bgTeamLight";
                scope.hasAvatar = true;
                break;
              case shuri_enums.entitytypes.location:
              case shuri_enums.entitytypes.document:
              case shuri_enums.entitytypes.group:
                break;
              default:
                console.error("Unhandled entitytype", scope.entity.entityType);
                break;
            }

            if (window.innerWidth <= appGlobals.widthSmall) {
              scope.cssClass += " medText";
              if ((scope.entity.line1 && scope.entity.line1.length > 32) || (scope.entity.line2 && scope.entity.line2.length > 32)) scope.cssClass = scope.cssClass.replace("medText", "smallText");
            }

            //Usage/User special handling
            if (scope.parentEntityType == shuri_enums.entitytypes.usage) {
              var dt = moment.utc(scope.entity.usageDate).add(moment(scope.entity.usageDate).utcOffset(), "minutes");;
              scope.entity.line1 = dt.format(" hh:mm a DD-MMM-YY") + ' \t ' + scope.entity.username;
              scope.entity.line2 = scope.entity.description;
              if (scope.entity.description == "" || scope.entity.description == "No one") scope.entity.line2 = scope.entity.resource;
              scope.hasAvatar = false;
              //console.log(scope.entity);
            }

            scope.isDatabase = (scope.parentEntityType === shuri_enums.entitytypes.group && scope.parentEntity.grpType && scope.parentEntity.grpType == shuri_enums.grouptype.collection);
            scope.isFavorite = (scope.parentEntity && scope.parentEntity.id == appGlobals.guidFavorites);
            if (scope.entityType === shuri_enums.entitytypes.all) scope.hasAvatar = true;
            //if (scope.parentEntityType === shuri_enums.entitytypes.group) console.log(scope.entity);


          }
        }


        //#endregion

        //#region Event Handlers

        function deleteEntity() {
          var confirmPopup = $ionicPopup.confirm({
            title: "Permanent Delete",
            template: "Permanently delete " + scope.entity.name + "? <br /><br /> There is NO un-do for this action."
          });
          confirmPopup.then(function (res) {
            if (res) {
              scope.entity.changeType = shuri_enums.changetype.remove;
              //console.log(scope.entity);
              scope.isDirty = true;
              if (scope.manageUpdates) {

                //Unsync on device?
                checkForUnsync().then(function () {
                  dataApi.deleteEntity(scope.entity.id, scope.entity.entityType, scope.entity).then(function (data) {
                    //if ($state.current.name.indexOf("home.query") > -1) $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);
                    dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType).then(function () {
                      dataApi.clearCacheItemByEntity(scope.parentEntityType, scope.parentEntity.id);
                      $rootScope.$broadcast("EntityChanged", scope.parentEntity.id);

                      if (scope.entity.entityType == 6) assignUI();

                    });
                  });

                });
              }
              else {
                //update parentEntities (for customEdit Usertype only)
                if (scope.entity.entityType == shuri_enums.entitytypes.tag && scope.parentEntityType == shuri_enums.entitytypes.usertype) {
                  scope.parentEntity.tags.forEach(function (tag) {
                    if (tag.id.toLowerCase() == scope.entity.id.toLowerCase()) tag.changeType = shuri_enums.changetype.remove;
                  });
                }
              }
            }
          });
        }


        function checkForUnsync() {
          return $q(function (resolve, reject) {

            if (scope.entity.entityType != 6) resolve();
            else {
              dataApi.getUserPreferences().then(function (prefs) {
                if (!prefs.calsync) resolve();
                else {
                  if ((ionic.Platform.isIOS() && prefs.calsync == "ios") || (ionic.Platform.isAndroid() && prefs.calsync == "android")) {
                    //delete this touch from calendar
                    dataApi.clearCacheItemByEntity(6, scope.entity.id);
                    dataApi.getTouch(scope.entity.id).then(function (tch) {
                      //console.log(tch, "docs");
                      tch.documents.forEach(function (doc) {
                        var appt = null;
                        if (doc.userType_Id === appGlobals.guidDocCalSync && doc.value != "") {
                          try {
                            appt = angular.fromJson(doc.value);
                            //console.log(appt);
                            if (appt.id) {
                              globals.deleteAppointment(appt).then(function () { resolve(); })
                            }
                            else resolve();
                          }
                          catch (e) { resolve(); }
                        }
                      });
                      resolve();

                    });
                  }
                  else resolve();
                }
              }, function (err) { console.log(err); resolve() });
            }


          });

        }

        function removeEntity() {
          if (scope.isFavorite) {
            dataApi.removeFave(scope.entity.id, scope.entity.entityType).then(function (data) {
              scope.entity.changeType = shuri_enums.changetype.remove;
              $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);

            });
          }
          //special case:  user just removed themself from a team - needs refresh
          else if (scope.parentEntityType === shuri_enums.entitytypes.team && scope.appuserId == scope.entity.id) {
            //cannot remove themselves from a team they own
            if (scope.parentEntity.ownedBy_Id == scope.appuserId) {
              var alertPopup = $ionicPopup.alert({
                title: "You Are The Owner",
                template: "You cannot remove yourself from a team you own."
              });
              alertPopup.then(function (res) { });

            }
            else {
              //cannot remove themselves from a team that can update their default database.
              dataApi.canRemoveSelfFromTeam(scope.parentEntity.id).then(function (reason) {
                if (reason == '') {
                  //good to go
                  var confirmPopup = $ionicPopup.confirm({
                    title: "Remove Yourself?",
                    template: "You are about to remove yourself from " + scope.parentEntity.name + ".  You may lose access to some items and your 'Recent Items' will be cleared.<br /><br />  OK to continue? "
                  });
                  confirmPopup.then(function (res) {
                    if (res) {
                      dataApi.deleteRelation(scope.parentEntityType, scope.parentEntity.id, scope.entityType, scope.entity.id, true).then(function (data) {
                        $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);
                        dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType).then(function () {
                          dataApi.recentHide().then(function () {
                            $rootScope.$broadcast("RefreshMain", true);
                          });
                        });
                      });
                    }
                  });
                }
                else {
                  //display reason
                  var alertPopup = $ionicPopup.alert({
                    title: "Unable to remove from team",
                    template: reason
                  });
                  alertPopup.then(function (res) { });
                }
              });
            }
          }
          else {
            if (scope.manageUpdates) {
              dataApi.deleteRelation(scope.parentEntityType, scope.parentEntity.id, scope.entityType, scope.entity.id, true).then(function (data) {
                $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);
                dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType).then(function () {
                  $rootScope.$broadcast("EntityChanged", scope.parentEntity.id);

                  //is this a synced touch?  Removes must be explicit
                  if (scope.parentEntityType == 6 && scope.parentEntity.documents && scope.parentEntity.documents.length > 0) {
                    //a touch
                    var syncDocs = $filter("filter")(scope.parentEntity.documents, function (d) { return (d.userType_Id === appGlobals.guidDocCalSync) });
                    if (syncDocs && syncDocs.length) {
                      var syncDoc = syncDocs[0];
                      var syncObj = null;
                      try {
                        syncObj = angular.fromJson(syncDoc.value);

                      }
                      catch (e) { }
                      if (syncObj != null) {
                         var doc = new shuri_document();
                        doc.userType_Id = appGlobals.guidDocSyncRemoveEntity;
                        var objValue = { touchId: scope.parentEntity.id, entityId: scope.entity.id, entityType: scope.entityType, entryId: syncObj.id, itemType: syncObj.itemType };
                          doc.value = angular.toJson(objValue);
                          //console.log(objValue, scope.entity); 
                          dataApi.postEntity("Documents", "document", doc).then(function (data) {
                            //done
                          });

                      }
                    }
                  }
                });
              });
            }
            else {
              scope.entity.changeType = shuri_enums.changetype.remove;

              switch (scope.entity.entityType) {
                case shuri_enums.entitytypes.organization:
                case shuri_enums.entitytypes.private:
                case shuri_enums.entitytypes.team:
                case shuri_enums.entitytypes.group:
                  if (scope.parentEntity && scope.parentEntity.groups && scope.parentEntity.groups.length) {
                    for (var i = scope.parentEntity.groups.length - 1; i >= 0; i--) {
                      if (scope.parentEntity.groups[i].id === scope.entity.id) {
                        scope.parentEntity.groups[i].changeType = 2;
                        break;
                      }
                    }
                  }
                  break;
                case shuri_enums.entitytypes.person:
                  if (scope.parentEntity && scope.parentEntity.people && scope.parentEntity.people.length) {
                    for (var i = scope.parentEntity.people.length - 1; i >= 0; i--) {
                      if (scope.parentEntity.people[i].id === scope.entity.id) {
                        scope.parentEntity.people[i].changeType = 2;
                        break;
                      }
                    }
                  }
                  break;
                case shuri_enums.entitytypes.tag:
                  if (scope.parentEntity && scope.parentEntity.tags && scope.parentEntity.tags.length) {
                    for (var i = scope.parentEntity.tags.length - 1; i >= 0; i--) {
                      if (scope.parentEntity.tags[i].id === scope.entity.id) {
                        scope.parentEntity.tags[i].changeType = 2;
                        break;
                      }
                    }
                  }
                  break;
                case shuri_enums.entitytypes.touch:
                  if (scope.parentEntity && scope.parentEntity.touches && scope.parentEntity.touches.length) {
                    for (var i = scope.parentEntity.touches.length - 1; i >= 0; i--) {
                      if (scope.parentEntity.touches[i].id === scope.entity.id) {
                        scope.parentEntity.touches[i].changeType = 2;
                        break;
                      }
                    }
                  }
                  break;
              }


             // $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);
              //console.log(scope.parentEntity);
              //    if (scope.entity.id === appGlobals.guidEmpty || scope.entity.entityType === shuri_enums.entitytypes.location) {
              //}
              //else {
              //    $rootScope.$broadcast("EntityDeleted", scope.entity.id);
            }


          }
        }

        //scope.toggleChooseEntity = function () {
        //    scope.entity.selected = !scope.entity.selected;

        //}
        //#endregion

        //#region Tenure
        function showTenure() {
          scope.isTenureUpdatable = scope.isOnEditPage &&
            ((scope.parentEntity.updatable && scope.entity.deletable) || (scope.parentEntity.deletable && scope.entity.updatable));

          //console.log(scope.isTenureUpdatable, scope.isOnEditPage);
          scope.tenureTitle = String.format("{0} at {1}", scope.parentEntity.name, scope.entity.name);
          if (scope.entity.entityType == shuri_enums.entitytypes.person) scope.tenureTitle = String.format("{0} at {1}", scope.entity.name, scope.parentEntity.name);

          scope.entity.isInErrorEnd = scope.entity.isInErrorStart = false;

          //defaults
          if (scope.entity.startDt) {
            scope.entity.jsDateStart = SQLDate2JS(scope.entity.startDt);
            scope.entity.inputDateStart = $filter('date')(scope.entity.jsDateStart, scope.dateFormatInput);
          }
          if (scope.entity.endDt) {
            scope.entity.jsDateEnd = SQLDate2JS(scope.entity.endDt);
            scope.entity.inputDateEnd = $filter('date')(scope.entity.jsDateEnd, scope.dateFormatInput);
          }


          $ionicModal.fromTemplateUrl('templates/modals/tenure.html?' + _cacheBuster, {
            scope: scope,
            animation: 'slide-in-up'
          }).then(function (modal) {
            scope.tenureModal = modal;
            scope.tenureModal.show();
          });

        }

        scope.closeTenureModal = function () {
          var groupId = (scope.parentEntityType == shuri_enums.entitytypes.person) ? scope.entity.id : scope.parentEntity.id;
          var personId = (scope.parentEntityType == shuri_enums.entitytypes.person) ? scope.parentEntity.id : scope.entity.id;

          if (scope.manageUpdates && scope.isDirty) {
            //console.log(scope.entity, scope.isTenureUpdatable);

            dataApi.postTenure(groupId, personId, scope.entity.startDt, scope.entity.endDt, scope.entity.title).then(function (data) {
              scope.entity.line2 = scope.entity.title;
              setTenure();
              dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType);  //future??
            });
          }
          else {

            scope.entity.changeType = 1;
            scope.entity.line2 = scope.entity.title;
            setTenure();
            //update Parent Entities
            if (scope.parentEntity) {
              $rootScope.$broadcast("MakeDirty", scope.parentEntity.id);
              scope.entity.tenureEntityId = scope.parentEntity.id;
              scope.entity.tenureEntityType = scope.parentEntityType;

              if (scope.parentEntityType == shuri_enums.entitytypes.organization && scope.parentEntity.people) {
                var foundIt = false;
                scope.parentEntity.people.forEach(function (per) {
                  if (scope.entity.id.toLowerCase() == per.id.toLowerCase()) {
                    per.changeType = 1;
                    per.title = scope.entity.title;
                    per.startDt = scope.entity.startDt;
                    per.endDt = scope.entity.endDt;
                    foundIt = true;
                  }
                });
                if (!foundIt) scope.parentEntity.people.push(scope.entity);
              }
              else if (scope.parentEntityType == shuri_enums.entitytypes.person && scope.parentEntity.groups) {
                var foundIt = false;
                scope.parentEntity.groups.forEach(function (org) {
                  if (scope.entity.id.toLowerCase() == org.id.toLowerCase()) {
                    org.changeType = 1;
                    org.title = scope.entity.title;
                    org.startDt = scope.entity.startDt;
                    org.endDt = scope.entity.endDt;
                    foundIt = true;
                  }
                });
                if (!foundIt) scope.parentEntity.groups.push(scope.entity);
              }
            }

          }
          scope.tenureModal.hide();
          scope.tenureModal.remove();

        }

        scope.tenureChanged = function (mode) {
          var isdate, inputText, isInError;
          switch (mode) {
            case "end":
              isInError = (scope.entity.inputDateEnd === undefined);
              if (!isInError && scope.entity.inputDateEnd != "") {
                var momDt
                try {
                  momDt = moment(new Date(scope.entity.inputDateEnd));
                  if (momDt.isValid()) {
                    scope.entity.endDt = momDt.toDate().toISOString();
                    scope.entity.isInErrorEnd = false;
                  }
                  else isInError = true;
                }
                catch (e) { isInError = true; }
              }

              else if (scope.entity.inputDateEnd === "") {
                scope.entity.endDt = null;
                scope.entity.isInErrorEnd = false;
              }
              break;
            case "start":
              isInError = (scope.entity.inputDateStart === undefined);
              if (!isInError && scope.entity.inputDateStart != "") {
                var momDt
                try {
                  momDt = moment(new Date(scope.entity.inputDateStart));
                  if (momDt.isValid()) {
                    scope.entity.startDt = momDt.toDate().toISOString();
                    scope.entity.isInErrorStart = false;
                  }
                  else isInError = true;
                }
                catch (e) { isInError = true; }
              }

              break;
          }


          if (!isInError) {
            scope.entity.changeType = 1;
            scope.isDirty = true;
          }
          else {
            if (mode == 'end') scope.entity.isInErrorEnd = true;
            else if (mode == 'start') scope.entity.isInErrorStart = true;
          }
        }

        scope.tenureUpdated = function () {
          scope.entity.changeType = shuri_enums.changetype.update;
          scope.isDirty = true;
          if (scope.entity.jsStartDt && scope.entity.jsStartDt > new Date(1960, 1, 1)) scope.entity.startDt = DateTZO(scope.entity.jsStartDt);
          if (scope.entity.jsEndDt && scope.entity.jsEndDt > new Date(1960, 1, 1)) scope.entity.endDt = DateTZO(scope.entity.jsEndDt);
          if (!scope.entity.jsEndDt) scope.entity.endDt = null;
          setTenure();

        }

        function DateTZO(date) {
          var d = new Date()
          var tzoffset = d.getTimezoneOffset() * 60000;
          return (new Date(date - tzoffset).toISOString());;
        }

        function setTenure() {

          if (scope.entity.startDt) scope.entity.jsStartDt = SQLDate2JS(scope.entity.startDt);
          scope.entity.jsEndDt = null;

          scope.entity.tenureOver = false;
          if (scope.entity.endDt && scope.entity.endDt != "") {
            scope.entity.jsEndDt = SQLDate2JS(scope.entity.endDt);
            var dtStr = scope.entity.endDt;
            if (dtStr.toUpperCase().indexOf("Z") == -1) dtStr += "Z";
            //console.log(new Date(), new Date(scope.entity.endDt));
            if ((new Date()) > (new Date(dtStr))) scope.entity.tenureOver = true;
          }

          if (scope.entity.tenureOver) scope.entity.backgroundColor = "item-stable";

        }

        scope.makeDirty = function () {
          scope.entity.isDirty = true;
          scope.isDirty = true;
        }

        scope.pickDate = function (mode) {
          var theDate = new Date();
          var inputText = "";
          if (scope.entity.inputDateStart) inputText = scope.entity.inputDateStart;
          if (mode == 'end' && scope.entity.inputDateEnd) inputText = scope.entity.inputDateEnd;

          if (inputText != "") theDate = RoundDate(moment(inputText).toDate(), 1);
          else theDate = RoundDate(new Date(), 1);
          scope.pickDateMode = mode;

          var ipObj1 = {
            callback: function (val) {  //Mandatory 
              var newdate = moment(val);
              var sdt = newdate.format("YYYY-MM-DD") + "T00:00:00Z";
              //console.log(val, sdt);

              if (scope.pickDateMode == "end") {
                scope.entity.inputDateEnd = $filter('date')(val, scope.dateFormatInput);
                scope.entity.endDt = sdt;
                scope.entity.isInErrorEnd = false;
              }
              else {
                scope.entity.inputDateStart = $filter("date")(val, scope.dateFormatInput);
                scope.entity.startDt = sdt;
                scope.entity.isInErrorStart = false;
                //console.log(val, sdt, scope.entity);
              }
              scope.entity.isDirty = true;
            },
            inputDate: theDate,      //Optional 
          };

          ionicDatePicker.openDatePicker(ipObj1);
        }

        //#endregion

        //#region ActionBar
        scope.showEntityAction = function (evt, entity, entityType) {
          if (evt) evt.stopPropagation();

          dataApi.getAppUser().then(function (data) {
            scope.appUser = data;

            if (!scope.entity.createdBy_Id && scope.entity.id != appGlobals.guidEmpty) {
              var stashET = scope.entity.entityType;
              //console.log(scope.entity);

              //this an autocomplete result; get the full record
              dataApi.getEntity(scope.entity.entityType, scope.entity.id).then(function (data) {
                //console.log(data);
                scope.entity = data;
                scope.entity.entityType = stashET;
                scope.entity.sorter = scope.entity.name;
                scope.entity.isDatabase = (stashET === shuri_enums.entitytypes.group && scope.entity.grpType && scope.entity.grpType == shuri_enums.grouptype.collection);

                finishShowAction();
              });
            }
            else finishShowAction();
          });

        }

        function finishShowAction() {
          var mybuttons = [];

          if (scope.hasTenure && !scope.isOnQueryPage) {// && !scope.isOnEditPage

            mybuttons.push({ text: '<div class=""><i class="icon ion-android-calendar"></i>View Tenure</div>', itemname: 'tenure' });
          }

          if (!scope.isNew && !scope.isOnEditPage && scope.entity.entityType != shuri_enums.entitytypes.location && scope.parentEntityType < 10) {
            if (scope.entity.entityType != shuri_enums.entitytypes.touch && !scope.isOnEditPage && !scope.entity.isDatabase) mybuttons.push({ text: '<div class=""><i class="icon shuri-touch-add"></i>Create Touch</div>', itemname: 'touch' });
            if (appGlobals.userPrivateGroups && appGlobals.userPrivateGroups.length > 0 && !scope.entity.isDatabase) {
              var privWord = "";
              //console.log(scope.entity, scope.parentEntityType);
              if (scope.parentEntityType && ((scope.parentEntityType == shuri_enums.entitytypes.private) || (scope.parentEntity && scope.parentEntityType == shuri_enums.entitytypes.group && scope.parentEntity.grpType == shuri_enums.grouptype.private))) privWord = " Another ";
              mybuttons.push({ text: '<i class="icon ion-plus-round"></i>Add To ' + privWord + ' Group</i>', itemname: 'addgroup' });
            }
            if (scope.entity.entityType != shuri_enums.entitytypes.touch && !scope.entity.isDatabase) {
              if (!scope.entity.isFavorite) mybuttons.push({ text: '<i class="icon ion-android-star"></i>Add to Favorites</i>', itemname: 'favsadd' });
              else if (scope.entity.isFavorite) mybuttons.push({ text: '<i class="icon ion-android-star-outline"></i>Remove from Favorites</i>', itemname: 'favsremove' });
            }
            if (scope.entity.updatable && !scope.isOnEditPage) mybuttons.push({ text: '<div class=""><i class="icon ion-edit "></i>Edit</div>', itemname: 'edit' });
            else if (scope.entity.isDatabase) mybuttons.push({ text: '<div class=""><i class="icon ion-information-circled "></i>Info</div>', itemname: 'info' });
          }

          //console.log(scope.mayRemove, scope.isDatabase);
          if ((scope.mayRemove || scope.isFavorite) && !scope.isDatabase && !scope.entity.acResult) mybuttons.push({ text: '<div class="assertive"><i class="icon ion-minus-circled"></i>Remove</div>', itemname: 'remove' });

          //if (scope.parentEntityType == shuri_enums.entitytypes.team && scope.appUser.id === scope.entity.id) mybuttons.push({ text: '<div class="assertive"><i class="icon ion-trash-b"></i>Remove</div>', itemname: 'removemeteam' });

          var hideSheet = $ionicActionSheet.show({
            buttons: mybuttons,
            titleText: scope.entity.name.toUpperCase(),
            cancelText: 'Cancel',
            cssClass: 'no-scroll',
            destructiveText: (scope.entity.deletable && !scope.isNew && (!scope.isOnEditPage || scope.parentEntityType === shuri_enums.entitytypes.usertype)) ? '<div class="assertive"><i class="icon ion-trash-b"></i>Delete</div>' : null,
            cancel: function () {
              hideSheet();
            },
            buttonClicked: function (index) {
              scope.doAction(this.buttons[index].itemname);
              hideSheet();
            },
            destructiveButtonClicked: function (index) {
              scope.doAction('delete');
              hideSheet();
            }
          });

        }

        scope.doAction = function (action) {
          //console.log(action);
          switch (action) {
            case "addgroup":
              openGroupAdder();
              break;
            case "edit":
              editEntity();
              break;
            case "delete":
              deleteEntity();
              break;
            case "info":
              $state.go("home.groupEdit", { id: scope.entity.id });
              break;
            case "remove":
              removeEntity();
              break;
            case "tenure":
              showTenure();
              break;
            case "favsadd":
              dataApi.addFave(scope.entity.id, scope.entity.entityType).then(function () {
                var msg = String.format("{0} was added to Favorites.", scope.entity.name);
                $ionicLoading.show({ template: msg, duration: 1000 });
              })
              break;
            case "favsremove":
              dataApi.removeFave(scope.entity.id, scope.entity.entityType).then(function () {
                var msg = String.format("{0} was removed from Favorites.", scope.entity.name);
                $ionicLoading.show({ template: msg, duration: 1000 });
              })
              break;
            case "touch":
              //DB ID?
              var dbId = null;
              var grpType = -1;

              if (scope.entity.isDatabase) {
                //this is a db
                dbId = scope.entity.id;
              }
              else {
                if (scope.entity.collectionId) {
                  scope.appUser.updatableSubscriptionIds.forEach(function (subId) {
                    if (subId.toLowerCase() == scope.entity.collectionId.toLowerCase()) dbId = scope.id;
                  });
                }
                if (scope.entity.entityType == shuri_enums.entitytypes.group) grpType = scope.entity.grpType;
              }

              if (dbId == null) dbId = scope.appUser.defaultCollection_Id;

              //console.log(dbId, scope.entity.id, scope.entity.entityType, grpType );
              $state.go("home.touchEdit", { id: appGlobals.guidEmpty, collectionId: dbId, entityId: scope.entity.id, entityType: scope.entity.entityType, grpType: grpType, returnState: "goback" });
              break;
          }


        }

        function openGroupAdder() {
          dataApi.getPrivateGroupsForEntity(scope.entity.entityType, scope.entity.id).then(function (data) {
            var entityGrps = data;
            //console.log(data);
            scope.privateGroups = $filter('filter')(appGlobals.userPrivateGroups, function (grp) {
              var isMember = false;
              if (grp.id == appGlobals.guidEmpty || grp.id == appGlobals.guidFavorites) isMember = true;  //don't want these in the dropdown
              else {
                entityGrps.forEach(function (entGrp) {
                  if (entGrp.id.toLowerCase() == grp.id.toLowerCase()) {
                    //console.log("found one");
                    isMember = true;
                  }
                });
              }
              return !isMember;
            });

            if (scope.privateGroups.length == 0) {
              var alertPopup = $ionicPopup.alert({
                title: 'Add to Group',
                template: "No available groups for " + scope.entity.name,
              });
              alertPopup.then();
            }
            else {
              scope.privateGroups = $filter('orderBy')(scope.privateGroups, 'name');
              //console.log(scope.privateGroups);
              scope.selectedPrivateGroup = scope.privateGroups[0];
              if (localStorage.getItem("addToPrivateGroup")) {
                var defaultId = localStorage.getItem("addToPrivateGroup").toLowerCase();
                scope.privateGroups.forEach(function (grp) {
                  if (grp.id.toLowerCase() == defaultId) scope.selectedPrivateGroup = grp;
                });
              }

              $ionicModal.fromTemplateUrl('templates/modals/choosePrivateGroup.html', {
                scope: scope,
                animation: 'slide-in-up'
              }).then(function (modal) {
                scope.chooseGroupModal = modal;
                scope.chooseGroupModal.show();
              });


            }


          });
        }

        scope.selectedPrivateGroupChanged = function (grp) {
          scope.selectedPrivateGroup = grp;
        };

        scope.closeChooseGroupModal = function (isSaving) {
          //console.log(scope.manageUpdates, isSaving);
          if (scope.manageUpdates && isSaving) {
            localStorage.setItem("addToPrivateGroup", scope.selectedPrivateGroup.id);
            dataApi.postRelation(shuri_enums.entitytypes.group, scope.selectedPrivateGroup.id, scope.entity.entityType, scope.entity.id).then(function (data) {
              var msg = String.format("{0} was added to {1}.", scope.entity.name, scope.selectedPrivateGroup.name);
              $ionicLoading.show({ template: msg, duration: scope.addGroupDuration });
            });
          }
          scope.chooseGroupModal.hide();
          scope.chooseGroupModal.remove();

        }

        function editEntity() {
          //force a full reload at the destination
          switch (scope.entity.entityType) {
            case shuri_enums.entitytypes.organization:
              $state.go("home.orgEdit", { groupId: scope.entity.id });
              break;
            case shuri_enums.entitytypes.person:
              $state.go("home.personEdit", { personId: scope.entity.id });
              break;
            case shuri_enums.entitytypes.tag:
              $state.go("edit.tagEdit", { tagId: scope.entity.id });
              break;
            case shuri_enums.entitytypes.touch:
              $state.go("home.touchEdit", { id: scope.entity.id, returnState: 'goback' });
              break;
            case shuri_enums.entitytypes.private:
            case shuri_enums.entitytypes.team:
            case shuri_enums.entitytypes.group:
              $state.go("home.groupEdit", { id: scope.entity.id });
              break;
            default:
              console.error("Unhandled entitytype");
              break;
          }
        }
        //#endregion

        $rootScope.$on('EntityChanged', function (event, data, entity) {
          if (!scope.isOnEditPage) {
            if (data && scope.entity && scope.entity.id && scope.entity.id.toLowerCase() == data.toLowerCase()) {
              switch (scope.entity.entityType) {
                case shuri_enums.entitytypes.organization:
                  // console.log("OrgChanged", scope.entity.id);
                  dataApi.getOrg(scope.entity.id, appGlobals.guidEmpty, 2, "itemEntity").then(function (data) {
                    scope.entity = data;
                    scope.entity.entityType = shuri_enums.entitytypes.organization;
                    if (scope.hasTenure) {
                      scope.entity.people.forEach(function (person) {
                        if (person.id === scope.parentEntity.id) {
                          scope.entity.startDt = person.startDt;
                          if (person.endDt) scope.entity.endDt = person.endDt;
                          scope.entity.tenuredId = person.id;
                        }
                      });
                      if (scope.entity.tenuredId) setTenure();
                    }
                    assignUI();
                  });
                  break;
                case shuri_enums.entitytypes.person:
                  dataApi.getPerson(scope.entity.id, 2).then(function (data) {
                    // console.log(data);
                    ////stash line2
                    //var line2 = scope.entity.line2;
                    scope.entity = data;
                    scope.entity.entityType = shuri_enums.entitytypes.person;
                    if (scope.hasTenure) {
                      scope.entity.groups.forEach(function (grp) {
                        if (grp.id === scope.parentEntity.id) {
                          scope.entity.startDt = grp.startDt;
                          if (grp.endDt) scope.entity.endDt = grp.endDt;
                          scope.entity.tenuredId = grp.id;
                        }
                      });
                      if (scope.entity.tenuredId) setTenure();
                      //console.log(scope.entity);

                    }
                    assignUI();
                    //console.log(scope.entity);
                    //scope.$apply();
                  });
                  break;
                case shuri_enums.entitytypes.tag:
                  dataApi.getTag(scope.entity.id, appGlobals.guidEmpty).then(function (data) {
                    scope.entity = data;
                    scope.entity.entityType = shuri_enums.entitytypes.tag;
                    assignUI();
                  });
                  break;
                case shuri_enums.entitytypes.touch:
                  dataApi.getTouch(scope.entity.id, appGlobals.guidEmpty, false).then(function (data) {
                    scope.entity = data;
                    scope.entity.entityType = shuri_enums.entitytypes.touch;
                    assignUI();
                  });
                  break;
                case shuri_enums.entitytypes.location:
                  if (entity) {
                    scope.entity = entity;
                    scope.entity.entityType = shuri_enums.entitytypes.location;
                    assignUI();
                  }
                  break;
              }

            }
          }
        });

      }
    };
  }

})();
