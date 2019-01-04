(function () {
    'use strict';

    angular.module("shuriApp").directive('tagPicker', ['$rootScope', '$state', '$compile', '$filter', '$timeout', '$q', '$ionicPopup', '$ionicListDelegate', '$ionicScrollDelegate', '$ionicActionSheet', '$ionicLoading', '$window', 'globals', 'dataApi', 'appGlobals', tagPicker]);

    function tagPicker($rootScope, $state, $compile, $filter, $timeout, $q,  $ionicPopup, $ionicListDelegate, $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $window, globals, dataApi, appGlobals) {
        return {
            restrict: "E",
            scope: {
                parentEntity: '=',
                parentEntityType: '=',
                isDirty: '=',
                manageUpdates: '@'
            },
            templateUrl: "templates/directives/tagPicker.html?" + _cacheBuster,
            link: function (scope, elem, attrs) {
                scope.hasMore = true;
                scope.page = 0;
                scope.pageSize = 20;
                scope.scrollSize = 6;
                scope.searchAtSize = 10;
                scope.addCounter = 0;
                scope.loadingDuration = 1000;
                scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);

                scope.wordFor = function (word) { return globals.wordFor(word); };

                //#region Watchers & AssignUI

                var watcherPE = scope.$watch('parentEntity', function () {
                    if (typeof scope.parentEntity === "undefined" || scope.parentEntity === null) return;
                    scope.entityCount = scope.parentEntity.tags.length;
                    if (scope.entityCount == 0 && scope.parentEntity.tagsCount) scope.entityCount = scope.parentEntity.tagsCount;
                    //console.log(scope.parentEntity);

                    assignUI();

                })
                var watcherPET = scope.$watch('parentEntityType', function () {
                    if (typeof scope.parentEntityType === "undefined") return;

                    assignUI();

                })
                var watcherMU = scope.$watch('manageUpdates', function () {
                    if (typeof scope.manageUpdates === "undefined") return;
                    scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");

                })

                function assignUI() {
                    //console.log(scope.parentEntity, scope.parentEntityType);
                    if (scope.parentEntity && scope.parentEntityType) {
                        if (!scope.initialUIHasBeenSet) {
                            scope.pickMode = "add";
                            scope.isDatabase = (scope.parentEntityType && scope.parentEntityType == shuri_enums.entitytypes.group && scope.parentEntity.grpType === shuri_enums.grouptype.collection);

                            scope.parentEntity.isCurated = (scope.parentEntityType && scope.parentEntity.collection_Id
                                    && (scope.parentEntityType == shuri_enums.entitytypes.organization || scope.parentEntityType == shuri_enums.entitytypes.person) 
                                    && scope.parentEntity.collection_Id == appGlobals.guidARDB)
                            //console.log(scope.parentEntity.isCurated, scope.parentEntityType, scope.parentEntity.collection_Id);
                            if (scope.parentEntityType == shuri_enums.entitytypes.usertype) {
                                scope.isOpen = true;
                                scope.removeMode = "delete";
                                scope.showToggle = false;
                                scope.hideHeader = true;
                                scope.hideSearch = !scope.parentEntity.updatable;
                                scope.isOpen = true;
                            }

                            if (scope.isDatabase) {
                                scope.hideSearch = (scope.entityCount < scope.searchAtSize);
                                scope.removeMode = "delete";
                            }

                            scope.showSearch = (scope.parentEntity.tags.length >= scope.searchAtSize);
    
                            if ($state.current.name.toLowerCase().indexOf("edit") >= 0) {
                                scope.isInEdit = true;
                                scope.isOpen = true;
                            }

                            scope.initialUIHasBeenSet = true;

                        }

                        scope.parentEntity.tags.forEach(function (tag) {
                            if (tag.createdDt) {
                                if (moment.utc().subtract(scope.minutesNew, 'minutes').isBefore(moment.utc(tag.createdDt))) tag.isNew = true;
                            }
                            if (scope.parentEntityType == shuri_enums.entitytypes.touch) {
                                tag.removable = scope.parentEntity.updatable;
                            }

                        });


                         if (scope.pickMode == 'checkboxes') refreshTags();

                    }
                }


                //#endregion


                function refreshTags() {
                    var onlyUpdatable = scope.parentEntity.isCurated;
                    var entType = scope.parentEntityType;
                    if (scope.parentEntityType == shuri_enums.entitytypes.group) entType =shuri_enums.entitytypes.all;

                    dataApi.getUserTypesTags(entType, onlyUpdatable).then(function (data) {
                        scope.usertypes = data;
                             
                        scope.usertypes.forEach(function (ut) {
                            ut.tags.forEach(function (tag) {
                                for (var i = 0; i < scope.parentEntity.tags.length; i++) {
                                    var pTag = scope.parentEntity.tags[i];
                                    if (pTag.id.toLowerCase() === tag.id.toLowerCase()) {
                                        tag.isSelected = true;
                                        pTag.isSelected = true;
                                        break;
                                    }
                                }

                             });
                        });
                        scope.fixedTags = [];

                        scope.parentEntity.tags.forEach(function (tag) {
                            if (!tag.isSelected) {
                                scope.fixedTags.push(new shuri_tag(tag));
                            }
                          });
                    
                    });
                }

                scope.switchMode = function (mode) {
                    //if (evt) evt.stopPropagation();
                    if (mode == 'checkboxes') refreshTags();

                    scope.pickMode = mode;
                }

                scope.toggleFixedHide = function () {
                    scope.fixedHide = !scope.fixedHide;
                };

                scope.tagChange = function (tag) {
                    tag.isSelected = !tag.isSelected;
                    scope.isDirty = true;
                    if (tag.isSelected) {
                        //ADD
                        var tagExists = false;
                        scope.parentEntity.tags.forEach(function (pTag) {
                            if (pTag.id.toLowerCase() === tag.id.toLowerCase()) {
                                tagExists = true;
                                pTag.changeType = shuri_enums.changetype.update;
                            }
                        });
                        if (!tagExists) {
                            tag.changeType = shuri_enums.changetype.update;
                            scope.parentEntity.tags.push(tag);
                        }
                        if (scope.manageUpdates) {
                            dataApi.postRelation(scope.parentEntityType, scope.parentEntity.id, shuri_enums.entitytypes.tag, tag.id, true).then(function (data) {
                                dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);
                            });
                        }
                    }
                    else {
                        //REMOVE
                        for (var i = scope.parentEntity.tags.length - 1; i >= 0; i--) {
                            var tg = scope.parentEntity.tags[i];
                            if (tg.id.toLowerCase() == tag.id.toLowerCase()) {
                                tg.changeType = shuri_enums.changetype.remove;
                                if (scope.manageUpdates) {
                                    dataApi.deleteRelation(scope.parentEntityType, scope.parentEntity.id, shuri_enums.entitytypes.tag, tag.id, true).then(function () {
                                        scope.parentEntity.tags.splice(i, 1);
                                        scope.entityCount = scope.parentEntity.tags.length;
                                        dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);
                                    });
                                }
                                break;
                            }
                        }
                    }

                    scope.entityCount = scope.parentEntity.tags.length;

                    
                }

                scope.toggle = function (persist) {
                    scope.isOpen = !scope.isOpen;

                    if (scope.isOpen) {
                        if (persist && scope.parentEntity.id !== appGlobals.guidEmpty) sessionStorage.setItem(scope.openKey, "true");
                        if (scope.entityCount > 0 && scope.parentEntity.tags.length === 0) {
                            //only supported for DBs & Private Groups
                            if (!scope.isDatabase) {
                                dataApi.getTagsForEntity(scope.parentEntityType, scope.parentEntity.id, 500, 1).then(function (tags) {
                                    scope.parentEntity.tags = tags;
                                });
                            }
                            else {
                                dataApi.getUserTypes(scope.parentEntity.id).then(function (uts) {
                                    scope.parentEntity.usertypes = $filter("filter")(uts, function (ut) { return ut.entityType == 5 });
                                    //scope.parentEntity.usertypes.forEach(function (ut){
                                    //    ut.tags = $filter("filter")(tags, function(tg){
                                    //        return tg.userType_Id == ut.id;
                                    //    });
                                    //});
                                   // console.log(uts, scope.parentEntity.usertypes);
                                   // console.log(scope.isDatabase);

                                });
                            }
                        }
                     }
                    else if (persist && sessionStorage.getItem(scope.openKey)) sessionStorage.removeItem(scope.openKey);
                }


                function addEntityToEntities(newEntity) {
                    //console.log(newEntity, scope.entities);
                    scope.parentEntity.tags.push(newEntity);
                    scope.entityCount++;
                }

                function entitiesAreEqual(entA, entB) {

                    return (entA.id.toLowerCase() == entB.id.toLowerCase() && entA.id != appGlobals.guidEmpty)
                        || (entA.id == appGlobals.guidEmpty && entB.id == appGlobals.guidEmpty && entA.name.toLowerCase() == entB.name.toLowerCase());

                }

  
                scope.tagClicked = function (tag) {
                    $state.go("home.tag", { tagId: tag.id });
                }

                scope.showEntityAction = function (evt, tag) {
                    if (evt) evt.stopPropagation();
                    scope.entity = tag;
                    var mybuttons = [];
                    //console.log(scope.entity, scope.parentEntity, scope.parentEntityType);
                    scope.isOnEditPage = ($state.current.name.toLowerCase().indexOf("edit") > -1);

                    if (!scope.isDatabase && (scope.parentEntity.updatable || tag.id == appGlobals.guidEmpty)) mybuttons.push({ text: '<div class="assertive"><i class="icon ion-minus-circled"></i>Remove</div>', itemname: 'remove' });
                    if (tag.updatable && !scope.isOnEditPage) mybuttons.push({ text: '<div class=""><i class="icon ion-edit "></i>Edit</div>', itemname: 'edit' });

                    var hideSheet = $ionicActionSheet.show({
                        buttons: mybuttons,
                        titleText: scope.entity.name.toUpperCase(),
                        cancelText: 'Cancel',
                        cssClass: 'no-scroll',
                        destructiveText: (tag.deletable && tag.id != appGlobals.guidEmpty && (!scope.isOnEditPage || scope.parentEntityType === shuri_enums.entitytypes.usertype)) ? '<div class="assertive"><i class="icon ion-trash-b"></i>Delete</div>' : null,
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
                        case "edit":
                            $state.go("edit.tagEdit", { tagId: scope.entity.id });
                            break;
                        case "delete":
                            deleteEntity();
                            break;
                        case "remove":
                            removeEntity();
                            break;
                    }


                }

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
                                    dataApi.deleteEntity(scope.entity.id, 5, scope.entity).then(function (data) {
                                        dataApi.clearCacheItemByEntity(scope.parentEntityType, scope.parentEntity.id);
                                        $rootScope.$broadcast("EntityChanged", scope.parentEntity.id);
                                        dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);

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

                function removeEntity() {
                    //if (scope.isFavorite) {
                    //    dataApi.removeFave(scope.entity.id, scope.entity.entityType).then(function (data) {
                    //        scope.entity.changeType = shuri_enums.changetype.remove;
                    //        $rootScope.$broadcast("EntityCountDecremented", scope.parentEntity.id, scope.entityType, scope.entity.id);

                    //    });
                    //}
                    //else {
                        //REMOVE
                        for (var i = scope.parentEntity.tags.length - 1; i >= 0; i--)
                        {
                            var tg = scope.parentEntity.tags[i];
                            if (tg.id.toLowerCase() == scope.entity.id.toLowerCase()) {
                                tg.changeType = shuri_enums.changetype.remove;
                                if (scope.manageUpdates) {
                                    dataApi.deleteRelation(scope.parentEntityType, scope.parentEntity.id, shuri_enums.entitytypes.tag, scope.entity.id, true);
                                    scope.parentEntity.tags.splice(i, 1);
                                    dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);

                                }
                                break;
                            }
                        }
                        var activeTags = $filter("filter")(scope.parentEntity.tags, function (t) { return t.changeType != 2; });

                        scope.entityCount = activeTags.length;
                    //}
                }

                scope.itemSelected = function (entity) {
                    if (scope.pickMode != "add" || !scope.showSearchResults) {
                        if (entity.id != appGlobals.guidEmpty && !scope.isInEdit) {
                            $state.go("home.tag", { tagId: entity.id });
                        }
                    }
                    else {
                        //add existing entity
                       // console.log(entity);
                        scope.resetSearch(false).then(function () {
                            scope.isDirty = true;
                            //check for dupe
                            var isDupe = false;
                            scope.parentEntity.tags.forEach(function (tg) {
                                //console.log(entity.id, tg.id);
                                if (entity.id == tg.id) isDupe = true;
                            });

                            if (!isDupe) {
                                dataApi.getTag(entity.id).then(function (data) {
                                    var theTag = data;
                                    theTag.changeType = shuri_enums.changetype.update;
                                    scope.parentEntity.tags.push(theTag);
                                    scope.entityCount = scope.parentEntity.tags.length;
                                    if (scope.manageUpdates) {

                                        if (scope.parentEntity.id == appGlobals.guidFavorites) {
                                            dataApi.addFave(entity.id, shuri_enums.entitytypes.tag).then(function (data) {
                                                //var msg = String.format("{0} was added to {1}.", entity.name, scope.parentEntity.name);
                                                //$ionicLoading.show({ template: msg, duration: scope.loadingDuration });
                                                addEntityToEntities(entity);
                                            });
                                        }
                                        else {
                                            //special case:  associating tag to usertype  (loose tags)
                                            if (scope.parentEntityType === shuri_enums.entitytypes.usertype) {
                                                dataApi.getTag(entity.id).then(function (data) {
                                                    var theTag = data;
                                                    theTag.userType_Id = scope.parentEntity.id;
                                                    theTag.utId = scope.parentEntity.id;
                                                    theTag.utName = scope.parentEntity.name;
                                                    //needBC
                                                    dataApi.postEntity("Tags", "tag", theTag).then(function (data) {
                                                        $rootScope.$broadcast("EntityChanged", scope.parentEntity.id);

                                                    })
                                                });
                                            }
                                            else {
                                                //console.log(scope.parentEntityType, scope.parentEntity.id, entity.id);
                                                dataApi.postRelation(scope.parentEntityType, scope.parentEntity.id, shuri_enums.entitytypes.tag, entity.id, true).then(function () {
                                                    dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);
                                                });
                                            }
                                        }
                                    }

                                });
                            }
                        });

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

                scope.addFromSearchBar = function () {

                    if (scope.searcher.addString.trim() != "") {

                        dataApi.getAppUser().then(function (data) {
                            scope.appUser = data;
                            var newEntity = new shuri_tag();
                            newEntity.name = scope.searcher.addString;
                            newEntity.typename = " Tags";
                            newEntity.userType_Id = appGlobals.guidLooseTags;

                            newEntity.sortname = "";
                            newEntity.entityType = scope.entityType;
                            newEntity.createdDt = new Date();

                            newEntity.collection_Id = scope.appUser.defaultCollection_Id;
                            if (scope.isDatabase) newEntity.collection_Id = scope.parentEntity.id;

                            var parentName = "";
                            switch (scope.parentEntityType) {
                                case shuri_enums.entitytypes.organization:
                                case shuri_enums.entitytypes.private:
                                case shuri_enums.entitytypes.group:
                                    parentName = "group";
                                    break;
                                case shuri_enums.entitytypes.person:
                                    parentName = "person";
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

                            if (newEntity.name) {
                                if (scope.manageUpdates) {
                                    scope.resetSearch(false).then(function () {
                                        dataApi.postEntity("tags", "tag", newEntity, 5, scope.parentEntity.id, scope.parentEntityType).then(function (data) {
                                            newEntity.id = data;
                                            dataApi.updateEntityModifiedDt(scope.parentEntity.id, scope.parentEntityType);
                                            if (scope.parentEntity.id == appGlobals.guidFavorites) {
                                                //var msg = String.format("{0} was added to {1}.", newEntity.name, "Favorites");
                                                dataApi.addFave(newEntity.id, scope.entityType).then(function (data) {
                                                    scope.entityCount++;

                                                });
                                            }
                                            else scope.entityCount++;
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
                                        else {
                                            addEntityToEntities(newEntity);
                                        }
                                    });
                                }
                            }

                        });

                    }
                }

                //#region Button handlers
                scope.editUT = function (evt, ut) {
                    if (evt) evt.stopPropagation();
                    $state.go("home.customEdit", { utId: ut.id, utType: 5 });  //always a tag here
                }

                  //#endregion

                //#region Autocomplete ------------------------------------------------

                scope.pause = 400;
                scope.minLength = 2;
                scope.searcher = { addString: "", placeholderText: "Add New / Existing Tags" };
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
                                //console.log("reset");
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
                        
                        if (scope.pickMode == "search") {
                            if (scope.isDatabase) {
                                dataApi.getAutocompleteDB(5, str, 20, scope.parentEntity.id).then(function (data) {
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                });
                            }
                            else {
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
                                dataApi.autocompleteByEntityId(5, str, 20, forEntityType, scope.parentEntity.id).then(function (data) {
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
                                });

                            }
                        }
                        else {
                            if (!scope.isDatabase) {

                                var forEntityType = scope.parentEntityType;

                                if (forEntityType == shuri_enums.entitytypes.group) {
                                    switch (scope.parentEntity.grpType) {
                                        case shuri_enums.grouptype.private:
                                            forEntityType = shuri_enums.entitytypes.private;
                                            break;
                                        case shuri_enums.grouptype.organization:
                                            forEntityType = shuri_enums.entitytypes.organization;
                                            break;
                                    }
                                }
                                dataApi.getAutocomplete(5, str, 20, forEntityType).then(function (data) {
                                    data.forEach(function (entity) { entity.addResult = true; });
                                    scope.entities = data;
                                    scope.searching = false;
                                    scope.isPaged = false;
                                    scope.showSearchResults = true;
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
