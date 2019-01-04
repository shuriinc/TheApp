(function () {
    'use strict';

    angular.module("shuriApp").controller('TweetCtrl', ['$scope', '$state', '$stateParams', '$filter', 'globals', 'dataApi', 'appGlobals', TweetCtrl]);

    function TweetCtrl($scope, $state, $stateParams, $filter, globals, dataApi, appGlobals) {
        var vm = this;
        vm.elapsedTime = 0;
        vm.timerStarted = false;
        vm.attributeName = "Name";
        vm.attributeDesc = "Description";
        vm.attachmentType = "";
        vm.tweetChars = 0;
        vm.maxTweetChars = 140;
        vm.files = [];

        vm.wordFor = function (word) { return globals.wordFor(word); }

        vm.touchDisplay = function (input) {

                vm.utConstants = appGlobals.utConstants;

                var displayChange = {
                    email: function () {
                        vm.attributeName = "Subject";
                        vm.attributeDesc = "Body";
                        vm.twitterPost = false;
                        vm.emailTracked = true;
                        vm.attachment = true;
                        vm.emailTouch = true;
                        vm.attachmentType = "emailBody"
                    },
                    twitter: function () {
                        vm.attributeName = "Twitter Screenname";
                        vm.attributeDesc = "Tweet";
                        vm.emailTouch = false;
                        vm.twitterPost = false;
                        vm.emailTracked = false;
                        vm.attachment = false;
                        vm.attachmentType = ""
                    },
                    standard: function () {
                        vm.attributeName = "Name";
                        vm.attributeDesc = "Description";
                        vm.emailTouch = false;
                        vm.twitterPost = false;
                        vm.emailTracked = false;
                        vm.attachment = false;
                        vm.attachmentType = ""
                    }

                }

                switch (input) {
                    case vm.utConstants.tch_email:
                        //Email
                        displayChange.email();
                        vm.emailTracked = false;
                        break;
                    case vm.utConstants.tch_emailTracked:
                        //Email Tracked
                        displayChange.email();
                        break;
                    case vm.utConstants.tch_twitter:
                        //Twitter
                        displayChange.twitter();
                        break;
                    default:
                        vm.emailTouch = false;
                        vm.timerDisplay = false;
                        vm.emailTracked = false;
                        displayChange.standard();
                }

                vm.timerReset = function () {
                    $interval.cancel(interval);
                    vm.elapsedTime = 0;
                    vm.duration = vm.elapsedTime;
                    vm.action = "Start";
                    vm.timerStarted = false
                };

                if (input != vm.utConstants.tch_meetingTimed) {
                    vm.timerDisplay = false;
                    vm.timerReset();
                } else {
                    displayChange.standard();
                    vm.timerDisplay = true;

                    var interval, incrementTimer, actions;

                    incrementTimer = function () {
                        vm.elapsedTime += 1;
                        vm.duration = vm.elapsedTime;
                    };

                    vm.timerToggle = function (action) {
                        vm.action = action
                        console.log('1here', vm.action);
                        if (vm.action === "Start") {
                            vm.action = "Stop"
                            interval = $interval(incrementTimer, 1000);
                        } else if (vm.action === "Stop") {
                            vm.action = "Start";
                            $interval.cancel(interval);
                        }
                    };

                    if (vm.touch.documents[0].value === "") {
                        vm.timerReset();
                    }
                }
                // Twitter Aware Logic
                if (input == vm.utConstants.tch_twitter) {
                    vm.twitterPost = true;
                    var safeCharLimit = '';
                    vm.checkCharLength = function () {
                        if (vm.touch.description.length <= 140) {
                            safeCharLimit = vm.touch.description;
                            if (vm.touch.description.length > 100) {
                                vm.twitterLimitWarning = 'red-warning';
                            }
                            else {
                                vm.twitterLimitWarning = null;
                            }
                        }
                        else {
                            vm.touch.description = safeCharLimit;
                        }
                        vm.tweetChars = vm.touch.description.length;
                    }
                }
        }


        vm.refreshData = function () {
            vm.showTouch = false;

            dataApi.getTouch($stateParams.id).then(function (data) {
                vm.touch = data;
                console.log(data);
                //documents
                    vm.utConstants = appGlobals.utConstants;
                    for (var i = 0; i < vm.touch.documents.length; i++) {
                        if (vm.touch.documents[i].id != appGlobals.guidEmpty) {
                            switch (vm.touch.documents[i].userType_Id) {
                                case vm.utConstants.doc_photo:
                                    vm.anyPhotos = true;
                                    break;
                                case vm.utConstants.doc_photo:
                                    vm.anyPhotos = true;
                                    break;
                                case vm.utConstants.doc_duration:
                                    vm.elapsedTime = parseInt(vm.touch.documents[i].value);
                                    vm.timerDisplay = true;
                                    break;
                                case vm.utConstants.doc_file:
                                    var fileName = vm.touch.documents[i].name.split("/");
                                    var fileExt = vm.touch.documents[i].name.split(".");
                                    fileExt = fileExt[fileExt.length - 1];
                                    vm.touch.documents[i].name = fileName[fileName.length - 1];
                                    vm.anyFiles = true;
                                    break;
                            }
                        }
                    }

                    assignUI();
                    vm.showTouch = true;


            });

        }

        function assignUI() {

            //dates
            vm.dateStart = $filter('date')(new Date(vm.touch.dateStart), 'shortDate');

            if (vm.touch.dateSchedule) {
              vm.touch.dateSchedule = new Date(vm.touch.dateSchedule);
              if (vm.touch.dateSent) {
                vm.touch.dateSent = new Date(vm.touch.dateSent);
              }
              vm.scheduled = true;
            }

            if (vm.touch.primitive === shuri_enums.touchprimitive.timedmeeting || vm.touch.primitive === shuri_enums.touchprimitive.event) {
              vm.dateTrack = true;
              vm.touch.dateStart = new Date(vm.touch.dateStart);
              vm.touch.dateEnd = new Date(vm.touch.dateEnd);
            }

            //location
            vm.hasLocation = (vm.touch.location_Id && vm.touch.location_Id != appGlobals.guidEmpty);
            if (vm.hasLocation) {
                dataApi.getLocation(vm.touch.location_Id).then(function (data) {
                    vm.location = data;
                    vm.locAddress = vm.location.address;
                });
            }


        }

        vm.edit = function () {
            $state.go('home.touchEdit', { id: vm.touch.id });
        }




        //#region Approvals
        vm.utsMayBeApproved = [];
        vm.docIdObjApprove = appGlobals.guidEmpty;
        vm.objApprove = {
            teamId: appGlobals.guidEmpty,
            isApproved: false,
            approvedBy: '',
            required: false
        }

        vm.setApproval = function () {
            vm.showApproval = false;
            for (var i = 0; i < vm.utsMayBeApproved.length; i++) {
                if (vm.utsMayBeApproved[i] === vm.touch.userType_Id) {
                    vm.showApproval = true;
                    break;
                }
            }


        }

        vm.setApprovalPermission = function (makedirty) {
            vm.mayApprove = false;
            if (vm.showApproval && vm.objApprove.teamId && vm.objApprove.teamId != appGlobals.guidEmpty) {
                dataApi.isUserInTeam(vm.objApprove.teamId).then(function (data) {
                    vm.mayApprove = (data.toLowerCase() === "true");
                    if (makedirty) vm.isDirty = true;
                });

            }

        }

        //#endregion

        $scope.$on('$ionicView.enter', function () {
            vm.refreshData();
        });

        $scope.$on('$ionicView.afterEnter', function () {
			console.log("what what!");
			twttr.widgets.createTweet('463440424141459456', document.getElementById('fulltweetcontainer')).then(
				function (element) {
					console.log("after made tweet");
				}
			);
        });



    };
    //#endregion
})();
