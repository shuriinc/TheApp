(function () {
    'use strict';

    angular.module("shuriApp").directive('queryItem', ['$rootScope', '$state', '$filter', '$timeout', '$ionicActionSheet', '$ionicLoading', '$window', '$sce', 'globals', 'dataApi', 'appGlobals',
        function ($rootScope, $state, $filter, $timeout, $ionicActionSheet, $ionicLoading, $window, $sce, globals, dataApi, appGlobals) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    manageReporting: "=",
                    mayReport: '=',
                    query: '=',
                    queryItemType: '@',
                    userId: '='
                },
                templateUrl: "templates/query/queryItem.html",
                link: function (scope, elem, attrs) {
                    scope.loadDuration = 1200;
                    scope.widthSmall = 460;
                    scope.minutesNew = 60;
                    scope.itemClass = "item-stable ";
                    scope.textClass = "medText ";
                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    //#region Watchers

                    var watcherEC = scope.$watch('entity', function () {
                        if (typeof scope.entity === "undefined" || scope.entity === null) return;
                        if (scope.entity.createdDt) {
                            if (moment.utc().subtract(scope.minutesNew, 'minutes').isBefore(moment.utc(scope.entity.createdDt))) scope.entity.isNew = true;
                        }

                        //console.log(scope.entity);
                        assignUI();
                    })

                    var watcherET = scope.$watch('queryItemType', function () {
                        if (scope.queryItemType === undefined) return;
                        //valid entityType?
                        if (scope.queryItemType != "export" && scope.queryItemType != "report" && scope.queryItemType != "query") console.error("Invalid queryItem.entityType.");
                        else assignUI();
                    })
                    var watcherMay = scope.$watch('mayReport', function () {
                        if (scope.mayReport === undefined) return;
                        //console.log(scope.mayReport);
                    })

                    function assignUI() {
                        if (scope.queryItemType && scope.entity) {

                            if (scope.entity.name && !scope.entity.line1) scope.entity.line1 = scope.entity.name;
                            if (!scope.entity.line1) scope.entity.line1 = "Unknown";

                            //line2
                            scope.entity.line2 = "";

                            switch (scope.queryItemType) {
                                //case "export":
                                //    if (window.innerWidth <= scope.widthSmall) scope.textClass = "smallText";
                                //    if (scope.entity.value.indexOf(".xls") == -1) scope.itemClass = " bgPositiveLight";
                                //    else scope.itemClass = " bgBalancedLight";
                                //    break;

                                case "report":
                                    //console.log(scope.entity);
                                    if (scope.entity.rptDef.name) scope.entity.line1 = scope.entity.rptDef.name;

                                    var desc = "";
                                    if (scope.entity.rptDef && scope.entity.rptDef.description != "") desc = "<br />" + scope.entity.rptDef.description;

                                    if (scope.entity.ownedBy_Id != appGlobals.guidEmpty){
                                        desc += "<br />Owner: " + scope.entity.ownedByName;
                                        if (scope.entity.ownedByGroupName && scope.entity.ownedByGroupName != "Public") desc += ";  " + scope.entity.ownedByGroupName + "";
                                    }

                                    scope.entity.line2 = $sce.trustAsHtml(desc);// + $filter('date')(scope.entity.modifiedDt, 'shortDate') + "&nbsp;&nbsp; ");


                                    if (scope.entity.rptDef.isWord) {
                                        if (scope.entity.rptDef.templateType == 'table') {
                                            //scope.itemClass = " bgTeamLight";
                                            scope.itemClass = " bgPositiveLight";
                                            //scope.entity.line2 += $sce.trustAsHtml("&nbsp;&nbsp;(Table)");
                                        }
                                        else {
                                            scope.itemClass = " bgPositiveLight";
                                            if (scope.entity.rptDef.pagesize > 1) scope.entity.line2 += $sce.trustAsHtml("&nbsp;&nbsp;(" + scope.entity.rptDef.pagesize + " per page)");
                                        }
                                    }
                                    else scope.itemClass = " bgBalancedLight";
                                    break;
                                case "query":
                                    if (window.innerWidth <= scope.widthSmall && scope.entity.name.length > 24) scope.textClass = "smallText";
                                    scope.itemClass = " bgDarkLight";
                                    scope.entity.icon = "ion-blank";
                                    if (scope.entity.isDefault) {
                                        switch (scope.query.entityType) {
                                            case shuri_enums.entitytypes.person:
                                                scope.entity.icon = "ion-person";
                                                break;
                                            case shuri_enums.entitytypes.organization:
                                                scope.entity.icon = "ion-person-stalker";
                                                break;
                                            case shuri_enums.entitytypes.touch:
                                                scope.entity.icon = "shuri-touch";
                                                break;
                                        }
                                    }
                                    if (scope.userId !== undefined && scope.entity.ownedBy_Id.toLowerCase() != scope.userId.toLowerCase()) {
                                        scope.entity.line2 += $sce.trustAsHtml("<br />Shared by " + scope.entity.ownedByName);

                                    }
                                    break;
                                default:
                                    console.error("Unhandled item type", scope.queryItemType);
                                    break;
                            }

                            if (scope.entity.isNew) scope.itemClass = scope.itemClass.replace("Light", "");
                            //console.log(window.innerWidth);



                        }
                    }


                    //#endregion

                    //#region Event Handlers

                    scope.deleteEntity = function (evt) {
                        if (evt) evt.stopPropagation();
                        dataApi.deleteEntity(scope.entity.id, shuri_enums.entitytypes.document).then(function (data) {
                            //console.log(scope.entity);
                            scope.entity.changeType = shuri_enums.changetype.remove;
                        });
                    }

                    //scope.toggleChooseEntity = function () {
                    //    scope.entity.selected = !scope.entity.selected;

                    //}
                    //#endregion


                    scope.showEntityAction = function (evt) {
                        if (evt) evt.stopPropagation();
                        dataApi.getAppUser().then(function (data) {
                            scope.appUser = data;
                            var mybuttons = [];
                            if (scope.queryItemType == "report") {
                                if (!scope.entity.updatable && scope.appUser.IsSysAdmin) scope.entity.updatable = true;
                                if (scope.entity.updatable) mybuttons.push({ text: '<div class=""><i class="icon ion-ios-upload-outline "></i>Replace</div>', itemname: 'replace' });
                                if (scope.mayReport) {
                                    //default reporting handled in query.js
                                    if (scope.entity.default == "pdf") {
                                        if (scope.entity.rptDef.isWord) mybuttons.push({ text: '<div class=""><i class="icon shuri-file-word"></i>Report to Word</div>', itemname: 'runword' });
                                        else mybuttons.push({ text: '<div class=""><i class="icon shuri-file-excel"></i>Report to Excel</div>', itemname: 'runxls' });
                                    }
                                    else mybuttons.push({ text: '<div class=""><i class="icon shuri-file-pdf"></i>Report to PDF</div>', itemname: 'runpdf' });
                                }
                                mybuttons.push({ text: '<div class=""><i class="icon ion-ios-download-outline"></i>Download Template</div>', itemname: 'runtemplate' });
                            }
                            else if (scope.queryItemType == "query") {
                                if (!scope.entity.updatable && scope.appUser.IsSysAdmin) scope.entity.updatable = true;
                                mybuttons.push({ text: '<div class=""><i class="icon ion-refresh"></i>Run</div>', itemname: 'runquery' });
                                if (!scope.entity.isDefault) mybuttons.push({ text: '<div class=""><i class="icon ion-checkmark-round"></i>Set as Default</div>', itemname: 'defaultquery' });
                                else mybuttons.push({ text: '<div class=""><i class="icon ion-close-round"></i>Clear Default</div>', itemname: 'cleardefaultquery' });
                            }
                            if (scope.entity.updatable) mybuttons.push({ text: '<div class=""><i class="icon ion-edit "></i>Edit</div>', itemname: 'edit' });

                            var title = scope.entity.line1.toUpperCase();
                            if (title.length > 40) title = title.substring(0, 35);
                            var hideSheet = $ionicActionSheet.show({
                                buttons: mybuttons,
                                titleText: title,
                                cancelText: 'Cancel',
                                cssClass: 'no-scroll',
                                destructiveText: (scope.entity.updatable) ? '<div class="assertive"><i class="icon ion-trash-a"></i>Delete</div>' : null,
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

                        });
                    }

                    scope.doAction = function (action) {
                        //console.log(action);
                        switch (action) {
                            case "edit":
                                editEntity();
                                break;
                            case "delete":
                                scope.deleteEntity();
                                break;
                            case "copy":
                                openFile();
                                break;
                            case "defaultquery":
                                setDefaultQuery();
                                break;
                            case "cleardefaultquery":
                                clearDefaultQuery();
                                break;
                            case "replace":
                                replaceTemplate();
                                break;
                            case "runquery":
                                //broadcast?
                                break;
                            case "runpdf":
                                runReport("pdf");
                                break;
                            case "runxls":
                                runReport("xls");
                                break;
                            case "runword":
                                runReport("word");
                                break;
                            case "runtemplate":
                                console.log(scope.entity);
                                if (scope.entity.isWord) openFile()
                                else runReport("template");
                                break;
                        }


                    }

                    scope.itemClicked = function (evt) {
                        if (scope.queryItemType == "export") {
                            if (evt) evt.stopPropagation();
                            openFile();
                        }
                        else if (scope.queryItemType == "report" && scope.manageReporting && scope.manageReporting.toString() == "true") {
                            if (evt) evt.stopPropagation();
                            runReport("");
                        }
                        //else let event bubble
                    }

                    function replaceTemplate() {
                        var rptDef = angular.fromJson(scope.entity.value);
                        var input = document.getElementById("reportReplacer");
                        if (input) {
                            //stash the doc 
                            appGlobals.docCurrentTemplate = scope.entity;
                            if (rptDef.isWord) input.accept = "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                            else input.accept = "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel.sheet.macroEnabled.12";
                            $timeout(function () { input.click(); }, 100);
                        }

                    }

                    function openFile() {
                        //console.log(scope.entity);
                        var url = scope.entity.value;

                        if (scope.queryItemType == "report") {
                            url = scope.entity.rptDef.url;
                        }
                        var filename = url.split('/').pop()
                        if (window.cordova) {
                            dataApi.downloadFileToDevice(url, filename);
                        }
                        else {
                            var target = "_self";

                            //if (url.indexOf(".pdf") > 0) target = "_blank";
                            var win = window.open(url, target);
                        }
                        //}
                    };


                    function editEntity() {
                        switch (scope.queryItemType) {
                            case "query":
                                appGlobals.docQuery = scope.entity;
                                $state.go("edit.savedQueryEdit");
                                break;
                            case "report":
                                //console.log(scope.entity);
                                appGlobals.queryStashed = scope.query;
                                $state.go("edit.templateEdit", { docId: scope.entity.id, showUpload: "true"});
                                break;
                            default:
                                console.error("Unhandled entitytype");
                                break;
                        }
                    }

                    function runReport(saveAs) {
                        if (scope.queryItemType == "report") {
                            var msg = scope.entity.rptDef.name + ' is being created ';
                            if (saveAs == "pdf") msg += 'as PDF...';
                            else if (saveAs == "template") msg += 'as a template...';
                            $ionicLoading.show({ template: msg });

                            dataApi.queryReport(scope.query, scope.entity.id, saveAs).then(function (data) {
                                $ionicLoading.hide();
                                var url = data;
                                if (!data || data.trim() == "" || data.toLowerCase().indexOf("https://") == -1) {
                                    var msg = "Unable to create that report.";
                                    globals.showAlert("Something went wrong", msg);
                                }
                                else {
                                    if (window.cordova) {
                                        var filename = url.split('/').pop()
                                        dataApi.downloadFileToDevice(url, filename);
                                    }
                                    else {
                                        var target = "_self";
                                        var win = window.open(url, target);
                                    }
                                }
                            }, function (err) {
                                $ionicLoading.hide();

                            });
                        }
                    }

                    function setDefaultQuery() {
                        //must be a savedQuery
                        var rptDef = angular.fromJson(scope.entity.value);
                        var prefname = "DefaultQuery" + rptDef.entityType.toString();
                        dataApi.clearCacheItem("reportsqueries");
                        dataApi.postUserPreference(prefname, scope.entity.id, true).then(function (data) {
                            $rootScope.$broadcast("QueryItemChanged", data, "query", false);

                        });

                    }

                    function clearDefaultQuery() {
                        //must be a savedQuery
                        var rptDef = angular.fromJson(scope.entity.value);
                        var prefname = "DefaultQuery" + rptDef.entityType.toString();
                        dataApi.clearCacheItem("reportsqueries");
                        dataApi.deleteUserPreference(prefname, scope.entity.id, true).then(function (data) {
                            dataApi.refreshAppUser().then(function () {
                                $rootScope.$broadcast("QueryItemChanged", data, "query", false);
                            });
                        });

                    }

                }
            };
        }]);

})();
