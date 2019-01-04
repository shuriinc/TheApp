(function () {
  'use strict';
  angular.module("shuriApp").directive('filesModel', ['$parse', function ($parse) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        var model = $parse(attrs.filesModel);
        var modelSetter = model.assign;

        element.bind('change', function () {
          vm.$apply(function () {
            modelSetter(scope, element[0].files);
          });
        });
      }
    };
  }]);
})();


(function () {
    'use strict';
    angular.module("shuriApp").directive('adminBar', ['$state', '$ionicPopup', 'globals', 'dataApi',
function ($state, $ionicPopup, globals, dataApi) {
    return {
        restrict: "E",
        scope: {
            entity: '=',
            entitytype: '@'
        },
        templateUrl: "templates/directives/adminBar.html?" + _cacheBuster,
        link: function (scope, element, attrs) {

            scope.wordFor = function (word) { return globals.wordFor(word); };
            var watcherE = scope.$watch('entity', function () {
                if (scope.entity === undefined) return;

                // delete watcher if appropriate
                watcherE();
            });

            var watcherT = scope.$watch('entitytype', function () {
                if (scope.entitytype === undefined) return;
                scope.entitytype = scope.entitytype.toLowerCase();

                scope.showAddExpert = (scope.entitytype == 'organization' || scope.entitytype == 'person')
                scope.showAddUpdate = (scope.entitytype == 'organization')
                //console.log(scope.showAddExpert);
            });

            scope.addToExpert = function (includePeople) {
                if (scope.showAddExpert) {
                    var ss = "";

                    if (scope.entitytype == 'organization' && includePeople) ss = "and all it's people ";

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Add To Expert Queue',
                        template: "Add this " + scope.entitytype + " " + ss + "to the Expert Queue?"
                    });
                    confirmPopup.then(function (res) {
                        if (res) {

                            if (scope.entitytype == 'organization') {
                                dataApi.requestExpertOrg(scope.entity.id, includePeople).then(function (data) {
                                    //console.log(data);
                                    if (data === true) globals.showAlert("Added OK");
                                    else globals.showAlert("Request failed");
                                });
                            }
                        }
                    });
                }


            }

            scope.addUpdate = function (includePeople) {
                if (scope.showAddUpdate) {
                    var tt = "Add OrgUpdate to Workers Queue"
                    var ss = "";

                    if (scope.entitytype == 'organization' && includePeople) ss = ", along with PersonUpdates for all it's people, ";

                    var confirmPopup = $ionicPopup.confirm({
                        title: tt,
                        template: "Add an OrgUpdate for  " + scope.entity.name + " " + ss + " to the Workers Queue?"
                    });
                    confirmPopup.then(function (res) {
                        if (res) {

                            if (scope.entitytype == 'organization') {
                                dataApi.requestOrgUpdate(scope.entity.id, includePeople).then(function (data) {
                                    //console.log(data);
                                    if (data === true) globals.showAlert("Success", "Added OK");
                                    else globals.showAlert("Request failed", "");
                                });
                            }
                        }
                    });
                }


            }


            scope.editEntity = function () {
                if (scope.entitytype == "organization") {
                    dataApi.requestOrgUpdate(scope.entity.id).then(function (data) {
                        globals.showAlert(scope.entity.name, "An OrgUpdate has been requested.");
                    });
                }
                else {
                    //globals.showAlert('TODO', 'Implement editing.');
                }
            }

        }
    };
}]);

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('changeText', function () {
        return {
            scope: {
                entity: '=',
            },
            link: function (scope, element, attrs) {
                element.bind('keyup', function () {
                    scope.entity = element[0].value
                })
            }
        }
    });


})();

