
(function () {
    'use strict';

    angular.module("shuriApp").controller('QueryCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$timeout', '$filter', '$window', '$cordovaGeolocation', '$cordovaFileOpener2', '$cordovaCalendar', '$ionicActionSheet', '$ionicHistory', '$ionicModal', '$ionicPopup', '$ionicPopover', '$ionicLoading', '$ionicScrollDelegate', '$ionicListDelegate', '$q', '$cordovaFileTransfer', 'globals', 'dataApi', 'appGlobals', QueryCtrl]);

    function QueryCtrl($rootScope, $scope, $state, $stateParams, $timeout, $filter, $window, $cordovaGeolocation, $cordovaFileOpener2, $cordovaCalendar, $ionicActionSheet, $ionicHistory, $ionicModal, $ionicPopup, $ionicPopover, $ionicLoading, $ionicScrollDelegate, $ionicListDelegate, $q, $cordovaFileTransfer, globals, dataApi, appGlobals) {

        var vm = this;
        vm.durationLong = 2000;

  
        //#region Properties and At-top initialization
        vm.entityType = shuri_enums.entitytypes.person;

        // set entityType based on route
        switch ($state.current.name.replace("home.query", "").toLowerCase()) {
            case "people":
                vm.entityType = shuri_enums.entitytypes.person;
                break;

            case "orgs":
                vm.entityType = shuri_enums.entitytypes.organization;
                break;

            case "touches":
                vm.entityType = shuri_enums.entitytypes.touch;
                break;
            default:
                globals.showAlert("Error", "Unable to determine entityType.  Contact your developer.");
                return;
        }

        vm.actionBarIndex = 1;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.queryItem = { field: "e" };

        vm.token = localStorage.getItem("appAuthToken");

        //Init UI
        var key = "hideQueries" + vm.entityType;
        if (localStorage.getItem(key)) vm.hideQueries = true;

        key = "hideFilters" + vm.entityType;
        if (localStorage.getItem(key)) vm.hideFilters = true;

        key = "hideTemplates" + vm.entityType;
        if (localStorage.getItem(key)) vm.hideTemplates = true;
        key = "hidePublicTemplates" + vm.entityType;
        if (localStorage.getItem(key)) vm.hidePublicTemplates = true;

        key = "hideReports" + vm.entityType;
        if (localStorage.getItem(key)) vm.hideReports = true;
        //#endregion

        //#region Data Calls
        vm.loadMore = function (background) {
            vm.hasMore = false;
            if (!vm.query) {
                vm.query = new shuri_query();
                vm.query.entityType = vm.entityType;
                console.error("Didn't find  a vm.query");
            }
            DoTheLoad(background);
            //if (vm.actionBarIndex == 1) {
            //    if (!vm.scrollPosition) {
            //        vm.scrollPosition = $ionicScrollDelegate.getScrollPosition();
            //    }
            //    if (vm.scrollPosition.top === 0 && $ionicScrollDelegate.getScrollPosition().top === 0) DoTheLoad(background);
            //    else if (vm.scrollPosition.top === $ionicScrollDelegate.getScrollPosition().top) {
            //        //$ionicLoading.hide();
            //        $scope.$broadcast('scroll.infiniteScrollComplete');
            //    }
            //    else DoTheLoad(background);
            //}
        };

        function DoTheLoad(background) {
            //console.log('DoTheLoad');
            if (!background) $ionicLoading.show({ template: 'Querying ' + vm.entityWord + '...' });
            vm.loadingMore = true;
            vm.hasMore = false;
            refreshQuery("Do The Load").then(function () {
                vm.query.page++;

                postQuery();
            }, function (err) { console.error(err); });
        };

        function postQuery() {
            //console.log(vm.query);
            dataApi.postQuery(vm.query).then(
              function (data) {
                  vm.loadingMore = false;
                  vm.actionBarIndex = 1;
                  appGlobals.forceQueryRefresh = false;
                  vm.showContent = true;
                  $ionicLoading.hide();

                  //console.log(vm.query, data);
                  var dataitems = data.items;
                  vm.totalCount = data.totalCount;
                  vm.totalCountStash = data.totalCount;  //keep around if some uses choose then cancels
                  if (!vm.queryResults) vm.queryResults = [];
                  for (var i = 0; i < dataitems.length; i++) {
                      vm.queryResults.push(dataitems[i]);
                  }
                  $scope.$broadcast('scroll.refreshComplete');
                  $scope.$broadcast('scroll.infiniteScrollComplete');
                  vm.hasMore = (dataitems.length <= vm.query.pagesize && dataitems.length != vm.totalCount);
                  if (vm.query.page == 1) $ionicScrollDelegate.scrollTop();
                  vm.scrollPosition = $ionicScrollDelegate.getScrollPosition();
              },
              function (data) {
                  $ionicLoading.hide();
                  appGlobals.forceQueryRefresh = false;

                  vm.actionBarIndex = 1;
                  alert(data);
              });

        }

        function hardRefresh() {
            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataUTs: dataApi.getUserTypes(),
                //dataPrivs: dataApi.getPrivateGroupsForEntity("all", appGlobals.guidEmpty)
            }).then(function (d) {
                //#region Filters - UserTypes
                vm.utTags = [];
                vm.utTagsAll = [];
                vm.fields = [];
                vm.utTouches = [];
                d.dataUTs.forEach(function (ut) {
                    if (ut.entityType == shuri_enums.entitytypes.touch && vm.entityType == shuri_enums.entitytypes.touch) vm.utTouches.push(angular.fromJson(angular.toJson(ut)));
                    else if ((vm.entityType == shuri_enums.entitytypes.organization && ut.forOrgs)
                                || (vm.entityType == shuri_enums.entitytypes.person && ut.forPeople)
                                || (vm.entityType == shuri_enums.entitytypes.touch && ut.forTouches)
                                ) {
                        if (ut.entityType == shuri_enums.entitytypes.contactpoint || ut.entityType == shuri_enums.entitytypes.document) vm.fields.push(angular.fromJson(angular.toJson(ut)));
                        else if (ut.entityType == shuri_enums.entitytypes.tag) {
                            vm.utTags.push(angular.fromJson(angular.toJson(ut)));
                            vm.utTagsAll.push(angular.fromJson(angular.toJson(ut)));
                        }
                    }
                });
                vm.utTouches = $filter("orderBy")(vm.utTouches, "name");
                //console.log(vm.utTouches);

                //Fields--------------------------------------
                vm.fields.forEach(function (ut) { ut.sorter = ut.name; });

                vm.fieldnames.forEach(function (f) {
                    var ut = new shuri_userType();
                    ut.name = f;
                    ut.sorter = f;
                    if (f.toLowerCase().indexOf("date") >= 0) {
                        //fake a document primitive date
                        ut.entityType = shuri_enums.entitytypes.document;
                        ut.primitive = shuri_enums.documentprimitive.customdate;
                    }
                    vm.fields.push(ut);
                });

                // dropdown starter
                var choose = new shuri_userType();
                choose.name = 'Choose one...';
                choose.sorter = 0;
                vm.fields.splice(0, 1, choose);
                vm.queryItem.field = vm.fields[0];
                vm.allops = dataApi.getQueryOperators(); //not asynch
                //-------------------------------------------------------------------end Fields

                //Touches
                if (vm.entityType == shuri_enums.entitytypes.touch) {

                    vm.timePeriods = globals.timePeriods();
                    var custom = { name: "Custom...", value: "custom", sorter: 100 };

                    vm.timePeriods.push(custom);
                }
                //#endregion

                vm.appUser = d.dataAppUser;
                //vm.privateGroups = d.dataPrivs;
                vm.collectionIds = vm.appUser.subscriptionIds;

                //console.log()
                refreshReports().then(function (data) {
                    refreshSavedQueries().then(function () {
                        vm.isQueryDirty = false;
                        setDefaultQuery("hardRefresh").then(function () {
                            vm.query.page = 0;
                            vm.queryResults = [];
                            vm.loadMore();
                        });
                    });
                });




            }, function (err) {
                //something horrible happened
                dataApi.clearCache();
                appGlobals.forceQueryRefresh = true;
                $state.go($state.current.name);
            });
        };
        //#endregion

        //#region Reports
        vm.report = function (event, rpt, saveAsPdf) {

            if (event) event.stopPropagation();
            if (vm.totalCount <= vm.max4Report) {
                var rptId = vm.guidSystem;
                var rptName = "Standard report package";
                if (rpt) {
                    rptName = rpt.rptDef.name;
                    rptId = rpt.id;
                }

                $ionicLoading.show({ template: rptName + ' is being generated...' });
                var itemCnt = 0;
                var theQuery = vm.query; //default

                if (vm.showCBs) {
                    var entityIds = [];
                    vm.queryResults.forEach(function (qr) {
                        if (qr.selected) entityIds.push(qr.id);
                    });
                    if (entityIds != []) {
                        theQuery = new shuri_query();
                        theQuery.entityType = vm.entityType;
                        theQuery.timePeriod = "alltime";
                        theQuery.dateEndUTC = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                        theQuery.dateStartUTC = moment().utc().subtract(2, 'years').format('YYYY-MM-DD HH:mm:ss');
                        switch (vm.entityType) {
                            case shuri_enums.entitytypes.organization:
                                theQuery.orgIds = entityIds;
                                break;
                            case shuri_enums.entitytypes.person:
                                theQuery.personIds = entityIds;
                                break;
                            case shuri_enums.entitytypes.touch:
                                theQuery.touchIds = entityIds;
                                break;
                        }


                    }


                }
                if (!rptId) rptId = appGlobals.guidSystem;

                var saveAs = "";
                if (rpt.default && rpt.default == "pdf") saveAs = "pdf";

                dataApi.queryReport(theQuery, rptId, saveAs).then(function (data) {
                    $ionicLoading.hide();
                    //console.log(data);

                    if (!data || data.trim() == "" || data.toLowerCase().indexOf("https://") == -1) {
                        var msg = "Unable to create that report.";
                        globals.showAlert("Something went wrong", msg);
                    }
                    else {
                        //dispense report
                        var url = data;
                        dispenseUrl(data, rpt.rptDef.name);
                    }
                }, function (err) {
                    $ionicLoading.hide();
                });
            }
        }

        function dispenseUrl(url, name) {
            if (window.cordova) {
                var filename = url.split('/').pop()
                dataApi.downloadFileToDevice(url, filename);
            }
            else {
                var target = "_self";
                var win = window.open(url, target);
            }

        }
        //vm.runPrebuiltReport = function (event, rpt, saveAsPdf) {
        //    if (event) event.stopPropagation();
        //    console.log(rpt);
        //    $ionicLoading.show({ template: 'Report is being generated...' });
        //    dataApi.queryReportPrebuilt(vm.query, rpt.rptDef.dataname, saveAsPdf).then(function (data) {
        //        $ionicLoading.hide();
        //        console.log(data);
        //        if (!data || !data.id || data.id == appGlobals.guidEmpty) {
        //            var msg = "Unable to create that report.";
        //            globals.showAlert("Something went wrong", msg);
        //        }
        //        else {
        //            data.entityType = vm.entityType;
        //            data.icon = FileIcon(data.value);
        //            //data.cssClass = "bgPositiveLight";
        //            data.isNew = true;
        //            vm.exportFiles.push(data);
        //        }
        //    }, function (err) {
        //        $ionicLoading.hide();

        //    });

        //}

        vm.setRptSort = function (sorter) {
            return $q(function (resolve, reject) {



                if (!sorter) sorter = vm.rptSorter;
                else {
                    var key = "reportSort" + vm.entityType;
                    if (localStorage.getItem(key)) localStorage.removeItem(key);
                    localStorage.setItem(key, sorter);

                }
                if (vm.reports && vm.reports.length) {
                    vm.reports.forEach(function (rpt) {
                        var partNew = (rpt.isNew) ? "0" : "1";
                        var partType = ((rpt.rptDef.isWord.toString() == "true") ? "0" : "1") + ((rpt.rptDef && rpt.rptDef.templateType == "page") ? "0" : "1");
                        var partDate = "999999999999";

                        if (rpt.createdDt) {
                            if (moment.utc().subtract(60, 'minutes').isBefore(moment.utc(rpt.createdDt))) rpt.isNew = true;
                            partNew = (rpt.isNew) ? "0" : "1";
                            var theDate = rpt.createdDt;
                            if (theDate.toString().toLowerCase().substring(10, 1) == "t") theDate = SQLDate2JS(rpt.createdDt);
                            var compareDate = moment();
                            var modifiedDt = moment.utc(theDate);
                            partDate = ZeroFill((compareDate - modifiedDt), 12)
                            //console.log();
                        }
                        //console.log(rpt.rptDef);
                        if (vm.entityType == 6) partType = ((rpt.rptDef.isWord.toString() == "true") ? "1" : "0") + ((rpt.rptDef && rpt.rptDef.templateType == "page") ? "0" : "1");

                        switch (sorter) {
                            case 1:
                                rpt.sorter = partNew + partType + partDate;
                                break;
                            case 2:
                                rpt.sorter = partNew + partDate + partType;
                                break;
                            case 3:
                                rpt.sorter = partNew + rpt.name + partType + partDate;
                                break;
                        }


                    });

                }
                if (vm.reportsPublic && vm.reportsPublic.length) {
                    vm.reportsPublic.forEach(function (rpt) {
                        var partNew = (rpt.isNew) ? "0" : "1";
                        var partType = ((rpt.rptDef.isWord.toString() == "true") ? "0" : "1") + ((rpt.rptDef && rpt.rptDef.templateType == "page") ? "0" : "1");
                        var partDate = "999999999999";

                        if (rpt.createdDt) {
                            if (moment.utc().subtract(60, 'minutes').isBefore(moment.utc(rpt.createdDt))) rpt.isNew = true;
                            partNew = (rpt.isNew) ? "0" : "1";
                            var theDate = rpt.createdDt;
                            if (theDate.toString().toLowerCase().substring(10, 1) == "t") theDate = SQLDate2JS(rpt.createdDt);
                            var compareDate = moment();
                            var modifiedDt = moment.utc(theDate);
                            partDate = ZeroFill((compareDate - modifiedDt), 12)
                            //console.log();
                        }
                        //console.log(rpt.rptDef);
                        if (vm.entityType == 6) partType = ((rpt.rptDef.isWord.toString() == "true") ? "1" : "0") + ((rpt.rptDef && rpt.rptDef.templateType == "page") ? "0" : "1");

                        switch (sorter) {
                            case 1:
                                rpt.sorter = partNew + partType + partDate;
                                break;
                            case 2:
                                rpt.sorter = partNew + partDate + partType;
                                break;
                            case 3:
                                rpt.sorter = partNew + rpt.name + partType + partDate;
                                break;
                        }


                    });

                }
                vm.rptSorter = sorter;
                resolve();
            });
        }

        vm.browseForTemplates = function (event, isWord) {
            if (event) event.stopPropagation();

            //set the mime types
            vm.acceptRptTemplate = "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            document.getElementById(vm.uploadID).click();
        };

        vm.replaceTemplate = function (uploader) {
            $window.event.stopPropagation();
            if (uploader.files.length > 0) {
                var theFile = uploader.files[0];
                var doc =  appGlobals.docCurrentTemplate;
                //console.log(doc);
                dataApi.replaceReport(uploader.files, doc.id).then(function (data) {
                    //console.log(uploader);
                    uploader.value = "";
                    $ionicLoading.show({ template: "Template has been replaced.", duration: 2500 });


                }, function (data) {
                    uploader.value = "";
                    $ionicLoading.show({ template: "Template replace failed.", duration: 4000 });
                    console.error(data);


                });

            }
            else {
                console.log('nothing was picked');
            }
        }

        vm.saveFiles = function (files) {
            $window.event.stopPropagation();
            if (files.length > 0) {
                var theFile = files[0];

                var rptDef = {
                    pagesize: 1, templateType: "page", name: theFile.name, url: "", description: "",
                    collection_Id: vm.appUser.defaultCollection_Id, id: appGlobals.guidEmpty, ownedByGroup_Id: appGlobals.guidEmpty,
                    entityType: vm.entityType, updatable: true
                };

                rptDef.isWord = (rptDef.name.toLowerCase().indexOf(".doc") > 0 || rptDef.name.toLowerCase().indexOf(".docx") > 0);
                rptDef.name = rptDef.name.replaceAll('.docx', '').replaceAll('.doc', '').replaceAll('.xlsx', '').replaceAll('.xls', '');
                vm.newFileLoading = true;
                dataApi.validateTemplate(files, rptDef).then(function (result) {
                    console.log(result);
                    if (result != "") {
                        globals.showAlert("Cannot Upload Template", "The selected file is not a valid template.  Reason: " + result);
                    }
                    else {
                        dataApi.postReports(files, rptDef).then(function (data) {
                            document.getElementById(vm.uploadID).value = null;
                            var newDoc = data[0];
                            newDoc.rptDef = angular.fromJson(newDoc.value);
                            //console.log(newDoc);
                            newDoc.icon = FileIcon(newDoc.rptDef.url);
                            vm.reports.push(newDoc);
                            vm.newFileLoading = false;
                            $state.go("edit.templateEdit", { docId: newDoc.id });
                        });
                    }
                });
            }
            else {
                console.log('nothing was picked');
            }
        }

        function refreshReports() {

            return $q(function (resolve, reject) {

                dataApi.getMyReports().then(function (data) {
                    if (data) {
                        vm.dataReports = data;
                        var rpts = [];
                        var rptsPub = [];
                        angular.forEach(vm.dataReports.reports, function (rpt) {
                            if (rpt.entityType == vm.entityType &&
                                     (rpt.userType_Id == appGlobals.utConstants.doc_reportTemplatePeople
                                        || rpt.userType_Id == appGlobals.utConstants.doc_reportTemplateOrgs
                                        || rpt.userType_Id == appGlobals.utConstants.doc_reportTemplateTouches)) {
                                try {
                                    if (vm.appUser.isSysAdmin) rpt.updatable = true;
                                    rpt.rptDef = angular.fromJson(rpt.value);
                                    rpt.icon = FileIcon(rpt.rptDef.url);
                                    rpt.isWord = (rpt.rptDef.isWord.toString() == "true");
                                    if (rpt.isWord) rpt.itemClass = " bgPositiveLight";
                                    else rpt.itemClass = " bgBalancedLight";

                                    if (rpt.rptDef.isWord && rpt.rptDef.templateType == "page") rpt.icon += " positive";

                                    if (window.cordova) {
                                        rpt.default = "pdf";
                                        rpt.icon = "shuri-file-pdf";
                                    }

                                    if (rpt.ownedBy_Id == appGlobals.guidEmpty) rptsPub.push(rpt);
                                    else rpts.push(rpt);
                                }
                                catch (e) { console.error("Bad report definition", rpt.id); };

                            }
                        });

                        vm.reports = rpts;
                        vm.reportsPublic = rptsPub;

                        //get Sort pref
                        var key = "reportSort" + vm.entityType;
                        var rptSort = 1;
                        if (vm.rptSorter) rptSort = vm.rptSorter;
                        if (localStorage.getItem(key)) rptSort = parseInt(localStorage.getItem(key));

                        if (!(rptSort >= 1 && rptSort <= 3)) rptSort = 1;


                        //Exports------------------
                        //vm.exportFiles = $filter('filter')(vm.dataReports.exports, function (rpt) {
                        //    if (rpt.entityType == vm.entityType) {
                        //        rpt.icon = FileIcon(rpt.value);
                        //        return true;
                        //    }
                        //    else return false;;
                        //});


                        vm.setRptSort(rptSort).then(function () {
                            vm.mayExport = (vm.appUser.licenseStatus == 0) && (!vm.isInTrial(vm.appUser) || vm.entityType == shuri_enums.entitytypes.touch)

                            resolve();
                        }, function (err) {
                            console.error(err);
                            resolve();
                        });
                    }
                    else resolve();

                });
            });


        }

        vm.getGlossary = function (event) {
            if (event) event.stopPropagation();
            $ionicLoading.show({ template: "Getting glossary..." });
            dataApi.glossary(vm.entityType, false).then(function (url) {
                if (url && url != "") {
                    dispenseUrl(url,vm.entityWord);
                }
                else console.log("Blank url");
                $ionicLoading.hide();
            });
            //
        }
        //#endregion

        //#region Queries
        vm.saveQuery = function () {
            refreshQuery("save query").then(function () {
                var newDoc = new shuri_document();
                //console.log(vm.query, vm.querySummaryBrief);
                if ((vm.isQueryDirty || !vm.isDefaultQuery) && vm.querySummaryBrief != "") {
                    newDoc.name = HtmlToPlaintext(vm.querySummaryBrief);
                }
                else newDoc.name = vm.entityWord + " " + moment().format('lll');

                if (newDoc.name.length > 140) newDoc = newDoc.substring(0, 140);

                vm.query.strDateStart = moment.utc(vm.query.dateStartUTC).format();
                vm.query.strDateEnd = moment.utc(vm.query.dateEndUTC).format();

                newDoc.value = angular.toJson(vm.query);
                newDoc.userType_Id = appGlobals.utConstants.doc_savedQuery;
                newDoc.collection_Id = vm.appUser.defaultCollection_Id;
                newDoc.ownedBy_Id = vm.appUser.id;
                newDoc.ownedByName = vm.appUser.name;
                newDoc.createdByName = vm.appUser.name;
                newDoc.modifiedByName = vm.appUser.name;

                newDoc.icon = "ion-funnel";
                //var key = "appSavedQueryDoc";
                //if (sessionStorage.getItem(key)) sessionStorage.removeItem(key);
                //sessionStorage.setItem(key, angular.toJson(newDoc));
                //console.log(newDoc, vm.querySummaryBrief);
                appGlobals.docQuery = newDoc;
                $state.go("edit.savedQueryEdit");
            });

        }

        vm.loadSavedQuery = function (doc, quiet) {
            if (!quiet) $ionicLoading.show({ template: "Loading query..." });
            resetQuery().then(function () {
                var qr = JSON.parse(doc.value);
                LoadQueryIntoUI(qr).then(function () {
                    vm.isQueryDirty = true;
                    vm.query.page = 0;
                    vm.queryResults = [];
                    vm.loadMore();

                });

            });
        }

        function LoadQueryIntoUI(qr) {
            var deferred = $q.defer();

            //hydrate the query
            //dataApi.hydrateQueryRequest(qr).then(function (data) {
                vm.query = qr;
                if (vm.query.strDateStart) vm.query.dateStartUTC = moment.utc(vm.query.strDateStart).toDate();
                if (vm.query.strDateEnd) vm.query.dateEndUTC = moment.utc(vm.query.strDateEnd).toDate();

                //sync newly-loaded query to UI---------------
                //Tags--------------------------------------------
                vm.tagsSelectedCnt = 0;
                vm.query.tagIds.forEach(function (id) {
                    selectTag(id, vm.utTags);
                    vm.tagsSelectedCnt++;
                });
                vm.tagsAllSelectedCnt = 0;
                try {
                    vm.query.tagIdsAll.forEach(function (id) {
                        selectTag(id, vm.utTagsAll);
                        vm.tagsAllSelectedCnt++;
                    });
                }
                catch (e) { }


                //Usertypes--------------------------------------------
                vm.utTouches.forEach(function (ut) { ut.isSelected = false; });
                vm.query.usertypeIds.forEach(function (id) {
                    id = id.toLowerCase();
                    vm.utTouches.forEach(function (ut) { if (ut.id.toLowerCase() === id) ut.isSelected = true; });
                });
                vm.touchesSelectedCnt = ($filter("filter")(vm.utTouches, function (ut) { return ut.isSelected; })).length;

                //Proximity------------
                if (vm.query.proximity.point && vm.query.proximity.point != "") {
                    vm.hasProximity = true;
                    vm.streetAddress = vm.query.proximity.address;
                }

                //TimePeriod
                if (vm.query.timePeriod == "custom") {
                    vm.jsDateEnd = new Date(vm.query.dateEndUTC);
                    vm.jsDateStart = new Date(vm.query.dateStartUTC);
                    console.log(vm.jsDateStart, vm.jsDateEnd, vm.query);
                }
                setTPString();

                refreshQuery("LoadDocQUI").then(function () {
                    //console.log(vm.query.timePeriod, vm.timePeriods);
                    deferred.resolve();

                });


            //});

            //console.log(doc, vm.query);

             return deferred.promise;



        }

        function selectTag(tagId, uts) {
            tagId = tagId.toLowerCase();
            uts.forEach(function (ut) {
                ut.tags.forEach(function (tag) {
                    if (tag.id.toLowerCase() === tagId) tag.isSelected = true;
                })
            })
        }

        function clearQuery() {
            var deferred = $q.defer();
            var msg = "Clearing";
            if (vm.isQueryDirty && vm.hasDefaultQuery) msg += " to default";

            $ionicLoading.show({ template: msg, duration: vm.durationLong });
            resetQuery().then(function () {
                if (!vm.isQueryDirty) {
                    //console.log(vm.isDefaultQuery, vm.querySummary, vm.query);
                    refreshQuery().then(function () {
                        $rootScope.$broadcast("clearQuery");
                        deferred.resolve();
                    });
                    //user has asked to clear his own default query, so we're good
                }
                else {
                    setDefaultQuery("clearQuery").then(function () {
                        vm.isQueryDirty = false;
                        refreshQuery().then(function () {
                            $rootScope.$broadcast("clearQuery");
                            deferred.resolve();
                        });

                    }, function (err) { deferred.reject(); });

                }
            }, function (err) { deferred.reject(); });
            return deferred.promise;
        }

        function resetQuery() {
            var deferred = $q.defer();
            vm.query = new shuri_query();
            vm.query.entityType = vm.entityType;

            vm.streetAddress = "";
            vm.queryLocationOpen = false;
            vm.hasProximity = false;
            vm.queryItemsOpen = false;
            vm.filterTagsOpen = false;
            vm.filterTagsAllOpen = false;
            vm.filterTypesOpen = false;
            if (vm.entityType == shuri_enums.entitytypes.touch) {
                vm.touchesSelectedCnt = 0;
                if (vm.utTouches && vm.utTouches.length) vm.utTouches.forEach(function (ut) { ut.isSelected = false; });
                vm.query.timePeriod = "alltime";
                vm.jsDateEnd = new Date();
                vm.jsDateStart = moment().subtract(1, "month");
                setTPString();

            }

            vm.utTags.forEach(function (ut) {
                ut.tagsSelectedCnt = 0;
                ut.tags.forEach(function (tag) {
                    tag.isSelected = false;
                });
            });
            vm.tagsSelectedCnt = 0;
            vm.tagsAllSelectedCnt = 0;
            vm.utTagsAll.forEach(function (ut) {
                ut.tagsSelectedCnt = 0;
                ut.tags.forEach(function (tag) {
                    tag.isSelected = false;
                });
            });


            deferred.resolve();
            return deferred.promise;


        }

        function refreshSavedQueries() {
            var deferred = $q.defer();
            //console.log(vm.dataReports);
            if (vm.dataReports) {

                vm.savedQueries = $filter('filter')(vm.dataReports.queries, function (qry) {
                    return (qry.entityType == vm.entityType);
                });
            //console.log(vm.savedQueries);
                vm.setRptSort().then(function () { deferred.resolve(); });

            }
            else deferred.resolve();
            return deferred.promise;

        }

        function setDefaultQuery(source) {
            var deferred = $q.defer();

           // console.log(source);
            if (vm.entityType && vm.savedQueries) {

                var defQry = null;
                vm.savedQueries.forEach(function (doc) {
                    if (doc.isDefault) {
                        //get the qry out of doc
                        var qry = angular.fromJson(doc.value);
                        if (qry.entityType == vm.entityType) defQry = doc;
                    }
                });
                if (defQry) {
                    //console.log(defQry)
                    vm.isDefaultQuery = true;
                    vm.hasDefaultQuery = true;
                    var qr = JSON.parse(defQry.value);
                    LoadQueryIntoUI(qr).then(function () {
                        deferred.resolve();
                    });
                }
                else {
                    vm.query = new shuri_query();
                    vm.query.entityType = vm.entityType;
                    if ( vm.query.entityType == 6) setTPString();
                    deferred.resolve();
                }
            }
            else {
                vm.query = new shuri_query();
                vm.query.entityType = vm.entityType;
                deferred.resolve();
            }

            return deferred.promise;

        }

        function getIsDefaultQuery() {
            var deferred = $q.defer();

            if (vm.entityType && vm.savedQueries) {
                var isDefault = true;
                var defaultQuery = new shuri_query();
                defaultQuery.entityType = vm.entityType;
                vm.savedQueries.forEach(function (doc) {
                    if (doc.isDefault) {
                        var docQry = angular.fromJson(doc.value);
                        if (docQry.entityType === vm.entityType) defaultQuery = docQry;
                    }
                });

                queriesEqual(defaultQuery, vm.query).then(function (data) {
                    //console.log(data, defaultQuery, vm.query);
                    deferred.resolve(data);

                });
            }
            else deferred.reject();

            return deferred.promise;

        }

        function queriesEqual(q1, q2) {
            var deferred = $q.defer();
            var eq = true;
            try {
                if (q1.entityType !== q2.entityType) eq = false;
                if (q1.timePeriod !== q2.timePeriod) eq = false;
                if (q1.recordType !== q2.recordType) eq = false;

                if (q1.groupIds.length !== q2.groupIds.length) eq = false;
                if (q1.orgIds.length !== q2.orgIds.length) eq = false;
                if (q1.ownerIds.length !== q2.ownerIds.length) eq = false;
                if (q1.personIds.length !== q2.personIds.length) eq = false;
                if (q1.tagIds.length !== q2.tagIds.length) eq = false;
                if (q1.tagIdsAll.length !== q2.tagIdsAll.length) eq = false;
                if (q1.teamIds.length !== q2.teamIds.length) eq = false;
                if (q1.touchIds.length !== q2.touchIds.length) eq = false;
                if (q1.usertypeIds.length !== q2.usertypeIds.length) eq = false;

                for (var i = 0; i < q2.groupIds.length; i++) if (q1.groupIds[i] !== q2.groupIds[i]) eq = false;
                for (var i = 0; i < q2.orgIds.length; i++) if (q1.orgIds[i] !== q2.orgIds[i]) eq = false;
                for (var i = 0; i < q2.ownerIds.length; i++) if (q1.ownerIds[i] !== q2.ownerIds[i]) eq = false;
                for (var i = 0; i < q2.personIds.length; i++) if (q1.personIds[i] !== q2.personIds[i]) eq = false;
                for (var i = 0; i < q2.tagIds.length; i++) if (q1.tagIds[i] !== q2.tagIds[i]) eq = false;
                for (var i = 0; i < q2.tagIdsAll.length; i++) if (q1.tagIdsAll[i] !== q2.tagIdsAll[i]) eq = false;
                for (var i = 0; i < q2.teamIds.length; i++) if (q1.teamIds[i] !== q2.teamIds[i]) eq = false;
                for (var i = 0; i < q2.touchIds.length; i++) if (q1.touchIds[i] !== q2.touchIds[i]) eq = false;
                for (var i = 0; i < q2.usertypeIds.length; i++) if (q1.usertypeIds[i] !== q2.usertypeIds[i]) eq = false;

                if (q1.proximity.point !== q2.proximity.point) eq = false;
                else if (q1.proximity.point !== "") {
                    if (q1.proximity.distance !== q2.proximity.distance) eq = false;
                    if (q1.proximity.distanceKM !== q2.proximity.distanceKM) eq = false;
                }

                if (q1.queryItems.length !== q2.queryItems.length) eq = false;
                else if (q1.queryItems.length > 0) {
                    for (var i = 0; i < q2.queryItems.length; i++) {
                        var qitem1 = q1.queryItems[i];
                        var qitem2 = q2.queryItems[i];
                        console.log(qitem1, qitem2);
                        if (qitem1.field !== qitem2.field) eq = false;
                        if (qitem1.operator !== qitem2.operator) eq = false;
                        if (qitem1.value !== qitem2.value) eq = false;
                    }
                }
            }
            catch (e) {
                console.error(e);
                eq = false;
            }

            deferred.resolve(eq);
            return deferred.promise;

        }

        function refreshQuery(source) {
            var deferred = $q.defer();
            //if (source)
            //console.log(vm.query);
            vm.querySummary = "";
            vm.querySummaryBrief = "";
            //#region do the refresh
            if (vm.entityType == shuri_enums.entitytypes.touch) {
                if (vm.query.timePeriod == "custom") {
                    vm.query.dateStartUTC = moment.utc(vm.jsDateStart).format('YYYY-MM-DD HH:mm:ss');
                    vm.query.dateEndUTC = moment.utc(vm.jsDateEnd).format('YYYY-MM-DD HH:mm:ss');
                    vm.querySummary += String.format("Custom Time Period:  {0} to {1} <br />", moment(vm.jsDateStart).format("ll"), moment(vm.jsDateEnd).format("ll"));
                    vm.querySummaryBrief += String.format("Custom: {0} to {1}   <br />", moment(vm.jsDateStart).format("l"), moment(vm.jsDateEnd).format("l"));
                    console.log(vm.jsDateEnd);
                }
                else {
                    var times = globals.timesFromTimePeriod(vm.query.timePeriod);
                    vm.query.dateStartUTC = moment.utc(times.dateStart).format('YYYY-MM-DD HH:mm:ss');
                    vm.query.dateEndUTC = moment.utc(times.dateEnd).format('YYYY-MM-DD HH:mm:ss');
                    var tpName = vm.query.timePeriod;
                    vm.timePeriods.forEach(function (tp) {
                        if (tp.value == vm.query.timePeriod) tpName = tp.name;
                    });
                    vm.querySummary += String.format("{0}: {1} <br />", vm.wordFor("Time Period"), tpName);
                    vm.querySummaryBrief += String.format("{0}, ", tpName);
                }
                setTPString();
            }

            if (vm.query.proximity && vm.query.proximity.point && vm.query.proximity.point.trim() != "") {
                vm.querySummary += String.format("{0}: {1} {2} from {3} <br />", vm.wordFor("Proximity")
                    , vm.query.proximity.distance
                    , (vm.query.proximity.distanceKM == "true") ? "km" : "miles"
                    , vm.query.proximity.address);
                vm.querySummaryBrief += String.format("{0} {1} from {2}; "
                    , vm.query.proximity.distance
                    , (vm.query.proximity.distanceKM == "true") ? "km" : "miles"
                    , vm.query.proximity.address);
            }

            vm.query.personIds = [];
            var perString = "";
            if (vm.query.people) {
                for (var i = 0; i < vm.query.people.length; i++) {
                    var p = vm.query.people[i];
                    if (p.changeType != 2) {
                        vm.query.personIds.push(p.id);
                        perString += p.name + ", ";
                    }
                }
                if (perString != "") {
                    vm.querySummary += vm.wordFor("People") + ": "
                    if (perString.substring(perString.length - 2) == ", ") perString = perString.substring(0, perString.length - 2)
                    vm.querySummary += perString + "<br />";
                    vm.querySummaryBrief += perString + ", ";
                }

            }

            vm.query.ownerIds = [];
            var ownerString = "";
            if (vm.query.owners) {
                for (var i = 0; i < vm.query.owners.length; i++) {
                    var p = vm.query.owners[i];
                    if (p.changeType != 2) {
                        vm.query.ownerIds.push(p.id);
                        ownerString += p.name + ", ";
                    }
                }
                if (ownerString != "") {
                    vm.querySummary += "Owners: "
                    if (ownerString.substring(ownerString.length - 2) == ", ") ownerString = ownerString.substring(0, ownerString.length - 2)
                    vm.querySummary += ownerString + "<br />";
                    vm.querySummaryBrief += ownerString + ", ";
                }

            }

            //console.log(vm.query.groups);
            vm.query.groupIds = [];
            var grpString = "";
            if (vm.query.groups) {
                for (var i = 0; i < vm.query.groups.length; i++) {
                    var g = vm.query.groups[i];
                    //console.log(g);
                    if (g.changeType != 2) {
                        grpString += g.name + ", ";
                        vm.query.groupIds.push(g.id);
                    }
                }
                if (grpString != "") {
                    vm.querySummary += vm.wordFor("Groups") + ": "
                    if (grpString.substring(grpString.length - 2) == ", ") grpString = grpString.substring(0, grpString.length - 2)
                    vm.querySummary += grpString + "<br />";
                    vm.querySummaryBrief += grpString + ", ";
                }
            }

            vm.query.orgIds = [];
            var orgString = "";
            if (vm.query.organizations) {
                for (var i = 0; i < vm.query.organizations.length; i++) {
                    var g = vm.query.organizations[i];
                    //console.log(g);
                    if (g.changeType != 2) {
                        orgString += g.name + ", ";
                        vm.query.orgIds.push(g.id);
                    }
                }
            }
            if (orgString != "") {
                vm.querySummary += vm.wordFor("Organizations") + ": "
                if (orgString.substring(orgString.length - 2) == ", ") orgString = orgString.substring(0, orgString.length - 2)
                vm.querySummary += orgString + "<br />";
                vm.querySummaryBrief += orgString + ", ";
            }

            vm.query.teamIds = [];
            var teamString = "";
            if (vm.query.teams) {
                for (var i = 0; i < vm.query.teams.length; i++) {
                    var g = vm.query.teams[i];
                    //console.log(g);
                    if (g.changeType != 2) {
                        teamString += g.name + ", ";
                        vm.query.teamIds.push(g.id);
                    }
                }
            }
            if (teamString != "") {
                vm.querySummary += "Owning Team(s): ";
                if (teamString.substring(teamString.length - 2) == ", ") teamString = teamString.substring(0, teamString.length - 2);
                vm.querySummary += teamString + "<br />";
                vm.querySummaryBrief += teamString + ", ";
            }

            var tagCnt = 0;
            vm.query.tagIds = [];
            var tagString = "";
            if (vm.utTags) {
                for (var i = 0; i < vm.utTags.length; i++) {
                    var ut = vm.utTags[i];
                    for (var j = 0; j < ut.tags.length; j++) {
                        if (vm.utTags[i].tags[j].isSelected) {
                            vm.query.tagIds.push(vm.utTags[i].tags[j].id);
                            tagString += vm.utTags[i].tags[j].name + ", ";
                            tagCnt++;
                        }
                    }
                }
                if (tagString != "") {
                    vm.querySummary += "Tags: "
                    if (tagString.substring(tagString.length - 2) == ", ") tagString = tagString.substring(0, tagString.length - 2)
                    vm.querySummary += tagString + ((tagCnt > 1) ? " [OR]" : "") + " <br />";
                    vm.querySummaryBrief += tagString + ((tagCnt > 1) ? " [OR]" : "") + " "
                }

            }

            var tagAllCnt = 0;
            vm.query.tagIdsAll = [];
            var tagAllString = "";
            if (vm.utTagsAll) {
                for (var i = 0; i < vm.utTagsAll.length; i++) {
                    var ut = vm.utTagsAll[i];
                    for (var j = 0; j < ut.tags.length; j++) {
                        if (vm.utTagsAll[i].tags[j].isSelected) {
                            vm.query.tagIdsAll.push(vm.utTagsAll[i].tags[j].id);
                            tagAllString += vm.utTagsAll[i].tags[j].name + ", ";
                            tagAllCnt++;
                        }
                    }
                }
                if (tagAllString != "") {
                    vm.querySummary += "Tags: "
                    if (tagAllString.substring(tagAllString.length - 2) == ", ") tagAllString = tagAllString.substring(0, tagAllString.length - 2)
                    vm.querySummary += tagAllString + ((tagAllCnt > 1 || tagCnt > 0) ? " [AND]" : "") + " <br />";
                    vm.querySummaryBrief += tagAllString + ((tagAllCnt > 1 || tagCnt > 0) ? " [AND]" : "") + ", ";
                }

            }

            vm.query.usertypeIds = [];
            var typesString = "";
            if (vm.utTouches) {
                for (var i = 0; i < vm.utTouches.length; i++) {
                    var ut = vm.utTouches[i];
                    if (ut.isSelected) {
                        vm.query.usertypeIds.push(ut.id);
                        typesString += ut.name + ", ";
                    }
                }
                if (typesString != "") {
                    vm.querySummary += "Types: "
                    if (typesString.substring(typesString.length - 2) == ", ") typesString = typesString.substring(0, typesString.length - 2)
                    vm.querySummary += typesString + "<br />";
                    vm.querySummaryBrief += typesString + ",  ";
                }

            }


            vm.query.queryItems.forEach(function (qi) {
                vm.querySummary += qi.fieldname + " " + qi.operatorname;
                vm.querySummaryBrief += qi.fieldname + " " + qi.operatorname;
                if (qi.hasValue) {
                    vm.querySummary += " " + qi.value;
                    vm.querySummaryBrief += " " + qi.value;
                }
                vm.querySummary += "<br /> ";
                vm.querySummaryBrief += ", ";
            });

            if (vm.querySummaryBrief.indexOf(",") > -1) {
                vm.querySummaryBrief = vm.querySummaryBrief.substring(0, vm.querySummaryBrief.lastIndexOf(","));
            }

            vm.query.summary = vm.querySummary;  //pass-through to backend & editor

            //#endregion
            getIsDefaultQuery().then(function (data) {
                vm.isDefaultQuery = data;
                //console.log(vm.isDefaultQuery);

                deferred.resolve();

            });
            return deferred.promise;
        }

        vm.dirtyQuery = function () {
            console.log("DDD");
        }

        //#region QueryItems
        vm.addQueryItem = function () {
            var qi = new shuri_queryItem();
            if (vm.queryItem.field.id != appGlobals.guidEmpty) qi.field = vm.queryItem.field.id;
            else qi.field = vm.queryItem.field.name;
            qi.operator = vm.queryItem.operator.queryOperator;
            qi.value = vm.queryItem.value;
            qi.fieldname = vm.queryItem.field.name;
            qi.operatorname = vm.queryItem.operator.name;
            qi.hasValue = vm.queryItem.operator.hasValue;
            vm.query.queryItems.push(qi);
            vm.isQueryDirty = true;
            vm.resetQueryItem();
        }

        vm.resetQueryItem = function () {

            if (!vm.locationItem || !vm.locationItem.lat) vm.hasField = false;
            vm.queryItem.field = vm.fields[0];
            vm.queryItem.value = "";
            vm.disableLocationEdit = false;
        }

        vm.removeQueryItem = function (qitem) {
            for (var i = vm.query.queryItems.length - 1; i >= 0; i--) {
                var qi = vm.query.queryItems[i];
                if (qi.field == qitem.field && qi.operator == qitem.operator && qi.value == qitem.value) {
                    vm.isQueryDirty = true;
                    vm.query.queryItems.splice(i, 1);
                    break;
                }
            }
        }

        //vm.editQueryItem = function (qitem) {
        //    vm.queryItemBefore = qitem;
        //    vm.queryItem.value = qitem.value;
        //    vm.disableLocationEdit = true;

        //    //vm.operators.forEach(function(op){
        //    //    console.log(op);
        //    //});

        //    vm.fields.forEach(function (fld) {
        //        if (fld.name == qitem.fieldname) {
        //            vm.queryItem.field = fld;
        //        }
        //    });

        //    //remove qitem
        //    for (var i = vm.query.queryItems.length - 1; i >= 0; i--) {
        //        var qi = vm.query.queryItems[i];
        //        if (qi.fieldname == qitem.fieldname && qi.operator == qitem.operator && qi.value == qitem.value) {
        //            vm.query.queryItems.splice(i, 1);
        //            break;
        //        }
        //    }

        //    vm.hasField = true;
        //}

        vm.closeQueryItems = function (refresh) {
            vm.actionBarIndex = 1;
            $ionicScrollDelegate.scrollTop();
            if (refresh && vm.query) {
                vm.query.page = 0;
                vm.queryResults = [];
                vm.loadMore();
            }
        }
        //#endregion

        //#region Proximity
        vm.resolveLocation = function (resolveNow) {
            if (resolveNow) {
                var geocoder = new google.maps.Geocoder();
                if (!vm.query.proximity) vm.query.proximity = new shuri_proximityItem();
                if (geocoder) {
                    var posOptions = { timeout: 10000, enableHighAccuracy: false };
                    $cordovaGeolocation.getCurrentPosition(posOptions).then(function (pos) {
                        vm.query.proximity.point = String.format("{0} {1}", pos.coords.longitude, pos.coords.latitude);
                        vm.hasProximity = true;
                        vm.streetAddress = "Current Location";
                        vm.isQueryDirty = true;
                    })
                }
            }
        };

        vm.resetLocation = function () {
            if (!vm.queryItem || (!vm.queryItem.field || vm.queryItem.field == vm.fields[0])) vm.hasProximity = false;
            vm.needsResolved = false;
            vm.queryLocation = {};
            vm.query.proximity = new shuri_proximityItem();
            vm.disableEditField = false;
        };

        vm.resolveAddress = function (address) {
            var geocoder = new google.maps.Geocoder();
            if (!vm.query.proximity) vm.query.proximity = new shuri_proximityItem();
            if (geocoder) {
                if (address != "") {
                    geocoder.geocode({ 'address': address }, function (results, status) {
                        //console.log(results);
                        if (status == google.maps.GeocoderStatus.OK) {
                            vm.query.proximity.point = String.format("{0} {1}", results[0].geometry.location.lng(), results[0].geometry.location.lat());
                            vm.hasProximity = true;
                            vm.needsResolved = false;
                            vm.streetAddress = results[0].formatted_address;
                            vm.query.proximity.address = results[0].formatted_address;
                            vm.isQueryDirty = true;
                            $scope.$apply();
                        }
                    })
                }
            }
        };

        vm.editLocationItem = function (location) {
            vm.hasProximity = true;
            vm.locationItem.lat = location.lat;
            vm.locationItem.lng = location.lng;
            vm.locationItem.distanceType = location.distanceType;
            vm.locationItem.value = location.value;
            vm.queryLocation.distanceType = location.distanceType;
            vm.queryLocation.value = location.value;

            for (var i = vm.query.locationItems.length - 1; i >= 0; i--) {
                var li = vm.query.locationItems[i];
                if (li.distanceType == location.distanceType && li.value == location.value) {
                    vm.query.locationItems.splice(i, 1);
                    break;
                }
            }
        };

        vm.removeLocationItem = function (location) {
            for (var i = vm.query.locationItems.length - 1; i >= 0; i--) {
                var li = vm.query.locationItems[i];
                if (li.distanceType == location.distanceType && li.value == location.value) {
                    vm.query.locationItems.splice(i, 1);
                    break;
                }
            }
        };

        //#endregion


        //#endregion

        //#region Action bar
        vm.setActionBar = function (index) {
            //console.log(index);
            if (index === 2) globals.setHelpView('reports');
            else globals.setHelpView('query');


            vm.actionBarIndex = index;
            $ionicScrollDelegate.scrollTop();
        }

        vm.openShare = function (evt) {
            if (evt) evt.stopPropagation();
            var mayExport = vm.totalCount <= vm.max4Export;
            var mayReport = vm.totalCount <= vm.max4Report;
            var mayShare = vm.totalCount <= vm.max4Share;
            var mybuttons = [];
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                dataApi.getPrivateGroupsForEntity("all", appGlobals.guidEmpty).then(function (data) {
                    vm.privateGroups = data;

                    var title = "Action: " + $filter('number')(vm.totalCount) + " " + vm.entityWord;
                    switch (vm.actionBarIndex) {
                        case 1:
                            if (mayShare && vm.entityType != shuri_enums.entitytypes.touch) mybuttons.push({ text: '<div><i class="icon shuri-touch-add"></i>Create Touch</div>', itemname: 'touch' });
                            if (mayShare && vm.privateGroups && vm.privateGroups.length > 0) mybuttons.push({ text: '<i class="icon ion-plus-round"></i>Add To Existing Group</i>', itemname: 'addgroup' });
                            if (mayShare) mybuttons.push({ text: '<i class="icon ion-ios-browsers"></i>Create New Group</i>', itemname: 'newgroup' });
                            if (mayShare && vm.entityType != shuri_enums.entitytypes.touch) mybuttons.push({ text: '<i class="icon ion-star"></i>Add to Favorites</i>', itemname: 'favs' });
                            if (vm.totalCount > 1 && !vm.showCBs) mybuttons.push({ text: '<i class="icon ion-android-checkbox-outline"></i>Choose a Subset</i>', itemname: 'togglechoose' });
                            if (vm.showCBs) mybuttons.push({ text: '<i class="icon ion-android-checkbox-outline-blank"></i>Stop Choosing</i>', itemname: 'togglechoose' });
                            if (!vm.isDefaultQuery || vm.isQueryDirty) mybuttons.push({ text: '<div class=""><i class="icon ion-funnel "></i>Save Query</div>', itemname: 'savequery' });
                            if (!mayShare) title = "Sharing Disabled - too many results"
                            break;
                        case 2:
                            if (mayExport) mybuttons.push({ text: '<i class="icon ion-ios-download-outline "></i>Export to XLS', itemname: 'xls' });
                            if (mayExport) mybuttons.push({ text: '<i class="icon ion-ios-download-outline "></i>Export to CSV', itemname: 'csv' });
                            if (mayExport) mybuttons.push({ text: '<i class="icon ion-ios-download-outline "></i>Export to JSON', itemname: 'json' });
                            if (!mayExport) title = "Exports Disabled - too many results"
                            break;
                        case 3:
                            if (!vm.isDefaultQuery || vm.isQueryDirty) mybuttons.push({ text: '<div class=""><i class="icon ion-funnel "></i>Save Query</div>', itemname: 'savequery' });
                            title = "Query";
                            break;
                    }
                    if (!vm.isDefaultQuery && !vm.showCBs) mybuttons.push({ text: '<i class="icon ion-close-round"></i>Clear Query</i>', itemname: 'clearquery' });

                    //else if (window.corodva) mybuttons.push({ text: '<i class="icon ion-android-sync"></i>Sync to Calendar</i>', itemname: 'calendar' })

                    if (mybuttons.length == 0) title = "No actions available";

                    var hideSheet = $ionicActionSheet.show({
                        buttons: mybuttons,
                        titleText: title,
                        cancelText: vm.wordFor('Cancel'),
                        cancel: function () {
                            hideSheet();
                        },
                        buttonClicked: function (index) {
                            vm.share(this.buttons[index].itemname);
                            hideSheet();
                        }
                    });

                });
            });

        };

        vm.isInTrial = function (appUser) {
            //is in AR trial? - disable export
            var inTrial = false;
            if (appUser.subscriptions) {
                appUser.subscriptions.forEach(function (sub) {
                    if (sub.productId == "ShuriMonthlyAR") {
                        var dateEndTrial = moment(sub.startDt).add(7, 'days');
                        inTrial = dateEndTrial.isAfter(moment());
                        if (inTrial) {
                            //is the user viewing?
                            var viewing = false;
                            appUser.subscriptionIds.forEach(function (id) {
                                if (id.toLowerCase() === sub.id) {
                                    viewing = true;
                                }
                            });
                            inTrial = viewing;
                        }
                    }
                });
            }
            return inTrial;

        }

        vm.share = function (itemname) {
            // console.log(itemname);
            switch (itemname) {
                case "calendar":
                    if (ionic.Platform.isIOS()) {
                        $cordovaCalendar.listCalendars()
                        .then(function (result) {
                            console.log("success: ", result);
                            var mybuttons = [];
                            result.forEach(function (calendar) {
                                mybuttons.push({ text: '<i class="icon ion-android-calendar"></i>' + calendar.name + '</i>', itemname: calendar.name })
                            })
                            var hideSheet = $ionicActionSheet.show({
                                buttons: mybuttons,
                                titleText: vm.wordFor('Which Calendar?'),
                                cancelText: vm.wordFor('Cancel'),
                                cancel: function () {
                                    hideSheet();
                                },
                                buttonClicked: function (index) {
                                    // TODO: add calendar event function with below calendarName argument
                                    calendarSync(this.buttons[index].itemname);
                                    hideSheet();

                                }
                            });
                        }, function (err) {
                            console.log('listCalendars failed running defualt calendarSync');
                            console.log("error: ", err);
                            calendarSync();
                        })
                    }

                    break;
                case "togglechoose":
                    toggleChoose();
                    break;
                case "clearquery":
                    clearQuery().then(function () {
                        if (vm.actionBarIndex == 1) vm.loadMore();
                    });
                    break;
                case "savequery":
                    vm.saveQuery();
                    break;
                case "newgroup":
                    resultsToNewGroup();
                    break;
                case "addgroup":
                    resultsToExistingGroup()
                    break;
                case "favs":
                    var params = { id: appGlobals.guidEmpty, entityType: vm.entityType };
                    var entities = [];
                    var tmplt = "Add these " + $filter("number")(vm.totalCount) + " " + vm.entityWord + " to your Favorites?"
                    if (vm.totalCount > vm.max4Share) tmplt = "Add the first " + $filter("number")(vm.max4Share) + " " + vm.entityWord + " to your Favorites?"
                    if (vm.showCBs) tmplt = "Add the checked " + vm.entityWord + " to your Favorites?"

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Add To Favorites?',
                        template: tmplt,
                        scope: $scope
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            $ionicLoading.show({ template: 'Adding to Favorites...' });
                            var itemCnt = 0;
                            //add the items
                            //get all results??
                            batchGroupAssociate(false, appGlobals.guidFavorites, "Favorites");
                        }
                    });

                    break;

                case "touch":
                    var params = { id: appGlobals.guidEmpty, collectionId: vm.appUser.defaultCollection_Id, entityType: vm.entityType };
                    var entities = [];
                    var tmplt = "Create a new touch and associate these " + $filter("number")(vm.totalCount) + " " + vm.entityWord + "?"
                    if (vm.showCBs) tmplt = "Create a new touch and add the checked " + vm.entityWord + "?"

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Create New Touch',
                        template: tmplt,
                        scope: $scope
                    });
                    confirmPopup.then(function (res) {
                        if (res) {

                            var itemCnt = 0;
                            $ionicLoading.show({ template: 'Creating touch...' });
                            //add the items
                            //get all results??
                            if (vm.hasMore) {
                                //create a 2nd query to get them all
                                var allQ = vm.query;
                                allQ.page = 1;
                                allQ.pagesize = vm.max4Export;

                                dataApi.postQuery(allQ).then(function (data) {
                                    data.items.forEach(function (item) {
                                        if (!vm.showCBs || isItemSelected(item)) {
                                            entities.push(item);
                                            itemCnt++;
                                        };
                                    });
                                    $ionicLoading.hide();
                                    globals.entitiesSet(entities);
                                    //console.log(globals.entitiesGet().length);

                                    $state.go('home.touchEdit', params);
                                });
                            }
                            else {
                                $ionicLoading.hide();
                                vm.queryResults.forEach(function (item) {
                                    if (!vm.showCBs || item.selected) {
                                        entities.push(item);
                                    }
                                });
                                globals.entitiesSet(entities);
                                $state.go('home.touchEdit', params);
                                //console.log(globals.entitiesGet().length);
                            }
                        }
                    });

                    break;

            }
        }

        //#region Add to Group
        vm.groupNameChange = function () {
            if (vm.groupName && vm.groupName.length > 2) {
                dataApi.groupnameOK(vm.groupName, vm.appUser.defaultCollection_Id).then(function (data) {
                    vm.groupnameOK = data;
                    vm.showGroupNameOK = true;
                    //console.log(data);
                });
            }
        }

        function resultsToNewGroup() {
            vm.groupName = "";
            var confirmPopup = $ionicPopup.confirm({
                title: 'Create New Group',
                templateUrl: "templates/query/queryAddNewGroup.html",
                scope: $scope
            });
            confirmPopup.then(function (res) {
                if (res) {
                    if (!vm.groupName || vm.groupName.trim() == "") globals.showAlert("Error", "You did not enter a name");
                    else {
                        dataApi.groupnameOK(vm.groupName, appGlobals.guidEmpty).then(function (data) {
                            if (data) {
                                //create the group
                                $ionicLoading.show({ template: 'Creating group...' });
                                var grp = new shuri_group();
                                grp.name = vm.groupName;
                                grp.grpType = shuri_enums.grouptype.private;
                                dataApi.postEntity("groups", "group", grp).then(function (data) {
                                    grp.id = data;
                                    batchGroupAssociate(true, grp.id, grp.name);

                                });
                            }
                            else globals.showAlert("Error", "That group name is already in use.");
                        });
                    }
                }
            });

        }

        function resultsToExistingGroup() {
            dataApi.getPrivateGroupsForEntity("all", appGlobals.guidEmpty).then(function (data) {
                vm.privateGroups = data;
                if (vm.privateGroups.length == 0) {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Add to Existing Group',
                        template: "You have no existing and updatable groups.",
                        scope: $scope
                    });
                    alertPopup().then();
                }
                else {
                    vm.selectedPrivateGroup = vm.privateGroups[0];

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Add to Existing Group',
                        templateUrl: "existingGroupQuery.html",
                        scope: $scope
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            $ionicLoading.show({ template: 'Adding to group...' });
                            batchGroupAssociate(false, vm.selectedPrivateGroup.id, vm.selectedPrivateGroup.name);
                        }
                    });
                }


            });

        }

        function batchGroupAssociate(isNew, groupId, groupName) {
            var itemCnt = 0;
            var entityIdsBatch = [];
            if (vm.hasMore && !vm.showCBs) {
                //create a 2nd query to get them all
                var allQ = vm.query;
                allQ.page = 1;
                allQ.pagesize = vm.max4Share;

                dataApi.postQuery(allQ).then(function (data) {
                    data.items.forEach(function (item) {
                        entityIdsBatch.push(item.id);
                    });
                    finishGroupUpdate(isNew, groupId, groupName, entityIdsBatch)
                });
            }
            else {
               // console.log(vm.queryResults, 'query results / choose');
                vm.queryResults.forEach(function (item) {
                    if (!vm.showCBs || item.selected) entityIdsBatch.push(item.id);

                });
               // console.log(entityIdsBatch);
                finishGroupUpdate(isNew, groupId, groupName, entityIdsBatch)
            }

        }

        function finishGroupUpdate(isNew, entityId, groupName, entityIdsBatch) {
            var msg = "";
            if (isNew) msg += groupName + " has been created. ";
            dataApi.postRelationBatch(shuri_enums.entitytypes.group, entityId, vm.entityType, entityIdsBatch).then(function (data) {
                msg += data.toString() + ' ' + vm.entityWord + ' have been added to ' + groupName + ".";
                $ionicLoading.hide();
                $ionicLoading.show({ template: msg, duration: vm.durationLong });
                if (vm.showCBs) toggleChoose();
                //console.log("BROAD");
                $rootScope.$broadcast("RefreshMain", true);
                vm.groupName = "";

            }, function (err) {

                $ionicLoading.hide();
                if (vm.showCBs) toggleChoose();
                $rootScope.$broadcast("RefreshMain", true);
            });

        }
        //#endregion
        //#endregion

        //#region Calendar
        function calendarSync(calName) {
            var entities = [];
            vm.queryResults.forEach(function (item) {
                if (!vm.showCBs || item.selected) {
                    entities.push(item);
                }
            });

            var tmplt = "Add these " + $filter("number")(vm.totalCount) + " " + vm.entityWord + " to your devices Calendar?"
            if (vm.showCBs) tmplt = "Add the checked " + vm.entityWord + " to your devices Calendar?"

            var confirmPopup = $ionicPopup.confirm({
                title: 'Add To Calendar?',
                template: tmplt,
                scope: $scope
            });
            confirmPopup.then(function (res) {
                if (res) {
                    console.log(entities);
                    entities.forEach(function (touch) {
                        // defaulting endDate to one hour from startDate
                        if (!touch.dateEnd) {
                            touch.dateEnd = moment(touch.dateStart).add(1, 'hours').format("YYYY-MM-DDTHH:mm:ss");
                        }
                        // all day event change
                        if (touch.dateEnd === touch.dateStart) {
                            touch.dateStart = moment(touch.dateStart).startOf('day').format("YYYY-MM-DDTHH:mm:ss");
                            touch.dateEnd = moment(touch.dateEnd).add(24, 'hours').startOf('day').format("YYYY-MM-DDTHH:mm:ss");
                        }

                        var eventObj = {
                            title: touch.name,
                            notes: touch.description,
                            startDate: touch.dateStart,
                            endDate: touch.dateEnd
                        }
                        if (calName) {
                            // // TODO: before create events, do this search in the calendar that the user chooses to see if event exists
                            // $cordovaCalendar.findEvent(eventObj)
                            // .then(function (result) {
                            //   console.log("result: ", result);
                            // }, function (err) {
                            //   console.log("error: ", err);
                            // })
                            eventObj.calendarName = calName;
                            $cordovaCalendar.createEventInNamedCalendar(eventObj)
                            .then(function (result) {
                                console.log('success: ', result);
                                vm.queryResults.forEach(function (item) {
                                    if (item.selected) {
                                        item.selected = false;
                                    }
                                });
                                vm.showCBs = false;
                                //TODO end
                            }, function (err) {
                                console.log('error: ', err);
                                globals.showAlert("Error", err)
                            })
                        }
                        else {
                            $cordovaCalendar.createEvent(eventObj)
                            .then(function (result) {
                                console.log('success: ', result);
                                vm.queryResults.forEach(function (item) {
                                    if (item.selected) {
                                        item.selected = false;
                                    }
                                });
                                vm.showCBs = false;
                            }, function (err) {
                                console.log('error: ', err);
                            });
                        }


                    })
                }
            });
        }

        var createCalEvents = function (eventsToCreate, calName) {
            var deferred = $q.defer();
            var createSingleEvent = function (touch, i) {
                function onSuccess(argument) {
                    createSingleEvent(touch, i + 1);
                }
                function onError(argument) {
                    deferred.reject({ message: argument });
                }
                if (i < touch.length) {
                    // defaulting endDate to one hour from startDate
                    if (!touch[i].dateEnd) {
                        touch[i].dateEnd = moment(touch[i].dateStart).add(1, 'hours').format("YYYY-MM-DDTHH:mm:ss");
                    }
                    // all day event change
                    if (touch[i].dateEnd === touch[i].dateStart) {
                        touch[i].dateStart = moment(touch[i].dateStart).startOf('day').format("YYYY-MM-DDTHH:mm:ss");
                        touch[i].dateEnd = moment(touch[i].dateEnd).add(24, 'hours').startOf('day').format("YYYY-MM-DDTHH:mm:ss");
                    }
                    var eventObj = {
                        title: touch[i].name,
                        notes: touch[i].description,
                        startDate: touch[i].dateStart,
                        endDate: touch[i].dateEnd
                    }
                    if (calName) eventObj.calendarName = calName;
                    $cordovaCalendar.createEventWithOptions(eventObj)
                    .then(onSuccess, onError)
                } else {
                    deferred.resolve(touch.length);
                }
            };
            createSingleEvent(eventsToCreate, 0);
            return deferred.promise;
        };

        //#endregion

        //#region Event handlers
        vm.pullToRefresh = function () {
            //console.log("PTR");
            if (vm.actionBarIndex == 1) {
                dataApi.clearCache();
                clearQuery().then(function () { hardRefresh(); });
            }
            else {
                $scope.$broadcast('scroll.refreshComplete');

            }
        }

        vm.runReport = function (rptname) {
            refreshQuery("runReport").then(function () {
                appGlobals.currentQR = vm.query;

                console.log(appGlobals.currentQR);
                $state.go('report.' + rptname);
            });
        }

        vm.goto = function (item) {
            if (item == "touches") {
                $state.go('home.query', { entityType: shuri_enums.entitytypes.touch });
            }

            if (!vm.showCBs) {
                switch (parseInt(vm.entityType)) {
                    case shuri_enums.entitytypes.organization:
                        $state.go('home.org', { groupId: item.id });
                        break;
                    case shuri_enums.entitytypes.person:
                        $state.go('home.person', { personId: item.id });
                        break;
                    case shuri_enums.entitytypes.touch:
                        $state.go('home.touch', { id: item.id });
                        break;
                    default:
                        globals.showAlert("Error", "Unsupported or missing entityType.");
                        break;
                }
            }
            else toggleChooseItem(item);
        }


        vm.toggleTypesSelected = function (event) {
            if (event) event.stopPropagation();
        }

        vm.toggler = function (event, mode) {
            if (event) event.stopPropagation();
            var key = "";
            switch (mode.toLowerCase()) {
                case "queries":
                    vm.hideQueries = !vm.hideQueries;
                    key = "hideQueries" + vm.entityType;
                    if (vm.hideQueries) localStorage.setItem(key, "true");
                    else if (localStorage.getItem(key)) localStorage.removeItem(key);
                    break;
                case "filters":
                    vm.hideFilters = !vm.hideFilters;
                    key = "hideFilters" + vm.entityType;
                    if (vm.hideFilters) localStorage.setItem(key, "true");
                    else if (localStorage.getItem(key)) localStorage.removeItem(key);
                    break;
                case "templates":
                    vm.hideTemplates = !vm.hideTemplates;
                    key = "hideTemplates" + vm.entityType;
                    if (vm.hideTemplates) localStorage.setItem(key, "true");
                    else if (localStorage.getItem(key)) localStorage.removeItem(key);
                    break;
                case "publictemplates":
                    vm.hidePublicTemplates = !vm.hidePublicTemplates;
                    key = "hidePublicTemplates" + vm.entityType;
                    if (vm.hidePublicTemplates) localStorage.setItem(key, "true");
                    else if (localStorage.getItem(key)) localStorage.removeItem(key);
                    break;
                case "reports":
                    vm.hideReports = !vm.hideReports;
                    key = "hideReports" + vm.entityType;
                    if (vm.hideReports) localStorage.setItem(key, "true");
                    else if (localStorage.getItem(key)) localStorage.removeItem(key);
                    break;
                case "tagsexpand":
                    vm.tagsExpanded = !vm.tagsExpanded;
                    vm.utTags.forEach(function (ut) { ut.open = vm.tagsExpanded; });
                    break;
                case "tagsallexpand":
                    vm.tagsAllExpanded = !vm.tagsAllExpanded;
                    vm.utTagsAll.forEach(function (ut) { ut.open = vm.tagsAllExpanded; });
                    break;
                case "typesselected":
                    vm.allTypeSelected = !vm.allTypeSelected;
                    vm.utTouches.forEach(function (ut) { ut.isSelected = vm.allTypeSelected; });
                    vm.touchesSelectedCnt = (vm.allTypeSelected) ? vm.utTouches.length : 0;
                    refreshQuery();
                    vm.isQueryDirty = true;
                    break;
            }
        }


        vm.justMineChanged = function () {
            //console.log(vm.justMine);
            if (vm.justMine) {
                vm.query.people = [];
                vm.query.people.push(vm.appUser);
            }
            else vm.query.people = [];
        }

        vm.selectQueryUrl = function (doc) {
            //console.log();
            document.getElementById("qUrl" + doc.id).select();
        }

        vm.toggleQueryUrl = function (doc) {
            //console.log();
            doc.showUrl = !doc.showUrl
            $ionicListDelegate.closeOptionButtons();

        }

        function toggleChooseItem(queryResult) {
            queryResult.selected = !queryResult.selected;
            var selectedCnt = 0;
            vm.queryResults.forEach(function (qr) {
                if (qr.selected) selectedCnt++;
            });
            vm.totalCount = selectedCnt;
            vm.querySummary = "[choosing]"
            //console.log(selectedCnt);
        }

        vm.tagChange = function (tag, isALL) {
            tag.isSelected = !tag.isSelected;
            vm.isQueryDirty = true;

            //tally
            var totCnt = 0;
            if (isALL) {
                vm.utTagsAll.forEach(function (ut) {
                    var utCnt = 0;
                    ut.tags.forEach(function (tag) {
                        if (tag.isSelected) {
                            totCnt++;
                            utCnt++;
                        }
                        ut.tagsSelectedCnt = utCnt;
                    });
                });
                vm.tagsAllSelectedCnt = totCnt;
            }
            else {
                vm.utTags.forEach(function (ut) {
                    var utCnt = 0;
                    ut.tags.forEach(function (tag) {
                        if (tag.isSelected) {
                            totCnt++;
                            utCnt++;
                        }
                        ut.tagsSelectedCnt = utCnt;
                    });
                });
                vm.tagsSelectedCnt = totCnt;
            }


            refreshQuery("tagchg");

        }

        //#region Time Period
        vm.timeperiodChange = function () {
            vm.isQueryDirty = true;

            if (!(vm.query.timePeriod == "custom")) {
                refreshQuery("timeper chg");
            }
            else if (vm.jsDateStart == undefined || !vm.jsDateStart || !vm.jsDateEnd) {
                console.log(vm.times);
                if (vm.times) {
                    vm.jsDateStart = new Date(vm.times.dateStart);
                    vm.jsDateEnd = new Date(vm.times.dateEnd);
                }
                else {
                    vm.jsDateStart = moment().subtract(1, "months").toDate();
                    vm.jsDateEnd = new Date();

                }
            }
            setTPString();

        }

        vm.customTPChanged = function (fixdate) {
            if (vm.jsDateEnd < vm.jsDateStart && fixdate) {
                var diff = 30;
                if (vm.dateDiffDays) diff = vm.dateDiffDays;
                vm.jsDateEnd = moment(vm.jsDateStart).add(diff, "days").toDate();

            }
            vm.isQueryDirty = true;
            refreshQuery();
        }

        vm.dateStartFocus = function () {
            var dtStart = moment(vm.jsDateStart);
            var dtEnd = moment(vm.jsDateEnd);
            var duration = moment.duration(dtEnd.diff(dtStart));
            vm.dateDiffDays = duration.asDays();
        }

        function setTPString() {
            if (vm.query.timePeriod == "custom") vm.timePeriodString = "Custom";
            else if (vm.query.timePeriod == "alltime") vm.timePeriodString = "[None]";
            else {
                vm.times = globals.timesFromTimePeriod(vm.query.timePeriod);
                var start = moment(vm.times.dateStart).format("ll");
                var end = moment(vm.times.dateEnd).format("ll");
                //console.log(start, end, vm.times.dateEnd.format("lll"));
                vm.timePeriodString = start + " - " + end;
            }
            vm.isCustomTP = (vm.query.timePeriod == "custom");
        }
        //#endregion

        vm.typeChange = function (ut) {
            ut.isSelected = !ut.isSelected;
            vm.isQueryDirty = true;

            //tally
            var totCnt = 0;
            vm.utTouches.forEach(function (ut) {
                if (ut.isSelected) totCnt++;
            });
            vm.touchesSelectedCnt = totCnt;
            refreshQuery("type chg");

        }

        vm.fieldChange = function () {
            if (vm.queryItem && vm.queryItem.field) {
                var fld = vm.queryItem.field;
                vm.hasField = (vm.queryItem.field.sorter != 0);
                //default and all cps
                vm.operators = $filter('filter')(vm.allops, function (op) { return (op.appliesTo.indexOf(shuri_enums.querydatatype.text.toString()) > -1); });
                if (fld.entityType == shuri_enums.entitytypes.document) {
                    switch (fld.primitive) {
                        case shuri_enums.documentprimitive.custominteger:
                        case shuri_enums.documentprimitive.customfloat:
                        case shuri_enums.documentprimitive.currency:
                        case shuri_enums.documentprimitive.rating0to5:
                        case shuri_enums.documentprimitive.rating0to100:
                        case shuri_enums.documentprimitive.ratingyesnomaybe:
                            vm.operators = $filter('filter')(vm.allops, function (op) { return (op.appliesTo.indexOf(shuri_enums.querydatatype.numeric.toString()) > -1); });
                            break;
                        case shuri_enums.documentprimitive.customdate:
                            vm.operators = $filter('filter')(vm.allops, function (op) { return (op.appliesTo.indexOf(shuri_enums.querydatatype.date.toString()) > -1); });
                            break;
                        case shuri_enums.documentprimitive.custombinary:
                        case shuri_enums.documentprimitive.ratingyesno:
                            vm.operators = $filter('filter')(vm.allops, function (op) { return (op.appliesTo.indexOf(shuri_enums.querydatatype.binary.toString()) > -1); });
                            break;
                    }
                }
                vm.queryItem.operator = vm.operators[0];
                refreshQuery("fld chg");
            }
        }

        vm.hidePopup = function () {
            //                $timeout.cancel(vm.popoverTimer);
            vm.popover.hide();
            vm.popover.remove();
        }

        //#endregion

        //#region Misc private
        function isItemSelected(item) {
            var is = false;
            for (var i = 0; i < vm.queryResults.length; i++) {
                if (vm.queryResults[i].id == item.id) {
                    is = vm.queryResults[i].selected;
                    break;
                }
            }
            return is;
        }
        function toggleChoose() {
            vm.showCBs = !vm.showCBs;
            if (!vm.showCBs) {
                vm.queryResults.forEach(function (qr) { qr.selected = false; });
                vm.totalCount = vm.totalCountStash;
                refreshQuery("togg choose");
            }
            vm.cbIcon = (vm.showCBs) ? "ion-android-checkbox-outline-blank " : "ion-android-checkbox-outline ";
            vm.cbLabel = (vm.showCBs) ? "Stop choosing " : "Choose ";

        };

        function getNewEntity(results, entityId) {
            switch (vm.entityType) {
                case shuri_enums.entitytypes.organization:
                    dataApi.getOrg(entityId, appGlobals.guidEmpty, 0).then(function (data) {
                        updateResults(results, data);
                    });
                    break;
                case shuri_enums.entitytypes.person:
                    dataApi.getPerson(entityId, 0).then(function (data) {
                        //console.log(data);
                        updateResults(results, data);
                    });
                    break;
                case shuri_enums.entitytypes.touch:
                    dataApi.getTouch(entityId, appGlobals.guidEmpty, false).then(function (data) {
                        updateResults(results, data);
                    });
                    break;
            }

        }

        function updateResults(results, newEntity) {
            if (results) {

                results.forEach(function (entity) {
                    if (entity.id == newEntity.id) {
                        entity.name = newEntity.name;
                        if (newEntity.dateStart) entity.dateStart = newEntity.dateStart;
                        if (newEntity.firstname) entity.typename = newEntity.firstname;
                        if (newEntity.middlename) entity.typename = newEntity.middlename;
                        if (newEntity.lastname) entity.typename = newEntity.lastname;
                        if (newEntity.typename) entity.typename = newEntity.typename;
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

        //#endregion

        //#region Events &  listeners
        $scope.$on('$ionicView.enter', function () {
            //console.log(vm);
            if (!vm.query || appGlobals.forceQueryRefresh) {
                //console.log(hardRefresh);
                initialize();
            }

        });

        //$scope.$on('$ionicView.unloaded', function () {
        //    //if (appGlobals.forceQueryRefresh) {
        //    appGlobals.queryVM = vm;
        //    console.log("unloaded", vm);
        //    //    hardRefresh();
        //    //}

        //});

        $rootScope.$on("EntityCountDecremented", function (event, parentId, entityType, entityIdOrName) {

            if (vm.queryResults) {
                entityIdOrName = entityIdOrName.toLowerCase();
                vm.queryResults.forEach(function (entity) {
                    if (entity.id.toLowerCase() == entityIdOrName) {
                        //console.log(vm.totalCount);
                        vm.totalCount--;
                        vm.totalCountStash = vm.totalCount;  //keep around if some uses choose then cancels

                    }
                })
            }

        });

        $rootScope.$on("EntityDeleted", function (event, id) {

            if (vm.queryResults) {
                id = id.toLowerCase();
                for (var i = vm.queryResults.length -1; i >= 0; i--){
                    if (vm.queryResults[i].id.toLowerCase() == id) {
                        //console.log(vm.totalCount);
                        vm.queryResults.splice( i, 1 );
                        break;

                    }
                }
            }

        });

        $rootScope.$on("EntityChanged", function (event, id) {
            if (id) {
                id = id.toLowerCase();
                var entId = "";
                if (vm.queryResults || vm.searchResults) {

                    if (vm.queryResults) {
                        vm.queryResults.forEach(function (entity) {
                            if (entity.id == id) entId = id;
                        });
                        if (entId != "") getNewEntity(vm.queryResults, entId);
                    }
                    if (vm.searchResults) {
                        vm.searchResults.forEach(function (entity) {
                            if (entity.id == id) entId = id;
                        });
                        if (entId != "") getNewEntity(vm.searchResults, entId);
                    }
                };

                if (vm.reports && (entId == "")) {
                    var foundOne = false;
                    for (var i = 0; i < vm.reports.length; i++) {
                        if (vm.reports[i].id.toLowerCase() == id) {
                            foundOne = true;
                            break;
                        }
                    }
                    if (foundOne) {
                        refreshReports().then(function (data) {
                            //console.log("Done");
                        });
                    }
                }
            }
        });

        $rootScope.$on("QueryItemChanged", function (event, data, type, reload) {
            //console.log("QueryItemChanged", event, data, type, reload);
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                dataApi.getMyReports().then(function (data) {
                    vm.dataReports = data;
                    if (type == "template" || type == "report") refreshReports();
                    else if (type == "query") {
                        //console.log(vm.appUser.documents);
                        refreshSavedQueries().then(function () {
                            if (reload) {
                                //user might have changed default query pref
                                clearQuery().then(function () {
                                    setDefaultQuery("QueryItemChanged").then(function () {
                                        vm.query.page = 0;
                                        vm.queryResults = [];
                                        vm.loadMore();
                                    });
                                });
                            }
                        });
                    }
                });
            });
            //$ionicScrollDelegate.scrollTop();
        });

        $rootScope.$on("MakeDirty", function (event, idOrName, entType) {
            if (idOrName && idOrName.toLowerCase() == "query" && entType && entType == vm.entityType) {
                //console.log(vm.query.groups, idOrName, entType);
                vm.isQueryDirty = true;
                //refreshQuery("make dirty");
            }
        })

        //#endregion


        function initialize() {
            dataApi.initialize("").then(function (d) {
                vm.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
                //mobile devices get pdf reports by default
                if (window.cordova) vm.defaultPdf = true;
                else vm.defaultPdf = false;

                //#region Init on load
                vm.fields = [];
                switch (parseInt(vm.entityType)) {
                    case shuri_enums.entitytypes.organization:
                        vm.entityWord = vm.wordFor("Organizations");
                        vm.uploadID = "id" + vm.wordFor("Organizations");
                        vm.backgroundColor = "bgCalm";
                        vm.backgroundColorLight = "bgCalmLight";
                        vm.foregroundColorbright = "calm";
                        vm.foregroundColor = "calm";
                        vm.fieldnames = ["Name", "Nickname", "ImageUrl", "Summary"];
                        vm.glossaryUrl = 'https://shuristoragecdn.blob.core.windows.net/public/glossaryOrganizations.doc';
                        vm.max4Report = 500;
                        vm.max4Export = 150;
                        vm.max4Share = 150;
                        vm.max4Prequery = 150;
                        break;
                    case shuri_enums.entitytypes.person:
                        vm.entityWord = vm.wordFor("People");
                        vm.uploadID = "id" + vm.wordFor("People");
                        vm.backgroundColor = "bgEnergized";
                        vm.backgroundColorLight = "bgEnergizedLight";
                        vm.foregroundColor = "energized";
                        vm.foregroundColorbright = "energized";
                        vm.fieldnames = ["Lastname", "Firstname", "Middlename", "Nickname", "Prefix", "Suffix", "ImageUrl", "Summary"];
                        vm.glossaryUrl = 'https://shuristoragecdn.blob.core.windows.net/public/glossaryPeople.doc';
                        vm.stdreportname = "Excel package: People, People By Organization, People by Tag"
                        vm.max4Report = vm.max4Export = 1000;
                        vm.max4Share = 250;
                        vm.max4Prequery = 1000;
                        break;
                    case shuri_enums.entitytypes.touch:
                        vm.entityWord = vm.wordFor("Touches");
                        vm.uploadID = "id" + vm.wordFor("Touches");
                        vm.backgroundColor = "bgBalanced";
                        vm.foregroundColor = "balanced";
                        vm.foregroundColorbright = "balancedBright";
                        vm.backgroundColorLight = "bgBalancedLight";
                        vm.fieldnames = ["Name", "Description", "DateStart"];
                        vm.glossaryUrl = 'https://shuristoragecdn.blob.core.windows.net/public/glossaryTouches.doc';
                        vm.defaultQuery = new shuri_query();
                        vm.defaultQuery.entityType = shuri_enums.entitytypes.touch;
                        vm.defaultQuery.dateEndUTC = moment().utc().add(1, 'week').format('YYYY-MM-DD HH:mm:ss');
                        vm.defaultQuery.dateStartUTC = moment().utc().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss');
                        vm.defaultQuery.timePeriod = "alltime";
                        vm.needsMore = true;
                        vm.showSearch = false;
                        vm.isTouch = true;
                        vm.max4Report = vm.max4Export = 50000;
                        vm.max4Share = 250;
                        vm.max4Prequery = 1000;
                        break;
                    default:
                        globals.showAlert("Error", "Unsupported or missing entityType.");
                        break;
                }

                vm.guidEmpty = appGlobals.guidEmpty;
                vm.guidSystem = appGlobals.guidSystem;
                vm.onDesktop = !(window.cordova);
                vm.cbIcon = "ion-android-checkbox-outline ";
                vm.cbLabel = "Choose ";
                vm.includeOrgs = (vm.entityType != 9);
                globals.sendAppView('query' + vm.entityWord, vm.entityType, appGlobals.guidEmpty);

                //console.log($scope);

                globals.setHelpView('query');

                //finally, get the init data
                var needRefresh = true;
                //switch (vm.entityType) {
                //    case shuri_enums.entitytypes.organization:
                //        if (vm.orgRefresh) needRefresh = false;
                //        else vm.orgRefresh = true;
                //        break;
                //    case shuri_enums.entitytypes.person:
                //        if (vm.personRefresh) needRefresh = false;
                //        else vm.personRefresh = true;
                //        break;
                //    case shuri_enums.entitytypes.touch:
                //        if (vm.touchRefresh) needRefresh = false;
                //        else vm.touchRefresh = true;
                //        break;
                //}
                if (needRefresh) {
                    $ionicLoading.show({ template: 'Querying ' + vm.entityWord + '...' });

                    //console.log("needed refresh");
                    hardRefresh();
                }

                //#endregion

            });



        }
    };

})();

