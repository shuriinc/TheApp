(function () {
  'use strict';
  angular.module("shuriApp").controller('ChangeOwnerCtrl', function ($scope, $state, $stateParams, $rootScope, $filter, $q, $timeout, $window, $ionicHistory, $ionicPopup, globals, dataApi, appGlobals) {
    var vm = this;

    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.onDesktop = !(window.cordova);


    vm.helpModal = function (nestedModal) {
      $scope.$parent.vmMaster.help(nestedModal);
    }

    vm.cancel = function (changed) {
      if (changed) $rootScope.$broadcast("RefreshMain", true);
      $window.history.go(-1);
    }

    //#region Autocomplete ------------------------------------------------
    vm.placeholderSearch = "Choose a new owner";
    vm.pause = 400;
    vm.minLength = 2;
    vm.searchString = "";
    vm.searchStringLast = null;
    vm.addTimer = null;
    vm.hideTimer = null;
    vm.searching = false;
    vm.showResults = false;
    vm.addGroupDuration = 2500;

    vm.keyPressedAdd = function (event, childscope) {
      //console.log(vm.searchString);

      if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
        if (!vm.searchString || vm.searchString == "") {
          vm.showResults = false;
          vm.searchStringLast = null;
        } else if (isNewSearchNeeded(vm.searchString, vm.searchStringLast, vm.minLength)) {
          vm.searchStringLast = vm.searchString;
          vm.showResults = true;
          vm.searchResults = [];

          if (vm.addTimer) {
            $timeout.cancel(vm.addTimer);
          }

          vm.searching = true;

          vm.addTimer = $timeout(function () {
            vm.timerAddComplete(vm.searchString);
          }, vm.pause);
        }
      } else {
        event.preventDefault();
      }
      if (vm.searchString.length == 0) {
        vm.resetSearch();
      }
    };

    vm.resetSearch = function () {
      vm.searching = false;
      vm.showSearchResults = false;
      vm.searchResults = [];
      //$ionicScrollDelegate.scrollTop();

    }

    vm.resetHideResults = function (mode) {
      if (vm.hideTimer) {
        $timeout.cancel(vm.hideTimer);
      };
    };

    vm.hideResults = function () {
      vm.hideTimer = $timeout(function () {
        vm.showResults = false;
      }, vm.pause);
    };

    vm.selectAddResult = function (result) {
      vm.showSearchResults = false;
      var msg = String.format("Transferring ownership to {0} may result in you losing access to this item.  OK to continue?", result.name);
      var pop = $ionicPopup.confirm({
        title: String.format("Give to {0}?", result.name),
        template: msg
      });
      pop.then(function (res) {
        if (res) {
          dataApi.changeEntityOwner(result.id, vm.objEntity.id, vm.entityType).then(function () {
            //console.log($ionicHistory);
            vm.cancel(true);
          });
        }
      });

    };

    function finishSelectAddResult() {
      vm.searchString = vm.searchStringLast = "";
      vm.addResultInProgress = false;
    }

    vm.timerAddComplete = function (str) {
      // Begin the search
      if (str.length >= vm.minLength) {
        vm.searching = true;
        dataApi.getAutocomplete(shuri_enums.entitytypes.user, str, 12).then(function (data) {
          vm.searchResults = $filter("filter")(data, function (d) { return (d.id != vm.appUser.id); });
          vm.searching = false;
          vm.showSearchResults = true;
        });
      }
    };


    function isNewSearchNeeded(newTerm, oldTerm, minLength) {
      return newTerm.length >= minLength && newTerm != oldTerm;
    }


    //#endregion


    $scope.$on('$ionicView.enter', function () {
      //console.log("IN");
      vm.entityType = parseInt($stateParams.entityType);
      if (!vm.entityType) throw "No entityType passed in.";

      dataApi.initialize("ChangeOwnerCtrl").then(function (d) {
        vm.appUser = d.appUser;
        vm.objEntity = appGlobals.objModal;
        if (!vm.objEntity) {
          //we're lost
          $state.go("home.main");
        }
        //console.log(vm.objEntity, vm.appUser.id);
        if (vm.objEntity.ownedBy_Id != vm.appUser.id && !vm.appUser.isSysAdmin) throw "User is not the owner.";
        else {
          vm.itemClass = "bar-positive";
          switch (vm.entityType) {
            case shuri_enums.entitytypes.group:
              vm.itemClass = "groupColor";
              break;
            case shuri_enums.entitytypes.team:
              vm.itemClass = "teamColor";
              break;
            case shuri_enums.entitytypes.private:
              vm.itemClass = "groupColor";
              break;
            case shuri_enums.entitytypes.subscription:
              vm.itemClass = "bar-positive";
              break;
            case shuri_enums.entitytypes.user:
            case shuri_enums.entitytypes.subscriber:
            case shuri_enums.entitytypes.person:
              vm.itemClass = "bar-energized";
              break;
            case shuri_enums.entitytypes.organization:
              vm.itemClass = "bar-calm";
              break;
            case shuri_enums.entitytypes.touch:
              vm.itemClass = "bar-balanced";
              break;
            case shuri_enums.entitytypes.tag:
              vm.itemClass = "bar-royal";
              break;
            case shuri_enums.entitytypes.usertype:
              if (vm.objEntity.entityType == shuri_enums.entitytypes.tag) vm.itemClass = "item-royal";
              else if (vm.objEntity.entityType == shuri_enums.entitytypes.touch) vm.itemClass = "item-balanced";
              break;

          }
        }

      });
    });
  });
})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('DebugCtrl', function ($scope, $state, dataApi) {
    var vm = this;
    vm.test = function () {
      dataApi.getAppUser().then(function (data) {
        vm.appUser = data;
        //console.log(vm.id);
        //return;
        dataApi.deleteEntity(vm.id, shuri_enums.entitytypes.contactpoint).then(function (data) {
          //console.log(data);
          vm.data = data;
          vm.id = "";
        }, function (err) { console.log("Error", err); });

      });
    }
  });
})();

//(function () {
//  'use strict';
//  angular.module("shuriApp").controller('DatePrefsTouchesCtrl', function ($rootScope, $scope, $stateParams, $ionicHistory, globals, dataApi, appGlobals) {
//    var vm = this;
//    vm.wordFor = function (word) { return globals.wordFor(word); };
//    vm.subheaderClass = "bar-positive";