(function () {
    'use strict';
    angular.module('shuriApp').directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });
})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('ngModel', function ($filter) {
        return {
            require: '?ngModel',
            link: function (scope, elem, attr, ngModel) {
                if (!ngModel)
                    return;
                if (attr.type !== 'time')
                    return;

                ngModel.$formatters.unshift(function (value) {
                    return value.replace(/:00\.000$/, '')
                });
            }
        }
    });

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('clickOnce', ['$timeout',
         function ($timeout) {
             var delay = 1000;
             return {
                 restrict: 'A',
                 priority: -1,
                 link: function (scope, elem) {
                     var disabled = false;
                     function onClick(evt) {
                         if (disabled) {
                             evt.preventDefault();
                             evt.stopImmediatePropagation();
                         } else {
                             disabled = true;
                             $timeout(function () { disabled = false; }, delay, false);
                         }
                     }

                     scope.$on('$destroy', function () { elem.off('click', onClick); });
                     elem.on('click', onClick);
                 }
             };
         }]);

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('groupedRadio', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: {
                model: '=ngModel',
                value: '=groupedRadio'
            },
            link: function (scope, element, attrs, ngModelCtrl) {
                element.addClass('button');
                element.on('click', function (e) {
                    scope.$apply(function () {
                        ngModelCtrl.$setViewValue(scope.value);
                    });
                });

                scope.$watch('model', function (newVal) {
                    element.removeClass('button-dark');
                    if (newVal === scope.value) {
                        element.addClass('button-dark');
                    }
                });
            }
        };
    });

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('legalItem', ['globals',
         function (globals) {
             return {
                 restrict: "E",
                 scope: {
                 },
                 templateUrl: "templates/directives/legalItem.html?" + _cacheBuster,
                 link: function (scope, element, attrs) {
                     scope.wordFor = function (word) { return globals.wordFor(word); };

                 }
             };
         }]);

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('licenseStatus', ['$rootScope', '$state', '$filter', 'globals', 'dataApi',
         function ($rootScope, $state, $filter, globals, dataApi) {
             return {
                 restrict: "E",
                 scope: {
                     alertOnly: '@',
                     appUser: "="
                 },
                 templateUrl: "templates/directives/licenseStatus.html?" + _cacheBuster,
                 link: function (scope, element, attrs) {
                     scope.wordFor = function (word) { return globals.wordFor(word); };
                     scope.enums = shuri_enums;
                     scope.openDiv = true;
                     scope.gotoManageSubs = function () {
                         $state.go("home.inappPurchases");
                     }
                     scope.toggleDiv = function () { scope.openDiv = !scope.openDiv; }

                     var watcherI = scope.$watch('appUser', function () {
                         if (scope.appUser === undefined) return;
                         refreshData();
                         //watcherI();
                     });

                     function refreshData() {

                         scope.statusMsg = "";
                         scope.alert = scope.appUser.licenseStatus;

                         switch (scope.appUser.licenseLevel) {
                             case shuri_enums.licenselevel.free:
                                 scope.licenseName = "Free ";
                                 break;
                             case shuri_enums.licenselevel.professional:
                                 scope.licenseName = "Professional ";
                                 break;
                             case shuri_enums.licenselevel.enterprise:
                                 scope.licenseName = "Enterprise ";
                                 break;
                             default:
                                 scope.licenseName = "Unknown ";
                                 break;
                         }

                         var totWidth = parseInt(window.innerWidth);
                         scope.totalItems = scope.appUser.ownedPeople + scope.appUser.ownedOrgs + scope.appUser.ownedTouches;
                         scope.consumed = (scope.totalItems / scope.appUser.licensedItems) * 100;
                         scope.allowedItems = scope.appUser.licensedItems;
                         scope.peopleWidth = parseInt((scope.appUser.ownedPeople / scope.appUser.licensedItems) * totWidth);
                         scope.orgsWidth = parseInt((scope.appUser.ownedOrgs / scope.appUser.licensedItems) * totWidth);
                         scope.touchesWidth = parseInt((scope.appUser.ownedTouches / scope.appUser.licensedItems) * totWidth);
                         scope.unusedWidth = totWidth - (scope.peopleWidth + scope.orgsWidth + scope.touchesWidth);
                         scope.unusedPct = parseInt((1 - (scope.consumed / 100)) * 100) + "% available";

                         if (scope.appUser.licenseStatus > 0) {
                             //if (scope.appUser.licenseStatus == 1) {
                             //  var dtStr = $filter('date')(SQLDate2JS(scope.appUser.licenseGraceDate), 'shortDate');
                             scope.statusMsg += String.format("Your <span class='stable'>{1}</span> license allows you to own <span class='stable'>{2}</span> people, organization, and/or touches. "
                                 + "You now own <span class='stable'>{0}</span>. <br /><br /> "
                                 + "Please <span class='stable'>upgrade</span> or reduce the number of items you own."
                                 , $filter("number")(scope.totalItems), scope.licenseName, $filter("number")(scope.allowedItems));
                             scope.iconClass = "energized";
                             scope.btnClass = "button-energized";
                             //}
                             //else {
                             //    scope.statusClass = "item-assertive";
                             //    scope.statusClassBg = "bgAssertiveLight";
                             //    scope.statusMsg += "You should upgrade now.";

                             //}

                         };

                     }
                 }
             }
         }]);

})();

