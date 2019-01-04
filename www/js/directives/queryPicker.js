(function () {
    'use strict';

    angular.module("shuriApp").directive('queryPicker', ['$rootScope', '$state', '$compile', '$filter', '$timeout', '$ionicPopup', 'globals', 'dataApi',
        function ($rootScope, $state, $compile, $filter, $timeout, $ionicPopup, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    query: '=',
                    entityType: '='
                },
                templateUrl: "templates/query/queryPicker.html",
                link: function (scope, elem, attrs) {
                    scope.itemCount = 0;

                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    //#region Watchers
                    var watcherquery = scope.$watch('query', function () {
                        if (scope.query === undefined) return;
                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.organization:
                                scope.entities = scope.query.organizations;
                                break;
                            case shuri_enums.entitytypes.person:
                                scope.entities = scope.query.people;
                                break;
                            case shuri_enums.entitytypes.user:
                                //console.log(scope.query.owners);
                                scope.entities = scope.query.owners;
                                break;
                            case shuri_enums.entitytypes.private:
                                scope.entities = scope.query.groups;
                                break;
                            case shuri_enums.entitytypes.team:
                                scope.entities = scope.query.teams;
                                break;
                            default:
                                console.error("Unhandled entitytype", scope.entityType);
                                break;
                        }
                        if (scope.entities && scope.entities.length > 0) {
                            scope.entities.forEach(function (ent) {
                                ent.cssClass = scope.bgLight;
                            });
                        }
                        setheader();
                    });

                   function setheader() {
                       if (scope.isOpen || (scope.entities && scope.entities.length > 0)) scope.headerClasses = "item item-icon-left " + scope.itemColor;
                       else scope.headerClasses = "item item-icon-left bgDark";//+ scope.bgLight;

                        scope.headerIconClasses = "icon " + (scope.isOpen ? 'ion-arrow-down-b' : 'ion-arrow-right-b ');

                    }

                    function initialize() {
                        if (!scope.initialized) {
                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    scope.entityWord = scope.wordFor("Organization");
                                    scope.entitiesWord = scope.wordFor("Organizations");
                                    scope.iconClasses = "ion-person-stalker";
                                    scope.color = "calm";
                                    scope.itemColor = "item-calm";
                                    scope.bgLight = "bgCalmLight";
                                    scope.backgroundColor = "bgCalm";
                                    break;
                                case shuri_enums.entitytypes.person:
                                    scope.entityWord = scope.wordFor("Person");
                                    scope.entitiesWord = scope.wordFor("People");
                                    scope.iconClasses = "ion-person";
                                    scope.color = "energized";
                                    scope.itemColor = "item-energized";
                                    scope.bgLight = "bgEnergizedLight";
                                    scope.backgroundColor = "bgEnergized";
                                    break;
                                case shuri_enums.entitytypes.private:
                                    scope.entityWord = scope.wordFor("Group");
                                    scope.entitiesWord = scope.wordFor("Groups");
                                    scope.iconClasses = " ion-ios-star";
                                    scope.color = "groupColor";
                                    scope.itemColor = "groupColor";
                                    scope.bgLight = "bgGroupsLight";
                                    scope.backgroundColor = "bgGroups";
                                    break;
                                case shuri_enums.entitytypes.user:
                                    scope.entityWord = "Owner";
                                    scope.entitiesWord = "Owners";
                                    scope.iconClasses = "";
                                    scope.color = "teamColor";
                                    scope.itemColor = "teamColor";
                                    scope.bgLight = "bgTeamLight";
                                    scope.backgroundColor = "bgTeam";
                                    break;
                                case shuri_enums.entitytypes.team:
                                    scope.entityWord = "Owning Team";
                                    scope.entitiesWord = "Owning Teams";
                                    scope.iconClasses = "";
                                    scope.color = "teamColor";
                                    scope.itemColor = "teamColor";
                                    scope.bgLight = "bgTeamLight";
                                    scope.backgroundColor = "bgTeam";
                                    break;

                                default:
                                    console.error("Unhandled entitytype", scope.entityType);
                                    break;
                            }

                            setheader();
                            //console.log("Initialized");
                            scope.initialized = true;
                        }
                    }

                    //#endregion

                    scope.toggleOpen = function () {
                        scope.isOpen = !scope.isOpen;
                        setheader();
                    }

                    scope.removeEntity = function (evt, item) {
                        if (evt) evt.stopPropagation();

                        var itemId = item.id.toLowerCase();
                        switch (scope.entityType) {
                            case shuri_enums.entitytypes.private:
                            case shuri_enums.entitytypes.organization:
                                scope.query.groups.forEach(function (x) {
                                    if (x.id.toLowerCase() == itemId) x.changeType = 2;
                                });
                                break;
                            case shuri_enums.entitytypes.person:
                                scope.query.people.forEach(function (x) {
                                    if (x.id.toLowerCase() == itemId) x.changeType = 2;
                                });
                                break;
                        }

                        for (var i = 0; i < scope.entities.length; i++) {
                            if (scope.entities[i].id.toLowerCase() == item.id.toLowerCase()) {
                                scope.entities.splice(i, 1);
                                break;
                            }
                        }
                        $rootScope.$broadcast("MakeDirty", "query", scope.query.entityType);

                    }

                    //#region Autocomplete ------------------------------------------------
                    scope.pause = 400;
                    scope.minLength = 2;
                    scope.addString = "";
                    scope.addStringLast = null;
                    scope.addTimer = null;
                    scope.hideTimer = null;
                    scope.searching = false;
                    scope.showResults = false;

                    scope.keyPressedAdd = function (event, childscope) {
                        scope.addString = childscope.addString;
                        scope.childscope = childscope;
                        if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                            if (!scope.addString || scope.addString == "") {
                                scope.showResults = false;
                                scope.addStringLast = null;
                            } else if (isNewSearchNeeded(scope.addString, scope.addStringLast, scope.minLength)) {
                                scope.addStringLast = scope.addString;
                                scope.showResults = true;
                                scope.results = [];
                                if (scope.addTimer) {
                                    $timeout.cancel(scope.addTimer);
                                }

                                scope.searching = true;

                                scope.addTimer = $timeout(function () {
                                    scope.timerAddComplete(scope.addString);
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
                            scope.showResults = false;
                        }, scope.pause);
                    };

                    scope.selectAddResult = function (result) {
                        var contains = false;
                        if (!scope.entities) scope.entities = [];

                        for (var i = 0; i < scope.entities.length; i++) {
                            if (scope.entities[i].id == result.id) {
                                contains = true;
                                break;
                            }
                        }
                        //console.log(result, contains);
                        if (!contains) {

                            var group = new shuri_group();
                            group.changeType = shuri_enums.changetype.update;
                            group.id = result.id;
                            group.name = result.name;
                            group.imageUrlThumb = result.imageUrlThumb;
                            group.sorter = result.sorter + group.name;
                            group.cssClass = result.cssClass;
                           
                            //update the query
                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    group.grpType = 3;
                                    scope.query.organizations.push(group);
                                    break;
                                case shuri_enums.entitytypes.person:
                                    scope.query.people.push(group);
                                    break;
                                case shuri_enums.entitytypes.user:
                                    scope.query.owners.push(group);
                                    break;
                                case shuri_enums.entitytypes.private:
                                    group.grpType = 0;
                                    scope.query.groups.push(group);
                                    break;
                                case shuri_enums.entitytypes.team:
                                    group.grpType = 2;
                                    scope.query.teams.push(group);
                                    break;
                            }
                            //console.log(result);
                            //scope.entities.push(group);
                            scope.itemCount++;
                            $rootScope.$broadcast("MakeDirty", "query", scope.query.entityType);

                        }
                        if (scope.childscope && scope.childscope.addString) scope.childscope.addString = "";
                        scope.addString = scope.addStringLast = "";
                        setheader();

                    };

                    scope.timerAddComplete = function (str) {
                        // Begin the search
                        if (str.length >= scope.minLength) {
                            //console.log(str);

                            dataApi.getAutocomplete(scope.entityType, str, 20, scope.query.entityType, true).then(function (data) {
                                data.forEach(function (result) {
                                    result.cssClass = scope.bgLight;
                                });

                                scope.searching = false;
                                scope.results = data;
                            });

                        };
                    }

                    function isNewSearchNeeded(newTerm, oldTerm, minLength) {
                        return newTerm.length >= minLength && newTerm != oldTerm;
                    }

                    //#endregion

                    $rootScope.$on("clearQuery", function (event) {
                        //console.log("clearQuery", scope.entities)
                        scope.entities = [];
                        scope.isOpen = false;
                        //$rootScope.$broadcast("MakeDirty", "query", scope.entityType);
                    });

                    //console.log("Linked", scope.query)
                    initialize();
                }
            };
        }]);


})();
