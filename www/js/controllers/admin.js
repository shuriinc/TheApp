(function () {
    'use strict';
    angular.module("shuriApp").controller('UserAdminCtrl', function ($scope, $state, $stateParams, $window, $ionicModal, $ionicPopup, globals, dataApi, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.authorized = false;


        vm.refreshData = function () {
            vm.showList = false;
            dataApi.initialize().then(function (data) {
                vm.appUser = data.appUser;
                vm.authorized = vm.appUser.isSysAdmin;
                if (vm.authorized) {

                    dataApi.userAdmin($stateParams.userId).then(function (data) {
                        vm.theUser = data;
                        //console.log(data);
                        vm.subsPaid = [];
                        vm.subsView = [];
                        vm.subsOwned = [];

                        var today = moment();
                        vm.theUser.subscriptions.forEach(function (sub) {

                            if (sub.subscribers && sub.subscribers.length > 0) {
                                sub.userStatus = sub.subscribers[0].userStatus;
                                sub.endDt = moment(sub.subscribers[0].endDt);
                                sub.subscribers[0].name = sub.name;
                                if (moment.duration(sub.endDt.diff(today)).asYears() < 5) sub.subEndDt = "expires " + sub.endDt.format("ll");
                            }

                            if (sub.subType > 1 || sub.id.toUpperCase() === '98AEB899-ECED-450C-82B8-F55623385712') vm.subsPaid.push(sub);
                            else if (sub.userStatus === "Owner") vm.subsOwned.push(sub);
                            else vm.subsView.push(sub);
                        })

                        var tenYearsAgo = moment().subtract(10, 'years');
                        vm.lastHitDate = tenYearsAgo;
                        vm.theUser.usage.forEach(function (usg) {
                            usg.name = moment.utc(usg.usageDate).add(moment(usg.usageDate).utcOffset(), "minutes").format("lll");
                            usg.name += " - " + usg.resource;
                            if (usg.description && usg.description != "No one" && usg.entityId.toLowerCase() != vm.theUser.id.toLowerCase()) usg.name += " " + usg.description;
                            if (moment(usg.usageDate).isAfter(vm.lastHitDate)) vm.lastHitDate = moment(usg.usageDate);
                        });
                        vm.lastHit = "(never)";
                        if (vm.lastHitDate != tenYearsAgo) vm.lastHit = vm.lastHitDate.format('ll')


                        vm.showList = true;
                    }, function (err) {
                        vm.showList = true;
                        console.error(err);
                    });

                    //dataApi.getUserPreferences().then(function (data) {
                    //     vm.preferences = data;
                    //     vm.showList = true;
                    //     globals.sendAppView('account');
                    // });

                }





            });
        };

        vm.mergeUser = function () {
            globals.showAlert("To Do", "[merge user/person] coming soon...");
        }
        vm.deleteUser = function () {
            globals.showAlert("To Do", "[delete a user] coming soon...");
        }

        vm.addSubscription = function () {
            vm.jsStartDt = new Date();
            vm.jsEndDt = moment().add(1, "month").toDate();
            dataApi.getSubscriptionsAvailable().then(function (data) {
                vm.allSubs = data;
                vm.allSubs.forEach(function (sub) {
                    if (ArrayContainsById(vm.theUser.subscriptions, sub.id)) {
                        sub.isSubscriber = true;
                        console.log(sub);
                    }
                });
                console.log(vm.theUser.subscriptions);
                $ionicModal.fromTemplateUrl('userAdminSubAdd.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    vm.modalSubAdd = modal;
                    vm.modalSubAdd.show();
                });
            });
        };
        vm.closeModalSubAdd = function (saveSub) {
            vm.modalSubAdd.hide();
            vm.modalSubAdd.remove();
            var subscription = null;
            vm.allSubs.forEach(function (sb) {
                if (sb.isSelected) subscription = sb;
            })
            //console.log(vm.subToEdit);
            if (subscription && saveSub) {
                var newSub = new shuri_subscriber();
                newSub.person_Id = vm.theUser.id;
                newSub.subscription_Id = subscription.id;
                newSub.paymentType = shuri_enums.paytype.comp;
                newSub.startDt = vm.jsStartDt.toISOString();
                newSub.endDt = vm.jsEndDt.toISOString();
                newSub.receipt = "Added by " + vm.appUser.name + " on " + moment().format("lll");          //4000 char max
                dataApi.postEntity("subscribers", "subscriber", newSub).then(function (data) {
                    vm.refreshData();

                });
            }
        };

        vm.selectSubAdd = function (sub) {
            vm.allSubs.forEach(function (s) {
                s.isSelected = (sub.id == s.id);
            })
            vm.enableSubAdd = true;
        }

        vm.editSubscription = function (sub) {
            vm.subToEdit = sub.subscribers[0];
            vm.jsStartDt = moment(vm.subToEdit.startDt).toDate();
            vm.jsEndDt = moment(vm.subToEdit.endDt).toDate();
            vm.subname = sub.name;
            $ionicModal.fromTemplateUrl('userAdminSubEdit.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                vm.modalSubEdit = modal;
                vm.modalSubEdit.show();
            });

        };

        vm.closeModalSubEdit = function (saveSub) {
            vm.modalSubEdit.hide();
            vm.modalSubEdit.remove();
            //console.log(vm.subToEdit);
            if (saveSub) {
                vm.subToEdit.startDt = vm.jsStartDt.toISOString();
                vm.subToEdit.endDt = vm.jsEndDt.toISOString();
                dataApi.postEntity("subscribers", "subscriber", vm.subToEdit).then(function (data) {
                    vm.refreshData();

                });
            }
        };

        vm.deleteSub = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Confirm',
                template: "Delete this subscription?",
            });
            confirmPopup.then(function (res) {
                if (res) {
                    dataApi.deleteEntity(vm.subToEdit.id, shuri_enums.entitytypes.subscriber, vm.subToEdit)
                        .then(function () {

                            vm.modalSubEdit.hide();
                            vm.modalSubEdit.remove();
                            vm.refreshData();
                        });
                }
            });

        }

        vm.setPref = function (name, value) {
            dataApi.postUserPreference(name, value, true);
        }

        vm.refreshData();

    });
})();