(function () {
    'use strict';
    angular.module("shuriApp")
    .directive('ebCaret', function () {
    })

})();

// (function () {
//     'use strict';
//     angular.module("shuriApp").directive('myText', ['$rootScope', function($rootScope) {
//       return {
//         link: function(scope, element, attrs) {
//           $rootScope.$on('add', function(e, val) {
//             var domElement = element[0];
//
//             if (document.selection) {
//               domElement.focus();
//               var sel = document.selection.createRange();
//               sel.text = val;
//               domElement.focus();
//             } else if (domElement.selectionStart || domElement.selectionStart === 0) {
//               var startPos = domElement.selectionStart;
//               var endPos = domElement.selectionEnd;
//               var scrollTop = domElement.scrollTop;
//               domElement.value = domElement.value.substring(0, startPos) + val + domElement.value.substring(endPos, domElement.value.length);
//               domElement.focus();
//               domElement.selectionStart = startPos + val.length;
//               domElement.selectionEnd = startPos + val.length;
//               domElement.scrollTop = scrollTop;
//             } else {
//               domElement.value += val;
//               domElement.focus();
//             }
//
//           });
//         }
//         }
//       }])
// }])

// })();

(function () {
    'use strict';
    angular.module("shuriApp").directive('listFooter', ['globals', 'appGlobals', 'dataApi',
     function (globals, appGlobals, dataApi) {
         return {
             restrict: "E",
             scope: {
             },
             templateUrl: "templates/directives/listFooter.html?" + _cacheBuster,
             link: function (scope, element, attrs) {
                 var url = "https://shuristoragecdn.blob.core.windows.net/images/chatTrans250.png";

                 var height = 360;
                     //if (window.innerWidth <= appGlobals.widthSmall) {
                     //    height = 200;
                     //    url = "https://shuristoragecdn.blob.core.windows.net/images/chatTrans100.png";
                     //}
                     //else if (window.innerWidth >= appGlobals.widthMedium) height = 480;

                     scope.styleString = String.format("height:{0}px !important; background-image: url('{1}'); background-repeat: no-repeat; background-position:center; opacity: 0.08;"
                         , height, url);

                 //dataApi.initialize().then(function (data) {
                 //});
                 ////console.log(window.innerWidth,height);

             }
         };
     }]);

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('resizeImg', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind("load", function (e) {
                    var maxWidthAbs = 320;
                    var maxHeightAbs = 320;

                    var maxWidth = parseInt(window.innerWidth / 1.5);
                    var maxHeight = parseInt(window.innerHeight / 2.5);
                    var imgWidth = parseInt(element[0].naturalWidth);
                    var imgHeight = parseInt(element[0].naturalHeight);

                    //determine if absolute max sizes come into play on large device
                    if (maxWidth > maxWidthAbs) maxWidth = maxWidthAbs;
                    if (maxHeight > maxHeightAbs) maxHeight = maxHeightAbs;


                    var newWidth = imgWidth;
                    var newHeight = imgHeight;
                    var ratio = 1;

                    //both sizes are beyond max
                    if (imgWidth >= maxWidth && imgHeight >= maxHeight) {
                        //portrait?
                        if (imgHeight > imgWidth) ratio = maxHeight / imgHeight;
                        else ratio = maxWidth / imgWidth;

                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio) - 20;
                        //console.log(newWidth);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                        //too wide
                    else if (imgWidth >= parseInt(window.innerWidth)) {
                        ratio = (window.innerWidth - 24) / imgWidth;
                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio) - 20;
                        //console.log(newWidth);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                        //too tall
                    else if (imgHeight >= (parseInt(window.innerHeight) / 2)) {
                        ratio = (window.innerHeight - 12) / imgHeight;
                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                    element[0].width = newWidth;
                    element[0].height = newHeight;
                    scope.resized = true;
                    //console.log(imgWidth, imgHeight, window.innerWidth, window.innerHeight, newWidth, newHeight, maxWidth, maxHeight);

                    scope.$apply();

                });
            }
        };
    });

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('resizeFull', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind("load", function (e) {
                    //var maxWidth = parseInt(window.innerWidth / 1.1);
                    //var maxHeight = parseInt(window.innerHeight / 1.1);
                    var maxWidth = window.innerWidth;
                    var maxHeight = window.innerHeight;
                    var imgWidth = parseInt(element[0].naturalWidth);
                    var imgHeight = parseInt(element[0].naturalHeight);
                    var newWidth = imgWidth;
                    var newHeight = imgHeight;
                    var ratio = 1;

                    //both sizes are beyond max
                    if (imgWidth >= maxWidth && imgHeight >= maxHeight) {
                        //portrait?
                        if (imgHeight > imgWidth) ratio = maxHeight / imgHeight;
                        else ratio = maxWidth / imgWidth;

                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio) - 20;
                        //console.log(newWidth);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                        //too wide
                    else if (imgWidth >= parseInt(window.innerWidth)) {
                        ratio = (window.innerWidth - 24) / imgWidth;
                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio) - 20;
                        //console.log(newWidth);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                        //too tall
                    else if (imgHeight >= (parseInt(window.innerHeight) / 2)) {
                        ratio = (window.innerHeight - 12) / imgHeight;
                        newWidth = parseInt(parseInt(element[0].naturalWidth) * ratio);
                        newHeight = parseInt(parseInt(element[0].naturalHeight) * ratio);
                    }
                    element[0].width = newWidth;
                    element[0].height = newHeight;

                });
            }
        };
    });

})();

