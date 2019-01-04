(function () {
    'use strict';

    angular.module("shuriApp").directive('avatar', ['$http', '$cordovaCamera', '$cordovaFileOpener2', '$ionicPopup', '$ionicActionSheet', '$ionicListDelegate', '$ionicLoading', '$state', '$window', 'globals', 'dataApi', 'appGlobals',
        function ($http, $cordovaCamera, $cordovaFileOpener2, $ionicPopup, $ionicActionSheet, $ionicListDelegate,$ionicLoading, $state, $window, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    entityType: '=',
                    updatable: '=',

                },
                templateUrl: "templates/directives/avatar.html?" + _cacheBuster,
                link: function (scope, elem, attrs) {
                    scope.photoSearch = false;
                    scope.onDesktop = !(window.cordova);
                    //console.log(scope.entityType);

                    var watcherE = scope.$watch('entity', function () {
                        if (scope.entity === undefined) return;
                        assignUI();
                    });
                    var watcherET = scope.$watch('entityType', function () {
                        if (scope.entityType === undefined) return;
                        assignUI();
                    });
                    var watcherU = scope.$watch('updatable', function () {
                        if (scope.updatable === undefined) return;
                        scope.updatableHasBeenSet = true;
                        assignUI();
                    });

                    function assignUI() {
                        if (scope.entity && scope.entityType && scope.updatableHasBeenSet) {
                            dataApi.getAppUser().then(function (data) {
                                scope.appUser = data;

                                scope.fullyUpdatable = false;
                                if (scope.appUser.id == scope.entity.id) scope.fullyUpdatable = true;
                                else {
                                    scope.appUser.subsMayEdit.forEach(function (coll) {
                                        if (coll.group_Id == scope.entity.collection_Id) scope.fullyUpdatable = true;
                                    });
                                }

                                if (!window.cordova) scope.noPhotoCapability = true;
                                 ////console.log(scope.appUser.subsMayEdit, scope.appUser.id , scope.entity.id);
                                //if (!scope.updatable && !scope.entity.imageUrl && (scope.entity.grpType === shuri_enums.grouptype.organization)) {
                                //  scope.entity.imageUrl = 'https://shuristoragecdn.blob.core.windows.net/public/notavailableorg.png';
                                //}
                                //if (!scope.updatable && !scope.entity.imageUrl && !scope.entity.grpType) {
                                //    scope.entity.imageUrl = 'https://shuristoragecdn.blob.core.windows.net/public/notavailable.jpg';
                                //}
                            });
                        }
                    }

                    scope.getImage = function () {
                        $ionicListDelegate.closeOptionButtons();
                        if (scope.entity.imageUrl) {
                            var confirmPopup = $ionicPopup.confirm({
                                title: 'Replace Avatar',
                                template: "Do you want to replace the current Avatar?"
                            });
                            confirmPopup.then(function (res) {
                                if (res) {
                                    var url = "https://www.google.com/search?site=imghp&tbm=isch&source=hp&q=" + encodeURIComponent(scope.entity.name);
                                    var listener = function (event) {
                                        scope.newImage = event.url;
                                        scope.photoSearch = true;
                                        scope.$apply();
                                    };
                                    var win = window.open(url, '_blank', 'location=yes', 'closebuttoncaption=Return');
                                    win.addEventListener('loadstart', listener);
                                    win.addEventListener('exit', function (event) { win.removeEventListener('loadstart', listener); });
                                }
                            });
                        } else {
                            var url = "https://www.google.com/search?site=imghp&tbm=isch&source=hp&q=" + encodeURIComponent(scope.entity.name);
                            var listener = function (event) {
                                scope.newImage = event.url;
                                scope.photoSearch = true;
                                scope.$apply();
                            };
                            var win = window.open(url, '_blank', 'location=yes', 'closebuttoncaption=Return');
                            win.addEventListener('loadstart', listener);
                            win.addEventListener('exit', function (event) { win.removeEventListener('loadstart', listener); });
                        }
                    };

                    scope.updatePhotoUrl = function (photo) {
                        scope.avatarUploading = true;
                        scope.photoSearch = !scope.photoSearch;
                        $ionicListDelegate.closeOptionButtons();
                        function getBase64FromImageUrl(url) {
                            var img = new Image();

                            img.setAttribute('crossOrigin', 'anonymous');

                            img.onload = function () {
                                var canvas = document.createElement("canvas");
                                canvas.width = this.width;
                                canvas.height = this.height;

                                var ctx = canvas.getContext("2d");
                                ctx.drawImage(this, 0, 0);

                                var dataURL = canvas.toDataURL("image/png");

                                alert(dataURL.replace(/^data:image\/(png|jpg);base64,/, ""));
                            };

                            img.src = url;
                        }
                        // $http.get(photo).then(function(data){
                        //   console.log(data);
                        //   if(data.data){
                        //     var base64 = window.btoa(escape(encodeURIComponent(data.data)));
                        //     dataApi.postPhotoImageUrl(base64, scope.entity.id, entity).then(function (data) {
                        //       console.log(data, 'image data');
                        //       scope.entity.imageUrl = data;
                        //       scope.avatarUploading = false;
                        //     }, function(err){
                        //       console.log(err);
                        //     });
                        //   } else {
                        //     scope.avatarUploading = false;
                        //     alert("Sorry, there was an error with your image. Please make sure the photo has an image file extension.")
                        //   }
                        // })

                     }

                    scope.cancelPhotoUrl = function () {
                        scope.photoSearch = !scope.photoSearch;
                        scope.newImage = '';
                    }

                    scope.searchPhoto = function () {
                        $ionicListDelegate.closeOptionButtons();
                        scope.photoSearch = !scope.photoSearch;
                        scope.newImage = scope.entity.imageUrl;
                    }

                    scope.uploadFiles = function (files) {
                        //console.log(files);
                        dataApi.postFileImageUrl(files, scope.entity.id, scope.entityType).then(function (data) {
                            //console.log(data);
                        });
                        //scope.avatarUploading = true;
                        //console.log(scope.avatarUploading);
                        //scope.entity.imageUrl = '';
                        //loadImage.parseMetaData(files[0], function (data) {
                        //    var options = { canvas: 'true' };
                        //    if (data.exif) {
                        //        options.orientation = data.exif.get('Orientation');
                        //    }
                        //    loadImage(files[0], function (img) {
                        //        img.toBlob(
                        //                function (blob) {
                        //                    blob.name = files[0].name
                        //                    blob.lastModifiedDate = new Date();
                        //                    dataApi.postfilesImageUrl(blob, scope.entity.id, scope.entityType).then(function (data) {
                        //                        scope.entity.imageUrl = data;
                        //                        scope.avatarUploading = false;
                        //                        //console.log(scope.entity.imageUrl);
                        //                    }, function (err) {
                        //                        console.log(err);
                        //                        scope.avatarUploading = false;
                        //                    });
                        //                },
                        //                'image/jpeg'
                        //            );
                        //    }, options)
                        //});

                    }
                    scope.selectPicture = function () {
                        var options = {
                            quality: 50,
                            destinationType: Camera.DestinationType.FILE_URI,
                            sourceType: Camera.PictureSourceType.PHOTOLIBRARY
                        };

                        $cordovaCamera.getPicture(options).then(
                          function (imageURI) {
                              window.resolveLocalFileSystemURI(imageURI, function (fileEntry) {
                                  $window.alert(fileEntry.nativeURL);
                                  $window.alert(angular.toJson(fileEntry));
                              });
                              $ionicLoading.show({ template: 'Got photo...', duration: 500 });
                          },
                          function (err) {
                              $ionicLoading.show({ template: 'Error...', duration: 500 });
                          })
                    };

                    scope.uploadPicture = function () {
                        //$ionicLoading.show({ template: 'Sto inviando la foto...' });
                        //var fileURL = $scope.picData;
                        //var options = new FileUploadOptions();
                        //options.fileKey = "file";
                        //options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
                        //options.mimeType = "image/jpeg";
                        //options.chunkedMode = true;

                        //var params = {};
                        //params.value1 = "someparams";
                        //params.value2 = "otherparams";

                        //options.params = params;

                        //var ft = new FileTransfer();
                        //ft.upload(fileURL, encodeURI("http://www.yourdomain.com/upload.php"), viewUploadedPictures, function (error) {
                        //    $ionicLoading.show({ template: 'Errore di connessione...' });
                        //    $ionicLoading.hide();
                        //}, options);
                    }


                    scope.browseFile = function () {
                         if (ionic.Platform.isAndroid()) {
                             scope.selectPicture();
 
                        }
                        else {
                            if(scope.entityType == 4) {
                                scope.filename = 'camera-file';
                            } else if (scope.entityType == 9){
                                scope.filename = 'camera-fileorg';
                            }
                            setTimeout(function () {
                                document.getElementById(scope.filename).click();
                            }, 100);

                        }

                    };

                    scope.removeAvatar = function () {
                        var confirmPopup = $ionicPopup.confirm({
                            title: 'Delete Avatar',
                            template: "Delete current avatar?"
                        });
                        confirmPopup.then(function (res) {
                            if (res) {
                                scope.photoSearch = false;
                                scope.entity.imageUrl = '';
                                dataApi.deleteEntityImageUrl(scope.entity.id, scope.entityType).then(function () {
                                })
                            }
                        })
                    };

                    scope.takePhoto = function (itemname) {
                        // if taking a picture for android
                        //if (itemname == 'Camera') {
                        if (window.cordova) {
                            var options = {
                                quality: 70,
                                destinationType: Camera.DestinationType.DATA_URL,
                                sourceType: Camera.PictureSourceType.CAMERA,
                                allowEdit: true,
                                encodingType: Camera.EncodingType.JPEG,
                                mediaType: Camera.MediaType.Camera,
                                saveToPhotoAlbum: false,
                                correctOrientation: true
                            };
                            try {
                                $cordovaCamera.getPicture(options).then(function (imageData) {
                                    scope.avatarUploading = true;
                                    console.log(imageData, "image data first");
                                    dataApi.postPhotoImageUrl(imageData, scope.entity.id, scope.entityType).then(function (data) {
                                        //console.log(data, 'image data');
                                        scope.entity.imageUrl = data;
                                        scope.avatarUploading = false;
                                    }, function (err) {
                                        console.log(err);
                                    });
                                }, function (err) {
                                    console.log(err);
                                    globals.showAlert("Error: " + err);
                                });
                            }
                            catch (e) { globals.showAlert("Error", e); console.log(e); }
                        }
                        // if uploading a file for android

                        //else if (itemname == 'File') {
                        //    setTimeout(function () {
                        //        document.getElementById(scope.filename).click()
                        //    }, 0);
                        //}
                        //else {
                        //    console.log('error');
                        //}
                    };


                }
            };
        }])
})();
