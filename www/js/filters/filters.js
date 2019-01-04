angular.module("shuriApp")

//used in templates/crud/touchEdit.html timer filter
.filter('timerFilter', function() {

 var conversions = {
   'ss': angular.identity,
   'mm': function(value) { return value * 60; },
   'hh': function(value) { return value * 3600; }
 };

 var padding = function(value, length) {
   var zeroes = length - ('' + (value)).length,
       pad = '';
   while(zeroes-- > 0) pad += '0';
   return pad + value;
 };

 return function (value, unit, format, isPadded) {

     if (isNaN(value)) value = 0;

     var totalSeconds = conversions[unit || 'ss'](value),
       hh = Math.floor(totalSeconds / 3600),
       mm = Math.floor((totalSeconds % 3600) / 60),
       ss = totalSeconds % 60;

   format = format || 'hh:mm:ss';
  //  isPadded = angular.isDefined(isPadded)? isPadded: true;
  //  hh = isPadded? padding(hh, 2): hh;
  //  mm = isPadded? padding(mm, 2): mm;
  //  ss = isPadded? padding(ss, 2): ss;

   hh.toString().length == 1 ? hh = '0'+hh : hh = hh
   mm.toString().length == 1 ? mm = '0'+mm : mm = mm
   ss.toString().length == 1 ? ss = '0'+ss : ss = ss

   return format.replace(/hh/, hh).replace(/mm/, mm).replace(/ss/, ss);
 };
})



//used in templates/crud/touch.html date/time filter
.filter('time', function ($filter) {
    return function (input) {
        if (input == null) { return ""; }

        var _date = $filter('date')(new Date(input), 'HH:mm');

        return _date;

    };
})

//entityTouches
.filter('touchItem', function ($filter) {
    return function (touch) {
        if (touch == null) { return ""; }

        if (!touch.dateStart) {
            var item = String.format("{0}<br /><span class='smallText itemLabel'></span>", touch.name);
        }
        else {
            var dt = $filter('date')(new Date(touch.dateStart), 'shortDate');
            var item = String.format("{0}<br /><span class='smallText itemLabel' ng-if='item.typename'>{1} {2}</span>", touch.name, dt, touch.typename);

            //keep for testing date-time sorts
            //var tm = $filter('time')(new Date(touch.dateStart), 'longTime');
            //var item = String.format("{0}<br /><span class='smallText itemLabel' ng-if='item.typename'>{1} {3} {2}</span>", touch.name, dt, touch.typename, tm);
        }
        return item

    };
})

.filter('tagItem', function ($filter) {
    return function (tag) {
        if (tag == null) { return ""; }
        var typename = " ";
        if (tag.typename && tag.typename != "" && tag.typename.trim() != "Tags") typename = tag.typename;

        return String.format("{0}&nbsp;&nbsp;<span class='smallText itemLabel'>{1}</span>", tag.name, typename);

    };
})
.filter('tagItemUpdatable', function ($filter) {
    return function (tag) {
        if (tag == null) { return ""; }
        var typename = " ";
        if (tag.typename && tag.typename != "" && tag.typename.trim() != "Tags") typename = tag.typename;

        var result = String.format("{0}&nbsp;&nbsp;<span class='smallText itemLabel'>{1}</span>", tag.name, typename)
                                + '<ion-option-button class="icon energized  ion-edit" ng-click="editItem(enty)" ng-if="(appUser.licenseStatus == 0)"></ion-option-button>'
                                + '<ion-option-button class="icon assertive  ion-minus-circled" ng-click="removeItem(enty)"></ion-option-button>';

        return result;
    };
})

//entityPeople
.filter('personItem', function ($filter) {
    return function (person) {
        if (!person || person == null) return "";

        var strHtml = "";
        //if (person.imageUrlThumb && person.imageUrlThumb != "") strHtml += "<img src='" + person.imageUrlThumb + "' />";

        strHtml += person.name;

          var current;
          var old;
          if(person.groups){
            for(var i = 0; i < person.groups.length; i++){
              if(person.groups[i].grpType == shuri_enums.grouptype.organization){
                if(!person.groups[i].endDt){
                  old = person.groups[i].startDt;
                  if(!current || old > current){
                    current = old;
                    person.currentOrg = person.groups[i].name;
                  }
                }
              }
            }
          }
        if(person.currentOrg) strHtml += String.format("<br /><span class='smallText'>{0}</span>", person.currentOrg);
 
        return strHtml

    };
})

//used in templates/crud/tag.html; templates/crud/touch.html; templates/directives/docList.html
.filter('lineBreaks', function () {
    return function (text) {
        if (text !== undefined && text !== null && text.replace) return text.replace(/\n/g, '<br />');
    };
})


// NOTE: unable to test unknown functionality in templates/workers/workqueue.html
.filter('isInStatus', function () {
    return function (items, status) {
        var wps = SEnums('workerprocessstatus', status);
        var filtered = [];
        if (items) {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.workerProcessStatus == wps) {
                    //console.log(item.workerProcessStatus);
                    filtered.push(item);
                }
            }
        }
        return filtered;
    };
})

.filter('hasId', function ($filter,appGlobals) {
    return function (entities) {
        if (entities) return $filter("filter")(entities, function (ent) { return ent.id != appGlobals.guidEmpty; });
        else return [];
    };
})

// Filter for parsing an endDt to a readable format
.filter('EndDate', function(){
  return function(endDt){
    return moment(endDt).format('MMM Do, YYYY');;
  }
})

//used in templates/directives/entityEmail.html
.filter('percentage', function ($filter) {
  return function (input) {
    return $filter('number')(input * 100) + '%';
  };
})


//itemEntity
.filter('filterEntitiesByUT', function ($filter) {
    return function (entities, params) {
        return $filter('filter')(entities, function (entity) {
        //console.log(entity.typename, params.utName, entity.userType_Id, params.utId);
            return ((entity.changeType != 2) && (entity.typename == params.utName || entity.userType_Id == params.utId))
        });
    };
});
