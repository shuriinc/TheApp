(function () {
    'use strict';

    angular.module("shuriApp").directive('entityReports', ['$rootScope', '$state', '$compile', '$filter', '$timeout', '$q', '$ionicModal', '$ionicPopup', '$ionicListDelegate', '$ionicScrollDelegate', '$ionicActionSheet', '$ionicLoading', '$window', 'globals', 'dataApi', 'appGlobals',
        function ($rootScope, $state, $compile, $filter, $timeout, $q, $ionicModal, $ionicPopup, $ionicListDelegate, $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $window, globals, dataApi, appGlobals) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    entityType: '=',
                },
                templateUrl: "templates/directives/entityReports.html?" + _cacheBuster,
                link: function (scope, elem, attrs) {
                    scope.loadingDuration = 1900;
                    scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);


                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    //#region Watchers & AssignUI

                    var watcherEnt = scope.$watch('entity', function () {
                        if (typeof scope.entity === "undefined" || scope.entity === null) return;

                        assignUI();
                    })

                    var watcherET = scope.$watch('entityType', function () {
                        if (scope.entityType === undefined) return;
                        if (scope.entityType === shuri_enums.entitytypes.group && scope.entities.grpType && scope.entities.grpType == shuri_enums.grouptype.organization) scope.hasTenure = true;
                        assignUI();
                    })

                    function assignUI() {
                        if (scope.entityType && scope.entity) {

                            scope.openKey = String.format("openEntRpts_{0}", scope.entity.id);

                            //open?
                            if (sessionStorage.getItem(scope.openKey)) {
                                scope.isOpen = true;
                            }
                            var qry = new shuri_query();
                            qry.entityType = scope.entityType;

                            switch (scope.entityType) {
                                case shuri_enums.entitytypes.organization:
                                    qry.orgIds.push(scope.entity.id);
                                    break;
                                case shuri_enums.entitytypes.person:
                                    qry.personIds.push(scope.entity.id);
                                    break;
                                case shuri_enums.entitytypes.touch:
                                    qry.touchIds.push(scope.entity.id);
                                    break;
                                default:
                                    console.error("Unhandled entitytype", scope.entityType);
                                    break;
                            }
                            scope.query = qry;
                            //console.log(scope.reports);
                            refreshData();

                        }
                    }


                    //#endregion

                    function hardRefreshData() {
                        scope.reports = null;
                    }

                    function refreshData() {
                        if (!scope.reports) {
                            scope.reports = [];
                            $q.all({
                                dataReports: dataApi.getReports(scope.entityType)
                            }).then(function (d) {

                                scope.reports = $filter('filter')(d.dataReports, function (rpt) {
                                    try {

                                        rpt.rptDef = angular.fromJson(rpt.value);
                                        if (rpt.rptDef.isWord && rpt.rptDef.templateType == "page" && rpt.rptDef.pagesize.toString() == "1") {
                                            rpt.icon = FileIcon(rpt.rptDef.url);

                                            return true;
                                        }
                                        else return false;
                                    }
                                    catch (e) { console.error(e, "Bad report definition?", rpt.id); return false; };

                                    console.log(scope.reports);
                                });
                            });
                        }
                    }

                    scope.toggle = function (evt) {
                        scope.isOpen = !scope.isOpen;
                        if (scope.isOpen) sessionStorage.setItem(scope.openKey, "true");
                        else if (sessionStorage.getItem(scope.openKey)) sessionStorage.removeItem(scope.openKey);
                        //console.log(scope.entityType, scope.entities, scope.entityCount);

                    }

                    function openFile(url, name) {

                        if (window.cordova) {
                            dataApi.downloadFileToDevice(url, name);
                        }
                        else {
                            var target = "_self";

                            if (url.indexOf(".pdf") > 0) target = "_blank";
                            var win = window.open(url, target);
                        }
                        //}
                    };



                    $rootScope.$on("QueryItemChanged", function (event, data, type) {
                        if (type == "report") {
                            //user must have just run a report for an entity
                            //data should be the export doc w/url
                            //console.log(data, data.userType_Id && data.value);
                            if (data.userType_Id && data.value) {
                                var rpt = data;

                                switch (scope.entityType) {
                                    case shuri_enums.entitytypes.organization:
                                        if (rpt.userType_Id == appGlobals.utConstants.doc_exportOrgs) {
                                            openFile(rpt.value, rpt.name);
                                        }
                                        break;
                                    case shuri_enums.entitytypes.person:
                                        if (rpt.userType_Id == appGlobals.utConstants.doc_exportPeople) {
                                            openFile(rpt.value, rpt.name);
                                        }
                                        break;
                                    case shuri_enums.entitytypes.touch:
                                        if (rpt.userType_Id == appGlobals.utConstants.doc_exportTouches) {
                                            openFile(rpt.value, rpt.name);
                                        }
                                        break;
                                    default:
                                        console.error("Unhandled entitytype", scope.entityType);
                                        break;
                                }
                            }
                        }
                    });



                    $rootScope.$on('EntityChanged', function (event, data) {
                        var entId = "";
                        if (data) {
                            data = data.toLowerCase();

                            if (scope.reports && scope.reports.length) {
                            scope.reports.forEach(function (entity) {
                                if (entity.id && entity.id.toLowerCase() == data) entId = data;
                            });

                            if (entId != "") hardRefreshData();

                            }
                        }
                    });

                    $rootScope.$on('EntityDeleted', function (event, data) {
                        var entId = "";
                        data = data.toLowerCase();

                        scope.reports.forEach(function (entity) {
                            if (entity.id && entity.id.toLowerCase() == data) entId = data;
                        });

                        if (entId != "") hardRefreshData();
                    });
                }
            };
        }]);

})();