//    vm.refreshData = function () {
//      try {
//        dataApi.getUserPreferences().then(function (d) {
//          vm.preferences = d;
//        });
//      }
//      catch (err) { console.error(err); }
//    }


//    vm.cancel = function () {
//      goBack();
//    }

//    function goBack() {
//      $ionicHistory.goBack();

//    }

//    $scope.$on('$ionicView.enter', function () {
//      dataApi.initialize("").then(function (d) {
//        vm.refreshData();
//      });
//    });


//  });

//})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('FilesCtrl', function ($scope, $state, $filter, $ionicHistory, $ionicPopup, globals, dataApi) {
    var vm = this;
    vm.pageSize = 50;
    vm.page = 0;
    vm.sortOrder = 'date';  //also could be: name
    vm.nameContains = '';
    vm.sortDateCls = 'button-balanced';
    vm.sortNameCls = 'button-stable';

    vm.wordFor = function (word) { return globals.wordFor(word); };

    vm.loadMore = function () {
      vm.page++;
      dataApi.getFiles(vm.sortOrder, vm.nameContains, vm.page, vm.pageSize).then(function (data) {
        if (!vm.files) vm.files = [];
        data.forEach(function (doc) {
          doc.icon = FileIcon(doc.value);
          vm.files.push(doc);
        })
        vm.hasMore = (data.length == vm.pageSize);
        vm.showList = true;
        //console.log(vm.files);

      });
    }

    vm.openFile = function (url) {
      //console.log(url);
      if (url && url.length > 8) {
        var win;
        if (url.indexOf("http") > -1) win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
        else win = window.open(url, '_self');
      }

    }

    vm.setOrder = function (order) {
      vm.sortOrder = order;
      vm.showList = false;
      vm.sortDateCls = (vm.sortOrder == 'date') ? 'button-balanced' : 'button-stable';
      vm.sortNameCls = (vm.sortOrder == 'date') ? 'button-stable' : 'button-balanced';
      vm.page = 0;
      vm.files = [];
      vm.loadMore();

    }

    vm.deleteFile = function (event, doc) {
      if (event) event.stopPropagation();
      var msg = String.format("Delete {0} permanently?", doc.name);
      var dele = $ionicPopup.confirm({
        title: "Confirm Delete",
        template: msg
      });
      dele.then(function (res) {
        if (res) {
          dataApi.deleteEntity(doc.id, shuri_enums.entitytypes.document).then(function (data) {
            vm.files.forEach(function (file) {
              if (file.id === doc.id) file.changeType = 2;
            })
          });
        }
      });
    }

    vm.cancel = function () {
      $ionicHistory.goBack();
    }

    dataApi.initialize("").then(function (d) {
      vm.loadMore();
    });
  });
})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('FilterSubsCtrl', function ($scope, $state, $rootScope, $filter, $ionicHistory, $ionicLoading, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.saveButtonEnabled = false;

    vm.refreshData = function () {
      dataApi.getAppUser().then(function (data) {
        vm.user = data;

        //remove public
        vm.collections = $filter("filter")(vm.user.subscriptions, (function (sub) {
          return (sub.group_Id != appGlobals.guidEmpty)
        }));


        vm.subIds = vm.user.subscriptionIds;
        for (var i = 0; i < vm.collections.length; i++) {
          vm.collections[i].viewing = false;
          if (vm.collections[i].group_Id == vm.user.defaultCollection_Id) vm.collections[i].isDefault = true;
          for (var j = 0; j < vm.user.subscriptionIds.length; j++) {
            if (vm.user.subscriptionIds[j] == vm.collections[i].group_Id) {
              vm.collections[i].viewing = true;
              break;
            }
          }
        }

        globals.sendAppView('filterSubs', 14, vm.user.id);

      });
    }

    vm.selectAll = function () {
      for (var i = 0; i < vm.collections.length; i++) {
        vm.collections[i].viewing = true;
      }
      vm.saveButtonEnabled = true;

    }

    vm.clearAll = function () {
      for (var i = 0; i < vm.collections.length; i++) {
        //if (vm.collections[i].group_Id != vm.user.defaultCollection_Id)
          vm.collections[i].viewing = false;
      }
      //vm.saveButtonEnabled = false;

    }

    vm.toggleViewing = function (sub) {

      //must keep at least one selected
      var isFiltered = false;
      var oneSelected = false;
      for (var i = 0; i < vm.collections.length; i++) {
        if (vm.collections[i].viewing) oneSelected = true;
        else isFiltered = true;
      }
      vm.saveButtonEnabled = oneSelected;
      vm.user.subsFiltered = isFiltered;

    };
    vm.resetSubs = function () {
      vm.selectAll();
      appGlobals.forceQueryRefresh = true;
      dataApi.resetSubscriptionIds().then(function (data) {
        goBack();
      });

    }

    vm.save = function () {
      var ids = [];
      appGlobals.forceQueryRefresh = true;
      var allChecked = true;
      for (var i = 0; i < vm.collections.length; i++) {
        if (vm.collections[i].viewing) ids.push(vm.collections[i].group_Id);
        else allChecked = false;
      }
      //console.log(allChecked, ids);
      if (ids.length == 0) {
        globals.showAlert("Nothing Selected", "Please select at least one database.");
      }
      else if (allChecked) vm.resetSubs();
      else {

        dataApi.setSubscriptionIds(ids).then(function (data) {
          //console.log(ids, data);
          goBack();
        });
      }

    };

    vm.cancel = function () {
      goBack();
    }

    function goBack() {
      $ionicHistory.goBack(-1);

    }
    $rootScope.$on('RefreshMain', function (event, beQuiet) {
      //console.log(beQuiet);
      vm.refreshData();
    });

    dataApi.initialize("").then(function (d) {
      vm.refreshData();
    });


  });
})();