(function () {
    'use strict';
    angular.module("shuriApp").controller('QueryReportUploadCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$filter', '$q', '$window', '$ionicLoading', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', QueryReportUploadCtrl]);


    function QueryReportUploadCtrl($rootScope, $scope, $state, $stateParams, $filter, $q, $window, $ionicLoading, $ionicHistory, globals, dataApi, appGlobals) {
        var vm = this;
        vm.title = "Report Template";
        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.refreshData = function (docId) {
            vm.showList = false;
            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataDoc: dataApi.getDocument(docId)
            }).then(function (d) {
                vm.appUser = d.dataAppUser;
                vm.rpt = d.dataDoc;
                vm.rpt.rptDef = angular.fromJson(vm.rpt.value);

                vm.rpt.icon = FileIcon(vm.rpt.rptDef.url);
                if (vm.appUser.isSysAdmin) vm.rpt.updatable = true;

                if (appGlobals.queryStashed) vm.query = angular.fromJson(appGlobals.queryStashed);

                //test - remove
                //vm.rpt.rptDef.isWord = false;
                if ($stateParams.showUpload) vm.showUpload = true;
                vm.showList = true;
                globals.setHelpView('templateEdit');

            });
        };

        vm.changeTemplateType = function (newType) {
            vm.rpt.rptDef.templateType = newType;
            if (newType == "page" && vm.rpt.rptDef.pagesize == 0) vm.rpt.rptDef.pagesize = 1;
            else if (newType == "table") vm.rpt.rptDef.pagesize = 0;
        };

        vm.togglePublic = function () {
            if (vm.rpt) {
                var makePublic = !(vm.rpt.ownedBy_Id == appGlobals.guidEmpty);
                vm.rpt.ownedBy_Id = makePublic ? appGlobals.guidEmpty : vm.appUser.id;
                vm.rpt.rptDef.ownedBy_Id = vm.rpt.ownedBy_Id;
                vm.saveTemplate();
            }
        };

        vm.saveTemplate = function () {
            var rd = angular.toJson(vm.rpt.rptDef);
            vm.rpt.value = rd;
            vm.rpt.name = vm.rpt.rptDef.name;

            dataApi.postEntity("documents", "document", vm.rpt, appGlobals.guidEmpty).then(function (data) {
                dataApi.clearCacheItem("document" + data);
                $rootScope.$broadcast("EntityChanged", data);
                //console.log("document" + data);
                vm.cancel();
            }, function (err) { console.error(err); });

        };

        vm.cancel = function () {
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $ionicHistory.goBack();
        };

        vm.deletePerson = function (person) {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Permanent Delete',
                template: "Permanently delete " + person.name + "? <br /><br /> There is NO un-do for this action."
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(person.id, shuri_enums.entitytypes.person, person).then(function (data) {
                        $state.go("home.main");
                    });
                }
            });
        }

        dataApi.initialize("").then(function (d) {
            if (!$stateParams.docId) globals.showAlert("Error", "Missing docId - contact your developer.");
            else if ($stateParams.docId == appGlobals.guidEmpty && !$stateParams.collectionId) globals.showAlert("Error", "Need collectionId if new  - contact your developer.");

            vm.collId = vm.guidEmpty = appGlobals.guidEmpty;
            if ($stateParams.collectionId) vm.collId = $stateParams.collectionId;

            vm.refreshData($stateParams.docId);
            globals.sendAppView('templateEdit', 1, $stateParams.docId);
        });

        vm.customChanged = function () {
            if (vm.isCustom) {

            }
        };

        //vm.upload = function (event) {
        //        if (event) event.stopPropagation();
        //        //console.log(vm.rpt);
        //        //return;
        //        //set the mime types
        //        if (vm.rpt.rptDef.isWord) vm.accept = "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        //        else vm.accept = "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel.sheet.macroEnabled.12";
        //        document.getElementById("reportUploader").click();
        //}

        //vm.runReport = function (event) {
        //    if (event) event.stopPropagation();
        //    $ionicLoading.show({ template: "Running report", duration: 120000 });
        //    dataApi.queryReport(vm.query, vm.rpt.id, false).then(function (data) {
        //        $ionicLoading.hide();
        //        console.log(data);
        //        if (!data || data.trim() == "" || data.toLowerCase().indexOf("https://") == -1) {
        //            var msg = "Unable to create that report.";
        //            globals.showAlert("Something went wrong", msg);
        //        }
        //        else {
        //            //dispense report
        //            var url = data;
        //           if (window.cordova) {
        //               //console.log(doc);
        //               dataApi.downloadFileToDevice(url, vm.rpt.rptDef.name);
        //           }
        //           else {
        //               var target = "_self";
        //               var win = window.open(url, target);
        //           }

        //        }
        //    }, function (err) {
        //        $ionicLoading.hide();

        //    });

        //}


        //vm.saveFiles = function (files) {
        //    $window.event.stopPropagation();
        //    if (files.length > 0) {
        //        var theFile = files[0];
        //        //var name = theFile.name.replaceAll('.docx', '').replaceAll('.doc', '').replaceAll('.xlsx', '').replaceAll('.xls', '');
        //        var rptDef = {
        //            pagesize: 1, templateType: "page", name: theFile.name, url: "", description: "",
        //            collection_Id: vm.appUser.defaultCollection_Id, id: appGlobals.guidEmpty, ownedByGroup_Id: appGlobals.guidEmpty,
        //            entityType: vm.entityType, updatable: true
        //        };

        //        rptDef.isWord = (theFile.name.toLowerCase().indexOf(".doc") > 0 || theFile.name.toLowerCase().indexOf(".docx") > 0);

        //        vm.newFileLoading = true;
        //        dataApi.replaceReport(files, rptDef, vm.rpt.id).then(function (data) {
        //            vm.refreshData(data);


        //        });

        //    }
        //    else {
        //        console.log('nothing was picked');
        //    }
        //}

    };
})();

