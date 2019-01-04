(function () {
  'use strict';

  angular.module("shuriApp").directive('entityDescription', ['$state', '$rootScope', '$stateParams', '$q', '$sce',  '$ionicPopover', '$ionicPopup', '$ionicLoading' ,'$ionicModal', '$timeout', '$filter', '$window', 'globals', 'dataApi', 'appGlobals',
    function ($state, $rootScope, $stateParams, $q, $sce, $ionicPopover, $ionicPopup, $ionicLoading, $ionicModal,  $timeout, $filter, $window, globals, dataApi, appGlobals) {
      return {
        restrict: "E",
        scope: {
          entity: '=',
          entityType: '=',
          forUpdate: '=',
          manageUpdates: '=',
          isDirty: '='
        },
        templateUrl: "templates/directives/entityDescription.html?" + _cacheBuster,
        link: function (scope, element, attrs) {
          scope.isShort = (window.innerHeight < 700);
          scope.isWide = (window.innerWidth >= appGlobals.widthMedium);
          scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
          scope.isMedium = (!scope.isWide && !scope.isNarrow);
          scope.onDesktop = !(window.cordova);
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

          var watcherC = scope.$watch('entityType', function () {
            if (scope.entityType === undefined) return;
            scope.prefname = "hideTA_Desc" + scope.entityType + (scope.isOnEdit ? "edit" : "");
            AssignUI();
          });

          var watcherI = scope.$watch('forUpdate', function () {
            if (scope.forUpdate === undefined) return;
            scope.forUpdate = (scope.forUpdate === true || scope.forUpdate === "true");
            scope.forUpdateSet = true;
            AssignUI();
          });

          var watcherMU = scope.$watch('manageUpdates', function () {
            if (typeof scope.manageUpdates === "undefined") return;
            scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");

          })
          //#endregion

          //#region UI
          function AssignUI() {
            scope.isInitialized = false;
            if (!scope.entity || !scope.entityType || !scope.forUpdateSet) return;
            //console.log(scope.entity, scope.mode, scope.forUpdateSet);
            scope.original = scope.entity.description;
            dataApi.initialize().then(function (data) {
              scope.appUser = data.appUser;
              scope.userTypes = data.usertypes;
              dataApi.getUserPreferences().then(function (data) {
                scope.preferences = data;
                //console.log(data);

                if (scope.preferences[scope.prefname]) scope.entity.hideDesc = (scope.preferences[scope.prefname] === "true");

                if (!scope.entity.descLabel) {
                  if (scope.entityType == 6) scope.entity.descLabel = "Description";
                  else scope.entity.descLabel = "Summary";
                }

                scope.isHtml = false;
                if (scope.entityType == 6 && scope.entity.primitive == shuri_enums.touchprimitive.trackedemail) {
                  scope.isHtml = true;
                  scope.entity.descLabel = "Email Body"
                  if (scope.forUpdate && !scope.isOnEdit) scope.hideEdit = true;  //can't edit html here
                  if (scope.entity.description || scope.entity.description.length > 0) scope.entity.description = $sce.trustAsHtml(scope.entity.description.toString());
                }

                scope.mayUpdate = scope.forUpdate;
                if (scope.isShort && window.cordova) scope.mayUpdate = false;  //force fullscreen on phones

                scope.entity.descriptionId = "taDesc_" + globals.uniqueCnt();
                SetTAScrollHeight();
                scope.isInitialized = true;
                //console.log(scope.entityType ,  scope.entity.primitive, scope.forUpdate, scope.entity.description);
                //var desc = scope.entity.description.toString().split("\n").join("<br />");
                //if (!scope.mayUpdate || !scope.isHtml) scope.entity.descriptionUI = $sce.trustAsHtml(desc.toString());
              });

            });

          }

          //#endregion
          scope.editorCreated = function (editor) {
            console.log(editor)
          }
          scope.contentChanged = function (editor, html, text, delta, oldDelta, source) {
            console.log('editor: ', editor, 'html: ', html, 'text:', text, 'delta: ', delta, 'oldDelta:', oldDelta, 'source:', source)
          }
          scope.selectionChanged = function (editor, range, oldRange, source) {
            console.log('editor: ', editor, 'range: ', range, 'oldRange:', oldRange, 'source:', source)
          }

          scope.toggleOpenTA = function () {
            scope.entity.hideDesc = !scope.entity.hideDesc;
            dataApi.postUserPreference(scope.prefname, scope.entity.hideDesc.toString(), false);
          }

          //#region ForUpdate events
          scope.updateDesc = function() {

            if (scope.isDirty || scope.original != scope.entity.description) {
              if (scope.manageUpdates) {
                dataApi.updateEntityDescription(scope.entity.id, scope.entityType, scope.entity.description).then(function (data) {
                  //is this a synced touch
                  if (scope.entityType === shuri_enums.entitytypes.touch) {
                    var isSync = false;
                    scope.entity.documents.forEach(function (doc) { if (doc.userType_Id === appGlobals.guidDocCalSync) isSync = true; });
                    if (isSync) dataApi.updateTouchLastSync(scope.entity.id);
                  }
                  
                }, function (err) { console.log(err) });
              }
            }
          }


          scope.inputChanged = function () {
            scope.isDirty = (scope.original != scope.entity.description);
            if (scope.isInitialized) SetTAScrollHeight(10);
          }


          //#endregion
          function SetTAScrollHeight(delay) {
            var maxHeight = parseInt(window.innerHeight / 3);
            var timeDelay = 400;
            if (delay) timeDelay = delay;

            $timeout(function () {
              var ta = document.getElementById(scope.entity.descriptionId);
              if (ta && ta.scrollHeight) {
                var sh = ta.scrollHeight;
                if (sh > maxHeight) sh = maxHeight;
                scope.entity.taHeight = sh + "px";
                //console.log(sh, scope.entity.taHeight, timeDelay);

              }
              //else console.error("No TA", ta, ta.scrollHeight);

            }, timeDelay)

          }

          //#region Fullscreen

          var _fsOffset = 92;

          scope.openmodalFS = function (event) {
            if (event) event.stopPropagation();

            scope.descHeight = (window.innerHeight - _fsOffset).toString() + "px";

            var tmplt = "entityDescFS.html";
            if (scope.onDesktop && !localStorage.getItem("expandUI")) tmplt = "entityDescDesktop.html";
            //console.log(scope.onDesktop, localStorage.getItem("expandUI"));
            $ionicModal.fromTemplateUrl(tmplt, {
              scope: scope,
              //focusFirstInput: true,
              animation: 'slide-in-up'
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
                  var ta = document.getElementById("taDescriptionFS");
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
                scope.descHeight = (window.innerHeight - _fsOffset).toString() + "px";
                if (scope.entity.description
                  && (
                    (scope.isShort && scope.entity.description.length > 120)
                    ||
                    (scope.isMedium && scope.entity.description.length > 300))) {
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
          scope.blurItem = function () { };

          scope.keyboardShowHandler = function (e) {
            //console.log(window.innerHeight);
            scope.descHeight = (window.innerHeight - _fsOffset).toString() + "px";
            try { $rootScope.$apply(); }
            catch (e) { console.error(e);  }

            //var ta = document.getElementById("taEntityCpDoc");
            //ta.setSelectionRange(ta.value.length, ta.value.length);
            //ta.scrollIntoView(false);

          }

          scope.keyboardHideHandler = function (e) {
            var h = (window.innerHeight - _fsOffset);
            //console.log(window.innerHeight);
            scope.descHeight = h.toString() + "px";
            try { $rootScope.$apply(); }
            catch (e) { console.error(e); }

            // $timeout(setdescHeight(), 100);
          }


          scope.closeFullscreen = function () {
            if (scope.isDirty) scope.updateDesc();
          //  if (tinyMCE) tinyMCE.EditorManager.execCommand('mceRemoveEditor', false, "mceEditor");
           if (window.cordova) {
              $window.removeEventListener('native.keyboardshow', scope.keyboardShowHandler);
              $window.removeEventListener('native.keyboardhide', scope.keyboardHideHandler);
            }


            scope.modalFS.hide();
            scope.modalFS.remove();
          };


              //#endregion

        }
      }
    }]);
})();
