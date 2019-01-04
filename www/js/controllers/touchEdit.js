(function () {
  'use strict';

  angular.module("shuriApp").controller('TouchEditCtrl', ['$q', '$sce', '$scope', '$state', '$stateParams', '$window', '$timeout', '$interval', '$cordovaCamera', 'ionicDatePicker',
    '$cordovaMedia', '$cordovaFile', '$cordovaGeolocation', '$cordovaCapture', '$cordovaCalendar', '$ionicActionSheet', '$http', '$filter', '$ionicHistory', '$ionicModal',
    '$ionicPopup', '$ionicLoading', '$ionicScrollDelegate', '$cordovaOauth', '$cordovaOauthUtility', '$rootScope', 'globals', 'dataApi', 'connectedService', 'appGlobals', TouchEditCtrl]);

  function TouchEditCtrl($q, $sce, $scope, $state, $stateParams, $window, $timeout, $interval, $cordovaCamera, ionicDatePicker,
    $cordovaMedia, $cordovaFile, $cordovaGeolocation, $cordovaCapture, $cordovaCalendar, $ionicActionSheet, $http, $filter, $ionicHistory, $ionicModal, $ionicPopup, $ionicLoading, $ionicScrollDelegate,
    $cordovaOauth, $cordovaOauthUtility, $rootScope, globals, dataApi, connectedService, appGlobals) {
    var vm = this;
    vm.mceOffset = globals.mceOffset;
    vm.mceOptions = globals.mceOptions;

    vm.refreshData = function (newUtObj) {
      vm.showTouch = false;
      $q.all({
        twitterAuthenticated: connectedService.twitter.isTwitterAuthenticated(),
        facebookAuthenticated: connectedService.facebook.isFacebookAuthenticated(),
        linkedinAuthenticated: connectedService.linkedin.isLinkedinAuthenticated()
      }).then(function (d) {
        if (d.twitterAuthenticated == true) {
          vm.twitterAuthenticated = true;
          vm.socialMediaAuthenticated = true;
        } else {
          vm.twitterAuthenticated = false;
        }
        if (d.facebookAuthenticated == true) {
          vm.facebookAuthenticated = true;
          vm.socialMediaAuthenticated = true;
        } else {
          vm.facebookAuthenticated = false;
        }
        if (d.linkedinAuthenticated == true) {
          vm.linkedinAuthenticated = true;
          vm.socialMediaAuthenticated = true;
        } else {
          vm.linkedinAuthenticated = false;
        }

        dataApi.clearCacheItemByEntity(shuri_enums.entitytypes.touch, $stateParams.id).then(function () {

          $q.all({
            dataTouch: dataApi.getTouch($stateParams.id, vm.collId, true, true),
            dataPrefs: dataApi.getUserPreferences(),
            dataTypes: dataApi.getUserTypes("fortouch")
          }).then(function (d) {

            vm.preTouch = d.dataTouch;
            vm.preferences = d.dataPrefs;
            vm.utsTouch = d.dataTypes;

            vm.isSynced = false;
            if (vm.preferences.calsync && vm.preferences.calendars) {
              var syncItem;
              //console.log(vm.preTouch.documents);
              var syncDocs = $filter("filter")(vm.preTouch.documents, function (doc) {
                return doc.userType_Id === appGlobals.guidDocCalSync;
              });

              if (syncDocs && syncDocs.length > 0 && syncDocs[0].value != '') {
                vm.docCalSync = syncDocs[0];
                vm.isSynced = true;
                syncItem = angular.fromJson(vm.docCalSync.value);
                //console.log(syncItem);
                if (syncItem.platform == "outlook") vm.syncedToName = "Outlook";
                else vm.syncedToName = syncItem.platform;
              }
              vm.calendars = vm.preferences.calendars.splice(0);
              vm.calendars.push({ name: "(none)", id: "" });
              //console.log(vm.calendars);

            }



            //assign to local var for late-binding to entity- directives
            if ($stateParams.id == appGlobals.guidEmpty) vm.newTouch = true;
            vm.addTwitter = vm.addFacebook = vm.addLinkedin = false;

            // vm.title = vm.touch.name;
            if (vm.preTouch.id == appGlobals.guidEmpty) {
              vm.isNew = true;

              var isYahoo = (vm.appUser.emailAddress.split("@")[1].toLowerCase().indexOf("yahoo") >= 0);
              if (isYahoo || (!vm.isWide && !vm.onDesktop)) {
                //yahoo or on a phone - remove TrackedEmail Types
                vm.utsTouch = $filter("filter")(vm.utsTouch, function (ut) { return ut.primitive != shuri_enums.touchprimitive.trackedemail; })
              }


              var now = moment();
              vm.jsDateStart = RoundMoment(now, moment.duration(1, "hour"), "floor").toDate();
              //console.log(now, vm.jsDateStart);

              vm.jsDateEnd = moment(vm.jsDateStart).add(30, "minutes").toDate();
              //set default type
              if (newUtObj) {
                vm.preTouch = newUtObj
              }
              else if (vm.utsTouch.length > 0) {
                vm.preTouch.userType_Id = vm.utsTouch[0].id;
                //look for meeting
                for (var i = 0; i < vm.utsTouch.length; i++) {
                  //if (vm.utsTouch[i].name == 'Email - Tracked') {
                  if (vm.utsTouch[i].name == 'Meeting') {
                    vm.preTouch.userType_Id = vm.utsTouch[i].id;
                    //vm.typeChanged(false);
                  }
                  //if ($stateParams.id == appGlobals.guidEmpty && vm.utsTouch[i].name == "Email") {
                  //    vm.utsTouch.splice([i], 1);
                  // }
                  // hiding social media posts for build
                  // if(vm.utsTouch[i].name == 'Social Media Post'){
                  //   vm.utsTouch.splice([i], 1);
                  // }
                }
              }

              //#region Incoming New Touch for some entity/entities?
              if ($stateParams.entityType) {
                //  console.log($stateParams);
                var entities = [];
                //coming from Query?:  entities stashed in globals
                if (!$stateParams.entityId) {
                  entities = globals.entitiesGet();
                  console.log(entities.length);
                  entities.forEach(function (e) {
                    e.changeType = 1;
                  });
                }

                if ($stateParams.entityId != appGlobals.guidEmpty) {
                  switch (parseInt($stateParams.entityType)) {
                    case shuri_enums.entitytypes.document:
                      dataApi.getDocument($stateParams.entityId).then(function (doc) {
                        //console.log(doc);
                        if (doc.typename == 'TwitterStream') {
                          vm.isCapturedMedia = true;
                          vm.isCapturedTweet = true;
                          if (doc.people.length) {
                            doc.people[0].changeType = 1;
                            vm.preTouch.people.push(doc.people[0]);
                            vm.preTouch.peopleCount++;

                          }
                          if (doc.groups.length) {
                            doc.groups[0].changeType = 1;
                            vm.preTouch.groups.push(doc.groups[0]);
                            vm.preTouch.orgsCount++;
                            console.log("incremented orgs for new doc");
                          }

                          var tweet = angular.fromJson(doc.value);
                          vm.preTouch.captured = {};
                          if (tweet.mediaUrl) vm.preTouch.captured.mediaUrl = tweet.mediaUrl;
                          vm.preTouch.captured.type = 'Tweet';
                          vm.preTouch.captured.text = tweet.text;
                          vm.preTouch.captured.userName = tweet.userName;
                          vm.preTouch.captured.userPic = tweet.userPic;
                          vm.preTouch.captured.userSn = tweet.userSn;

                          vm.preTouch.name = 'Touch - Media Capture - ' + tweet.text.substring(0, 20) + '...';
                          vm.preTouch.description = tweet.text;
                          vm.preTouch.userType_Id = appGlobals.utConstants.tch_mediaCapture;
                          vm.isDirty = true;
                        } else if (doc.typename == 'Research Items') {
                          vm.isCapturedMedia = true;
                          vm.isCapturedRSS = true;
                          if (doc.people.length) {
                            doc.people[0].changeType = 1;
                            vm.preTouch.people.push(doc.people[0]);
                            vm.preTouch.peopleCount++;

                          }
                          if (doc.groups.length) {
                            doc.groups[0].changeType = 1;
                            vm.preTouch.groups.push(doc.groups[0]);
                            vm.preTouch.orgsCount++;
                            console.log("incremented orgs for new doc");
                          }

                          var rss = angular.fromJson(doc.value);

                          vm.preTouch.captured = {};
                          vm.preTouch.captured.type = 'RSS';
                          vm.preTouch.captured.imageUrl = rss.orgInfo.thumbnail;
                          vm.preTouch.captured.link = rss.link;
                          vm.preTouch.captured.text = rss.description;
                          vm.preTouch.captured.fmtDate = moment(Number(rss.date)).format('MMMM Do, YYYY');;
                          vm.preTouch.captured.title = rss.title;
                          vm.preTouch.captured.url = rss.url;
                          vm.preTouch.captured.name = doc.name;


                          vm.preTouch.name = 'Touch - Media Capture - ' + rss.description.substring(0, 20) + '...';
                          vm.preTouch.description = rss.description;
                          vm.preTouch.userType_Id = appGlobals.utConstants.tch_mediaCapture;
                          if (rss.orgInfo && rss.orgInfo.id && rss.orgInfo.id != appGlobals.guidEmpty) {
                            var contains = false;
                            vm.preTouch.groups.forEach(function (grp) {
                              if (grp.id.toLowerCase() === rss.orgInfo.id.toLowerCase()) contains = true;
                            });
                            if (!contains) {
                              var newGrp = new shuri_group();
                              newGrp.id = rss.orgInfo.id;
                              newGrp.grpType = 3;
                              newGrp.name = rss.orgInfo.name;
                              newGrp.imageUrlThumb = rss.orgInfo.thumbnail;
                              vm.preTouch.orgsCount++;
                              vm.preTouch.groups.push(newGrp);
                            }
                          }
                        }
                        vm.dataRefreshCompleted();
                      })
                      break;
                    case shuri_enums.entitytypes.group:
                      if ($stateParams.entityId) dataApi.getGroup($stateParams.entityId).then(function (data) {
                        if (data.grpType == 0) {
                          data.changeType = shuri_enums.changetype.update;
                          vm.goBack = true;
                          vm.preTouch.groups.push(data);
                          vm.preTouch.grpsCount++;
                        }
                        vm.dataRefreshCompleted();

                      });

                      break;
                    case shuri_enums.entitytypes.organization:
                      if ($stateParams.entityId) dataApi.getOrg($stateParams.entityId, appGlobals.guidEmpty, 0).then(function (data) {
                        data.changeType = shuri_enums.changetype.update;
                        vm.goBack = true;
                        vm.preTouch.groups.push(data);
                        vm.preTouch.orgsCount++;
                        vm.dataRefreshCompleted();

                      });
                      else {
                        vm.preTouch.groups = entities;
                        vm.dataRefreshCompleted();
                        vm.preTouch.orgsCount = vm.preTouch.groups.length;
                      }
                      break;
                    case shuri_enums.entitytypes.private:
                      if ($stateParams.entityId) dataApi.getGroup($stateParams.entityId).then(function (data) {

                        data.changeType = shuri_enums.changetype.update;
                        vm.goBack = true;
                        vm.preTouch.groups.push(data);
                        vm.preTouch.groupsCount++;
                        vm.dataRefreshCompleted();

                      });
                      else {
                        vm.dataRefreshCompleted();
                        vm.preTouch.groups = entities;
                      }
                      break;
                    case shuri_enums.entitytypes.person:
                      if ($stateParams.entityId) dataApi.getPerson($stateParams.entityId, 0).then(function (data) {
                        data.changeType = shuri_enums.changetype.update;
                        var person = data;
                        vm.goBack = true;
                        vm.preTouch.people.push(data);
                        vm.preTouch.peopleCount++;

                        if (vm.preferences.autoaddorg) {
                          dataApi.getOrgForPerson(person.id).then(function (org) {
                            if (org && org.id != appGlobals.guidEmpty) {
                              vm.preTouch.groups.push(org);
                              vm.preTouch.orgsCount++;
                            }
                            vm.dataRefreshCompleted();
                          });
                        }
                        else vm.dataRefreshCompleted();

                      });
                      else {
                        vm.preTouch.people = entities;
                        vm.preTouch.peopleCount = vm.preTouch.people.length;
                        vm.dataRefreshCompleted();
                      }
                      break;
                    case shuri_enums.entitytypes.tag:
                      console.log($stateParams);
                      if ($stateParams.entityId) {
                        dataApi.getTag($stateParams.entityId).then(function (data) {
                          var theTag = data;
                          theTag.changeType = shuri_enums.changetype.update;
                          vm.goBack = true;
                          vm.preTouch.tags.push(theTag);
                          vm.preTouch.tagsCount++;
                          vm.dataRefreshCompleted();

                        });
                      }
                      else {
                        vm.preTouch.tags = entities;
                        vm.dataRefreshCompleted();
                      }
                      break;
                    default:
                      console.log("Unsupported entityType in touchEdit");
                      vm.dataRefreshCompleted(vm.preTouch);
                      break;
                  }
                }
              }
              else vm.dataRefreshCompleted();
              //#endregion
            }
            else {
              vm.navTitle = "Edit";
              vm.isNew = false;
              //dates
              if (vm.preTouch.dateStart.indexOf("T00:00:00") > 0 && !vm.preTouch.dateEnd) {
                //convert legacy start dates to 8am local time and set end date equal
                var local8am = moment.utc(vm.preTouch.dateStart).subtract(moment(vm.preTouch.dateStart).utcOffset(), "minutes").add(8, 'hours');
                vm.jsDateStart = new Date(local8am.format());
                vm.jsDateEnd = new Date(local8am.format());
              }
              else {
                vm.jsDateStart = RoundDate(moment.utc(vm.preTouch.dateStart).toDate(), 1);
                if (vm.preTouch.dateEnd) vm.jsDateEnd = RoundDate(moment.utc(vm.preTouch.dateEnd).toDate(), 1);
                else vm.jsDateEnd = RoundDate(moment(vm.jsDateStart).add(30, "minutes").toDate(), 1);

                //var datefield = document.createElement("input")
                //datefield.setAttribute("type", "datetime-local")
                //if (datefield.type != "datetime-local") console.log("Does NOT");
                //else console.log("OK");
              }

              vm.dataRefreshCompleted();
            }
          });
        });
      });
    };

    vm.dataRefreshCompleted = function () {
      if (vm.preTouch.id == appGlobals.guidEmpty) {
        if ($stateParams.collectionId) vm.preTouch.collection_Id = $stateParams.collectionId;
        //console.log($stateParams.collectionId, vm.preTouch.collection_Id);

        if (vm.preferences.addmetouch && !vm.isCapturedMedia && !ArrayContainsById(vm.preTouch.people, vm.appUser.id)) {
          //Add the user automatically?
          var per = new shuri_person();
          per.id = vm.appUser.id;
          per.name = vm.appUser.name;
          per.imageUrl = vm.appUser.imageUrl;
          per.imageUrlThumb = vm.appUser.imageUrlThumb;
          vm.preTouch.people.push(per);
          vm.preTouch.peopleCount++;
        }
      }


      //#region documents handling
      for (var i = 0; i < vm.preTouch.documents.length; i++) {
        if (vm.preTouch.documents[i].id != appGlobals.guidEmpty && vm.preTouch.documents[i].value) {
          switch (vm.preTouch.documents[i].userType_Id) {
            case appGlobals.guidDocCalSync:
              //console.log(vm.preTouch.documents[i]);
              vm.calendarToggle = true;
              var docVal = angular.fromJson(vm.preTouch.documents[i].value);
              if (docVal.entryId == appGlobals.guidEmpty) vm.waitingToSync = true;
              break;
            case appGlobals.utConstants.doc_approvalProcessObject:
              vm.docApprove = vm.preTouch.documents[i];
              vm.objApprove = angular.fromJson(vm.preTouch.documents[i].value);
              vm.setApprovalPermission(false);
              vm.preTouch.documents[i].display = false;
              break;
            case appGlobals.utConstants.doc_duration:
              vm.docDuration = vm.preTouch.documents[i];
              vm.elapsedTime = parseInt(vm.preTouch.documents[i].value);
              vm.preTouch.documents[i].display = false;
              // console.log("found a duration doc");
              break;
            case appGlobals.utConstants.doc_file:
              var fileName = vm.preTouch.documents[i].name.split("/");
              //var fileExt = vm.preTouch.documents[i].name.split(".");
              //fileExt = fileExt[fileExt.length - 1];
              vm.preTouch.documents[i].name = fileName[fileName.length - 1];
              vm.anyFiles = true;
              vm.preTouch.documents[i].display = false;
              break;
            case appGlobals.utConstants.doc_photo:
              vm.anyPhotos = true;
              vm.preTouch.documents[i].display = false;
              break;
            case appGlobals.utConstants.doc_emailPattern:
              vm.docTrackedEmail = vm.preTouch.documents[i];
              vm.preTouch.documents[i].display = false;
              break;
          }
        }
      }
      //#endregion


      //location
      vm.hasLocation = (vm.preTouch.location_Id && vm.preTouch.location_Id != appGlobals.guidEmpty);
      if (vm.hasLocation) {
        dataApi.getLocation(vm.touch.location_Id).then(function (data) {
          vm.location = data;
          vm.locAddress = vm.location.address;
        });
      }


      //finally
      vm.touch = vm.preTouch;
      //console.log(vm.touch);
      vm.touch.descLabel = vm.descLabel;

      if (vm.touch.primitive == shuri_enums.touchprimitive.twitter) {
        vm.touch.description = angular.fromJson(vm.touch.description);
        vm.addTwitter = vm.touch.description.tw;
        vm.addLinkedin = vm.touch.description.li;
        vm.addFacebook = vm.touch.description.fb;
        vm.isSocialMedia = true;
      }
      else if (vm.touch.primitive == shuri_enums.touchprimitive.mediacapture) {
        var isJson = function (str) {
          try {
            angular.fromJson(vm.touch.description);
          } catch (e) {
            return false;
          }
          return true;
        }
        if (isJson()) {
          var media = angular.fromJson(vm.touch.description);
          if (media.type == 'Tweet') {
            vm.isCapturedTweet = true;
            vm.touch.captured = {};
            vm.touch.captured.type = 'Tweet';
            if (media.mediaUrl) vm.touch.captured.mediaUrl = media.mediaUrl;
            vm.touch.captured.text = media.text;
            vm.touch.captured.description = media.description;
            vm.touch.captured.userName = media.userName;
            vm.touch.captured.userPic = media.userPic;
            vm.touch.captured.userSn = media.userSn;
            vm.touch.description = media.text + '\r\n\r\n' + (media.description || '');
          } else if (media.type == 'RSS') {
            vm.isCapturedRSS = true;
            vm.touch.captured = {};
            vm.touch.captured.type = 'RSS';
            vm.touch.captured.imageUrl = media.imageUrl;
            vm.touch.captured.link = media.link;
            vm.touch.captured.text = media.text;
            vm.touch.captured.description = media.description;
            vm.touch.captured.fmtDate = media.fmtDate;
            vm.touch.captured.title = media.title;
            vm.touch.captured.url = media.url;
            vm.touch.captured.name = media.link;
            vm.touch.description = media.text + '\r\n\r\n' + (media.description || '');
          }
        }
      }
      else if (vm.touch.primitive == shuri_enums.touchprimitive.trackedemail) {
        vm.isSent = (vm.touch.dateSent && moment.utc(vm.touch.dateSent).isBefore(moment.utc()));
        if (vm.isSent) vm.sentLabel = "Sent " + moment.utc(vm.touch.dateSent).add(moment(vm.touch.dateSent).utcOffset(), "minutes").format("lll");
        //console.log(vm.isSent);
        //initTinyMce();

      }
      vm.touch.descriptionHtml = $sce.trustAsHtml(vm.touch.description);
      //if (vm.touch.description) {
      //  vm.touch.descriptionHtml = "HTML Email Body - " + vm.touch.description.length + " characters.";
      //}

      $timeout(function () { vm.descCondensed = tinyMCE.activeEditor.getContent({ format: 'text' }); }, 1000);

      vm.showTouch = true;
      vm.typeChanged(false);
      globals.sendAppView('touchEdit', 6, vm.touch.id);


    };

    vm.previewTemplate = function (doc) {
      //console.log(doc);
      vm.browseToUrl(doc.value);
    }

    vm.browseToUrl = function (url) {
      //console.log(url);
      if (url && url.length > 8 && url.indexOf) {
        if (url.indexOf('http') >= 0) {
          var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
        }
        else {
          var win = window.open("http://" + url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
        }
      }
    };

    vm.enlargePhoto = function (url) {
      $ionicModal.fromTemplateUrl('enlargePhoto.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.enlargeModal = modal;
        vm.enlargedImageUrl = url;
        console.log(vm.enlargePhoto);
        vm.enlargeModal.show();
      });
    };

    vm.cancelEnlargeModal = function () {
      vm.enlargeModal.hide();
      vm.enlargeModal.remove();
      vm.enlargedImageUrl = null;
    };

    vm.selectMedia = function (type) {
      switch (type) {
        case 'facebook':
          if (!vm.facebookAuthenticated) {
            vm.authenticateFacebook();
          } else {
            vm.addFacebook = !vm.addFacebook;
          }
          break;
        case 'twitter':
          if (!vm.twitterAuthenticated) {
            vm.authenticateTwitter();
          } else {
            vm.addTwitter = !vm.addTwitter;
          }
          break;
        case 'linkedin':
          if (!vm.linkedinAuthenticated) {
            vm.authenticateLinkedin();
          } else {
            vm.addLinkedin = !vm.addLinkedin;
            if (vm.addLinkedin) {
              //console.log('starting');
              if (!vm.linkedinAs) {
                connectedService.linkedin.getCompanies().then(function (comp) {
                  if (comp._total > 1) {
                    vm.linkedinAs = {};
                    vm.linkedinAs.state = true;
                    vm.linkedinAs.options = comp.values;
                    vm.linkedinAs.selected = vm.linkedinAs.options[vm.linkedinAs.options.length - 1];
                  }
                });
              } else {
                vm.linkedinAs.state = true;
              }
            } else {
              if (vm.linkedinAs) vm.linkedinAs.state = false;
            }
          }
          break;
      }
    };

    vm.authenticateTwitter = function () {
      vm.showTouch = false;
      connectedService.twitter.twitterInitialize().then(function (result) {
        if (result == true) {
          vm.twitterAuthenticated = true;
          vm.socialMediaAuthenticated = true;

          vm.addTwitter = true;
          vm.showTouch = true;
          console.log('twitter settled');
        } else {
          alert("There was an error with your credentials")
          vm.showTouch = true;
        }
      }, function (err) {
        console.log('error');
        vm.showTouch = true;
      })
    };

    vm.authenticateLinkedin = function () {
      vm.showTouch = false;
      connectedService.linkedin.linkedinInitialize().then(function (result) {
        if (result == true) {
          vm.linkedinAuthenticated = true;
          vm.socialMediaAuthenticated = true;

          vm.addLinkedin = true;
          vm.showTouch = true;
          console.log('linkedin settled');
        } else {
          alert("There was an error with your credentials")
          vm.showTouch = true;
        }
      }, function (err) {
        console.log('error');
        vm.showTouch = true;
      })
    };

    vm.authenticateFacebook = function () {
      vm.showTouch = false;
      connectedService.facebook.facebookInitialize().then(function (result) {
        if (result == true) {
          vm.facebookAuthenticated = true;
          vm.socialMediaAuthenticated = true;

          vm.addFacebook = true;
          vm.showTouch = true;
          console.log('facebook settled');
        } else {
          alert("There was an error with your credentials")
          vm.showTouch = true;
        }
      }, function (err) {
        console.log('error');
        vm.showTouch = true;
      })
    };

    //#region Event Handlers
    vm.wordFor = function (word) { return globals.wordFor(word); }

    vm.adjustEndDate = function () {
    //  console.log(vm.jsDateEnd, vm.jsDateStart, vm.dateDiffMins);
      if (!vm.preferences.omitend && (vm.jsDateEnd < vm.jsDateStart || vm.dateDiffMins)) {
        var diff = 30;
        if (vm.dateDiffMins) diff = vm.dateDiffMins;
        vm.jsDateEnd = moment(vm.jsDateStart).add(diff, "minutes").toDate();

      }
    }

    vm.dateStartFocus = function () {
      var dtStart = moment(vm.jsDateStart);
      var dtEnd = moment(vm.jsDateEnd);
      var duration = moment.duration(dtEnd.diff(dtStart));
      vm.dateDiffMins = duration.asMinutes();
    }

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
      //console.log(tinyMCE.activeEditor.height, tinyMCE.activeEditor.getContent())
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
    }

    //function updateUITrackedEmail() {
    //  if (vm.touch.description) {
    //    vm.touch.descriptionHtml = "HTML Email Body - " + vm.touch.description.length + " characters.";
    //  }
    //  vm.descCondensed = tinyMCE.activeEditor.getContent({ format: 'text' });

    //}

    vm.keyboardShowHandler = function (e) {
      //console.log(window.innerHeight);
      //tinyMCE.activeEditor.height = (window.innerHeight - vm.mceOffset ).toString() + "px";
      //try { $scope.$apply(); }
      //catch (e) { console.error(e); }
    }

    vm.keyboardHideHandler = function (e) {
      var h = (window.innerHeight - vm.mceOffset);
      //console.log(window.innerHeight);
      tinyMCE.activeEditor.height = h.toString() + "px";
      try { scope.$apply(); }
      catch (e) { console.error(e); }
    }


    vm.browseForTemplate = function (event) {
      if (event) event.stopPropagation();
      setTimeout(function () {
        document.getElementById("body-upload").click()
      }, 0);
    };

    vm.sendFiles = function (files) {
      if (files.length != 0) {
        dataApi.postFiles(files, vm.appUser.defaultCollection_Id, appGlobals.utConstants.doc_emailTemplate).then(function (data) {
          refreshTemplates();
        });
      }
    };

    vm.addToken = function (token) {
      var txtarea = document.getElementById('email-body');
      var scrollPos = txtarea.scrollTop;
      var strPos = 0;
      var br = ((txtarea.selectionStart || txtarea.selectionStart == '0') ?
        "ff" : (document.selection ? "ie" : false));
      if (br == "ie") {
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart('character', -txtarea.value.length);
        strPos = range.token.length;
      }
      else if (br == "ff") strPos = txtarea.selectionStart;

      var front = (txtarea.value).substring(0, strPos);
      var back = (txtarea.value).substring(strPos, txtarea.value.length);
      txtarea.value = front + token + back;
      strPos = strPos + token.length;
      if (br == "ie") {
        txtarea.focus();
        var range = document.selection.createRange();
        range.moveStart('character', -txtarea.value.length);
        range.moveStart('character', strPos);
        range.moveEnd('character', 0);
        range.select();
      }
      else if (br == "ff") {
        txtarea.selectionStart = strPos;
        txtarea.selectionEnd = strPos;
        txtarea.focus();
      }
      txtarea.scrollTop = scrollPos;
      vm.touch.description = txtarea.value
    };

    vm.newUTModal = function () {
      vm.guidEmpty = appGlobals.guidEmpty;
      vm.touchUT = new shuri_userType();
      vm.touchUT.entityType = shuri_enums.entitytypes.touch;
      vm.touchUT.primitive = shuri_enums.touchprimitive.meeting;
      $ionicModal.fromTemplateUrl('addTouchType.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.modalT = modal;
        vm.modalT.show();
      });
    };

    vm.modalTChanged = function () {
      vm.savetouchUTEnabled = (vm.touchUT.name);
    };

    vm.savetouchUT = function () {
      vm.touchUT.collection_Id = $stateParams.collectionId;
      dataApi.postEntity("usertypes", "usertype", vm.touchUT).then(function (data) {
        //add new type in UI
        var newUT = new shuri_userType();
        newUT.name = vm.touchUT.name;
        newUT.id = data;
        vm.utsTouch.push(newUT);
        vm.touch.userType_Id = data;
        vm.closeModalT();
        dataApi.refreshUTConstants();
      });
    };

    vm.helpModal = function () {
      $ionicModal.fromTemplateUrl('modalHelpViewer.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.modal = modal;
        vm.modal.show();
      });
    };

    vm.closeModal = function () {
      vm.modal.hide();
      vm.modal.remove();
    };

    vm.closeModalT = function (trigger) {
      if (trigger) {
        for (var i = 0; i < vm.utsTouch.length; i++) {
          if (vm.utsTouch[i].primitive === shuri_enums.touchprimitive.meeting && vm.utsTouch[i].name == 'Meeting') {
            vm.touch.userType_Id = vm.utsTouch[i].id;
          }
        }
      }
      vm.modalT.hide();
      vm.modalT.remove();
    };

    vm.sendNowChanged = function () {
      vm.isDirty = true;
      vm.scheduleToggle = false;
      if (vm.sendNow) vm.touch.dateSchedule = null;
      else vm.touch.dateSchedule = new Date();
    };

    vm.scheduleChanged = function () {
      vm.isDirty = true;
      vm.sendNow = false;
      vm.showScheduleDate = true;
    };
    //#endregion

    //#region Email Templates

    function refreshTemplates() {
      //console.log(vm.touch);
      if (vm.isTrackedEmail) {
        var descId = appGlobals.guidEmpty;
        if (vm.touch) descId = vm.touch.descriptDoc_Id.toLowerCase();

        dataApi.getDocuments(appGlobals.utConstants.doc_emailTemplate, 1, 100).then(function (data) {
          vm.templates = data;
          var foundTemplate = false;
          vm.templates.forEach(function (tmpl) {
            if (tmpl.createdDt) {
              if (moment.utc().subtract(60, 'minutes').isBefore(moment.utc(tmpl.createdDt))) tmpl.isNew = true;
            }
            //console.log(descId, tmpl.id, (vm.touch.descriptDoc_Id === vm.guidEmpty))
            if (descId !== appGlobals.guidEmpty && tmpl.id.toLowerCase() === descId) {
              //tmpl.icon = "ion-checkmark-round";
              tmpl.isBody = vm.usingTemplate = vm.hideEditor = true;
              vm.descLabel = "Body template: " + tmpl.name;
            }
          });
          if (!vm.usingTemplate && descId != appGlobals.guidEmpty) {
            //this touch has a template doc, but the user cannot see it
            vm.descLabel = "Body template - currently unavailable.";
            vm.hideEditor = true;
          }
        });

      }
    }

    function openEditTemplateModal(doc) {
      $ionicModal.fromTemplateUrl('editTemplate.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.templateModal = modal;
        vm.templateModal.show();
      });

    }

    vm.saveTemplate = function () {
      dataApi.postEntity("documents", "document", vm.templateToEdit, shuri_enums.entitytypes.document).then(function (data) {
        refreshTemplates();
        vm.closeTemplate();
      });
    }


    vm.closeTemplate = function () {
      vm.templateModal.hide();
      vm.templateModal.remove();
    }

    vm.showTemplateAction = function (event, doc) {
      if (event) event.stopPropagation();
      vm.templateToEdit = doc;
      var mybuttons = [];

      if (doc.isBody) mybuttons.push({ text: '<div class=""><i class="icon ion-close-round"></i>Stop using as body</div>', itemname: 'bodystop' });
      else mybuttons.push({ text: '<div class=""><i class="icon ion-checkmark-round"></i>Use as body</div>', itemname: 'body' });
      mybuttons.push({ text: '<div class=""><i class="icon ion-eye"></i>Preview</div>', itemname: 'preview' });
      mybuttons.push({ text: '<div class=""><i class="icon ion-ios-download"></i>Download Copy</div>', itemname: 'copy' });
      if (doc.updatable) mybuttons.push({ text: '<div class=""><i class="icon ion-edit"></i>Edit</div>', itemname: 'edit' });

      var title = doc.name.toUpperCase();
      if (title.length > 40) title = title.substring(0, 35);
      var hideSheet = $ionicActionSheet.show({
        buttons: mybuttons,
        titleText: title,
        cancelText: 'Cancel',
        cssClass: 'no-scroll',
        destructiveText: (doc.updatable) ? '<div class="assertive"><i class="icon ion-trash-a"></i>Delete</div>' : null,
        cancel: function () {
          hideSheet();
        },
        buttonClicked: function (index) {
          vm.doTemplateAction(this.buttons[index].itemname);
          hideSheet();
        },
        destructiveButtonClicked: function (index) {
          vm.doTemplateAction('delete');
          hideSheet();
        }
      });

    }

    vm.doTemplateAction = function (action) {
      //console.log(action);
      switch (action) {
        case "edit":
          openEditTemplateModal(vm.templateToEdit);
          break;
        case "delete":
          dataApi.deleteEntity(vm.templateToEdit.id, shuri_enums.entitytypes.document).then(function (data) {
            refreshTemplates();
          });
          break;
        case "copy":
          var name = vm.templateToEdit.name;
          var url = vm.templateToEdit.value;
          if (window.cordova) {
            dataApi.downloadFileToDevice(url, name);
          }
          else {
            var anchor = document.createElement('a');
            anchor.href = url;
            anchor.target = '_blank';
            anchor.download = name;
            anchor.click();
          }
          break;
        case "body":
          vm.touch.descriptDoc_Id = vm.templateToEdit.id;
          vm.touchChanged();
          refreshTemplates();
          break;
        case "bodystop":
          vm.touch.descriptDoc_Id = appGlobals.guidEmpty;
          vm.touchChanged();
          vm.descLabel = "Body";
          vm.usingTemplate = vm.isEditorReadonly = vm.hideEditor = false;
          vm.template = null;
          vm.touch.description = tinyMCE.activeEditor.getContent();
          dataApi.deleteRelation(shuri_enums.entitytypes.touch, vm.touch.id, shuri_enums.entitytypes.document, vm.templateToEdit.id, true).then(function (data) {
            vm.typeChanged(true);
          });
          break;
        case "preview":
          vm.browseToUrl(vm.templateToEdit.value);
          break;
      }


    }


    //#endregion

    //#region Tracked email picker modal
    vm.openTrackedEmailPicker = function (event) {
      if (event) event.stopPropagation();
      $ionicLoading.show({ template: 'Loading past tracked emails...' })
      dataApi.getTouchesForEntity(6, vm.touch.id, 20, 1).then(function (data) {
        vm.previousTracked = data;
        //console.log(data);
        vm.previousTracked.forEach(function (tch) {
          tch.descriptionHtml = $sce.trustAsHtml(tch.description.replaceAll('\n', '<br />'));
        });
        $ionicModal.fromTemplateUrl('trackedEmailPicker.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function (modal) {
          vm.modalTEP = modal;
          vm.modalTEP.show();
          $ionicLoading.hide();
        });
      })

    }

    vm.closeTrackedEmailPicker = function (tchSelected) {
      if (tchSelected) {
        var content = tchSelected.description;
        if (!content || content == "") content = '<p style="font-family: Tahoma, Verdana, Segoe, sans-serif; font-size: 14px;"><br data-mce-bogus="1"></p>';
        tinyMCE.activeEditor.setContent(content);
        vm.touch.description = content;
        vm.touch.descriptionHtml = $sce.trustAsHtml(content);
        vm.isDirty = true;
      }
      vm.modalTEP.hide();
      vm.modalTEP.remove();
    }
    //#endregion 

    vm.typeChanged = function (setDirty) {
      if (vm.touch.userType_Id === null) {
        vm.newUTModal();
      }
      vm.nameLabel = "Name";
      vm.descLabel = "Description";
      vm.isSchedulable = false;
      vm.isTimed = false;
      vm.isCapturedTweet = false;
      vm.isCapturedRSS = false;
      vm.isTrackedEmail = false;
      vm.isSocialMedia = false;
      vm.isApprovable = false;
      if (setDirty) vm.isDirty = true;

      //get the touch primitive
      var prim = -1;
      for (var i = 0; i < vm.utsTouch.length; i++) {
        if (vm.touch.userType_Id == vm.utsTouch[i].id) {
          prim = vm.utsTouch[i].primitive;
          break;
        }
      }
      switch (prim) {
        //case shuri_enums.touchprimitive.timedmeeting:
        //  globals.setHelpView('touch_editMeeting');
        //  vm.isTimed = true;
        //  break;
        case shuri_enums.touchprimitive.trackedemail:
          globals.setHelpView('touch_editTracked');
          if (vm.touch.dateSchedule) vm.jsDateSchedule = moment(vm.touch.dateSchedule).add(moment(vm.touch.dateSchedule).utcOffset(), "minutes").toDate();
          else vm.jsDateSchedule = RoundDate(moment().toDate(), 1);
          if (vm.touch.dateSent) vm.isSent = true;
          //console.log(vm.touch.replyTo, vm.appUser.emailAddress,vm.touch.replyTo.trim() === "");
          vm.isScheduled = vm.touch.isScheduled;

          if (vm.touch.replyTo != null && vm.touch.replyTo.trim() === "") vm.touch.replyTo = vm.appUser.emailAddress;
          if (vm.touch.from != null && vm.touch.from.trim() === "") vm.touch.from = vm.appUser.name;
          vm.isSchedulable = true;
          vm.nameLabel = "Subject";
          vm.descLabel = "Body";
          vm.isTrackedEmail = true;
          vm.isApprovable = true;
          vm.calendar = null;
          vm.isSynced = false;

          refreshTemplates();
          //initTinyMce();
          document.getElementById("txtName").focus();
          $ionicScrollDelegate.scrollTop();
          break;
        case shuri_enums.touchprimitive.email:
          globals.setHelpView('touch_edit');
          vm.nameLabel = "Subject";
          vm.descLabel = "Body";
          break;
        case shuri_enums.touchprimitive.twitter:
          globals.setHelpView('touch_editTwitter');
          vm.isSocialMedia = true;
          vm.descLabel = "Tweet";
          vm.isApprovable = true;
          break;
        case shuri_enums.touchprimitive.event:
          globals.setHelpView('touch_editEvent');
          vm.showEndDate = true;
          break;
        case shuri_enums.touchprimitive.meeting:
          globals.setHelpView('touch_editMeeting');
          break;
        case shuri_enums.touchprimitive.mediacapture:
          vm.isCapturedMedia = true;
          globals.setHelpView('touch_editMediaCapture');
          break;
        default:
          globals.setHelpView('touch_edit');
          break;
      }
    };

    vm.allDay = function () {
      vm.allDayOn == true ? vm.allDayOn = false : vm.allDayOn = true;
      if (!vm.allDayOn) {
        vm.jsDateStart = RoundDate(new Date(), 1);
        vm.touch.dateEnd = null;
      }
      vm.isDirty = true;
    }
    vm.isScheduledChanged = function (isScheduled) {
      vm.touch.isScheduled = isScheduled;
      vm.touchChanged();
    }
    vm.touchChanged = function () { vm.isDirty = true; }

    //#region Calendar Syncing
    vm.unsync = function () {
      //is this an existing sync?
      var docs = $filter("filter")(vm.touch.documents, function (doc) {
        return doc.userType_Id == appGlobals.guidDocCalSync;
      });
      console.log(docs);

      if (docs && docs.length > 0 && docs[0].id != appGlobals.guidEmpty) {
        var confirmPopup = $ionicPopup.confirm({
          title: 'OK to Unsync?',
          template: "Stop syncing this to " + vm.preferences.calsync + "?"
        });
        confirmPopup.then(function (res) {
          if (res) {
            dataApi.unsyncTouch(vm.touch.id).then(function (data) {
              vm.calendar = null;
              vm.isSynced = false;
              if (vm.docCalSync.value && vm.docCalSync.value != "") {
                var appt = angular.fromJson(vm.docCalSync.value);
                vm.docCalSync = null;
                if (isTouchSyncable()) globals.deleteAppointment(appt);
              }
            });
          }
        });
      }
      else vm.isSynced = false;

      vm.calendar = null;
    }

    function isTouchSyncable() {
      var result = false;
      if (vm.preferences.calsync) {
        if (ionic.Platform.isIOS() && vm.preferences.calsync == "ios") result = true;
        else if (ionic.Platform.isAndroid() && vm.preferences.calsync == "android") result = true;

      }
      return result;
    }

    //function postSyncDoc() {
    //    dataApi.postEntity("Documents", "document", vm.docCalSync).then(function (docId) {
    //        dataApi.postRelation(6, vm.touch.id, 1, docId, false).then(function (data) {
    //            //console.log("Sync doc posted");
    //        })
    //    });
    //}

    vm.calsyncChanged = function () {
      vm.isSynced = (vm.calendar && vm.calendar.name);
      if (vm.isSynced) vm.syncedToName = vm.calendar.name;
    }
    //#endregion

    vm.cancel = function (isDelete) {
      if (tinyMCE) tinyMCE.EditorManager.execCommand('mceRemoveEditor', false, "mceEditor");
      if ($stateParams.returnState) {
        if ($stateParams.returnState.toLowerCase() == "goback" || vm.goBack) {
          //console.log($stateParams.returnState);
          $window.history.back();
        }
        else $state.go($stateParams.returnState);
      }
      else {
        if (isDelete) $ionicHistory.goBack(-2);
        else $state.go('home.touch', { id: vm.touch.id });
      }
    };

    vm.delete = function () {
      var msg = "Delete this touch";
      if (vm.isSynched) msg += " and the synced appointment? <br><br><span class='itemLabel'>If you want to keep the appointment, unsync first.</span>";
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
        vm.cancel(true);
      });
    }

    vm.save = function (action) {
      vm.fileDelete = false;
      vm.photoDelete = false;
      vm.showTouch = false;
      vm.saving = true;
      if (vm.touch.description == null) vm.touch.description = "";

      if (vm.isRecording) vm.toggleTimer();

      //#region validate name
      var errMsg = "";
      if (!vm.touch.name || vm.touch.name.trim() == "") {
        if (vm.isSocialMedia && vm.socialMediaAuthenticated && vm.touch.description != "") {
          vm.touch.name = "Social Media Post: " + vm.touch.description;
          if (vm.touch.name.length > 140) vm.touch.name = vm.touch.name.substring(0, 140);
        }
        else {
          var nameWord = "Name";
          if (vm.isTrackedEmail) nameWord = "Subject";

          vm.isDirty = false;
          globals.showAlert("Unable to continue...", nameWord + " is required.");
          vm.showTouch = true;
          vm.saving = false;
          return;
        }
      }
      //#endregion

      //if (vm.isTrackedEmail && vm.touch.descriptDoc_Id === appGlobals.guidEmpty && !vm.usingTemplate && tinyMCE.activeEditor) vm.touch.description = tinyMCE.activeEditor.getContent();


      //Prep the date/times -------
      var tchStart = moment(vm.jsDateStart);
      var tchEnd = moment(vm.jsDateEnd);
      //console.log(tchEnd, tchStart);

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

      vm.touch.dateStart = tchStart.toISOString();
      vm.touch.dateEnd = tchEnd.toISOString();

      //console.log(vm.touch);

      if (vm.isSchedulable) {
        if (vm.touch.isScheduled) vm.touch.dateSchedule = vm.jsDateSchedule.toISOString();
        else vm.touch.dateSchedule = null;
      }

      //#region Timed Meeting
      if (vm.isTimed) {

        if (vm.docDuration) {
          vm.docDuration.changeType = shuri_enums.changetype.update;
          vm.docDuration.userType_Id = appGlobals.utConstants.doc_duration;
          vm.docDuration.value = vm.elapsedTime;
        }
        else {
          var docDur = new shuri_document();
          docDur.name = 'Duration';
          docDur.changeType = shuri_enums.changetype.update;
          docDur.userType_Id = appGlobals.utConstants.doc_duration;
          docDur.value = vm.elapsedTime;
          vm.touch.documents.push(docDur);
        }

        vm.touch.dateEnd = moment().utc().toISOString();

      }
      //#endregion

      if (action != "sendNow") postTouch(action);
      else {
        //#region SendNow
        if (vm.isTrackedEmail) {
          vm.saving = false;

          var confirmPopup = $ionicPopup.confirm({
            title: 'Send Immediately?',
            template: 'You are about to send this tracked email.  Continue?'
          });
          confirmPopup.then(function (res) {
            if (!res) {
              vm.showTouch = true;
              vm.saving = false;
              return;
            }
            else {
              $ionicLoading.show({ template: 'Sending...' });
              postTouch(action);
            }
          });
        }
        else if (vm.isSocialMedia) {
          vm.saving = false;
          var confirmPopup = $ionicPopup.confirm({
            title: 'Send Immediately?',
            template: "You are about to post this message. Continue?"
          });
          confirmPopup.then(function (res) {
            if (!res) {
              vm.showTouch = true;
              vm.saving = false;
              return;
            }
            else {
              var image = '';
              var company = {};
              for (var i = 0; i < vm.touch.documents.length; i++) {
                if (vm.touch.documents[i].userType_Id == appGlobals.utConstants.doc_file && vm.touch.documents[i].value.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
                  console.log(vm.touch.documents[i].value);
                  image = vm.touch.documents[i].value;
                  break;
                }
              }
              if (vm.addTwitter && image != '') {
                connectedService.twitter.postMediaData(image).then(function (image_id) {
                  connectedService.postSocialMedia(vm.touch.description, { fb: vm.addFacebook, tw: vm.addTwitter, li: vm.addLinkedin }, image_id.media_id_string, image, company).then(function (data) {
                    if (data) {
                      alert('Your post was submitted successfully');
                      postTouch(action);
                    }
                  }, function (err) {
                    vm.showTouch = true;
                  });
                });
              } else {
                if (vm.linkedinAs) {
                  company.li = {};
                  company.li.selected = vm.linkedinAs.selected;
                }
                connectedService.postSocialMedia(vm.touch.description, { fb: vm.addFacebook, tw: vm.addTwitter, li: vm.addLinkedin }, '', image, company).then(function (data) {
                  console.log(data);
                  if (data) {
                    alert('Your post was submitted successfully');
                    postTouch(action);
                  }
                }, function (err) {
                  vm.showTouch = true;
                });
              }
              //console.log("posting a touch", vm.touch);
            }
          });
        }
        //#endregion
      }

    };

    function postTouch(action) {
      if (vm.isSocialMedia) {
        var obj = { description: vm.touch.description, fb: vm.addFacebook, tw: vm.addTwitter, li: vm.addLinkedin };
        vm.touch.description = angular.toJson(obj);
      }
      else if (vm.isCapturedMedia) {
        vm.touch.description = angular.toJson(vm.touch.captured);
      }

      //console.log(vm.touch);
      dataApi.postTouch(vm.touch, action, shuri_enums.entitytypes.touch).then(
        function (data) {
          vm.showTouch = true;
          vm.touch.id = data;

          //Calendar Sync Doc  
          if (vm.isSynced) {
            var calname = "";
            if (vm.calendar && vm.calendar.name) calname = vm.calendar.name;
            dataApi.updateTouchLastSync(vm.touch.id, calname, vm.preferences.calsync).then(function (data) {
              //console.log("updateTouchLastSync ", vm.touch.id, calname, vm.preferences.calsync);

            });
          }

          vm.saving = false;

          $ionicLoading.hide();
          if (action == "test") {
            $ionicLoading.show({ template: "Test has been sent.", duration: 2500 });
            vm.typeChanged(false);
          }
          else vm.cancel();

        }, function (err) {
          console.error(err);
          vm.saving = false;

          vm.showTouch = true;
          $ionicLoading.hide();
          vm.cancel();

        });
    };


    //#region Approvals


    vm.setApprovalPermission = function (makedirty) {
      vm.mayApprove = false;
      if (vm.showApproval && vm.objApprove.teamId && vm.objApprove.teamId != appGlobals.guidEmpty) {
        dataApi.isUserInTeam(vm.objApprove.teamId).then(function (data) {
          vm.mayApprove = (data.toLowerCase() === "true");
          if (makedirty) vm.isDirty = true;
        });

      }

    }
    vm.approveChange = function () {
      vm.isDirty = true;
      vm.objApprove.approvedBy = "";
      if (vm.objApprove.isApproved) {
        dataApi.getAppUser().then(function (data) {
          vm.appUser = data;
          vm.objApprove.approvedBy = vm.appUser.name;
        });
      }
    };

    //#endregion

    //#region Timed Meeting
    function incrementTimer() {
      if (isNaN(vm.elapsedTime)) vm.elapsedTime = 0;
      vm.elapsedTime = parseInt(vm.elapsedTime) + 1;
    };

    vm.toggleTimer = function () {
      vm.isRecording = !vm.isRecording;
      if (vm.isRecording) {
        vm.isDirty = true;
        vm.timer = $interval(incrementTimer, 1000);
      }
      else {
        $interval.cancel(vm.timer);

      }
    }

    vm.resetTimer = function () {
      $interval.cancel(vm.timer);
      vm.elapsedTime = 0;
      vm.isRecording = false;
    };

    //#endregion

    //#region Location
    vm.addLocation = function () {
      // if (window.cordova) {

      var geocoder = new google.maps.Geocoder();
      if (geocoder) {
        vm.showMap = true;
        var posOptions = { timeout: 10000, enableHighAccuracy: false };
        $cordovaGeolocation
          .getCurrentPosition(posOptions)
          .then(function (pos) {
            navigator.geolocation.getCurrentPosition(function (pos) {
              var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
              console.log(pos.coords.latitude);
              geocoder.geocode({ 'latLng': latlng }, function (results, status) {
                vm.googleLoc = results[0];
                if (status == google.maps.GeocoderStatus.OK) {
                  vm.locAddress = vm.googleLoc.formatted_address;
                  vm.hasLocation = true;
                  var mapOptions = {
                    center: latlng,
                    zoom: 13,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                  };
                  var map = new google.maps.Map(document.getElementById("mapcanvas"), mapOptions);

                  var theLoc = new google.maps.Marker({
                    position: latlng,
                    map: map,
                    title: vm.googleLoc.formatted_address
                  });
                }
                else {
                  var tmplt = String.format("Status: {0}<br />Results: {1}", status, results);
                  globals.showAlert('Geocoding failed', tmplt);
                }
              });
            });
          }, function (err) {
            var tmplt = String.format("err: {0}", err);
            globals.showAlert('$cordovaGeolocation failed', tmplt);
          });
      }
      // }
      // else globals.showAlert("Add Current Location", "Requires Device w/ GPS");

    };

    vm.openModal = function () {
      vm.newLocTitle = vm.wordFor('Location');
      $ionicModal.fromTemplateUrl('modalLoc.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.modal = modal;
        vm.modal.show();
      });
    };

    vm.closeModal = function () {
      vm.locSaved = false;
      vm.modal.hide();
      vm.modal.remove();
    };

    vm.resolveAddress = function () {
      var geocoder = new google.maps.Geocoder();
      if (geocoder) {
        if (vm.locAddress != "") {
          vm.showMap = true;
          vm.addressToResolve = false;
          geocoder.geocode({ 'address': vm.locAddress }, function (results, status) {
            vm.googleLoc = results[0];

            if (vm.location && vm.location.address == vm.googleLoc.formatted_address) vm.noChange = true;

            //fix weird timing thing
            $timeout(function () { vm.locAddress = vm.googleLoc.formatted_address; }, 1500);

            if (status == google.maps.GeocoderStatus.OK) {
              var lat = results[0].geometry.location.lat()
              var lng = results[0].geometry.location.lng();
              var theLatlng = new google.maps.LatLng(lat, lng);

              var mapOptions = {
                center: theLatlng,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP
              };
              var map = new google.maps.Map(document.getElementById("mapcanvas"), mapOptions);

              var theLoc = new google.maps.Marker({
                position: theLatlng,
                map: map,
                title: "Location"
              });
            }
            else {
              vm.showMap = false;
              var tmplt = String.format("Status: {0}<br />Results: {1}", status, results);
              globals.showAlert('Geocoding failed', tmplt);
            }
          });
        }
      }
      else (globals.handleError("Unable to access Google Maps"));
    }

    vm.cancelLoc = function () {
      vm.showMap = false;
      if (vm.location) vm.locAddress = vm.location.address;
      else vm.locAddress = "";
    }

    vm.saveLoc = function () {
      if (!vm.googleLoc) globals.showAlert("Error - no google loc found.");
      else {
        var oldLocId = vm.touch.location_Id;
        var loc = new shuri_location();
        loc.address = vm.googleLoc.formatted_address;
        loc.latitude = vm.googleLoc.geometry.location.lat();
        loc.longitude = vm.googleLoc.geometry.location.lng();
        loc.place_Id = vm.googleLoc.place_id;
        loc.userType_Id = appGlobals.utConstants.loc_business;
        vm.locSaved = true;

        for (var i = 0; i < vm.googleLoc.address_components.length; i++) {
          var ac = vm.googleLoc.address_components[i];
          for (var t = 0; t < ac.types.length; t++) {
            switch (ac.types[t]) {
              case "country":
                loc.country = ac.long_name;
                break;
              case "postal_code":
                loc.postal = ac.long_name;
                break;
            }
          }
        }

        //save this location and put the id into the touch
        dataApi.postEntity("Locations", "location", loc, vm.subId).then(function (data) {
          vm.cancelLoc();
          vm.location = data;
          vm.touch.location_Id = vm.location.id;
          vm.locAddress = vm.location.address;
          vm.isDirty = true;
          vm.hasLocation = true;
          // console.log(vm.locAddress);
        });
      }
    }

    var newDelete = true;
    var documentsClone = [];
    vm.removeItem = function (item, index) {
      // console.log(item);
      // console.log(index);
      item.changeType = 2;
      if (newDelete === true) {
        for (var i = 0; i < vm.touch.documents.length; i++) {
          documentsClone.push(vm.touch.documents[i]);
        }
        newDelete = false;
        vm.touch.documentsClone = documentsClone;
      }
      vm.touch.documents.splice(index, 1);
      vm.isDirty = true;
      // console.log(vm.touch);
    };

    vm.deleteFile = function (doc) {
      doc.changeType = 2;
      vm.isDirty = true;
    }

    vm.deletePhoto = function (doc) {
      doc.changeType = 2;
      vm.isDirty = true;
    }

    //#endregion

    vm.getDateStart = function () {
      vm.dateStartFocus();
      var ipObj1 = {
        callback: function (val) {  //Mandatory 
          var newdate = moment(val);
          var dt = moment(vm.jsDateStart);
          newdate.set("hour", dt.hour());
          newdate.set("minute", dt.minute());
          vm.jsDateStart = newdate.toDate();
          vm.adjustEndDate();
          vm.isDirty = true;
        },
        inputDate: vm.jsDateStart,      //Optional 
        //templateType: 'popup'       //Optional 
      };

      ionicDatePicker.openDatePicker(ipObj1);
    }

    vm.getDateEnd = function () {
      var ipObj2 = {
        callback: function (val) {  //Mandatory 
          var newdate = moment(val);
          var dt = moment(vm.jsDateEnd);
          newdate.set("hour", dt.hour());
          newdate.set("minute", dt.minute());
          vm.jsDateEnd = newdate.toDate();
          vm.isDirty = true;
        },
        inputDate: vm.jsDateEnd,      //Optional 
      };

      ionicDatePicker.openDatePicker(ipObj2);
    }


    //#region Settings Modal
    vm.openSettings = function () {
      $ionicModal.fromTemplateUrl('templates/modals/settingsTouches.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function (modal) {
        vm.settingsModal = modal;
        vm.settingsModal.show();
      });

    }
    vm.setPref = function (name, value) {
      dataApi.postUserPreference(name, value, true).then(function (data) {
        //nothing to do?
      });
    }
    vm.closeSettings = function () {
      vm.settingsModal.hide();
      vm.settingsModal.remove();
      vm.settingsModal = null;
    }


    //#endregion


    $scope.$on('$ionicView.enter', function () {
      vm.touch = null;
      vm.attributeName = "Name";
      vm.attributeName = "Name";
      vm.attributeDesc = "Description";
      vm.attachmentType = "";
      vm.dateInputType = "date";

      vm.onDesktop = !(window.cordova);
      vm.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
      vm.isWide = (window.innerWidth >= appGlobals.widthMedium);
      vm.mayUpdateFS = (vm.isWide || vm.onDesktop);

      vm.elapsedTime = 0;
      vm.isRecording = false;
      vm.maxTweetChars = 140;
      vm.newUt = "Add New";
      vm.sendNow = false;
      vm.title = "Edit Touch";
      vm.tweetChars = 0;
      vm.files = [];
      vm.dictText = vm.dictOrig = "";
      vm.textareaRows = globals.textareaRows();
      vm.guidEmpty = appGlobals.guidEmpty;
      vm.isTrackedEmail = false;

      $ionicScrollDelegate.scrollTop();
      vm.objApprove = { teamId: appGlobals.guidEmpty, isApproved: false, approvedBy: '', required: false };

      dataApi.initialize("").then(function (d) {
        vm.appUser = d.appUser;
        vm.collId = appGlobals.guidEmpty;
        if ($stateParams.collectionId) vm.collId = $stateParams.collectionId;
        if (vm.collId === appGlobals.guidEmpty) vm.collId = vm.appUser.defaultCollection_Id;
        vm.refreshData();
      });

    });

    //$scope.$on("EntityCountDecremented", function (event, parentId, entityType, entityIdOrName) {
    //  console.log(vm.touch);
    //});
  }

})();