(function () {
  'use strict';
  angular.module("shuriApp").controller('InappPurchasesCtrl', function ($scope, $stateParams, $http, $filter, $q, $window, $ionicPopup, $ionicModal, $ionicHistory, $ionicScrollDelegate, globals, dataApi, purchases, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.showList = false;
    vm.onDesktop = !(window.cordova);
    vm.isIOS = ionic.Platform.isIOS();

    vm.show = function (section) {
      $ionicScrollDelegate.scrollTop();
      vm.showUpgrades = vm.showAvailable = vm.showPurchases = false;
      switch (section.toLowerCase()) {
        case "available":
          vm.title = "Available Databases";
          vm.headerClass = "bar bar-subheader bar-calm";
          vm.showAvailable = true;
          break;
        case "purchases":
          vm.title = "Your Purchases";
          vm.headerClass = "bar bar-subheader bar-balanced";
          vm.showPurchases = true;
          break;
        default:
          vm.title = "Storage Upgrades";
          vm.headerClass = "bar bar-subheader bar-positive";
          vm.showUpgrades = true;
          break;
      }
    }

    vm.refreshData = function () {
      $ionicScrollDelegate.scrollTop();
      vm.showList = false;
      $q.all({
        dataAppUser: dataApi.getAppUser(),
        dataSubs: dataApi.getSubscriptionsAvailable()
      }).then(function (d) {
        //console.log(d.dataSubs);
        vm.appUser = d.dataAppUser;
        vm.subsMineClosed = vm.appUser.licenseStatus > 0;
        //console.log(d.dataAppUser);

        //find the user's max licenseLevel - for hiding "lesser" upgrades than user owns
        vm.userLicenseLevel = 0;
        var hasPro = false;
        var hasEnt = false;
        var hasAR = false;
        vm.appUser.subscriptions.forEach(function (uSub) {
          if (uSub.licenseLevel > vm.userLicenseLevel) vm.userLicenseLevel = uSub.licenseLevel;
          if (uSub.familyId) {
            if (uSub.familyId.toLowerCase() == "shuripro") hasPro = true;
            if (uSub.familyId.toLowerCase() == "shurienterprise") hasEnt = true;
            if (uSub.familyId.toLowerCase() == "shuriar") {
              hasPro = hasAR = true;
            }
          }


        });

        vm.myPurchases = [];
        vm.sharedSubs = [];
        vm.licenseUpgrades = [];
        vm.productIds = [];
        //console.log(d.dataSubs);

        d.dataSubs.forEach(function (sub) {
          //var ownStatus = ownershipStatus(vm.appUser, sub);
          if (ArrayContainsById(vm.appUser.subscriptions, sub.id)) {
            var filterToOne = $filter("filter")(vm.appUser.subscriptions, function (s) { return s.id == sub.id; });
            if (filterToOne && filterToOne.length > 0) {
              var subscript = filterToOne[0];
              vm.myPurchases.push(subscript);
              var subscriber;
              try { subscriber = subscript.subscribers[0]; }
              catch (e) { }
              if (subscriber) {
                subscript.isEndless = true;
                if (subscriber.endDt) {
                  var momEnd = moment(new Date(subscriber.endDt));
                  subscript.isEndless = (momEnd.isAfter(moment().add(10, "years")));
                  //console.log(subscriber, momEnd.isAfter(moment().add(10, "years")));
                }
                else console.error("Subscriber missing its end date");
              }
              else console.error("Subscription missing its subscriber");
            }
            else console.error("Can find appuser subscription");
          }
          else {
            switch (sub.familyId.toLowerCase()) {
              case "shuripro":
                if (!hasPro && !hasEnt) vm.licenseUpgrades.push(sub);
                break;
              case "shurienterprise":
                if (!hasEnt) vm.licenseUpgrades.push(sub);
                break;
              case "shuriar":
                if (!hasAR) vm.sharedSubs.push(sub);
                break;
              case "shuritechinv":
                //console.log('do nothing');
                break;
              default:
                vm.sharedSubs.push(sub);
                break;
            }
          }


          //set the sort order
          //if (sub.productId.toLowerCase().indexOf("test") >= 0) sub.sorter = " ";
          //else sub.sorter = "x";

          sub.sorter += sub.licenseLevel;
          sub.sorter += sub.subType;
          sub.sorter += sub.name;


          //for reconcile w/app store
          if (ionic.Platform.isAndroid()) {
            if (sub.productId && sub.productId != "") vm.productIds.push(sub.productId.toLowerCase());
          } else {
            if (sub.productId && sub.productId != "") vm.productIds.push(sub.productId);
          }
          // console.log(vm.productIds);

        });

        //vm.myPurchases = $filter('filter')(vm.appUser.subscriptions, function (sub) {
        //    return sub.id != appGlobals.guidEmpty;
        //});

        //console.log(vm.myPurchases);

        //todo Do something with this
        //purchases.getProducts(vm.productIds);

        vm.showList = true;
      },
        function (data) { alert(data); }
        );
    };

    vm.arDbHelp = function () {
      var helpTemplate = "";
      helpTemplate = globals.getHelpView("ardb");
      if (helpTemplate.template != "") {
        $ionicModal.fromTemplateUrl(helpTemplate.template, {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function (modal) {
          vm.modalHelp = modal;
          vm.modalHelp.show();
        });
      }
    }

    vm.closeHelp = function () {
      vm.modalHelp.hide();
      vm.modalHelp.remove();
    }
    vm.dispenseUrl = function (dest, downloadOnly) {
      var url;
      if (dest == 'privacy') url = "http://www.shuri.com/privacy.html";
      else if (dest == 'terms') url = "http://www.shuri.com/terms.html";
      else url = dest;

      if (window.cordova) {
        var win = window.open(url, '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
      }
      else if (downloadOnly == true) {
        var win = window.open(url, "_self");
      }
      else var win = window.open(url, "_blank");

    }

    vm.restorePurchases = function () {
      console.log('Restoring Purchases');
      purchases.restorePurchases().then(function (products) {
        if (products != 'No store') {
          var finalProducts = [];
          products.forEach(function (product) {
            var found = false;
            for (var k = 0; k < finalProducts.length; k++) {
              if (product.productId == finalProducts[k].productId) {
                found = true;
                if (product.date > finalProducts[k].date) {
                  finalProducts[k] = product;
                }
              }
            }
            if (!found) {
              finalProducts.push(product)
            }
          })
          console.log(finalProducts, 'finished');
          finalProducts.forEach(function (product) {
            var hasPurchased = false;
            for (var i = 0; i < vm.myPurchases.length; i++) {
              if (product.productId == vm.myPurchases[i].productId) {
                hasPurchased = true;
              }
            }
            if (!hasPurchased) {
              var subscriber = new shuri_subscriber()
              subscriber.person_Id = vm.appUser.id;
              for (var i = 0; i < vm.subscriptions.length; i++) {
                if (product.productId == vm.subscriptions[i].productId) {
                  subscriber.subscription_Id = vm.subscriptions[i].id;
                  subscriber.productId = vm.subscriptions[i].productId;
                  subscriber.transactionId = vm.subscriptions[i].productId;
                }
              }
              subscriber.endDt = moment(product.date).add(1, 'M')._d.toUTCString();
              dataApi.subscribe(subscriber).then(function (done) {
                console.log('Finished subscribing');
              });
            }
          })
          var alertPopup = $ionicPopup.alert({
            title: 'Store Restore',
            template: 'Your purchases have been restored.'
          });
          alertPopup.then(function (res) {
            dataApi.refreshAppUser().then(function (appuser) {
              vm.refreshData();
              $scope.$emit("license.refreshed");

            })
          });
        }
      });
    }

    vm.unsubscribe = function (sub) {
      //console.log("111", sub);
      var tit, msg;
      tit = "Confirm Unsubscribe";
      msg = "You will no longer have access to " + sub.name + ". ";
      var alertPopup = $ionicPopup.confirm({
        title: tit,
        template: msg
      });
      alertPopup.then(function (res) {
        if (res) {
          dataApi.unsubscribe(sub.id).then(function (data) {
            tit = "Unsubscribe Complete";
            msg = "You are no longer subscribed to " + sub.name;
            var alertPopup = $ionicPopup.alert({
              title: tit,
              template: msg
            });
            alertPopup.then(function (res) {
              dataApi.clearCache();
              vm.refreshData();
              $scope.$emit("license.refreshed");
              $scope.$emit("RefreshMain");

            });
          });
        }
      });
    }

    vm.stripeUnsub = function (sub) {
      //console.log("str", sub);
      var unSubPopup = $ionicPopup.confirm({
        title: "Confirm Cancellation",
        template: "Unsubscribe from " + sub.name + "?"
      });
      unSubPopup.then(function (res) {
        if (res) {
          var obj = {
            uid: vm.appUser.id,
            subId: sub.id
          };
          dataApi.StripeCancel(obj).then(function (data) {
            console.log(data);
          })
        }
      });
    }

    vm.subscribe = function (sub) {
      //web purchase
      if (!(window.cordova)) {
        //free sub
        if (sub.value === 0) purchase(sub);
        //paid sub
        else {
          var handler = StripeCheckout.configure({
            key: 'pk_live_HjIyjkpcMutUSURVivsiSxsA',
            image: '/img/logoPadded.png',
            locale: 'auto',
            zipCode: 'true',
            token: function (token) {
              var obj = {
                user_Id: vm.appUser.id,
                subscription_Id: sub.id,
                token: token.id,
                client_ip: token.client_ip,
                userEmail: token.email
              };
              dataApi.stripePurchase(obj).then(function (data) {
                if (data == "ok") {
                  dataApi.refreshAppUser().then(function (appuser) {
                    vm.refreshData();
                    $scope.$emit("license.refreshed");
                  })
                }
                else {
                  console.log('payment didnt pass');
                }
              });
            }
          });
          handler.open({
            name: 'Shuri',
            description: sub.name,
            amount: parseInt(sub.value.toString().replace(".", ""))
          });
        }
      }
      //mobile purchase
      else {
        var period = "none";
        switch (sub.subType) {
          case 2:
            period = "month";
            break;
          case 3:
            period = "year";
            break;

        }
        var trial = "";
        if (sub.productId == "ShuriMonthlyAR") trial = "A free 7-day trial is included.  ";

        var msg = String.format("<div class='text-center'>Do you want to purchase a subscription to {0} for ${1} (US)? <br /><br />This subscription renews itself every {2}.  {3}</div>"
          , sub.name, sub.value, period, trial);

        var storePopup = $ionicPopup.confirm({
          title: "Confirm Your Purchase",
          template: msg
        });
        storePopup.then(function (res) {
          if (res) purchase(sub);
        });
      }
    };

    function purchase(sub) {
      purchases.purchase(vm.appUser, sub).then(function (subscriber) {
        // console.log(subscriber);
        if (subscriber.hasError) {
          var storePopup = $ionicPopup.alert({
            title: "Nothing Purchased",
            template: (subscriber.errorMessage) ? subscriber.errorMessage : "Unable to complete the transaction."
          });
          storePopup.then(function (res) { vm.refreshData(); });
        }
        else {
          dataApi.subscribe(subscriber).then(function (data) {
            var chg = $filter('currency')(sub.value);
            var tit, msg;
            if (sub.subscriptionTypename.toLowerCase() == "demo") {
              tit = "You have Subscribed";
              msg = "To the free demo database:  " + sub.name;
            }
            else {
              //console.log('should be changing message');
              var chg = $filter('currency')(sub.value);
              tit = "You have Subscribed";
              if (sub.value == 0) {
                msg = "You have subscribed to " + sub.name + ". This is a free subscription";
              } else {
                //console.log('has a value');
                msg = "You will be charged " + chg + " " + sub.subscriptionTypename + " for a subscription to " + sub.name;
              }
            }
            var alertPopup = $ionicPopup.alert({
              title: tit,
              template: msg
            });
            alertPopup.then(function (res) {
              dataApi.refreshAppUser().then(function (appuser) {
                dataApi.clearCache();
                vm.refreshData();
                $scope.$emit("license.refreshed");
                $scope.$emit("RefreshMain");

              })
            });
          });
        }
      });
    }

    $scope.$on('$ionicView.enter', function () {
      vm.refreshData();
    });

    dataApi.initialize("").then(function (d) {
      if ($stateParams.tab) vm.show($stateParams.tab)
      else vm.show("Available");

      globals.sendAppView('inappPurchases', 14, appGlobals.guidSystem);
    });


  });
})();



(function () {
  'use strict';
  angular.module("shuriApp").controller('NewGroupCtrl', function ($scope, $stateParams, $rootScope, $filter, $q, $ionicHistory, $ionicLoading, globals, dataApi, appGlobals) {
    var vm = this;

    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.onDesktop = !(window.cordova);

    vm.addGroup = function () {
      if (vm.newGroup.grpType == shuri_enums.grouptype.team) vm.addTeam();
      else if (vm.newGroup.grpType == shuri_enums.grouptype.collection) vm.addCollection();
      else if (vm.newGroup.grpType == shuri_enums.grouptype.private) vm.addPrivate();
      else {
        globals.showAlert("Error", "Unhandled group type - contact your developer.")
      }
    }

    vm.addPrivate = function () {
      //console.log(vm.newGroup);
      if (!vm.newGroup.name || vm.newGroup.name === "") globals.showAlert("Unable to continue", "Please provide a group name.");
      else {
        vm.newGroup.grpType = shuri_enums.grouptype.private;

        dataApi.postEntity("groups", "group", vm.newGroup).then(function (data) {
          vm.cancel(true);
        });
      }
    }


    vm.addCollection = function () {

      if (vm.newGroup.createTeam) {
        var newTeam = new shuri_group();
        newTeam.name = vm.newTeamname;
        newTeam.grpType = shuri_enums.grouptype.team;
        dataApi.postEntity("groups", "group", newTeam).then(function (data) {
          console.log(data, vm.newGroup, newTeam);
          vm.newGroup.ownedByGroup_Id = data;

          FinishAddCollection();
        });
      }
      else FinishAddCollection();
    }

    var FinishAddCollection = function () {
      dataApi.postEntity("groups", "group", vm.newGroup).then(function (data) {
        vm.cancel(true);
      });

    }

    vm.addTeam = function () {

      dataApi.postEntity("groups", "group", vm.newGroup).then(function (data) {
        vm.newGroup.id = data;

        //Team - create collection?
        if (vm.newGroup.createCollection) {
          var newColl = new shuri_group();
          newColl.name = vm.newGroup.name + " " + vm.wordFor("Collection");
          newColl.grpType = shuri_enums.grouptype.collection;
          newColl.ownedByGroup_Id = vm.newGroup.id;
          dataApi.postEntity("groups", "group", newColl).then(function (data) {
            if (vm.newGroup.addUser) AddUserToTeam();
            else FinishAddTeam();
          });

        }
        else if (vm.newGroup.addUser) AddUserToTeam();
        else FinishAddTeam();
      });
    };

    var AddUserToTeam = function () {
      //add the user to the new team
      //console.log(shuri_enums.entitytypes.group, vm.newGroup.id, shuri_enums.entitytypes.person, vm.appUser.id);
      dataApi.postRelation(shuri_enums.entitytypes.group, vm.newGroup.id, shuri_enums.entitytypes.person, vm.appUser.id).then(function () {
        vm.cancel(true);
      });
    }

    vm.newGroupNameChange = function () {
      if (vm.newGroup.name && vm.newGroup.name.length > 2) {
        vm.groupnameChecked = true;
        if (vm.newGroup.grpType == 2) {
          dataApi.teamnameOK(vm.newGroup.name, vm.newGroup.id).then(function (data) {
            vm.groupnameOK = data;
          });
        }
        else {
          dataApi.groupnameOK(vm.newGroup.name, vm.newGroup.id).then(function (data) {
            vm.groupnameOK = data;
          });
        }
      }
      else vm.groupnameChecked = false;

      vm.isDirty = true;
    }

    vm.newTeamnameChange = function () {
      if (vm.newTeamname.toLowerCase().trim() == vm.newGroup.name) {
        vm.teamnameOK = false;
        vm.teamnameChecked = true;
      }
      else if (vm.newTeamname && vm.newTeamname.length > 2) {
        vm.teamnameChecked = true;
        dataApi.teamnameOK(vm.newTeamname, appGlobals.guidEmpty).then(function (data) {
          vm.teamnameOK = data;

        });
      }
      else vm.teamnameChecked = false;

      vm.isDirty = true;
    }

    vm.helpModal = function (nestedModal) {
      $scope.$parent.vmMaster.help(nestedModal);
    }

    vm.cancel = function (broadcast) {
      //if (broadcast) $rootScope.$broadcast("EntityChanged", vm.newGroup.id);
      //console.log($state);
      $ionicHistory.goBack();

    }

    $scope.$on('$ionicView.enter', function () {
      var grpType = parseInt($stateParams.grpType);
      vm.newGroup = new shuri_group();
      vm.newGroup.grpType = grpType;

      vm.newGroup.createCollection = true;
      vm.newGroup.addUser = true;


      vm.entityType = 2;

      vm.grpWord = "Unknown";
      switch (grpType) {
        case shuri_enums.grouptype.team:
          vm.grpWord = vm.wordFor("Team");
          vm.entityType = 10;
          break;
        case shuri_enums.grouptype.private:
          vm.grpWord = vm.wordFor("Group");
          vm.entityType = 11;
          break;
        case shuri_enums.grouptype.collection:
          vm.grpWord = vm.wordFor("Collection");
          vm.entityType = 12;
          break;
      }
      vm.title = 'New ' + vm.grpWord;

      dataApi.initialize("newGroup").then(function (d) {
        vm.appUser = d.appUser;
        //set vm.newGroup.createCollection:  if user has non-private updatable subscriptions, then false
        vm.appUser.subsMayEdit.forEach(function (sub) {
          if (sub.group_Id != appGlobals.guidEmpty && !sub.isPrivateCollection) {
            vm.newGroup.createCollection = false;
          }
        });
      })

    });


  });


})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('PermissionsCtrl', function ($scope, $stateParams, $rootScope, $state, $filter, $q, $window, $ionicHistory, $ionicLoading, $ionicScrollDelegate, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.subheaderClass = "bar-positive";

    vm.refreshData = function () {
      try {
        $q.all({
          dataPerms: dataApi.permissions(vm.objEntity.id, vm.entityType),
          dataDB: dataApi.getGroup(vm.objEntity.collection_Id),
          appUser: dataApi.getAppUser()
        }).then(function (d) {
          vm.appUser = d.appUser;
          vm.objEntity.db = d.dataDB;
          vm.objEntity.editors = [];
          vm.objEntity.viewers = [];
          vm.objEntity.isPublished = false;
          d.dataPerms.forEach(function (per) {
            switch (per.typename) {
              case "editor":
                vm.objEntity.editors.push(per);
                break;
              case "owner":
                vm.objEntity.owner = per;
                break;
              case "viewer":
                vm.objEntity.viewers.push(per);
                if (per.id.toLowerCase() == appGlobals.guidSystem.toLowerCase()) vm.objEntity.isPublished = true;
                break;
            }
          });

          vm.hideTeam = (vm.objEntity.editors.length > 9);

          switch (vm.entityType) {
            case shuri_enums.entitytypes.group:
              vm.subheaderClass = "groupColor";
              break;
            case shuri_enums.entitytypes.team:
              vm.subheaderClass = "teamColor";
              break;
            case shuri_enums.entitytypes.private:
              vm.subheaderClass = "groupColor";
              break;
            case shuri_enums.entitytypes.subscription:
              vm.subheaderClass = "bar-positive";
              break;
            case shuri_enums.entitytypes.user:
            case shuri_enums.entitytypes.subscriber:
              vm.subheaderClass = "bgTeam";
              vm.hideId = !vm.appUser.isSysAdmin;
              break;
            case shuri_enums.entitytypes.person:
              vm.subheaderClass = "bar-energized";
              break;
            case shuri_enums.entitytypes.organization:
              vm.subheaderClass = "bar-calm";
              break;
            case shuri_enums.entitytypes.touch:
              vm.subheaderClass = "bar-balanced";
              break;
            case shuri_enums.entitytypes.tag:
              vm.subheaderClass = "bar-royal";
              break;
            case shuri_enums.entitytypes.usertype:
              if (vm.objEntity.entityType == shuri_enums.entitytypes.tag) vm.subheaderClass = "bar-royal";
              else if (vm.objEntity.entityType == shuri_enums.entitytypes.touch) vm.subheaderClass = "bar-balanced";
              break;

          }


          //AR Collection: overide worker's names
          if (vm.objEntity.collection_Id.toLowerCase() == appGlobals.guidARDB) {
            vm.workername = "Shuri Subscriptions";
            vm.useNameOverride = true;
            vm.hideTeam = false;
            vm.objEntity.editors = [];
            vm.objEntity.editors.push({ name: "Members of the Shuri Subscriptions Team" });
          }
          else {
            vm.useNameOverride = false;
          }

          if (vm.objEntity.createdDt) vm.objEntity.createdDtJS = moment.utc(vm.objEntity.createdDt).toDate();
          if (vm.objEntity.modifiedDt) vm.objEntity.modifiedDtJS = moment.utc(vm.objEntity.modifiedDt).toDate();

          $ionicScrollDelegate.scrollTop();

        });
      }
      catch (err) { console.error(err); }
    }


    vm.idClicked = function () {
      //console.log();
      document.getElementById("txtId").select();
    }

    vm.cancel = function () {
      $window.history.go(-1);
    }

    $scope.$on('$ionicView.enter', function () {
      vm.entityType = parseInt($stateParams.entityType);
      dataApi.initialize("").then(function (d) {
        vm.objEntity = appGlobals.objModal;
        if (vm.objEntity) vm.refreshData();
        else $state.go("home.main");
      });
    });

    $rootScope.$on('EntityChanged', function (event, data) {
      if (data && data.toLowerCase() === vm.objEntity.id.toLowerCase()) vm.refreshData();

    });

  });

})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('PWChangeCtrl', function ($scope, $state, $stateParams, $ionicHistory, $ionicPopup, $timeout, $http, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };

    function setOK() {
      var ok = false;
      if (vm.name == "") ok = (vm.firstname.trim() != "" && vm.lastname.trim() != "" && vm.pwIsGood && (vm.password == vm.confirmPassword))
      else ok = (vm.pwIsGood && (vm.password == vm.confirmPassword))

      vm.okToSave = ok;
    }

    vm.nameChanged = function () {
      setOK();
    }

    vm.pwChanged = function (isMain) {
      if (isMain) {
        vm.pwIsGood = dataApi.goodPassword(vm.password);
        vm.regPwClasses = (vm.pwIsGood) ? "bgBalanced" : "bgAssertive";
      }
      else {
        vm.conPwClasses = (vm.password == vm.confirmPassword) ? "bgBalanced" : "bgAssertive";
      }
      setOK();
    }

    vm.save = function () {
      dataApi.quickStartUserReg(vm.firstname, vm.lastname, vm.password).then(function (data) {
        //console.log(data)
        dataApi.clearCache();
        dataApi.logout();
        dataApi.refreshAppUser();
        vm.login();

        //var alertPopup = $ionicPopup.alert({
        //    title: 'Thank You',
        //    template: "Please login again with your new password."
        //});
        //alertPopup.then(function (res) {

        //});

      });

    };

    vm.login = function () {
      var s = "";
      var user = { username: $stateParams.username, password: vm.password, rememberMe: true, rememberDays: 30 }
      var loginUrl = dataApi.currentDS().apiUrl + "login";

      var result = $http({
        method: "POST",
        url: loginUrl,
        contentType: "application/json",
        data: angular.toJson(user)
      })
        .success(function (data) {
          var token = data.replace(/\"/g, "");
          localStorage.setItem("appAuthToken", token);
          localStorage.setItem("username", user.username);
          localStorage.setItem("rememberMe", user.rememberMe);
          $state.go("home.main");
        })
        .error(function (data) {
          var s = "";
          if (!data) s = "Connection issues?"
          else if (data.message) s = data.message;
          else s = "Result:<br />" + data;
          var alertPopup = $ionicPopup.alert({
            title: 'Unable to Login',
            template: s
          });
          alertPopup.then(function (res) {
          });
        });
    }

    dataApi.initialize("").then(function (d) {
      globals.sendAppView('pwChange', 14, $stateParams.id);
      vm.name = vm.firstname = vm.lastname = "";

      if ($stateParams.id && $stateParams.username) {
        vm.id = $stateParams.id;
      }
      else console.error("Missing parameters");

      if ($stateParams.name) vm.name = $stateParams.name;
    });


  });
})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('QuickStartCtrl', function ($scope, $state, $stateParams, $ionicHistory, $ionicPopup, $timeout, $filter, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.title = "Team Quick Start";

    vm.nameChange = function () {
      if (vm.teamname && vm.teamname.length > 2) {
        vm.nameChecked = true;
        dataApi.teamnameOK(vm.teamname, appGlobals.guidEmpty).then(function (data) {
          vm.nameOK = data;
          vm.dbname = vm.teamname.trim() + " Database";
        });
      }
      else vm.nameChecked = false;
    }

    vm.save = function () {
      //console.log(vm.teamId, vm.defaultDBId, vm.teamname, vm.emails);
      dataApi.quickStart(vm.teamId, vm.defaultDBId, vm.teamname, vm.emails).then(function (data) {
        //console.log(data)
        var alertPopup = $ionicPopup.alert({
          title: 'Quick Start Results',
          template: data
        });
        alertPopup.then(function (res) {
          $scope.$emit("RefreshMain", true);
          vm.cancel();
        });

      });

    };

    vm.cancel = function () {
      $state.go("home.main");
    }
    vm.dbChanged = function () {
      vm.teamDBs.forEach(function (db) {
        if (db.id.toLowerCase() === vm.defaultDBId.toLowerCase()) {
          vm.dbname = db.name;
        }
      });
    }

    dataApi.initialize("").then(function (d) {
      vm.teamname = "";
      vm.defaultDBId = vm.guidEmpty = appGlobals.guidEmpty;
      vm.teamDBs = [];
      globals.sendAppView('quickStart', 14, appGlobals.guidSystem);
      if (!$stateParams.teamId || $stateParams.teamId == appGlobals.guidEmpty) {
        vm.teamId = appGlobals.guidEmpty;
        vm.newTeam = true;
      }
      else vm.teamId = $stateParams.teamId;

      //get the teams DBs
      if (vm.teamId != appGlobals.guidEmpty) {
        vm.title = "Team Invites";
        dataApi.getTeams().then(function (data) {
          vm.teams = data;

          vm.teamDBs = [];
          vm.teams.forEach(function (team) {
            if (team.id == vm.teamId) {
              vm.teamname = team.name;

              team.groups.forEach(function (db) {
                var teamDB = new shuri_group();
                teamDB.name = db.name;
                teamDB.id = db.id;
                vm.teamDBs.push(teamDB);
              })

            }
          });
          if (vm.teamDBs.length == 1) {
            vm.setDefaultDB = true;
            vm.defaultDBId = vm.teamDBs[0].id;
            vm.dbname = vm.teamDBs[0].name;
          }
          else if (vm.teamDBs.length > 1) {
            var noDB = new shuri_group();
            noDB.name = "(none)";
            noDB.id = appGlobals.guidEmpty;
            vm.teamDBs.unshift(noDB);

            vm.defaultDBId = vm.teamDBs[0].id;
          }
          //console.log(vm.teamDBs);

        });
      }
    });
  });
})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('RequestTeamCtrl', function ($scope, $state, $ionicHistory, $ionicPopup, $timeout, globals, dataApi, appGlobals) {
    var vm = this;
    vm.wordFor = function (word) { return globals.wordFor(word); };
    vm.saveButtonEnabled = false;

    globals.sendAppView('requestTeam', 14, appGlobals.guidSystem);

    vm.save = function () {
      if (vm.selectedResult && vm.selectedResult.id && vm.selectedResult.id != appGlobals.guidEmpty) {
        dataApi.requestTeam(vm.selectedResult.id).then(function (data) {
          var alertPopup = $ionicPopup.alert({
            title: 'Request Sent',
            template: 'You will be contacted by the owner of the team directly.<br /><br />  A hard refresh <span class="smallText">(home screen: pull-down or logout/login)</span> will be required for team changes to be reflected.'
          });
          alertPopup.then(function (res) {
            $ionicHistory.goBack();
          });

        });
      }

    };

    vm.cancel = function () {
      $ionicHistory.goBack();
    }
    //#region Autocomplete ------------------------------------------------
    vm.pause = 400;
    vm.minLength = 2;
    vm.addString = "";
    vm.addStringLast = null;
    vm.addTimer = null;
    vm.hideTimer = null;
    vm.searching = false;
    vm.showResults = false;

    vm.keyPressedAdd = function (event) {
      if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
        if (!vm.addString || vm.addString == "") {
          vm.showResults = false;
          vm.addStringLast = null;
        } else if (isNewSearchNeeded(vm.addString, vm.addStringLast, vm.minLength)) {
          vm.addStringLast = vm.addString;
          vm.showResults = true;
          vm.results = [];

          if (vm.addTimer) {
            $timeout.cancel(vm.addTimer);
          }

          vm.searching = true;

          vm.addTimer = $timeout(function () {
            vm.timerAddComplete(vm.addString);
          }, vm.pause);
        }
      } else {
        event.preventDefault();
      }
    };

    vm.resetHideResults = function (mode) {
      if (vm.hideTimer) {
        $timeout.cancel(vm.hideTimer);
      };
    };

    vm.hideResults = function () {
      vm.hideTimer = $timeout(function () {
        vm.showResults = false;
      }, vm.pause);
    };

    vm.selectAddResult = function (result) {
      //console.log(result);
      vm.selectedResult = result;
      vm.addString = vm.addStringLast = "";

    };

    vm.timerAddComplete = function (str) {
      // Begin the search
      if (str.length >= vm.minLength) {
        dataApi.getAutocomplete(shuri_enums.entitytypes.team, str, 20, shuri_enums.entitytypes.team)
          .then(function (data) {
            vm.searching = false;
            vm.results = data;
          });

      }
    };


    function isNewSearchNeeded(newTerm, oldTerm, minLength) {
      return newTerm.length >= minLength && newTerm != oldTerm;
    }

    //#endregion


  });
})();

