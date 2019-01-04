(function () {
    'use strict';

    angular.module("shuriApp").factory('connectedService', ['$location', '$cordovaOauth', '$cordovaOauthUtility', '$http', '$q', '$timeout', 'dataApi', 'appGlobals', connectedService]);
    function connectedService($location, $cordovaOauth, $cordovaOauthUtility, $http, $q, $timeout, dataApi, appGlobals) {
        var vm = this;
             // 1
        var twitterClientId = "x84gKyTKh5tbhgrFjPCixOsKz";
        var twitterClientSecret = "ZPD2Kh91JGuU3GcbzUUbDBfqlS8UP1nxX7r5x0lzP2FsAnt7wW";
        var facebookClientId = "911541502232246";
        var linkedinClientId = '75v2lfe1d1ier8';
        var linkedinClientSecret = 'RSzTCT17lCJHBGqz';
        var linkedinString = 'uahoauelajsdfteststring';


        function storeUserToken(result, serviceName) {
            var deferred = $q.defer();
            console.log("storeToken");
          $q.all({
              dataAppUser: dataApi.getAppUser(),
              dataUTs: dataApi.getUserTypes()
          }).then(function (d) {
            var hasUT = false;
            var utID, utName, usertypes, user;
            user = d.dataAppUser;
            usertypes = d.dataUTs;
            for(var i = 0; i < usertypes.length; i++){
              if(usertypes[i].name == serviceName + ' Credentials'){
                hasUT = true;
                utID = usertypes[i].id;
              }
            };
            if(hasUT){
              var doc = new shuri_document();
              doc.changeType = 1;
              doc.collection_Id = user.privateCollection_Id;
              doc.name = serviceName + ' Credentials';
              doc.value = angular.toJson(result);
              doc.userType_Id = utID;

              dataApi.postEntity("documents", "document", doc).then(function(newdoc){
                dataApi.postRelation("document", newdoc, "person", user.id).then(function(finaluser){
                  console.log(7, "saved the new doc to the person");
                  dataApi.refreshAppUser().then(function(){
                    deferred.resolve(true)
                  });
                })
              })
            } else {

              var ut = new shuri_userType();
              ut.name = serviceName + " Credentials";
              ut.changeType = 1;
              ut.entityType = "document";
              ut.primitive = 14;
              ut.collection_Id = appGlobals.guidEmpty;

              dataApi.postEntity("usertypes", "usertype", ut).then(function(newut){
                var doc = new shuri_document();
                doc.changeType = 1;
                doc.collection_Id = user.privateCollection_Id;
                doc.name = serviceName + " Credentials";
                doc.value = angular.toJson(result);
                doc.userType_Id = newut;
                dataApi.postEntity("documents", "document", doc).then(function(newdoc){
                  dataApi.postRelation("document", newdoc, "person", user.id).then(function(finaluser){
                    dataApi.refreshAppUser().then(function(){
                      deferred.resolve(true)
                    });
                  })
                })
              });
            }
          });
          return deferred.promise;
            // localStorage.setItem(twitterKey, JSON.stringify(result));
            // console.log(localStorage, "this is the localStorage");
        };

        function getStoredToken(user, serviceName) {
            for(var i = 0; i < user.documents.length; i++){
              if(user.documents[i].name == serviceName + " Credentials"){
                return user.documents[i].value;
              }
            }
            return null;
          // console.log("inside get stored token after storing it for api call");
        };



        function createTwitterSignature(method, url, token, params) {
            console.log(token, "here is the token");
            console.log(params);
            var oauthObject = {
                oauth_consumer_key: twitterClientId,
                oauth_nonce: createNonce(10),
                oauth_signature_method: "HMAC-SHA1",
                oauth_token: token.oauth_token,
                oauth_timestamp: Math.round((new Date()).getTime() / 1000.0),
                oauth_version: "1.0"
            };

            var signatureObj = createSignature(method, url, oauthObject, params, twitterClientSecret, token.oauth_token_secret);
            return signatureObj.authorization_header;

        };

        function linkedinInitialize(){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Linkedin'));
            if (token !== null) {
                deferred.resolve(true);
            } else {
              if(!window.cordova){
                // location.href = 'http://localhost:3000/auth/linkedin';
                location.href = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/auth/linkedin';
                console.log('not set up for offline yet, linkedin');
              } else {
                $cordovaOauth.linkedin(linkedinClientId, linkedinClientSecret, ['r_basicprofile', 'r_emailaddress', 'w_share', 'rw_company_admin'], linkedinString).then(function(result) {
                  console.log('got to this point, before linkedinuser');
                  console.log(result.access_token);
                    getLinkedinUser(result.access_token).then(function(email){
                      console.log('email', email);
                      result.screen_name = email;
                      storeUserToken(result, 'Linkedin').then(function(){
                          deferred.resolve(true);
                      });
                    }, function(err){
                      console.log(error);
                    });
                }, function(error) {
                    console.log(error);
                    deferred.reject(false);
                });
              }
            }
          });
          return deferred.promise;
        };

        function getLinkedinUser(token){
          console.log(token);
          var deferred = $q.defer();
          // var url = 'http://localhost:3000/getLinkedinUser';
          var url = 'https://shuriserviceswest.azurewebsites.net/getLinkedinUser';
          var params = {token: token.toString()};
          params = angular.toJson(params);
          $http.post(url, params, {headers: {'Content-Type': 'application/json'}})
            .success(function(result) {
                      console.log(10, "got the results from linkedin", result);
                      deferred.resolve(result);
            })
           .error(function(error) {
                      console.log(error);
                      alert("There was a problem getting your profile");
                      deferred.reject(false);
            });
            return deferred.promise;
        };

        function getCompanies(){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Linkedin'));
            // var url = 'http://localhost:3000/getCompanies';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/getCompanies';
            $http.post(url, {token: token})
              .success(function(result) {
                        deferred.resolve(result);
              })
             .error(function(error) {
                        alert("There was a problem getting your profile");
                        deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function isLinkedinAuthenticated(){
          var deferred = $q.defer();
            dataApi.getAppUser().then(function(user){
              if(angular.fromJson(getStoredToken(user, 'Linkedin')) !== null){
                deferred.resolve(true);
              } else {
                deferred.resolve(false);
              }
            })
            return deferred.promise;
          // return angular.fromJson(getStoredToken()) !== null;
        };

        function facebookInitialize(){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Facebook'));
            if (token !== null) {
                deferred.resolve(true);
            } else {
              if(!window.cordova){
                location.href = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/auth/facebook';
                console.log('facebook initialize');
              } else {
                $cordovaOauth.facebook(facebookClientId, ["email", "user_friends", "public_profile", "user_status", "publish_actions"]).then(function(result) {
                    getFacebookUser(result.access_token).then(function(email){
                      result.screen_name = email;
                      storeUserToken(result, 'Facebook').then(function(){
                        deferred.resolve(true);
                      });
                    })
                }, function(error) {
                    console.log(error);
                    deferred.reject(false);
                });
              };

            }
          })
          return deferred.promise;
        };

        function getFacebookUser(token){
          console.log(token);
          var deferred = $q.defer();
          // var url = 'http://localhost:3000/getFacebookUser';
          var url = 'http://shuriserviceswest.azurewebsites.net/getFacebookUser';
          // var url = 'https://graph.facebook.com/v2.6/me?fields=name,email';
          // var authorization = 'Bearer ' + token;
          var params = {token: token.toString()};
          params = angular.toJson(params);

          $http.post(url, params, {headers: {'Content-Type': 'application/json'}})
            .success(function(result) {
                      console.log(10, "got the results from facebook", result);
                      deferred.resolve(result);
            })
           .error(function(error) {
                      alert("There was a problem getting your profile");
                      deferred.reject(false);
            });
            return deferred.promise;
        };

        function isFacebookAuthenticated(){
          var deferred = $q.defer();
            dataApi.getAppUser().then(function(user){
              if(angular.fromJson(getStoredToken(user, 'Facebook')) !== null){
                deferred.resolve(true);
              } else {
                deferred.resolve(false);
              }
            })
            return deferred.promise;
          // return angular.fromJson(getStoredToken()) !== null;
        };

        function twitterInitialize(){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            if (token !== null) {
                deferred.resolve(true);
            } else {
              if(!window.cordova){
                  // console.log($location.absUrl());
                  // var continuedstring = $location.absUrl().split('#')[1];
                  // continuedstring = continuedstring.replace(/\//g, '*');
                  location.href = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/auth/twitter';
                  console.log('twitter initialize');
              } else {
                $cordovaOauth.twitter(twitterClientId, twitterClientSecret).then(function(result) {
                    storeUserToken(result, 'Twitter').then(function(){
                      deferred.resolve(true);
                    });
                }, function(error) {
                    console.error(error);
                    deferred.reject(false);
                });
              }
            }
          })
          return deferred.promise;
        };

        function isTwitterAuthenticated(){
          var deferred = $q.defer();
            dataApi.getAppUser().then(function(user){
              if(angular.fromJson(getStoredToken(user, 'Twitter')) !== null){
                deferred.resolve(true);
              } else {
                deferred.resolve(false);
              }
            })
            return deferred.promise;
          // return angular.fromJson(getStoredToken()) !== null;
        };

        function getMyFollowers(cursor){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            // var url = 'http://localhost:3000/getTwitterFollowers';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/getTwitterFollowers';
            var params = {user_id: token.user_id}
            if(cursor){
              params.cursor = cursor;
            }
            $http.post(url, {params: params, token: token})
              .success(function(result) {
                        deferred.resolve(result);
              })
             .error(function(error) {
                        alert("There was a problem getting your profile");
                        deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function getMyFollowing(cursor){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            // var url = 'http://localhost:3000/getTwitterFollowing';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/getTwitterFollowing';
            var params = {user_id: token.user_id}
            if(cursor){
              params.cursor = cursor;
            }
            $http.post(url, {params: params, token: token})
              .success(function(result) {
                        deferred.resolve(result);
              })
             .error(function(error) {
                        alert("There was a problem getting your profile");
                        deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function postMediaData(image){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            // var url = 'http://localhost:3000/postMediaData';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/postMediaData';
            $http.post(url, {image: image, token: token})
              .success(function(result){
                console.log(result);
                deferred.resolve(result);
              })
              .error(function(error){
                console.log(error);
                alert('There was an error getting the image id.');
                deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function postTweet(status, id){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            // var url = 'http://localhost:3000/postTweet';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/postTweet';
            var params = {status: status};
            if(id) params.in_reply_to_status_id = id;
            console.log(params, 'here are the params');
            $http.post(url, {params: params, token: token})
              .success(function(result) {
                console.log(result);
                deferred.resolve(result);
              })
             .error(function(error) {
                console.log(error);
                alert("There was a problem posting your tweet");
                deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function likeTweet(id, state){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, "Twitter"));
            // var url = 'http://localhost:3000/likeTweet';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/likeTweet';
            $http.post(url, {tweetId: id, state: state, token: token})
              .success(function(result){
                // console.log(result);
                deferred.resolve(result);
              })
              .error(function(error){
                console.log('error with likeTweet post');
                alert("There was an issue liking this tweet")
                deferred.reject(false);
              });
          })
          return deferred.promise;
        };

        function retweet(id, state){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            // var url = 'http://localhost:3000/retweet';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/retweet';
            $http.post(url, {tweetId: id, state: state, token: token})
              .success(function(result){
                // console.log(result);
                deferred.resolve(result);
              })
              .error(function(error){
                console.log('error with retweet post');
                alert("there was an issue retweeting");
                deferred.reject(false);
              });
          })
          return deferred.promise;
        }

        function followUser(id){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var token = angular.fromJson(getStoredToken(user, 'Twitter'));
            var url = 'http://localhost:3000/followUser';
            // var url = 'http://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/postTweet';
            var params = {user_id: id};
            console.log(params);
            $http.post(url, {params: params, token: token})
              .success(function(result) {
                console.log(result);
                deferred.resolve(result);
              })
             .error(function(error) {
                console.log(error);
                alert("There was a problem posting your tweet");
                deferred.reject(false);
              });
          });
          return deferred.promise;
        };

        function postSocialMedia(status, options, media_id, media, company){
          var deferred = $q.defer();
          dataApi.getAppUser().then(function(user){
            var fbToken, twToken, liToken;
            if(options.fb) fbToken = angular.fromJson(getStoredToken(user, 'Facebook'));
            if(options.tw) twToken = angular.fromJson(getStoredToken(user, 'Twitter'));
            if(options.li) liToken = angular.fromJson(getStoredToken(user, 'Linkedin'));

            // var url = 'http://localhost:3000/postSocialMedia';
            // var url = 'http://shuriserviceswest.azurewebsites.net/postSocialMedia';
            var url = 'https://shuriserviceswest-shuriserviceswest-staging.azurewebsites.net/postSocialMedia';
            $http.post(url, {status: status, tokens: {fb: fbToken, tw: twToken, li: liToken}, media_id: media_id, media: media, company: company})
              .success(function(result) {
                deferred.resolve(result);
              })
             .error(function(error) {
                alert("There was a problem posting your tweet");
                deferred.reject(false);
              });
          });
          return deferred.promise;
        };

          function escapeSpecialCharacters(string) {
            var tmp = encodeURIComponent(string);
            tmp = tmp.replace(/\!/g, "%21");
            tmp = tmp.replace(/\'/g, "%27");
            tmp = tmp.replace(/\(/g, "%28");
            tmp = tmp.replace(/\)/g, "%29");
            tmp = tmp.replace(/\*/g, "%2A");
            return tmp;
          };

          function transformRequest(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + escapeSpecialCharacters(obj[p]));
            console.log(str.join('&'));
            return str.join('&');
          };

          function createNonce(length) {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for(var i = 0; i < length; i++) {
              text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
          }

          function createSignature(method, endPoint, headerParameters, bodyParameters, secretKey, tokenSecret) {
            if(typeof jsSHA !== "undefined") {
              var headerAndBodyParameters = angular.copy(headerParameters);
              var bodyParameterKeys = Object.keys(bodyParameters);
              for(var i = 0; i < bodyParameterKeys.length; i++) {
                headerAndBodyParameters[bodyParameterKeys[i]] = escapeSpecialCharacters(bodyParameters[bodyParameterKeys[i]]);
              }
              var signatureBaseString = method + "&" + encodeURIComponent(endPoint) + "&";
              var headerAndBodyParameterKeys = (Object.keys(headerAndBodyParameters)).sort();
              for(i = 0; i < headerAndBodyParameterKeys.length; i++) {
                if(i == headerAndBodyParameterKeys.length - 1) {
                  signatureBaseString += encodeURIComponent(headerAndBodyParameterKeys[i] + "=" + headerAndBodyParameters[headerAndBodyParameterKeys[i]]);
                } else {
                  signatureBaseString += encodeURIComponent(headerAndBodyParameterKeys[i] + "=" + headerAndBodyParameters[headerAndBodyParameterKeys[i]] + "&");
                }
              }
              var oauthSignatureObject = new jsSHA(signatureBaseString, "TEXT");
              console.log(oauthSignatureObject, 'step 1');
              var encodedTokenSecret = '';
              if (tokenSecret) {
                encodedTokenSecret = encodeURIComponent(tokenSecret);
              }

              headerParameters.oauth_signature = encodeURIComponent(oauthSignatureObject.getHMAC(encodeURIComponent(secretKey) + "&" + encodedTokenSecret, "TEXT", "SHA-1", "B64"));
              console.log(headerParameters.oauth_signature, 'step 2');
              var headerParameterKeys = Object.keys(headerParameters);
              var authorizationHeader = 'OAuth ';
              for(i = 0; i < headerParameterKeys.length; i++) {
                if(i == headerParameterKeys.length - 1) {
                  authorizationHeader += headerParameterKeys[i] + '="' + headerParameters[headerParameterKeys[i]] + '"';
                } else {
                  authorizationHeader += headerParameterKeys[i] + '="' + headerParameters[headerParameterKeys[i]] + '",';
                }
              }
              return { signature_base_string: signatureBaseString, authorization_header: authorizationHeader, signature: headerParameters.oauth_signature };
            } else {
              return "Missing jsSHA JavaScript library";
            }
          };

        return {
            twitter: {
              getMyFollowers: getMyFollowers,
              getMyFollowing: getMyFollowing,
              twitterInitialize: twitterInitialize,
              isTwitterAuthenticated: isTwitterAuthenticated,
              likeTweet: likeTweet,
              postMediaData: postMediaData,
              postTweet: postTweet,
              retweet: retweet,
              followUser: followUser
            },
            facebook: {
              facebookInitialize: facebookInitialize,
              isFacebookAuthenticated: isFacebookAuthenticated
            },
            linkedin: {
              linkedinInitialize: linkedinInitialize,
              isLinkedinAuthenticated: isLinkedinAuthenticated,
              getCompanies: getCompanies,
              getLinkedinUser: getLinkedinUser
            },
            postSocialMedia: postSocialMedia,
            storeUserToken: storeUserToken
        };
      }


})();
