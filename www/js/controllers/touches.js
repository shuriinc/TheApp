(function () {
    'use strict';

    //#region TouchCtrl
    angular.module("shuriApp").controller('TouchCtrl', ['$rootScope', '$scope', '$q', '$sce', '$state', '$stateParams', '$filter', '$window', '$timeout', '$ionicScrollDelegate', '$ionicPopup', '$ionicHistory', '$ionicModal', '$ionicLoading', '$sanitize', 'globals', 'dataApi', 'appGlobals', TouchCtrl]);

    function TouchCtrl($rootScope, $scope, $q, $sce, $state, $stateParams, $filter, $window, $timeout, $ionicScrollDelegate, $ionicPopup, $ionicHistory,  $ionicModal, $ionicLoading, $sanitize, globals, dataApi, appGlobals) {
        var vm = this;
        vm.mceOffset = globals.mceOffset;
        vm.mceOptions = globals.mceOptions;

        vm.wordFor = function (word) { return globals.wordFor(word); }
        vm.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
        vm.updateCaption = function (doc, caption) {
            doc.name = caption;
            doc.changeType = 1;
        };

        vm.buttonClasses = function (name) {
            var bc = 'button icon icon-right ';
            if (name == "cancel") {
                bc += " ion-close-round "
                if (!vm.isDirty) bc += ' button-outline  button-energized';
                else bc += ' button-stable ';
            }
            else {
                bc += ' ok-confirm  ion-checkmark-round ';
                if (!vm.isDirty) bc += ' button-outline';
            }
            return bc;
        }

        function TimeSpanString(dateStart, dateEnd) {
            if (dateEnd && !vm.preferences.omitend && !vm.preferences.omittime) {
                var startDt = moment.utc(dateStart);
                var endDt = moment.utc(dateEnd);
                var duration = moment.duration(endDt.diff(startDt));
                //console.log(duration.asHours(), Math.round(duration.asHours(), 2));
                if (duration.asSeconds() > 0) {
                    if (duration.asDays() >= 1) {
                        if (duration.asDays() == 1) return "1 day";
                        else return Math.round10(duration.asDays(), -1) + " days";
                    }
                    else if (duration.asHours() >= 2) {
                        if (duration.asHours() == 1) return "1 hour";
                        else return duration.asHours() + " hours";
                    }
                    else if (duration.asMinutes() >= 1) {
                        if (duration.asMinutes() == 1) return "1 minute";
                        else return Math.round(duration.asMinutes(), 1) + " minutes";
                    }
                    else {
                        if (duration.asSeconds() == 1) return "1 second";
                        else return Math.round(duration.asSeconds(), 1) + " seconds";
                    }
                }
                return "";
            }
            else return "";

        }

        vm.hardRefresh = function () {
            dataApi.clearCache();
            $rootScope.$broadcast("EntityChanged", $stateParams.id);
            vm.refreshData($stateParams.id);
        }

        vm.refreshData = function (touchId) {
            vm.showList = false;

            $q.all({
                dataAppUser: dataApi.getAppUser(),
                dataTouch: dataApi.getTouch(touchId, null, true, true),
                dataPrefs: dataApi.getUserPreferences()
            }).then(function (d) {

                vm.touch = d.dataTouch;
                vm.appUser = d.dataAppUser;
                vm.preferences = d.dataPrefs;
                if (vm.preferences.omittime) vm.dateFormat = 'll';

                if (vm.touch.id === appGlobals.guidEmpty) {
                  vm.notFoundMessage = "Unable to locate that touch. ";
                  if (vm.appUser.isFiltered) vm.notFoundMessage += "Is it in a filtered-out database?";
                  vm.notFound = true;

                }
                else {

                  //testonly
                  //vm.preferences.calsync = "outlook";

                  vm.isCapturedMedia = false;
                  vm.isCapturedTweet = false;
                  vm.isSynced = false;
                  vm.usingTemplate = false;
                  vm.isTouchEditable = vm.touch.updatable && (vm.appUser.licenseStatus != 2);

                  var startDt = moment.utc(vm.touch.dateStart).add(moment(vm.touch.dateStart).utcOffset(), "minutes");
                  var durationString = TimeSpanString(vm.touch.dateStart, vm.touch.dateEnd);
                  //console.log(vm.touch.description, vm.preferences);
                  vm.descLabel = "Description";
                  //vm.description = $sce.trustAsHtml(vm.touch.description.replaceAll("\n", "<br />"));
                  //vm.description = vm.touch.description = $sce.trustAsHtml(vm.touch.description);


                  vm.touchTitle = String.format("{0} - {1}", vm.touch.typename, startDt.format(vm.dateFormat));
                  switch (vm.touch.primitive) {
                    case shuri_enums.touchprimitive.timedmeeting:
                      vm.isTimed = true;
                      break;
                    case shuri_enums.touchprimitive.trackedemail:
                      vm.descLabel = "Body";
                      vm.isTrackedEmail = true;
                      vm.isHtml = true;
                      vm.touch.descriptionHtml = $sce.trustAsHtml(vm.touch.description);

                      if (vm.touch.isScheduled) {
                        var scheduleDt = moment.utc(vm.touch.dateSchedule).add(moment(vm.touch.dateSchedule).utcOffset(), "minutes");
                        vm.touchTitle = String.format("Will be sent {0}", scheduleDt.format(vm.dateFormat));
                        vm.title = vm.touch.typename;
                      }
                      //console.log(vm.touch);
                      vm.isSent = (vm.touch.dateSent && moment.utc(vm.touch.dateSent).isBefore(moment.utc()));
                      if (vm.isSent) {
                        var sendDt = moment.utc(vm.touch.dateSent).add(moment(vm.touch.dateSent).utcOffset(), "minutes");
                        vm.touchTitle = String.format("Sent {0}", sendDt.format(vm.dateFormat));
                        vm.title = vm.touch.typename;
                      }

                      if (vm.touch.descriptDoc_Id != appGlobals.guidEmpty) {
                        dataApi.getDocument(vm.touch.descriptDoc_Id).then(function (doc) {
                          vm.descLabel = "Body template: " + doc.name;
                          vm.usingTemplate = true;
                          vm.docTemplate = doc;


                        });
                      }
                      break;
                    case shuri_enums.touchprimitive.email:
                      vm.nameLabel = "Subject";
                      vm.descLabel = "Body";
                      break;
                    case shuri_enums.touchprimitive.twitter:
                      vm.isSocialMedia = true;
                      vm.descLabel = "Tweet";
                      vm.description = angular.fromJson(vm.description);
                      vm.isTwitter = vm.description.tw;
                      vm.isLinkedin = vm.description.li;
                      vm.isFacebook = vm.description.fb;
                      break;
                    case shuri_enums.touchprimitive.event:
                      if (durationString != "") vm.touchTitle = String.format("{0} - {1} - {2}", vm.touch.typename, startDt.format(vm.dateFormat), durationString);
                      break;
                    case shuri_enums.touchprimitive.meeting:
                      globals.setHelpView('touch_editMeeting');
                      if (durationString != "") vm.touchTitle = String.format("{0} - {1} - {2}", vm.touch.typename, startDt.format(vm.dateFormat), durationString);
                      break;
                    case shuri_enums.touchprimitive.mediacapture:
                      vm.isSocialMedia = true;
                      vm.descLabel = "Social Post";
                      var media
                      try {
                        angular.fromJson(vm.description);
                        vm.isCapturedMedia = true;
                        var media = angular.fromJson(vm.description);
                        if (media.type == 'Tweet') {
                          vm.isCapturedTweet = true;
                          vm.touch.captured = { type: 'Tweet', text: media.text, userName: media.userName, userPic: media.userPic, userSn: media.userSn, description: media.description, mediaUrl: media.mediaUrl };
                        } else if (media.type == 'RSS') {
                          vm.isCapturedRSS = true;
                          vm.touch.captured = { type: 'RSS', text: media.text, imageUrl: media.imageUrl, link: media.link, description: media.description, fmtDate: media.fmtDate, title: media.title, url: media.url };
                        }
                      } catch (e) { }
                      break;
                  }

                  //documents
                  vm.calName = "";
                  vm.touch.documents.forEach(function (doc) {
                    if (doc.id != appGlobals.guidEmpty && doc.value != "") {
                      switch (doc.userType_Id) {
                        case appGlobals.utConstants.doc_duration:
                          vm.elapsedTime = parseInt(doc.value);
                          vm.timerDisplay = true;
                          break;
                        case appGlobals.guidDocCalSync:
                          vm.isSynced = true;
                          var calsync = angular.fromJson(doc.value);
                           //console.log(calsync);
                          vm.calSyncDt = "";
                          try {
                            if (calsync.lastSyncAppt && !IsMinDate(calsync.lastSyncAppt)) {
                              var jsDt = (new Date(calsync.lastSyncAppt)).toISOString();
                              vm.calSyncDt = "Last sync: " + moment(jsDt).format("lll");
                              if (calsync.lastSyncTouch && !IsMinDate(calsync.lastSyncTouch)) {
                                var apptDt = new Date(calsync.lastSyncAppt);
                                var touchDt = new Date(calsync.lastSyncTouch);
                                if (touchDt > apptDt && vm.touch.primitive != 2 ) vm.calSyncDt += " [out of sync]";
                                //console.log(vm.touch, apptDt, touchDt > apptDt, vm.calSyncDt )
                              }
                            }
                            else vm.calSyncDt = "[ready to sync]";
                          }
                          catch (e) { }

                          if (vm.preferences.calsync == "outlook") {
                            vm.itemLabel = ""
                            if (calsync.itemType == 0) vm.calName = "Synced Email";
                            else vm.calName = "Synced Appointment";
                          }

                          break;
                      }
                    }
                  });
                }

                // initTinyMce();
                $scope.$broadcast('scroll.refreshComplete');
                $ionicLoading.hide();
                vm.showList = true;
                //console.log(vm.touch, vm.touch.description.toString().length);

                //----------Open/close pref
                vm.hideDetailsPref = String.format("hideSummary_Touch");
                dataApi.getUserPreference(vm.hideDetailsPref).then(function (pref) { if (pref) vm.hideDetails = (pref === "true"); })

            });
        }

        vm.previewTemplate = function () {
            vm.browseToUrl(vm.docTemplate.value);
        }

        vm.browseToUrl = function (url) {
            //console.log(url);
            if (url.indexOf('http') >= 0) {
                var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
            }
            else {
                var win = window.open("http://" + url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
            }
        };

        vm.edit = function (license) {
          if (vm.touch.updatable && !vm.disableEdit) {
              if (license == shuri_enums.licensestatus.grace) {
                var confirmPopup = $ionicPopup.confirm({
                  title: "Edit Disabled",
                  template: 'You are over your allotted entity amount. Would you like to delete this Touch?',
                  okText: "Delete",
                  okType: "button-assertive"
                });
                confirmPopup.then(function (res) {
                  if (res) {
                    dataApi.deleteEntity(vm.touch.id, shuri_enums.entitytypes.touch, vm.touch).then(function (data) {
                      $state.go('home.main');
                    });
                  }
                });
              }
              else {
                //delay a bit to let blurs finish
                vm.disableEdit = true;
                $timeout(function () {
                  vm.disableEdit = false;
                  $state.go('home.touchEdit', { id: vm.touch.id });

                }, 200)
              }
            }
        }

        vm.toggleDetails = function () {
            vm.hideDetails = !vm.hideDetails;

            if (vm.hideDetails) dataApi.postUserPreference(vm.hideDetailsPref, vm.hideDetails.toString(), false);
            else dataApi.deleteUserPreference(vm.hideDetailsPref);
        }

        vm.fullscreenSummary = function (event) {
          if (event) event.stopPropagation();
          $state.go("edit.textarea", { entityId: vm.touch.id, entityType: 6, label: vm.descLabel });
        }

      //#region TinyMCE

        vm.previewBody = function (event) {
          if (event) event.stopPropagation();
          tinyMCE.activeEditor.execCommand('mcePreview');
        }

        vm.toggleFullscreen = function (event) {
          if (event) event.stopPropagation();
          vm.fullscreen = !vm.fullscreen;
          vm.isDirty = true;

          vm.touch.descriptionHtml = $sce.trustAsHtml(vm.touch.description);
          $ionicScrollDelegate.scrollTop();
          //console.log(vm.touch.description, tinyMCE.activeEditor.getContent())
          //resize tinymce
          if (window.cordova) {
            if (vm.fullscreen) {
              $window.addEventListener('native.keyboardshow', vm.keyboardShowHandler);
              $window.addEventListener('native.keyboardhide', vm.keyboardHideHandler);
            }
            else {
              $window.removeEventListener('native.keyboardshow', vm.keyboardShowHandler);
              $window.removeEventListener('native.keyboardhide', vm.keyboardHideHandler);
            }
          }

          if (vm.isDirty) {
            dataApi.updateEntityDescription(vm.touch.id, 6, vm.touch.description).then(function () {
              if (vm.isSynced) dataApi.updateTouchLastSync(vm.touch.id);
            });
          }
        }

        vm.keyboardShowHandler = function (e) {
          //console.log(window.innerHeight);
          tinyMCE.activeEditor.height = (window.innerHeight - vm.mceOffset).toString() + "px";
          try { $scope.$apply(); }
          catch (e) { console.error(e); }
        }

        vm.keyboardHideHandler = function (e) {
          var h = (window.innerHeight - vm.mceOffset);
          //console.log(window.innerHeight);
          tinyMCE.activeEditor.height = h.toString() + "px";
          try { scope.$apply(); }
          catch (e) { console.error(e); }
        }


      //#endregion


        //#region Approvals
        vm.utsMayBeApproved = [];
        vm.docIdObjApprove = appGlobals.guidEmpty;
        vm.objApprove = {
            teamId: appGlobals.guidEmpty,
            isApproved: false,
            approvedBy: '',
            required: false
        }

        vm.setApproval = function () {
            vm.showApproval = false;
            for (var i = 0; i < vm.utsMayBeApproved.length; i++) {
                if (vm.utsMayBeApproved[i] === vm.touch.userType_Id) {
                    vm.showApproval = true;
                    break;
                }
            }


        }

        vm.setApprovalPermission = function (makedirty) {
            vm.mayApprove = false;
            if (vm.showApproval && vm.objApprove.teamId && vm.objApprove.teamId != appGlobals.guidEmpty) {
                dataApi.isUserInTeam(vm.objApprove.teamId).then(function (data) {
                    vm.mayApprove = (data.toLowerCase() === "true");
                    if (makedirty) vm.isDirty = true;
                });

            }

        }

        //#endregion

        //#region Clone Modal
        vm.openClone = function (event) {
            if (event) event.stopPropagation();

            vm.clonename = vm.touch.name;

            vm.jsDateStartClone = moment.utc(vm.touch.dateStart).add(1, "month").toDate();
            if (!vm.touch.dateEnd || vm.touch.dateEnd == null) vm.jsDateEndClone = vm.jsDateStartClone;
            else vm.jsDateEndClone = moment.utc(vm.touch.dateEnd).add(1, "month").toDate();
            $ionicModal.fromTemplateUrl('templates/modals/cloneTouch.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function (modal) {
                vm.cloneModal = modal;
                vm.cloneModal.show();
            });

        }
        vm.closeClone = function () {
            vm.cloneModal.hide();
            vm.cloneModal.remove();
            vm.cloneModal = null;
        }
        vm.cloneTouch = function (goToIt) {
            //need new copy
            dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.touch, vm.touch.id);
            dataApi.getTouch(vm.touch.id, vm.touch.collectionId, false, true).then(function (data) {
                var touchClone = data;
                touchClone.id = appGlobals.guidEmpty;
                touchClone.name = vm.clonename;
                if (touchClone.name.trim() == "") touchClone.name = vm.touch.name + " clone";
                touchClone.ownedBy_Id = vm.appUser.id;
                touchClone.dateSchedule = null;
                touchClone.isScheduled = false;

                //#region Prep the date/times -------
                var tchStart = moment(vm.jsDateStartClone);
                var tchEnd = moment(vm.jsDateEndClone);
                if (vm.preferences.omittime) {
                    //set start date to local Noon
                    var startMidn = moment([tchStart.year(), tchStart.month(), tchStart.date()]);
                    tchStart = startMidn.add(12, "hours");
                    if (!vm.preferences.omitend) {
                        var endMidn = moment([tchEnd.year(), tchEnd.month(), tchEnd.date()]);
                        if (endMidn == startMidn) endMidn.add(1, "hour");
                        tchEnd = endMidn.add(12, "hours");
                    }
                }
                if ((vm.preferences.omitend || vm.preferences.omittime) && tchEnd.format('lll') == tchStart.format('lll')) tchEnd.add(1, "hour");
                if (tchEnd.isBefore(tchStart)) tchEnd = tchStart.clone().add(1, "hour");
                touchClone.dateStart = tchStart.toISOString();
                touchClone.dateEnd = tchEnd.toISOString();

                //create all new docs
                var newDocs = [];
                touchClone.documents.forEach(function (doc) {
                    if (doc.userType_Id !== appGlobals.guidDocCalSync) {
                        var newDoc = new shuri_document();
                        newDoc.name = doc.name;
                        newDoc.value = doc.value;
                        newDoc.ownedBy_Id = vm.appUser.id;
                        newDoc.ownedByGroup_Id = doc.ownedByGroup_Id;
                        newDoc.userType_Id = doc.userType_Id;
                        newDoc.changeType = 1;
                        newDocs.push(newDoc);
                    }
                });
                touchClone.documents = newDocs;

                //create associations to existing only
                touchClone.groups.forEach(function (grp) {
                    if (grp.id != appGlobals.guidEmpty) grp.changeType = 1;
                });

                touchClone.locations.forEach(function (loc) {
                    if (loc.id != appGlobals.guidEmpty) loc.changeType = 1;
                });

                touchClone.people.forEach(function (per) {
                    if (per.id != appGlobals.guidEmpty) per.changeType = 1;
                });

                touchClone.tags.forEach(function (tag) {
                    if (tag.id != appGlobals.guidEmpty) tag.changeType = 1;
                });
                //#endregion

                dataApi.postTouch(touchClone, "clone", shuri_enums.entitytypes.touch).then(function (data) {
                    touchClone.id = data;
                    vm.closeClone();
                    if (goToIt == true) $state.go("home.touch", { id: touchClone.id });
                });



            });



        }

        //#endregion

        vm.delete = function () {
            var msg = "Delete this touch";
            if (vm.isSynced) msg += " and the synced appointment? <br><br><span class='itemLabel'>If you want to keep the appointment, unsync first.</span>";
            else msg += "?";


            var confirmPopup = $ionicPopup.confirm({
                title: 'Confirm Delete',
                template: msg
            });
            confirmPopup.then(function (res) {
                if (res) {
                    //todo Delete device appt
                    doDelete();
                }
            });
        };

        function doDelete() {
            dataApi.deleteEntity(vm.touch.id, shuri_enums.entitytypes.touch, vm.touch).then(function (data) {
                vm.cancel();
            });
        }
        vm.cancel = function () {
            if ($stateParams.returnState) {
                if ($stateParams.returnState.toLowerCase() == "goback" || vm.goBack) $ionicHistory.goBack(-1);
                else $state.go($stateParams.returnState);
            }
            else {
                $ionicHistory.goBack(-1);
            }
        };




        $rootScope.$on('EntityChanged', function (event, data) {
            //console.log(data);
            if (vm.touch && data && vm.touch.id.toLowerCase() == data.toLowerCase()) {
                vm.refreshData(data);
            }
        });


        dataApi.initialize("").then(function (d) {
            vm.appUser = d.appUser;
            vm.elapsedTime = 0;
            vm.attributeName = "Name";
            vm.attributeDesc = "Description";
            vm.attachmentType = "";
            vm.tweetChars = 0;
            vm.maxTweetChars = 140;
            vm.title = 'Touch';
            vm.dateFormat = 'lll';
            vm.files = [];
            vm.hideDetails = false;
            vm.detailsKey = "hideDetails" + $stateParams.id;
            if (localStorage.getItem(vm.detailsKey)) vm.hideDetails = true;

            vm.onDesktop = !(window.cordova);
            vm.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
            vm.isWide = (window.innerWidth >= appGlobals.widthMedium);
            vm.mayUpdateFS = (vm.isWide || vm.onDesktop);

            $ionicLoading.show({ template: 'Loading touch...' });
            vm.refreshData($stateParams.id);

            globals.sendAppView('touch', 6, $stateParams.id);
            globals.setHelpView('touch');
        });

    };
    //#endregion

})();
