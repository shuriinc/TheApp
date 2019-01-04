angular.module("shuriApp").directive('entityLocations', ['$rootScope', '$ionicLoading', '$ionicScrollDelegate', '$timeout', '$filter', '$location', '$q', '$cordovaGeolocation', '$state', '$ionicPopup', 'globals', 'dataApi', 'appGlobals',
  function ($rootScope, $ionicLoading, $ionicScrollDelegate, $timeout, $filter, $location, $q, $cordovaGeolocation, $state, $ionicPopup, globals, dataApi, appGlobals) {
    return {
      restrict: "E",
      scope: {
        entity: '=',
        entityType: '=',
        isDirty: '=',
        manageUpdates: '=',
      },
      templateUrl: "templates/directives/entityLocations.html?" + _cacheBuster,
      link: function (scope, element, attrs) {
        scope.wordFor = function (word) { return globals.wordFor(word); };
        scope.onDesktop = !(window.cordova);
        //scope.onDesktop = false;
        scope.isNarrow = (window.innerWidth <= appGlobals.widthSmall);
        scope.mapcanvasId = "theMap" + $state.current.name.replaceAll(".", "");
        scope.mode = 'default';

        var watcherEntity = scope.$watch('entity', function () {
          if (typeof scope.entity === "undefined" || scope.entity === null) return;
          scope.showLocsKey = String.format("collEntLocation_{0}", scope.entity.id);
          //console.log(scope.entity.locations);
          assignUI();
        });
        var watchMU = scope.$watch('manageUpdates', function () {
          if (scope.manageUpdates === undefined) return;
          scope.manageUpdates = (scope.manageUpdates == "true" || scope.manageUpdates == true);
        });


        function assignUI() {
          if (scope.entity) {
            countLocations();
            if (sessionStorage.getItem(scope.showLocsKey)) scope.showLocs = true;
            scope.isCurated = (scope.entity.collection_Id == appGlobals.guidARDB);

            dataApi.initialize().then(function (d) {
              scope.appUser = d.appUser;

              scope.showDefaultButtons = (scope.entity.updatable && (!scope.isCurated || scope.appUser.isWorker || scope.appUser.isReviewer));

              if ($state.current.name.toLowerCase().indexOf("edit") >= 0) {
                scope.isInEdit = true;
                scope.showLocs = true;
              }

              $ionicLoading.hide();
              //console.log(scope.entity.locations);
            }, function () { $ionicLoading.hide(); });
          }
        }

        scope.toggleShowLocs = function () {
          scope.showLocs = (!scope.showLocs);
          countLocations();
          //console.log($filter("filter")(scope.entity.locations, function (loc) { return loc.changeType != 2; }))

          if (scope.showLocs) sessionStorage.setItem(scope.showLocsKey, "true");
          else {
            var container = document.getElementById(scope.mapcanvasId);
            container.style.height = "0px";
            sessionStorage.removeItem(scope.showLocsKey);
            scope.mode = "default";
          }
        }

        function countLocations() {
          if (scope.entity.locations) {
            scope.entityCount = ($filter("filter")(scope.entity.locations, function (loc) { return loc.changeType != 2; })).length;
          }
          else scope.entityCount = 0;
        }

        scope.locClick = function (loc) {
          scope.location = loc;
          scope.mode = "map";
          console.log(scope.isResolved, loc);
          if (loc.latitude != 0 && loc.longitude != 0) {
            scope.lookupLocation(loc);
          }
          else {
            scope.mode = "add";
            scope.lookupTitle = "Lookup Location";
          }
        }

        scope.addNew = function ($event) {
          if (event) event.stopPropagation();
          scope.hideLookupButton = false; //gets turned off in GPS; 
          var container = document.getElementById(scope.mapcanvasId);
          container.style.height = "0px";
          scope.lookupTitle = "Add Location";

          scope.location = new shuri_location();
          scope.location.typename = "ADDNEW";
          scope.mode = "add";
        }

        scope.addAddress = function () {
          if (scope.location.typename != "ADDNEW") scope.location.typename = "POST"; //signal an update
          //console.log(scope.location.typename);
          scope.location.changeType = 1;
          scope.closeLookup(true);
        }

        scope.deleteLoc = function (location, event) {
          if (event) event.stopPropagation();
          if (scope.location.typename == "ADDNEW") return;

          var msg = String.format("Delete this location?", "");
          var pop = $ionicPopup.confirm({
            title: "Confirm Delete",
            template: msg
          });
          pop.then(function (res) {
            if (res) {
              location.changeType = 2;
              dataApi.deleteRelation(scope.entityType, scope.entity.id, shuri_enums.entitytypes.location, location.id, true).then(function () {
                dataApi.deleteEntity(location.id, shuri_enums.entitytypes.location, location, true).then(function (data) {
                  dataApi.clearCacheItemByEntity(scope.entityType, scope.entity.id).then(function () {
                    dataApi.updateEntityModifiedDt(scope.entity.id, scope.entityType).then(function () {
                      $rootScope.$broadcast("EntityChanged", scope.entity.id);
                      scope.closeLookup(false);
                    });
                  });
                });
              });

            }
          });



        }


        //#region Lookup----------------------------------------------
        scope.closeLookup = function (saveLoc) {
          if (saveLoc) {
            if (scope.manageUpdates) {
              //post the loc and add Relationship
              //console.log(scope.manageUpdates, scope.location, scope.entity.id);
              $ionicLoading.show({ template: "Saving...", duration: 5000 });
              dataApi.postEntity("Locations", "location", scope.location).then(function (data) {
                scope.location.id = data;
                dataApi.postRelation(scope.entityType, scope.entity.id, shuri_enums.entitytypes.location, scope.location.id).then(function () {
                  dataApi.updateEntityModifiedDt(scope.entity.id, scope.entityType).then(function () {
                    finishSave();
                  })
                });
              });
            }
            else {
              scope.location.typename = "POST"; //signal an update
              scope.location.changeType = 1;
              scope.entity.locations.push(scope.location);
              finishSave();
            }

          }
          else scope.closeMap();
        }

        function finishSave() {
          //if (scope.location.typename == "ADDNEW") {
          //    scope.location.typename = "";
          //    scope.entity.locations.push(scope.location);
          //}
          //else {
          //   for (var i = 0; i < scope.entity.locations.length; i++) {
          //        if (scope.location.id == scope.entity.locations[i].id) {
          //            scope.entity.locations.splice(i, 1);
          //            break;
          //        }
          //    };
          //    scope.entity.locations.push(scope.location);
          //}

          //countLocations();
          scope.isDirty = true;
          scope.closeMap();


        }

        scope.closeMap = function () {
          var container = document.getElementById(scope.mapcanvasId);
          container.style.height = "0px";
          scope.mode = 'default';
          scope.hasNewMap = false;

        }

        scope.lookupLocation = function (loc) {
          showLocOnMap(loc);
        }


        function showLocOnMap(loc) {
          var container = document.getElementById(scope.mapcanvasId);
          container.style.height = (scope.isNarrow) ? "360px" : "480px";

          if (loc.latitude != 0 || loc.longitude != 0) {
            var latLng = new google.maps.LatLng(loc.latitude, loc.longitude);
            var options = { center: latLng, fullscreenControl: true, zoom: 13, zoomControl: true };
            scope.map = new google.maps.Map(container, options);

            var marker = new google.maps.Marker({
              map: scope.map,
              position: latLng,
              animation: google.maps.Animation.DROP
            });
            scope.hasNewMap = true;

            ////scroll
            //$timeout(
            //    function scrollIntoView() {
            //        var el = document.getElementById("entityLocations");
            //        console.log(el);
            //        $location.hash("entityLocations");   //set the location hash
            //        var handle = $ionicScrollDelegate.$getByHandle('theHandle');
            //        handle.anchorScroll(true);  // 'true' for animation
            //        //handle.anchorScroll(true);  // 'true' for animation
            //    }
            //    , 50);
          }


        }


        scope.lookupClick = function () {
          search({ 'address': scope.location.address }).then(function (res) {
            // success

            if (res && res.place_id) {
              locFromGeo(res, scope.location);
              //console.log(scope.location);
              scope.isDirty = true;
              showLocOnMap(scope.location)
            }
          }, function (status) {
            console.log(status); scope.hasNoresults = true;
          }  //error
          );

        }

        // object:  { 'address': address }  or { 'location': latlng }
        function search(searchObject) {
          var d = $q.defer();
          //console.log(searchObject);
          var geocoder = new google.maps.Geocoder();
          if (geocoder && searchObject) {
            geocoder.geocode(searchObject, function (results, status) {
              //console.log(results);
              if (status == google.maps.GeocoderStatus.OK) {
                d.resolve(results[0]);
              }
              else d.reject(results);
            });
          }
          else d.reject("missing searchObject or geocoder");

          return d.promise;
        };


        scope.gpsLookup = function () {
          if (!window.cordova) globals.showAlert("This feature only available on devices with GPS.");
          else {
            var posOptions = { timeout: 10000, enableHighAccuracy: false };
            $cordovaGeolocation.getCurrentPosition(posOptions).then(function (pos) {
              var latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
              search({ 'location': latLng }).then(function (res) {
                scope.location = new shuri_location();
                locFromGeo(res, scope.location);
                scope.mode = "add";
                scope.hasNewMap = scope.hideLookupButton = scope.isDirty = true;
                showLocOnMap(scope.location);

              })
            })

          }
        }

        function locFromGeo(geoResult, loc) {
          //console.log(geoResult, loc);
          if (geoResult.formatted_address != null) loc.address = geoResult.formatted_address;
          if (geoResult.place_id != null) loc.place_Id = geoResult.place_id;
          if (geoResult.geometry.location.lat != null) loc.latitude = geoResult.geometry.location.lat();
          if (geoResult.geometry.location.lng != null) loc.longitude = geoResult.geometry.location.lng();

          geoResult.address_components.forEach(function (addr) {
            addr.types.forEach(function (type) {
              switch (type) {
                case "country":
                  loc.country = addr.long_name;
                  break;
                case "postal_code":
                  loc.postal = addr.long_name;
                  break;
                case "route":
                case "street_address":
                  loc.street = loc.street + addr.long_name;
                  break;
                case "postal_town":
                case "locality":
                  loc.city = addr.long_name;
                  break;
                case "administrative_area_level_1":
                  loc.state = addr.long_name;
                  break;
                case "street_number":
                  loc.street = addr.long_name + " " + loc.street;
                  break;
                //case "intersection":
                //case "political":
                //case "administrative_area_level_2":
                //case "administrative_area_level_3":
                //case "colloquial_area":
                //case "sublocality":
                //case "neighborhood":
                //case "premise":
                //case "subpremise":
                //case "natural_feature":
                //case "airport":
                //case "park":
                //case "point_of_interest":
                //case "post_box":
                //case "floor":
                //case "room":
                //case "establishment":
                //case "sublocality_level_1":
                //case "sublocality_level_2":
                //case "sublocality_level_3":
                //case "sublocality_level_4":
                //case "sublocality_level_5":
                //case "postal_code_suffix":
                //    break;

              }

            });
          });
        }
        //#endregion

        $rootScope.$on("EntityCountDecremented", function (event, parentId, entityType, entityIdOrName) {
          //console.log(parentId, entityType, entityIdOrName, scope.location, scope.entity);
          if (scope.entity && scope.entity.id.toLowerCase() == parentId.toLowerCase()) {
            if (entityType == shuri_enums.entitytypes.location) {
              countLocations();
              scope.isDirty = true;
            }

          }

        });

      }
    }
  }]);
