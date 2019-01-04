(function () {
    'use strict';

    angular.module("shuriApp").directive('collectionEntity', ['$rootScope', '$state', '$compile', '$filter', '$timeout', '$q', '$ionicModal', '$ionicPopup', '$ionicListDelegate', '$ionicScrollDelegate', '$ionicActionSheet', '$ionicLoading', '$ionicConfig',
        '$window', 'globals', 'dataApi', 'appGlobals', collectionEntity]);

    function collectionEntity($rootScope, $state, $compile, $filter, $timeout, $q, $ionicModal, $ionicPopup, $ionicListDelegate, $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $ionicConfig, $window, globals, dataApi, appGlobals) {
        return {
            restrict: "E",
            scope: {
                entityType: '=',
                parentEntity: '=',
                parentEntityType: '=',
                isDirty: '=',
                manageUpdates: '@'
            },
            templateUrl: "templates/directives/collectionEntity.html?" + _cacheBuster,
            link: function (scope, elem, attrs) {
                var x = scope.parentEntityType;
                //console.log("link",x, scope.parentEntityType);
                scope.hasMore = true;
                scope.page = 0;
                scope.pageSize = 20;
                scope.scrollSize = 10;
                scope.isAddMode = true;
                scope.showToggle = true;
                scope.addCounter = 0;
                scope.loadingDuration = 1000;
                scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);

                $ionicConfig.scrolling.jsScrolling(true);

                scope.wordFor = function (word) { return globals.wordFor(word); };

                //#region Watchers & AssignUI

                var watcherPE = scope.$watch('parentEntity', function () {
                    if (typeof scope.parentEntity === "undefined" || typeof scope.entityType === "undefined" || scope.parentEntity == null) return;
                    //console.log(scope.parentEntity);
                    switch (scope.entityType) {
                        case shuri_enums.entitytypes.organization:
                            if (typeof scope.parentEntity.orgsCount != "undefined") scope.entityCount = scope.parentEntity.orgsCount;
                            break;
                        case shuri_enums.entitytypes.person:
                            //console.log (scope.parentEntity);
                            if (typeof scope.parentEntity.peopleCount != "undefined") scope.entityCount = scope.parentEntity.peopleCount;
                            break;
                        case shuri_enums.entitytypes.tag:
                            if (typeof scope.parentEntity.tagsCount != "undefined") scope.entityCount = scope.parentEntity.tagsCount;
                            //console.log(scope.parentEntity.tagsCount);
                            break;
                        case shuri_enums.entitytypes.touch:
                            if (typeof scope.parentEntity.touchesCount != "undefined") scope.entityCount = scope.parentEntity.touchesCount;
                            break;
                        case shuri_enums.entitytypes.private:
                            if (typeof scope.parentEntity.grpsCount != "undefined") scope.entityCount = scope.parentEntity.grpsCount;
                            break;
                        case shuri_enums.entitytypes.team:
                        case shuri_enums.entitytypes.user:
                            if (typeof scope.parentEntity.peopleCount != "undefined") scope.entityCount = scope.parentEntity.peopleCount;
                            break;
                        default:
                            console.error("Unhandled entitytype", scope.entityType);
                            break;
                    }
                    //initialize
                    setInitialUI();

                })
                var watcherMU = scope.$watch('manageUpdates', function () {
                    if (typeof scope.manageUpdates === "undefined") return;
                    scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");

                })

                function refreshUI() {
                    if (scope.isAddMode) {
                        if (scope.entityType == shuri_enums.entitytypes.private) {
                            scope.placeholderSearch = scope.addWord + " " + scope.parentEntity.name + " to " + scope.entitiesWord.toLowerCase();
                        }
                        else scope.placeholderSearch = scope.addWord + " " + scope.entitiesWord.toLowerCase() + " to " + scope.parentEntity.name;
                    }
                    else {
                        scope.placeholderSearch = "SEARCH the list by name";
                        if (scope.parentEntityType == shuri_enums.entitytypes.team && scope.entityType == shuri_enums.entitytypes.user) {
                            //this must be an admin getting users
                            scope.placeholderSearch = "SEARCH by name";
                        }


                    }
                }

                //#endregion

                scope.resetSearch = function (reload) {
                    var deferred = $q.defer();

                    scope.showSearchResults = false;
                    if (!scope.saveSearchString) scope.searcher.addString = scope.addStringLast = "";
                    else scope.saveSearchString = false;

                    //console.log(scope.stashedEntities, reload);
                    if (scope.stashedEntities && reload) {
                        scope.entities = scope.stashedEntities.slice(0);
                        scope.isPaged = (scope.hasMore || scope.entities.length > scope.scrollSize);
                        if (scope.entityType == shuri_enums.entitytypes.tag) setTagUI();
                    }
                    else if (reload) scope.entities = [];  //nothing stashed, but clear if Autocomplete happened
                    deferred.resolve();
                    return deferred.promise;
                }

                function setInitialUI() {
                    if (scope.parentEntity) {
                        if (!scope.initialUIHasBeenSet) {
                            //console.log("setInitialUI");

                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    scope.entityWord = scope.wordFor("Organization");
                                    scope.entitiesWord = scope.wordFor("Organizations");
                                    scope.iconClasses = "ion-person-stalker";
                                    scope.color = "calm";
                                    scope.itemColor = "item-calm";
                                    scope.buttonTextColor = "calm";
                                    scope.backgroundColor = "bgCalm";
                                    break;
                                case shuri_enums.entitytypes.person:
                                    scope.entityWord = scope.wordFor("Person");
                                    scope.entitiesWord = scope.wordFor("People");
                                    scope.iconClasses = "ion-person";
                                    scope.color = "energized";
                                    scope.itemColor = "item-energized";
                                    scope.buttonTextColor = "energized";
                                    scope.backgroundColor = "bgEnergized";
                                    break;
                                case shuri_enums.entitytypes.user:
                                    scope.entityWord = "User";
                                    scope.entitiesWord = "Users";
                                    scope.iconClasses = "ion-person";
                                    scope.color = "teamColor";
                                    scope.itemColor = "teamColor";
                                    scope.buttonTextColor = "teamColor";
                                    scope.backgroundColor = "bgTeams";
                                    break;
                                case shuri_enums.entitytypes.tag:
                                    scope.entityWord = scope.wordFor("Tag");
                                    scope.entitiesWord = scope.wordFor("Tags");
                                    scope.iconClasses = "ion-pound";
                                    scope.color = "royal";
                                    scope.itemColor = "item-royal";
                                    scope.buttonTextColor = "buttonTextRoyal";
                                    scope.backgroundColor = "bgRoyal";
                                    break;
                                case shuri_enums.entitytypes.touch:
                                    scope.entityWord = scope.wordFor("Touch");
                                    scope.entitiesWord = scope.wordFor("Touches");
                                    scope.iconClasses = "shuri-touch";
                                    scope.color = "balanced";
                                    scope.itemColor = "item-balanced";
                                    scope.buttonTextColor = "bgBalanced";
                                    scope.backgroundColor = "bgBalanced";
                                    scope.showAddTouch = scope.hideAddNew = true;
                                    break;
                                case shuri_enums.entitytypes.private:
                                    scope.entityWord = scope.wordFor("Group");
                                    scope.entitiesWord = scope.wordFor("Groups");
                                    scope.iconClasses = " ion-ios-star light ";
                                    scope.iconClassesClosed = " ion-ios-star groupColor ";
                                    scope.color = "groupColorBright";
                                    scope.itemColor = "groupColor";
                                    scope.buttonTextColor = "groupColorBright";
                                    scope.backgroundColor = "bgGroups";
                                    scope.itemColorClosed = "item-stable";
                                    break;
                                default:
                                    console.error("Unhandled entitytype", scope.entityType);
                                    break;
                            }

                            switch (scope.parentEntityType) {
                                case shuri_enums.entitytypes.group:
                                    switch (scope.parentEntity.grpType) {
                                        case shuri_enums.grouptype.private:
                                            scope.parentWord = scope.wordFor("Group");
                                            break;
                                        case shuri_enums.grouptype.organization:
                                            scope.parentWord = scope.wordFor("Organization");
                                            break;

                                        case shuri_enums.grouptype.collection:
                                            scope.parentWord = scope.wordFor("Collection");
                                            scope.isDatabase = true;
                                            break;
                                    }
                                    break;
                                case shuri_enums.entitytypes.organization:
                                    scope.parentWord = scope.wordFor("Organization");
                                    break;
                                case shuri_enums.entitytypes.person:
                                    scope.parentWord = scope.wordFor("Person");
                                    scope.showFormer = true;
                                    break;
                                case shuri_enums.entitytypes.tag:
                                    scope.parentWord = scope.wordFor("Tag");
                                    break;
                                case shuri_enums.entitytypes.touch:
                                    scope.parentWord = scope.wordFor("Touch");
                                    break;
                                case shuri_enums.entitytypes.team:
                                    scope.parentWord = scope.wordFor("Team");
                                    scope.entityWord = scope.wordFor("Person");
                                    scope.entitiesWord = scope.wordFor("Users");
                                    scope.iconClasses = "arrows";
                                    scope.color = "teamColor";
                                    scope.itemColor = "teamColor";
                                    scope.itemColorClosed = "teamColor";
                                    scope.backgroundColor = "bgTeam";
                                    scope.hideAddNew = true;
                                    break;
                                case shuri_enums.entitytypes.usertype:
                                    scope.parentWord = scope.wordFor("Usertype");
                                    scope.hideHeader = true;
                                    scope.isOpen = true;
                                    scope.loadMore();
                                    break;

                                default:
                                    console.error("Unhandled entitytype:", scope.parentEntityType);
                                    break;
                            }

                            if (!scope.itemColorClosed) scope.itemColorClosed = scope.backgroundColor + "Light";
                            if (!scope.iconClassesClosed) scope.iconClassesClosed = scope.iconClasses;

                            scope.delegateHandle = scope.entitiesWord + "Scroller";

                            scope.searchModeKey = String.format("collEntIsAddMode_{0}_{1}", scope.entityType, scope.parentEntity.id);
                            if (sessionStorage.getItem(scope.searchModeKey)) scope.isAddMode = (sessionStorage.getItem(scope.searchModeKey) == "true");
                            else scope.isAddMode = (scope.entityCount < scope.scrollSize);

                            //specifics
                            scope.addWord = "Add";
                            if (scope.isDatabase) {
                                //console.log(scope.entity);
                                scope.addWord = "Add";
                                scope.removeMode = "delete";
                                if (scope.entityType == shuri_enums.entitytypes.touch || scope.entityType == shuri_enums.entitytypes.tag) {
                                    scope.showToggle = false;
                                    scope.isAddMode = false;
                                    scope.hideSearch = (scope.entityCount < scope.scrollSize)
                                }
                            }
                            if (scope.parentEntityType == shuri_enums.entitytypes.usertype) {
                                scope.isOpen = scope.isAddMode = true;
                                scope.showToggle = false;
                            }

                            scope.switchTitle = {
                                search: "Switch to: " + scope.addWord + " " + scope.entitiesWord.toLowerCase() + " to " + scope.parentEntity.name,
                                add: "Switch to:  SEARCH the list by name"
                            };
                            var pht = scope.addWord + " " + scope.entitiesWord.toLowerCase();//+ " to " + scope.parentEntity.name;
                            if (scope.entityType == shuri_enums.entitytypes.private) pht = scope.addWord + " to " + scope.entitiesWord.toLowerCase();

                            scope.placeholderText = {
                                search: "SEARCH the list by name",
                                add: pht
                            };

                            if (!scope.parentEntity.updatable) {
                                if (scope.isDatabase || scope.parentEntityType == shuri_enums.entitytypes.team
                                    || (scope.parentEntityType == shuri_enums.entitytypes.person && scope.entityType == shuri_enums.entitytypes.organization)
                                    || (scope.parentEntityType == shuri_enums.entitytypes.organization && scope.entityType == shuri_enums.entitytypes.person)
                                    ) {
                                    scope.showAddTouch = false;
                                    scope.showToggle = false;
                                    scope.isAddMode = false;
                                    if (scope.entityCount < scope.scrollSize) scope.hideSearch = true;
                                    //console.log("isaddmode");
                                }
                            }

                            if (scope.parentEntityType == shuri_enums.entitytypes.team && scope.entityType == shuri_enums.entitytypes.user) {
                                //this must be an admin managing users
                                dataApi.getAppUser().then(function (data) {
                                    scope.appUser = data;
                                    if (!scope.appUser.isSysAdmin) console.error("Must be admin", scope.appUser);
                                    scope.isAdminPage = true;
                                    scope.isOpen = scope.showSearchResults = true;
                                    scope.showToggle = scope.isAddMode = scope.hasMore = false;
                                });
                            }
                            if (scope.parentEntityType == shuri_enums.entitytypes.team
                                && $state.current.name != 'home.groupEdit'
                                && scope.parentEntity
                                && scope.parentEntity.id != appGlobals.guidEmpty) scope.showTeamEdit = true;

                            //finally, see if this is supposed to be open and if so, toggle to start loading process
                            if (scope.parentEntity && scope.parentEntity.id !== appGlobals.guidEmpty) {
                                scope.openKey = String.format("openCollEnt_{0}_{1}", scope.entityType, scope.parentEntity.id);
                                if (sessionStorage.getItem(scope.openKey)) scope.toggle(false);
                            }

                            if ($state.current.name.toLowerCase().indexOf("edit") >= 0) {
                                scope.isInEdit = true;
                                scope.isOpen = true;
                                scope.loadMore();
                            }

                            scope.initialUIHasBeenSet = true;
                        }
                    }
                    else console.log(scope.parentEntity);
                }

                function parseToPerson(name) {
                    var p = new shuri_person();
                    var names = name.split(" ");
                    var lastfirst = (name.indexOf(",") > 0);
                    var error = false;
                    if (names.length < 2) p.name = "Error Need a name like:<br /><b>Last, first (middle)</b><br /><span class='medText'>Put a space between names.</span>";
                    else if (names.length > 3) p.name = "Error Unable to parse name, too many parts";
                    else {
                        if (names.length == 2) {
                            p.firstname = (lastfirst) ? names[1] : names[0];
                            p.lastname = (lastfirst) ? names[0] : names[1];
                            p.lastname = p.lastname.replace(",", "");
                            p.name = p.firstname + ' ' + p.lastname;
                        }
                        else {
                            p.firstname = (lastfirst) ? names[1] : names[0];
                            p.middlename = (lastfirst) ? names[2] : names[1];
                            p.lastname = (lastfirst) ? names[0] : names[2];
                            p.lastname = p.lastname.replace(",", "");
                            p.name = p.firstname + ' ' + p.middlename + ' ' + p.lastname;
                        }
                    }
                    return p;
                }

                scope.toggle = function (persist) {
                    scope.isOpen = !scope.isOpen;
                    //console.log("toggled", scope.isAddMode);

                    if (scope.isOpen) {
                        if (persist && scope.parentEntity.id !== appGlobals.guidEmpty) sessionStorage.setItem(scope.openKey, "true");
                        refreshUI();
                        if (scope.resetEntities || !scope.entities || (scope.entityCount > 0 && scope.entities.length == 0)) {
                            //console.log(scope.entities, scope.entityCount);
                            scope.loadMore();
                            dataApi.getAppUser().then(function (data) {
                                scope.appUser = data;
                                scope.defaultCollection_Id = scope.appUser.defaultCollection_Id;
                                scope.appUser.updatableSubscriptionIds.forEach(function (subId) {
                                    if (subId == scope.parentEntity.id) scope.defaultCollection_Id = scope.parentEntity.id;
                                })
                            });
                        }

                    }
                    else if (persist && sessionStorage.getItem(scope.openKey)) sessionStorage.removeItem(scope.openKey);
                }

                scope.loadMore = function () {
                    //console.log(scope.isScrolling, scope.isPaged, scope.hasMore);
                    if (scope.isScrolling || !scope.hasMore) return false;
                    else if (scope.parentEntity.id == appGlobals.guidFavorites) loadMoreFavs();
                    else {
                        scope.isScrolling = true;
                        scope.page++;
                        scope.showSpinner = true;
                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.organization:
                                //console.log("getting orgsforentity");
                                dataApi.getOrgsForEntity(scope.parentEntityType, scope.parentEntity.id, scope.pageSize, scope.page).then(function (data) {
                                    if (data.length == 0 && scope.parentEntity.id == appGlobals.guidEmpty && scope.parentEntity.groups) {
                                        finishLoadMore($filter('filter')(scope.parentEntity.groups, function (grp) { return grp.grpType == 3; }));
                                    }
                                    else finishLoadMore(data);
                                });
                                break;
                            case shuri_enums.entitytypes.team:
                            case shuri_enums.entitytypes.person:
                                //console.log(scope.parentEntity);
                                dataApi.getPeopleForEntity(scope.parentEntityType, scope.parentEntity.id, scope.pageSize, scope.page).then(function (data) {
                                     //console.log(data);

                                    if (data.length == 0 && scope.parentEntity.id == appGlobals.guidEmpty && scope.parentEntity.people && scope.parentEntity.people.length > 0) finishLoadMore(scope.parentEntity.people);
                                    else finishLoadMore(data);
                                });
                                break;
                            case shuri_enums.entitytypes.tag:
                                //tags do not paginate - returns all - group by type
                                dataApi.getTagsForEntity(scope.parentEntityType, scope.parentEntity.id, 500, 1).then(function (data) {
                                    //console.log(data);
                                    if (data.length == 0 && scope.parentEntity.id == appGlobals.guidEmpty && scope.parentEntity.tags && scope.parentEntity.tags.length > 0) finishLoadMore(scope.parentEntity.tags);
                                    else finishLoadMore(data);
                                });
                                break;
                            case shuri_enums.entitytypes.touch:
                                dataApi.getTouchesForEntity(scope.parentEntityType, scope.parentEntity.id, scope.pageSize, scope.page).then(function (data) {

                                    finishLoadMore(data);
                                });
                                break;
                            case shuri_enums.entitytypes.private:
                                dataApi.getPrivateGroupsForEntity(scope.parentEntityType, scope.parentEntity.id).then(function (data) {
                                    if (data.length == 0 && scope.parentEntity.id == appGlobals.guidEmpty && scope.parentEntity.groups) {
                                        finishLoadMore($filter('filter')(scope.parentEntity.groups, function (grp) { return grp.grpType == 0; }));
                                    }
                                    else finishLoadMore(data);
                                });
                                break;
                            default:
                                console.error("Unhandled entitytype");
                                break;
                        }



                    }

                }

                function loadMoreFavs() {
                    //console.log(scope.isScrolling , !scope.isPaged , !scope.hasMore , scope.favsLoaded);

                    if (scope.isScrolling || !scope.hasMore || scope.favsLoaded) return false;
                    else {
                        scope.page++;
                        scope.favsLoaded = true;
                        dataApi.getFavorites().then(function (data) {

                            scope.entities = [];
                            var favorites = [];

                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    favorites = $filter('filter')(data.groups, function (grp) { return grp.grpType === shuri_enums.grouptype.organization; });
                                    break;
                                case shuri_enums.entitytypes.person:
                                    favorites = data.people;
                                    //console.log(favorites);
                                    break;
                                case shuri_enums.entitytypes.tag:
                                    favorites = data.tags;
                                    break;
                                    //case shuri_enums.entitytypes.touch:
                                    //    break;
                                default:
                                    console.error("Unhandled entitytype");
                                    break;
                            }

                            scope.entityCount = favorites.length;
                            finishLoadMore(favorites);

                        });

                    }

                }

                function finishLoadMore(data) {
                  if (!scope.entities || scope.resetEntities) {
                    scope.entities = [];
                    //console.log("created entities");
                  }

                  pushEntities(data).then(function () {
                    if (scope.entityType === shuri_enums.entitytypes.tag) {
                      setTagUI(data);
                    }

                    scope.hasMore = (scope.entityCount > scope.entities.length && scope.entityCount > scope.pageSize);

                    scope.isPaged = (scope.hasMore || scope.entities.length > scope.scrollSize);

                    //hook for People/Orgs:  set "former"
                    if ((scope.entityType === shuri_enums.entitytypes.person && scope.parentEntityType == shuri_enums.entitytypes.organization)
                      ||
                      (scope.entityType === shuri_enums.entitytypes.organization && scope.parentEntityType == shuri_enums.entitytypes.person)) {
                      //sniff for former
                      var now = new Date();
                      scope.entities.forEach(function (entity) {
                        //                        console.log(new Date(), entity.endDt, new Date(entity.endDt + "Z"));
                        if (entity.endDt) {
                          var dtStr = entity.endDt;
                          if (dtStr.toUpperCase().indexOf("Z") == -1) dtStr += "Z";

                          if (now > new Date(dtStr)) scope.hasFormer = true;
                        }
                      });
                      //console.log(scope.hasFormer, scope.isOpen);
                    }
                    else if (scope.entityType === shuri_enums.entitytypes.tag) {
                      var keyTag = "collEnt_tagsColl" + scope.parentEntity.id;
                      if (sessionStorage.getItem(keyTag)) scope.tagSetsCollapsed = (sessionStorage.getItem(keyTag) == "true");
                      else scope.tagSetsCollapsed = (scope.entityCount > scope.scrollSize);
                      scope.usertypes.forEach(function (ut) {
                        ut.hideTags = scope.tagSetsCollapsed;
                      });
                    }

                    scope.showSpinner = false;
                    scope.isScrolling = false;
                    $rootScope.$broadcast('scroll.infiniteScrollComplete');

                  });

                }

                scope.filterEntity = function (entity) {

                    return entity.changeType != 2 && (!entity.tenureOver || scope.showFormer);

                };

                scope.toggleShowFormer = function (event) {
                    if (event) event.stopPropagation();
                    scope.showFormer = !scope.showFormer;
                };

                function pushEntities(data) {
                    var deferred = $q.defer();

                    scope.entities.push.apply(scope.entities, data);
                    //console.log("Stashing ", scope.entities);
                    scope.stashedEntities = scope.entities.slice(0);

                    deferred.resolve();
                    return deferred.promise;

                }

                function setTagUI() {
                    scope.usertypes = [];
                    //console.log(scope.entities);
                    scope.entities.forEach(function (tag) {
                        if (!tag.changeType || tag.changeType != 2) {
                            var idx = -1;
                            var findname = "";
                            if (tag.typename) findname = tag.typename;
                            else if (tag.imageUrlThumb) {
                                findname = tag.imageUrlThumb;
                                tag.typename = tag.imageUrlThumb;
                            }
                            if (findname != "") {
                                for (var i = 0; i < scope.usertypes.length; i++) {
                                    if (scope.usertypes[i].name.toLowerCase() == findname.toLowerCase()) {
                                        idx = i;
                                        break;
                                    }
                                }
                            }
                            else console.error("Can't find a tag's type");

                            if (idx == -1) {
                                var ut = new shuri_userType();
                                //ut.hideTags = scope.tagSetsCollapsed;
                                //console.log(ut, scope.entities, scope.entityCount, (scope.entityCount > scope.scrollSize));
                                if (tag.typename) ut.name = tag.typename;
                                else if (tag.imageUrlThumb) ut.name = tag.imageUrlThumb;
                                else ut.name = "unknown";
                                if (tag.userType_Id) ut.id = tag.userType_Id;
                                ut.entityType = 5;
                                ut.tagSingleLine = true;
                                scope.usertypes.push(ut);
                            }
                        }
                    });

                    //Recount each UT
                    scope.entityCount = 0;
                    scope.usertypes.forEach(function (ut) {

                        ut.tagsCount = ($filter("filter")(scope.entities, function (tag) { return (tag.changeType != 2) && (tag.typename == ut.name || tag.userType_Id == ut.id); })).length;
                        scope.entityCount += ut.tagsCount;
                    })
                }

                function createNewEntity() {
                    var newEntity = null;

                    switch (scope.entityType) {
                        case shuri_enums.entitytypes.organization:
                            newEntity = new shuri_group();
                            newEntity.name = scope.searcher.addString;
                            newEntity.grpType = shuri_enums.grouptype.organization;
                            break;
                        case shuri_enums.entitytypes.person:
                            newEntity = parseToPerson(scope.searcher.addString);

                            if (newEntity.name.substring(0, 5) == "Error") {
                                var alertPop = $ionicPopup.confirm({
                                    title: "Error",
                                    template: newEntity.name.substring(6, newEntity.name.length)
                                });
                                alertPop.then(function (res) {
                                    scope.searcher.addString = scope.addStringLast = "";

                                });
                            }
                            break;
                        case shuri_enums.entitytypes.tag:
                            newEntity = new shuri_tag();
                            newEntity.name = scope.searcher.addString;
                            newEntity.typename = " Tags";
                            newEntity.userType_Id = appGlobals.guidLooseTags;

                            break;
                        case shuri_enums.entitytypes.touch:
                            newEntity = new shuri_touch();
                            newEntity.name = scope.searcher.addString;
                            break;
                        case shuri_enums.entitytypes.private:
                            newEntity = new shuri_group();
                            newEntity.grpType = shuri_enums.grouptype.private;
                            newEntity.name = scope.searcher.addString;
                            break;
                        default:
                            console.error("Unhandled entitytype");
                            break;
                    }
                    newEntity.sortname = "";
                    newEntity.entityType = scope.entityType;
                    newEntity.createdDt = new Date();

                    newEntity.collection_Id = scope.defaultCollection_Id;
                    if (scope.isDatabase) newEntity.collection_Id = scope.parentEntity.id;

                    return newEntity;

                }

                function addEntityToEntities(newEntity) {
                    //console.log(newEntity, scope.entities);
                    scope.entities.push(newEntity);
                    scope.stashedEntities = scope.entities.slice(0);

                    if (!scope.manageUpdates) {
                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.organization:
                                scope.parentEntity.groups.push(newEntity);
                                break;
                            case shuri_enums.entitytypes.person:
                                scope.parentEntity.people.push(newEntity);
                                break;
                            case shuri_enums.entitytypes.tag:
                                scope.parentEntity.tags.push(newEntity);
                                break;
                            case shuri_enums.entitytypes.private:
                                scope.parentEntity.groups.push(newEntity);
                                break;
                            default:
                                console.error("Unhandled entitytype");
                                break;
                        }
                    }


                    if (scope.entityType === shuri_enums.entitytypes.tag) setTagUI();
                    else scope.entityCount++;

                }

                function entitiesAreEqual(entA, entB) {

                    return (entA.id.toLowerCase() == entB.id.toLowerCase() && entA.id != appGlobals.guidEmpty)
                        || (entA.id == appGlobals.guidEmpty && entB.id == appGlobals.guidEmpty && entA.name.toLowerCase() == entB.name.toLowerCase());

                }

                function removeFromEntities(entity) {
                    entity.changeType = 2;
                    scope.entities.forEach(function (e) {
                        if (entitiesAreEqual(e, entity)) {
                            //console.log(e, entity);
                            e.changeType = 2;
                        }
                    });
                    scope.stashedEntities = scope.entities.slice(0);

                    if (!scope.manageUpdates) {
                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.organization:
                                var foundIt = false;
                                scope.parentEntity.groups.forEach(function (e) {
                                    if (entitiesAreEqual(e, entity)) {
                                        e.changeType = 2;
                                        foundIt = true;
                                    }
                                });
                                if (!foundIt) scope.parentEntity.groups.push(entity);
                                break;
                            case shuri_enums.entitytypes.person:
                                var foundIt = false;
                                scope.parentEntity.groups.forEach(function (e) {
                                    if (entitiesAreEqual(e, entity)) {
                                        e.changeType = 2;
                                        foundIt = true;
                                    }
                                });
                                if (!foundIt) scope.parentEntity.people.push(entity);
                                break;
                            case shuri_enums.entitytypes.tag:
                                var foundIt = false;
                                scope.parentEntity.tags.forEach(function (e) {
                                    if (entitiesAreEqual(e, entity)) {
                                        e.changeType = 2;
                                        foundIt = true;
                                    }
                                });
                                if (!foundIt) scope.parentEntity.tags.push(entity);
                                break;
                            case shuri_enums.entitytypes.private:
                                var foundIt = false;
                                scope.parentEntity.groups.forEach(function (e) {
                                    if (entitiesAreEqual(e, entity)) {
                                        e.changeType = 2;
                                        foundIt = true;
                                    }
                                });
                                if (!foundIt) scope.parentEntity.groups.push(entity);
                                break;
                            default:
                                console.error("Unhandled entitytype");
                                break;
                        }
                    }

                    if (scope.entityType === shuri_enums.entitytypes.tag) setTagUI();
                }

                scope.itemSelected = function (entity, forceadd) {
                    if (!forceadd && (!scope.isAddMode || !scope.showSearchResults)) {
                        if (entity.id != appGlobals.guidEmpty && !scope.isInEdit) {
                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    $state.go("home.org", { groupId: entity.id });
                                    break;
                                case shuri_enums.entitytypes.person:
                                case shuri_enums.entitytypes.team:
                                    if (scope.parentEntityType == shuri_enums.entitytypes.team) $state.go("home.user", { personId: entity.id });
                                    else $state.go("home.person", { personId: entity.id });
                                    break;
                                case shuri_enums.entitytypes.tag:
                                    $state.go("home.tag", { tagId: entity.id });
                                    break;
                                case shuri_enums.entitytypes.touch:
                                    $state.go("home.touch", { id: entity.id });
                                    break;
                                case shuri_enums.entitytypes.private:
                                    $state.go("home.groupEdit", { id: entity.id });
                                    break;
                                case shuri_enums.entitytypes.user:
                                    $state.go("home.userAdmin", { userId: entity.id });
                                    break;
                                default:
                                    console.error("Unhandled entitytype");
                                    break;
                            }
                        }
                    }
                    else {
                        //console.log(scope.manageUpdates);
                        //add existing entity
                        if (scope.manageUpdates) {

                            scope.resetSearch(false).then(function () {
                                if (scope.parentEntity.id == appGlobals.guidFavorites) {
                                    dataApi.addFave(entity.id, shuri_enums.entitytypes.person).then(function (data) {
                                        //var msg = String.format("{0} was added to {1}.", entity.name, scope.parentEntity.name);
                                        //$ionicLoading.show({ template: msg, duration: scope.loadingDuration });
                                        addEntityToEntities(entity);

                                    });
                                }
                                else {

                                    //console.log(scope.parentEntityType, scope.parentEntity.id, scope.entityType, entity.id);
                                    dataApi.postRelation(scope.parentEntityType, scope.parentEntity.id, scope.entityType, entity.id).then(function (data) {
                                        $rootScope.$broadcast("EntityChanged", scope.parentEntity.id);
                                        $rootScope.$broadcast("EntityChanged", entity.id);
                                        scope.entityCount++;
                                        dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType);
                                    });
                                }
                            });
                        }
                        else {
                            //console.log("resetting search", scope.stashedEntities);
                            scope.resetSearch(true).then(function () {
                                scope.isDirty = true;
                                entity.changeType = 1;
                                addEntityToEntities(entity);
                            });
                        }

                        //special case:  People On Touches:  Add org automatically??
                        if (scope.entityType == shuri_enums.entitytypes.person && scope.parentEntityType == shuri_enums.entitytypes.touch && entity.id != appGlobals.guidEmpty) {
                            dataApi.getOrgForPerson(entity.id).then(function (org) {
                                if (org && org.id != appGlobals.guidEmpty) $rootScope.$broadcast("AddOrgToTouch", scope.parentEntity.id, org);
                            });
                        }
                    }
                }

                scope.editItem = function (evt) {
                    if (evt) evt.stopPropagation();
                    switch (scope.parentEntityType) {
                        case shuri_enums.entitytypes.team:
                            $state.go("home.groupEdit", { id: scope.parentEntity.id });
                            break;

                            //case shuri_enums.entitytypes.organization:
                            //    $state.go("home.orgEdit", { groupId: entity.id });
                            //    break;
                            //case shuri_enums.entitytypes.person:
                            //    $state.go("home.personEdit", { personId: entity.id });
                            //    break;
                            //case shuri_enums.entitytypes.tag:
                            //    $state.go("edit.tagEdit", { tagId: entity.id });
                            //    break;
                            //case shuri_enums.entitytypes.touch:
                            //    $state.go("home.touchEdit", { id: entity.id });
                            //    break;
                            //    //case shuri_enums.entitytypes.private:
                        default:
                            console.error("Unhandled entitytype");
                            break;
                    }
                }

                scope.selectedPrivateGroupChanged = function (grp) { scope.selectedPrivateGroup = grp; };

                scope.addEntity = function (evt) {
                    if (evt) evt.stopPropagation();
                    switch (scope.entityType) {
                        case shuri_enums.entitytypes.organization:
                            $state.go("home.orgEdit", { groupId: appGlobals.guidEmpty, collectionId: scope.defaultCollection_Id });
                            break;
                        case shuri_enums.entitytypes.person:
                            $state.go("home.personEdit", { personId: appGlobals.guidEmpty, collectionId: scope.defaultCollection_Id });
                            break;
                        case shuri_enums.entitytypes.tag:
                            $state.go("home.customEdit", { utId: appGlobals.guidEmpty, collectionId: scope.defaultCollection_Id, utType: 'tagset' });
                            break;
                        case shuri_enums.entitytypes.touch:
                            var collId = scope.defaultCollection_Id;
                            if (scope.isDatabase) collId = scope.parentEntity.id;
                            $state.go("home.touchEdit", { id: appGlobals.guidEmpty, collectionId: collId, returnState: "goBack", entityId: scope.parentEntity.id, entityType: scope.parentEntityType });
                            break;
                        default:
                            console.error("Unhandled entitytype");
                            break;
                    }

                }

                scope.addFromSearchBar = function () {

                    if (scope.searcher.addString.trim() != "") {
                        var newEntity = createNewEntity();
                        var entityName = "";
                        var parentName = "";
                        var entityResource = "";
                        //var postRelatn = true;

                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.organization:
                                entityName = "group";
                                entityResource = "groups";
                                break;
                            case shuri_enums.entitytypes.person:
                                entityName = "person";
                                entityResource = "people";
                                break;
                            case shuri_enums.entitytypes.tag:
                                entityName = "tag";
                                entityResource = "tags";
                                break;
                            case shuri_enums.entitytypes.touch:
                                entityName = "touch";
                                entityResource = "touches";
                                break;
                            case shuri_enums.entitytypes.private:
                                entityName = "group";
                                entityResource = "groups";
                                break;
                            default:
                                console.error("Unhandled entitytype");
                                break;
                        }
                        switch (scope.parentEntityType) {
                            case shuri_enums.entitytypes.organization:
                            case shuri_enums.entitytypes.private:
                            case shuri_enums.entitytypes.group:
                                parentName = "group";
                                break;
                            case shuri_enums.entitytypes.person:
                                parentName = "person";
                                break;
                            case shuri_enums.entitytypes.tag:
                                parentName = "tag";
                                break;
                            case shuri_enums.entitytypes.touch:
                                parentName = "touch";
                                break;
                            case shuri_enums.entitytypes.usertype:
                                parentName = "tag set";
                                newEntity.userType_Id = scope.parentEntity.id;
                                newEntity.typename = scope.parentEntity.name;
                                break;
                            default:
                                console.error("Unhandled scope.parentEntityType: ", scope.parentEntityType);
                                break;
                        }

                        if (newEntity.name && newEntity.name.substring(0, 5) != "Error") {

                            if (scope.manageUpdates) {
                                scope.resetSearch(false).then(function () {
                                    dataApi.postEntity(entityResource, entityName, newEntity, scope.entityType, scope.parentEntity.id, scope.parentEntityType).then(function (data) {
                                        newEntity.id = data;
                                        if (scope.parentEntity.id == appGlobals.guidFavorites) {
                                            //var msg = String.format("{0} was added to {1}.", newEntity.name, "Favorites");
                                            //if (scope.entityCount > scope.scrollSize) $ionicLoading.show({ template: msg, duration: scope.loadingDuration });
                                            dataApi.addFave(newEntity.id, scope.entityType).then(function (data) {
                                                scope.entityCount++;

                                            });
                                        }
                                        else {
                                            scope.entityCount++;
                                            dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType, scope.entityType);
                                        }
                                    });
                                });
                            }
                            else {
                                scope.isDirty = true;
                                scope.resetSearch(true).then(function () {
                                    if (scope.parentEntityType == shuri_enums.entitytypes.usertype) {
                                        dataApi.tagNameUnique(newEntity.name).then(function (data) {
                                            var isUnique = data;
                                            if (isUnique) addEntityToEntities(newEntity);
                                            else {
                                                globals.showAlert("Tag Exists Elsewhere", "'" + newEntity.name + "' is already in use.");
                                            }
                                        });
                                    }
                                    else addEntityToEntities(newEntity);
                                });
                            }
                        }
                    }
                }

                //#region Button handlers
                scope.toggleSearch = function () {
                    scope.isAddMode = !scope.isAddMode;
                    if (scope.isAddMode) sessionStorage.setItem(scope.searchModeKey, "true");
                    else if (sessionStorage.getItem(scope.searchModeKey)) sessionStorage.removeItem(scope.searchModeKey);
                    scope.saveSearchString = true;
                }

                scope.toggleTagSets = function (evt, forceCollapse) {

                    if (evt && evt != null) evt.stopPropagation();

                    if (forceCollapse) scope.tagSetsCollapsed = true;
                    else scope.tagSetsCollapsed = !scope.tagSetsCollapsed

                    scope.usertypes.forEach(function (ut) {
                        ut.hideTags = scope.tagSetsCollapsed;
                    });

                    //user clicked; remember pref
                    var key = "collEnt_tagsColl" + scope.parentEntity.id;
                    if (sessionStorage.getItem(key)) sessionStorage.removeItem(key);
                    sessionStorage.setItem(key, scope.tagSetsCollapsed.toString());

                }

                scope.editUT = function (evt, ut) {
                    if (evt) evt.stopPropagation();
                    $state.go("home.customEdit", { utId: ut.id, utType: 5 });  //always a tag here
                }
                scope.inviteTeam = function (event) {
                    if (event) event.stopPropagation();
                    $state.go('home.quickStart', { teamId: scope.parentEntity.id });

                }

                scope.addTouch = function (evt, entity) {
                    //figure out the collectionId
                    if (evt) evt.stopPropagation();
                    if (entity) {
                        var grpType = -1;
                        if (scope.entityType == shuri_enums.entitytypes.group) grpType = entity.grpType;
                        $state.go("home.touchEdit", { id: appGlobals.guidEmpty, collectionId: dbId, entityId: entity.id, entityType: scope.entityType, grpType: grpType, returnState: "goback" });
                    }
                }

                //#endregion

                //#region Autocomplete ------------------------------------------------
                scope.pause = 400;
                scope.minLength = 2;
                scope.searcher = { addString: "" };
                scope.addStringLast = null;
                scope.addTimer = null;
                scope.hideTimer = null;
                scope.searching = false;

                scope.keyPressedAdd = function (event, childscope) {
                    // console.log(event.which, scope.searcher.addString);
                    scope.childscope = childscope;
                    if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                        if (!scope.searcher.addString || scope.searcher.addString == "") {
                            //user just cleared the search bar
                            scope.addStringLast = null;
                            scope.resetSearch(true).then(function () {
                                console.log("reset");
                                if (scope.addTimer) {
                                    $timeout.cancel(scope.addTimer);
                                }

                                scope.searching = false;
                            });

                        } else if (isNewSearchNeeded(scope.searcher.addString, scope.addStringLast, scope.minLength)) {
                            scope.addStringLast = scope.searcher.addString;

                            if (scope.addTimer) {
                                $timeout.cancel(scope.addTimer);
                            }
                            scope.searching = true;

                            scope.addTimer = $timeout(function () {
                                scope.timerAddComplete(scope.searcher.addString);
                            }, scope.pause);
                        }
                    } else {
                        event.preventDefault();
                    }
                };

                scope.resetHideResults = function (mode) {
                    if (scope.hideTimer) {
                        $timeout.cancel(scope.hideTimer);
                    };
                };

                scope.hideResults = function () {
                    scope.hideTimer = $timeout(function () {
                        scope.resetSearch(true);
                        //console.log("hideResults");
                    }, scope.pause);
                };

                scope.timerAddComplete = function (str) {
                    if (str.length >= scope.minLength) {
                        if (!scope.isAddMode) {
                            if (scope.isDatabase) {
                                dataApi.getAutocompleteDB(scope.entityType, str, 20, scope.parentEntity.id).then(function (data) {
                                    //if (scope.entityType == shuri_enums.entitytypes.tag) {
                                    //    var ut = new shuri_userType();
                                    //    ut.name = "Search Results";
                                    //    ut.entityType = 5;
                                    //    ut.tagSingleLine = false;
                                    //    ut.tags = data;
                                    //    console.log(ut);
                                    //    scope.entities = [];
                                    //    scope.entities.push(ut);

                                    //}
                                    //else
                                    data.forEach(function (e) {
                                        e.entityType = scope.entityType;
                                    });
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                    if (scope.entityType == shuri_enums.entitytypes.tag) setTagUI();
                                });
                            }
                            else if (scope.parentEntityType == shuri_enums.entitytypes.team && scope.entityType == shuri_enums.entitytypes.user) {
                                dataApi.getAutocomplete(shuri_enums.entitytypes.user, str, 12, shuri_enums.entitytypes.all).then(function (data) {
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                });


                            }
                            else {

                                var acEntityType = scope.entityType;
                                var forEntityType = scope.parentEntityType;

                                if (forEntityType == shuri_enums.entitytypes.group) {
                                    switch (scope.parentEntity.grpType) {
                                        case shuri_enums.grouptype.private:
                                            forEntityType = shuri_enums.entitytypes.private;
                                            break;
                                        case shuri_enums.grouptype.team:
                                            forEntityType = shuri_enums.entitytypes.team;
                                            break;
                                        case shuri_enums.grouptype.organization:
                                            forEntityType = shuri_enums.entitytypes.organization;
                                            break;
                                    }
                                }

                                //console.log(acEntityType, forEntityType);
                                dataApi.autocompleteByEntityId(acEntityType, str, 12, forEntityType, scope.parentEntity.id).then(function (data) {
                                    //if (data != [] && acEntityType == shuri_enums.entitytypes.tag) {
                                    //    var ut = new shuri_userType();
                                    //    ut.name = "Search Results";
                                    //    ut.entityType = 5;
                                    //    ut.tagSingleLine = false;
                                    //    ut.tags = data;
                                    //    console.log(ut);
                                    //    scope.entities = [];
                                    //    scope.entities.push(ut);

                                    //}
                                    //else
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                    if (scope.entityType == shuri_enums.entitytypes.tag) setTagUI();
                                });

                            }
                        }
                        else {
                            if (!scope.isDatabase) {

                                var acEntityType = scope.entityType;
                                var forEntityType = scope.parentEntityType;

                                if (forEntityType == shuri_enums.entitytypes.group) {
                                    switch (scope.parentEntity.grpType) {
                                        case shuri_enums.grouptype.private:
                                            forEntityType = shuri_enums.entitytypes.private;
                                            break;
                                        case shuri_enums.grouptype.team:
                                            acEntityType = shuri_enums.entitytypes.person;
                                            forEntityType = shuri_enums.entitytypes.team;
                                            break;
                                        case shuri_enums.grouptype.organization:
                                            forEntityType = shuri_enums.entitytypes.organization;
                                            break;
                                    }
                                }
                                else if (forEntityType == shuri_enums.entitytypes.team) acEntityType = shuri_enums.entitytypes.person;
                                dataApi.getAutocomplete(acEntityType, str, 12, forEntityType).then(function (data) {
                                    data.forEach(function (entity) { entity.addResult = true; });
                                    //if (data.length > 0 && scope.entityType == shuri_enums.entitytypes.tag) {
                                    //    var ut = new shuri_userType();
                                    //    ut.name = "Search Results";
                                    //    ut.entityType = 5;
                                    //    ut.tagSingleLine = false;
                                    //    ut.tags = data;
                                    //    //console.log(ut);
                                    //    scope.entities = [];
                                    //    scope.entities.push(ut);

                                    //}
                                    //else 
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                    if (scope.entityType == shuri_enums.entitytypes.tag) setTagUI();

                                });

                            }

                        }
                    }
                    else if (str.length == 0) {
                        scope.resetSearch(true);
                    }

                };

                function isNewSearchNeeded(newTerm, oldTerm, minLength) {
                    return newTerm.length >= minLength && newTerm != oldTerm;
                }

                //#endregion

                $rootScope.$on('EntityChanged', function (event, data) {
                  var entId = "";
                  if (!scope.isInEdit) {
                    if (data) {
                      data = data.toLowerCase();
                      if (scope.parentEntity && data === scope.parentEntity.id.toLowerCase()) {
                        //console.log("collEnt - ParentChg", data, scope.parentEntityType);
                        dataApi.clearCacheItemByEntity(scope.parentEntityType, scope.parentEntity.id).then(function () {
                          scope.resetEntities = true;
                          //scope.showSpinner = true;
                          scope.page = 0;
                          scope.hasMore = true;
                          refreshUI();
                          scope.loadMore();
                        });
                      }
                      else if (scope.entities) {

                        scope.entities.forEach(function (entity) {
                          if (entity.id && entity.id.toLowerCase() == data) entId = data;
                        });
                        if (entId != "") {
                          var entity = null;
                          //console.log("collEnt - EntityChg", entId, data);
                          dataApi.clearCacheItemByEntity(scope.entityType, data).then(function () {
                            switch (scope.entityType) {
                              case shuri_enums.entitytypes.organization:
                                dataApi.getOrg(entId, appGlobals.guidEmpty, 0, "collentity").then(function (data) {
                                  UpdateEntities(data);
                                });
                                break;
                              case shuri_enums.entitytypes.team:
                              case shuri_enums.entitytypes.person:
                                dataApi.getPerson(entId, 0).then(function (data) {
                                  UpdateEntities(data);
                                });
                                break;
                              case shuri_enums.entitytypes.tag:
                                dataApi.getTag(entId, appGlobals.guidEmpty).then(function (data) {
                                  UpdateEntities(data);
                                });
                                break;
                              case shuri_enums.entitytypes.touch:
                                dataApi.getTouch(entId, appGlobals.guidEmpty).then(function (data) {
                                  UpdateEntities(data);
                                });
                                break;
                            }

                          });
                        }
                      }

                      //user must have completed something else, so
                      if (entId != "") scope.resetSearch(false);
                      //console.log("I", entId);
                    }
                    else console.log("An entity changed, but did not report an id");
                  }
                });

                $rootScope.$on('EntityDeleted', function (event, data) {
                    var foundIt = false;
                    // console.log(scope.isOpen, scope.entities, scope.showSearchResults);
                    if (scope.entities && data != appGlobals.guidEmpty) {

                        scope.entities.forEach(function (entity) {
                            if (entity.id == data) {
                                entity.changeType = shuri_enums.changetype.remove;
                                scope.isDirty = true;
                                scope.entityCount--;
                                foundIt = true;
                                //console.log(entity);

                            }
                        });
                        if (foundIt && scope.entityType == shuri_enums.entitytypes.tag) setTagUI();
                    }
                });

                $rootScope.$on('AddOrgToTouch', function (event, touchId, org) {
                    if (scope.entityType == shuri_enums.entitytypes.organization
                        && scope.parentEntityType == shuri_enums.entitytypes.touch
                        && touchId && touchId == scope.parentEntity.id
                        && org.id && org.name) {
                        //already exists?
                        var exists = false;
                        if (scope.entities) {
                            scope.entities.forEach(function (ent) {
                                if (ent.id.toLowerCase() === org.id.toLowerCase()) exists = true;
                            });
                        }
                        if (!exists) {
                            //Generic touch? i.e. not primitive tracked email or social media
                            dataApi.getUserType(scope.parentEntity.userType_Id).then(function (ut) {
                                if (ut && (ut.primitive === shuri_enums.touchprimitive.meeting || ut.primitive === shuri_enums.touchprimitive.timedmeeting || ut.primitive === shuri_enums.touchprimitive.event)) {
                                    //user preference?
                                    dataApi.getUserPreferences().then(function (prefs) {
                                        //console.log(scope.parentEntity);
                                        if (prefs.autoaddorg) scope.itemSelected(org, true);
                                    });
                                }

                            });
                        }
                    }

                });


                $rootScope.$on("EntityCountDecremented", function (event, parentId, entityType, entityIdOrName) {
                    if (scope.parentEntity && scope.parentEntity.id.toLowerCase() == parentId.toLowerCase()) {
                        if (scope.entityType == entityType) {
                            scope.entityCount--;
                            scope.isDirty = true;
                            if (scope.entityType == shuri_enums.entitytypes.tag) {
                                scope.entities.forEach(function (tag) {
                                    console.log(tag.id, entityIdOrName);
                                    if (tag.id === entityIdOrName) tag.changeType = shuri_enums.changetype.remove;
                                });
                                setTagUI();
                            }
                            //console.log(scope.entities);
                        }

                    }

                });

                $rootScope.$on("MakeDirty", function (event, id) {

                    if (scope.parentEntity && scope.parentEntity.id.toLowerCase() == id.toLowerCase()) {
                        scope.isDirty = true;
                    }

                });

                function UpdateEntities(newEntity) {
                    if (scope.entities) {
                        scope.entities.forEach(function (entity) {
                            if (entity.id == newEntity.id) {
                                entity.name = newEntity.name;
                                if (newEntity.dateStart) entity.dateStart = newEntity.dateStart;
                                if (newEntity.typename) entity.typename = newEntity.typename;
                                if (newEntity.groups) entity.groups = newEntity.groups;
                                if (newEntity.imageUrlThumb && newEntity.imageUrlThumb != "") entity.imageUrlThumb = newEntity.imageUrlThumb;
                                else if (newEntity.imageUrl && newEntity.imageUrl.indexOf("shuristorage") > 0) {
                                    entity.imageUrlThumb = newEntity.imageUrl.replace(".png", "_thumb.png");
                                }
                                //console.log(newEntity.imageUrlThumb, (newEntity.imageUrlThumb != ""), newEntity.imageUrl, (newEntity.imageUrl.indexOf("shuristorage") > 0));
                                //console.log(newEntity, entity);
                            }
                        });
                    }
                }

                //console.log("Linked");
            }
        };
    }

})();
