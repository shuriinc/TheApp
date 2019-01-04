(function () {
  'use strict';

  angular.module("shuriApp").factory('dataApi', ['appGlobals', '$rootScope', '$state', '$http', '$q', '$timeout', '$filter', '$cacheFactory', '$templateCache', '$location', '$window', '$ionicHistory', '$ionicPopup', '$cordovaFileOpener2', dataApi]);
  function dataApi(appGlobals, $rootScope, $state, $http, $q, $timeout, $filter, $cacheFactory, $templateCache, $location, $window, $ionicHistory, $ionicPopup, $cordovaFileOpener2) {
    var vm = this;
    vm.cache = $cacheFactory('dataCache', { capacity: 512 });
    vm.dataSources = [
      { name: "Production", apiUrl: "https://api.shuri.com/api/", apiKey: "7C8CCCB1-6AC7-4F77-B599-ADA8E1558C6F" },
      { name: "Staging", apiUrl: "https://apistage.shuri.com/api/", apiKey: "DDA2F592-1C6C-43DD-8FE3-EC4F22AD7C16" },
      { name: "Development", apiUrl: "http://localhost:64000/api/", apiKey: "262835E3-D190-476E-861C-AF192269ECEF" }
    ];

    //localStorage.removeItem("loginInProgress");  //in case of error during previous login
    //sessionStorage.removeItem("initializeInProgress");  //in case of error during previous login

    function initialize(name) {
      var deferred = $q.defer();
      //console.log(name, "initilized", moment().format("HH:mm:ss:ms"));
      if (vm.isInitializing) {
        var ms = parseInt((Math.random() * 400) + 100);
        //console.log(name, "initializing...", ms);
        $timeout(function () {
          initialize(name).then(function (data) { deferred.resolve(data); });
        }, ms);

      }
      else {
        vm.isInitializing = true;
        if (!name || name == undefined) name = "initialize - unknown";
        login(name).then(function () {
          //console.log("loggggged in", name, moment().format("HH:mm:ss:ms"));

          $q.all({
            appUser: getAppUser(name),
            usertypes: getUserTypes()
          }).then(function (d) {
            var data = { appUser: d.appUser, usertypes: d.usertypes };
            //console.log("resolve", name, d, data);
            deferred.resolve(data);
            vm.isInitializing = false;
          }, function (reason) {
            console.error(name, "Unable to initialize.", reason);
            deferred.reject(reason);
            vm.isInitializing = false;
          });
        }, function (error) {
          //console.error(name, "Unable to login.", error);
          vm.isInitializing = false;

        });
        //console.log(name, moment().format("HH:mm:ss:ms"));

      }

      return deferred.promise;
    }

    //#region Cache
    function clearCache() {
      vm.cache.removeAll();
      localStorage.removeItem("loginInProgress");
      //console.log("cleared cache");
    }

    function clearCacheItem(key) {
      vm.cache.remove(key);
      vm.cache.remove(key.toLowerCase());
      //console.log("Cleared cached item: " + key);
    }

    function clearCacheItemByEntity(entityType, entityId) {
      var deferred = $q.defer();
      var key = "";
      switch (entityType) {
        case shuri_enums.entitytypes.group:
        case shuri_enums.entitytypes.team:
        case shuri_enums.entitytypes.private:
          key = "group" + entityId;
          //console.log(key);
          break;
        case shuri_enums.entitytypes.organization:
          //clear all permutations
          key = "org0" + entityId;
          clearCacheItem(key);
          key = "org1" + entityId;
          clearCacheItem(key);
          key = "org2" + entityId;
          clearCacheItem(key);
          key = "org" + entityId;
          break;
        case shuri_enums.entitytypes.person:
          //clear all permutations
          key = "person0" + entityId;
          clearCacheItem(key);
          key = "person1" + entityId;
          clearCacheItem(key);
          key = "person2" + entityId;
          clearCacheItem(key);
          key = "person" + entityId;
          //console.log(key);
          break;
        case shuri_enums.entitytypes.tag:
          key = "tag" + entityId;
          break;
        case shuri_enums.entitytypes.touch:
          //clear all permutations
          key = "touch0" + entityId;
          clearCacheItem(key);
          key = "touch1" + entityId;
          clearCacheItem(key);
          key = "touch2" + entityId;
          clearCacheItem(key);
          key = "touch" + entityId;
          break;
        case shuri_enums.entitytypes.location:
          key = "location" + entityId;
          break;
      }

      if (key != "") clearCacheItem(key);
      //console.log(entityType,"Cleared cached item: " + key);
      deferred.resolve();
      return deferred.promise;

    }

    //#endregion

    //#region Login, Admin & Datasources
    function login(name) {
      var deferred = $q.defer();
      var key = "login";

      var hasLoginKey = (vm.cache.get(key) != undefined);
      var hasAuthToken = ($http.defaults.headers.common.Authorization && $http.defaults.headers.common.Authorization != undefined && $http.defaults.headers.common.Authorization != "");

      if (hasLoginKey && hasAuthToken) {
        deferred.resolve();
        //console.log("login from cache", moment().format("HH:mm:ss:ms"));
      }
      //else if ((hasLoginKey && !hasAuthToken) || (!hasLoginKey && hasAuthToken)) {
      //    console.log(name, "setting keys...", !hasLoginKey);
      //    $timeout(function () {
      //        login(name).then(function () { deferred.resolve(); });
      //    }, parseInt((Math.random() * 400) + 100));
      //}
      //else if (!hasLoginKey && vm.loginInProgress) {
      //    console.log("login in progress...");
      //    $timeout(function () {
      //        login(name).then(function () { deferred.resolve(); });
      //    }, parseInt((Math.random() * 400) + 100));
      //}
      else {
        vm.loginInProgress = true;
        //if (!name || name == undefined) name = "login - unknown";
        //console.log(name, "login API================");
        //check for a token in local storage & test it if found
        var authToken = localStorage.getItem("appAuthToken");
        if (authToken == null || authToken.length < 10) {
          // console.log('needs a login');
          //if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
          clearCacheItem(key);
          deferred.reject("Not logged in");
          // console.log("sent to login");
          vm.loginInProgress = false;

          $state.go("login");
        }
        else {
          var ds = currentDS();
          $http.defaults.headers.common.Authorization = "Bearer  " + authToken;
          $http.defaults.headers.common["x-api-key"] = ds.apiKey;
          $http.get(ds.apiUrl + "checkAuth")
            .success(function (data) {
              //console.log(name, "resolved");

              //good to go
              vm.cache.put(key, "true");
              vm.loginInProgress = false;
              deferred.resolve();

            })
            .error(function (err) {
              console.error("checkauth failed", err);
              if (localStorage.getItem("appAuthToken")) localStorage.removeItem("appAuthToken")
              vm.loginInProgress = false;
              clearCacheItem(key);
              deferred.reject(err);
              $state.go("login");

              //var confirmPopup = $ionicPopup.confirm({
              //    title: 'Login Failed',
              //    template: "You may need to re-enter your login credentials.  Or, you may have Connection issues.<br /><br />Click OK to try again or Cancel to re-enter your login."
              //});
              //confirmPopup.then(function (res) {
              //    if (res) {
              //        $timeout(function () {
              //            deferred.resolve(login(name));
              //        }, 50)
              //    }
              //    else {


              //    }
              //});
            });
        }
      }
      return deferred.promise;
    }

    //tells the API to uncache AppUser
    function refreshAppUser() {
      var deferred = $q.defer();
      clearCacheItem("kUserTypes");

      login("dataApi").then(function () {
        $http({
          method: 'GET',
          url: currentDS().apiUrl + "refreshAppUser",
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCacheItem("appUser");
            deferred.resolve();
          }, function (reason) {
            handleError("refreshAppUser", e);
            deferred.reject(reason);
          });


      });
      return deferred.promise;
    }

    function logout() {
      var deferred = $q.defer();
      $http.post(currentDS().apiUrl + "logout")
        .success(function (data) {
          $http.defaults.headers.common.Authorization = null;
          if (localStorage.getItem("appAuthToken")) localStorage.removeItem("appAuthToken");
          if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress");
          $templateCache.removeAll();
          $ionicHistory.clearCache().then(function () {
            vm.loginInProgress = null;
            clearCache();
            deferred.resolve();
          });
        })
        .error(function () {
          console.log("Logout failed");
          $http.defaults.headers.common.Authorization = null;
          if (localStorage.getItem("appAuthToken")) localStorage.removeItem("appAuthToken")
          if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
          vm.loginInProgress = null;
          clearCache();
          deferred.reject();
        });
      //$state.go("login");
      return deferred.promise;
    }

    function currentDS() {
      var key = "currentDS";
      //default
      var ds = vm.dataSources[0];
      if (!window.cordova && $location.host().toLowerCase().indexOf("shuri.com") < 0) ds = vm.dataSources[1];  ///dev
      if (!window.cordova && $location.host().toLowerCase().indexOf("appstage.shuri") >= 0) ds = vm.dataSources[1];  ///staging
      //console.log($location.host().toLowerCase());

      if (vm.cache.get(key)) return vm.cache.get(key);
      else if (localStorage.getItem(key)) {
        ds = angular.fromJson(localStorage.getItem(key));
        vm.cache.put(key, ds);
      }
      return ds;
    }

    function setDS(dsToSet) {
      var key = "currentDS";
      vm.cache.put(key, dsToSet);
      localStorage.setItem(key, angular.toJson(dsToSet));
    }

    //function licenseCheck(appUser) {
    //    //license check---------------------------------------------
    //    // 1.  Validate the users subscriptions and calculate their allowedItems
    //    var userItems = appUser.ownedPeople + appUser.ownedOrgs + appUser.ownedTouches;
    //    if (appUser.licenseLevelItems < userItems) {
    //        //users get grace period for having more records than allowed - look in documents
    //        appUser.documents.forEach(function (doc) {
    //        });
    //        var msg = String.format("You must upgrade your license.  Your current license allows you {0} and you have {1} items stored.", appUser.licenseLevelItems, userItems);
    //        $window.alert("Upgrade Required: " + msg);
    //        deferred.reject();
    //        $state.go("home.inappPurchases");
    //    }
    //    else { }
    //}
    //also gets all of the user's userTypes tags and recreates UTConstants
    //TODO attach localization and internationalization objects

    function getAppUser() {
      var deferred = $q.defer();
      var key = "appUser";
      if (vm.cache.get(key)) {
        var appUser = vm.cache.get(key);
        //console.log("-----appUser from cache", appUser.subscriptionIds);
        deferred.resolve(appUser);
      }
      else {
        //console.log("appUser API");
        var appUserUrl = currentDS().apiUrl + "appUser?tzo=" + (new Date().getTimezoneOffset()).toString();
        $http.get(appUserUrl)
          .success(function (data) {
            var appUser = data;
            //check if Quick Start new user
            if (appUser.id == appGlobals.guidEmpty) {
              //something bad happened - not really logged in - try again
              logout();
            }
            //check if Quick Start new user
            else if (appUser.name.trim() == "") {
              $state.go("edit.pwChange", { id: appUser.id, name: "", username: appUser.username });
            }

            appUser.subsMayEdit = [];
            for (var i = 0; i < appUser.subscriptions.length; i++) {
              var sub = appUser.subscriptions[i];
              if (sub.group_Id != "00000000-0000-0000-0000-000000000000" && sub.updatableGroup) appUser.subsMayEdit.push(sub);
            }

            var ids = $filter("filter")(appUser.subscriptionIds, function (id) { return (id != appGlobals.guidEmpty && id != appGlobals.guidSystem.toLowerCase()); });
            var subs = $filter("filter")(appUser.subscriptions, function (sub) { return (sub.group_Id != appGlobals.guidEmpty && sub.group_Id != appGlobals.guidSystem.toLowerCase()); });
            //console.log(ids, subs, appGlobals.guidSystem);
            appUser.isFiltered = (ids.length != subs.length);

            //--Set showMedia
            appUser.showMedia = false;
            appUser.subscriptions.forEach(function (sub) {
              if (sub.familyId && sub.familyId.toLowerCase() == "shuriar") {
                appUser.subscriptionIds.forEach(function (id) {
                  if (sub.group_Id.toLowerCase() == id.toLowerCase()) appUser.showMedia = true;
                });
              }
            });

            //console.log("appUser from api", appUser.subscriptionIds);
            vm.cache.put(key, appUser);
            deferred.resolve(appUser);

          })
          .error(function (e) {
            handleError("appUser", e);
            deferred.reject();
          });

      }
      return deferred.promise;
    }

    function register(regmodel) {
      var deferred = $q.defer();
      //console.log(regmodel);
      $http({
        method: 'POST',
        url: currentDS().apiUrl + "register",
        data: regmodel,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          clearCache();
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          //handleError("register", data, status, headers, config);
          deferred.reject(data);
        });

      return deferred.promise;
    }

    function getUserPreferences() {
      var deferred = $q.defer();
      var key = "userpreferences";
      if (vm.cache.get(key)) {
        deferred.resolve(angular.fromJson(vm.cache.get(key)));
        //console.log("appUser from cache");
      }
      else {
        //console.log("appUser API");
        getDocuments("507CB5DE-DB0F-453A-A0E9-28EE3B99FCC4", 1, 200).then(function (data) {
          //initialize prefs defaults
          var preferences = {
            addmetouch: true,
            autoaddorg: true,
            ccconfirm: true,
            filterObjRs: { groupId: appGlobals.guidEmpty, filterText: '' },
            filterObjTw: { groupId: appGlobals.guidEmpty, filterText: '' }
          };

          data.forEach(function (doc) {
            if (doc.value) {
              var pref = doc.name.toLowerCase();
              switch (pref) {
                case "addmetouch":
                  preferences.addmetouch = (doc.value == "true");
                  break;
                case "autoaddorg":
                  preferences.autoaddorg = (doc.value == "true");
                  break;
                case "ccconfirm":
                  preferences.ccconfirm = (doc.value == "true");
                  break;
                case "calendardefault":
                  preferences.calendardefault = doc.value;
                  break;
                case "calendars":
                  preferences.calendars = angular.fromJson(doc.value);
                  break;
                case "calsync":
                  preferences.calsync = doc.value.toLowerCase(); //one of: ios, android, outlook, unknown
                  break;
                case "calsynclast":
                  //console.log(doc.value);
                  preferences.calsynclast = moment.utc(doc.value).toDate();
                  break;
                case "ccconfirm":
                  preferences.ccconfirm = (doc.value == "true");
                  break;
                case "filterobjrs":
                  preferences.filterObjRs = angular.fromJson(doc.value);
                  break;
                case "filterobjtw":
                  preferences.filterObjTw = angular.fromJson(doc.value);
                  break;
                case "omitend":
                  preferences.omitend = (doc.value == "true");
                  break;
                case "omittime":
                  preferences.omittime = (doc.value == "true");
                  break;
                default:
                  //assigns a string
                  preferences[doc.name] = doc.value;
                  break;
              }
            }
          });

          vm.cache.put(key, angular.toJson(preferences));
          //for (var propertyName in preferences) {
          //    console.log(propertyName);
          //}
          deferred.resolve(preferences);

        });


      }
      return deferred.promise;

    }

    function getUserPreference(prefName) {
      var deferred = $q.defer();
      getUserPreferences().then(function (prefs) {
        deferred.resolve(prefs[prefName]);
      });
      return deferred.promise;
    }

    function postUserPreference(name, value, refreshUser) {
      var deferred = $q.defer();
      clearCacheItem("userpreferences")
      var url = currentDS().apiUrl + "userPreference?name=" + name + "&value=" + encodeURI(value);
      //console.log(url);
      $http({
        method: 'POST',
        url: url
      })
        .success(function (data) {
          if (refreshUser) {
            refreshAppUser().then(function () {
              getAppUser().then(function (data) {
                deferred.resolve(data);
              });
            });
          }
          else deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("postUserPreference", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }

    function deleteUserPreference(name, refreshUser) {
      var deferred = $q.defer();
      clearCacheItem("userpreferences")
      var url = currentDS().apiUrl + "userPreference?name=" + name;
      $http({
        method: 'DELETE',
        url: url
      })
        .success(function (data) {
          if (refreshUser) {
            refreshAppUser().then(function () {
              getAppUser().then(function () {
                deferred.resolve(data);
              });
            });
          }
          else deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("deleteUserPreference", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }

    function getUsers() {
      var deferred = $q.defer();

      $http({
        method: 'GET',
        url: currentDS().apiUrl + "appusers",
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("getUsers", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }

    function pageview(page, entityType, entityId) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "pageview?page=" + page;
      if (entityType != undefined) {
        url += "&entityType=" + entityType + "&entityId=" + entityId;
      }

      $http({
        method: 'GET',
        url: url,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("pageview", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }


    function userAdmin(userId) {
      var deferred = $q.defer();
      if (!userId) userId = appGlobals.guidEmpty;
      $http({
        method: 'GET',
        url: currentDS().apiUrl + "userAdmin?userId=" + userId,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("userAdmin", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }


    function updatePaidSubsGroup() {
      var deferred = $q.defer();
      var x = "";
      $http({
        method: 'GET',
        url: currentDS().apiUrl + "UpdatePaidSubsGroup",
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("UpdatePaidSubsGroup", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;

    }



    function usernameOK(username) {
      if (username == null) $window.alert("Bad username");
      else {
        var deferred = $q.defer();

        $http({
          method: 'GET',
          url: currentDS().apiUrl + "usernameOK?username=" + encodeURIComponent(username),
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("usernameOK", data, status, headers, config);
            deferred.reject();
          });

        return deferred.promise;
      }
    }

    function groupnameOK(grpname, id) {
      if (grpname == null) $window.alert("Bad groupname");
      else {
        var deferred = $q.defer();
        var url = currentDS().apiUrl + "GroupnameOK?grpname=" + encodeURIComponent(grpname) + "&id=" + id.toString();

        login("dataApi").then(function () {
          $http({
            method: 'GET',
            url: url,
            headers: { 'Content-Type': 'text/json' }

          })
            .success(function (data) {
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("groupnameOK", data, status, headers, config);
              deferred.reject();
            });
        });
        return deferred.promise;
      }
    }

    function teamnameOK(teamname, id) {
      if (teamname == null) $window.alert("Bad teamname");
      else {
        var deferred = $q.defer();
        var url = currentDS().apiUrl + "TeamnameOK?teamname=" + encodeURIComponent(teamname) + "&id=" + id.toString();
          $http({
            method: 'GET',
            url: url,
            headers: { 'Content-Type': 'text/json' }

          })
            .success(function (data) {
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("teamnameOK", data, status, headers, config);
              deferred.reject();
            });
        return deferred.promise;
      }
    }
    
    function dbnameOK(dbname, id) {
      if (id == null) id = appGlobals.guidEmpty;
      if (dbname == null) $window.alert("Bad dbname");
      else {
        var deferred = $q.defer();
        var url = currentDS().apiUrl + "dbnameOK?dbname=" + encodeURIComponent(dbname) + "&id=" + id.toString();
     $http({
            method: 'GET',
            url: url,
            headers: { 'Content-Type': 'text/json' }

          })
            .success(function (data) {
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("dbnameOK", data, status, headers, config);
              deferred.reject();
            });
        return deferred.promise;
      }
    }

    function isUserInTeam(id) {
      if (id == null || id == appGlobals.guidEmpty) $window.alert("Bad id");
      else {
        var deferred = $q.defer();
        var url = currentDS().apiUrl + "isUserInTeam?id=" + id;
        $http({
          method: 'GET',
          url: url
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("isUserInTeam", data, status, headers, config);
            deferred.reject();
          });

        return deferred.promise;
      }

    }
    function canRemoveSelfFromTeam(id) {
      if (id == null || id == appGlobals.guidEmpty) $window.alert("Bad id");
      else {
        var deferred = $q.defer();
        var url = currentDS().apiUrl + "canRemoveSelfFromTeam?teamId=" + id;
        $http({
          method: 'GET',
          url: url
        })
          .success(function (data) {
            deferred.resolve(data);  //empty string if OK, else a reason why not...
          })
          .error(function (data, status, headers, config) {
            handleError("canRemoveSelfFromTeam", data, status, headers, config);
            deferred.reject();
          });

        return deferred.promise;
      }

    }



    function setDefaultCollection(collectionId) {
      var deferred = $q.defer();
      //console.log(collectionId);
      var d = { collectionId: collectionId }
      $http({
        method: 'PUT',
        url: currentDS().apiUrl + "setDefaultCollection",
        data: angular.toJson(d),
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          clearCacheItem("appUser");
          clearCacheItem("mygroups");
          $rootScope.$broadcast("RefreshMain");
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          //handleError("register", data, status, headers, config);
          deferred.reject(data);
        });

      return deferred.promise;

    }

    function resetSubscriptionIds() {
      var deferred = $q.defer();

      $http({
        method: 'PUT',
        url: currentDS().apiUrl + "resetSubscriptionIds",
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          clearCache();
          refreshAppUser();
          $rootScope.$broadcast("RefreshMain", true);
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          //handleError("register", data, status, headers, config);
          deferred.reject(data);
        });

      return deferred.promise;

    }

    function setSubscriptionIds(idList) {
      var deferred = $q.defer();

      $http({
        method: 'PUT',
        url: currentDS().apiUrl + "subscriptionIds",
        data: idList,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          clearCache();
          refreshAppUser();
          $rootScope.$broadcast("RefreshMain", true);
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          //handleError("register", data, status, headers, config);
          deferred.reject(data);
        });

      return deferred.promise;

    }
    function usage(getall) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "usage";
      if (getall) url += "?getall=true";
      $http({
        method: 'GET',
        url: url,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("usage", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }
    function recent() {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "recent";
      $http({
        method: 'GET',
        url: url,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("recent", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }


    function recentHide() {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "recent";
      $http({
        method: 'DELETE',
        url: url,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("recentHide", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }


    //function getAuditTypes() {
    //    var deferred = $q.defer();
    //    login("dataApi").then(function () {
    //        $http({
    //            method: 'GET',
    //            url: currentDS().apiUrl + "auditTypes",
    //            headers: { 'Content-Type': 'text/json' }
    //        })
    //               .success(function (data) {
    //                   deferred.resolve(data);
    //               })
    //               .error(function (data, status, headers, config) {
    //                   handleError("getAuditTypes", data, status, headers, config);
    //                   deferred.reject();
    //               });
    //    });
    //    return deferred.promise;
    //}
    //function getAuditItems(auditTypename, page, pageSize) {
    //    var deferred = $q.defer();
    //    var resurl = String.format("auditItems?auditTypename={0}&page={1}&pageSize={2}", auditTypename, page, pageSize);
    //    login("dataApi").then(function () {
    //        $http({
    //        method: 'GET',
    //        url: currentDS().apiUrl + resurl,
    //        headers: { 'Content-Type': 'text/json' }
    //    })
    //           .success(function (data) {
    //               deferred.resolve(data);
    //           })
    //           .error(function (data, status, headers, config) {
    //               handleError("getAuditItems", data, status, headers, config);
    //               deferred.reject();
    //           });
    //    });
    //    return deferred.promise;
    //}

    //#endregion

    //#region Misc Private Methods

    function handleError(source, data, status, headers, config) {

      if (data && data.message && (
        data.message.indexOf("Authorization has been denied") > -1
        || data.message.indexOf("401") > -1)) {
        $http.defaults.headers.common.Authorization = null;
        localStorage.removeItem("appAuthToken");
        clearCache();
        $state.go("login");
      }
      else if (data && data.indexOf && (
        data.indexOf("Authorization has been denied") > -1
        || data.indexOf("401") > -1)) {
        $http.defaults.headers.common.Authorization = null;
        localStorage.removeItem("appAuthToken");
        clearCache();
        $state.go("login");
      }
      else {
        //var s = String.format("Error in dataApi: {0}.  Data: {1}", source, (data) ? angular.toJson(data) : "");
        //if (data && data.message) s = String.format("{0}<br /><br />  Source: {1}", data.message, source);
        console.error(source, data, status, headers, config);
        //var alertPopup = $ionicPopup.alert({
        //    title: "Oops, something went wrong!",
        //    template: s
        //});
        //alertPopup.then(function (res) {
        //});

      }
    }

    function goodPassword(pw) {
      var result = false;
      var hasUpper = false;
      var hasLower = false;
      var hasNumber = false;
      var hasSpec = false;
      if (pw.length >= 6) {
        for (var i = 0; i < pw.length; i++) {
          var ascii = pw.charCodeAt(i);
          if (ascii >= 97 && ascii <= 122) hasLower = true;
          else if (ascii >= 65 && ascii <= 90) hasUpper = true;
          else if (ascii >= 48 && ascii <= 57) hasNumber = true;
          else if (ascii > 32) hasSpec = true;
        }

        var n = 0;
        if (hasUpper) n++;
        if (hasLower) n++;
        if (hasNumber) n++;
        if (hasSpec) n++;

        result = (n >= 3);
      }

      return result;
    }

    //#endregion

    //#region Common:  Relations, Autocomplete, & Multi-entity
    function getEntity(entityType, entityId, collectionId) {
      var deferred = $q.defer();
      if (!entityType || entityType === undefined) deferred.reject();
      var eWord = "";
      var recordType = -1;
      switch (entityType) {
        case shuri_enums.entitytypes.organization:
          eWord = "org";
          if (!collectionId) collectionId = appGlobals.guidEmpty;
          recordType = 0;
          break;
        case shuri_enums.entitytypes.person:
          eWord = "person";
          break;
        case shuri_enums.entitytypes.touch:
          eWord = "touch";
          break;
        case shuri_enums.entitytypes.tag:
          eWord = "tag";
          break;
        case shuri_enums.entitytypes.group:
        case shuri_enums.entitytypes.private:
          eWord = "group";
          break;
        default:
          console.error("Unhandled entityType");
          break;
      }
      var key = String.format("{0}{1}", eWord, entityId);
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
        //console.log("got from cache: " + key);
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + eWord + "?id=" + entityId;
          if (collectionId) url += "&collectionId=" + collectionId;
          if (recordType) url += "&recordType=" + recordType;
          $http.get(url)
            .success(function (data) {
              //console.log(data);
              if (data.id != appGlobals.guidEmpty) {
                vm.cache.put(key, data)
              }
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getEntity", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function postEntity(posturl, entityName, entity, entityType, relatedEntityId, relatedEntityType) {
      var deferred = $q.defer();
      //console.log(posturl, entityName, entity);
      var key = entityName + entity.id;
      var jEntity = angular.toJson(entity);
      $http({
        method: 'POST',
        url: currentDS().apiUrl + posturl,
        data: jEntity,
        headers: { 'Content-Type': 'text/json' }

      })
        .success(function (data) {

          //de-cache
          //if (entityName.toLowerCase == "tag" || entityName.toLowerCase == "usertype") {
          //    refreshAppUser(); //uts in appUser - do this before broadcasts
          //}

          if (entityName.toLowerCase() == "group"
            || entityName.toLowerCase() == "location"
            || entityName.toLowerCase() == "organization"
            || entityName.toLowerCase() == "person"
            || entityName.toLowerCase() == "touch"
            || entityName.toLowerCase() == "tag") {

            if (entity.id == appGlobals.guidEmpty) {
              entity.id = data;

              if (relatedEntityType) {
                postRelation(relatedEntityType, relatedEntityId, entityType, entity.id, true).then(function (data) {
                  clearCacheItemByEntity(relatedEntityType, relatedEntityId).then(function (data) {
                    //console.log(relatedEntityType);
                    $rootScope.$broadcast("EntityChanged", relatedEntityId);
                  });
                });
              }

              if (entityName.toLowerCase() == "group" && entity.grpType != shuri_enums.grouptype.organization) $rootScope.$broadcast("RefreshMain", true);

              pageview(entityName, entityType, entity.id).then(function () {
                //console.log(entityName, entityType, entity.id);
                deferred.resolve(data);

              });

            }
            else {
              if (entityType) clearCacheItemByEntity(entityType, entity.id).then(function (data) {
                //console.log(entityName, entityType, entity.id);
                $rootScope.$broadcast("EntityChanged", entity.id);
              });
              else {
                key = entityName + entity.id;
                clearCacheItem(key);
                $rootScope.$broadcast("EntityChanged", entity.id);
              }


              if (entity.collectionChanged && entity.originalCollectionId) {
                //post a Move
                moveEntity(entityName, entity.id, entity.originalCollectionId, entity.collection_Id).then(function (movedata) {
                  clearCache();
                  $rootScope.$broadcast("RefreshMain", true);
                  $rootScope.$broadcast("EntityChanged", entity.id);
                  deferred.resolve(data);
                }, function (error) { console.error(error); });

              }
              else deferred.resolve(data);
            }

          }

          else {
            if (entityName.toLowerCase() == "document") {
              if (relatedEntityType) {
                if (entity.id == appGlobals.guidEmpty) {
                  entity.id = data;
                  postRelation(relatedEntityType, relatedEntityId, entityType, entity.id, true);
                }
                clearCacheItemByEntity(relatedEntityType, relatedEntityId).then(function (data) {
                  //console.log(relatedEntityType);
                  $rootScope.$broadcast("EntityChanged", relatedEntityId);
                });
              }
              else clearCacheItem("reportsqueries");  //just in case query or report
            }

            if (entity.collectionChanged && entity.originalCollectionId && entity.id != appGlobals.guidEmpty && (entity.collectionChanged != entity.originalCollectionId)) {
              //post a Move for cp or doc quietly
              //console.log(entityName, entity.id, entity.originalCollectionId, entity.collection_Id);
              moveEntity(entityName, entity.id, entity.originalCollectionId, entity.collection_Id).then(function (movedata) {
                clearCache();
                $rootScope.$broadcast("RefreshMain", true);
                $rootScope.$broadcast("EntityChanged", entity.id);
                deferred.resolve(data);
              }, function (error) { console.error(error); });

            }
            else deferred.resolve(data);
          }

        })
        .error(function (data, status, headers, config) {
          handleError("postEntity", data, status, headers, config);
          deferred.reject(data);
        });
      return deferred.promise;
    }

    function moveEntity(entityType, entityId, fromId, toId) {
      var deferred = $q.defer();
      var entity = {
        entityType: entityType, entityId: entityId, fromId: fromId, toId: toId
      }
      var jEntity = angular.toJson(entity);
      $http({
        method: 'POST',
        url: currentDS().apiUrl + 'moveEntity',
        data: jEntity,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          if (data.trim() == "") {
            deferred.resolve();
          }
          else deferred.reject(data);
        })
        .error(function (data) {
          deferred.reject(data);
        });

      return deferred.promise;
    }

    function updateEntityModifiedDt(entityId, entityType, childEntityType) {
      var deferred = $q.defer();
      //console.log(entityId, entityType, childEntityType);
      if (entityType === shuri_enums.entitytypes.touch
        && (!childEntityType
          || childEntityType == shuri_enums.entitytypes.person
          || childEntityType == shuri_enums.entitytypes.organization
          //|| childEntityType == shuri_enums.entitytypes.tag
          || childEntityType == shuri_enums.entitytypes.location)
      ) {
        $http({
          method: 'POST',
          url: currentDS().apiUrl + 'updateEntityModifiedDt?entityId=' + entityId + '&entityType=' + entityType,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve();
          })
          .error(function (data) {
            deferred.reject(data);
          });
      }
      else deferred.resolve();

      return deferred.promise;
    }

    function updateEntityDescription(entityId, entityType, text) {
      var deferred = $q.defer();
      var theData = { entityId: entityId, entityType: entityType, text: text };
      clearCacheItemByEntity(entityType, entityId);
      $http({
        method: 'POST',
        url: currentDS().apiUrl + 'updateEntityDescription',
        data: angular.toJson(theData),
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          //clearCacheItemByEntity(entityType, entityId);
          //$rootScope.$broadcast("EntityChanged", entityId);

          deferred.resolve();
        })
        .error(function (data) {
          deferred.reject(data);
        });

      return deferred.promise;
    }


    function changeEntityOwner(newOwnerId, entityId, entityType) {
      var deferred = $q.defer();
      login("dataApi").then(function () {
        //var entity = {
        //    newOwnerId: newOwnerId, entityId: entityId, entityType: entityType
        //}
        //var jEntity = angular.toJson(entity);
        $http({
          method: 'POST',
          url: currentDS().apiUrl + 'changeEntityOwner?newOwnerId=' + newOwnerId + '&entityId=' + entityId + '&entityType=' + entityType,
          //data: jEntity,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            if (data.trim() == "") {
              clearCacheItemByEntity(entityType, entityId).then(function (data) {
                $rootScope.$broadcast("EntityChanged", entityId);
                deferred.resolve();
              });
            }
            else deferred.reject(data);
          })
          .error(function (data) {
            deferred.reject(data);
          });
      }, function (reason) { deferred.reject(reason) }); return deferred.promise;
    }

    function deleteEntity(entityId, entityType, entity, noBroadcast) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl;
        var key = "";
        var needUserRefresh = false;
        var needMainRefresh = false;
        var needPrivateGrps = false;
        switch (entityType) {
          case shuri_enums.entitytypes.document:
            url += "document";
            break;
          case shuri_enums.entitytypes.group:
          case shuri_enums.entitytypes.team:
          case shuri_enums.entitytypes.private:
            url += "group";
            key = "group";
            needMainRefresh = true;
            break;
          case shuri_enums.entitytypes.organization:
            url += "group";
            key = "org";
            needPrivateGrps = true;
            break;
          case shuri_enums.entitytypes.location:
            url += "LocationSafe";
            break;
          case shuri_enums.entitytypes.person:
            url += "person";
            key = "group";
            needPrivateGrps = true;
            break;
          case shuri_enums.entitytypes.touch:
            url += "touch";
            key = "group";
            needPrivateGrps = true;
            break;
          case shuri_enums.entitytypes.tag:
            url += "tag";
            key = "group";
            needUserRefresh = true;
            needPrivateGrps = true;
            break;
          case shuri_enums.entitytypes.usertype:
            url += "usertype";
            key = "group";
            needUserRefresh = true;
            break;
          case shuri_enums.entitytypes.subscription:
            url += "subscription";
            break;
          case shuri_enums.entitytypes.subscriber:
            url += "subscriber?person_Id=" + entity.person_Id + "&subscription_Id=" + entity.subscription_Id + "&ignore=xx";
            break;
          case shuri_enums.entitytypes.contactpoint:
            url += "contactpoint";
            break;
        }
        url += "?id=" + entityId;
        //console.log(url, entity);
        $http({
          method: 'DELETE',
          url: url
        })
          .success(function (data) {
            if (key != "") clearCacheItemByEntity(entityType, entityId);

            if (needUserRefresh) refreshAppUser();

            if (noBroadcast != true) $rootScope.$broadcast("EntityDeleted", entityId);

            //update the DB - not for cps, docs, etc
            if (entity) {
              //console.log(entity.collection_Id);
              if (entity.collection_Id) {
                clearCacheItem("group" + entity.collection_Id);
                $rootScope.$broadcast("EntityChanged", entity.collection_Id);
              }
            }

            if (needPrivateGrps) {
              vm.getPrivGrpsForEntity(entityType, entityId).then(function (privGrps) {
                //console.log(entityType, entityId, privGrps);

                privGrps.forEach(function (pgrp) {
                  clearCacheItem("group" + pgrp.id);
                  $rootScope.$broadcast("EntityChanged", pgrp.id);

                });

              });
            }

            if (needMainRefresh) {
              refreshAppUser();
              $rootScope.$broadcast("RefreshMain", true);
            }

            deferred.resolve(data);

          })
          .error(function (data, status, headers, config) {
            //console.log(data, status, headers, config);
            //handleError("deleteEntity", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      //stash entity's private groups


      return deferred.promise;
    }

    function deleteEntityImageUrl(entityId, entityType) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "entityImageUrl?entityId=" + entityId;
        var data = { entityId: entityId };
        $http({
          method: 'DELETE',
          url: url
        })
          .success(function (data) {

            //todo make this targeted clear
            clearCacheItemByEntity(entityType, entityId).then(function () {
            $rootScope.$broadcast("EntityChanged", entityId);
            deferred.resolve(data);

            });
          })
          .error(function (data, status, headers, config) {
            console.log(data, status, headers, config);
            handleError("deleteEntityImageUrl", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }
    function unsyncTouch(touchId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "TouchStopSync?touchId=" + touchId;
        $http({
          method: 'DELETE',
          url: url
        })
          .success(function (data) {
            clearCacheItemByEntity(6, touchId).then(function () {
              $rootScope.$broadcast("EntityChanged", touchId);
              deferred.resolve(data);

            });
          })
          .error(function (data, status, headers, config) {
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }


    function permissions(entityId, entityType) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "permissions?entityId=" + entityId + "&entityType=" + entityType;
      $http({
        method: 'GET',
        url: url
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          deferred.reject();
        });

      return deferred.promise;

    }

    function postRelation(entityType1, entityId1, entityType2, entityId2, quiet) {
      var deferred = $q.defer();

      var d = angular.toJson({ entityType1: entityType1, entityId1: entityId1, entityType2: entityType2, entityId2: entityId2 });
      var resurl = currentDS().apiUrl + "Relationship";
      $http({
        method: 'POST',
        url: resurl,
        data: d,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
          if (!quiet) {
            clearCacheItemByEntity(entityType1, entityId1).then(function () {
              clearCacheItemByEntity(entityType2, entityId2).then(function () {
                $rootScope.$broadcast("EntityChanged", entityId1);
                $rootScope.$broadcast("EntityChanged", entityId2);
              });
            });
          }
          //console.log("EntityChanged", entityId1);
          //console.log("EntityChanged", entityId2);
          //if (entityType1 == shuri_enums.entitytypes.group || entityType1 == shuri_enums.entitytypes.private
          // || entityType2 == shuri_enums.entitytypes.group || entityType2 == shuri_enums.entitytypes.private) {
          //}
        })
        .error(function (data, status, headers, config) {
          handleError("postRelation", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }


    function postRelationBatch(entityType, entityId, entityTypeBatch, entityIdsBatch) {
      var deferred = $q.defer();

      this.login("dataApi").then(function () {
        var d = angular.toJson({ entityType: entityType, entityId: entityId, entityTypeBatch: entityTypeBatch, entityIdsBatch: entityIdsBatch });
        var resurl = currentDS().apiUrl + "RelationshipBatch";
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postRelationBatch", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postTenure(groupId, personId, startDt, endDt, title) {
      var deferred = $q.defer();

      this.login("dataApi").then(function () {
        var d = angular.toJson({ groupId: groupId, personId: personId, startDt: startDt, endDt: endDt, title: title });
        var resurl = currentDS().apiUrl + "Tenure";
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            //clear cache
            clearCacheItemByEntity(9, groupId).then(function () {
              clearCacheItemByEntity(4, personId).then(function () {
                $rootScope.$broadcast("EntityChanged", groupId);
                $rootScope.$broadcast("EntityChanged", personId);
                //console.log("EntityChanged", groupId)
                deferred.resolve(data);
              });
            });

          })
          .error(function (data, status, headers, config) {
            handleError("postTenure", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }

    function deleteRelation(entityType1, entityId1, entityType2, entityId2, preventBroadcast) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var d = angular.toJson({ entityType1: entityType1, entityId1: entityId1, entityType2: entityType2, entityId2: entityId2 });
        var resurl = currentDS().apiUrl + "Relationship";
        $http({
          method: 'DELETE',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            if (!preventBroadcast) {
              clearCacheItemByEntity(entityType1, entityId1).then(function () {
                clearCacheItemByEntity(entityType2, entityId2).then(function () {
                  $rootScope.$broadcast("EntityChanged", entityId1);
                  $rootScope.$broadcast("EntityChanged", entityId2);
                });
              });
            }

            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("deleteRelation", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getAutocomplete(entityType, prefix, noRecs, forEntityType, forQuery) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = "unknown";

        if (forQuery) {
          if (entityType === shuri_enums.entitytypes.team) url = String.format("{0}AutocompleteTeams?prefix={1}&noRecs={2}"
            , currentDS().apiUrl, prefix, noRecs);
          else url = String.format("{0}AutocompleteQuery?entityType={1}&prefix={2}&noRecs={3}&forEntityType={4}"
            , currentDS().apiUrl, entityType, prefix, noRecs, forEntityType);
        }
        else if (entityType == forEntityType && forEntityType == shuri_enums.entitytypes.team)
          url = String.format("{0}AutocompleteTeams?prefix={1}&noRecs={2}"
            , currentDS().apiUrl, prefix, noRecs);
        else if (entityType == shuri_enums.entitytypes.user) {
          var all = 0
          if (forEntityType == shuri_enums.entitytypes.all) all = 1;
          url = String.format("{0}AutocompleteUsers?prefix={1}&noRecs={2}&all={3}"
            , currentDS().apiUrl, prefix, noRecs, all);
        }
        else url = String.format("{0}AutocompleteByEntity?entityType={1}&prefix={2}&noRecs={3}&forEntityType={4}"
          , currentDS().apiUrl, entityType, prefix, noRecs, forEntityType);

        //console.log(url);
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getAutocomplete", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }


    function autocompleteAllEntity(prefix, noRecs) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}autocompleteAllEntity?prefix={1}&noRecs={2}"
          , currentDS().apiUrl, prefix, noRecs);

        $http.get(url)
          .success(function (data) {
            // console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("autocompleteAllEntity", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function autocompleteByEntityId(entityType, prefix, noRecs, forEntityType, forEntityId) {
      var deferred = $q.defer();
      if (!forEntityId) forEntityId = appGlobals.guidEmpty;
      this.login("dataApi").then(function () {
        var url = String.format("{0}autocompleteByEntityId?entityType={1}&prefix={2}&noRecs={3}&forEntityType={4}&forEntityId={5}"
          , currentDS().apiUrl, entityType, prefix, noRecs, forEntityType, forEntityId);

        $http.get(url)
          .success(function (data) {
            // console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("autocompleteByEntityId", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function autocompleteARImport(entityType, prefix, noRecs) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}autocompleteARImport?entityType={1}&prefix={2}&noRecs={3}"
          , currentDS().apiUrl, entityType, prefix, noRecs);

        $http.get(url)
          .success(function (data) {
            // console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("autocompleteARImport", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }


    function getAutocompleteDB(entityType, prefix, noRecs, dbId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}AutocompleteDB?entityType={1}&prefix={2}&noRecs={3}&dbId={4}"
          , currentDS().apiUrl, entityType, prefix, noRecs, dbId);

        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getAutocompleteDB", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }
    function getAutocompleteGroups(includeOrgs, prefix, noRecs) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}AutocompleteGroups?includeOrgs={1}&prefix={2}&noRecs={3}"
          , currentDS().apiUrl, includeOrgs, prefix, noRecs);

        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getAutocompleteGroups", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getLanguages() {
      var key = "Languages";

      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        var d = this;
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "TagsByTypename?name=Language";
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getLanguages", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function getTimezones() {
      var key = "timezones";
      var deferred = $q.defer();

      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = String.format("{0}timezones", currentDS().apiUrl);
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("timezones", data, status, headers, config);
              deferred.reject();
            });
        }, function (reason) { deferred.reject(reason) });
      }

      return deferred.promise;
    }

    function getTimeInZone(timezoneId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}CurrentTimeByZoneId?id={1}", currentDS().apiUrl, encodeURI(timezoneId));
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("timezones", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getMyTimeZoneId() {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}MyTimeZoneId", currentDS().apiUrl);
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getMyTimeZoneId", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }
    function setMyTimeZoneId(tzId) {
      var deferred = $q.defer();
      if (!tzId || tzId == "") {
        console.error("Invalid or missing timezone id (tzId)");
        deferred.reject("Invalid or missing timezone id (tzId)");
      }
      this.login("dataApi").then(function () {
        var url = String.format("{0}MyTimeZoneId?tzId={1}", currentDS().apiUrl, tzId);
        $http.post(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("setMyTimeZoneId", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postEntityMap(entityId, entityType, foreignId, foreignSystem) {
      var deferred = $q.defer();

      var d = angular.toJson({ entityId: entityId, entityType: entityType, foreignId: foreignId, foreignSystem: foreignSystem });
      var resurl = currentDS().apiUrl + "EntityMap";
      $http({
        method: 'POST',
        url: resurl,
        data: d,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("postEntityMap", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }

    //#endregion

    //#region Query
    function postUserDocs(name, obj, typename, collectionId) {
      var deferred = $q.defer();

      this.login("dataApi").then(function () {
        var val = angular.toJson(obj);
        var id = appGlobals.guidEmpty;
        if (obj.id) id = obj.id;

        var postdata = { id: id, collection_Id: collectionId, typename: typename, name: name, value: val }

        var resurl = currentDS().apiUrl + "UserDocs";
        $http({
          method: 'POST',
          url: resurl,
          data: postdata,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCacheItem("appUser");
            deferred.resolve(data);

          })
          .error(function (data, status, headers, config) {
            handleError("postUserDocs", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postQuery(query) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var d = angular.toJson(query);
        var resurl = currentDS().apiUrl + "Query";
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postQuery", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function hydrateQueryRequest(qr) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var d = angular.toJson(qr);
        var resurl = currentDS().apiUrl + "hydrateQueryRequest";
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postQuery", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }

    function getQueryOperators() {
      var ops =
        [{ name: 'equals', queryOperator: shuri_enums.queryoperator.equals, appliesTo: '0123', sorter: 0, hasValue: true }
          , { name: 'begins', queryOperator: shuri_enums.queryoperator.begins, appliesTo: '0', sorter: 1, hasValue: true }
          , { name: 'contains', queryOperator: shuri_enums.queryoperator.contains, appliesTo: '0', sorter: 2, hasValue: true }
          , { name: 'yes or thumbs-up', queryOperator: shuri_enums.queryoperator.isTrue, appliesTo: '1', sorter: 3, hasValue: false }
          , { name: 'no or thumbs-down', queryOperator: shuri_enums.queryoperator.isFalse, appliesTo: '1', sorter: 4, hasValue: false }
          , { name: 'between', queryOperator: shuri_enums.queryoperator.between, appliesTo: '23', sorter: 5, hasValue: true }
          , { name: 'is greater than', queryOperator: shuri_enums.queryoperator.isGreaterThan, appliesTo: '023', sorter: 6, hasValue: true }
          , { name: 'is greater than or equal to', queryOperator: shuri_enums.queryoperator.isGreaterOrEqual, appliesTo: '023', sorter: 7, hasValue: true }
          , { name: 'is less than', queryOperator: shuri_enums.queryoperator.isLessThan, appliesTo: '023', sorter: 8, hasValue: true }
          , { name: 'is less than or equal to', queryOperator: shuri_enums.queryoperator.isLessOrEqual, appliesTo: '023', sorter: 9, hasValue: true }
        ];

      //console.log(ops);
      return ops;
    }

    function prequery(entityType) {
      var deferred = $q.defer();
      //console.log(query);
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "Prequery?entityType=" + entityType;
        $http({
          method: 'GET',
          url: resurl,
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            //handleError("queryReport", data, status, headers, config);
            deferred.reject(data);
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }

    function queryReport(query, docId, saveAs) {
      var deferred = $q.defer();
      //console.log(query);
      this.login("dataApi").then(function () {
        var d = angular.toJson(query);
        var resurl = currentDS().apiUrl + "Report?docId=" + docId + "&saveAs=" + saveAs;
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          timeout: 600000,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            console.error(data, status, headers, config);
            deferred.reject(data);
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }


    function glossary(entityType, saveAsPdf) {
      var deferred = $q.defer();
      var resurl = currentDS().apiUrl + "Glossary?entityType=" + entityType + "&saveAsPdf=" + saveAsPdf;
      $http({
        method: 'GET',
        url: resurl,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("queryReportPrebuilt", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }



    function queryExport(query, exportType) {
      var deferred = $q.defer();
      //console.log(query);
      this.login("dataApi").then(function () {
        var d = angular.toJson(query);
        var resurl = currentDS().apiUrl + "Export?exportType=" + exportType;
        $http({
          method: 'POST',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("queryExport", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }
    //#endregion

    //#region Media
    function postPhoto(photoBase64String, photoName, contentType) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var postdata = { photoBase64String: photoBase64String, photoName: photoName, contentType: contentType };
        var d = angular.toJson(postdata);
        $http({
          method: 'POST',
          url: currentDS().apiUrl + "photoDocument",
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            //console.log('success');
            console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            // console.log('failure');
            console.log(data);
            handleError("postPhoto - postdata: " + d, data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getFiles(sortOrder, nameContains, page, pagesize) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resource = String.format("{0}files?sortOrder={1}&nameContains={2}&page={3}&pagesize={4}", currentDS().apiUrl, sortOrder, nameContains, page, pagesize)
        $http({
          method: 'GET',
          url: resource
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getFiles", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postFiles(files, collectionId, utId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var fd = new FormData();
        for (var i = 0; i < files.length; i++) {
          fd.append("file" + i.toString(), files[i]);
        }

        var url = currentDS().apiUrl + "files?collectionId=" + collectionId;
        if (utId) url += "&userTypeId=" + utId;

        //console.log(fd);
        $http({
          method: 'POST',
          url: url,
          headers: { 'Content-Type': undefined },
          data: fd,
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postFiles", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    //function postAvatarFiles(files, entityId, entityType) {
    //    var deferred = $q.defer();
    //    this.login("dataApi").then(function () {
    //        var fd = new FormData();
    //        for (var i = 0; i < files.length; i++) {
    //            fd.append("file" + i.toString(), files[i]);
    //        }
    //        //console.log(fd);
    //        $http({
    //            method: 'POST',
    //            url: currentDS().apiUrl + "avatarFiles?entityId=" + entityId + "&entityType=" + entityType,
    //            headers: { 'Content-Type': undefined },
    //            data: fd,
    //        })
    //              .success(function (data) {
    //                  deferred.resolve(data);
    //              })
    //              .error(function (data, status, headers, config) {
    //                  handleError("postAvatarFiles", data, status, headers, config);
    //                  deferred.reject();
    //              });
    //    }
    //    , function (reason) { deferred.reject(reason) });

    //    return deferred.promise;
    //}


    function postReports(files, rptDef) {
      var deferred = $q.defer();
      clearCacheItem("reportsqueries");

      this.login("dataApi").then(function () {
        var fd = new FormData();
        for (var i = 0; i < files.length; i++) {
          fd.append("file" + i.toString(), files[i]);
        }
        var jsRepDef = angular.toJson(rptDef);
        //console.log(fd);
        $http({
          method: 'POST',
          url: currentDS().apiUrl + "Reports?rptDef=" + encodeURI(jsRepDef),
          headers: { 'Content-Type': undefined },
          data: fd,
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postReports", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function validateTemplate(files, rptDef) {
      var deferred = $q.defer();
      var fd = new FormData();
      for (var i = 0; i < files.length; i++) {
        fd.append("file" + i.toString(), files[i]);
      }
      var jsRepDef = angular.toJson(rptDef);
      //console.log(fd);
      $http({
        method: 'POST',
        url: currentDS().apiUrl + "validateTemplate?rptDef=" + encodeURI(jsRepDef),
        headers: { 'Content-Type': undefined },
        data: fd,
      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("validateTemplate", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }

    function replaceReport(files, docId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var fd = new FormData();
        for (var i = 0; i < files.length; i++) {
          fd.append("file" + i.toString(), files[i]);
        }
        //console.log(fd);
        $http({
          method: 'POST',
          url: currentDS().apiUrl + "ReplaceReport?docId=" + docId,
          headers: { 'Content-Type': undefined },
          data: fd,
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("postReports", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function downloadFileToDevice(url, filename) {
      //console.log(url, filename);
      if (!ionic.Platform.isAndroid()) {
        window.resolveLocalFileSystemURL(cordova.file.documentsDirectory, function (dir) {
          var dirEntry = dir;
          var xhttp = new XMLHttpRequest();
          xhttp.open("GET", url, true);
          xhttp.responseType = 'blob';
          xhttp.onload = function (e) {
            if (this.readyState == 4 && this.status == 200) {
              //console.log("Got file OK", this.getAllResponseHeaders());
              var headMime = this.getResponseHeader("content-type");
              var blob = new Blob([this.response], { type: headMime });
              saveFile(dirEntry, blob, filename);
            }
          };
          xhttp.send();
          // $http({
          //     method: 'GET',
          //     url: url,
          //     transformRequest: function (data, headersGetter) {
          //         var headers = headersGetter();
          //         delete headers['authorization'];
          //         delete headers['x-api-key'];
          //         console.log(headers);
          //         return headers;
          //     }
          // })
          //.success(function (data, status, headers) {
          //    console.log("Got file OK", headers());
          //    var headCDisp = headers("content-disposition");
          //    var headMime = headers("content-type");
          //    var filename = header.match(/filename="(.+)"/)[1];
          //     var blob = new Blob([data], { type: 'application/vnd.ms-excel' });
          //     saveFile(dirEntry, blob, "excelFile.xls");
          //})
          //.error(function (data, status, headers, config) {
          //    //handleError("register", data, status, headers, config);
          //    //deferred.reject(data);
          //});
        }, function (err) { console.error(err) });
      }
      else {
        // window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        // window.requestFileSystem(window.PERSISTENT, 0, function (fs) {
        window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (dir) {
          // $window.alert('file system open: ' + fs.root);
          // fs.root.getDirectory('Shuri', {
          //     create: true,
          //     exclusive: false
          // }, function (dirEntry) {
          // console.log(dirEntry);
          //$window.alert('file system open: ' + JSON.stringify(dirEntry));
          var dirEntry = dir;
          //console.log(dirEntry);
          var xhttp = new XMLHttpRequest();
          xhttp.open("GET", url, true);
          xhttp.responseType = 'blob';
          xhttp.onload = function (e) {
            if (this.readyState == 4 && this.status == 200) {
              var headMime = this.getResponseHeader("content-type");
              var blob = new Blob([this.response], { type: headMime });
              saveFile(dirEntry, blob, encodeURI(filename));
            }
          };
          xhttp.send();
          // }, function (err) { console.error(err) });
        }, function (err) { console.error(err) });

      }

    }

    function fileErrorHandler(fileName, e) {
      var msg = '';

      switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          msg = 'Storage quota exceeded';
          break;
        case FileError.NOT_FOUND_ERR:
          msg = 'File not found';
          break;
        case FileError.SECURITY_ERR:
          msg = 'Security error';
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          msg = 'Invalid modification';
          break;
        case FileError.INVALID_STATE_ERR:
          msg = 'Invalid state';
          break;
        default:
          msg = 'Unknown error';
          break;
      };

      console.log(e, '\n Error (' + fileName + '): ' + msg);
    }

    //private method
    function cleanFilename(filename) {
      return filename.replaceAll(":", "");
    }
    //private method
    function saveFile(dirEntry, fileData, fileName) {
      //console.log("In savefile ", dirEntry, fileName);
      fileName = cleanFilename(fileName);
      dirEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = function () {
            //console.log("Successful file write...", fileWriter, fileEntry);
            $cordovaFileOpener2.open(
              fileEntry.nativeURL,
              fileData.type
            ).then(function () {
              //console.log("File should be open");
            }, function (err) {
              console.error("Error opening file.", err);
            });
          };
          fileWriter.onerror = function (e) { console.log("Failed file write: " + e.toString()); };

          fileWriter.write(fileData);
        });

      }, function (err) { console.log(err); fileErrorHandler(fileName, err); });
    }

    //post a text file - get a document back
    function postFile(text, filename, contentType, collectionId, usertype_Id) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var postobj = {
          text: text, filename: filename, contentType: contentType, collectionId: collectionId, usertype_Id: usertype_Id
        }
        console.log(postobj);

        $http({
          method: 'POST',
          url: currentDS().apiUrl + "textfile",
          headers: { 'Content-Type': 'text/json' },
          data: angular.toJson(postobj),
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("deferred", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postPhotoImageUrl(photoBase64String, entityId, entityType) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var postdata = { photoBase64String: photoBase64String, entityId: entityId, entityType: entityType };
        var d = angular.toJson(postdata);
        console.log(d);
        $http({
          method: 'POST',
          url: currentDS().apiUrl + "photoImageUrl",
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            //console.log('success');
            var entityName = "person";
            if (entityType == shuri_enums.entitytypes.organization) entityName = "organization";
            var key = entityName + entityId;
            clearCacheItem(key);

            $rootScope.$broadcast("EntityChanged", entityId);

            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            // console.log('failure');
            console.log(data);
            handleError("postPhoto - postdata: " + d, data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function postFileImageUrl(files, entityId, entityType) {
      var deferred = $q.defer();
      var fd = new FormData();
      for (var i = 0; i < files.length; i++) {
        fd.append("file" + i.toString(), files[i]);
      }

      $http({
        method: 'POST',
        url: currentDS().apiUrl + "filesImageUrl?entityId=" + entityId,
        headers: { 'Content-Type': undefined },
        data: fd,
      })
        .success(function (data) {
          //console.log('success');
          clearCacheItemByEntity(entityType, entityId).then(function () {
            $rootScope.$broadcast("EntityChanged", entityId);
            deferred.resolve(data);
          });

        })
        .error(function (data, status, headers, config) {
          handleError("postFiles", data, status, headers, config);
          deferred.reject();
        });
      return deferred.promise;
    }

    //#endregion

    //#region Groups
    function getMyGroups() {
      //var key = "mygroups";
      var deferred = $q.defer();
      //if (vm.cache.get(key)) {
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "MyGroups";
        $http({
          method: 'GET',
          url: resurl,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            // vm.cache.put(key, data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getMyGroups", data, status, headers, config);
            deferred.reject("Error getting MyGroups");
          });
      }, function (reason) { deferred.reject(reason) });
      // }
      return deferred.promise;
    }

    function getGroupCounts(grpId) {
      //var key = "mygroups";
      var deferred = $q.defer();
      //if (vm.cache.get(key)) {
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "GroupCounts?grpId=" + grpId;
        $http({
          method: 'GET',
          url: resurl,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            // vm.cache.put(key, data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getGroupCounts", data, status, headers, config);
            deferred.reject(data);
          });
      }, function (reason) { deferred.reject(reason) });
      // }
      return deferred.promise;
    }



    function getTeams() {
      var key = "teams";
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var resurl = currentDS().apiUrl + "teams";
          $http({
            method: 'GET',
            url: resurl,
            headers: { 'Content-Type': 'text/json' }
          })
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getteams", data, status, headers, config);
              deferred.reject();
            });
        }, function (reason) { deferred.reject(reason) });
      }
      return deferred.promise;
    }

    function getEditTeamsDB(dbId) {
      if (!dbId) console.error("Missing dbId");

      //var key = "editteamsDB" + dbId;
      var deferred = $q.defer();
      //if (vm.cache.get(key)) {
      //    console.log(key, "editteamsDB From cache");
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      var resurl = currentDS().apiUrl + "EditTeamsDB?dbId=" + dbId;
      $http({
        method: 'GET',
        url: resurl,
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function (data) {
          // console.log(key, "API", data);
          // vm.cache.put(key, data)
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("getEditTeamsDB", data, status, headers, config);
          deferred.reject();
        });
      return deferred.promise;
    }

    function getGroup(id) {
      //console.log("group id", id);
      var key = String.format("group{0}", id);
      var deferred = $q.defer();
      if (!id) deferred.reject("no id");
      else if (vm.cache.get(key)) {
        // console.log("From cache");
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "group?id=" + id.toString();
          $http.get(url)
            .success(function (data) {
              //never cache an empty (template) entity
              if (data.id != appGlobals.guidEmpty) vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getGroup", data, status, headers, config);
              deferred.reject();
            });
        }, function (reason) { deferred.reject(reason) });
      }
      return deferred.promise;
    }

    function getPrivateGroupsForEntity(entityType, entityId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var qs = String.format("?entityType={0}&entityId={1}", entityType, entityId);
        var url = currentDS().apiUrl + "privateGroupsForEntity" + qs;
        //console.log(qs);
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            // console.log("got ERROR from server");
            handleError("getPrivateGroupsForEntity", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    vm.getPrivGrpsForEntity = function (entityType, entityId) {
      var deferred = $q.defer();
      var qs = String.format("?entityType={0}&entityId={1}", entityType, entityId);
      var url = currentDS().apiUrl + "privateGroupsForEntity" + qs;
      $http.get(url)
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          // console.log("got ERROR from server");
          handleError("getPrivGrpsForEntity", data, status, headers, config);
          deferred.reject();
        });
      return deferred.promise;
    }

    function groupsHavingUsertypes() {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "groupsHavingUsertypes";
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("groupsHavingUsertypes", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function collectionsForTeam(teamId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "collectionsForTeam?teamId=" + teamId;
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("collectionsForTeam", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function promoteGroup(groupId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resUrl = String.format("{0}promoteGroup?groupId={1}", currentDS().apiUrl, groupId);
        $http({
          method: 'POST',
          url: resUrl,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCacheItem("mygroups");
            $rootScope.$broadcast("RefreshMain");
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("promoteGroup", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function deletePrivateGroupDeep(grp) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "PrivateGroupDeep?id=" + grp.id;
        $http({
          method: 'DELETE',
          url: url,
          data: grp,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCache();
            $rootScope.$broadcast("EntityDeleted", grp.id);

            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("deletePrivateGroupDeep", data, status, headers, config);
            deferred.reject();
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    //#endregion

    //#region Documents

    function getDocument(id) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + 'Document' + '?id=' + id;
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError('getDocument', data, status, headers, config);
          });
      }, function (reason) {
        deferred.reject(reason);
      });
      return deferred.promise;
    }

    function getDocuments(usertypeId, page, pagesize) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "Documents" + '?usertypeId=' + usertypeId + '&page=' + page + '&pagesize=' + pagesize;
      $http.get(url)
        .success(function (data) {
          //console.log(data);
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("getDocuments", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }

    function getDocumentsExt(usertypeId, groupId, valueContains, page, pagesize) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "DocumentsExt" + '?usertypeId=' + usertypeId + '&groupId=' + groupId + '&valueContains=' + valueContains + '&page=' + page + '&pagesize=' + pagesize;
        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getDocumentsGroup", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function documentsForEntity(entityType, entityId, usertypeId, page, pagesize) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "documentsForEntity" + '?usertypeId=' + usertypeId + '&entityType=' + entityType + '&entityId=' + entityId + '&page=' + page + '&pagesize=' + pagesize;
        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("documentsForEntity", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getMyReports() {
      var deferred = $q.defer();
      var key = "reportsqueries";

      if (vm.gettingMyReports) {
        $timeout(function () {
          getMyReports().then(function (data) {
            deferred.resolve(data);

          })
        })
      }
      else if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        vm.gettingMyReports = true;
        var url = currentDS().apiUrl + "ReportsQueries";
        $http.get(url)
          .success(function (data) {
            vm.cache.put(key, data)
            //console.log(data);
            vm.gettingMyReports = false;
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            vm.gettingMyReports = false;
            handleError("MyReports", data, status, headers, config);
            deferred.reject();
          });
      }

      return deferred.promise;
    }

    function getReports(entityType) {
      var deferred = $q.defer();
      if (vm.gettingReports) {
        $timeout(function () {
          getReports(entityType).then(function (data) {
            deferred.resolve(data);
          }, 100);
        })
      }
      else {
        vm.gettingReports = true;
        var url = currentDS().apiUrl + "Reports?entityType=" + entityType;
        $http.get(url)
          .success(function (data) {
            //console.log(data);
            vm.gettingReports = false;
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            vm.gettingReports = false;
            handleError("Reports", data, status, headers, config);
            deferred.reject();
          });
      }

      return deferred.promise;
    }

    function getDeletedSyncs() {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "DeletedSyncs";
      $http.get(url)
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("DeletedSyncs", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }


    function queryTwitter(entityId, privGroups, findtext, name, page, pageSize) {
      if (!_twitter2Live) return;

      var deferred = $q.defer();

      var data = { entityId: entityId, privGroups: privGroups, findtext: findtext, name: name, page: page, pageSize: pageSize}

        $http({
          method: 'GET',
          url: currentDS().apiUrl + "Tweets?queryObj=" + encodeURI(angular.toJson(data)),
          headers: { 'Content-Type': 'application/json' }

        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("queryTwitter", data, status, headers, config);
            deferred.reject();
          });

      return deferred.promise;
    }

    function queryMedia(entityId, findtext, page, pageSize) {
      if (!_twitter2Live) return;

      var deferred = $q.defer();

      var data = { entityId: entityId, privGroups: [], findtext: findtext, name: "", page: page, pageSize: pageSize }

      $http({
        method: 'GET',
        url: currentDS().apiUrl + "Research?queryObj=" + encodeURI(angular.toJson(data)),
        headers: { 'Content-Type': 'application/json' }

      })
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("queryMedia", data, status, headers, config);
          deferred.reject();
        });

      return deferred.promise;
    }


    function deleteAllSyncDocs() {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "deleteAllSyncDocs";
        $http.delete(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("deleteAllSyncDocs", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }


    //#endregion

    //#region Locations
    function getLocation(id) {
      var key = String.format("location{0}", id);
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "location" + "?id=" + id
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getLocation", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    //#endregion

    //#region Orgs
    function getOrg(id, collectionId, recordType, source) {
      var deferred = $q.defer();
      //console.log("getOrg: " + source, id);
      if (!id || id === undefined) deferred.reject();
      else {
        if (!recordType && recordType != 0) recordType = 2;
        var key = String.format("org{0}{1}", recordType, id);

        if (vm.cache.get(key)) {
          //console.log("org from cache");
          deferred.resolve(vm.cache.get(key));
        }
        else {
          var gettingOrg = true;
          switch (recordType) {
            case 0:
              gettingOrg = vm.gettingOrg0;
              break;
            case 1:
              gettingOrg = vm.gettingOrg1;
              break;
            case 2:
              gettingOrg = vm.gettingOrg2;
              break;
          }

          if (gettingOrg) {
            $timeout(function (id, collectionId, recordType) {
              //console.log("paused");
              getOrg(id, collectionId, recordType).then(function (data) { deferred.resolve(data); })
            }, 100);
          }
          else {
            switch (recordType) {
              case 0:
                vm.gettingOrg0 = true;
                break;
              case 1:
                vm.gettingOrg1 = true;
                break;
              case 2:
                vm.gettingOrg2 = true;
                break;
            }

            var url = currentDS().apiUrl + "organization" + "?id=" + id;
            if (collectionId) url += "&collectionId=" + collectionId;
            if (recordType || recordType === 0) url += "&recordType=" + recordType;
            //console.log(url, id);
            $http.get(url)
              .success(function (data) {
                if (data.id != appGlobals.guidEmpty) {
                  vm.cache.put(key, data)
                  //console.log("cached org", key);
                }
                switch (recordType) {
                  case 0:
                    vm.gettingOrg0 = false;
                    break;
                  case 1:
                    vm.gettingOrg1 = false;
                    break;
                  case 2:
                    vm.gettingOrg2 = false;
                    break;
                }

                deferred.resolve(data);
              })
              .error(function (data, status, headers, config) {
                handleError("getOrg", data, status, headers, config);
                switch (recordType) {
                  case 0:
                    vm.gettingOrg0 = false;
                    break;
                  case 1:
                    vm.gettingOrg1 = false;
                    break;
                  case 2:
                    vm.gettingOrg2 = false;
                    break;
                }
                deferred.reject();
              });

          }
        }
      }
      return deferred.promise;
    }

    function getOrgsForEntity(entityType, entityId, pagesize, page) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "OrganizationsForEntity"
        + "?entityType=" + entityType + "&entityId=" + entityId + "&pageSize=" + pagesize.toString() + "&page=" + page.toString();
      $http.get(url)
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("getOrgsForEntity", data, status, headers, config);
          deferred.reject(data);
        });
      return deferred.promise;
    }

    function getOrgForPerson(id) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "OrgForPerson?id=" + id;
      $http.get(url)
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("OrgForPerson", data, status, headers, config);
          deferred.reject(data);
        });
      return deferred.promise;
    }

    function requestOrgUpdate(orgId, includePeople) {
      var deferred = $q.defer();

      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "requestOrgUpdate" + "?orgId=" + orgId + "&includePeople=" + includePeople;
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("requestOrgUpdate", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }
    //#endregion

    //#region People
    function getPeopleForEntity(entityType, entityId, pagesize, page) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "PeopleForEntity"
          + "?entityType=" + entityType + "&entityId=" + entityId + "&pageSize=" + pagesize.toString() + "&page=" + page.toString();
        //console.log(pagesize);
        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getPeopleForEntity", data, status, headers, config);
            deferred.reject(data);
          });
      }
        , function (reason) { deferred.reject(reason) });


      return deferred.promise;
    }

    function getPerson(id, recordType, collectionId) {
      var deferred = $q.defer();
      var key = String.format("person{0}{1}", recordType, id);

      if (vm.cache.get(key)) {
        //console.log("from cache per" + recordType, key);
        deferred.resolve(vm.cache.get(key));
      }
      else {
        var isGetting = true;
        switch (recordType) {
          case 0:
            isGetting = vm.gettingPer0;
            break;
          case 1:
            isGetting = vm.gettingPer1;
            break;
          case 2:
            isGetting = vm.gettingPer2;
            break;
        }
        if (isGetting) {
          //console.log("waiting to  get per" + recordType, key);

          $timeout(function (id, recordType, collectionId) {
            getPerson(id, recordType, collectionId).then(function (data) { deferred.resolve(data); })
          }, 125);

        }
        else {
          switch (recordType) {
            case 0:
              vm.gettingPer0 = true;
              break;
            case 1:
              vm.gettingPer1 = true;
              break;
            case 2:
              vm.gettingPer2 = true;
              break;
          }
          //console.log("From API: per" + recordType);
          var url = currentDS().apiUrl + "person" + "?id=" + id + "&recordType=" + recordType;
          if (collectionId) url += "&collectionId=" + collectionId;
          else url += "&collectionId=" + appGlobals.guidEmpty;

          $http.get(url)
            .success(function (data) {
              if (data.id != appGlobals.guidEmpty) {
                vm.cache.put(key, data)
              }
              switch (recordType) {
                case 0:
                  vm.gettingPer0 = false;
                  break;
                case 1:
                  vm.gettingPer1 = false;
                  break;
                case 2:
                  vm.gettingPer2 = false;
                  break;
              }
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getPerson", data, status, headers, config);
              switch (recordType) {
                case 0:
                  vm.gettingPer0 = false;
                  break;
                case 1:
                  vm.gettingPer1 = false;
                  break;
                case 2:
                  vm.gettingPer2 = false;
                  break;
              }
              deferred.reject();
            });
        }
      }
      return deferred.promise;
    }

    function getFavorites() {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "favorites";
        $http.get(url)
          .success(function (data) {
            //console.log(data);
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getFavorites", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function addFave(entityId, entityType) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resource = "PersonFavorite";  //person refers to the user
        var url = currentDS().apiUrl + resource;
        $http({
          method: 'POST',
          data: { entity_Id: entityId, entityType: entityType },
          url: url
        }).success(function (data) {
          clearCacheItemByEntity(entityType, entityId).then(function () {
            $rootScope.$broadcast("EntityChanged", appGlobals.guidFavorites);
            $rootScope.$broadcast("EntityChanged", entityId);
            deferred.resolve(data);

          });
        })
          .error(function (data, status, headers, config) {
            handleError("addFave", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function removeFave(entityId, entityType) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "PersonFavorite?entity_Id=" + entityId;
        $http({
          method: 'DELETE',
          url: url
        }).success(function (data) {
          clearCacheItemByEntity(entityType, entityId).then(function () {
            $rootScope.$broadcast("EntityChanged", appGlobals.guidFavorites);
            $rootScope.$broadcast("EntityChanged", entityId);
            deferred.resolve(data);
          });
        })
          .error(function (data, status, headers, config) {
            handleError("removeFave", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function resolveAREntities(peopleList, orgsList) {
      var deferred = $q.defer();
      var jEntity = angular.toJson({ peopleList: peopleList, orgsList: orgsList });

      $http({
        method: 'POST',
        url: currentDS().apiUrl + "resolveAREntities",
        data: jEntity,
        headers: { 'Content-Type': 'text/json' }

      })
        .success(function (data) {
          console.log(data);
         deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("resolveAREntities", data, status, headers, config);
          deferred.reject(data)
        });

      return deferred.promise;
    }

    //#endregion

    //#region Subscriptions

    function approveSubscription(id) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "approveSubscription?id=" + id;
        $http({
          method: 'GET',
          url: url
        }).success(function (data) {
          deferred.resolve(data);
        })
          .error(function (data, status, headers, config) {
            handleError("approveSubscription", data, status, headers, config);
            deferred.reject(data);
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;

    }

    function getSubscriptionsAvailable() {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "subscriptionsAvailable";
        $http({
          method: 'GET',
          url: url
        }).success(function (data) {
          var subs = data;
          deferred.resolve(subs);
        })
          .error(function (data, status, headers, config) {
            handleError("getSubscriptionsAvailable", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function getSubscriptionsForGroup(groupId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "subscriptionsForGroup?groupid=" + groupId;
        $http({
          method: 'GET',
          url: url
        }).success(function (data) {
          var subs = data;
          deferred.resolve(subs);
        })
          .error(function (data, status, headers, config) {
            handleError("subscriptionsForGroup", data, status, headers, config);
            deferred.reject(data);
          });
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function stripePurchase(stripeObj) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "StripePurchase";
        var jentity = angular.toJson(stripeObj);
        $http({
          method: 'POST',
          url: resurl,
          data: jentity,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCacheItem("mygroups");
            $rootScope.$broadcast("RefreshMain");
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("stripePurchase", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function StripeCancel(obj) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "StripeCancel?user_Id=" + obj.uid + "&subscription_Id=" + obj.subId;
        $http({
          method: 'POST',
          url: resurl
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("StripeCancel", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    //returns the subId if success
    function subscribe(subscriber) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "subscribers";
        var jentity = angular.toJson(subscriber);
        $http({
          method: 'POST',
          url: resurl,
          data: jentity,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCache();
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("subscribe", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function unsubscribe(subId) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resurl = currentDS().apiUrl + "subscriber?subscription_Id=" + subId;
        var d = angular.toJson({ subId: subId });
        $http({
          method: 'DELETE',
          url: resurl,
          data: d,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCache();
            refreshAppUser();
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("unsubscribe", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }
    //#endregion

    //#region Tags
    function getTags(groupids, usertypeids, nameBegins) {

      var deferred = $q.defer();
      // if (vm.cache.get(key)) {
      //     deferred.resolve(vm.cache.get(key));
      // }
      // else {
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "Tags"
          + "?groupIds=" + groupids + "&userTypeIds=" + usertypeids + "&nameBegins=" + nameBegins;
        $http.get(url)
          .success(function (data) {
            vm.cache.put(key, data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTags", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      // }
      return deferred.promise;
    }

    function getTagsInUse(entityType) {
      var deferred = $q.defer();
      //if (vm.cache.get(key)) {
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      var d = this;
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "tagsInUseByEntity?entitytype=" + entityType;
        $http.get(url)
          .success(function (data) {
            //vm.cache.put(key, data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTagsInUse", data, status, headers, config);
            deferred.reject();
          });



      }
        , function (reason) { deferred.reject(reason) });

      //}
      return deferred.promise;
    }

    function getTag(id, fullRecord) {
      var key = String.format("tag{0}", id);
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "tag" + "?id=" + id
          if (fullRecord) url += "&fullRecord=true";
          //console.log(url);
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getTag", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function getTagsForEntity(entityType, entityId, pagesize, page) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "TagsForEntity"
          + "?entityType=" + entityType + "&entityId=" + entityId + "&pageSize=" + pagesize.toString() + "&page=" + page.toString();
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTagsForEntity", data, status, headers, config);
            deferred.reject(data);
          });
      }
        , function (reason) { deferred.reject(reason) });


      return deferred.promise;
    }

    function tagNameUnique(tagName, id) {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "tagNameUnique" + "?tagName=" + tagName;

      if (id) url += "&id=" + id;
      else url += "&id=" + appGlobals.guidEmpty;

      $http.get(url)
        .success(function (data) {
          deferred.resolve(true);
        })
        .error(function (data, status, headers, config) {
          deferred.resolve(false);
        });

      return deferred.promise;
    }

    //#endregion

    //#region Touches
    function getTouch(id, collectionId, forUpdate, fullRecord) {
      //console.log(id, collectionId, forUpdate)
      if (!collectionId) collectionId = appGlobals.guidEmpty;

      var deferred = $q.defer();
      //var key = String.format("touch{0}{1}", (forUpdate ? 1 : 0), id);
      //if (vm.cache.get(key)) {
      //console.log("touch from cache", key)
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "touch" + "?id=" + id;
        url += "&collectionId=" + collectionId;
        url += "&forUpdate=" + ((forUpdate) ? "true" : "false");
        url += "&fullRecord=" + ((fullRecord) ? "true" : "false");
        $http.get(url)
          .success(function (data) {
            //never cache an empty (template) entity
            //if (data.id != appGlobals.guidEmpty) vm.cache.put(key, data)
            //console.log("touch from API", data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTouch", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      //}
      return deferred.promise;
    }

    function getTouchesForEntity(entityType, entityId, pagesize, page) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "TouchesForEntity"
          + "?entityType=" + entityType + "&entityId=" + entityId + "&pageSize=" + pagesize.toString() + "&page=" + page.toString();
        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTouchesForEntity", data, status, headers, config);
            deferred.reject(data);
          });
      }
        , function (reason) { deferred.reject(reason) });


      return deferred.promise;
    }

    function getSyncTouches() {
      var deferred = $q.defer();
      var url = currentDS().apiUrl + "SyncTouches"
      $http.get(url)
        .success(function (data) {
          deferred.resolve(data);
        })
        .error(function (data, status, headers, config) {
          handleError("getSyncTouches", data, status, headers, config);
          deferred.reject(data);
        });

      return deferred.promise;
    }

    function postTouch(touch, action) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var touchId = touch.id;
        var key = "";
        var isNew = (touch.id == appGlobals.guidEmpty)

        var jEntity = angular.toJson(touch);
        var resUrl = currentDS().apiUrl + 'touches';
        if (action) resUrl += '?action=' + action;

        $http({
          method: 'POST',
          url: resUrl,
          data: jEntity,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            clearCacheItemByEntity(6, data).then(function () {
              if (touchId == appGlobals.guidEmpty) {
                touchId = data;

                pageview("Touch", 6, touchId).then(function () {
                  //console.log(touchId);
                  if (touch.collection_Id) {
                    clearCacheItemByEntity(2, touch.collection_Id).then(function () {
                      $rootScope.$broadcast("EntityChanged", touch.collection_Id);
                    });
                  }

                  touch.people.forEach(function (entity) {
                    if (entity.changeType == shuri_enums.changetype.update) {
                      clearCacheItemByEntity(4, entity.id).then(function () {
                        $rootScope.$broadcast("EntityChanged", entity.id);
                      });
                    }
                  })
                  touch.groups.forEach(function (entity) {
                    if (entity.changeType == shuri_enums.changetype.update) {
                      switch (entity.grpType) {
                        case shuri_enums.grouptype.organization:
                          clearCacheItemByEntity(9, entity.id).then(function () {
                            $rootScope.$broadcast("EntityChanged", entity.id);
                          });
                          break;
                        case shuri_enums.grouptype.private:
                          clearCacheItemByEntity(2, entity.id).then(function () {
                            $rootScope.$broadcast("EntityChanged", entity.id);
                          });
                         break;
                      }
                    }
                  })
                  touch.tags.forEach(function (entity) {
                    if (entity.changeType == shuri_enums.changetype.update) {
                      key = "tag" + entity.id;
                      clearCacheItem(key);
                      $rootScope.$broadcast("EntityChanged", entity.id);
                    }
                  })
                });
              }
              else $rootScope.$broadcast("EntityChanged", touchId);

              if (touch.collection_Id) {
                key = "group" + touch.collection_Id;
                clearCacheItem(key);
                $rootScope.$broadcast("EntityChanged", touch.collection_Id);
              }

              if (touch.collectionChanged && touch.originalCollectionId && !isNew) {
                clearCache();
                $rootScope.$broadcast("EntityChanged", touchId);
                $rootScope.$broadcast("RefreshMain", true);
                deferred.resolve(data);

              }
              else deferred.resolve(data);

            });

            })
          .error(function (data, status, headers, config) {
            handleError("postTouch", data, status, headers, config);
            deferred.reject(data);
          });
      }, function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function updateTouchLastSync(touchId, folderName, platform) {
      var deferred = $q.defer();
      var dataObj = { touchId: touchId, folderName: folderName, platform: platform };

      var resUrl = currentDS().apiUrl + 'TouchSyncUpdate';

      $http({
        method: 'POST',
        url: resUrl,
        data: angular.toJson(dataObj),
        headers: { 'Content-Type': 'text/json' }
      })
        .success(function () {
          clearCacheItemByEntity(6, touchId).then(function () {
            $rootScope.$broadcast("EntityChanged", touchId);
            deferred.resolve();

          });
        })
        .error(function (data, status, headers, config) {
          handleError("updateTouchLastSync", data, status, headers, config);
          deferred.reject(data);
        });
      return deferred.promise;
    }

    //#endregion

    //#region UserTypes
    function getUserTypes(collectionId) {
      var key = "kUserTypes";
      if (collectionId) key += collectionId;
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        login("usertypes").then(function () {
          //API returns all usertypes if coollectionId is omitted
          //console.log("usertypes API-------------");
          var ds = currentDS().apiUrl;
          var url = ds + "userTypes";
          if (collectionId) {
            if (collectionId.toLowerCase() == "forimport") url = currentDS().apiUrl + "userTypesFor?mode=import";
            else if (collectionId.toLowerCase() == "fortag") url = currentDS().apiUrl + "userTypesFor?mode=tag";
            else if (collectionId.toLowerCase() == "fortouch") url = currentDS().apiUrl + "userTypesFor?mode=touch";
            else url += "?collectionId=" + collectionId;
          }
          $http.get(url)
            .success(function (data) {
              //vm.userTypes = data;
              data.forEach(function (ut) {
                ut.tagsCount = ut.tags.length;
              });

              if (!collectionId || collectionId.toLowerCase() == 'all') {
                appGlobals.utConstants = {};
                data.forEach(function (ut) {
                  var abbrev = "";
                  switch (ut.entityType) {
                    case shuri_enums.entitytypes.contactpoint:
                      abbrev = "cp";
                      break;
                    case shuri_enums.entitytypes.document:
                      abbrev = "doc";
                      break;
                    case shuri_enums.entitytypes.group:
                      abbrev = "grp";
                      break;
                    case shuri_enums.entitytypes.location:
                      abbrev = "loc";
                      break;
                    case shuri_enums.entitytypes.person:
                      abbrev = "per";
                      break;
                    case shuri_enums.entitytypes.tag:
                      abbrev = "tag";
                      break;
                    case shuri_enums.entitytypes.touch:
                      abbrev = "tch";
                      break;
                  }

                  var code = String.format("appGlobals.utConstants.{0}_{1} = '{2}';", abbrev, ut.codeName, ut.id);
                  try {
                    eval(code);
                  }
                  catch (e) {
                    console.error("appGlobals.utConstants build failed: ", code);
                  }
                });
              }

              //establish slots
              if (ds.indexOf("apistage.shuri.com") >= 0) {
                appGlobals.slotname = "Staging";
                appGlobals.slottype = shuri_enums.slottype.staging;
              }
              else if (ds.indexOf("api.shuri.com") >= 0) {
                appGlobals.slotname = "Production";
                appGlobals.slottype = shuri_enums.slottype.production;
              }
              else {
                appGlobals.slotname = "Development";
                appGlobals.slottype = shuri_enums.slottype.development;
              }

              vm.cache.put(key, data)
              deferred.resolve(data);

            })
            .error(function (data, status, headers, config) {
              handleError("getUserTypes", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function getUserTypesTags(forEntityType, onlyUpdatable) {
      if (!forEntityType) throw "entityType required";
      //var key = "userTypesTags" + forEntityType;
      var deferred = $q.defer();
      //if (vm.cache.get(key)) {
      //    deferred.resolve(vm.cache.get(key));
      //}
      //else {
      login("dataApi").then(function () {
        //API returns all usertypes if coollectionId is omitted
        var url = currentDS().apiUrl + "userTypesTags?entityType=" + forEntityType;
        url += "&onlyUpdatable=" + ((onlyUpdatable) ? "true" : "false");
        $http.get(url)
          .success(function (data) {
            data.forEach(function (ut) {
              ut.tagsCount = ut.tags.length;
            });
            //vm.cache.put(key, data)
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getUserTypesTags", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      //}
      return deferred.promise;
    }

    function getUserType(utId) {
      var key = "userType" + utId;
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "userType?id=" + utId;
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getUserType", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function getUserTypeByName(name, entityType, primitive, subId) {
      //            [Route("UserType")]
      //            [HttpGet]
      //public HttpResponseMessage GetByName(string name, EntityTypes entityType, int primitive, Guid subId)
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var resUrl = String.format("{0}userType?name={1}&entityType={2}&primitive={3}&subId={4}"
          , currentDS().apiUrl, name, entityType, primitive, subId);

        $http.get(resUrl)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getUserTypeByName", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });

      return deferred.promise;
    }

    function userTypeLooseTags(collectionId) {
      var key = "userTypeLooseTags" + collectionId;
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "userTypeLooseTags?collectionId=" + collectionId;
          $http.get(url)
            .success(function (data) {
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("userTypeLooseTags", data, status, headers, config);
              deferred.reject();
            });
        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }

    function getPrimitives(entityType) {
      var key = "primitives" + entityType.toString();
      var deferred = $q.defer();
      if (vm.cache.get(key)) {
        deferred.resolve(vm.cache.get(key));
      }
      else {
        this.login("dataApi").then(function () {
          var url = currentDS().apiUrl + "primitives?entityType=" + entityType;
          $http({
            method: 'GET',
            url: url,
            headers: { 'Content-Type': 'text/json' }
          })
            .success(function (data) {
              //make value an int because primitives bind as ints
              for (var i = 0; i < data.length; i++) {
                data[i].value = parseInt(data[i].value);
              }
              vm.cache.put(key, data)
              deferred.resolve(data);
            })
            .error(function (data, status, headers, config) {
              handleError("getPrimitives", data, status, headers, config);
              deferred.reject();
            });

        }
          , function (reason) { deferred.reject(reason) });

      }
      return deferred.promise;
    }
    //#endregion

    //#region Misc

    function requestExpertOrg(orgId, includePeople) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}requestExpertOrg?orgId={1}&includePeople={2}", currentDS().apiUrl, orgId, includePeople);
        $http({
          method: 'GET',
          url: url,
          headers: { 'Content-Type': 'text/json' }
        })
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("requestExpertOrg", data, status, headers, config);
            deferred.reject(data);
          });

      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function getReceiptAndroid(receiptinfo) {
      console.log('***********************');
      console.log(receiptinfo);
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var req = {
          method: 'POST',
          //  url: 'http://localhost:3000/validateandroid',
          url: 'http://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/validateandroid',
          headers: {
            'Content-Type': 'application/json',
            'Accept': undefined,
            'x-api-key': undefined,
            'Authorization': undefined
          },
          data: {
            receipt: receiptinfo.receipt,
            signature: receiptinfo.signature
          }
        }
        $http(req).then(function (data) {
          console.log(data, "success");
          deferred.resolve(data)
        }, function (err) {
          deferred.reject(err)
          console.log(err, "there was an error");
        })
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function getReceiptIOS(receiptinfo) {
      console.log('***********************');
      console.log(receiptinfo);
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var req = {
          method: 'POST',
          //  url: 'http://localhost:3000/validateios',
          url: 'http://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/validateios',
          headers: {
            'Content-Type': 'application/json',
            'Accept': undefined,
            'x-api-key': undefined,
            'Authorization': undefined
          },
          data: { receipt: receiptinfo.receipt }
        }
        $http(req).then(function (data) {
          console.log(data, "success");
          deferred.resolve(data)
        }, function (err) {
          deferred.reject(err)
          console.log(err, "there was an error");
        })
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function test() {
      var deferred = $q.defer();
      var em = {
        sender: "rick@shuri.com", subject: "5 My email subject line",
        body: "Hello world",
        date: (new Date()).toISOString(),
        addresses: ['info@CamdenAssociates.com', 'rshuri@shuri.com', 'mmadorin@shuri.com', 'allison.jahn@gartner.com', '12345789887878'],
        attachmentIds: ['0DE8EDDF-B258-4E15-AA95-3F02948C22D5', '8D273511-1B21-4F93-854C-F33AF412DADF', 'DF9332EB-66CC-4B00-85EC-D67C04F3B0B4']
      };

      var req = {
        method: 'POST',
        url: String.format("{0}email", currentDS().apiUrl),
        data: em
      }
      $http(req).then(function (data) {
        console.log(data, "success");
        deferred.resolve(data)
      }, function (err) {
        deferred.reject(err)
        console.log(err, "there was an error");
      });

      return deferred.promise;

    }

    function licenseTesting(orgs, people, touches) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var qs = String.format("?orgs={0}&people={1}&touches={2}", orgs, people, touches);
        var url = currentDS().apiUrl + "licenseTesting" + qs;

        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("getTouch", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;
    }

    function requestTeam(id) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "requestTeam?id=" + id;

        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("requestTeam", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;

    }

    function quickStart(teamId, defaultDBId, name, emails) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = String.format("{0}quickStart?teamId={1}&defaultDBId={2}&name={3}&emails={4}"
          , currentDS().apiUrl, teamId, defaultDBId, encodeURI(name), encodeURI(emails));

        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("quickStart", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;

    }

    function quickStartUserReg(firstname, lastname, newpw) {
      var deferred = $q.defer();
      this.login("dataApi").then(function () {
        var url = currentDS().apiUrl + "quickStartUserReg?firstname=" + firstname + "&lastname=" + lastname + "&newpw=" + newpw;

        $http.get(url)
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (data, status, headers, config) {
            handleError("quickStartUserReg", data, status, headers, config);
            deferred.reject();
          });
      }
        , function (reason) { deferred.reject(reason) });
      return deferred.promise;

    }

    //#endregion

    return {
      addFave: addFave,
      approveSubscription: approveSubscription,
      autocompleteARImport: autocompleteARImport,
      autocompleteByEntityId: autocompleteByEntityId,
      autocompleteAllEntity: autocompleteAllEntity,
      canRemoveSelfFromTeam: canRemoveSelfFromTeam,
      changeEntityOwner: changeEntityOwner,
      clearCache: clearCache,
      clearCacheItem: clearCacheItem,
      clearCacheItemByEntity: clearCacheItemByEntity,
      collectionsForTeam: collectionsForTeam,
      currentDS: currentDS,
      dataSources: vm.dataSources,
      dbnameOK: dbnameOK,
      deleteEntity: deleteEntity,
      deleteEntityImageUrl: deleteEntityImageUrl,
      deletePrivateGroupDeep: deletePrivateGroupDeep,
      deleteRelation: deleteRelation,
      deleteAllSyncDocs: deleteAllSyncDocs,
      deleteUserPreference: deleteUserPreference,
      downloadFileToDevice: downloadFileToDevice,
      //entityCollectionId:entityCollectionId,
      getAppUser: getAppUser,
      //getAuditTypes: getAuditTypes,
      //getAuditItems: getAuditItems,
      getAutocomplete: getAutocomplete,
      getAutocompleteDB: getAutocompleteDB,
      getAutocompleteGroups: getAutocompleteGroups,
      // getDocuments needs documentation on api
      getDeletedSyncs: getDeletedSyncs,
      getDocument: getDocument,
      getDocuments: getDocuments,
      getDocumentsExt: getDocumentsExt,
      documentsForEntity: documentsForEntity,
      getEditTeamsDB: getEditTeamsDB,
      getEntity: getEntity,
      getFavorites: getFavorites,
      getFiles: getFiles,
      getGroup: getGroup,
      getGroupCounts: getGroupCounts,
      //getGroups: getGroups,
      getPrivateGroupsForEntity: getPrivateGroupsForEntity,
      //getGroupWithPeople: getGroupWithPeople,
      getLanguages: getLanguages,
      getLocation: getLocation,
      getMyGroups: getMyGroups,
      getMyReports: getMyReports,
      getMyTimeZoneId: getMyTimeZoneId,
      getOrg: getOrg,
      //getOrgs: getOrgs,
      getOrgForPerson: getOrgForPerson,
      getOrgsForEntity: getOrgsForEntity,
      //getPeople: getPeople,
      getPeopleForEntity: getPeopleForEntity,
      getPerson: getPerson,
      getPrimitives: getPrimitives,
      getQueryOperators: getQueryOperators,
      getReceiptAndroid: getReceiptAndroid,
      getReceiptIOS: getReceiptIOS,
      getReports: getReports,
      getSubscriptionsAvailable: getSubscriptionsAvailable,
      getSubscriptionsForGroup: getSubscriptionsForGroup,
      getTag: getTag,
      getTags: getTags,
      getTagsForEntity: getTagsForEntity,
      getTagsInUse: getTagsInUse,
      getTeams: getTeams,
      getTimeInZone: getTimeInZone,
      getTimezones: getTimezones,
      getTouch: getTouch,
      getSyncTouches: getSyncTouches,
      getTouchesForEntity: getTouchesForEntity,
      getUserPreference: getUserPreference,
      getUserPreferences: getUserPreferences,
      getUsers: getUsers,
      getUserType: getUserType,
      getUserTypeByName: getUserTypeByName,
      getUserTypes: getUserTypes,
      getUserTypesTags: getUserTypesTags,
      glossary: glossary,
      goodPassword: goodPassword,
      groupnameOK: groupnameOK,
      groupsHavingUsertypes: groupsHavingUsertypes,
      hydrateQueryRequest: hydrateQueryRequest,
      initialize: initialize,
      isUserInTeam: isUserInTeam,
      licenseTesting: licenseTesting,
      login: login,
      logout: logout,
      //moveEntity: moveEntity,
      pageview: pageview,
      permissions: permissions,
      postEntity: postEntity,
      postEntityMap: postEntityMap,
      postFile: postFile,
      postFiles: postFiles,
      postFileImageUrl: postFileImageUrl,
      postPhotoImageUrl: postPhotoImageUrl,
      postPhoto: postPhoto,
      postQuery: postQuery,
      postRelation: postRelation,
      postRelationBatch: postRelationBatch,
      postReports: postReports,
      postTouch: postTouch,
      postTenure: postTenure,
      postUserDocs: postUserDocs,
      postUserPreference: postUserPreference,
      prequery: prequery,
      promoteGroup: promoteGroup,
      queryExport: queryExport,
      queryMedia: queryMedia,
      queryReport: queryReport,
      queryTwitter: queryTwitter,
      //queryReportPrebuilt: queryReportPrebuilt,
      quickStart: quickStart,
      quickStartUserReg: quickStartUserReg,
      recent: recent,
      recentHide: recentHide,
      refreshAppUser: refreshAppUser,
      register: register,
      removeFave: removeFave,
      requestExpertOrg: requestExpertOrg,
      requestOrgUpdate: requestOrgUpdate,
      requestTeam: requestTeam,
      replaceReport: replaceReport,
      resetSubscriptionIds: resetSubscriptionIds,
      resolveAREntities: resolveAREntities,
      setDefaultCollection: setDefaultCollection,
      setMyTimeZoneId: setMyTimeZoneId,
      setSubscriptionIds: setSubscriptionIds,
      setDS: setDS,
     StripeCancel: StripeCancel,
      stripePurchase: stripePurchase,
      subscribe: subscribe,
      tagNameUnique: tagNameUnique,
      teamnameOK: teamnameOK,
      test: test,
      unsubscribe: unsubscribe,
      unsyncTouch: unsyncTouch,
      updateEntityDescription: updateEntityDescription,
      updateEntityModifiedDt: updateEntityModifiedDt,
      updateTouchLastSync: updateTouchLastSync,
      usage: usage,
      userAdmin: userAdmin,
      usernameOK: usernameOK,
      userTypeLooseTags: userTypeLooseTags,
      validateTemplate: validateTemplate,

      //SysAdmin only
      updatePaidSubsGroup: updatePaidSubsGroup
    }

  }


})();
