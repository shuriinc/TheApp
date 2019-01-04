(function () {
    'use strict';

    angular.module("shuriApp").directive('entityAttachments', ['$rootScope', '$state', '$location', '$filter', '$timeout', '$ionicPopup', '$ionicModal', '$ionicActionSheet', '$cordovaCamera', 'globals', 'dataApi', 'appGlobals',
        function ($rootScope, $state, $location, $filter, $timeout, $ionicPopup, $ionicModal, $ionicActionSheet, $cordovaCamera, globals, dataApi, appGlobals) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    entityType: '=',
                    isDirty: '=',
                    manageUpdates: '='
                },
                templateUrl: "templates/directives/entityAttachments.html?" + _cacheBuster,
                link: function (scope, elem, attrs) {
                    scope.page = 1;
                    scope.pageSize = 20;
                    scope.itemCount = 0;
                    scope.inputIdToClick = "";
                    scope.title = "Initializing";
                    scope.onDesktop = !(window.cordova);

                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    //#region Watchers
                    var watcherEntity = scope.$watch('entity', function () {
                        if (typeof scope.entity === "undefined" || scope.entity === null) return;
                        assignUI();
                    })
                    var watcherET = scope.$watch('entityType', function () {
                        if (scope.entityType === undefined) return;
                        assignUI();
                        //watcherET();
                    })
                    var watcherMU = scope.$watch('manageUpdates', function () {
                        if (scope.manageUpdates === undefined) return;
                        scope.manageUpdates = (scope.manageUpdates == true || scope.manageUpdates == "true");
                        //console.log(scope.manageUpdates);
                    })

                    function randString(x) {
                        var s = "";
                        while (s.length < x && x > 0) {
                            var r = Math.random();
                            s += (r < 0.1 ? Math.floor(r * 100) : String.fromCharCode(Math.floor(r * 26) + (r > 0.5 ? 97 : 65)));
                        }
                        return s;
                    }

                    scope.toggleOpen = function (event) {
                        //console.log(event);
                        scope.isOpen = !scope.isOpen;
                        if (scope.entity.id != appGlobals.guidEmpty) {
                            if (scope.isOpen) sessionStorage.setItem(scope.key, "true");
                            else if (sessionStorage.getItem(scope.key)) sessionStorage.removeItem(scope.key);
                        }
                    };

                    function isImage(filename) {
                        if ((filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|pdf)$/)) && window.cordova) {
                            return true;
                        }
                        else if (filename.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
                            return true;
                        }
                        else return false;
                    }

                    function assignUI() {
                        if (scope.entity && scope.entityType) {
                            if (scope.entity.id != appGlobals.guidEmpty) {
                                scope.key = "openAttPicker" + scope.entity.id;
                                if (sessionStorage.getItem(scope.key)) scope.isOpen = true;
                            }
                            else scope.key = "openAttPicker" + $state.current.name.replace(".", "");

                            scope.inputIdToClick = scope.key.replace("openAttPicker", "attPicker");
                            //determine if curated DB 
                            scope.isCurated = (scope.entity.collection_Id == appGlobals.guidARDB);
                           // console.log(scope.isCurated,scope.entity.collection_Id,appGlobals.guidARDB);

                            if (scope.entity.documents) {
                                var attCnt = 0
                                scope.entity.documents.forEach(function (doc) {
                                    if (doc && doc.primitive === shuri_enums.documentprimitive.file && doc.userType_Id != appGlobals.utConstants.doc_emailTemplate) {
                                        doc.isAttachment = 'true';
                                        //console.log(doc);
                                        doc.icon = FileIcon(doc.value);
                                        doc.showPhoto = isImage(doc.value);
                                        attCnt++;
                                    }
                                });
                            }

                            if (scope.entity.attachmentsCount) scope.itemCount = scope.entity.attachmentsCount;
                            else scope.itemCount = attCnt;

                            scope.addExisting = scope.entity.updatable;

                            //if ($state.current.name && $state.current.name.length > 6 && $state.current.name.substring(0, 5) == "edit.") scope.isOpen = true;
                            if ($state.current.name.toLowerCase().indexOf("edit") >= 0) {
                                scope.isInEdit = true;
                                scope.isOpen = true;
                            }
                            //scope.inputIdToClick = "atts" + scope.entityType.toString();
                            if (scope.isInEdit) scope.inputIdToClick += "edit";
                            scope.photosToView = $filter("filter")(scope.entity.documents, function (doc) {
                                return ((doc.isAttachment == 'true') && (doc.changeType != 2) && (doc.showPhoto));
                            });
                            scope.maxWidth = parseInt(window.innerWidth / 1.5);
                            dataApi.getAppUser().then(function (data) {
                                scope.appUser = data;
                                scope.isFullyUpdatable = scope.entity.updatable;
                                //console.log(scope.entity);
                                if (scope.isFullyUpdatable) {
                                    scope.isFullyUpdatable = false;  //start over must be in subsMayEdit
                                    scope.appUser.subsMayEdit.forEach(function (sub) {
                                        if (scope.entity.collection_Id == sub.group_Id) scope.isFullyUpdatable = true;
                                    });

                                }
                                scope.newItemCollectionId = (scope.isFullyUpdatable) ? scope.entity.collection_Id : scope.appUser.defaultCollection_Id;

                            });
                        }
                    }
                    //#endregion

                    scope.showAction = function (event, doc) {
                        if (event) event.stopPropagation();
                        if (doc.updatable) {
                            scope.actionDoc = doc;
                            var mybuttons = [];
                            mybuttons.push({ text: '<div class=""><i class="icon ion-edit "></i>Rename</div>', itemname: 'edit' });
                            var hideSheet = $ionicActionSheet.show({
                                buttons: mybuttons,
                                titleText: doc.name.toUpperCase(),
                                cancelText: 'Cancel',
                                cssClass: 'no-scroll',
                                destructiveText: '<div class="assertive"><i class="icon ion-trash-b"></i>Delete</div>',
                                cancel: function () {
                                    hideSheet();
                                },
                                buttonClicked: function (index) {
                                    doAction(this.buttons[index].itemname);
                                    hideSheet();
                                },
                                destructiveButtonClicked: function (index) {
                                    doAction('delete');
                                    hideSheet();
                                }
                            });
                        }
                    }

                    function doAction(action) {
                        switch (action.toLowerCase()) {
                            case "edit":
                                scope.editItem(scope.actionDoc);
                                break;
                            case "delete":
                                scope.deleteItem(scope.actionDoc);
                                break;
                        }
                    }

                    //#region Attachment Actions
                    // scope.showAttachActions = function () {
                    //     var mybuttons = [];
                    //
                    //     mybuttons.push({ text: '<i class="icon shuri-upload"></i>Attach a file', itemname: 'file' });
                    //     mybuttons.push({ text: '<i class="icon ion-camera"></i>Take a photo or video', itemname: 'photo' });
                    //     mybuttons.push({ text: '<i class="icon ion-mic-a"></i>Record Audio', itemname: 'audio' });
                    //
                    //      var hideSheet = $ionicActionSheet.show({
                    //         buttons: mybuttons,
                    //         titleText: scope.wordFor('Add') + ' ' + scope.wordFor('Attachment'),
                    //         cancelText: scope.wordFor('Cancel'),
                    //         cancel: function () {
                    //             hideSheet();
                    //         },
                    //         buttonClicked: function (index) {
                    //             //console.log(this.buttons[index]);
                    //             scope.doAttach(this.buttons[index].itemname)
                    //             hideSheet();
                    //
                    //         }
                    //     });
                    //
                    // }

                    scope.doAttach = function (itemname) {
                        switch (itemname) {
                            case "file":
                                scope.attachFile();
                                break;
                            case "photo":
                                scope.attachPhoto();
                                break;
                            case "audio":
                                if (window.cordova) {
                                    scope.recordAudio();
                                }
                                else scope.attachFile();
                                break;
                        }
                    }

                    scope.attachmentHelp = function (event) {
                        if (event) event.stopPropagation();

                        var helpTemplate = "";
                        helpTemplate = globals.getHelpView("attachments");
                        if (helpTemplate.template != "") {
                            $ionicModal.fromTemplateUrl(helpTemplate.template, {
                                scope: scope,
                                animation: 'slide-in-up'
                            }).then(function (modal) {
                                scope.modalHelp = modal;
                                scope.modalHelp.show();
                            });
                        }
                    }

                    scope.closeHelp = function () {
                        scope.modalHelp.hide();
                        scope.modalHelp.remove();
                    }

                    scope.attachFile = function (event) {
                        if (event) event.stopPropagation();
                        //console.log(scope.inputIdToClick);
                        document.getElementById(scope.inputIdToClick).click();
                    };

                    scope.attachPhoto = function () {
                        if (window.cordova) {
                            var options = {
                                quality: 70,
                                destinationType: Camera.DestinationType.DATA_URL,
                                sourceType: Camera.PictureSourceType.CAMERA,
                                allowEdit: true,
                                encodingType: Camera.EncodingType.JPEG,
                                saveToPhotoAlbum: false
                            };
                            try {
                                $cordovaCamera.getPicture(options).then(function (imageData) {
                                    //console.log(imageData);
                                    var filename = String.format("photo-{0}", new Date());
                                    var contentType = "image/jpeg";
                                    dataApi.postPhoto(imageData, filename, contentType).then(function (data) {
                                        scope.entity.documents.push(data);
                                        scope.anyPhotos = true;
                                        scope.isDirty = true;
                                        data.changeType = 1;
                                        assignUI();
                                    });
                                }, function (err) {
                                    globals.showAlert("Error: " + err);
                                });
                            }
                            catch (e) { globals.showAlert("Error", e); }
                        }
                        else scope.attachFile();
                    };

                    scope.recordAudio = function () {
                        var toAssociate = [];

                        if (window.cordova) {
                            navigator.device.capture.captureAudio(function (files) {
                                var getFileBlob = function (url, cb) {
                                    var xhr = new XMLHttpRequest();
                                    xhr.open("GET", url);
                                    xhr.responseType = "blob";
                                    xhr.addEventListener('load', function () {
                                        cb(xhr.response);
                                    });
                                    xhr.send();
                                };

                                var blobToFile = function (blob, name) {
                                    blob.lastModifiedDate = new Date();
                                    blob.name = name;
                                    return blob;
                                };

                                var getFileObject = function (filePathOrUrl, cb) {
                                    getFileBlob(filePathOrUrl, function (blob) {
                                        cb(blobToFile(blob, files[0].name));
                                    });
                                };
                                if (files.length > 0) {
                                    var fullFilePath = files[0].fullPath;
                                    getFileObject(fullFilePath, function (fileObject) {
                                        scope.newFileLoading = true;
                                        var sendArray = [];
                                        sendArray.push(fileObject);
                                        dataApi.postFiles(sendArray, scope.newItemCollectionId).then(function (data) {
                                            console.log(data);
                                            toAssociate = data;
                                            for (var i = 0; i < data.length; i++) {
                                                data[i].changeType = shuri_enums.changetype.update;
                                                scope.entity.documents.push(data[i]);
                                            }
                                            scope.anyFiles = true;
                                        }).then(function () {
                                            if (scope.manageUpdates) {
                                                for (var i = 0; i < toAssociate.length; i++) {
                                                    dataApi.postRelation(scope.entityType, scope.entity.id, shuri_enums.entitytypes.document, toAssociate[i].id);
                                                    assignUI();
                                                }
                                            }
                                            else {
                                                scope.isDirty = true;
                                                assignUI();
                                            }
                                        }).then(function () {
                                            scope.newFileLoading = false;
                                            assignUI();
                                        });
                                    });
                                }
                                else {
                                    scope.newFileLoading = false;
                                }

                            }, function (error) {
                                scope.newFileLoading = false;
                                console.log(error);
                            });
                        }
                        else scope.attachFile();
                    }
                    //#endregion

                    //#region Manage files
                    scope.uploadFiles = function (files) {
                        if (files.length != 0) {
                            scope.newFileLoading = true;
                            dataApi.postFiles(files, scope.newItemCollectionId).then(function (data) {

                                data.forEach(function (doc) {
                                    console.log(scope.manageUpdates);
                                    doc.isAttachment = true;
                                    doc.changeType =  shuri_enums.changetype.update;
                                    doc.showPhoto = isImage(doc.value);

                                    if (scope.manageUpdates) {
                                        dataApi.postRelation(scope.entityType, scope.entity.id, shuri_enums.entitytypes.document, doc.id).then(function (rdata) {
                                            console.log(rdata);
                                            scope.anyFiles = true;
                                            scope.entity.documents.push(doc);
                                        });
                                    }
                                    else {
                                        scope.isDirty = true;
                                        scope.anyFiles = true;
                                        scope.entity.documents.push(doc);
                                    }

                                });
                                if (scope.manageUpdates) {
                                    dataApi.updateEntityModifiedDt(scope.entity.id, scope.entityType).then(function () {
                                        finishUploadFiles();
                                    });
                                }
                                else finishUploadFiles();
                            });
                        }
                        else {
                            console.log('nothing was picked');
                        }
                    }

                    function finishUploadFiles() {
                        scope.newFileLoading = false;
                        scope.isOpen = true;
                        assignUI();

                    }

                    scope.openAttachment = function (doc) {
                        var url = doc.value;
                        var target = "_self";

                        if (url.indexOf(".pdf") > 0) target = "_blank";
                        var win = window.open(url, target);

                    }

                    scope.openPhoto = function (doc) {
                        //console.log(doc);
                      scope.currentPhoto = doc;
                      var tmplt = "modalViewerCordova.html";
                      if (scope.onDesktop && !localStorage.getItem("expandUI")) tmplt = "modalViewerDesktop.html";

                      //console.log(scope.currentPhoto);
                      $ionicModal.fromTemplateUrl(tmplt, {
                            scope: scope,
                            animation: 'slide-in-up'
                        }).then(function (modal) {
                            scope.modal = modal;
                            scope.modal.show();
                        });

                    }

                    scope.closeModal = function () {
                        scope.modal.hide();
                        scope.modal.remove();
                    };

                    scope.editItem = function (item) {
                        scope.editedItem = item;
                        var confirmPopup = $ionicPopup.confirm({
                            title: "Rename Attachment",
                            scope: scope,
                            template: '<div class="item item-input item-stacked-label"><span class="input-label itemLabel">Attachment Name</span><input type="text" on-focus="this.select();" ng-model="editedItem.name" ></div>'
                        });
                        confirmPopup.then(function (res) {
                            if (res) {
                                if (scope.manageUpdates) {
                                    dataApi.postEntity("documents", "document", item, appGlobals.guidEmpty).then(function (data) {
                                        //good to go
                                    });
                                }
                                else {
                                    item.changeType = 1;
                                    scope.isDirty = true;
                                }
                            }
                        });

                    }

                    function doTheRemove(item) {
                        scope.itemCount--;
                        if (scope.manageUpdates) {
                          dataApi.deleteRelation(scope.entityType, scope.entity.id, shuri_enums.entitytypes.document, item.id).then(function () {
                            dataApi.updateEntityModifiedDt(scope.entity.id, scope.entityType).then(function () {

                              $rootScope.$broadcast("EntityChanged", scope.entity.id);
                            });
                          });
                        }
                        else {
                            item.changeType = shuri_enums.changetype.remove;
                            scope.isDirty = true;
                        }
                   }

                    scope.deleteItem = function (doc) {
                        var confirmPopup = $ionicPopup.confirm({
                            title: "Confirm Delete",
                            template: "Permanently delete " + doc.name + "?"
                        });
                        confirmPopup.then(function (res) {
                            if (res) {
                                //console.log(scope.manageUpdates);
                                //return;
                                if (scope.manageUpdates) {
                                    dataApi.deleteEntity(doc.id, shuri_enums.entitytypes.document, doc).then(function () {
                                        dataApi.updateEntityModifiedDt(scope.entity.id, scope.entityType).then(function () {
                                            //broadcast
                                            $rootScope.$broadcast("EntityChanged", scope.entity.id);
                                        });
                                    });
                                }
                                else {
                                    item.changeType = shuri_enums.changetype.remove;
                                    item.typename = "DELETE";
                                    scope.isDirty = true;
                                }
                            }

                        });

                    }

                    //#endregion

                }
            };
        }]);

})();
