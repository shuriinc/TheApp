(function () {
    'use strict';
    angular.module("shuriApp").controller('Report1Ctrl', function ($scope, $state, $stateParams, $http, dataApi, appGlobals, globals) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.reportTitle = "Touches By Owner Report";
        vm.orderer = "-entities.length";

        vm.refreshData = function (qr) {
            //var d = angular.toJson($stateParams.qr);
            var d = angular.toJson(qr);
            var resurl = dataApi.currentDS().apiUrl + "ReportData";
            $http({
                method: 'POST',
                url: resurl,
                data: d,
                timeout: 600000,
                headers: { 'Content-Type': 'text/json' }
            })
                 .success(function (data) {
                     console.log(data);
                     vm.data = data.items;

                     //loadOwners();
                     vm.owners = [];
                     vm.data.forEach(function (entity) {
                         var found = false;
                         vm.owners.forEach(function (owner) {
                            // console.log(entity, owner);
                             if (owner.id == entity.ownedBy_Id) found = true;
                         });
                         if (!found) vm.owners.push({ id: entity.ownedBy_Id, name: entity.ownedByName, entities: [] });
                     })

                     //loadTouches
                     vm.data.forEach(function (entity) {
                         vm.owners.forEach(function (owner) {
                             if (owner.id === entity.ownedBy_Id) owner.entities.push(entity);
                         });
                     });

                     //console.log(vm.owners);


                 })
                 .error(function (data, status, headers, config) {
                     console.error(data, status, headers, config);
                 });
         //   globals.sendAppView('report1', vm.queryRequest.entityType, vm.user.id);
        };

        function loadOwners() {
            vm.owners = [];
            vm.data.forEach(function (entity) {
                var found = false;
                vm.owners.forEach(function (owner) {
                    //console.log(entity, owner);
                    if (owner.id == entity.ownedBy_Id) found = true;
                });
                if (!found) vm.owners.push({ id: entity.ownedBy_Id, name: entity.ownedByName });
            })

        }


        vm.cancel = function () {
            goBack();
        }

        function goBack() {
            $ionicHistory.goBack();

        }

 
        $scope.$on('$ionicView.enter', function () {

            if (!vm.queryRequest) {
                if (appGlobals.currentQR) {
                    vm.queryRequest = appGlobals.currentQR;
                    vm.queryRequest.page = 1;
                    vm.queryRequest.pageSize = 50000;

                }
                else globals.showAlert("Missing query", "This page can't be refreshed.  Go Back and refresh there.");
            }

            vm.refreshData(vm.queryRequest);
        });


    });
})();


(function () {
    'use strict';

    angular.module("shuriApp").controller('MasterReportCtrl', ['$scope', '$rootScope', '$state', '$http', '$document', 'dataApi', 'globals', 'appGlobals', MasterReportCtrl]);

    function MasterReportCtrl($scope, $rootScope, $state, $http, $document, dataApi, globals, appGlobals) {
        var vmMaster = this;
        if (!window.cordova) vmMaster.cssClass = 'on-desktop';

        //#region Event handlers

        vmMaster.goBack = function (step) {
            $ionicHistory.goBack(step);
        };

        vmMaster.wordFor = function (word) { return globals.wordFor(word); };


        function AssignUI() {
            var state = $state.current;

            vmMaster.isWide = (window.innerWidth >= appGlobals.widthMedium);
            vmMaster.isSmall = (window.innerWidth <= appGlobals.widthSmall);
            vmMaster.isMedium = (!vmMaster.isWide && !vmMaster.isSmall);
            vmMaster.onDesktop = !(window.cordova);
            //console.log(vmMaster.isWide, vmMaster.isMedium, vmMaster.isSmall);

            if (window.cordova) vmMaster.cssClass = '';
                //so developers can use device mode - comment out when finished
                //else if (document.location.href.toLowerCase().indexOf("local") >= 0) vmMaster.cssClass = '';
            else if (localStorage.getItem(appGlobals.keys.deviceMode)) vmMaster.cssClass = '';
            else if (vmMaster.expandUI) vmMaster.cssClass = 'full-screen';
            else vmMaster.cssClass = 'on-desktop';


            vmMaster.showBackbutton = false;


        };



        vmMaster.pdf = function () {
            //console.log(document.documentElement.innerHTML);
            var ele = document.documentElement;
            //var text = ele[0].innerHTML
            //dataApi.postFile(text, filename, contentType, collectionId, usertype_Id)

            //var obj = { html : encodeURI() };
            var d = angular.toJson(ele.innerHTML);
            //console.log(d);
            var resurl = dataApi.currentDS().apiUrl + "PDFFromString";
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
        }
    }
})();


