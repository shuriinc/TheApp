
(function () {
    'use strict';

  angular.module("shuriApp").controller('LoginCtrl', ['appGlobals', '$ionicPopup', '$scope', '$rootScope', '$state', '$stateParams', '$window', '$http', '$ionicModal', '$ionicHistory', '$ionicLoading', '$ionicScrollDelegate', 'globals', 'dataApi', LoginCtrl]);

  function LoginCtrl(appGlobals, $ionicPopup, $scope, $rootScope, $state, $stateParams, $window, $http, $ionicModal, $ionicHistory, $ionicLoading, $ionicScrollDelegate,globals, dataApi) {
        var vm = this;
        vm.user = { username: localStorage.getItem("username"), password: "", rememberMe: localStorage.getItem("rememberMe") };
        vm.user.daysRemember = (window.cordova) ? 92 : 14;
        vm.resetpw = { username: localStorage.getItem("username"), newPassword: "", confirmPassword: "", token: "" };
    vm.reg = { firstname: "", middlename: "", lastname: "", email: "", phone: "", username: "", password: "", sendAgreement: false, userAgreed: false, freeTrial: true };
        vm.strings = {
            login: globals.wordFor("Login"),
            loginRet: globals.wordFor("Return to Login"),
            signUp: globals.wordFor("Sign Up"),
            signUpNew: "New User Sign Up",
            resetPw: globals.wordFor("Reset Password")
        }
        vm.user.rememberMe = true;
        vm.apiUrl = dataApi.currentDS().apiUrl;
        vm.cordova = (window.cordova) ? true : false;
        vm.showPWReset = false;
        vm.cardHeaderClasses = "item item-divider item-positive";
        vm.cardFooterClasses = "item item-divider text-center";
        vm.footerButtonText = vm.strings.signUpNew;
        vm.footerButtonClasses = "button button-balanced";
      vm.agreeButtonCls = "button icon ion-android-checkbox-blank ";
      vm.isNarrow = (window.innerWidth <= appGlobals.widthMedium);
      vm.subtitle = "";
    vm.regTab = "privacy";

    vm.goto = function (event,mode) {
      if (event) event.stopPropagation();
      switch (mode) {
        case 'top':
          var reg = document.getElementById("regTop");
          reg.scrollIntoView();

          $ionicScrollDelegate.scrollTop();
          break;
        case 'terms':
          var win = window.open("https://www.shuri.com/terms", '_blank', 'EnableViewPortScale=yes', 'location=yes', 'closebuttoncaption=Return');
          break;
        case 'ardb':
          vm.regTab = 'ardb';
          var reg = document.getElementById("regInfo");
          reg.scrollIntoView();
          break;
        case 'site':
          vm.regTab = 'site';
          var reg = document.getElementById("regInfo");
          reg.scrollIntoView();
          break;
      }
    }

    vm.toggle = function (mode) {
      switch (mode) {
        case 'agreed': 
          vm.reg.userAgreed = !vm.reg.userAgreed;
          break;
        case 'newSite': 
          vm.newSite = !vm.newSite;
          break;
        case 'freeTrial':
          vm.reg.freeTrial = !vm.reg.freeTrial;
          if (vm.freeTrial) vm.goto('ardb');
          break;
      }

    }
       // vm.onDesktop = !(window.cordova);
        vm.wordFor = function (word) { return globals.wordFor(word); };
        $ionicLoading.hide();

        vm.iAgree = function () {
            vm.reg.userAgreed = !vm.reg.userAgreed;
            if (vm.reg.userAgreed) vm.agreeButtonCls = "button icon ion-android-checkbox-outline ";
            else  vm.agreeButtonCls = "button icon ion-android-checkbox-blank";
            //console.log(vm.reg.userAgreed, vm.agreeButtonCls);
        };

        vm.usernameChange = function (uname) {
            //vm.unameStash = vm.user.username;
            //console.log(vm.unameStash);
        }

    vm.checkUsername = function () {
      if (vm.reg.username && vm.reg.username.length > 3) {
        vm.usernameChecked = true;
        if (vm.reg.username.indexOf("@") > 0) {
          dataApi.usernameOK(vm.reg.username).then(function (data) {
            vm.usernameOK = data;
          });
        }
        else vm.usernameOK = false;

      }
      else vm.usernameChecked = false;
    };

    vm.checkSitename = function () {
     if (vm.reg.sitename && vm.reg.sitename.length > 0) {
       vm.sitenameChecked = true;

        if (vm.reg.sitename.length > 2) {
          dataApi.dbnameOK(vm.reg.sitename).then(function (data) {
            vm.sitenameOK = data;
          });
        }
        else vm.sitenameOK = false;

      }
      else vm.sitenameChecked = false;
    };

        //#region UI
        vm.toggleViews = function () {
            if (vm.showRegister) {
                vm.showRegister = false;
                vm.cardHeaderClasses = "item item-divider item-positive";
                vm.footerButtonText = vm.strings.signUpNew;
                vm.footerButtonClasses = "button button-balanced";
            }
            else {
                vm.showRegister = true;
                vm.cardHeaderClasses = "item item-divider ok-confirm";
                vm.footerButtonText = vm.strings.loginRet;
                vm.footerButtonClasses = "button button-positive";
            }
            vm.showLogin = !vm.showRegister;
        }
        vm.showSection = function (section) {
            vm.showRegister = (section == 'register');
            vm.showPWReset = (section == 'pwreset');
            vm.showLogin = (section == 'login');

        }
          //#endregion

        //#region Registration
        vm.pwChange = function () {

            vm.regPwClasses = "";
            var isGood = dataApi.goodPassword(vm.reg.password);

            vm.regPwClasses = (isGood) ? "bgBalanced" : "bgAssertive";
        }

        vm.pwBlur = function () {
            vm.showPWHelp = false;
        }
        vm.pwFocus = function () {
            vm.showPWHelp = true;
        }
        //#endregion

        vm.requestReset = function () {
            if (!vm.user.username || vm.user.username.trim() == "") {
                var alertPopup = $ionicPopup.alert({
                    title: 'Missing Username',
                    template: 'Please enter your username, which must be an email address.'
                });
                alertPopup.then(function (res) {
                    //nothing
                });
            }
            else if (!IsValidInput(vm.user.username, "email")) {
                var alertPopup = $ionicPopup.alert({
                    title: 'Invalid Email Address',
                    template: 'Your username must be a valid email address.'
                });
                alertPopup.then(function (res) {
                });
            }
            else {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Reset Password',
                    template: "This will reset your password by sending a verification code to the email address on record for this username.  "
                        + " <br /><br />Are you ready to reset the password for " + vm.user.username + "?"
                });
                confirmPopup.then(function (res) {
                    if (res) {
                        var apiUrl = vm.dsSelected.apiUrl + "requestPWReset?username=" + vm.user.username;
                        var result = $http({
                            method: "GET",
                            url: apiUrl,
                            contentType: "application/json"
                        })
                            .success(function (data) {
                                var alertPopup1 = $ionicPopup.alert({
                                    title: 'Password Reset requested',
                                    template: "Please check your email for instructions and a validation code. You'll need to enter that code along with your new password within 1 hour. "
                                });
                                alertPopup1.then(function (res) {
                                    vm.showSection('pwreset');
                                });
                            })
                            .error(function (data) {
                                var alertPopup1 = $ionicPopup.alert({
                                    title: 'Reset Request Failed',
                                    //template: data
                                });
                                console.error(data)
                                alertPopup1.then(function (res) {
                                });
                            });
                    }
                });
            }
        }


        vm.resetPW = function () {

            var loginUrl = vm.dsSelected.apiUrl + "ResetPassword" ;
            var postdata = vm.resetpw;
            var result = $http({
                method: "POST",
                url: loginUrl,
                contentType: "application/json",
                data: angular.toJson(postdata)
            })
                .success(function (data) {
                    var alertPopup1 = $ionicPopup.alert({
                        title: 'Password Reset Success',
                        template: 'You may now login with your new password.'
                    });
                    alertPopup1.then(function (res) {
                        dataApi.clearCache();
                        dataApi.refreshAppUser();
                        dataApi.logout();
                        vm.showSection('login');
                    });
                })
                .error(function (data) {
                    var msg = "";
                    if (data.message) msg = data.message;
                    else msg = data;

                    var alertPopup1 = $ionicPopup.alert({
                        title: 'Password Reset Failed',
                        template: "Error: " + msg
                    });
                    //console.log(data)
                    alertPopup1.then(function (res) {
                    });
                });
        }

        vm.login = function () {
            var s = "";
            if (vm.user.username == "") s += "Please provide your username.<br />";
            if (vm.user.password == "") s += "Please provide your password.<br />";
            if (!vm.dsSelected) s += "Please select a data source.<br />";
            if (s != "") {
                var alertPopup = $ionicPopup.alert({
                    title: 'Unable to Login',
                    template: s
                });
                alertPopup.then(function (res) {
                });
            }
            else {
                vm.showSpinner = true;
                var loginUrl = vm.dsSelected.apiUrl + "login";
                //rehydrate username?
                if ((!vm.user.username || vm.user.username == "") && vm.unameStash && vm.unameStash != "") vm.user.username = vm.unameStash;

                //console.log(vm.user);
                var result = $http({
                    method: "POST",
                    url: loginUrl,
                    contentType: "application/json",
                    data: angular.toJson(vm.user)
                })
                    .success(function (data) {
                        var token = data.replace(/\"/g, "");
                        localStorage.setItem("appAuthToken", token);
                        localStorage.setItem("username", vm.user.username);
                        localStorage.setItem("rememberMe", vm.user.rememberMe);
                        dataApi.clearCache();
                        $rootScope.$broadcast("RefreshMain");
                        vm.showSpinner = false;
                        dataApi.setDS(vm.dsSelected);
                        $state.go("home.main");
                    })
                    .error(function (data) {
                        var s = "";
                        vm.showSpinner = false;
                        //internet?  server down?
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
        };

        vm.register = function () {
            var s = "";
            if (vm.reg.firstname == "") s += "Please provide your first name.\r\n";
            if (vm.reg.lastname == "") s += "Please provide your last name.\r\n";
            if (vm.reg.username == "") s += "Please provide a username.\r\n";
          if (!dataApi.goodPassword(vm.reg.password)) s += "Password is not strong enough.\r\n";
          if (!vm.newSite || !vm.sitenameOK) vm.reg.sitename = "";

            if (s != "") $window.alert(s);
                //else vm.openModal();
            else vm.continue();
        };

        vm.dsChange = function () {
            dataApi.setDS(vm.dsSelected);

        };

        $ionicModal.fromTemplateUrl('userAgreeModal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            vm.modal = modal;
        });

        vm.openModal = function () {
            vm.modal.show();
        };

        vm.closeModal = function () {
            vm.modal.hide();
        };

        // Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            vm.modal.remove();
        });

        vm.continue = function () {
            //vm.closeModal();
            vm.showSpinner = true;
            try {
                //console.log(vm.reg, $scope);
                dataApi.setDS(vm.dsSelected);
                dataApi.register(vm.reg).then(function (data) {
                    // $window.alert("Registration Successful.  ")
                    var alertPopup = $ionicPopup.alert({
                        title: 'Success',
                        template: 'You are registered and may login now. <br /><br />Please check your email for welcome information.'
                    });
                    alertPopup.then(function (res) {
                        vm.user.username = vm.reg.username;
                        vm.user.password = vm.reg.password;
                        //console.log(data);
                        vm.toggleViews();
                        vm.showSpinner = false;
                        vm.login();
                    });
                },
                function (err) {
                    var msg = "";
                    console.log(err);
                    if (err.message) msg = err.message;
                    else if (err) msg = err.toString();

                    var alertPopup = $ionicPopup.alert({
                        title: 'An Error Occurred.',
                        template: msg
                    });
                    alertPopup.then(function (res) {
                        vm.showSpinner = false;
                    });
                });
            }
            catch (e)
            {
                var alertPopup = $ionicPopup.alert({
                    title: 'An Error Occurred',
                    template: e
                });
                alertPopup.then(function (res) {
                    vm.showSpinner = false;
                });

            }
        }

        function GetDataSources() {
            vm.dataSources = dataApi.dataSources;
            if (vm.dataSources.length > 0) vm.dsSelected = vm.dataSources[0];

            for (var i = 0; i < vm.dataSources.length ; i++) {
                if (vm.dataSources[i].apiUrl == vm.apiUrl) {
                    vm.dsSelected = vm.dataSources[i];
                    break;
                }
            }
            vm.showSpinner = false;
        }



        if (!vm.dataSources) GetDataSources();

        vm.showSection('login');

    };
})();

