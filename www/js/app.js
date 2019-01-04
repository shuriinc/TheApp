//var app = angular.module("shuriApp", ["ionic", "ngCordova", "AdalAngular"])
var app = angular.module("shuriApp", ["ionic", "ngCordova", "ionic-datepicker", "ui.tinymce", "ngtweet"])

  .config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider, $sceDelegateProvider, ionicDatePickerProvider /*, $cordovaInAppBrowserProvider*/) {
    var ver = "?ver=" + _appVersion;
    $stateProvider
      .state('home', { hideNavBack: true, url: "/home", templateUrl: "templates/master.html" + ver, abstract: true })
      .state('home.main', { hideNavBack: true, hasHelp: true, url: "/main:showGroupId", views: { "mainContent": { templateUrl: "templates/main.html" + ver } } })
      .state('login', { hideNavBack: true, url: "/login/:apiUrl", templateUrl: "templates/login.html" + ver })

      .state('home.queryPeople', { hasHelp: true, url: "/queryPeople", views: { "mainContent": { templateUrl: "templates/query/query.html" + ver } } })
      .state('home.queryOrgs', { hasHelp: true, url: "/queryOrgs", views: { "mainContent": { templateUrl: "templates/query/query.html" + ver } } })
      .state('home.queryTouches', { hasHelp: true, url: "/queryTouches", views: { "mainContent": { templateUrl: "templates/query/query.html" + ver } } })
      .state('home.queryTags', { hasHelp: true, url: "/queryTags", views: { "mainContent": { templateUrl: "templates/crud/tags.html" + ver } } })

      .state('home.person', { hasHelp: true, url: "/person/:personId", views: { "mainContent": { templateUrl: "templates/crud/person.html" + ver } } })
      .state('home.user', { hasHelp: true, url: "/user/:personId", views: { "mainContent": { templateUrl: "templates/crud/user.html" + ver } } })

      .state('home.groupEdit', { hasHelp: true, url: "/group/:id", views: { "mainContent": { templateUrl: "templates/crud/group.html" + ver } } })
      .state('home.org', { hasHelp: true, url: "/org/:groupId", views: { "mainContent": { templateUrl: "templates/crud/org.html" + ver } } })

      .state('home.touch', { hasHelp: true, url: "/touch/:id", views: { "mainContent": { templateUrl: "templates/crud/touch.html" + ver } } })

      .state('home.tag', { hasHelp: true, url: "/tag/:tagId,:open", views: { "mainContent": { templateUrl: "templates/crud/tag.html" + ver } } })
      .state('home.tags', { hasHelp: true, url: "/tags", views: { "mainContent": { templateUrl: "templates/crud/tags.html" + ver } } })

      //.state('home.userTypes', { url: "/usertypes/:collectionId", views: { "mainContent": { templateUrl: "templates/crud/userTypes.html" + ver } } })

      //.state('home.location', { url: "/location/:locationId,:entityId,:entityType", views: { "mainContent": { templateUrl: "templates/crud/location.html" + ver } } })

      .state('home.sysAdmin', { url: "/sysAdmin", views: { "mainContent": { templateUrl: "templates/crud/sysAdmin.html" + ver } } })
      .state('home.userAdmin', { url: "/userAdmin/:userId", views: { "mainContent": { templateUrl: "templates/userAdmin.html" + ver } } })

      .state('home.inappPurchases', { url: "/inappPurchases/:tab", views: { "mainContent": { templateUrl: "templates/inappPurchases.html" + ver } } })
      .state('home.account', { url: "/account/:section", views: { "mainContent": { templateUrl: "templates/account.html" + ver } } })
      .state('home.files', { url: "/files", views: { "mainContent": { templateUrl: "templates/crud/files.html" + ver } } })

      .state('home.import', { url: "/import", views: { "mainContent": { templateUrl: "templates/import.html" + ver } } })
      .state('home.tweet', { url: "/tweet/:id", views: { "mainContent": { templateUrl: "templates/crud/tweet.html" + ver } } })
      .state('home.requestTeam', { url: "/requestTeam", views: { "mainContent": { templateUrl: "templates/requestTeam.html" + ver } } })
      .state('home.quickStart', { url: "/quickStart/:teamId", views: { "mainContent": { templateUrl: "templates/quickStart.html" + ver } } })
      .state('home.filtersubs', { url: "/filtersubs", views: { "mainContent": { templateUrl: "templates/filterSubs.html" + ver } } })

      .state('home.customize', { hasHelp: true, url: "/customize/:collectionId", views: { "mainContent": { templateUrl: "templates/customize.html" + ver } } })
      .state('home.customEdit', { hideNavBack: true, hasHelp: true, url: "/customEdit/:utId,:collectionId,:utType", views: { "mainContent": { templateUrl: "templates/customEdit.html" + ver } } })
      .state('home.personality', { url: "/personality/:collectionId, :name", views: { "mainContent": { templateUrl: "templates/crud/personality.html" + ver } } })
      .state('home.importXls', { hideNavBack: true, hasHelp: true, url: "/importXls", views: { "mainContent": { templateUrl: "templates/crud/importXls.html" + ver } } })

      .state('home.orgEdit', { hideNavBack: true, hasHelp: true, url: "/orgEdit/:groupId,:collectionId,:returnState", views: { "mainContent": { templateUrl: "templates/crud/orgEdit.html" + ver } } })
      .state('home.personEdit', { hideNavBack: true, hasHelp: true, url: "/personEdit/:personId, :collectionId,:returnState", views: { "mainContent": { templateUrl: "templates/crud/personEdit.html" + ver } } })
      .state('home.contacts', { hideNavBack: true, hasHelp: true, url: "/contacts", views: { "mainContent": { templateUrl: "templates/crud/contacts.html" + ver } } })
      .state('home.touchEdit', { hideNavBack: true, hasHelp: true, url: "/touchEdit/:id,:entityId,:entityType,:grpType,:collectionId,:returnState,:randomizer", views: { "mainContent": { templateUrl: "templates/crud/touchEdit.html" + ver } } })
      .state('home.twitterUpload', { hideNavBack: true, hasHelp: true, url: "/twitterUpload", views: { "mainContent": { templateUrl: "templates/crud/twitterUpload.html" + ver } } })

      .state('edit', { hideNavBack: true, url: "/edit", templateUrl: "templates/masterEdit.html" + ver, abstract: true })
      .state('edit.pwChange', { hideNavBack: true, url: "/pwChange/:id,:name,:username", views: { "mainContent": { templateUrl: "templates/pwChange.html" + ver } } })
      .state('edit.promoteGroup', { hideNavBack: true, url: "/promoteGroup/:id", views: { "mainContent": { templateUrl: "templates/crud/promoteGroup.html" + ver } } })
      //.state('edit.userType', { hideNavBack: true, url: "/usertype/:utId,:collectionId,:entityType", views: { "mainContent": { templateUrl: "templates/crud/userType.html" + ver } } })
      .state('edit.tagEdit', { hideNavBack: true, url: "/tagEdit/:tagId,:userTypeId", views: { "mainContent": { templateUrl: "templates/crud/tagEdit.html" + ver } } })
      .state('edit.templateEdit', { hideNavBack: true, url: "/templateEdit/:docId,:showUpload", views: { "mainContent": { templateUrl: "templates/query/reportUpload.html" + ver } } })
      .state('edit.textarea', { hideNavBack: true, url: "/textarea/:entityId,:entityType,:label", views: { "mainContent": { templateUrl: "templates/crud/textarea.html" + ver } } })
      .state('edit.savedQueryEdit', { hideNavBack: true, url: "/savedQueryEdit/:doc", views: { "mainContent": { templateUrl: "templates/query/savedQueryEdit.html" + ver } } })
      .state('edit.facebookUpload', { hideNavBack: true, url: "/facebookUpload", views: { "mainContent": { templateUrl: "templates/crud/facebookUpload.html" + ver } } })
      .state('edit.linkedinUpload', { hideNavBack: true, url: "/linkedinUpload", views: { "mainContent": { templateUrl: "templates/crud/linkedinUpload.html" + ver } } })

      .state('home.debug', { url: "/debug", views: { "mainContent": { templateUrl: "templates/debug.html" + ver } } })

      .state('report', { url: "/report", templateUrl: "templates/reports/masterReport.html" + ver, abstract: true })
      .state('report.report1', { url: "/report1/:qr", views: { "mainContent": { templateUrl: "templates/reports/report1.html" + ver } } })

      .state('modal', { url: "/modal", templateUrl: "templates/modals/masterModal.html" + ver, abstract: true })
      .state('modal.permissions', { url: "/permissions/:entityId,:entityType", views: { "mainContent": { templateUrl: "templates/modals/permissions.html" + ver } } })
      .state('modal.newGroup', { url: "/newGroup/:grpType,:randomizer", views: { "mainContent": { templateUrl: "templates/modals/newGroup.html" + ver } } })
      .state('modal.changeOwner', { url: "/changeOwner/:entityType", views: { "mainContent": { templateUrl: "templates/modals/changeOwner.html" + ver } } })
      .state('modal.viewMedia', { url: "/viewMedia/:entityType,:entityId,:viewtab,:mediaFilter", views: { "mainContent": { templateUrl: "templates/modals/viewMedia.html" + ver } } })
      ;


    $urlRouterProvider.otherwise('/home/main');


    $ionicConfigProvider.backButton.text('').icon('ion-arrow-left-a');
    $ionicConfigProvider.backButton.previousTitleText(false);
    $ionicConfigProvider.tabs.style("standard");
    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center');

    console.log("Running app version " + _appVersion + " at " + document.location.href);
    // $httpProvider.defaults.headers.common.fullURL

    $sceDelegateProvider
      .resourceUrlWhitelist([
        'self',
        'https://shuristoragestd.blob.core.windows.net/user-staging/**',
        'https://shuristoragestd.blob.core.windows.net/user/**'
      ]);

    var datePickerObj = {
      inputDate: new Date(),
      titleLabel: 'Select a Date',
      setLabel: 'Set',
      todayLabel: 'Today',
      closeLabel: 'Cancel',
      mondayFirst: false,
      weeksList: ["S", "M", "T", "W", "T", "F", "S"],
      monthsList: ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
      templateType: 'popup',
      //from: new Date(2000, 1, 1),
      //to: new Date(2028, 12, 31),
      showTodayButton: true,
      dateFormat: 'dd MMMM yyyy',
      closeOnSelect: false,
      disableWeekdays: []
    };
    ionicDatePickerProvider.configDatePicker(datePickerObj);

  })

  //App Globals
  .value("appGlobals", {
    guidEmpty: '00000000-0000-0000-0000-000000000000',
    guidFavorites: '00000000-0000-0000-0000-000000000000'.replaceAll('0', '6'),
    guidSystem: '00000000-0000-0000-0000-000000000000'.replaceAll('0', 'F'),
    guidARDB: 'E2DB0148-2A04-4727-8316-4071E6F83D18'.toLowerCase(),
    guidTechInvestorsDB: '59B3597B-BE82-453A-8151-A6007A3CA7CD'.toLowerCase(),
    guidLooseTags: 'A2E53FB1-8120-4A90-9422-0D5A3B3C959D'.toLowerCase(),
    guidTouchTypeDefault: 'B9FAD172-3914-4F86-BD7C-B7CE664F0F26'.toLowerCase(),
    guidDocTwitter: 'EC1FAE0E-2033-465A-B448-8EAD8650688E'.toLowerCase(),
    guidDocResearch: 'AC0D805E-50A0-4080-BA0C-A7FC25F84BB2'.toLowerCase(),
    guidDocSyncRemoveEntity: 'E7E4E7F0-B575-4B28-B736-0D313B1A0A9B'.toLowerCase(),
    guidDocCalSync: 'd130159f-7b11-4e7b-afff-13d05ce40c09',

    //localStorage keys
    keys: { deviceMode: "DeviceMode" },

    //these get set at login by sniffing apiUrl
    slotname: "",
    slottype: 0,
    //Gets recreated in dataApi on  appUser refresh (usertypes follow the user)
    utConstants: {},
    widthSmall: 380,
    widthMedium: 760,

    betaIds: ["33880D98-C97D-48AB-9534-7EA3C3994C92".toLowerCase(), "C525283D-BDD9-49FC-BFDB-ABCA19BCA528".toLowerCase(), "AD9D6906-1AE9-4C11-A249-AE9BACF4DE39".toLowerCase()]
    //rshuri1, rshuri, kens, mmadorin, merg

  })
  .service('httpInterceptor', [function () {
    var service = this;

    service.request = function (config) {
      //if (config.url == 'templates/directives/sspinner.html') console.log(config);
      //   else if (config.url /.indexOf())
      if (config.method.toUpperCase() === "GET") {
        if (config.url.toLowerCase().indexOf("/api/") === -1 && config.headers.Authorization) {
          if (config.headers.length) {

            for (var i = 0; i < config.headers.length; i++) {
              //if (config.url == 'templates/directives/sspinner.html') console.log(config.headers[i], config.headers.Authorization);
              if (config.headers[i] === config.headers.Authorization) {
                config.headers.splice(i, 0);
                break;
              }
            }
          }
          else {
            //headers is an object, replace it
            config.headers = { Accept: "application/json, text/plain, */*" };
          }
        }
        //else console.log("not api: " + config.url);
      }
      //else console.log("not a get: " + config.url);
      return config;
    };
  }])
  .config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('httpInterceptor');
  }])



  .run(function ($ionicPlatform, $http, $location, $state, appGlobals) {
    ionic.Platform.ready(function ($cordovaStatusbar) {
      try {
        if (window.cordova) {
          window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
          //window.cordova.plugins.Keyboard.disableScroll(false);
          //Keyboard.shrinkView(true);
          //StatusBar.overlaysWebView(false);
          //StatusBar.backgroundColorByName("darkGray");
          //StatusBar.overlaysWebView(true);
          StatusBar.styleDefault();
        }
      }
      catch (e) {
        console.error("app.run Error", e);
      }
    });

  });



function InitializeTheApp() {
  angular.bootstrap(document, ["shuriApp"]);

}