(function () {

    angular.module("shuriApp").controller('SavedQueryEditCtrl', ['$rootScope', '$scope', '$state', '$stateParams', '$filter', '$q', '$ionicLoading', '$ionicHistory', 'globals', 'dataApi', 'appGlobals', SavedQueryEditCtrl]);

    function SavedQueryEditCtrl($rootScope, $scope, $state, $stateParams, $filter, $q, $ionicLoading, $ionicHistory, globals, dataApi, appGlobals) {

        var vm = this;
        vm.guidEmpty = appGlobals.guidEmpty;
        vm.title = "Saved Query";
        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.saveQuery = function () {
            //console.log(vm.savedQuery);
            dataApi.postEntity("documents", "document", vm.savedQuery, appGlobals.guidEmpty).then(function (data) {
                dataApi.refreshAppUser().then(function () {
                    $rootScope.$broadcast("QueryItemChanged", data, "query");
                    vm.cancel();
                });
            });

        };

        vm.cancel = function () {
            $ionicHistory.goBack(-1);
        };

        $scope.$on('$ionicView.enter', function () {
            //var key = "appSavedQueryDoc";
            //if (!sessionStorage.getItem(key)) globals.showAlert("Error", "Missing doc - contact your developer.");
            //else vm.savedQuery = angular.fromJson(sessionStorage.getItem(key));
            //console.log(vm.savedQuery);
            //console.log($stateParams);
            vm.savedQuery = appGlobals.docQuery;
           // console.log($stateParams, vm.savedQuery);
        });


    };


})();