(function () {
    'use strict';
    angular.module("shuriApp").controller('AccountCtrl', function ($scope, $state, $stateParams, $window, $timeout, $q, $ionicLoading, $ionicActionSheet, $ionicPopup, $cordovaCalendar, globals, dataApi, connectedService, appGlobals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.localStorage = localStorage;
        vm.currentDS = dataApi.currentDS();
        vm.isWidthSmall = (window.innerWidth < appGlobals.widthSmall);
        //console.log(vm.isWidthSmall);
        vm.isIOS = ionic.Platform.isIOS();
        if (window.cordova) vm.cordova = true;

        vm.refreshData = function () {
            vm.showList = false;
            dataApi.initialize().then(function (data) {
                vm.appUser = data.appUser;

                //vm.connectedServices = [];
                //for (var i = 0; i < vm.appUser.documents.length; i++) {
                //    var doc = vm.appUser.documents[i];
                //    if (doc.primitive == shuri_enums.documentprimitive.credentials) {
                //        doc.value = angular.fromJson(doc.value);
                //        switch (doc.name) {
                //            case 'Twitter Credentials':
                //                doc.icon = 'ion-social-twitter';
                //                break;
                //            case 'Facebook Credentials':
                //                doc.icon = 'ion-social-facebook';
                //                break;
                //            case 'Linkedin Credentials':
                //                doc.icon = 'ion-social-linkedin';
                //                break;
                //        }
                //        vm.connectedServices.push(doc);
                //    }
                //}

                $q.all({
                    dataPrefs: dataApi.getUserPreferences(),
                    dataTZ: dataApi.getTimezones(),
                    dataUserTZ: dataApi.getMyTimeZoneId(),
                    dataSubs: dataApi.userAdmin()
                }).then(function (d) {
                    vm.timezones = d.dataTZ;
                    vm.preferences = d.dataPrefs;
                    vm.oktoSyncIDs = appGlobals.betaIds

                    vm.timezone = null;
                    if (d.dataUserTZ && d.dataUserTZ.length && d.dataUserTZ.length > 0) {
                        angular.forEach(vm.timezones, function (tz) {
                            if (tz.Id.trim().toLowerCase() == d.dataUserTZ.trim().toLowerCase()) {
                                vm.timezone = tz;
                            }
                        });
                    }
                    if (!d.dataUserTZ) {
                        vm.timezone = { DisplayName: "Please choose one", Id: "None" };
                        vm.timezones.unshift(vm.timezone);
                    }

                    vm.oktoSyncIDs.forEach(function (id) { if (id == vm.appUser.id) vm.oktoSync = true; });
                     
                    vm.enableSync = true;
                    vm.isSyncable = false;

                    //debug - remove!!!!!!!
                    //vm.preferences.calsync = "outlook";

                    if (!window.cordova) vm.enableSync = true;
                    if (vm.preferences.calsync) {
                        vm.isSync = (vm.preferences.calendars && vm.preferences.calendars.length > 0);
                        vm.calList = "";
                        if (vm.preferences.calendars) {
                            vm.preferences.calendars.forEach(function (cal) {
                                if (cal.name && cal.name != "") vm.calList += cal.name + ", ";
                            });
                        }
                        if (vm.calList != "" && vm.calList.lastIndexOf(",") > 0) vm.calList = vm.calList.substring(0, vm.calList.lastIndexOf(","));

                        if (vm.preferences.calsync == "outlook") vm.isOutlookSync = true;

                        else if (vm.preferences.calsync == "ios" && !ionic.Platform.isIOS()) vm.enableSync = false;
                        else if (vm.preferences.calsync == "android" && !ionic.Platform.isAndroid()) vm.enableSync = false;

                        if (vm.preferences.calsync == "ios" && ionic.Platform.isIOS()) vm.isSyncable = true;
                        else if (vm.preferences.calsync == "android" && ionic.Platform.isAndroid()) vm.isSyncable = true;
                    }
                    if (vm.preferences.calsynclast) vm.lastSync = moment(vm.preferences.calsynclast).format('lll');
                    else vm.lastSync = "(never)";

                    vm.appUserWithAdmin = d.dataSubs;
                    vm.subsPaid = [];
                    vm.subsView = [];
                    vm.subsOwned = [];
                    //console.log(d.dataSubs);

                    var today = moment();
                    vm.appUserWithAdmin.subscriptions.forEach(function (sub) {

                        if (sub.subscribers && sub.subscribers.length > 0) {
                            sub.userStatus = sub.subscribers[0].userStatus;
                            sub.endDt = moment(sub.subscribers[0].endDt);
                            sub.subscribers[0].name = sub.name;
                            sub.rightText = "";
                            if (moment.duration(sub.endDt.diff(today)).asYears() < 5) sub.rightText += " expires " + sub.endDt.format("ll");

                        }

                        if (sub.subType > 1) {
                            vm.subsPaid.push(sub);
                        }
                        else if (sub.userStatus === "Owner") {
                            var grp = GetGroup(sub.group_Id);
                            //console.log(grp);
                            if (grp.ownedBy_Id.toLowerCase() === vm.appUser.id.toLowerCase()) sub.rightText += " You";// + vm.appUser.name;
                            else sub.rightText += " " + grp.ownedByGroupName;
                            vm.subsOwned.push(sub);
                        }
                        else vm.subsView.push(sub);
                    });

                    if ($stateParams.section && $stateParams.section === "dbs") vm.openDBs = true;
                    //console.log(vm.timezone);
                    vm.showList = true;
                    globals.sendAppView('account', 14, vm.appUser.id);


                });




            });
        };


        //#region Event handlers
        vm.dispenseUrl = function(dest, downloadOnly) {
            var url;
            if (dest == 'privacy') url = "http://www.shuri.com/privacy";
            else if (dest == 'terms') url = "http://www.shuri.com/terms";
            else url = dest;

            if (window.cordova) {
                var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
            }
            else if (downloadOnly == true) {
                var win = window.open(url, "_self");
            }
            else var win = window.open(url, "_blank");

        }

         vm.addNewService = function () {
            // loop through documents to make a decision on which buttons to make
            var mybuttons = [];
            for (var i = 0; i < vm.appUser.documents.length; i++) {
                if (vm.appUser.documents[i].name == 'Twitter Credentials') {
                    var hasTwitter = true;
                } else if (vm.appUser.documents[i].name == 'Facebook Credentials') {
                    var hasFacebook = true;
                } else if (vm.appUser.documents[i].name == 'Linkedin Credentials') {
                    var hasLinkedin = true;
                }
            }
            if (!hasTwitter) {
                mybuttons.push({ text: '<i class="icon ion-social-twitter"></i>Twitter', itemname: 'twitter' })
            }
            // if(!hasFacebook){
            //   mybuttons.push({ text: '<i class="icon ion-social-facebook"></i>Facebook', itemname: 'facebook' })
            // }
            if (!hasLinkedin) {
                mybuttons.push({ text: '<i class="icon ion-social-linkedin"></i>LinkedIn', itemname: 'linkedin' })
            }

            var hideSheet = $ionicActionSheet.show({
                buttons: mybuttons,
                titleText: vm.wordFor('Choose'),
                cancelText: vm.wordFor('Cancel'),
                cancel: function () {
                    hideSheet();
                },
                buttonClicked: function (index) {
                    var service = this.buttons[index].itemname;
                    switch (service) {
                        case 'twitter':
                            connectedService.twitter.twitterInitialize().then(function () {
                                vm.refreshData();
                            });
                            break;
                        case 'facebook':
                            connectedService.facebook.facebookInitialize().then(function () {
                                vm.refreshData();
                            });
                            break;
                        case 'linkedin':
                            connectedService.linkedin.linkedinInitialize().then(function () {
                                vm.refreshData();
                            });
                            break;
                    }
                    //console.log(this.buttons[index].itemname);
                    hideSheet();

                }
            });
        }

        vm.gotoPerson = function () {
            $state.go("home.person", { personId: vm.appUser.id });
        }

        vm.setPref = function (name, value) {
            dataApi.postUserPreference(name, value, true);
        }

        vm.signOut = function (doc) {
            $ionicListDelegate.closeOptionButtons();
            doc.changeType = shuri_enums.changetype.remove;
            //console.log(vm.appUser);
            dataApi.deleteEntity(doc.id, shuri_enums.entitytypes.document).then(function (user) {
                dataApi.refreshAppUser().then(function () {
                    vm.refreshData();
                })
            })
        };

        vm.tzChanged = function (tz) {
            console.log(tz);
            if (tz) dataApi.setMyTimeZoneId(tz.Id);
        }

        //#endregion

        //#region Cal Sync

        //vm.toggleSync = function () {
        //    //console.log("hello", vm.isSync);

        //    var platform = "unknown";
        //    if (ionic.Platform.isIOS()) platform = "ios";
        //    else if (ionic.Platform.isAndroid()) platform = "android";

        //    if (vm.isSync) {
        //        $cordovaCalendar.listCalendars().then(function (cals) {
        //            console.log("success: ", cals);
        //            if (cals) {
        //                if (cals.length > 0) {
        //                    vm.calendars = [];
        //                    vm.calList = "";
        //                    cals.forEach(function (c) {
        //                        if (!ionic.Platform.isIOS()
        //                            || (c.name != "Birthdays" && c.name != "Holidays in United States" && c.name != "US Holidays")
        //                            ) {
        //                            var cal = { id: c.id, name: c.name, syncPlatform: platform };
        //                            if (ionic.Platform.isAndroid()) cal.name = c.displayname;
        //                            vm.calList += cal.name + ", ";
        //                            vm.calendars.push(cal);
        //                            //console.log(angular.toJson(c));
        //                        }
        //                    });
        //                    if (vm.calList != "" && vm.calList.lastIndexOf(",") > 0) vm.calList = vm.calList.substring(0, vm.calList.lastIndexOf(","));
        //                    dataApi.postUserPreference("calendars", angular.toJson(vm.calendars), false);
        //                    dataApi.postUserPreference("calsync", platform, false);
        //                    vm.preferences.calsync = platform;
        //                }
        //            }
        //        }, function (err) {
        //            console.log("listCals error: ", err);
        //        });

        //    }
        //    else if (window.cordova) {
        //        var newPlatform = "";
        //        if (vm.preferences.calsync == "ios" && !ionic.Platform.isIOS()) newPlatform = "android";
        //        else if (vm.preferences.calsync == "android" && !ionic.Platform.isAndroid()) newPlatform = "ios";
        //        else if (vm.preferences.calsync == "outlook") newPlatform = "none";

        //        if (newPlatform == "") {
        //            dataApi.deleteUserPreference("calendars", false);
        //            dataApi.deleteUserPreference("calsync", false);
        //            vm.preferences.calsync = null;

        //        }
        //        else {
        //            var confirmPopup = $ionicPopup.confirm({
        //                title: 'Disable Calendar Sync?',
        //                template: "Calendar syncing will no longer be based upon your " + vm.preferences.calsync + " device(s).  Synced touches will no longer be synced.",
        //            });
        //            confirmPopup.then(function (res) {
        //                if (res) {
        //                    dataApi.deleteAllSyncDocs().then(function () {
        //                        dataApi.deleteUserPreference("calendars", false);
        //                        dataApi.deleteUserPreference("calsync", false);
        //                        vm.preferences.calsync = null;
        //                    })
        //                }
        //                else vm.isSync = true;
        //            });


        //        }

        //    }
        //    else {
        //        //turning off sync from the web
        //        var confirmPopup = $ionicPopup.confirm({
        //            title: 'Disable Calendar Sync?',
        //            template: "Calendar syncing can only be re-enabled from an Android or Apple device.",
        //        });
        //        confirmPopup.then(function (res) {
        //            if (res) {
        //                dataApi.deleteUserPreference("calendars", false);
        //                dataApi.deleteUserPreference("calsync", false);
        //                vm.preferences.calsync = null;
        //            }
        //            else vm.isSync = true;
        //        });

        //    }

        //}

        //vm.syncNowS = function () {
        //    var wait, cnt;

        //    $ionicLoading.show({ template: "Syncing..." , duration: 30000 });
        //    dataApi.getSyncTouches().then(function (touches) {
        //        console.log(touches);
        //        vm.totalTouches = touches.length;
        //        vm.syncedTouches = 0;
        //        cnt = 0;
        //        if (!touches || touches.length == 0) {
        //            $ionicLoading.hide();
        //            globals.showAlert("Nothing to Sync", "No touches were found to be synced.");
        //        }
        //        else {
        //            angular.forEach(touches, function (tch) {
        //                var appt;
        //                var doc = null;
        //                angular.forEach(tch.documents, function (docum) {
        //                    //console.log(doc, utId);
        //                    if (docum.userType_Id.toLowerCase() == utSync && docum.changeType != 2) doc = docum;
        //                });

        //                if (doc.value) appt = angular.fromJson(doc.value);
        //                else {
        //                    appt = new shuri_appointment(tch);
        //                    doc = new shuri_document();
        //                    doc.name = "calsync";
        //                    doc.userType_Id = utSync;
        //                }

        //                wait = cnt * 1500;
        //                cnt++;

        //                if (appt.id != null && appt.id != "") {
        //                    if (ionic.Platform.isIOS()) {
        //                        $timeout(function (appt) {
        //                            globals.findAppointment(appt).then(function (foundAppt) {
        //                                console.log("foundAppt:", foundAppt, appt);
        //                                if (foundAppt && foundAppt.length > 0) {
        //                                    console.log("calling modify at " + new Date());
        //                                    globals.modifyAppointment(appt).then(function (apptId) {
        //                                        appt.id = apptId;
        //                                        postApptDoc(tch.id, appt, doc);
        //                                    });

        //                                }
        //                                else {
        //                                    console.log("did not find:", appt);
        //                                    globals.deleteAppointment(appt).then(function (deleAppt) {
        //                                        globals.createAppointment(appt).then(
        //                                           function (apptId) {
        //                                               console.log("created appt:", apptId);

        //                                               appt.id = apptId;
        //                                               postApptDoc(tch.id, appt, doc);
        //                                           },
        //                                           function (err) {
        //                                               console.error(err);
        //                                           });

        //                                    });
        //                                }
        //                            });
        //                         }, wait);
        //                    }
        //                    else if (ionic.Platform.isAndroid()) {
        //                        $timeout(function () {
        //                            console.log("calling modifyAndroid at " + new Date());
        //                            globals.modifyAppointmentAndroid(appt).then(function (apptId) {
        //                                appt.id = apptId;
        //                                postApptDoc(tch.id, appt, doc);
        //                            });

        //                        }, wait);
        //                    }
        //                    else reject("Invalid platform");
        //                }
        //                else {
        //                    $timeout(function () {
        //                        console.log("calling create at " + new Date());
        //                        globals.createAppointment(appt).then(
        //                              function (apptId) {
        //                                  console.log("created new appt:", apptId);
        //                                  appt.id = apptId;
        //                                  postApptDoc(tch.id, appt, doc);
        //                              },
        //                              function (err) {
        //                                  console.error(err);
        //                              });

        //                    }, wait);
        //                  }
        //            });
        //        }
        //    });

        //}

        vm.syncNow = function (syncMode) {
            vm.syncMode = syncMode;
            vm.syncDeletes = 0;
            vm.syncIn = 0;
            vm.syncOut = 0;
            dataApi.getSyncTouches().then(function (touches) {
                //console.log(touches);
                vm.syncTotalCount = touches.length;
                if (!touches || touches.length == 0) {
                    finishSync();
                }
                else if (vm.showCals) syncTouches(touches);
            });
        }

        vm.toggleCalSection = function () {
            vm.showCals = !vm.showCals
            if (vm.showCals) vm.syncNow('noupdate');
        }

        vm.errorHandler1 = function (data) {
            console.error(data);
        }

        vm.errorHandler3 = function (data) {
            console.error(data);
            vm.cntNotfound++;
            if (vm.cntNotfound == vm.syncNotfound.length) syncTouchesStep4();
        }

        function SyncAppt(tch, appt) {
            console.log(tch, appt);
            vm.syncCurrentCount++;
        }

        function DeleteTouch(tch) {
            console.log(tch, vm.syncMode);
            if (vm.syncMode != "noupdate") {
                dataApi.deleteEntity(tch.id, shuri_enums.entitytypes.touch, tch).then(function (data) {
                    vm.syncDeletes++;
                    vm.syncCurrentCount++;
                    if (vm.syncCurrentCount >= vm.syncTotalCount) finishSync();
                });
            }
            else {
                vm.syncDeletes++;
                vm.syncCurrentCount++;
                console.log(vm.syncCurrentCount, vm.syncTotalCount);
                if (vm.syncCurrentCount >= vm.syncTotalCount) finishSync();
                else console.log("Not there yet");
            }
        }

        function syncTouches(touches) {
            //build appts 
            vm.syncFound = [];
            vm.appts = [];
            vm.newCalItems = [];
            vm.syncTotalCount = touches.length;
            vm.syncCurrentCount = 0;
            touches.forEach(function (tch) {
                var appt = null;
                var doc = null;
                var utSync = appGlobals.guidDocCalSync;

                angular.forEach(tch.documents, function (docum) {
                    //console.log(docum);
                    if (docum.userType_Id.toLowerCase() == utSync && docum.changeType != 2) doc = docum;
                });

                if (doc.value) {
                    appt = angular.fromJson(doc.value);
                    appt.docId = doc.id;
                }

                //3 possibilities:  1. No appt: Add New  2. Appt exists:  Sync  3.  Appt missing: User deleted in cal - delete in app too
                if (!appt) AddAppt(tch);
                else {
                    //see if exists
                    var options = window.plugins.calendar.getCalendarOptions();
                    if (ionic.Platform.isIOS()) options.id = appt.id; // iOS only, get it from createEventWithOptions (if not found, we try matching against title, etc)
                    else if (appt.calendarName) options.calendarName = appt.calendarName;
                    window.plugins.calendar.findEventWithOptions(appt.title, appt.loc, null, new Date(appt.startDate), new Date(appt.endDate), options,
                        function (data) {
                            console.log(data);
                            
                            if (data && data.length > 0) SyncAppt(tch, appt);
                            else DeleteTouch(tch);
                        }, vm.errorHandler1);
                }

            });

            return;
            console.log(vm.appts, touches);

            vm.cntStep1 = 0;
            vm.appts.forEach(function (appt) {
                var doc = null;
                var title = appt.title;
                var loc = appt.loc;
                var startDate = appt.startDate;
                var endDate = appt.endDate;
                if (appt.prevTitle) title = appt.prevTitle;
                if (appt.prevLoc) loc = appt.prevLoc;
                if (appt.prevStartDate) startDate = appt.prevStartDate;
                if (appt.prevEndDate) endDate = appt.prevEndDate;
                //console.log(appt);


            });
        }

        function finishSync() {
            $ionicLoading.hide();

            if (vm.syncMode == "noupdate") {
                vm.syncStatus = String.format("Total synced: {0}<br />Appointments in sync: {1}<br />Appointments out of sync: {2}<br />Touches pending deletion: {3}<br />"
                    , vm.syncTotalCount, vm.syncIn, vm.syncOut, vm.syncDeletes);
                $scope.$apply();
                console.log(vm.syncStatus);
            }
            else {
                var alertPopup = $ionicPopup.alert({
                    title: 'Sync Complete',
                    template: String.format("{0} Appointments were synced<br />{1} Touches were deleted", vm.syncOut, vm.syncDeletes)
                });
                alertPopup.then(function (res) {
                    vm.syncNow("noupdate");  //refresh status
                });

            }

        }

        function syncTouchesStep2() {
            //modify the founds
            vm.cntFound = 0;
            vm.syncFound.forEach(function (data) {
                var appt = data.appt;
                var calItem = data.result;

                if (ionic.Platform.isIOS()) {
                    var options = window.plugins.calendar.getCalendarOptions();
                    options.id = appt.id; // iOS only, get it from createEventWithOptions (if not found, we try matching against title, etc)

                    var title = appt.title;
                    var loc = appt.loc;
                    var startDate = appt.startDate;
                    var endDate = appt.endDate;
                    if (appt.prevTitle) title = appt.prevTitle;
                    if (appt.prevLoc) loc = appt.prevLoc;
                    if (appt.prevStartDate) startDate = appt.prevStartDate;
                    if (appt.prevEndDate) endDate = appt.prevEndDate;

                    window.plugins.calendar.modifyEventWithOptions(title, loc, null, new Date(startDate), new Date(endDate), appt.title, appt.loc, appt.notes, new Date(appt.startDate), new Date(appt.endDate), options, options,
                        function (data) {
                            vm.cntFound++;
                            if (vm.cntFound == vm.syncFound.length) syncTouchesStep3();
                        },
                              function (data) {
                                  console.error(data, appt);
                                  vm.cntFound++;
                                  if (vm.cntFound == vm.syncFound.length) syncTouchesStep3();
                              }

                        );
                }
                else if (ionic.Platform.isAndroid()) {
                    var title = appt.title;
                    var startDate = new Date(appt.startDate);
                    var endDate = new Date(appt.endDate);
                    if (appt.prevTitle) title = appt.prevTitle;
                    if (appt.prevStartDate) startDate = new Date(appt.prevStartDate);
                    if (appt.prevEndDate) endDate = new Date(appt.prevEndDate);
                    //console.log(appt, startDate, endDate);

                    window.plugins.calendar.deleteEvent(title, null, null, startDate, endDate,
                        function (data) {
                            cntFound++;
                            if (vm.cntFound == vm.syncFound.length) syncTouchesStep3();
                        }
                        , vm.errorHandler2);

                }


            });

        }

        function syncTouchesStep3() {
            console.log("step 3");
            if (ionic.Platform.isAndroid()) {
                //add all the founds into the unfounds cuz we deleted them and need to recreate
                vm.syncFound.forEach(function (data) {
                    vm.syncNotfound.push(data);
                });
            }

            vm.cntNotfound = 0;
            if (ionic.Platform.isIOS()) {
                //create the Notfounds
                vm.syncNotfound.forEach(function (data) {
                    var appt = data.appt;
                    var startDate = new Date(appt.startDate);
                    var endDate = new Date(appt.endDate);
                    if (startDate >= endDate || !endDate) {
                        endDate = moment(startDate).add(30, "minutes").toDate();
                    }
                    var options = window.plugins.calendar.getCalendarOptions();
                    if (appt.calendarName) options.calendarName = appt.calendarName; // iOS only
                    if (appt.url) options.url = appt.url;

                    window.plugins.calendar.createEventWithOptions(appt.title, appt.loc, appt.notes, startDate, endDate, options,
                        function (data) {
                            console.log(data);
                            if (data.length) {
                                //stash the new calendarId
                                vm.newCalItems.push({ calendarId: data, touchId: appt.touchId, docId: appt.docId });
                            }

                            vm.cntNotfound++;
                            if (vm.cntNotfound == vm.syncNotfound.length) syncTouchesStep4();

                        }
                        , vm.errorHandler3);

                });
            }
        }
        function syncTouchesStep4() {
            console.log("step 4");
            console.log(vm.syncFound, vm.syncNotfound, vm.newCalItems);

            syncDeletes();


        }

        function syncTouch (appt) {
            return $q(function (resolve, reject) {

                if (appt.id != null && appt.id != "") {
                    if (ionic.Platform.isIOS()) {
                            globals.findAppointment(appt).then(function (foundAppt) {
                                console.log("foundAppt:", foundAppt, appt);
                                if (foundAppt && foundAppt.length > 0) {
                                    console.log("calling modify at " + new Date());
                                    globals.modifyAppointment(appt).then(function (apptId) {
                                        appt.id = apptId;
                                        postApptDoc(tch.id, appt, doc).then(function(){
                                            resolve();
                                        });
                                    });

                                }
                                else {
                                    console.log("did not find:", appt);
                                    globals.deleteAppointment(appt).then(function (deleAppt) {
                                        globals.createAppointment(appt).then(
                                           function (apptId) {
                                               console.log("created appt:", apptId);

                                               appt.id = apptId;
                                               postApptDoc(tch.id, appt, doc).then(function(){
                                                   resolve();
                                               });
                                           },
                                           function (err) {
                                               console.error(err);
                                               reject(err);
                                           });

                                    });
                                }
                            });
                    }
                    else if (ionic.Platform.isAndroid()) {
                            console.log("calling modifyAndroid at " + new Date());
                            globals.modifyAppointmentAndroid(appt).then(function (apptId) {
                                appt.id = apptId;
                                postApptDoc(tch.id, appt, doc).then(function(){
                                    resolve();
                                });
                            });

                    }
                    else reject("Invalid platform");
                }
                else {
                        console.log("calling create at " + new Date());
                        globals.createAppointment(appt).then(
                              function (apptId) {
                                  console.log("created new appt:", apptId);
                                  appt.id = apptId;
                                  postApptDoc(tch.id, appt, doc).then(function(){
                                      resolve();
                                  });
                              },
                              function (err) {
                                  console.error(err);
                                  reject(err);
                              });
                }
            });

        }

        function postApptDoc(touchId, appt, doc) {
            return $q(function (resolve, reject) {
                appt.prevTitle = null;
                appt.prevStartDate = null;
                appt.prevEndDate = null;
                appt.prevLoc = null;
                doc.value = angular.toJson(appt);

                dataApi.postEntity("Documents", "document", doc).then(function (docId) {
                    console.log(docId);
                    dataApi.postRelation(6, touchId, 1, docId, false).then(function () {
                        resolve();
                        //vm.syncedTouches++;
                        //if (vm.totalTouches === vm.syncedTouches) {
                        //    console.log(vm.totalTouches + " finished");
                        //    syncDeletes();
                        //}

                    }, function (err) { reject(err); });
                });
            });
        }

        function syncDeletes() {
            var appt, wait, cnt;
            console.log(vm.syncFound, vm.syncNotfound);
            dataApi.getDeletedSyncs().then(function (data) {
                var syncs = data;
                var totDeletes = syncs.length;
                if (totDeletes > 0) {
                    cnt = 0;
                    var cntDele = 0;
                    angular.forEach(syncs, function (sync) {
                        if (sync.value) {
                            appt = angular.fromJson(sync.value);

                            if ((appt.platform == "ios" && ionic.Platform.isIOS()) || (appt.platform == "ios" && ionic.Platform.isIOS())) {
                                wait = cnt * 1500;
                                cnt++;
                                $timeout(function () {
                                    console.log("calling deleteAppt at " + new Date(), appt);
                                    globals.deleteAppointment(appt).then(function (data) {
                                        dataApi.deleteEntity(sync.id, 1, sync, true).then(function () {
                                            //console.log("deleted", appt.id, sync.id);
                                            cntDele++;
                                            if (cntDele == totDeletes) syncComplete();
                                        });
                                    }, function (err) {
                                        console.log("error deleting appt", err);
                                        cntDele++;
                                        if (cntDele == totDeletes) syncComplete();
                                    });
                                }, wait);

                            }
                            else {
                                cntDele++;
                                if (cntDele == totDeletes) syncComplete();
                            }
                        }

                    });
                }
                else syncComplete();

            });

        }

        function syncComplete() {
            dataApi.postUserPreference("calsynclast", (new Date()).toGMTString()).then(function (data) {

                vm.lastSync = moment().format('lll');
                $ionicLoading.hide();

                var msg = vm.appts.length + " touches were synced.";
                globals.showAlert("Sync Complete", msg);

            });
        }

         //#endregion
        vm.setOutlookSync = function (inSync) {
            if (!inSync) {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Confirm Stop',
                    template: "Stop syncing to Outlook?<br /><br />Cannot be re-enabled here.  To re-enable, restart Outlook with the Addin installed.<br />",
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        // dataApi.deleteUserPreference("calsync").then(function (data) {
                        globals.showAlert("Outlook Sync Has Been Stopped", "Be sure to uninstall the Outlook Addin so syncing is not re-started.");
                        vm.isSyncable = vm.isSync = false;
                        vm.lastSync = vm.preferences.calsync = null;
                        // });
                    }
                    else vm.isSync = true;
                });


            }
        }


        function GetGroup(id) {
            var theGroup = new shuri_group();
            vm.appUserWithAdmin.groups.forEach(function (grp) {
                if (grp.id == id) {
                    theGroup = grp;
                }
            });
            return theGroup;
        }


        $scope.$on('$ionicView.enter', function () {
            vm.refreshData();
        });

    });
})();

