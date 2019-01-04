(function () {
    'use strict';

    angular.module("shuriApp").factory('purchases', ['$window','$http', '$q', '$timeout', 'dataApi', purchases]);
    function purchases($window, $http, $q, $timeout, dataApi) {

        var srv = this;

        //returns a subscriber
        function purchase(appUser, subscription) {
            var deferred = $q.defer();

            var subscriber = new shuri_subscriber();
            subscriber.person_Id = appUser.id;
            subscriber.subscription_Id = subscription.id;
            subscriber.productId = subscription.productId;

            if (subscription.value > 0) {

                if (!$window.inAppPurchase) {
                    //simulate a purchase - hook in Credit Card collection later
                    subscriber.receipt = "Simulated receipt";
                    subscriber.signature = "Simulated signature";
                    subscriber.transactionId = "Simulated transactionId";

                    if (subscription.subscriptionType == shuri_enums.subscriptiontype.annual) subscriber.endDt = moment().add(1, 'years');
                    else subscriber.endDt = moment().add(1, 'months');
                    deferred.resolve(subscriber);
                }
                else {
                    console.log("Ordering " + subscription.productId);
                    var theReceipt = null;
                    if(ionic.Platform.isAndroid()){
                      subscription.productId = subscription.productId.toLowerCase();
                    }
                    console.log(subscription.productId);
                    inAppPurchase.subscribe(subscription.productId)
                      .then(function (receiptinfo) {
                          subscriber.receipt = receiptinfo.receipt;
                          if (ionic.Platform.isAndroid()) {
                              dataApi.getReceiptAndroid(receiptinfo).then(function (receipt) {
                                console.log(receipt.data.receipt);
                                  theReceipt = receipt.data.receipt;
                                  subscriber.signature = receiptinfo.signature;
                                  subscriber.endDt = theReceipt.expirationDate;
                                  subscriber.transactionId = theReceipt.productId;
                                  subscriber.productId = theReceipt.productId;
                                  deferred.resolve(subscriber);
                              })
                          } else if (ionic.Platform.isIOS()) {
                              dataApi.getReceiptIOS(receiptinfo).then(function (result) {
                                  result.data.receipts.forEach(function (rec) {
                                      if (rec.productId == subscription.productId) {
                                          //console.log("found the right product", receipts[i]);
                                          subscriber.endDt = new Date(Number(rec.expirationDate)).toUTCString();
                                          subscriber.transactionId = rec.productId;
                                          subscriber.productId = rec.productId;
                                      }
                                  });
                                  deferred.resolve(subscriber);
                              })
                          }

                      })
                      .catch(function (err) {
                        console.log(err);
                          subscriber.hasError = true;
                          console.log(err, 'this is an error');
                          if (err.message) subscriber.errorMessage == err.message;
                          deferred.resolve(subscriber);

                      })
                }

            }
            else $timeout(function () { deferred.resolve(subscriber); }, 100);   //freebie, simulate an asych

            return deferred.promise;
        };

        function getProducts(productIds) {
            var deferred = $q.defer();
            if ($window.inAppPurchase) {
              console.log('in get products, fetching products');
                inAppPurchase.getProducts(productIds).then(function (products) {
                    deferred.resolve(products);
                })
                .catch(function (err) { deferred.reject(err); });
            }
            else $timeout(function () { deferred.resolve("No store"); }, 100);   //simulate an asych

            return deferred.promise;
        };

        function restorePurchases(){
          var deferred = $q.defer();
          if ($window.inAppPurchase) {
            inAppPurchase.restorePurchases().then(function(products){
              console.log('Purchases have been restored');
              deferred.resolve(products)
            })
            .catch(function(err){
              deferred.reject(err)
            })
          }
          else $timeout(function () { deferred.resolve("No store"); }, 100);   //simulate an asych

          return deferred.promise;
        }

        return {
            getProducts: getProducts,
            purchase: purchase,
            restorePurchases: restorePurchases
        };
    }


})();