(function () {
  'use strict';
  angular.module("shuriApp").controller('ViewMediaCtrl', function ($scope, $state, $stateParams, $rootScope, $filter, $q, $timeout, $window, $ionicHistory, $ionicLoading, globals, dataApi, appGlobals) {
    var vm = this;

    vm.pageTw = 0;
    vm.pageRs = 0;
    vm.pageAr = 0;
    vm.pageSize = 100;
    vm.hasMoreTw = true;
    vm.hasMoreRs = true;
    vm.hasMoreAr = true;
    vm.onDesktop = !(window.cordova);
    vm.displayHeight = (window.innerHeight - 80) + "px";
    vm.cancel = function (changed) {
      $ionicLoading.hide();
      $window.history.go(-1);
    }


    $scope.$on('$ionicView.enter', function () {
      //console.log($state, $stateParams);
      vm.entityType = parseInt($stateParams.entityType);
      if (!vm.entityType) throw "No entityType passed in.";
      if (!$stateParams.viewtab) throw "No viewtab passed in.";
      else vm.viewtab = $stateParams.viewtab;

      if ($stateParams.entityId) vm.entityId = $stateParams.entityId;
      if ($stateParams.mediaFilter) vm.mediaFilter = angular.fromJson(decodeURI($stateParams.mediaFilter));

      if (!vm.entityId && !vm.mediaFilter && vm.viewtab == "tw") throw "Missing params";

      vm.isEntity = (vm.entityType > 0);
      dataApi.initialize().then(function (data) {
        vm.appUser = data.appUser;
        AssignUI();
        vm.loadMore();

      });
    });

    function AssignUI() {
      if (vm.isEntity && vm.viewtab == 'ar') vm.viewtab = "tw";
      switch (vm.viewtab) {
        case "tw":
          vm.classBackground = "bgPositiveLight";
          vm.viewName = "Twitter";
          break;
        case "rs":
          vm.classBackground = "bgCalmLight";
          vm.viewName = "Research";
        break;
        case "ar":
          vm.classBackground = "bgTeamLight";
          vm.viewName = "AR Chat";
          break;
      }
    }


    vm.loadMore = function () {
      if (vm.isLoading) return;

      switch (vm.viewtab) {
        case "tw":
          if (vm.hasMoreTw) loadMoreTwitter();
          break;
        case "rs":
          if (vm.hasMoreRs) loadMoreResearch();
          break;
        case "ar":
          if (vm.hasMoreAr) loadMoreAR();
          break;
      }
    };

    function loadMoreTwitter() {
      vm.pageTw++;
      vm.isLoading = true;

      var entityId = appGlobals.guidEmpty;
      var groupId = appGlobals.guidEmpty;
      var filterText = "";

      if (vm.isEntity) entityId = vm.entity.id;

      if (vm.preferences && vm.preferences.filterObjTw) {
        groupId = vm.preferences.filterObjTw.groupId;
        vm.preferences.filterObjTw.filterText;
      }

      dataApi.queryTwitter(entityId, [groupId], filterText, '', vm.pageTw, vm.pageSize).then(function (data) {
        console.log(data);
        $rootScope.$broadcast('scroll.infiniteScrollComplete');
        data.forEach(function (tweet) {
          tweet.createdDtLoc = new Date(tweet.createdDt + "Z");
          tweet.valueObj = angular.fromJson(tweet.value);
          tweet.valueObj.newtimestamp = moment(Number(tweet.valueObj.timestamp)).format('MMMM Do, YYYY');
          if (tweet.valueObj.people) {
            tweet.valueObj.people.forEach(function (person) {
              if (person.id.toLowerCase() === vm.appUser.id.toLowerCase()) {
                tweet.currentEntity = person;
                tweet.currentEntity.isNew = false;
              }
            });
          }
          else tweet.currentEntity = { id: vm.appUser.id, isNew: true, people: [] };


        });

        if (!vm.tweets) vm.tweets = data;
        else vm.tweets.push.apply(vm.tweets, data);
        vm.hasMoreTw = (data.length == vm.pageSize);
        vm.isLoading = false;

      });
    }

    function AddARTweet(tweet) {
      tweet.createdDtLoc = new Date(tweet.createdDt + "Z");
      tweet.valueObj = angular.fromJson(tweet.value);
      tweet.valueObj.newtimestamp = moment(Number(tweet.valueObj.timestamp)).format('MMMM Do, YYYY');
      if (tweet.valueObj.people) {
        tweet.valueObj.people.forEach(function (person) {
          if (person.id.toLowerCase() === vm.appUser.id.toLowerCase()) {
            tweet.currentEntity = person;
            tweet.currentEntity.isNew = false;
          }
        });
      }
      else tweet.currentEntity = { id: vm.appUser.id, isNew: true, people: [] };
      vm.artweets.push(tweet);


    }

    function loadMoreAR() {
      vm.pageAr++;
      vm.isLoading = true;
     if (!vm.artweets) vm.artweets = [];
      var entityId = appGlobals.guidEmpty;

      if (vm.isEntity) entityId = vm.entity.id;


      dataApi.queryTwitter(entityId, [], '', 'archat', vm.pageAr, vm.pageSize).then(function (data) {
        //console.log(data);
        data.forEach(function (tweet) {
          AddARTweet(tweet)
        });
        dataApi.queryTwitter(entityId, [], '', 'analyst relations', vm.pageAr, vm.pageSize).then(function (data) {
          data.forEach(function (tweet) {
            AddARTweet(tweet)
          });
          vm.hasMoreAr = (data.length == vm.pageSize);
          $rootScope.$broadcast('scroll.infiniteScrollComplete');
          vm.isLoading = false;
        });
      });
    }

    function loadMoreResearch() {
      vm.pageRs++;
      vm.isLoading = true;
      if (!vm.isEntity) {
        dataApi.getDocumentsExt(appGlobals.guidDocResearch, appGlobals.guidEmpty, "", vm.pageRs, vm.pageSize).then(function (data) {
          finishLoadingResearch(data);
        });
      }
      else {
        dataApi.documentsForEntity(vm.entityType, vm.entity.id, appGlobals.guidDocResearch, vm.pageRs, vm.pageSize).then(function (data) {
          //console.log(data);
          finishLoadingResearch(data);
        });
      }
    }

    function finishLoadingResearch(data) {
      data.forEach(function (item) {
        item.valueObj = angular.fromJson(item.value);
        item.valueObj.fmtDate = moment(item.valueObj.date).format('MMMM Do, YYYY');
        item.valueObj.description = HtmlToPlaintext(item.valueObj.description)
        if (item.entityType != shuri_enums.entitytypes.organization) item.entityType = shuri_enums.entitytypes.organization;
      });

      if (!vm.rssPosts) vm.rssPosts = data;
      else vm.rssPosts.push.apply(vm.rssPosts, data);
      vm.hasMoreRs = (data.length == vm.pageSize);
      $rootScope.$broadcast('scroll.infiniteScrollComplete');
      vm.isLoading = false;

    }


    //#region Helpers
    function summarizeFilters() {
      if (!vm.isEntity) {
        var str = "", name = "";
        var filterObj = null;
        if (vm.isTwitter) filterObj = vm.preferences.filterObjTw;
        else filterObj = vm.preferences.filterObjRs;

        if (filterObj.groupId != appGlobals.guidEmpty) {
          vm.privateGroups.forEach(function (grp) {
            if (grp.id.toLowerCase() === filterObj.groupId.toLowerCase()) name = grp.name;
          });
          str += "Group: " + name + " ";
        }
        if (filterObj.filterText.trim() != "") str += "Keyword: " + filterObj.filterText + " ";

        if (str === "") vm.filterSummary = "None";
        else vm.filterSummary = str;
      }

    }



  });
})();




///------------------------------Services
(function () {
  'use strict';
  angular.module("shuriApp").service('fileUpload', ['$http', function ($http) {
    this.uploadFileToUrl = function (file, uploadUrl) {
      var fd = new FormData();
      fd.append('file', file);
      //console.log(file, uploadUrl);
      $http.post(uploadUrl, fd, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      })
        .success(function () {
        })
        .error(function () {
        });
    }
  }]);
})();

