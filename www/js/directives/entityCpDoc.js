(function () {
  'use strict';

  angular.module("shuriApp").directive('entityCpDoc', ['$state', '$rootScope', '$stateParams', '$ionicPopover', '$ionicPopup', '$ionicModal', '$ionicScrollDelegate', 'ionicDatePicker', '$timeout', '$filter', '$window', 'globals', 'dataApi', 'appGlobals',
    function ($state, $rootScope, $stateParams, $ionicPopover, $ionicPopup, $ionicModal, $ionicScrollDelegate, ionicDatePicker, $timeout, $filter, $window, globals, dataApi, appGlobals) {
      return {
        restrict: "E",
        scope: {
          entity: '=',
          forUpdate: '=',
          manageUpdates: '=',
          mode: '@',  //custom, bar, or builtin
          isDirty: '='
        },
        templateUrl: "templates/directives/entityCpDoc.html?" + _cacheBuster,
        link: function (scope, element, attrs) {
          scope.isShort = (window.innerHeight < 700);
          scope.isWide = (window.innerWidth >= appGlobals.widthMedium);
          scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
          scope.isMedium = (!scope.isWide && !scope.isNarrow);
          scope.onDesktop = !(window.cordova);
          //console.log(scope.onDesktop);
          // scope.timeZoneName = (Intl) ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
          scope.collapseThreshold = 5;
          scope.isOnEdit = ($state.current.name.toLowerCase().indexOf('edit') >= 0);
          scope.textareaRows = globals.textareaRows();

          scope.wordFor = function (word) { return globals.wordFor(word); };

          //#region Watchers
          var watcherE = scope.$watch('entity', function () {
            if (typeof scope.entity === "undefined" || scope.entity === null) return;
            AssignUI();
          });

          var watcherC = scope.$watch('mode', function () {
            if (scope.mode === undefined) return;
            if (scope.mode != "custom" && scope.mode != "builtin" && scope.mode != "bar") console.error("Invalid mode");
            AssignUI();
          });

          var watcherI = scope.$watch('forUpdate', function () {
            if (scope.forUpdate === undefined) return;
            scope.forUpdate = (scope.forUpdate === true || scope.forUpdate === "true");
            scope.forUpdateSet = true;
            if (scope.forUpdate) {
              dataApi.getTimezones().then(function (data) {
                //console.log(data);
                scope.timezones = data;
                AssignUI();
              });

            }
            else AssignUI();
          });

          var watcherMU = scope.$watch('manageUpdates', function () {
            if (typeof scope.manageUpdates === "undefined") return;
            scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");

          })
          //#endregion

          //#region UI
          function AssignUI() {
            scope.isInitialized = false;
            if (!scope.entity || !scope.mode || !scope.forUpdateSet) return;
            //console.log(scope.entity, scope.mode, scope.forUpdateSet);
            scope.isCustom = (scope.mode === "custom");
            dataApi.initialize().then(function (data) {
              scope.appUser = data.appUser;
              scope.userTypes = data.usertypes;
              dataApi.getUserPreferences().then(function (data) {
                scope.preferences = data;
                //console.log(data);
                //#region customize
                var currState = $state.current.name;
                if (currState.indexOf("person") > -1) {
                  scope.entityType = 4;
                  scope.customCSSLabel = "itemLabel energized";
                  scope.customCSSBG = "bgEnergized";
                  scope.itemColor = "item-energized";
                }
                else if (currState.indexOf("touch") > -1) {
                  scope.entityType = 6;
                  scope.customCSSLabel = "itemLabel balancedBright";
                  scope.customCSSBG = "bgBalanced";
                  scope.itemColor = "item-balanced";
                }
                else if (currState.indexOf("org") > -1) {
                  scope.entityType = 2;
                  scope.customCSSLabel = "itemLabel calm";
                  scope.customCSSBG = "bgCalm";
                  scope.itemColor = "item-calm";
                }
                else console.log("Unhandled state", currState);
                //#endregion

                //#region CPs
                scope.entity.contactPoints.forEach(function (cp) {
                  cp.original = cp.name; //track changes w/original
                  cp.entityType = 0;
                  if (cp.name != "") {
                    cp.isBar = true;
                    switch (cp.primitive) {
                      case shuri_enums.contactpointprimitive.email:
                        cp.sorter = 2;
                        cp.linkUrl = "mailto:" + cp.name;
                        cp.icon = 'ion-email';
                        cp.title = "Email to: " + cp.name + ' \n' + cp.typename;
                        break
                      case shuri_enums.contactpointprimitive.phone:
                        if (scope.onDesktop) cp.isBar = false;
                        else {
                          cp.sorter = 1;
                          cp.linkUrl = "tel:" + cp.name;
                          cp.icon = 'ion-ios-telephone';
                          cp.title = "Call " + cp.name + ' \n' + cp.typename;
                        }
                        break
                      default:
                        switch (cp.userType_Id) {
                          case appGlobals.utConstants.cp_twitterUsername:
                            cp.sorter = 3;
                            cp.linkUrl = (cp.name.toLowerCase().indexOf('http') >= 0) ? cp.name : 'https://twitter.com/' + cp.name;
                            cp.icon = 'ion-social-twitter';
                            cp.title = "View Twitter posts";
                            break
                          case appGlobals.utConstants.cp_linkedInUrl:
                            cp.sorter = 3;
                            cp.linkUrl = cp.name;
                            cp.icon = 'ion-social-linkedin';
                            cp.title = "View LinkedIn page";
                            break
                          case appGlobals.utConstants.cp_facebookUsername:
                            cp.sorter = 3;
                            cp.linkUrl = (cp.name.toLowerCase().indexOf('http') >= 0) ? cp.name : 'https://www.facebook.com/' + cp.name;
                            cp.icon = 'ion-social-facebook';
                            cp.title = "View Facebook page";
                            break
                          case appGlobals.utConstants.cp_blog:
                            cp.sorter = 4;
                            cp.linkUrl = cp.name;
                            cp.icon = 'ion-social-rss';
                            cp.title = "View Blog at " + cp.name;
                            break
                          case appGlobals.utConstants.cp_homePageUrl:
                            cp.sorter = 4;
                            cp.linkUrl = cp.name;
                            cp.icon = 'ion-ios-home';
                            cp.title = "View home page";
                            break
                          case appGlobals.utConstants.cp_employeeUrl:
                            cp.sorter = 4;
                            cp.linkUrl = cp.name;
                            cp.icon = 'ion-information-circled';
                            cp.title = "View analyst bio on firm's web site";
                            if (scope.entityType == 2) cp.title = "View firm's analyst directory";
                            break
                          case appGlobals.utConstants.cp_wikipediaPage:
                            cp.sorter = 4;
                            cp.linkUrl = cp.name;
                            cp.icon = 'shuri-wikipedia';
                            cp.title = "View Wikipedia entry";
                            break
                          default:
                            if (cp.primitive === shuri_enums.contactpointprimitive.url) {
                              cp.sorter = 4;
                              cp.linkUrl = cp.name;
                              cp.icon = 'ion-android-open';
                              cp.title = "Browse to " + cp.name + ' \n' + cp.typename;

                            }
                            else {
                              console.error("Unhandled userType for CPBar", cp, appGlobals.utConstants);
                              cp.isBar = false;
                            }
                            break;
                        }
                        break;
                    }
                  }

                });
                //#endregion

                if (scope.mode === "bar") $timeout(SetBarUI, 10);
                else {
                  var cntTA = 0;

                  //#region Docs
                  scope.entity.documents.forEach(function (doc) {
                    doc.original = doc.value;
                    doc.entityType = 1;
                    doc.omitView = false;
                    //console.log(doc.name, doc);
                    if (!doc.value && !scope.forUpdate) doc.omitView = true;
                    else if (doc.collection_Id && doc.collection_Id.toUpperCase() == appGlobals.guidSystem) doc.omitView = true;
                    else {
                      switch (doc.primitive) {
                        case shuri_enums.documentprimitive.customdate:
                          //defaults
                          doc.dateFormatDisplay = "shortDate";
                          doc.dateFormatInput = "YYYY-MM-DD";
                          doc.jsDate = new Date(doc.value);

                          if (doc.value) {
                            var momDt = moment(doc.jsDate);
                            if (!momDt.isValid()) {
                              doc.omitView = !scope.forUpdate;
                              doc.value = "";
                            }
                            else {
                              if (IsMidnight(doc.value)) {
                                //date saved without time
                                momDt.subtract(moment().utcOffset(), "minutes");
                                doc.jsDate = momDt.toDate();
                                doc.dateFormatDisplay = "shortDate";
                                doc.dateFormatInput = "YYYY-MM-DD";
                                doc.noTime = true;
                              }

                              if (!window.cordova) doc.inputDate = momDt.format(doc.dateFormatInput);
                              else doc.inputDate = doc.jsDate;

                              doc.original = doc.inputDate;
                            }
                          }
                          break;
                        case shuri_enums.documentprimitive.ratingyesno:
                        case shuri_enums.documentprimitive.ratingyesnomaybe:
                          if (doc.value.toString().trim() != "") doc.value = parseInt(doc.value);
                          if (!scope.forUpdate && doc.value == 0) doc.omitView = true;
                          break;
                        case shuri_enums.documentprimitive.custombinary:
                          doc.value = (doc.value && doc.value.toString().toLowerCase() === "true");
                          doc.deletable = (doc.updatable && scope.entity.updatable && scope.manageUpdates);
                          break;
                        case shuri_enums.documentprimitive.customint:
                          doc.value = parseInt(doc.value.toString());
                          break;
                        case shuri_enums.documentprimitive.customfloat:
                          doc.value = parseFloat(doc.value.toString());
                          break;
                        case shuri_enums.documentprimitive.customlongtext:
                          //get open/close pref
                          var prefname = "hideTA_" + doc.typename.replaceAll(" ", "");
                          if (scope.preferences[prefname]) doc.hide = (scope.preferences[prefname] === "true");
                          doc.htmlId = "taCpDoc_" + globals.uniqueCnt();
                          doc.mayUpdate = (!window.cordova && scope.entity.updatable);

                          SetTAScrollHeight(doc);
                          break;
                      }
                    }

                  });
                  //#endregion

                  $timeout(SetCustomUI, 10);

                  scope.isInitialized = true;

                }

              });

            });

          }

          function SetTAScrollHeight(item, delay) {
            var maxHeight = parseInt(window.innerHeight / 3);
            var timeDelay = 400;
            if (delay) timeDelay = delay;

            $timeout(function () {
              var ta = document.getElementById(item.htmlId);
              if (ta && ta.scrollHeight) {
                var sh = ta.scrollHeight;
                if (sh > maxHeight) sh = maxHeight;
                else if (!scope.adjustOnce) {
                  scope.adjustOnce = 20;
                  sh += scope.adjustOnce;
                }

                item.taHeight = sh + "px";
              }
              //else console.error("No htmlId" + item.htmlId);


            }, timeDelay);

          }

          function SetBarUI() {
            scope.barItems = $filter('filter')(scope.entity.contactPoints.slice(0), function (item) { return item.isBar; });

            scope.barItems.forEach(function (item) {
              item.isCustom = false;
              var matchOne = $filter('filter')(scope.userTypes, function (u) { return u.id == item.userType_Id; });
              if (matchOne.length > 0) {
                var usertype = matchOne[0];
                item.isCustom = (usertype.collection_Id != appGlobals.guidARDB && usertype.collection_Id != appGlobals.guidTechInvestorsDB && usertype.collection_Id != appGlobals.guidEmpty);
              }
              if (item.isCustom) item.sorter += 100;
              else item.sorter += 200;
            });

            //add edit?
            if (scope.entity.updatable) {
              var editCp = new shuri_contactPoint();
              editCp.name = "Edit";
              editCp.title = "Edit " + scope.entity.name;
              editCp.sorter = 0;
              editCp.icon = 'ion-edit';
              scope.barItems.unshift(editCp);
            }

            //favorite
            var favCp = new shuri_contactPoint();
            favCp.name = "Favorite";
            favCp.title = "Favorite " + scope.entity.name;
            if (scope.entity.isFavorite) favCp.title = "Unfavorite " + scope.entity.name;
            favCp.sorter = 9999;
            favCp.icon = (scope.entity.isFavorite) ? "ion-ios-star" : "ion-ios-star-outline";
            scope.barItems.push(favCp);

            //order them
            //scope.barItems = $filter('orderBy')(scope.barItems, ["primitive", "typename"]);

            //scope.isScroll = false;

            //if (scope.barItems.length > 9) scope.isScroll = true;
            //else if (scope.barItems.length > 7 && !scope.isWide) scope.isScroll = true;
            //else if (scope.barItems.length > 5 && scope.isNarrow) scope.isScroll = true;

            var width = scope.barItems.length * 42;
            scope.isScroll = width > window.innerWidth;
            scope.cpBarWidth = "100%";
            if (scope.isScroll) scope.cpBarWidth = width.toString() + "px";
            //console.log(scope.barItems, scope.cpBarWidth);

            //if (scope.isWide) scope.buttonPaddingCPBar = "padding-left: 12px !important;padding-right: 12px !important;";
            //else if (scope.isMedium) scope.buttonPaddingCPBar = "padding-left: 6px !important;padding-right: 6px !important;";
            //else scope.buttonPaddingCPBar = "padding-left: 0px !important;padding-right: 0px !important;";


          }

          function SetCustomUI() {

            var filteredCPs = $filter('filter')(scope.entity.contactPoints, function (item) {
              if (!item.name && !scope.forUpdate) return false;

              var matchOne = $filter('filter')(scope.userTypes, function (u) { return u.id == item.userType_Id; });
              if (matchOne.length > 0) {
                var usertype = matchOne[0];
                return (scope.isCustom == (usertype.collection_Id != appGlobals.guidARDB && usertype.collection_Id != appGlobals.guidTechInvestorsDB && usertype.collection_Id != appGlobals.guidEmpty));
              }
              else return false;

            });
            filteredCPs.forEach(function (cp) { cp.entityType = 0; });

            scope.filteredItems = $filter('filter')(scope.entity.documents, function (item) {
              if (item.omitView || item.primitive === 13) return false;

              var matchOne = $filter('filter')(scope.userTypes, function (u) { return u.id == item.userType_Id; });
              if (matchOne.length > 0) {
                var usertype = matchOne[0];
                return (scope.isCustom == (usertype.collection_Id != appGlobals.guidARDB && usertype.collection_Id != appGlobals.guidTechInvestorsDB && usertype.collection_Id != appGlobals.guidEmpty));

              }
              else return false;

            });
            scope.filteredItems.forEach(function (doc) { doc.entityType = 1; });

            scope.filteredItems.push.apply(scope.filteredItems, filteredCPs);
            scope.customLabel = "";

            scope.filteredItems = $filter("orderBy")(scope.filteredItems, "typename");
            scope.filteredItems.forEach(function (i) { scope.customLabel += i.typename + ", "; });


            //timezone
            if (!scope.isCustom) {
              //console.log("Items: ", scope.filteredItems, scope, appGlobals.utConstants);
              var tzDocs = $filter('filter')(scope.entity.documents, function (doc) {
                return (doc.userType_Id == "3e89f4e8-37fe-4cad-b78f-de1b7b434d48" && (doc.value || scope.forUpdate));
              });
              //console.log(scope.userTypes, tzDocs[0], tzDocs.length,tzDocs.id);
              if (tzDocs.length > 0 || tzDocs.id) {
                //timezones & current time
                tzDocs[0].isTimeZone = true;
                tzDocs[0].primitive = -99;
                if (tzDocs[0].value) {
                  dataApi.getTimeInZone(tzDocs[0].value).then(function (data) {
                    var dt = SQLDate2JS(data)
                    scope.currentTime = dt;
                    //console.log(tzDocs, scope.filteredItems);
                  });

                }
              }
            }

            //----------Open/close pref
            if (scope.filteredItems.length > scope.collapseThreshold) {
              scope.hideItemsPref = String.format("cpDoc_hideItems_{0}_{1}", scope.entityType, ((scope.isCustom) ? "Custom" : "Builtin"));
              dataApi.getUserPreference(scope.hideItemsPref).then(function (pref) { if (pref) scope.hideItems = (pref === "true"); })
              //console.log(scope.hideItemsKey, sessionStorage.getItem(scope.hideItemsKey))
            }

            //if (window.cordova) window.cordova.plugins.Keyboard.disableScroll(!scope.isOnEdit);

            //console.log("Items: ", scope.filteredItems, scope.customLabel);

          }
          //#endregion

          //#region CP Bar Events
          function delayEdit(state, params) {
            if (!scope.goingEdit) {
              scope.goingEdit = true;
              $timeout(function () {
                $state.go(state, params);
                scope.goingEdit = false;
            }, 400)

            }

          }

          scope.cpClicked = function (cp) {
            switch (cp.name.toLowerCase()) {
              case "edit":
                if (scope.appUser.licenseStatus == 0) {
                  if ($state.current.name == 'home.person') {
                    if (scope.appUser.licenseStatus == shuri_enums.licensestatus.grace) checkLicense(shuri_enums.entitytypes.person, "person");
                    else delayEdit('home.personEdit', { personId: scope.entity.id });
                  }
                  else if ($state.current.name == 'home.org') {
                    if (scope.appUser.licenseStatus == shuri_enums.licensestatus.grace) checkLicense(shuri_enums.entitytypes.group, "organization");
                    else delayEdit('home.orgEdit', { groupId: scope.entity.id });
                  }
                  //else console.log("Unhandled state: ", $state.current.name);
                }

                break;
              case "favorite":
                scope.entity.isFavorite = !(scope.entity.isFavorite)
                if (scope.entity.isFavorite) {
                  dataApi.addFave(scope.entity.id, scope.entitytype).then(function (data) {
                    assignUI();
                  });
                }
                else {
                  dataApi.removeFave(scope.entity.id, scope.entityType).then(function (data) {
                    assignUI();
                  });
                }
                break;
              default:
                var url = cp.linkUrl;
                var win;

                if (url.indexOf('http') >= 0) {
                  if (window.cordova) win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
                  else win = window.open(url, '_blank');
                }
                else if (url.indexOf('mailto:') >= 0 || url.indexOf('tel:') >= 0) {
                  location.href = url;
                }
                else {
                  if (window.cordova) win = window.open("http://" + url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
                  else win = window.open("http://" + url, '_blank');
                }
                break;
            }
          }

          scope.showPopup = function (evt, cp) {
            scope.pop = { title: cp.title };

            $ionicPopover.fromTemplateUrl('entityCpDocPOP.html', {
              scope: scope,
            }).then(function (popover) {
              scope.popover = popover;
              scope.popover.show(evt);
              //if (evt && evt != null) evt.stopPropagation();
            });
          }

          scope.hidePopup = function () {
            //                $timeout.cancel(scope.popoverTimer);
            scope.popover.hide();
            scope.popover.remove();
          }

          function checkLicense(et, str) {
            var confirmPopup = $ionicPopup.confirm({
              title: "Edit Disabled",
              template: 'You are over your licensed entity storage. Would you like to delete this ' + str + '?',
              okText: "Delete",
              okType: "button-assertive"
            });
            confirmPopup.then(function (res) {
              if (res) {
                dataApi.deleteEntity(scope.entity.id, et).then(function (data) {
                  $state.go('home.main');
                });
              }
            });
          }


          //#endregion
          
          scope.toggleOpenTA = function (item) {
            item.hide = !item.hide;
            var prefname = "hideTA_" + item.typename.replaceAll(" ", "");
            dataApi.postUserPreference(prefname, item.hide.toString(), false);
            SetTAScrollHeight(item, 10);
         }

          //#region ForUpdate events
          scope.toggleOpen = function () {
            scope.hideItems = !scope.hideItems;
            dataApi.postUserPreference(scope.hideItemsPref, scope.hideItems.toString(), false);
          }

          scope.openLink = function (item, linkType) {
            var url = item.name;
            switch (linkType) {
              case "mailto":
              case "tel":
                url = linkType + ":" + url;
                window.location.href = url;
                break;
              case "url":
                var target = "_blank";
                if (!url) {
                  switch (item.typename) {
                    case "Employee Url":
                      url = "https://www.google.com/#q=employee+list+about+us+" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name);
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "Blog":
                      url = "https://www.google.com/#q=blog+" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name);
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "Home Page Url":
                      url = "https://www.google.com/#q=home+page+" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name);
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "LinkedIn Url":
                      url = "https://www.linkedin.com/vsearch/p?type=people&keywords=" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name) + "&pageKey=voltron_people_search_internal_jsp&search=Search";
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "Facebook Username":
                      url = "https://www.facebook.com/search/str/" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name) + "/keywords_users";
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "Twitter Username":
                      url = "https://twitter.com/search?src=typd&q=" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name);
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    case "Wikipedia Page":
                      url = "https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent((scope.entity.lastname) ? scope.entity.firstname + " " + scope.entity.lastname : scope.entity.name) + "&go=Go";
                      var listener = function (event) { item.name = event.url; scope.$apply(); dirtyize(item); };
                      break;
                    default:
                      break;
                  }
                }
                if (url.toLowerCase().indexOf("//") == -1 && url.toLowerCase().indexOf("\\\\") == -1) url = "http://" + url;
                //console.log(url);
                if (listener) target = "win1";

                if (window.cordova) var win = window.open(url, target, 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
                else var win = window.open(url, target);

                if (listener) {
                  win.addEventListener('loadstart', listener);
                  win.addEventListener('exit', function (event) { win.removeEventListener('loadstart', listener); });
                }

                break;
            }
          }

          scope.inputChanged = function (item, validType) {
            var itemText;
            if (item.entityType == 0) itemText = item.name;
            else if (item.inputDate) itemText = item.inputDate;
            else itemText = item.value;
           // console.log(item, validType);
            if (itemText != item.original) {
              dirtyize(item);

              if (validType) {
                item.isInError = false;
                switch (validType) {
                  case "tel":
                    //html5 passthrough
                    item.isInError = !IsValidInput(item.name, validType);
                    break;
                  case "date":
                  case "time":
                    //let html5 take care of it
                    //console.log("input changed", item, itemText, item.original);
                    //console.log(item.inputDate, item.inputDate.length, item.inputDate == "");
                    if (!window.cordova) {
                      item.isInError = (item.inputDate === undefined);
                      if (!item.isInError && item.inputDate != "") {
                        var momDt
                        try {
                          momDt = moment(new Date(item.inputDate));
                          //console.log(momDt, item.value, item.inputDate, new Date(item.inputDate));
                          if (momDt.isValid()) {
                            item.value = momDt.toISOString();
                          }
                          else item.isInError = true;
                        }
                        catch (e) { item.isInError = true; }
                      }

                      else {
                        item.value = "";
                        item.isInError = false;
                      }
                    }
                    else item.value = item.inputDate.toISOString();

                    break;
                  case "autogrow":
                    if (scope.isInitialized) SetTAScrollHeight(item, 10);
                    break;
                  default:
                    var inputText = item.name;
                    if (item.entityType === 1) inputText = item.value;
                    //console.log("input changed", item, itemText, item.original, validType);

                    item.isInError = (inputText === undefined); //ie HTML5 invalidated it

                    //console.log(inputText, item);
                    if (!item.isInError && inputText != "") {
                      if (validType === "url" && inputText && inputText.toLowerCase().indexOf("http") == -1) inputText = "http://" + inputText;

                      item.isInError = !IsValidInput(inputText, validType);
                    }
                    else if (inputText == "") {
                      item.isInError = false;
                    }
                    break;
                }
              }
            }

          }

          scope.setValue = function (doc, val) {
            dirtyize(doc);
            if (val) doc.value = val;
            updateItem(doc);
          }


          scope.blurItem = function (item) {
            //console.log("blur", item);
            if (item.isDirty) updateItem(item, true);
            if (item.rows) item.rows = 3;
          }

          scope.focusItem = function (item) {
            item.rows = 12;
            item.value = item.value;
          }

          scope.pickDate = function (item) {
            var theDate = new Date();
            if (item.value && item.value.length >= 10) theDate = new Date(Date.parse(item.value.substring(0, 10)) + (new Date().getTimezoneOffset() * 60000));
            //console.log(theDate, item.value);
            scope.pickDateItem = item;

            var ipObj1 = {
              callback: function (val) {  //Mandatory 
                var newdate = moment(val);
                //if (!scope.pickDateItem.noTime) {
                //    var dt = moment(scope.pickDateItem.inputDate);
                //    newdate.set("hour", dt.hour());
                //    newdate.set("minute", dt.minute());
                //    scope.pickDateItem.value = newdate.toISOString();
                //}
                //else {
                var sdt = newdate.format("YYYY-MM-DD")
                scope.pickDateItem.value = sdt + "T00:00:00Z";
                //}

                scope.pickDateItem.jsDate = newdate.toDate();
                scope.pickDateItem.inputDate = newdate.format(scope.pickDateItem.dateFormatInput);
                scope.pickDateItem.isDirty = true;
                scope.pickDateItem.isInError = false;
                dirtyize(scope.pickDateItem);
                updateItem(scope.pickDateItem);
                //console.log(scope.pickDateItem.value, scope.pickDateItem.inputDate);
              },
              inputDate: theDate,      //Optional 
            };

            ionicDatePicker.openDatePicker(ipObj1);
          }
          //#endregion

          //scope.focusTextarea = function (elemId) {
          //  //console.log(elem);
          //  var elem = document.getElementById(elemId);
          //  if (elem && elem.innerHTML) {
          //    elem.setSelectionRange(elem.innerHTML.length, elem.innerHTML.length);
          //   // elem.scrollIntoView();
          //  }
          //}
          //#region Fullscreen 

          scope.toggleTextarea = function (item) {
            item.isExpanded = !item.isExpanded;
            item.rows = (item.isExpanded) ? parseInt(scope.textareaRows * 3.5) : scope.textareaRows;
          }


          var _fsOffset = 42;

          scope.openmodalFS = function (event, itemFS) {
            if (event) event.stopPropagation();

            scope.itemFS = itemFS;
            scope.taHeight = (window.innerHeight - _fsOffset).toString() + "px";
            var tmplt = "entityCpDocFS1.html";
            if (scope.onDesktop && !localStorage.getItem("expandUI")) tmplt = "entityCpDocFSDesktop.html";
            console.log(scope.onDesktop, localStorage.getItem("expandUI"));
            $ionicModal.fromTemplateUrl(tmplt, {
              scope: scope,
              //focusFirstInput: true,
              //animation: 'slide-in-up'
            }).then(function (modal) {
              //if (window.cordova) {
              //  $window.addEventListener('native.keyboardshow', scope.keyboardShowHandler);
              //  $window.addEventListener('native.keyboardhide', scope.keyboardHideHandler);
              //}
              scope.modalFS = modal;
              scope.modalFS.show();
              //if (scope.onDesktop) {
              if (scope.isHtml) {
                finishOpenModal();
              }
              else {
                $timeout(function () {
                  var ta = document.getElementById("taEntityCpDoc");
                  ta.focus();
                  ta.setSelectionRange(ta.value.length, ta.value.length);
                  finishOpenModal();
                  //console.log(scope.itemFS, ta.value);
                  //console.log("setFocus");
                });
              }

            });
          }

          function finishOpenModal() {
            if (window.cordova) {
              $timeout(function () {
                scope.taHeight = (window.innerHeight - _fsOffset).toString() + "px";
                if (scope.itemFS.value
                  && (
                    (scope.isShort && scope.itemFS.value.length > 120)
                    ||
                    (scope.isMedium && scope.itemFS.value.length > 300))) {
                  //show the message
                  $timeout(function () {
                    //var ta = document.getElementById("taEntityCpDoc");
                    ////console.log(scope.itemFS, ta.value);
                    //ta.focus();
                    //ta.setSelectionRange(ta.value.length, ta.value.length);

                    scope.showSpaceMessage = true;
                    $timeout(function () { scope.showSpaceMessage = false; }, 2400);
                  }, 100);
                }
              }, 100);
            }

          }

          scope.closeFullscreen = function () {
            if (scope.isDirty) updateItem(scope.itemFS, true);

            var maxHeight = parseInt(window.innerHeight / 3);
            scope.modalFS.hide();
            scope.modalFS.remove();
            var ta = document.getElementById(scope.itemFS.htmlId);
            if (ta) {
              ta.focus();
              ta.setSelectionRange(ta.value.length, ta.value.length);
              var sh = ta.scrollHeight;
              if (sh > maxHeight) sh = maxHeight;
              scope.itemFS.taHeight = sh + "px";
            }
          };


 
          //#endregion

          //#region Private methods
          function updateItem(item, remove) {
            if (!item.isInError) {
              var doDelete, doUpdate;
              var itemText, itemPlural, itemSingle;
              if (item.entityType == 0) {
                itemText = item.name;
                itemPlural = "ContactPoints";
                itemSingle = "contactpoint";
              }
              else {
                if (item.value != null) itemText = item.value.toString();
                itemPlural = "Documents";
                itemSingle = "Document";
              }

              //console.log("item changed", item, itemText, itemText != item.original);
              if (!itemText || itemText != item.original) {
                //console.log("item changed", item, itemText, itemText != item.original);
                if (!itemText && remove) doDelete = true;
                else if (itemText) doUpdate = true;
              }

              if (doUpdate) {
                if (scope.manageUpdates) {
                  dataApi.postEntity(itemPlural, itemSingle, item).then(function (data) {
                    item.isDirty = false;
                    item.original = itemText;
                    if (item.id === appGlobals.guidEmpty) {
                      item.id = data;
                      dataApi.postRelation(scope.entityType, scope.entity.id, item.entityType, data, true).then(function (data) {
                        //console.log("posted new", item, itemSingle);
                      });
                    }
                    //else console.log("posted existing", item, itemSingle);

                  });
                }
              }
              else if (doDelete) scope.deleteItem(item);
              //console.log(doDelete, doUpdate);
            }
          }

          scope.deleteItem = function (item) {
            item.value = null;
            if (scope.manageUpdates) {
              dataApi.deleteEntity(item.id, item.entityType).then(function () {
                //console.log("deleted item ", item, scope.entity.id);
                dataApi.clearCacheItemByEntity(scope.entityType, scope.entity.id);
                item.id = appGlobals.guidEmpty;
                //$rootScope.$broadcast("EntityChanged", scope.entity.id);
              });
            }
            else item.changeType = 2;

            dirtyize(item);
          }

          function dirtyize(item) {
            if (item.changeType != 2) item.changeType = 1;
            item.isDirty = true;
            scope.isDirty = true;
          }


          function IsMidnight(sDate) {
            if (
              sDate.indexOf("T00:00:00Z") > -1
              || sDate.indexOf("T00:00:00.000Z") > -1
            ) return true;
            else return false;
          }
          //#endregion

        }
      }
    }]);
})();
