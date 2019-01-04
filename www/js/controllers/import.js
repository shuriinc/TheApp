(function () {
    'use strict';

    angular.module("shuriApp").controller('ImportCtrl', function ($rootScope, $scope, $state, $ionicPopup, dataApi, globals, appGlobals) {
        var vm = this;
        vm.onDesktop = !(window.cordova);
        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.goTo = function(selection){
          switch(selection){
            case "excel":
              var url = "importXls";
              break;
            case "phone":
              var url = "phoneUpload";
              break;
            case "facebook":
              var url = "facebookUpload";
              break;
            case "linkedin":
              var url = "linkedinUpload";
              break;
            case "twitter":
              var url = "twitterUpload";
              break;
          }
          $state.go("home."+url);
        }

        vm.toggleHelp = function (event, mode) {
            if (event) event.stopPropagation();

            if (mode == 'excel') vm.showHelpExcel = !vm.showHelpExcel;
        }

        vm.test = function () {
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                var grp = new shuri_group();
                grp.name = "Test" + Date.now() ;
                grp.grpType = 0;
                grp.collection_Id = vm.appUser.defaultCollection_Id;

                //tagset
                var utTagset = new shuri_userType();
                utTagset.name = "Anyold Tag Set";
                utTagset.collection_Id = grp.collection_Id;
                grp.userTypes.push(utTagset);

                //tags
                for (var i = 0; i < 4; i++) {
                    var tg = new shuri_tag();
                    tg.name = 'Tag' + i.toString();
                    utTagset.tags.push(tg);
                }


                //people
                for (var i = 0; i < 4; i++) {
                    var p = new shuri_person();
                    p.firstname = 'Joan';
                    p.lastname = 'Smythe' + i.toString();
                    p.tags.push(utTagset.tags[i]);

                    //location
                    var loc = new shuri_location;
                    loc.latitude = 38 - i;
                    loc.longitude = -107 + i;
                    loc.place_Id = "PlaceId" + i;
                    loc.address = "Address for PlaceId" + i;
                    loc.userType_Id = appGlobals.utConstants.loc_business;
                    p.locations.push(loc);

                    grp.people.push(p);
                }
                console.log(grp);
                dataApi.postEntity("WholeGroup", "group", grp).then(function (data) {
                    console.log(data);
                          });
            });
        }
    });


    angular.module("shuriApp").controller('ContactsCtrl', function ($cordovaFile, $rootScope, $scope, $state, $ionicPopup, $ionicHistory, dataApi, globals, appGlobals) {
        var vm = this;
        vm.title = "Sync Contacts"
        vm.showList = true;
        vm.step = 1;
        vm.chosenContacts = [];
        vm.groupName = "";

        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.newGroupNameChange = function () {
            if (vm.groupName && vm.groupName.length > 2) {
                vm.groupnameChecked = true;
                dataApi.groupnameOK(vm.groupName, appGlobals.guidEmpty).then(function (data) {
                    vm.groupnameOK = data;
                    console.log(data);
                });
            }
            else vm.groupnameChecked = false;
        };

        vm.cancel = function() {
            $ionicHistory.goBack(-1)
        };

        vm.save = function () {
            vm.contacts.forEach(function (cont) {
                if (cont.isSynced) console.log(cont);
            });
            vm.cancel();
        }

        vm.import = function(contacts){
          vm.disableImport = true;
          vm.importGroup = new shuri_group()

          vm.importGroup.name = vm.groupName;
          vm.importGroup.description = String.format("Imported on {0} from {1}", new Date(), vm.description);
          vm.groupName = "";
          vm.description = '';
          vm.importGroup.grpType = shuri_enums.grouptype.private;

          for(var i = 0; i < contacts.length; i++){
            if(contacts[i].isChecked == true){
              var person = new shuri_person();
              if(contacts[i].name.formatted.split(" ")[0]){
                person.firstname = contacts[i].name.formatted.split(" ")[0];
              }
              if(contacts[i].name.formatted.split(" ")[1]){
                var lastname = contacts[i].name.formatted.split(' ');
                if(lastname[lastname.length - 1] == '') {
                  person.lastname = lastname[lastname.length - 2]
                } else {
                  person.lastname = lastname[lastname.length - 1]
                }
              }
              if(contacts[i].phoneNumbers){
                var cp = new shuri_contactPoint();
                cp.name = contacts[i].phoneNumbers[0].value;
                cp.userType_Id = appGlobals.utConstants.cp_businessPhone;
                cp.primitive = 2;
                person.contactPoints.push(cp);
              }
              if(contacts[i].emails){
                var cp = new shuri_contactPoint();
                cp.name = contacts[i].emails[0].value;
                cp.userType_Id = appGlobals.utConstants.cp_email;
                cp.primitive = 1;
                person.contactPoints.push(cp);
              }
              vm.importGroup.people.push(person)
            }
          }
          vm.removeduplicates()
          if(vm.collection){
            vm.importGroup.collection_Id = vm.collection;
          }
          console.log(vm.importGroup, "import group");
          dataApi.postEntity("WholeGroup", "group", vm.importGroup).then(function (data) {
              globals.showAlert("Success", "Import has been completed.  Your new group is called <b>" + vm.importGroup.name + "</b>.");
              dataApi.refreshAppUser();
              dataApi.clearCache();
              vm.importGroup = {};
              vm.contacts = [];
              vm.disableImport = false;
              vm.step = 1;
              $rootScope.$broadcast("RefreshMain");
              $state.go('home.main');
              vm.showList = true;
          },
          function(errorObj){
            if(errorObj){
              console.log(errorObj);
            }
          });
        };

        vm.addedAContact = function(){
          vm.canSend = true;
          console.log(vm.canSend);
        }

        vm.selectAll = function(){
          for(var i = 0; i < vm.contacts.length; i++){
            vm.contacts[i].isChecked = !vm.contacts[i].isChecked;
          }
            vm.canSend = true;
        }

        function onSuccess(contacts) {
            //console.log(contacts);
            vm.contacts = contacts;
            vm.contacts1 = contacts.slice(0);
            vm.contactsHeader = vm.contacts.length + " Contacts";
            //alert('Found ' + contacts.length + ' contacts.');
        };

        vm.toggleCheck = function (event) {
            if (event) event.stopPropagation();
            vm.allCheck = !vm.allCheck;
            vm.contacts.forEach(function (c) {
                c.isSynced = vm.allCheck;
            });

        }

        vm.getContactList = function() {
          function onError(contactError) {
              alert('onError!');
          };

            // find all contacts with 'Bob' in any name field 
          console.log(navigator.contacts);
          var options = new ContactFindOptions();
          options.filter = "a";
          options.multiple = true;
          options.desiredFields = [navigator.contacts.fieldType.id, navigator.contacts.fieldType.name];
          //options.hasPhoneNumber = true;
          var fields = [navigator.contacts.fieldType.name];
          navigator.contacts.find(fields, onSuccess, onError, options);
        };

        vm.removeduplicates = function(){
          for(var i = 0; i < vm.importGroup.people.length; i++){
            var firstname = ''
            if(vm.importGroup.people[i].firstname) firstname += vm.importGroup.people[i].firstname;
            if(vm.importGroup.people[i].lastname) firstname += (' ' +vm.importGroup.people[i].lastname);
            var personcount = vm.importGroup.people[i].count
            personcount = 0;
            for(var j = 0; j < vm.importGroup.people.length; j++){
              var secondname = ''
              if(vm.importGroup.people[j].firstname) secondname += vm.importGroup.people[j].firstname;
              if(vm.importGroup.people[j].lastname) secondname += (' ' +vm.importGroup.people[j].lastname);
              if(firstname == secondname){
                personcount++
              }
              if(personcount > 1){
                vm.importGroup.people.splice(j, 1)
                vm.removeduplicates();
                break;
              }
            }
          }
        };

        dataApi.initialize("").then(function (d) {
                vm.collections = d.appUser.subsMayEdit;
                for (var i = 0; i < vm.collections.length; i++) {
                    if (vm.collections[i].name == 'My Private Database') {
                        vm.collection = vm.collections[i].group_Id;
                    }
                }
                globals.sendAppView('importContacts', 14, appGlobals.guidSystem);
                globals.setHelpView('importContacts');
                vm.getContactList();
        });

    });

    angular.module("shuriApp").controller('FacebookUploadCtrl', function ($scope, $http, $state, $ionicPopup, $cordovaOauth, dataApi, globals) {
        var vm = this;
        vm.title = "Facebook Upload";
        vm.showList = true;
        vm.smName = "Facebook";

        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.facebookLogin = function() {
          dataApi.getAppUser().then(function(user){
            for(var i = 0; i < user.documents.length; i++){
              if(user.documents[i].typename == "fb_accessToken"){
                // do the fb call to get info
                console.log("got a token");
                $http({
                  method: 'GET',
                  url: 'https://graph.facebook.com/me',
                  headers: {'Authorization': 'Bearer ' + user.documents[i].value}
                }).then(function successCallback(response) {
                    console.log(response, "this is the new resonse");
                  }, function errorCallback(response) {
                    console.log(response, "log error here");
                  });
                vm.hasAccessToken = true;
              }
            }
              // results
            if(!vm.hasAccessToken){
              $cordovaOauth.facebook("911541502232246", ["email", "user_friends"]).then(function(result) {
                var doc = new shuri_document();
                doc.typename = "fb_accessToken";
                doc.value = result.access_token;
                doc.primitive = 2;
                doc.changeType = 1;
                user.changeType = 1;

                dataApi.postEntity("people", "person", user).then(function(updatedUser){
                  $http({
                    method: 'GET',
                    url: 'https://graph.facebook.com/me/friendslist',
                    headers: {'Authorization': 'Bearer ' + result.access_token}
                  }).then(function successCallback(response) {
                      console.log(response, "this is the new resonse");
                    }, function errorCallback(response) {
                      console.log(response, "log error here");
                    });

                });

              }, function(error){
                console.log(error, "error");
              })
            }
          });
          }

        vm.resetForm = function() {
          var confirmPopup = $ionicPopup.confirm({
              title: "Cancel Import",
              template: "Your current import changes will not be saved. Are you sure?"
          });
          confirmPopup.then(function (res) {
              if (res) {
                  $state.go("home.import")
                }
          });
        };

    });

    angular.module("shuriApp").controller('TwitterUploadCtrl', function ($rootScope, $scope, $http, $state, $ionicPopup, $cordovaOauth, $cordovaOauthUtility, dataApi, globals, connectedService, appGlobals) {
        var vm = this;
        vm.title = "Twitter Upload";
        vm.showList = false;
        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.refresh = function(){
          connectedService.twitter.isTwitterAuthenticated().then(function(authenticated){
            dataApi.getAppUser().then(function(data){
              vm.collections = data.subsMayEdit;
              for(var i = 0; i < vm.collections.length; i++){
                if(vm.collections[i].name == 'My Private Database'){
                  vm.collection = vm.collections[i].group_Id;
                }
              }
              if(authenticated){
                vm.step = 1;
              } else {
                vm.step = 0;
              }
              vm.showList = true;
              globals.setHelpView('importTwitter');
            });
          });
        };

        vm.authenticateTwitter = function(){
          vm.showList = false;
          connectedService.twitter.twitterInitialize().then(function(result){
            if(result === true){
              vm.step = 1;
              vm.showList = true;
            } else {
              alert("There was an error with your credentials")
              vm.showList = true;
            }
          })
        };

        vm.getTwitter = function(){
          vm.showList = false;
          connectedService.twitter.twitterInitialize().then(function(result){
              if(result === true){
                vm.friendsList = [];
                vm.getMyFollowers();
              }
          })
        };

        vm.getMyFollowers = function(cursor){
          var send = connectedService.twitter.getMyFollowers();
          if(cursor) send = connectedService.twitter.getMyFollowers(cursor);
          send.then(function(data){
            for(var i = 0; i < data.users.length; i++){
              vm.friendsList.push(data.users[i])
            }
            if(data.next_cursor > 0){
              vm.getMyFollowers(data.next_cursor)
            } else {
              vm.getMyFollowing()
            }
          });
        };

        vm.getMyFollowing = function(cursor){
          var send = connectedService.twitter.getMyFollowing();
          if(cursor) send = connectedService.twitter.getMyFollowing(cursor);
          send.then(function(data){
            for(var i = 0; i < data.users.length; i++){
              vm.friendsList.push(data.users[i])
            }
            if(data.next_cursor > 0){
              console.log('making the following call again');
              vm.getMyFollowing(data.next_cursor)
            } else {
              vm.removeduplicates();
              vm.showList = true;
              vm.step = 2;
            }
          });
        };

        vm.removeduplicates = function(){
          for(var i = 0; i < vm.friendsList.length; i++){
            var person = vm.friendsList[i].name;
            var personcount = vm.friendsList[i].count
            personcount = 0;
            for(var j = 0; j < vm.friendsList.length; j++){
              if(vm.friendsList[j].name == person){
                personcount++
              }
              if(personcount > 1){
                vm.friendsList.splice(j, 1)
                vm.removeduplicates();
                break;
              }
            }
          }
        };

        vm.addedAContact = function(){
          vm.canSend = true;
          console.log(vm.canSend);
        }

        vm.selectAll = function(){
          for(var i = 0; i < vm.friendsList.length; i++){
            vm.friendsList[i].isChecked = !vm.friendsList[i].isChecked;
          }
            vm.canSend = true;
        }

        vm.import = function(contacts){
          vm.showList = false;
          vm.disableImport = true;
          vm.importGroup = new shuri_group()

          vm.importGroup.name = vm.groupName;
          vm.importGroup.description = String.format("Imported on {0} from {1}", new Date(), vm.description);
          vm.groupName = "";
          vm.description = "";
          vm.importGroup.grpType = shuri_enums.grouptype.private;

          if(vm.collection){
            vm.importGroup.collection_Id = vm.collection;
            console.log(vm.collection, vm.importGroup.collection_Id);
          }

          for(var i = 0; i < contacts.length; i++){
            if(contacts[i].isChecked == true){
              var person = new shuri_person();
              if(contacts[i].name.split(" ")[0]){
                person.firstname = contacts[i].name.split(" ")[0];
              }
              if(contacts[i].name.split(" ")[1]){
                var lastname = contacts[i].name.split(' ');
                if(lastname[lastname.length - 1] == '') {
                  person.lastname = lastname[lastname.length - 2]
                } else {
                  person.lastname = lastname[lastname.length - 1]
                }
              }
              if(contacts[i].description){
                person.description = contacts[i].description;
              }
              if(contacts[i].screen_name){
                var cp = new shuri_contactPoint();
                cp.name = contacts[i].screen_name;
                cp.userType_Id = appGlobals.utConstants.cp_twitterUsername;
                cp.primitive = 1;
                person.contactPoints.push(cp);
              }
              if(contacts[i].profile_image_url){
                person.imageUrl = contacts[i].profile_image_url;
              }
              console.log(person);
              vm.importGroup.people.push(person)
            }
          }

          console.log(vm.importGroup, "import group");
          dataApi.postEntity("WholeGroup", "group", vm.importGroup).then(function (data) {
              globals.showAlert("Success", "Import has been completed.  Your new group is called <b>" + vm.importGroup.name + "</b>.");
              dataApi.clearCache();
              vm.importGroup = {};
              vm.disableImport = false;
              $rootScope.$broadcast('GroupsHardRefresh');
              vm.showList = true;
              globals.sendAppView('importTwitter', 14, appGlobals.guidSystem);

              $state.go('home.main');
          },
          function(errorObj){
            if(errorObj){
              console.log(errorObj);
            }
          });
        };

        vm.resetForm = function() {
          var confirmPopup = $ionicPopup.confirm({
              title: "Cancel Import",
              template: "Your current import changes will not be saved. Are you sure?"
          });
          confirmPopup.then(function (res) {
              if (res) {
                  vm.groupName = '';
                  vm.description = '';
                  $state.go("home.import")
                }
          });
        };

        vm.newGroupNameChange = function () {
            if (vm.groupName && vm.groupName.length > 2) {
                vm.groupnameChecked = true;
                // dataApi.usernameOK(vm.newGroup.name).then(function (data) {
                dataApi.groupnameOK(vm.groupName, appGlobals.guidEmpty).then(function (data) {
                    vm.groupnameOK = data;
                });
            }
            else vm.groupnameChecked = false;
        }

        $scope.$on('$ionicView.enter', function () {
            vm.refresh();
        });


    });

    angular.module("shuriApp").controller('LinkedInCtrl', function ($scope, $state, $ionicPopup, $cordovaOauth, dataApi, globals) {
        var vm = this;
        vm.title = "LinkedIn Upload"
        vm.showList = true;

        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.linkedinLogin = function() {
        $cordovaOauth.linkedin("784ucyzduwa9zj", "VqN6Q2oS3p94WmUB", ["email"], "development").then(function(result) {
              // results
              console.log(results, "results");
          }, function(error) {
              // error
              console.log(error, "error");
          });
        }

        vm.resetForm = function() {
          var confirmPopup = $ionicPopup.confirm({
              title: "Cancel Import",
              template: "Your current import changes will not be saved. Are you sure?"
          });
          confirmPopup.then(function (res) {
              if (res) {
                  $state.go("home.import")
                }
          });
        };

    });
 })();
