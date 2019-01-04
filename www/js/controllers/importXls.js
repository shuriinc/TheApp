(function () {
    'use strict';

    angular.module("shuriApp").controller('ImportXlsCtrl', ['$timeout', '$q', '$filter', '$rootScope', '$scope', '$state', '$ionicHistory', '$ionicPopup', '$ionicModal', '$ionicLoading', '$cordovaFile', 'dataApi', 'globals', 'appGlobals',
     function ($timeout, $q, $filter, $rootScope, $scope, $state, $ionicHistory, $ionicPopup, $ionicModal, $ionicLoading, $cordovaFile, dataApi, globals, appGlobals) {
         var vm = this;


         vm.wordFor = function (word) { return globals.wordFor(word); };
         //#region static stuff
         vm.showList = true;

         vm.isNarrow = (window.innerWidth < appGlobals.widthSmall);

         vm.primitives = [
                    { name: "Anything", primitive: 2, entityType: 1, description: "Accommodates anything that fits on 1 line", sorter: 1 },
                    { name: "Anything (Multiple Lines)", primitive: 3, entityType: 1, description: "Lots of text (multiple lines)", sorter: 2 },
                    { name: "Date", primitive: 7, entityType: 1, description: "A date", sorter: 3 },
                    { name: "Email", primitive: 1, entityType: 0, description: "An email address", sorter: 4 },
                    { name: "Number", primitive: 5, entityType: 1, description: "Any number or fraction", sorter: 5 },
                    { name: "Phone", primitive: 2, entityType: 0, description: "A phone number", sorter: 6 },
                    { name: "Rating: 5 Stars", primitive: 10, entityType: 1, description: "Assign 1-5 stars", sorter: 7 },
                    { name: "Rating: 0 to 100", primitive: 11, entityType: 1, description: "Assign a number from 0 to 100", sorter: 8 },
                    { name: "Tag (or Category)", primitive: 0, entityType: 5, description: "A set of tags", sorter: 9 },
                    { name: "URL", primitive: 3, entityType: 0, description: "A web link", sorter: 10 },
                    { name: "Unique identifier", primitive: 15, entityType: 1, description: "An identifer that uniquely determines this person, org or touch", sorter: 11 },
                    //{ name: "Slider", primitive: 6, entityType: 1, description: "Anything binary like yes/no, true/false" },
                    //{ name: "Rating: Yes/No", primitive: 8, entityType: 1, description: "Assign yes/no or thumbs-up/thumbs-down" },
                    //{ name: "Rating: Yes/No/Maybe", primitive: 9, entityType: 1, description: "Assign yes/no/maybe as in an invitation" },
         ];

         vm.addressOptions = [
                { name: "Address Line 1 or Full Address", fieldId: "addressLine1" },
                { name: "Address Line 2", fieldId: "addressLine2" },
                { name: "City", fieldId: "addressCity" },
                { name: "State/Province", fieldId: "addressState" },
                { name: "Postal Code", fieldId: "addressPostalCode" },
                { name: "Country", fieldId: "addressCountry" }
         ];
         //#endregion

         //#region fileUpload
         vm.attachfile = function () {
             $timeout(function () {
                 document.getElementById('file-upload').click()
             }, 0);
         };

         $scope.filesChanged = function (files) {
             if (files && files.length > 0) {
                 //console.log(files);
                 vm.filename = files[0].name;
                 vm.groupname = + " Import";
                 vm.groupname = String.format("{0} Import {1}", files[0].name.split(".")[0], moment().format("lll")) ;
                 var i, f;
                 for (i = 0, f = files[i]; i != files.length; ++i) {
                     vm.showList = false;
                     var reader = new FileReader();
                     reader.onload = function (evt) {
                         var data = evt.target.result;
                         vm.workbk = XLSX.read(data, { type: 'binary' });
                         if (!vm.workbk.SheetNames || vm.workbk.SheetNames.length == 0) globals.showAlert("No Worksheets", "There were no worksheets in the file.");
                         else {
                             //only handle the first sheet - todo: multiple sheets
                             var theWorksheet = vm.workbk.Sheets[vm.workbk.SheetNames[0]];
                             var colNo = 0;

                             //columns
                             vm.allCells = [];
                             vm.columns = [];
                             vm.rowCount = 0;
                             for (var z in theWorksheet) {
                                 var cell = { address: z, col: getColumnLetter(z), row: getRow(z), value: theWorksheet[z].v };
                                 vm.allCells.push(cell);
                                 if (cell.row > vm.rowCount) vm.rowCount = cell.row;
                             }
                             vm.rowCount--;

                             vm.cells = $filter("filter")(vm.allCells, function (c) { return (c.row != 1) });

                             var row1 = $filter("filter")(vm.allCells, function (c) { return (c.row == 1) });
                             row1.forEach(function (c) {
                                 var theColumn = {
                                     name: c.value,
                                     colLetter: c.col,
                                     field: vm.fields[0],
                                     customFieldId: "",
                                     customName: "",
                                     sampleValues: [],
                                     isPossibleDate: (c.value && c.value.isNaN && !c.value.isNaN() && (parseInt(c.value) > -100000 && parseInt(c.value) < 100000))
                                 };
                                 var colCells = $filter("filter")(vm.allCells, function (cell) { return (cell.row != 1 && cell.col == c.col) });
                                 colCells.forEach(function (cc) {
                                     if (theColumn.sampleValues.length < 10) {
                                         if ($filter("filter")(theColumn.sampleValues, function (sv) { return (sv == cc.value) }).length == 0) {
                                             theColumn.sampleValues.push(cc.value);
                                         }
                                     }
                                 });
                                 theColumn.sampleValues = $filter("orderBy")(theColumn.sampleValues);
                                 vm.columns.push(theColumn);
                             })
                             //console.log(vm.columns);
                             vm.newGroupNameChange();
                           
                             vm.columns.forEach(function (col) {
                                 switch (col.name.toLowerCase()) {
                                   case "first":
                                   case "first name":
                                     col.isResolved = true;
                                     col.field = getField("personFirstname");
                                     break;
                                   case "last":
                                   case "last name":
                                     col.isResolved = true;
                                     col.field = getField("personLastname");
                                     break;
                                   case "person id":
                                   case "personid":
                                   case "analyst id":
                                   case "anid":
                                     col.isResolved = true;
                                     col.field = getField("unique");
                                     col.field.entityType = 4;
                                     break;
                                     case "title":
                                         col.isResolved = true;
                                         col.entityType = 6;
                                         col.field = { entityType: shuri_enums.entitytypes.touch, fieldName: "Name / Title", fieldId: "touchName", fieldType: "builtin", place: 1 };
                                         break;
                                   case "date":
                                     col.isResolved = true;
                                     col.entityType = 6;
                                     col.field = { entityType: shuri_enums.entitytypes.touch, fieldName: "Date start", fieldId: "touchDateStart", fieldType: "builtin", place: 1 };
                                     break;
                                     case "firms":
                                         col.isResolved = true;
                                         col.entityType = 6;
                                         col.field = { entityType: shuri_enums.entitytypes.touch, fieldName: "List of Organizations", fieldId: "touchOrgsList", fieldType: "builtin", place: 1 };
                                         break;
                                     case "analyst list":
                                         col.isResolved = true;
                                         col.entityType = 6;
                                         col.field = { entityType: shuri_enums.entitytypes.touch, fieldName: "List of People", fieldId: "touchPeopleList", fieldType: "builtin", place: 1 };
                                         break;

                                 }
                             })

                             //2nd time to pick up dependencies
                           vm.columns.forEach(function (col) {
                             switch (col.name.toLowerCase()) {
                               case "email address":
                               case "email":
                                 col.isResolved = true;
                                 col.field = getField("email");
                                break;

                             }
                           })


                             refreshArrays();
                             //buildImport();
                             //refreshEntities();
                         }

                     };
                     reader.onerror = function (e) {
                         console.error(e);
                     };
                     reader.readAsBinaryString(f);
                     $scope.$apply();
                 }

             }
         }

         //#endregion

         function refreshArrays() {
             vm.idColumns = $filter('filter')(vm.columns, function (col) { return col.isResolved; });
             vm.unColumns = $filter('filter')(vm.columns, function (col) { return !col.isResolved; });

         }

         function refreshEntities() {
             //console.log(vm.importGroup);
             vm.allOrgs = $filter("filter")(vm.importGroup.groups, function (g) { return g.grpType == "3"; });
             vm.resolvedARPeople = $filter("filter")(vm.importGroup.people, function (p) { return p.id != appGlobals.guidEmpty; }).length;
             vm.resolvedAROrgs = $filter("filter")(vm.allOrgs, function (p) { return p.id != appGlobals.guidEmpty; }).length;
             //console.log(vm.allOrgs, vm.resolvedARPeople, vm.resolvedAROrgs);
         }

         //#region  resolve Column Modal

       vm.resolveCol = function (column) {
           vm.resolveColumn = column;
           //if (vm.stashEntityType && vm.resolveColumn.entityType == undefined) {
           //  vm.resolveColumn.entityType = vm.stashEntityType; //remembers last choice
           //  vm.selectEntity(vm.stashEntityType);
           //}
           //else

           if (vm.resolveColumn.entityType) vm.selectEntity(vm.resolveColumn.entityType);
           else if (vm.resolveColumn.field.entityType) vm.selectEntity(vm.resolveColumn.field.entityType);
           vm.resolveField = vm.entityFields[0];
//           console.log(vm.resolveColumn, vm.columns, vm.entityFields);

             if (column.sampleValues.length > 0) {
                 var isDate = true;
                 column.sampleValues.forEach(function (sv) {
                     if (!(angular.isNumber(sv) && (parseInt(sv) > 28000 && parseInt(sv) < 58000))) isDate = false;
               });
               if (isDate) vm.resolveColumn.isDate = true;
           }

         if (vm.resolveColumn.isResolved) {
           var fieldId;
           if (vm.resolveColumn.fieldId) fieldId = vm.resolveColumn.fieldId;
           else if (vm.resolveColumn.field) fieldId = vm.resolveColumn.field.fieldId;

             var results = $filter("filter")(vm.entityFields, function (f) {
               return fieldId == f.fieldId;
             });
             console.log(results);
           if (results) {
             if (results[0].field) vm.resolveField = results[0].field;
             else  vm.resolveField = results[0];
             }
           }
           //return;
             $ionicModal.fromTemplateUrl('templates/modals/resolveColumnImport.html', {
                 scope: $scope,
                 animation: 'slide-left-right'
             }).then(function (modal) {
                 vm.resolveModal = modal;
                 vm.resolveModal.show();
             });

         }

       vm.excelDateToJSDate = function (date) {
             return new Date(Math.round((date - 25569) * 86400 * 1000));
         }

       vm.closeResolveModal = function (save) {
         vm.setIsResolved();
         if (save) {
           refreshArrays();
           buildImport();

         }
             vm.resolveModal.hide();
             vm.resolveModal.remove();
             vm.resolveColumn = null;
         }

         vm.clearCol = function () {
             vm.columns.forEach(function (col) {
                 if (col.name == vm.resolveColumn.name) {
                     col.isResolved = col.field = col.entityType = null;
                 }
             });
             refreshArrays();
         }

       vm.selectEntity = function (entityType) {
      vm.resolveColumn.field.entityType = entityType;
             vm.entityFields = [];
             vm.stashEntityType = entityType;

             //if (vm.resolveColumn.field) vm.resolveColumn.field = null;

             //var defField = "choose";
             vm.fields.forEach(function (field) {
                 if (field.entityType === entityType || field.entityType == shuri_enums.entitytypes.all) {
                     vm.entityFields.push(field);
                   if (vm.resolveColumn.isResolved && vm.resolveColumn.field.fieldId === field.fieldId) vm.resolveField = field;
                 }
             });
        // console.log(entityType, vm.entityFields);

             //switch (entityType) {
             //    //case shuri_enums.entitytypes.all:
             //    //    vm.resolveColumn.icon = "ion-person";
             //    //    vm.resolveColumn.cssBg = "bgPositiveLight";
             //    //    vm.resolveColumn.itemColor = "item-positive";
             //    //    break;
             //    case shuri_enums.entitytypes.person:
             //        vm.resolveColumn.icon = "ion-person";
             //        vm.resolveColumn.cssBg = "bgEnergizedLight";
             //        vm.resolveColumn.itemColor = "item-energized";
             //        break;
             //    case shuri_enums.entitytypes.organization:
             //        vm.resolveColumn.icon = "ion-person-stalker";
             //        vm.resolveColumn.cssBg = "bgCalmLight";
             //        vm.resolveColumn.itemColor = "item-calm";
             //        break;
             //    case shuri_enums.entitytypes.touch:
             //        vm.resolveColumn.icon = "shuri-touch";
             //        vm.resolveColumn.cssBg = "bgBalancedLight";
             //        vm.resolveColumn.itemColor = "item-balanced";
             //        break;
             //}

             //vm.resolveColumn.showFields = true;

             //vm.setIsResolved();
             //console.log(vm.entityFields);

         }

         vm.updateAddress = function () {
             vm.setIsResolved();
         }

       vm.entityFieldsChanged = function (fld) {
         vm.resolveColumn.field = fld;
             if (vm.resolveColumn.field.fieldId.toLowerCase() != "address") {
                // console.log(vm.resolveColumn, fld);
                 if (vm.resolveColumn.field.fieldId == "customField") {
                     vm.resolveColumn.customName = vm.resolveColumn.name
                     if (vm.resolveColumn && vm.resolveColumn.sampleValues) {
                         vm.primitives.forEach(function (prim) {
                             var value = vm.resolveColumn.sampleValues[0];
                             if (value != undefined) {
                                 prim.display = true;
                                 switch (prim.name) {
                                     case 'Email':
                                         if (value.indexOf && value.indexOf('@') == -1) prim.display = false;
                                         break;
                                     case 'Rating: 5 Stars':
                                         if (isNaN(value) || Number(value) > 5) prim.display = false;
                                         break;
                                     case 'Rating: 0 to 100':
                                         if (isNaN(value) || Number(value) > 100) prim.display = false;
                                         break;
                                 }
                             }
                         });
                     }

                     vm.entityPrimitives = $filter('filter')(vm.primitives, function (prim) { return prim.display == true; });
                     vm.entityPrimitives = $filter('orderBy')(vm.entityPrimitives, 'sorter');
                     if (vm.entityPrimitives.length > 0) vm.resolveColumn.primitive = vm.entityPrimitives[0];
                     //console.log(vm.entityPrimitives, vm.primitives);
                 }
                 else if (vm.resolveColumn.field.fieldId.toLowerCase() == "usertype") {
                     //set which usertype
                     vm.resolveColumn.userTypeId = vm.resolveColumn.field.userTypeId;
                     vm.resolveColumn.userTypeEntity = vm.resolveColumn.field.fieldType;
                 }
                 vm.setIsResolved();
             }
         };



         vm.newGroupNameChange = function () {
             if (vm.groupname && vm.groupname.length > 2) {
                 vm.groupnameChecked = true;
                 dataApi.groupnameOK(vm.groupname, appGlobals.guidEmpty).then(function (data) {
                     vm.groupnameOK = data;
                     mayImport();
                 });
             }
             else {
                 vm.groupnameChecked = vm.groupnameOK = false;
                 mayImport();
             }
         };


         vm.setIsResolved = function () {
             //console.log(vm.resolveColumn);
             vm.resolveColumn.isResolved = false;
             vm.resolveColumn.resolveName = "";
             if (vm.resolveColumn.field) {
                 switch (vm.resolveColumn.field.fieldId) {
                     case "customField":
                         if (vm.resolveColumn.customName && vm.resolveColumn.primitive && vm.resolveColumn.primitive != "Choose...") {
                             vm.resolveColumn.isResolved = true;
                             vm.resolveColumn.resolveName = vm.resolveColumn.customName;
                         }
                         break;
                     case "address":
                         if (vm.resolveColumn.addressOption) {
                             vm.resolveColumn.isResolved = true;
                             vm.resolveColumn.resolveName = vm.resolveColumn.addressOption.name;
                         }
                         break;
                     case "choose":
                         //false
                         break;
                     default:
                         vm.resolveColumn.isResolved = true;
                         vm.resolveColumn.resolveName = vm.resolveColumn.field.fieldName;
                         break;
                 }
             }
         }



         //#endregion

         //#region The Import
         function buildImport() {

             vm.importGroup = new shuri_group();
             vm.importGroup.grpType = shuri_enums.grouptype.private;
             vm.importGroup.collection_Id = vm.collectionId;
             vm.importGroup.ownedBy_Id = vm.appUser.id;
             vm.importGroup.name = vm.groupname;
             vm.importGroup.description = vm.description || String.format("Imported on {0} from {1}", new Date(), vm.filename);

             //Add the custom fields as new userTypes
             vm.idColumns.forEach(function (col) {
                 if (col.field.fieldId.toLowerCase() == "customField") {
                     var ut = new shuri_userType();
                     ut.name = col.customName;
                     ut.entityType = col.primitive.entityType;
                     ut.primitive = col.primitive.primitive;
                     if (col.entityType == shuri_enums.entitytypes.person) ut.forPeople = 1;
                     else if (col.entityType == shuri_enums.entitytypes.organization) ut.forOrgs = 1;
                     else if (col.entityType == shuri_enums.entitytypes.touch) ut.forTouches = 1;
                     vm.importGroup.userTypes.push(ut);
                 }
             });

             var file = document.getElementById('file-upload');
             file.value = null;
             vm.lastUpload = false;
             vm.tally = 0;

             vm.hasTouch = vm.hasPerson = vm.hasOrg = false;

             var theWorksheet = vm.workbk.Sheets[vm.workbk.SheetNames[0]];

           var previousRow = null;
           //console.log(vm.columns);

             for (var i = 1; i < vm.rowCount; i++) {
                 var rowHasPerson = false;
                 var rowHasOrg = false;
                 var rowHasTouch = false;
                 var rowPerson = new shuri_person();
                 rowPerson.collection_Id = vm.collectionId;
                 var rowOrg = new shuri_group();
                 rowOrg.collection_Id = vm.collectionId;
                 rowOrg.grpType = shuri_enums.grouptype.organization;
                 var rowTouch = new shuri_touch();
                 rowTouch.collection_Id = vm.collectionId;

                 var rowCells = $filter("filter")(vm.cells, function (c) { return c.row == i; });
                rowCells.forEach(function (cell) {
                    var colDef = $filter("filter")(vm.columns, function (c2) { return c2.colLetter == cell.col; })[0];
                  //console.log(colDef, colDef.field.fieldId);
                     var value = cell.value;
                     //#region parse cell
                  if (colDef != null && colDef.field && colDef.field.fieldId != "" & colDef.field.fieldId != 'choose') {
                         switch (colDef.field.entityType) {
                             //#region Person
                           case shuri_enums.entitytypes.person:
                             //console.log(value, colDef.field.fieldId);
                             vm.hasPerson = true;
                             switch (colDef.field.fieldId.toLowerCase()) {
                               case "personfullname":
                                 rowPerson.name = value;
                                 rowHasPerson = true;
                                 break;
                               case "personfirstname":
                                 rowPerson.firstname = value;
                                 rowHasPerson = true;
                                 break;
                               case "personlastname":
                                 rowPerson.lastname = value;
                                 rowHasPerson = true;
                                 break;
                               case "personmiddlename":
                                 rowPerson.middlename = value;
                                 rowHasPerson = true;
                                 break;
                               case "personnickname":
                                 rowPerson.nickname = value;
                                 rowHasPerson = true;
                                 break;
                               case "personsuffix":
                                 rowPerson.suffix = value;
                                 rowHasPerson = true;
                                 break;
                               case "personprefix":
                                 rowPerson.prefix = value;
                                 rowHasPerson = true;
                                 break;
                               case "address":
                                 if (updateEntityAddress(rowPerson, colDef, value)) rowHasPerson = true;
                                 break;
                               case "unique":
                                // console.log(value, colDef.field.fieldId);
                                 var doc = new shuri_document();
                                 doc.value = value;
                                 doc.typename = "entitymap";
                                 rowPerson.documents.push(doc);
                                 rowHasPerson = true;
                                 break;
                               case "usertype":
                                 if (updateEntityUsertype(rowPerson, colDef, value)) rowHasPerson = true;
                                 break;
                               case "customfield":
                                 if (updateEntityCustomField(rowPerson, colDef, value)) rowHasPerson = true;
                                 break;
                               default:
                                 console.error("unhandled Person fieldId", colDef);
                                 break;
                             }
                             break;
                                 //#endregion

                             //#region Org
                             case shuri_enums.entitytypes.organization:
                                 vm.hasOrg = true;
                                 switch (colDef.field.fieldId.toLowerCase()) {
                                     case "organizationname":
                                         rowOrg.name = value;
                                         rowHasOrg = true;
                                         break;
                                     case "organizationdescription":
                                         rowOrg.description = value;
                                         rowHasOrg = true;
                                         break;
                                     case "organizationnickname":
                                         rowOrg.nickname = value;
                                         rowHasOrg = true;
                                         break;
                                     case "address":
                                         if (updateEntityAddress(rowOrg, colDef, value)) rowHasOrg = true;
                                         break;
                                     case "usertype":
                                         if (updateEntityUsertype(rowOrg, colDef, value)) rowHasOrg = true;
                                         break;
                                     case "customfield":
                                         if (updateEntityCustomField(rowOrg, colDef, value)) rowHasOrg = true;
                                         break;
                                     default:
                                         console.error("unhandled Org fieldId", colDef.field.fieldId);
                                         break;
                                 }
                                 break;
                             //#endregion

                             //#region Touch
                             case shuri_enums.entitytypes.touch:
                                 vm.hasTouch = true;
                                 switch (colDef.field.fieldId.toLowerCase()) {
                                     case "touchname":
                                         rowTouch.name = value;
                                         rowHasTouch = true;
                                         break;
                                     case "touchowner":
                                          rowTouch.ownedByName = value;
                                         rowHasTouch = true;
                                         break;
                                     case "touchdescription":
                                         rowTouch.description = value;
                                         rowHasTouch = true;
                                         break;
                                     case "touchpeoplelist":
                                         rowTouch.peopleList = value;
                                         rowHasTouch = true;
                                         break;
                                     case "touchorgslist":
                                         rowTouch.orgsList = value;
                                         rowHasTouch = true;
                                         break;
                                     case "touchdatestart":
                                         var dtStart = TryParseDate(value);
                                         //console.log(value, dtStart, angular.isDate(value));
                                         if (dtStart) {
                                             rowTouch.dateStart = dtStart;
                                             rowHasTouch = true;
                                         }
                                         break;
                                     case "touchdateend":
                                         var dtEnd = TryParseDate(value);
                                         if (dtEnd) {
                                             rowTouch.dateEnd = dtEnd;
                                             rowHasTouch = true;
                                         }
                                         break;
                                     case "touchtype":
                                         rowTouch.typename = value;
                                         break;
                                     case "address":
                                         if (updateEntityAddress(rowTouch, colDef, value)) rowHasTouch = true;
                                         break;
                                     case "usertype":
                                         if (updateEntityUsertype(rowTouch, colDef, value)) rowHasTouch = true;
                                         break;
                                     case "customfield":
                                         if (updateEntityCustomField(rowTouch, colDef, value)) rowHasTouch = true;
                                         break;
                                     default:
                                         console.error("unhandled Touch fieldId", colDef.field.fieldId);
                                         break;

                                 }
                                 break;
                                 //#endregion
                         }
                     }
                     //#endregion
                 });
               //console.log(rowPerson, rowOrg, rowTouch, rowHasPerson, rowHasOrg, rowHasTouch);

                 pushRow(rowPerson, rowOrg, rowTouch, rowHasPerson, rowHasOrg, rowHasTouch);
             }


             //calc the collectionName.
             vm.collectionName = "";
             vm.appUser.subscriptions.forEach(function (sub) {
                 if (sub.group_Id == vm.collectionId) vm.collectionName = sub.name;
             });


             //license reconciliation
             //vm.ownedItems = vm.appUser.ownedPeople + vm.appUser.ownedOrgs + vm.appUser.ownedTouches;
             //vm.importItems = vm.importGroup.people.length + vm.importGroup.groups.length + vm.importGroup.touches.length;
             //vm.allowedItems = vm.appUser.licensedItems;
             //if (((vm.ownedItems + vm.importItems) - vm.allowedItems) > 0) {
             //    vm.overLicense = true;
             //    switch (vm.appUser.licenseLevel) {
             //        case shuri_enums.licenselevel.free:
             //            vm.licenseName = "Free ";
             //            break;
             //        case shuri_enums.licenselevel.professional:
             //            vm.licenseName = "Professional ";
             //            break;
             //        case shuri_enums.licenselevel.enterprise:
             //            vm.licenseName = "Enterprise ";
             //            break;
             //        default:
             //            vm.licenseName = "Unknown ";
             //            break;
             //    }
             //}

             var summ = "";
             if (vm.importGroup) {
                 if (vm.importGroup.touches.length > 0) {
                     summ += vm.importGroup.touches.length + " touches, ";
                 }
                 if (vm.importGroup.people.length > 0) {
                     summ += vm.importGroup.people.length + " people, ";
                 }
                 if (vm.importGroup.groups.length > 0) {
                     var orgs = $filter("filter")(vm.importGroup.groups, function (g) { return g.grpType == 3; });
                     if (orgs.length > 0) {
                         summ += orgs.length + " organizations, ";
                     }
                 }
                 if (vm.importGroup.userTypes.length > 0) {
                     summ += vm.importGroup.userTypes.length + " custom fields ";
                 }
                 if (summ != "") {
                     if (summ.lastIndexOf(",") > 0) summ = summ.substring(0, summ.lastIndexOf(","));
                     summ = "Import summary: " + summ;
                 }
             }
             //console.log(vm.importGroup, summ);
             vm.importSummary = summ;
             vm.mayImport = mayImport();

             //var peop = $filter('orderBy')(vm.importGroup.people, "name");
             //peop.forEach(function (p) { console.log(p.name); });
         }

         function mayImport() {
             var mi = false;
             if (vm.idColumns && vm.idColumns.length > 0 && vm.groupnameOK) {
                 //rules
                 if (vm.hasTouch) {
                     var hasName, hasDate
                     vm.idColumns.forEach(function (c) {
                         if (c.field.fieldId === "touchName") hasName = true;
                         if (c.field.fieldId === "touchDateStart") hasDate = true;
                     });
                     //console.log(hasName, hasDate);
                     if (!hasName || !hasDate) return false;
                 }
                 if (vm.hasPerson) {
                     var hasName
                     vm.idColumns.forEach(function (c) {
                         if (c.field.fieldId === "personFullname" || c.field.fieldId === "personLastname") hasName = true;
                     });
                     if (!hasName) return false;
                 }
                 mi = true;
             }
             vm.mayImport = mi;
             return mi;
         }

         function updateEntityCustomField(entity, column, value) {
             var result = false;
             //console.log(entity, column, value);

             if (column.primitive) {
                 switch (column.primitive.entityType) {
                     case 0:
                         var hascp = false;
                         for (var i = 0; i < entity.contactPoints.length; i++) {
                             if (entity.contactPoints[i].typename == column.customName) {
                                 hascp = true;
                             }
                         }
                         if (!hascp) {
                             var cp = new shuri_contactPoint();
                             cp.typename = column.customName;
                             cp.collection_Id = vm.collectionId;
                             cp.name = value;
                             entity.contactPoints.push(cp);
                             result = true;
                         }
                         break;
                     case 1:
                         var hasdoc = false;
                         for (var i = 0; i < entity.documents.length; i++) {
                             if (entity.documents[i].typename == column.customName) {
                                 hasdoc = true;
                             }
                         }
                         if (!hasdoc) {
                             var doc = new shuri_document();
                             doc.collection_Id = vm.collectionId;
                             doc.typename = column.customName;
                             doc.value = value;
                             entity.documents.push(doc);
                             result = true;
                             if (column.dateChecked) {
                                 var date = (value * 86400000 - 25569 * 86400000)
                                 doc.value = moment(date)._d.toUTCString()
                             }
                         }
                         break;
                     case 5:
                         var tg = new shuri_tag();
                         tg.typename = column.customName;
                         tg.collection_Id = vm.collectionId;
                         tg.name = value;
                         entity.tags.push(tg);

                         //add tag to it's usertype
                         var tagExistsInUT = false;
                         vm.importGroup.userTypes.forEach(function (ut) {
                             if (ut.entityType == 5 && ut.name == tg.typename) {
                                 ut.tags.forEach(function (existTag) {
                                     if (existTag.name == tg.name) tagExistsInUT = true;
                                 });
                             }
                         })
                         if (!tagExistsInUT) {
                             vm.importGroup.userTypes.forEach(function (ut) {
                                 if (ut.entityType == 5 && ut.name == tg.typename) ut.tags.push(tg);
                             });
                         }

                         result = true;
                         break;
                 }
             }
             return result;
         }

         function updateEntityUsertype(entity, column, value) {
             var result = false;
             if (value.trim) value = value.trim();
             //check for Date primitive
             if (column.field.fieldType.toLowerCase() == "document" && column.field.primitive == 7) {
                 value = TryParseDate(value);
             }

           switch (column.field.fieldType.toLowerCase()) {
                 case "contactpoint":
                     var hascp = false;
                     for (var i = 0; i < entity.contactPoints.length; i++) {
                         if (entity.contactPoints[i].userType_Id == column.userTypeId) {
                             hascp = true;
                         }
                     }
                     if (!hascp) {
                       var cp = new shuri_contactPoint();
                         //console.log(
                         cp.userType_Id = column.field.userTypeId;
                         cp.collection_Id = vm.collectionId;
                         cp.name = value;
                         entity.contactPoints.push(cp);
                         result = true;
                     }
                     break;
                 case "document":
                     var hasdoc = false;
                     for (var i = 0; i < entity.documents.length; i++) {
                         if (entity.documents[i].userType_Id == column.userTypeId) {
                             hasdoc = true;
                         }
                     }
                     if (!hasdoc) {
                         var doc = new shuri_document();
                         doc.userType_Id = column.userTypeId;
                         doc.collection_Id = vm.collectionId;
                         doc.value = value;
                         entity.documents.push(doc);
                         result = true;
                     }
                     break;
                 case "tag":
                     var tg = new shuri_tag();
                     tg.userType_Id = column.userTypeId;
                     tg.collection_Id = vm.collectionId;
                     tg.name = value;
                     //see if pre-existing tag
                     vm.preexistingTags.forEach(function (preTg) {
                         if (tg.name && tg.name != "" && preTg.name.toLowerCase() == tg.name) tg.id = preTg.id;
                     });
                     entity.tags.push(tg);
                     result = true;
                     break;
             }
             return result;
         }

         function updateEntityAddress(entity, column, value) {
             var result = false;
             if (!entity.addressObj) entity.addressObj = { addr1: '', addr2: '', city: '', state: '', pcode: '', country: '' };
             switch (column.customFieldId) {
                 case "addressLine1":
                     entity.addressObj.addr1 = value;
                     result = true;
                     break;
                 case "addressLine2":
                     entity.addressObj.addr2 = value;
                     result = true;
                     break;
                 case "addressCity":
                     entity.addressObj.city = value;
                     result = true;
                     break;
                 case "addressState":
                     entity.addressObj.state = value;
                     result = true;
                     break;
                 case "addressPostalCode":
                     entity.addressObj.pcode = value;
                     result = true;
                     break;
                 case "addressCountry":
                     entity.addressObj.country = value;
                     result = true;
                     break;
             }
             return result;

         }

       vm.importNow = function () {
         $ionicLoading.show({ template: 'Parsing spreadsheet' });
         //try {
           buildImport();
           console.log(vm.importGroup);
           //$ionicLoading.hide();
           //return;
           vm.allOrgs = $filter("filter")(vm.importGroup.groups, function (g) { return g.grpType == 3; });
           if (vm.matchAR && (vm.importGroup.people.length > 0 || vm.allOrgs.length > 0)) {

             $timeout(function () {
               var msg = 'Matching to AR'
               if (vm.importGroup.people.length + vm.allOrgs.length > 30) msg += '<br /><span class="medtext">This may take a while</span>'
               $ionicLoading.show({ template: msg });
             }, 3000);

             dataApi.resolveAREntities(vm.importGroup.people, vm.allOrgs).then(function (data) {
               var people = data.peopleList;

               var orgs = data.orgsList;
               console.log(data, people, orgs);
               for (var i = 0; i < people.length; i++) {
                 if (people[i].id != appGlobals.guidEmpty) {
                   for (var j = 0; j < vm.importGroup.people.length; j++) {
                     if (vm.importGroup.people[j].name == people[i].name) {
                       people[i].changeType = 1;
                       vm.importGroup.people[j] = people[i];
                       break;
                     }
                   }
                 }
               }
               //console.log(vm.allOrgs, orgs);
               for (var i = 0; i < orgs.length; i++) {
                 if (orgs[i].id != appGlobals.guidEmpty) {
                   for (var j = 0; j < vm.importGroup.groups.length; j++) {
                     if (vm.importGroup.groups[j].name == orgs[i].name) {
                       orgs[i].changeType = 1;
                       vm.importGroup.groups[j] = orgs[i];
                       break;
                     }
                   }
                 }
               }
               console.log(vm.importGroup);
               refreshEntities();
               $ionicLoading.hide();
               $timeout(function () { $ionicLoading.hide(); }, 3000); //in case the resolve completes in less than 3 secs

               openARModal();
             });
           }
           else PostImportGroup();
         //}
         //catch (ex) {
         //  $ionicLoading.hide();
         //  globals.showAlert("There was a problem.", ex);

         //}
       };

         function PostImportGroup() {
             $ionicLoading.show({ template: 'Importing...' });
             dataApi.postEntity("WholeGroup", "group", vm.importGroup).then(function (data) {
                 globals.showAlert("Import Complete", "A new group is called <b>" + vm.importGroup.name + "</b> contains everything imported.");
                 globals.sendAppView('importSpreadsheetComplete', 14, appGlobals.guidSystem);
                 $rootScope.$broadcast("RefreshMain");
                 $ionicLoading.hide();
                 $state.go('home.main', { showGroupId: data });

             },
                function (errorObj) {

                    if (errorObj && errorObj.message) {
                        $ionicLoading.hide();
                        var msg = encodeURI(errorObj.message);
                        globals.showAlert("Import Error", "<a href='mailto:support@shuri.com?subject=Import+Error&body=" + msg + "'>Please click here to notify Support</a><br /><br /><br />Error:<br />" + errorObj.message);
                    }
                    else if (errorObj) console.log(errorObj);
                });
         }

         function addEntityLocation(entity) {
             var address = "";
             var loc = null;
             if (entity.addressObj) {
                 //vm.tally++;
                 var ao = entity.addressObj;
                 if (ao.addr1) address += ao.addr1;
                 if (ao.addr2) address += " " + ao.addr2;
                 if (ao.city) address += ', ' + ao.city;
                 if (ao.state) address += ', ' + ao.state;
                 if (ao.zip) address += ', ' + ao.zip;
                 if (ao.country) address += ', ' + ao.country;

                 if (address.trim() != "") {
                     loc = new shuri_location;
                     loc.collection_Id = vm.collectionId;
                     loc.address = address;
                     loc.userType_Id = appGlobals.utConstants.loc_business;
                     entity.locations.push(loc);
                 }
             }

         }

         function pushRow(person, org, touch, hasPerson, hasOrg, hasTouch) {
             if (hasPerson && person.addressObj) addEntityLocation(person);
             if (hasOrg && org.addressObj) addEntityLocation(org);
             if (hasTouch && touch.addressObj) addEntityLocation(touch);

             var orgExists = false;
             var i = 0;
             //prevent duplicates
             if (hasOrg) {
                 orgExists = false;
                 for (i = 0; i < vm.importGroup.groups.length; i++) {
                     var existOrg = vm.importGroup.groups[i];
                     if (existOrg.name === org.name) {
                         orgExists = true;
                         //consolidate orgs
                         for (var c = 0; c < org.contactPoints.length; c++) {
                             var hasContactPoint = false;
                             for (var cc = 0; cc < existOrg.contactPoints.length; cc++) {
                                 if (org.contactPoints[c].userType_Id == existOrg.contactPoints[cc].userType_Id) hasContactPoint = true;
                                 if (org.contactPoints[c].typename == existOrg.contactPoints[cc].typename) hasContactPoint = true;
                             }
                             if (!hasContactPoint) existOrg.contactPoints.push(org.contactPoints[c]);
                         }
                         for (var d = 0; d < org.documents.length; d++) {
                             var hasDocument = false;
                             for (var dd = 0; dd < existOrg.documents.length; dd++) {
                                 if (org.documents[d].userType_Id == existOrg.documents[dd].userType_Id) hasDocument = true;
                                 if (org.documents[d].typename == existOrg.documents[dd].typename) hasDocument = true;
                             }
                             if (!hasDocument) existOrg.documents.push(org.documents[d]);
                         }
                         for (var d = 0; d < org.people.length; d++) {
                             existOrg.people.push(org.people[d]);
                         }
                         for (var d = 0; d < org.touches.length; d++) {
                             existOrg.touches.push(org.touches[d]);
                         }
                         for (var d = 0; d < org.tags.length; d++) {
                             existOrg.tags.push(org.tags[d]);
                         }


                         org = existOrg;
                         break;
                     }
                 }
                 if (!orgExists) {
                     vm.importGroup.groups.push(org);
                    // console.log(org);

                 }
             }

             if (hasPerson) {
                // console.log(person);
                 var perExists = false;
                 var matches = $filter("filter")(vm.importGroup.people, function (p) {
                     return ((p.firstname && p.lastname && p.firstname === person.firstname && p.lastname === person.lastname)
                                || (p.name && p.name === person.name));
                 });

                 if (matches.length == 0) vm.importGroup.people.push(person);
                 else matches.forEach(function (p) {
                     //consolidate people
                     for (var c = 0; c < person.contactPoints.length; c++) {
                         var hasContactPoint = false;
                         for (var cc = 0; cc < p.contactPoints.length; cc++) {
                             if (person.contactPoints[c].userType_Id == p.contactPoints[cc].userType_Id) hasContactPoint = true;
                             if (person.contactPoints[c].typename == p.contactPoints[cc].typename) hasContactPoint = true;
                         }
                         if (!hasContactPoint) p.contactPoints.push(person.contactPoints[c]);
                     }
                     for (var d = 0; d < person.documents.length; d++) {
                         var hasDocument = false;
                         for (var dd = 0; dd < p.documents.length; dd++) {
                             if (person.documents[d].userType_Id == p.documents[dd].userType_Id) hasDocument = true;
                             if (person.documents[d].typename == p.documents[dd].typename) hasDocument = true;
                         }
                         if (!hasDocument) p.documents.push(person.documents[d]);
                     }
                     for (var d = 0; d < person.groups.length; d++) {
                         p.groups.push(person.groups[d]);
                     }
                     for (var d = 0; d < person.touches.length; d++) {
                         p.touches.push(person.touches[d]);
                     }
                     for (var d = 0; d < person.tags.length; d++) {
                         p.tags.push(person.tags[d]);
                     }

                 });
             }

             //relation between org and person?
             if (hasPerson && hasOrg) {
                 var personExistsInOrg = false;
                 for (i = 0; i < org.people.length; i++) {
                     if (org.people[i].firstname === person.firstname
                                 && org.people[i].lastname === person.lastname) {
                         personExistsInOrg = true;
                         break;
                     }
                 }

                 if (!personExistsInOrg) org.people.push(person);
             }

             if (hasTouch) {
                 buildTouch(touch);

                 if (hasPerson) {
                     touch.people.push(person)
                 }
                 if (hasOrg) {
                     touch.groups.push(org)
                 }
                 vm.importGroup.touches.push(touch)
             }
         }

         function buildTouch(touch) {
             if (!touch.name) {
                 if (touch.startDt && touch.type) {
                     touch.name = touch.startDt + ' ' + touch.type;
                 }
                 else touch.name = "Untitled";
             }

             if (touch.peopleList && touch.peopleList != "") {
                 var peop = touch.peopleList.split(',');
                 //console.log(peop);
                 peop.forEach(function (p) {
                     p = p.trim();
                     if (p != '') {
                         var theEntity;
                         var pExists = false;
                         vm.importGroup.people.forEach(function (ent) {
                             if (ent.name != '' && ent.name == p) {
                                 theEntity = ent;
                                 pExists = true;
                             }
                         });
                         if (!pExists) {
                             theEntity = new shuri_person();
                             theEntity.collection_Id = vm.collectionId;
                             theEntity.name = p;
                             vm.importGroup.people.push(theEntity);
                         }
                         touch.people.push(theEntity);
                     }
                 });
             }

             if (touch.orgsList && touch.orgsList != "") {
                 var org = touch.orgsList.split(',');
                 //console.log(org);
                 org.forEach(function (p) {
                     p = p.trim();
                     if (p != '') {
                         var theGroup;
                         var pExists = false;
                         vm.importGroup.groups.forEach(function (g) {
                             if (g.name != '' && g.name == p) {
                                 theGroup = g;
                                 pExists = true;
                             }
                         });
                         if (!pExists) {
                             theGroup = new shuri_group();
                             theGroup.collection_Id = vm.collectionId;
                             theGroup.name = p;
                             theGroup.grpType = 3;

                             vm.importGroup.groups.push(theGroup);
                         }
                         //console.log(theGroup);

                         touch.groups.push(theGroup);
                     }
                 });
             }

             if (touch.typename) {
                 var tExists = false;
                 vm.importGroup.userTypes.forEach(function (u) {
                     if (u.name != '' && u.name == touch.typename) tExists = true;
                 });
                 if (!tExists) {
                     var newUT = new shuri_userType()
                     newUT.collection_Id = vm.collectionId;
                     newUT.name = touch.typename;
                     newUT.entityType = shuri_enums.entitytypes.touch;
                     newUT.primitive = shuri_enums.touchprimitive.meeting;
                     vm.importGroup.userTypes.push(newUT);
                     //console.log(newUT);
                 }

             }
             else touch.userType_Id = appGlobals.guidTouchTypeDefault;

             if (touch.ownedByName) {
                 var matches = $filter("filter")(vm.importGroup.people, function (p) {
                     return ((p.firstname && p.lastname && p.firstname + ' ' + p.lastname === touch.ownedByName)
                                || (p.name && p.name === touch.ownedByName));
                 });
                 if (matches.length == 0) {
                     //add person
                     var theEntity = new shuri_person();
                     theEntity.collection_Id = vm.collectionId;
                     theEntity.name = touch.ownedByName;
                     vm.importGroup.people.push(theEntity);

                 }

             }
 
         }
 
         //#endregion

         //#region AR Modal
         function openARModal() {
             vm.guidEmpty = appGlobals.guidEmpty;
              $ionicModal.fromTemplateUrl('templates/modals/importResolveAREntity.html', {
                 scope: $scope,
                 animation: 'slide-left-right'
             }).then(function (modal) {
                 vm.arModal = modal;
                 vm.arModal.show();
             });
             console.log(vm.allOrgs, vm.resolvedARPeople, vm.resolvedAROrgs)
         }
         vm.closeARModal = function () {
             vm.arModal.hide();
             vm.arModal.remove();
             PostImportGroup();
         }

         vm.openLookupModal = function (entity, entityType) {
             vm.lookupEntity = entity;
             vm.lookupEntityType = entityType;
             $ionicModal.fromTemplateUrl('templates/modals/importARLookup.html', {
                 scope: $scope,
                 animation: 'slide-left-right'
             }).then(function (modal) {
                 vm.lookupModal = modal;
                 vm.lookupModal.show();
             });
         }

         vm.closeLookupModal = function () {
             vm.lookupModal.hide();
             vm.lookupModal.remove();
             vm.resolvedARPeople = $filter("filter")(vm.importGroup.people, function (p) { return p.id != appGlobals.guidEmpty; }).length;
             vm.allOrgs = $filter("filter")(vm.importGroup.groups, function (g) { return g.grpType == 3; });
             vm.resolvedAROrgs = $filter("filter")(vm.allOrgs, function (p) { return p.id != appGlobals.guidEmpty; }).length;

         }



        
         vm.removePerson = function (event, per) {
             if (event) event.stopPropagation();
             console.error("To Do");

         }
         vm.removeOrg = function (event, org) {
             if (event) event.stopPropagation();
             console.error("To Do");

         }
         //#endregion

         //lookupModal Autocomplete

         //#region Autocomplete ------------------------------------------------
         vm.pause = 400;
         vm.minLength = 2;
         vm.arLookupString = "";
         vm.arLookupStringLast = null;
         vm.addTimer = null;
         vm.hideTimer = null;
         vm.searching = false;

         vm.keyPressedAdd = function (event, childscope) {
             // console.log(event.which, vm.arLookupString);
             vm.childscope = childscope;
             if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                 if (!vm.arLookupString || vm.arLookupString == "") {
                     //user just cleared the search bar
                     vm.arLookupStringLast = null;
                     vm.resetSearch(true).then(function () {
                         console.log("reset");
                         if (vm.addTimer) {
                             $timeout.cancel(vm.addTimer);
                         }

                         vm.searching = false;
                     });

                 } else if (isNewSearchNeeded(vm.arLookupString, vm.arLookupStringLast, vm.minLength)) {
                     vm.arLookupStringLast = vm.arLookupString;

                     if (vm.addTimer) {
                         $timeout.cancel(vm.addTimer);
                     }
                     vm.searching = true;

                     vm.addTimer = $timeout(function () {
                         vm.timerAddComplete(vm.arLookupString);
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
                 vm.resetSearch(true);
                 //console.log("hideResults");
             }, vm.pause);
         };

         vm.timerAddComplete = function (str) {
             if (str.length >= vm.minLength) {
                 dataApi.autocompleteARImport(vm.lookupEntityType, str, 15).then(function (data) {
                     vm.entities = data;
                     vm.searching = false;
                     vm.isPaged = false;
                     vm.showSearchResults = true;
                 });


             }
             else if (str.length == 0) {
                 vm.resetSearch(true);
             }

         };
         vm.resetSearch = function (reload) {
             vm.showSearchResults = false;
             vm.arLookupString = vm.arLookupStringLast = "";
             if (reload) vm.entities = [];  //nothing stashed, but clear if Autocomplete happened
         }


         function isNewSearchNeeded(newTerm, oldTerm, minLength) {
             return newTerm.length >= minLength && newTerm != oldTerm;
         }


         vm.lookupResultSelected = function (res, origName) {
             //console.log(res);
             if (vm.lookupEntityType == shuri_enums.entitytypes.person) {
                 for (var i = 0; i < vm.importGroup.people.length; i++) {
                     if (vm.importGroup.people[i].name == origName) {
                         vm.importGroup.people[i].id = res.id;
                         vm.importGroup.people[i].name = res.name;
                         vm.importGroup.people[i].imageUrlThumb = res.imageUrlThumb;

                         dataApi.postEntityMap(res.id, res.entityType, origName, "AltName").then(function () {
                         });
                         vm.closeLookupModal();
                         break;
                     }
                 }
             }
             else if (vm.lookupEntityType == shuri_enums.entitytypes.organization) {
                 for (var i = 0; i < vm.importGroup.groups.length; i++) {
                     if (vm.importGroup.groups[i].name == origName) {
                         vm.importGroup.groups[i].id = res.id;
                         vm.importGroup.groups[i].name = res.name;
                         vm.importGroup.groups[i].imageUrlThumb = res.imageUrlThumb;

                         dataApi.postEntityMap(res.id, vm.lookupEntityType, origName, "AltName").then(function () {
                         });
                         vm.closeLookupModal();
                         break;
                     }
                 }
             }
             else vm.closeLookupModal();
         }

         //#endregion

         //#region Helper Methods

         function getColumnLetter(cellAddress) {
             var ret = "";
             for (var i = 0; i < cellAddress.length; i++) {
                 /* all keys that do not begin with "!" correspond to cell addresses */
                 //first numeric begins the row number
                 if (cellAddress[i] === "!" || cellAddress[i] == parseInt(cellAddress[i])) break;
                 else ret += cellAddress[i]
             }
             return ret;
         }

         function getColumnByAddress(columns, cellAddress) {
             var theCol = null;
             var columnLetter = getColumnLetter(cellAddress).toLowerCase();
             columns.forEach(function (column) {
                 if (column.colLetter.toLowerCase() == columnLetter) theCol = column;
             })
             return theCol;
         }

         function getRow(cellAddress) {
             var ret = 0;
             for (var i = 0; i < cellAddress.length; i++) {
                 /* all keys that do not begin with "!" correspond to cell addresses */
                 if (cellAddress[i] === "!") break;

                     //first numeric begins the row number
                 else if (cellAddress[i] == parseInt(cellAddress[i])) {
                     var len = parseInt(cellAddress.length) - parseInt(i);
                     ret = cellAddress.substr(i, len)
                     // console.log(ret, cellAddress, cellAddress.length, i, len );
                     break;
                 }
             }
             return parseInt(ret);
         }

         //#endregion

       vm.cancel = function () {
         $state.go("home.main");
       }
       function getField(fieldId) {
         var fld = vm.fields[0];
         var results = $filter("filter")(vm.fields, function (f) {
           return (f.fieldId.toLowerCase() === fieldId.toLowerCase())
             || (f.fieldId.toLowerCase() === "usertype" && f.fieldName && f.fieldName.toLowerCase() === fieldId.toLowerCase());
         });
         if (results) fld = results[0];
         return fld;
       }


         function initialize() {

             $q.all({
                 dataAppUser: dataApi.getAppUser(),
                 dataUTsForImport: dataApi.getUserTypes("forimport"),
                 dataUTs: dataApi.getUserTypes("fortouch")
             }).then(function (d) {
                 vm.appUser = d.dataAppUser;
                 //console.log(d.dataUTsForImport);
                 vm.collections = vm.appUser.subsMayEdit;
                 vm.collectionId = vm.appUser.defaultCollection_Id;

                 vm.touchTypes = d.dataUTs;
                 //console.log(d.dataUTs);

                 //AR Subscriber?
                 vm.isAR = false;
                 vm.appUser.subscriptionIds.forEach(function (id) {
                     //if (id == appGlobals.guidARDB) vm.isAR = true;
                 });
               vm.showAR = vm.matchAR = vm.isAR;

                 //stash all pre-existing tags for lookups
                 vm.preexistingTags = [];
                 d.dataUTsForImport.forEach(function (ut) {
                     if (ut.entityType == 5) {
                         ut.tags.forEach(function (tag) {
                             vm.preexistingTags.push(tag);
                         });
                         //turn off Loose Tags UT
                         if (ut.id == appGlobals.guidLooseTags) ut.forPeople = ut.forOrgs = ut.forTouches = false;
                     }
                 });

                 //#region Load all the fields
                 vm.fields = [];
                 vm.fields.push({ entityType: shuri_enums.entitytypes.all, fieldName: "Choose...", fieldId: "choose", fieldType: "builtin", place: 0 });
               vm.fields.push({ entityType: shuri_enums.entitytypes.all, fieldName: "Address or Location", fieldId: "address", fieldType: "address", place: 1 });
               vm.fields.push({ entityType: shuri_enums.entitytypes.all, fieldName: "Unique Identifier (any)", fieldId: "unique", fieldType: "builtin", place: 1 });

                 //person
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Full name", fieldId: "personFullname", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "First name", fieldId: "personFirstname", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Last name", fieldId: "personLastname", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Middle name", fieldId: "personMiddlename", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Nickname", fieldId: "personNickname", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Name Suffix", fieldId: "personSuffix", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Name Prefix", fieldId: "personPrefix", fieldType: "builtin", place: 1 });
                 //  vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "Person Type", fieldId: "personType", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: "(None of the above)", fieldId: "customField", fieldType: "builtin", place: 2 });
                 for (var i = 0; i < d.dataUTsForImport.length; i++) {
                     if (d.dataUTsForImport[i].forPeople) vm.fields.push({ entityType: shuri_enums.entitytypes.person, fieldName: d.dataUTsForImport[i].name, fieldId: "usertype", userTypeId: d.dataUTsForImport[i].id, fieldType: d.dataUTsForImport[i].entityName, primitive: d.dataUTsForImport[i].primitive, place: 1 });
                 }
                 //console.log(vm.fields);

               var x = 1;

                 //org
                 vm.fields.push({ entityType: shuri_enums.entitytypes.organization, fieldName: "Name", fieldId: "organizationName", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.organization, fieldName: "Description", fieldId: "organizationDescription", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.organization, fieldName: "Nickname", fieldId: "organizationNickname", fieldType: "builtin", place: 1 });
                 vm.fields.push({ entityType: shuri_enums.entitytypes.organization, fieldName: "(None of the above)", fieldId: "customField", fieldType: "builtin", place: 2 });
                 for (var i = 0; i < d.dataUTsForImport.length; i++) {
                     if (d.dataUTsForImport[i].forOrgs) vm.fields.push({ entityType: shuri_enums.entitytypes.organization, fieldName: d.dataUTsForImport[i].name, fieldId: "usertype", userTypeId: d.dataUTsForImport[i].id, fieldType: d.dataUTsForImport[i].entityName, primitive: d.dataUTsForImport[i].primitive, place: 1 });
                 }


									  //touches
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Description", fieldId: "touchDescription", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Date start", fieldId: "touchDateStart", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Date end", fieldId: "touchDateEnd", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "List of People", fieldId: "touchPeopleList", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "List of Organizations", fieldId: "touchOrgsList", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Name / Title", fieldId: "touchName", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Owner / Initiator", fieldId: "touchOwner", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "Type", fieldId: "touchType", fieldType: "builtin", place: 1 });
									  vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: "(None of the above)", fieldId: "customField", fieldType: "builtin", place: 2 });
									  for (var i = 0; i < d.dataUTsForImport.length; i++) {
											  if (d.dataUTsForImport[i].forTouches) vm.fields.push({ entityType: shuri_enums.entitytypes.touch, fieldName: d.dataUTsForImport[i].name, fieldId: "usertype", userTypeId: d.dataUTsForImport[i].id, fieldType: d.dataUTsForImport[i].entityName, primitive: d.dataUTsForImport[i].primitive, place: 1 });
                                                                                                              }
               ;
								////custom fields
                 //vm.fields.push({ entityName: "custom", fieldName: "Set of Tags", fieldId: "customTag", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Text", fieldId: "customText", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Integer", fieldId: "customInteger", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Number", fieldId: "customNumber", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Date", fieldId: "customDate", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Email", fieldId: "customEmail", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Phone", fieldId: "customPhone", fieldType: "custom" });
                 //vm.fields.push({ entityName: "custom", fieldName: "Url", fieldId: "customUrl", fieldType: "custom" });

                 //#endregion

             });
         }

       $scope.$on('$ionicView.enter', function () {
         globals.sendAppView('importSpreadsheet', 14, appGlobals.guidSystem);
         globals.setHelpView('importSpreadsheet');
         vm.importGroup = vm.columns = vm.filename = null;

         initialize();
       });


     }]);

})();
