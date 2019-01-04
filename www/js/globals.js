(function () {
    'use strict';

    angular.module("shuriApp").factory('globals',  [ '$ionicPopup', '$ionicModal', '$window', '$q', '$http', 'dataApi', 'appGlobals', globals]);

    function globals($ionicPopup, $ionicModal, $window, $q, $http, dataApi, appGlobals) {
        var vm = this;
        vm.entities = [];
        vm.idsMainNeedrefresh = [];
        vm.uniqueCnt = 0;
        //test
        return {
            addDirtyEvents: addDirtyEvents,
            entitiesGet: entitiesGet,
            entitiesSet: entitiesSet,
            friendlyName: friendlyName,
            force: entitiesSet,
            getNamedUserTypes: getNamedUserTypes,
            getHelpView: getHelpView,
            getTextAtURL: getTextAtURL,
            handleError: handleError,
            isoLangs: isoLangs,
            mceOffset: 220,
            //#region MCEOptions
            mceOptions:
            {
              //force_p_newlines: false,
              //force_br_newlines: true,
              //convert_newlines_to_brs: false,
              branding: false,
              cache_suffix: '?v=' & _cacheBuster,
              height: (window.innerHeight - 220),
              scrollbars: true,
              skin: 'custom',
              plugin_preview_width: parseInt(window.innerWidth - (window.innerWidth * 0.1)),
              plugin_preview_height: parseInt(window.innerHeight - (window.innerHeight * 0.2)),
              //theme: 'modern',
              //init_instance_callback: function (editor) {
              //  editor.setContent(vm.touch.description.trim());
              //},
              //remove_linebreaks: true,
              //statusbar: false,
              //menu: {
              //  file: { title: 'File', items: 'getprevious | visualblocks preview print | clearbody' },
              //  edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall | code ' },
              //  insert: { title: 'Insert', items: 'link image charmap table |  ' },
              //  format: { title: 'Format', items: 'formats | fontsizeselect fontselect | bold italic underline strikethrough superscript subscript | removeformat' },
              //  table: { title: 'Table', items: 'inserttable tableprops deletetable | cell row column' },
              //  //tools: { title: 'Personalize', items: 'firstname  lastname nickname middlename' }
              //  //Personalization: { title: 'Personalize', items: 'namereplacement' }
              //},
              plugins: "code link lists image media paste advlist autolink charmap visualblocks print preview  table textcolor colorpicker searchreplace ",
              toolbar: ' undo redo | searchreplace cut copy paste pastetext  | bold italic forecolor backcolor | fontsizeselect fontselect | bullist numlist  alignleft aligncenter alignright removeformat | recipient table insert  | preview visualblocks code print  ',
              menubar: false,
              setup: function (editor) {
                //firstname  lastname prefix nickname middlename
                //editor.on('FullscreenStateChanged', function (e) {
                //  if (e.state) {
                //    vm.currentScrollPos = $ionicScrollDelegate.getScrollPosition();
                //    //console.log($ionicScrollDelegate,vm.currentScrollPos);
                //    $ionicScrollDelegate.scrollTop();
                //  }
                //  else if (vm.currentScrollPos) {
                //    $ionicScrollDelegate.scrollTo(vm.currentScrollPos.left, vm.currentScrollPos.top, false);
                //  }
                //  //console.log("FullscreenStateChanged", e);
                //});
                //editor.addMenuItem('getprevious', {
                //  text: 'Copy from previous...',
                //  context: 'file',
                //  onclick: function () {
                //    openTrackedEmailPicker();
                //  }
                //});
                //editor.addMenuItem('spacer', {
                //  text: '|',
                //  context: 'file',
                //});
                //editor.addButton('People', {
                //  text: 'People',
                //  type: 'menubutton',
                //  icon: false,
                //  menu: [
                //    {
                //      text: 'Menu-1',
                //      onclick: function () {
                //        alert("Clicked on Menu-1.");
                //      },
                //      menu: [
                //        {
                //          text: 'Sub-Menu-1',
                //          onclick: function () {
                //            alert("Clicked on Sub-Menu-1.");
                //          }
                //        }
                //      ]
                //    }
                //    ]
                //});

                //editor.addMenuItem('clearbody', {
                //  text: 'Clear',
                //  context: 'file',
                //  onclick: function () {
                //    editor.setContent("");
                //  }
                //});
                editor.addButton('recipient', {
                  type: 'menubutton',
                  text: 'Recipient\'s ...',
                  icon: 'icon ion-person',
                  title: 'Personalize: insert recipient name',
                  context: 'recipient',
                  //items: 'firstname  lastname prefix nickname middlename'
                  menu: [
                    {
                      text: 'First name',
                      context: 'firstname',
                      onclick: function () {
                        editor.insertContent('&nbsp;%firstname%&nbsp;');
                      }
                    },
                    {
                      text: 'Last name ',
                      context: 'lastname',
                      onclick: function () {
                        editor.insertContent('&nbsp;%lastname%&nbsp;');
                      }
                    },
                    {
                      text: 'Middle name ',
                      context: 'middlename',
                      onclick: function () {
                        editor.insertContent('&nbsp;%middlename%&nbsp;');
                      }
                    },
                    {
                      text: 'Nickname (or First name if none)',
                      context: 'nickname',
                      onclick: function () {
                        editor.insertContent('&nbsp;%nickname%&nbsp;');
                      }
                    },
                    {
                      text: 'Prefix (Mr./Ms./Dr. etc.)',
                      context: 'prefix',
                      onclick: function () {
                        editor.insertContent('&nbsp;%prefix%&nbsp;');
                      }
                    }
                  ]

                });

              },
            },

            //#endregion
            sendAppView: sendAppView,
            setHelpView: setHelpView,
            showAlert: showAlert,
            showAlertQ: showAlertQ,
            showConfirm: showConfirm,
            syncTags: syncTags,
            synchTwitterTimezones: synchTwitterTimezones,
            textareaRows: textareaRows,
            timesFromTimePeriod: timesFromTimePeriod,
            timePeriods: timePeriods,
            uniqueCnt: uniqueCnt,
            wordFor: wordFor,
            createAppointment:createAppointment,
            deleteAppointment: deleteAppointment,
            findAppointment: findAppointment,
            modifyAppointment: modifyAppointment,
            modifyAppointmentAndroid: modifyAppointmentAndroid,
            syncAppointment: syncAppointment,
        }
        function uniqueCnt() {
          return vm.uniqueCnt++;
        }

        function textareaRows() {
          if (window.cordova) {
            if (window.innerHeight < 700) return 7;
            else if (window.innerHeight < 1000) return 9;
            else return 11;

          }
          else {
            if (window.innerHeight < 1000) return 5;
            else return 8;

          }
        }

        function friendlyName(primName) {
            var result = primName;
            switch (primName) {
                case "SMHandle":
                    result = "Social Handle";
                    break;
                case "CustomText":
                    result = "Any Text";
                    break;
                case "CustomLongText":
                    result = "Any Text - Long";
                    break;
                case "CustomInteger":
                case "CustomFloat":
                    result = "Number";
                    break;
                case "CustomBinary":
                    result = "On/Off Slider";
                    break;
                case "CustomDate":
                    result = "Date";
                    break;
                case "RatingYesNo":
                    result = "Rating: Thumbs Up/Down";
                    break;
                case "RatingYesNoMaybe":
                    result = "Rating: Yes/No/Maybe";
                    break;
                case "Rating0to5":
                    result = "Rating: 5 Stars";
                    break;
                case "Rating0to100":
                    result = "Rating: 0 to 100";
                    break;
                case "Url":
                    result = "Link";
                    break;
            }
            return result;
        }

        //#region ---Analytics

        function sendAppView(name, entityType, entityId) {
            //if (window.analytics) {
            //    window.analytics.trackView(name);
            //    // var Fields = _gAnalyticsApp.Fields,
            //    //     HitTypes = _gAnalyticsApp.HitTypes,
            //    //     LogLevel = _gAnalyticsApp.LogLevel,
            //    //     params = {};
            //    //
            //    // params[Fields.HIT_TYPE] = HitTypes.APP_VIEW;
            //    // params[Fields.SCREEN_NAME] = name;
            //    //
            //    // _gAnalyticsApp.setLogLevel(LogLevel.INFO);
            //    //
            //    // _gAnalyticsApp.send(params);
            //    // console.log("appView", params);
            //}
            //else if ($window._gAnalyticsWeb) {
            //    //console.log("webview", name);
            //    $window._gAnalyticsWeb(function () {
            //        $window._gAnalyticsWeb('send', 'pageview', name);
            //     });
            //}
            //else console.error("No analytics found");

            dataApi.pageview(name, entityType, entityId).then(function (data) {
                //ok
            }, function (err) { console.error(err) });
        }
        //#endregion -----------------

        function getRow(cellAddress) {
            var ret = 0;
            for (var i = 0; i < cellAddress.length; i++) {
                /* all keys that do not begin with "!" correspond to cell addresses */
                if (cellAddress[i] === "!") break;

                    //first numeric begins the row number
                else if (cellAddress[i] == parseInt(cellAddress[i])) {
                    var len = parseInt(cellAddress.length) - parseInt(i);
                    ret = cellAddress.substr(i, len)
                    // console.log(ret, cellAddress, cellAddress.length, i, len );
                    break;
                }
            }
            return parseInt(ret);
        }


        //#region Calendar Sync
        function syncAppointment(appt) {
            if (!appt) return;

            return $q(function (resolve, reject) {
                if (appt.id != null) {
                    //console.log("existing", appt);

                    if (ionic.Platform.isIOS()) {
                        modifyAppointment(appt).then(function (apptId) {
                            resolve(apptId);
                        })
                    }
                    else if (ionic.Platform.isAndroid()) {

                        modifyAppointmentAndroid(appt).then(function (apptId) {
                            resolve(apptId);
                        })
                    }
                    else reject("Invalid platform");
                }
                else {
                    //console.log("new", appt);
                    createAppointment(appt).then(
                        function (apptId) {
                            resolve(apptId)
                        },
                        function (err) {
                            console.error(err); reject("Error " + err)
                        });
                }
            });
        };

        function createAppointment(appt) {
            //var success = function (data) { resolve(data); };
            //var fail = function (data) { reject(data); };
            return $q(function (resolve, reject) {
                console.log("createAppointment", appt);
                var options = window.plugins.calendar.getCalendarOptions();
                if (appt.calendarName) options.calendarName = appt.calendarName; // iOS only
                if (appt.calendarId) options.calendarId = appt.calendarId; // Android only, use id obtained from listCalendars() call which is described below. This will be ignored on iOS in favor of calendarName and vice versa. Default: 1.
                if (appt.url) options.url = appt.url;
                var startDate = new Date(appt.startDate);
                var endDate = new Date(appt.endDate);
                if (startDate >= endDate || !endDate) {
                    endDate = moment(startDate).add(30, "minutes").toDate();
                }

                window.plugins.calendar.createEventWithOptions(appt.title, appt.loc, appt.notes, new Date(appt.startDate), new Date(appt.endDate), options, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
            });

        }



        function deleteAppointment(appt) {

            return $q(function (resolve, reject) {
                var title = appt.title;
                var startDate = new Date(appt.startDate);
                var endDate = new Date(appt.endDate);
                if (appt.prevTitle) title = appt.prevTitle;
                if (appt.prevStartDate) startDate = new Date(appt.prevStartDate);
                if (appt.prevEndDate) endDate = new Date(appt.prevEndDate);
                //console.log(appt, startDate, endDate);

                if (ionic.Platform.isIOS()) {
                    window.plugins.calendar.deleteEventFromNamedCalendar(title, null, null, startDate, endDate, appt.calendarName, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
                }
                else {
                    window.plugins.calendar.deleteEvent(title, null, null, startDate, endDate, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
                }
            });

        }

        function findAppointment(appt) {

            return $q(function (resolve, reject) {
                var options = window.plugins.calendar.getCalendarOptions();
                
                if (ionic.Platform.isIOS()) options.id = appt.id; // iOS only, get it from createEventWithOptions (if not found, we try matching against title, etc)
                else if (appt.calendarName) options.calendarName = appt.calendarName;

                var title = appt.title;
                var loc = appt.loc;
                var startDate = appt.startDate;
                var endDate = appt.endDate;
                if (appt.prevTitle) title = appt.prevTitle;
                if (appt.prevLoc) loc = appt.prevLoc;
                if (appt.prevStartDate) startDate = appt.prevStartDate;
                if (appt.prevEndDate) endDate = appt.prevEndDate;
                console.log(appt);
                window.plugins.calendar.findEventWithOptions(title, loc, null, new Date(startDate), new Date(endDate), options, function (data) { console.log(data); resolve(data); }, function (data) { console.log(data); reject(data); });
            });

        }

        function modifyAppointment(appt) {
            if (!ionic.Platform.isIOS()) return;

            return $q(function (resolve, reject) {
                var options = window.plugins.calendar.getCalendarOptions();
                options.calendarName = appt.calendarName;
                options.id = appt.id; // iOS only, get it from createEventWithOptions (if not found, we try matching against title, etc)

                var title = appt.title;
                var loc = appt.loc;
                var startDate = appt.startDate;
                var endDate = appt.endDate;
                if (appt.prevTitle) title = appt.prevTitle;
                if (appt.prevLoc) loc = appt.prevLoc;
                if (appt.prevStartDate) startDate = appt.prevStartDate;
                if (appt.prevEndDate) endDate = appt.prevEndDate;

                window.plugins.calendar.modifyEventWithOptions(title, loc, null, new Date(startDate), new Date(endDate), appt.title, appt.loc, appt.notes, new Date(appt.startDate), new Date(appt.endDate), options, options, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
            });

        }

        function modifyAppointmentAndroid(appt) {
            if (!ionic.Platform.isAndroid()) return;


            return $q(function (resolve, reject) {
                //console.log("In", appt);
                var options = window.plugins.calendar.getCalendarOptions();
                options.calendarId = appt.calendarId; // Android only, use id obtained from listCalendars() call which is described below. This will be ignored on iOS in favor of calendarName and vice versa. Default: 1.
                var title = appt.title;
                var loc = appt.loc;
                var startDate = appt.startDate;
                var endDate = appt.endDate;
                if (appt.prevTitle) title = appt.prevTitle;
                if (appt.prevLoc) loc = appt.prevLoc;
                if (appt.prevStartDate) startDate = appt.prevStartDate;
                if (appt.prevEndDate) endDate = appt.prevEndDate;

                window.plugins.calendar.deleteEvent(title, loc, null, new Date(startDate), new Date(endDate),
                    function (data) {
                        //console.log(data);
                        window.plugins.calendar.createEventWithOptions(appt.title, appt.loc, appt.notes, new Date(appt.startDate), new Date(appt.endDate), options, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
                    },
                    function (data) {
                        console.log("err",data);
                        window.plugins.calendar.createEventWithOptions(appt.title, appt.loc, appt.notes, new Date(appt.startDate), new Date(appt.endDate), options, function (data) { console.log(data); resolve(data); }, function (data) { console.error(data); reject(data); });
                    });
            });

        }

        //#endregion

        function showConfirm(title, message){
          var alertPopup = $ionicPopup.confirm({
            title: title,
            template: message
          });

        }


        function showAlert(title, message) {
            var alertPopup = $ionicPopup.alert({
                title: title,
                template: message
            });
            alertPopup.then(function (res) {
            });

        }

        function entitiesGet() {
            return vm.entities;
        }
        function entitiesSet(ents) {
            vm.entities = ents;

        }
        function getHelpView(nestedModal) {
          var view = vm.helpView;
          var templateUrl = "";
          if(nestedModal) view = nestedModal;
          switch (view.toLowerCase()) {
            case "ardb":
                templateUrl = "templates/help/arDb.html";
                break;
            case "attachments":
                templateUrl = "templates/help/attachments.html";
                break;
              case "database":
              case "collection":
              case "customize":
                templateUrl = "templates/help/database.html";
                break;
            case "custom":
                templateUrl = "templates/help/customFields.html"
                break;
            case "database_deep":
                templateUrl = "templates/help/newDatabase.html";
                break;
            case "group_deep":
            case 'group':
                templateUrl = "templates/help/group.html";
                break;
            case 'importcontacts':
                templateUrl = "templates/help/importContacts.html";
                break;
            case 'importspreadsheet':
                templateUrl = "templates/help/importSpreadsheet.html";
                break;
            case 'importtwitter':
                templateUrl = "templates/help/importTwitter.html";
                break;
              case "main":
                  templateUrl = "templates/help/helpMain.html";
                  break;
              case "reports":
                  templateUrl = "templates/help/reports.html";
                  break;
              case "query":
            case "tag":
                templateUrl = "templates/help/tagAndQuery.html";
                break;
            case "tagset":
                templateUrl = "templates/help/tagSets.html";
                break;
            case "team":
                templateUrl = "templates/help/team.html";
                break;
            case "team_deep":
                templateUrl = "templates/help/newTeam.html";
                break;
            case "touch_edit":
                templateUrl = "templates/help/touchEdit.html";
                break;
            case "touch_editevent":
                templateUrl = "templates/help/touchEditEvent.html";
                break;
            case "touch_editmediacapture":
                templateUrl = "templates/help/touchEdit.html";
                //templateUrl = "templates/help/touchEditMediaCapture.html";
                break;
            case "touch_editmeeting":
                templateUrl = "templates/help/touchEditMeeting.html";
                break;
            case "touch_edittracked":
                templateUrl = "templates/help/touchEditTracked.html";
                break;
            case "touch_edittwitter":
                templateUrl = "templates/help/touchEditTwitter.html";
                break;
            case "touchtypes":
                templateUrl = "templates/help/touchTypes.html";
                break;
            case "touchtypes_deep":
                templateUrl = "templates/help/touchTypesDeep.html";
                break;
            case "touch":
            case "person":
            case "personedit":
            case "org":
            case "orgedit":
            case "entity":
                templateUrl = "templates/help/entity.html";
                break;
            default:
                showAlert("Help", "No help is available for " + view);
                break;

          }
          return {template: templateUrl, view: view};
        }

        function setHelpView(page) {
          vm.helpView = page;
        }

        function showAlertQ(title, message) {
            var deferred = $q.defer();
            var alertPopup = $ionicPopup.alert({
                title: title,
                template: message
            });
            alertPopup.then(function (res) {
                deferred.resolve();
            });

            return deferred.promise;
        }

        function getTextAtURL(url) {
            var deferred = $q.defer();
            $http({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': undefined
                }
            })
            .success(function (data) {
                deferred.resolve(data);
            })
            .error(function (errMsg, errNo) {
                if (errNo == 404) deferred.resolve("File not found.");
                else deferred.resolve(errMsg);
            });


            return deferred.promise;
        }

        function addDirtyEvents(elem) {
            var inputs = elem.find('input');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].onchange += function () { scope.isdirty = true; };
            }

            inputs = elem.find('textarea');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].onchange += function () { scope.isdirty = true; };
            }

            inputs = elem.find('select');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].onchange += function () { scope.isdirty = true; };
            }

        }


        function getNamedUserTypes(usertypes) {
            var uts = [];
            for (var i = 0; i < usertypes.length; i++) {
                var ut = usertypes[i];
                var utName = ""
                if (ut.entityType == shuri_enums.entitytypes.contactpoint) utName +="cp_";
                else if (ut.entityType == shuri_enums.entitytypes.document) utName +="doc_";
                utName += ut.name.toLowerCase().replaceAll(" ", "").replaceAll(":", "");
                var code = 'uts.' + utName + ' = ut;'
                //console.log(code);
                eval(code);
            }

            return uts;
        }

        function handleError(data) {
            var s = "Error.  ";
            if (data) {
                s += angular.toJson(data);
            }
            if (window.cordova) $window.alert(s);
            else console.log(s);
        }

        function timePeriods() {
            return [
                { name: "All Time", value: "alltime", sorter: 0 },
                { name: "Recent and upcoming", value: "recent", sorter: 2 },
                { name: "Past week", value: "past7", sorter: 4 },
                { name: "Past 30 days", value: "past30", sorter: 6 },
                { name: "This month", value: "thismonth", sorter: 8 },
                { name: "Last month", value: "lastmonth", sorter: 10 },
                { name: "This Year", value: "thisyear", sorter: 12 },
                { name: "Last Year", value: "lastyear", sorter: 14 },
                { name: "Month-to-date", value: "mtd", sorter: 16 },
                { name: "Year-to-date", value: "ytd", sorter: 18 },
                { name: "Today and future", value: "future", sorter: 20 },
            ];
        }

        //function timesFromTimePeriod(tp) {
        //    var startDt = moment().startOf("day").utc();
        //    var endDt = moment().endOf("day").utc();

        //    var times = { dateEndUTC: endDt, dateStartUTC: startDt };

        //    switch (tp) {
        //        case "recent":
        //            times.dateStartUTC = startDt.subtract(60, 'days');
        //            times.dateEndUTC = endDt.add(2, 'weeks');
        //            //console.log(times);
        //            break;
        //        case "past7":
        //            times.dateStartUTC = startDt.subtract(7, 'days');
        //            //console.log(times);
        //            break;
        //        case "past30":
        //            times.dateStartUTC = startDt.subtract(30, 'days');
        //            break;
        //        case "future":
        //            times.dateStartUTC = startDt.startOf('day');
        //            times.dateEndUTC = endDt.add(1, 'years');
        //            break;
        //        case "thismonth":
        //            times.dateStartUTC = startDt.startOf('month');
        //            times.dateEndUTC = endDt.endOf('month');
        //            break;
        //        case "lastmonth":
        //            times.dateStartUTC = startDt.subtract(1, 'month').startOf('month');
        //            times.dateEndUTC = endDt.subtract(1, 'month').endOf('month');
        //            break;
        //        case "mtd":
        //            times.dateStartUTC = startDt.startOf('month');
        //            break;
        //        case "thisyear":
        //            times.dateStartUTC = startDt.startOf('year');
        //            times.dateEndUTC = endDt.endOf('year');
        //            break;
        //        case "ytd":
        //            times.dateStartUTC = startDt.startOf('year');
        //            break;
        //        case "lastyear":
        //            times.dateStartUTC = startDt.subtract(1, 'year').startOf('year');
        //            times.dateEndUTC = endDt.subtract(1, 'year').endOf('year');
        //            break;
        //        case "alltime":
        //            times.dateStartUTC = startDt.subtract(100, 'years');
        //            times.dateEndUTC = endDt.add(10, 'years');
        //            break;
        //        case "custom":
        //            //console.error(tp);
        //            break;
        //        default:
        //            console.error("Unhandled time period: " + tp);
        //            break;
        //    }
        //    return times;
        //}

        function timesFromTimePeriod(tp) {
            var startDt = moment().startOf("day");
            var endDt = moment().endOf("day");

            var times = { dateEnd: endDt, dateStart: startDt };

            switch (tp) {
                case "recent":
                    times.dateStart = startDt.subtract(60, 'days');
                    times.dateEnd = endDt.add(2, 'weeks');
                    //console.log(times);
                    break;
                case "past7":
                    times.dateStart = startDt.subtract(7, 'days');
                    //console.log(times);
                    break;
                case "past30":
                    times.dateStart = startDt.subtract(30, 'days');
                    break;
                case "future":
                    times.dateStart = startDt.startOf('day');
                    times.dateEnd = endDt.add(1, 'years');
                    break;
                case "thismonth":
                    times.dateStart = startDt.startOf('month');
                    times.dateEnd = endDt.endOf('month');
                    break;
                case "lastmonth":
                    times.dateStart = startDt.subtract(1, 'month').startOf('month');
                    times.dateEnd = endDt.subtract(1, 'month').endOf('month');
                    break;
                case "mtd":
                    times.dateStart = startDt.startOf('month');
                    break;
                case "thisyear":
                    times.dateStart = startDt.startOf('year');
                    times.dateEnd = endDt.endOf('year');
                    break;
                case "ytd":
                    times.dateStart = startDt.startOf('year');
                    break;
                case "lastyear":
                    times.dateStart = startDt.subtract(1, 'year').startOf('year');
                    times.dateEnd = endDt.subtract(1, 'year').endOf('year');
                    break;
                case "alltime":
                    times.dateStart = startDt.subtract(100, 'years');
                    times.dateEnd = endDt.add(10, 'years');
                    break;
                case "custom":
                    //console.error(tp);
                    break;
                default:
                    console.error("Unhandled time period: " + tp);
                    break;
            }
            return times;
        }


        //#region UI Helpers
        function syncTags(allTags, entityTags) {
            for (var u = 0; u < allTags.length; u++) {
                for (var t = 0; t < allTags[u].tags.length; t++) {
                    allTags[u].tags[t].isTag = false;
                    for (var i = 0; i < entityTags.length; i++) {
                        if (allTags[u].tags[t].id == entityTags[i].id) {
                            allTags[u].tags[t].isTag = true;
                            break;
                        }
                    }
                }
            }
        }


        function synchTwitterTimezones(docs, timezones) {
            //check to see if org's timezone is in list or can be found - original tzs were imported from twitter --   remove this eventually
            var inList = false;
            var orgTZId = "";
            for (var i = 0; i < docs.length; i++) {
                if (docs[i].userType_Id == utConstant.doc_timeZone) {
                    orgTZId = docs[i].value;
                    break;
                }
            }

            if (orgTZId != "") {
                for (var i = 0; i < timezones.length; i++) {
                    if (timezones[i].Id == orgTZId) {
                        inList = true;
                        //console.log("Found by ID");
                        break;
                    }
                    else if (timezones[i].Id.toLowerCase().indexOf(orgTZId.toLowerCase()) >= 0) {
                        //console.log("Found by Partial ID");
                        //fix the org
                        for (var i = 0; i < docs.length; i++) {
                            if (docs[i].userType_Id == utConstant.doc_timeZone) {
                                docs[i].value = timezones[i].Id;
                                break;
                            }
                        }

                        inList = true;
                        break;
                    }
                    else if (timezones[i].DisplayName.toLowerCase().indexOf(orgTZId.toLowerCase()) >= 0) {
                        //fix the org
                        var newId = timezones[i].Id
                        //console.log(timezones[i].DisplayName);
                        for (var i = 0; i < docs.length; i++) {
                            if (docs[i].userType_Id == utConstant.doc_timeZone) {
                                docs[i].value = newId;
                                break;
                            }
                        }

                        inList = true;
                        break;
                    }
                }
            }

            if (!inList && orgTZId != "") {
                timezones.push({
                    Id: orgTZId,
                    DisplayName: orgTZId
                })
            }


        }


        //#endregion

        //hook for localization
        function wordFor (s) {
            switch (s.toLowerCase()) {
                //other
                case "copyright":
                    s = "©2015-2016 Shuri, Inc.  All rights reserved."
                    break;
                case "reqsapproval":
                    s = "*This share requires approval before it will be made available.";
                    break;
                    //entity names
                case "user type":
                case "usertype":
                    s = "Type";
                    break;
                case "user types":
                case "usertypes":
                    s = "Types";
                    break;
                case "org":
                    s = "Organization";
                    break;
                case "collection":
                    s = "Database";
                    break
                case "collections":
                    s = "Databases";
                    break

                case "group":
                case "groups":
                case "person":
                case "people":
                case "organization":
                case "organizations":
                case "tag":
                case "tags":
                case "team":
                case "teams":
                case "touch":
                case "touches":
                case "subscription":
                case "subscriptions":
                case "contact point":
                case "contact points":
                case "document":
                case "documents":
                case "loading...":
                case "location":
                case "locations":

                    //other vocabulary
                case "about":
                case "active":
                case "action":
                case "add":
                case "add new":
                case "address":
                case "all":
                case "all day":
                case "and":
                case "approval status":
                case "approve":
                case "approved":
                case "approvers":
                case "are":
                case "available to":
                case "avatar url":
                case "attachment":
                case "attachments":
                case "body":
                case "belongs to":
                case "cancel":
                case 'caption':
                case "choose":
                case "clear":
                case "client inquiry email":
                case "close":
                case "codename":
                case "collapse":
                case "comments":
                case "continue":
                case "contents":
                case "created":
                case "currently":
                case "custom":
                case "custom fields":
                case "customize":
                case "databases":
                case "date":
                case "data source":
                case "delete":
                case "description":
                case "details":
                case "done":
                case "download":
                case "duration":
                case "earnings":
                case "edit":
                case "editing":
                case "editor":
                case "editors":
                case "email":
                case "employee list":
                case "empty":
                case "end":
                case "end date":
                case "enter address":
                case "entity":
                case "expand":
                case "favorites":
                case "fax":
                case "feedback":
                case "field":
                case "files":
                case "filter":
                case "filtered":
                case "find":
                case "first name":
                case "found":
                case "for":
                case "general email":
                case "history":
                case "home page":
                case "icon":
                case "id":
                case "import":
                case "info":
                case "is":
                case "label":
                case "language":
                case "last modified":
                case "last name":
                case "loading":
                case "login":
                case "logo":
                case "logo url":
                case "logout":
                case "manage":
                case "marketplace":
                case "maybe":
                case "media":
                case "middle name":
                case "more":
                case "my":
                case "name":
                case "new":
                case "new tag":
                case "next":
                case "nickname":
                case "(none)":
                case "no":
                case "no results found":
                case "no work available":
                case "nothing added yet":
                case "ok":
                case "optional":
                case "owned by":
                case "ownership":
                case "pending":
                case "phone":
                case "photo":
                case "photos":
                case "public":
                case "prefix":
                case "preview":
                case "price":
                case "primitive":
                case "private":
                case "promote":
                case "proximity":
                case "query":
                case "queue":
                case "queues":
                case "recent":
                case "rejected":
                case "resolve":
                case "remove":
                case "required":
                case "requires approval":
                case "report":
                case "reset password":
                case "return to login":
                case "reviewer":
                case "run query":
                case "save":
                case "save changes":
                case "schedule":
                case "scheduled":
                case "search":
                case "searching":
                case "sent":
                case "send":
                case "set":
                case "sets":
                case "settings":
                case "share":
                case "share with":
                case "shared":
                case "shared databases":
                case "shared in":
                case "sharing":
                case "shares":
                case "show":
                case "show public":
                case "sign up":
                case "sign up - new user":
                case "start":
                case "stop":
                case "subject":
                case "submit":
                case "subscribe":
                case "subscribers":
                case "suffix":
                case "template":
                case "templates":
                case "test":
                case "time":
                case "timer":
                case "time period":
                case "time zone":
                case "title":
                case "tweet":
                case "twitter screenname":
                case "type":
                case "types":
                case "tmi":
                case "unsubscribe":
                case "update":
                case "upload":
                case "users":
                case "value":
                case "view":
                case "view these":
                case "work":
                case "worker":
                case "working...":
                case "worker performance":
                case "yes":
                case "your next pay":
                case "you've been paid":
                    break;

                default:
                    console.log("Unhandled string: " + s);
                    break;
            }

            return s;
        }


        //#region Languages
        function isoLangs() {

            var x = [
                 {
                    "id": "en",
                    "name": "English",
                    "nativeName": "English"
                },
                  {
                      "id": "fr",
                      "name": "French",
                      "nativeName": "français, langue française"
                  },
                {
                    "id": "de",
                    "name": "German",
                    "nativeName": "Deutsch"
                },
                 {
                    "id": "ja",
                    "name": "Japanese",
                    "nativeName": "日本語 (にほんご／にっぽんご)"
                },
                {
                    "id": "ko",
                    "name": "Korean",
                    "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"
                },
                {
                    "id": "es",
                    "name": "Spanish",
                    "nativeName": "español, castellano"
                },

            ];
            return x;
        }

        //#region All Languages
        //from  http://stackoverflow.com/questions/3217492/list-of-language-codes-in-yaml-or-json
        function isoLangsAll() {

            return {
                "af": {
                    "name": "Afrikaans",
                    "nativeName": "Afrikaans"
                },
                "sq": {
                    "name": "Albanian",
                    "nativeName": "Shqip"
                },
                "ar": {
                    "name": "Arabic",
                    "nativeName": "العربية"
                },
                "az": {
                    "name": "Azerbaijani",
                    "nativeName": "azərbaycan dili"
                },
                "bg": {
                    "name": "Bulgarian",
                    "nativeName": "български език"
                },
                "zh": {
                    "name": "Chinese",
                    "nativeName": "中文 (Zhōngwén), 汉语, 漢語"
                },
                "hr": {
                    "name": "Croatian",
                    "nativeName": "hrvatski"
                },
                "cs": {
                    "name": "Czech",
                    "nativeName": "česky, čeština"
                },
                "da": {
                    "name": "Danish",
                    "nativeName": "dansk"
                },
                "nl": {
                    "name": "Dutch",
                    "nativeName": "Nederlands, Vlaams"
                },
                "en": {
                    "name": "English",
                    "nativeName": "English"
                },
                "fi": {
                    "name": "Finnish",
                    "nativeName": "suomi, suomen kieli"
                },
                "fr": {
                    "name": "French",
                    "nativeName": "français, langue française"
                },
                "de": {
                    "name": "German",
                    "nativeName": "Deutsch"
                },
                "el": {
                    "name": "Greek, Modern",
                    "nativeName": "Ελληνικά"
                },
                "he": {
                    "name": "Hebrew (modern)",
                    "nativeName": "עברית"
                },
                "hi": {
                    "name": "Hindi",
                    "nativeName": "हिन्दी, हिंदी"
                },
                "hu": {
                    "name": "Hungarian",
                    "nativeName": "Magyar"
                },
                "it": {
                    "name": "Italian",
                    "nativeName": "Italiano"
                },
                "ja": {
                    "name": "Japanese",
                    "nativeName": "日本語 (にほんご／にっぽんご)"
                },
                "ko": {
                    "name": "Korean",
                    "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"
                },
                "no": {
                    "name": "Norwegian",
                    "nativeName": "Norsk"
                },
                "fa": {
                    "name": "Persian",
                    "nativeName": "فارسی"
                },
                "pl": {
                    "name": "Polish",
                    "nativeName": "polski"
                },
                "ps": {
                    "name": "Pashto, Pushto",
                    "nativeName": "پښتو"
                },
                "pt": {
                    "name": "Portuguese",
                    "nativeName": "Português"
                },
                "ro": {
                    "name": "Romanian, Moldavian, Moldovan",
                    "nativeName": "română"
                },
                "ru": {
                    "name": "Russian",
                    "nativeName": "русский язык"
                },
                "sk": {
                    "name": "Slovak",
                    "nativeName": "slovenčina"
                },
                "es":{
                    "name":"Spanish; Castilian",
                    "nativeName":"español, castellano"
                },

                "sv": {
                    "name": "Swedish",
                    "nativeName": "svenska"
                },
                "th": {
                    "name": "Thai",
                    "nativeName": "ไทย"
                },
                "tr": {
                    "name": "Turkish",
                    "nativeName": "Türkçe"
                },
                "uk": {
                    "name": "Ukrainian",
                    "nativeName": "українська"
                },
                "vi": {
                    "name": "Vietnamese",
                    "nativeName": "Tiếng Việt"
                },
            };
            //#endregion
        }
        //#endregion

        //#endregion
    }



})();