//(function () {
//    'use strict';
//    angular.module("shuriApp").directive('reportList', function (dataApi) {
//        return {
//            restrict: 'E',
//            templateUrl: "templates/directives/reportList.html",
//            link: function (scope, element, attrs) {
//                scope.showWorkerPerformance = false;

//                scope.refresh = function () {
//                    dataApi.getAppUser().then(function (data) {
//                        scope.appUser = data;
//                        scope.showWorkerPerformance = (scope.appUser.isReviewer || scope.appUser.isSysAdmin);
//                        //console.log(scope.appUser)
//                    });
//                }

//                scope.$on('scroll.refreshComplete', function () {
//                    scope.refresh();
//                });


//            }
//        };
//    });

//})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('selectOnClick', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.on('click', function () {
                    element[0].select();
                });
            }
        };
    }]);

})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('uploadFiles', ['globals',
     function (globals) {
         var directive = {
             link: link,
             restrict: 'A',
             scope: {
                 files: '=uploadFiles',
                 //hasFiles: '=',
                 //manageUpdates: '=',
                 //entityType: '='
             }
         };
         return directive;

         function link(scope, element, attrs) {
             element.bind('change', function () {
                 scope.$apply(function () {
                     if (element[0].files) {
                         scope.files = [];
                         angular.forEach(element[0].files, function (f) {
                             scope.files.push(f);
                         });
                         //console.log(scope);
                         if (scope.$parent.uploadFiles) scope.$parent.uploadFiles(scope.files);
                         else if (scope.$parent.$parent.uploadFiles) scope.$parent.$parent.uploadFiles(scope.files);

                         //try { scope.hasFiles = true; }
                         //catch (e) { }
                     }
                 });
             });

             //  if (element[0].form) {
             //      angular.element(element[0].form)
             //              .bind('reset', function () {
             //                  scope.$apply(function () {
             //                      scope.files.length = 0;
             //                      scope.hasFiles = false;
             //                  });
             //              });
             //  }
         }
     }]);


})();


//(function () {
//    'use strict';
//    angular.module("shuriApp").directive('uploadBody', ['globals',
//     function (globals) {
//         var directive = {
//             link: link,
//             restrict: 'A',
//             scope: {
//                 files: '=uploadFiles',
//                 hasFiles: '=',
//                 manageUpdates: '=',
//                 entityType: '='
//             }
//         };
//         return directive;

//         function link(scope, element, attrs) {
//             element.bind('change', function () {
//                 scope.$apply(function () {
//                     if (element[0].files) {
//                         scope.files = [];
//                         angular.forEach(element[0].files, function (f) {
//                             scope.files.push(f);
//                         });
//                         scope.$parent.vm.sendFiles(scope.files)
//                         scope.hasFiles = true;
//                     }
//                 });
//             });

//             //  if (element[0].form) {
//             //      angular.element(element[0].form)
//             //              .bind('reset', function () {
//             //                  scope.$apply(function () {
//             //                      scope.files.length = 0;
//             //                      scope.hasFiles = false;
//             //                  });
//             //              });
//             //  }
//         }
//     }]);