(function () {
    'use strict';
    angular.module("shuriApp").controller('SysAdminCtrl', function ($scope, $state, $ionicHistory, $ionicLoading, $timeout, $http, globals, dataApi, appGlobals) {
        var vm = this;

        function loadUsers() {
            dataApi.getUsers().then(function (data) {
                vm.users = data;
                vm.userCnt = vm.users.length;
                vm.setRptSort(1);
                var ent = new shuri_group();
                ent.name = "Manage Users";
                ent.peopleCount = vm.users.length;
                ent.updatable = false;

                vm.entity = ent;
                vm.isReady = true;
            });
        }

        vm.getUsage = function () {
            vm.showUsage = !vm.showUsage;
            //console.log(vm.showUsage);
            if (vm.showUsage && !vm.usage) {
                dataApi.usage(true).then(function (data) {
                    //console.log(data);
                    vm.usage = data;
                    //vm.usage
                });
            }

        }

        vm.setRptSort = function (sorter) {
            var compareDt = moment();
            vm.sorter = sorter;
            vm.users.forEach(function (user) {
                var lastHit = moment(user.modifiedDt);
                switch (sorter) {
                    case 1:
                        user.sortname = user.name;
                        break;
                    case 2:
                        user.sortname = ZeroFill(10000000 - user.touchesCount, 8) + user.name;
                        break;
                    case 3:

                        var duration = moment.duration(compareDt.diff(lastHit));
                        var minutes = duration.asMinutes();
                        var partDate = ZeroFill(parseInt(minutes), 12)
                        user.sortname = partDate + user.name;
                        break;


                }

                //flag date
                user.hasDate = (moment.duration(compareDt.diff(lastHit)).asMinutes() < 1000000000);

                //image
                if (user.imageUrl.toLowerCase().indexOf("shuristorage") >= 0) {
                    user.imageUrlThumb = user.imageUrl.toLowerCase().replace(".png", "_thumb.png");
                    user.hasImage = true;
                }

                //console.log(user);
            });
        }

        vm.updatePaidSubsGroup = function () {
            dataApi.updatePaidSubsGroup().then(function () {
                globals.showAlert("Complete", "Group 'Shuri Paid and Comp Subscribers' has been updated. <br /><br /> Reminder: do not change the group's name.")
            });
        }

        //#region Comp - old
        vm.compAR = function () {
            var part1 = 'AdminComp?endDate=' + vm.jsDateEnd.toISOString();
            var log = "";
            var cnt = 0;
            $ionicLoading.show({ template: 'Contacting the API...' });

            vm.entity.people.forEach(function (per) {
                $http({
                    method: 'GET',
                    url: dataApi.currentDS().apiUrl + part1 + "&personId=" + per.id,
                    headers: { 'Content-Type': 'text/json' }
                })
               .success(function (data) {
                   log += String.format("{0} comped OK.<br />", per.name);
                   cnt++;
                   if (cnt == vm.entity.people.length) finishComp(log);
               })
               .error(function (err) {
                   if (err && err.message) log += String.format("Error: {0} Person: {1} <br />", err.message, per.name);
                   cnt++;
                   if (cnt == vm.entity.people.length) finishComp(log);
               });
            });
        }

        function finishComp(log) {
            $ionicLoading.hide();
            vm.entity.people = [];
            vm.jsDateEnd = RoundDate(new Date(), 1);

            globals.showAlertQ("Completed.  Results:", log);


        }
        //#endregion

        vm.toggleDeviceMode = function () {
            vm.deviceMode = !vm.deviceMode;

            if (localStorage.getItem(appGlobals.keys.deviceMode)) localStorage.removeItem(appGlobals.keys.deviceMode);
            if (vm.deviceMode) {
                localStorage.setItem(appGlobals.keys.deviceMode, true);
                vm.deviceModeText = "Turn off device mode";
            }
            else vm.deviceModeText = "Turn on device mode";
        }

        vm.cancel = function () {
            $ionicHistory.goBack();
        }

        dataApi.initialize("").then(function (d) {

            vm.appUser = d.appUser;
            globals.sendAppView('sysAdmin', 14, vm.appUser.id);

            if (vm.appUser.isSysAdmin) {
                vm.authorized = true;
                vm.onDesktop = !(window.cordova);
                vm.deviceModeText = "Turn on device mode";
                vm.team = new shuri_group();
                vm.team.grpType = 2;
                vm.team.name = "Users to comp"
                vm.team.people = [];
                vm.jsDateEnd = RoundDate(new Date(), 1);
                loadUsers();

            }
        });
    });

})();