//})();

(function () {
    'use strict';
    angular.module("shuriApp").directive('sspinner', ['globals',
 function (globals) {
     return {
         restrict: "E",
         scope: {
             padding: '@',
             text: '@',
             runsLong: '='
         },
         templateUrl: "templates/directives/sspinner.html?" + _cacheBuster,
         link: function (scope, element, attrs) {
             scope.paddingTop = '120';
             scope.paddingBottom = '120';
             scope.spinnerText = 'Loading ...'

             var watcherT = scope.$watch('text', function () {
                 if (scope.text === undefined) return;
                 scope.spinnerText = scope.text;
             })

             var watcherP = scope.$watch('padding', function () {
                 if (scope.padding === undefined) return;
                 scope.paddingTop = scope.padding.replace('px', '');
                 scope.paddingBottom = scope.padding.replace('px', '');
             })



         }
     }
 }]);

})();

(function () {
    'use strict';

    angular.module('shuriApp').directive('ionAlphaScroll', ['$ionicScrollDelegate', '$location', '$timeout', '$document',
        function ($ionicScrollDelegate, $location, $timeout, $document) {
            return {
                require: '?ngModel',
                restrict: 'AE',
                replace: true,
                compile: function (tElement, tAttrs, tTransclude) {
                    var children = tElement.contents();
                    var template = angular.element([
                        '<ion-list class="ion_alpha_list_outer">',
                        '<ion-scroll delegate-handle="alphaScroll">',
                        '<div data-ng-repeat="(letter, items) in sorted_items" class="ion_alpha_list">',
                        '<ion-item class="item item-divider" id="index_{{letter}}">{{letter}}</ion-item>',
                        '<ion-item ng-repeat="item in items"></ion-item>',
                        '</div>',
                        '</ion-scroll>',
                        '<ul class="ion_alpha_sidebar">',
                        '<li ng-click="alphaScrollGoToList(\'index_{{letter}}\')" ng-repeat="letter in alphabet | orderBy: letter">{{ letter }}</li>',
                        '</ul>',
                        '</ion-list>'
                    ].join(''));

                    var headerHeight = $document[0].body.querySelector('.bar-header').offsetHeight;
                    var subHeaderHeight = tAttrs.subheader === "true" ? 44 : 0;
                    var tabHeight = $document[0].body.querySelector('.tab-nav') ? $document[0].body.querySelector('.tab-nav').offsetHeight : 0;
                    var windowHeight = window.innerHeight;

                    var contentHeight = windowHeight - headerHeight - subHeaderHeight - tabHeight;

                    angular.element(template.find('ion-item')[1]).append(children);
                    tElement.html('');
                    tElement.append(template);

                    tElement.find('ion-scroll').css({
                        "height": contentHeight + 'px'
                    });

                    return function (scope, element, attrs, ngModel) {
                        var count = 0;
                        var scrollContainer = element.find('ion-scroll');

                        var ionicScroll = scrollContainer.controller('$ionicScroll');

                        // do nothing if the model is not set
                        if (!ngModel || !ngModel.$modelValue) return;
                        console.log(ngModel);
                        ngModel.$render = function () {
                            console.log(ngModel);
                            scope.items = [];
                            scope.items = ngModel.$modelValue.slice(0);
                            var tmp = {};
                            for (var i = 0; i < scope.items.length; i++) {
                                var letter = scope.items[i][attrs.key].charAt(0);
                                if (tmp[letter] == undefined) {
                                    tmp[letter] = []
                                }
                                tmp[letter].push(scope.items[i]);
                            }
                            scope.alphabet = iterateAlphabet(tmp);
                            scope.sorted_items = tmp;

                            scope.alphaScrollGoToList = function (id) {
                                $location.hash(id);
                                $ionicScrollDelegate.$getByHandle('alphaScroll').anchorScroll();
                            }

                            //Create alphabet object
                            function iterateAlphabet(alphabet) {
                                var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                                if (Object.keys(alphabet).length != 0) {
                                    str = '';
                                    for (var i = 0; i < Object.keys(alphabet).length; i++) {
                                        str += Object.keys(alphabet)[i];
                                    }
                                }
                                var numbers = new Array();
                                for (var i = 0; i < str.length; i++) {
                                    var nextChar = str.charAt(i);
                                    numbers.push(nextChar);
                                }
                                return numbers;
                            }

                        };
                    }
                }
            };
        }
    ]);
})();
