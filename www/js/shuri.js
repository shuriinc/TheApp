//utilities
function UTCNow() {
    var now = new Date();
    console.log(now, now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
}

function HtmlToPlaintext(text) {
    return text ? String(text).replace(/<[^>]+>/gm, '') : '';
}

function IsMinDate(stringDate) {
  result = false;
  if (stringDate && stringDate.length > 4 && stringDate.substring(0, 4) === "0001") result = true;
  return result;

}

function RoundDate(date, nearestMinutes) {
    var coeff = 1000 * 60 * nearestMinutes;
    return new Date(Math.round(date.getTime() / coeff) * coeff);
}

function RoundMoment(date, duration, method) {
    return moment(Math[method]((+date) / (+duration)) * (+duration));
}

function DateTimeStampString() {
    var date = new Date();
    //var sdate = date.toISOString();
    //console.log(sdate);
    //return sdate.replaceAll(" ", "-").replaceAll("T", "-").replaceAll("Z", "").replaceAll(":", "").substring(0, 17);
    var day = date.getDate();
    var monthIndex = date.getMonth() + 1;
    var year = date.getFullYear();
    var tm = date.toTimeString().replaceAll(":", "").substring(0, 6);
    return String.format("{0}-{1}-{2}-{3}", year, monthIndex, day, tm);

}
function RandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
function FileIcon(filename) {
    var icon = "ion-document";
    if (filename) {
        filename = filename.toLowerCase();

        if (filename.match(/\.(jpg|jpeg|png|gif)$/)) {
            icon = "ion-image";
        }
        else if (filename.toLowerCase().match(/\.(avi|mov|mp4|mpeg|qt)$/)) {
            icon = "ion-videocamera";
        }
        else if (filename.toLowerCase().match(/\.(au|midi|mp3|ogg|wav)$/)) {
            icon = "ion-mic-a";
        }
        else if (filename.toLowerCase().match(/\.(doc|docx)$/)) {
            icon = "shuri-file-word";
        }
        else if (filename.toLowerCase().match(/\.(xls|xlsx|csv)$/)) {
            icon = "shuri-file-excel";
        }
        else if (filename.toLowerCase().match(/\.(json|js)$/)) {
            icon = "ion-social-nodejs";
        }
        else if (filename.toLowerCase().match(/\.(pdf)$/)) {
            icon = "shuri-file-pdf";
        }
        else if (filename.toLowerCase().match(/\.(rtf|txt)$/)) {
            icon = "ion-document-text";
        }
        else if (filename.toLowerCase().match(/\.(htm|html)$/)) {
            icon = "ion-cloud";
        }
        else if (filename.toLowerCase().match(/\.(ppt|pptx)$/)) {
            icon = "ion-easel";
        }
        else if (filename.toLowerCase().match(/\.(eml)$/)) {
            icon = "ion-email";
        }
}
    return icon;
}

function StripTime(date) {
    if (date) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function SelectText(objId) {
    DeSelectText();
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(objId));
        range.select();
    }
    else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(objId));
        window.getSelection().addRange(range);
    }
}

function DeSelectText() {
    if (document.selection) document.selection.empty();
    else if (window.getSelection)
        window.getSelection().removeAllRanges();
}


if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
              ? args[number]
              : match
            ;
        });
    };
}

String.prototype.insert = function (index, string) {
    if (index > 0)
        return this.substring(0, index) + string + this.substring(index, this.length);
    else
        return string + this;
};

String.prototype.replaceAll = function (s, r) { return this.split(s).join(r) }

function ArrayContains(array, obj) {
    //console.log("Looking for object in array", obj, array);
    for (var i = 0; i < array.length; i++) {
        if (array[i] == obj) {
            //console.log("Found object in array", obj, array);
            return true;
        }
    }
    return false;
}

function ArrayContainsById(array, id) {
    //console.log("Matching .id in array objects", id, array);
    for (var i = 0; i < array.length; i++) {
        if (array[i].id && array[i].id.toLowerCase() == id.toLowerCase()) {
            return true;
        }
    }
    return false;
}

function RemoveIdFromIDs(idsArray, id) {
    for (var i = 0; i < idsArray.length; i++) {
        if (idsArray[i] === id) {
            break;
        }
    }
    if (i < idsArray.length) idsArray.splice(i, 1);
    
}


//returns valid ISO string or null  if date is missing time component, set time to 8:00
function TryParseDate(objDate) {
    var isoDate = null;

    try {
        //is this an Excel date?  i.e. the number of days since 1-1-1900?
        if (angular.isNumber(objDate) && (parseInt(objDate) > -100000 && parseInt(objDate) < 100000)) {
            var xlsDate = new Date(Math.round((objDate - 25569) * 86400 * 1000));
            isoDate = xlsDate.toISOString();
            //console.log(objDate, days, xlsDate, isoDate);
        }
        else {
            var ms = Date.parse(objDate);
            var theDate = new Date(ms);
            if (moment(theDate) === moment(theDate).startOf('day')) {
                objDate += " 8:00am";
                ms = Date.parse(objDate);
                theDate = new Date(ms);
            }

            isoDate = theDate.toISOString();
        }
    }
    catch (e2) { }

    return isoDate;
}

//converter:  SQL provides dates as:2014-12-21T17:40:50.973
function SQLDate2JS(sqlDate) {
    try{
        if (!sqlDate) return null;
        else if (sqlDate.toString().indexOf("T") < 0) {
            //console.log("Invalid SQL Date string");
            return null;
        }
        else if (sqlDate.indexOf) {
            sqlDate = sqlDate.replaceAll("z", "").replaceAll("Z","");
            var dt = sqlDate.substring(0, sqlDate.indexOf("T"));
            var tm = sqlDate.substring(sqlDate.indexOf("T") + 1, sqlDate.length);

            var dtArray = dt.split("-");
            var sYear = dtArray[0];
            var sMonth = (dtArray[1] - 1);  //0-based months
            var sDay = dtArray[2];

            var tmArray = tm.split(":");
            var sHour = tmArray[0];
            var sMinute = tmArray[1];

            var sSecond = 0;
            var sMillisecond = 0;
            var secArray = tmArray[2].split(".");

            try {
                sSecond = secArray[0];
                sMillisecond = parseInt((secArray.length > 1) ? secArray[1] : 0);
            }
            catch (ex) { }
            var newDate = new Date(sYear, sMonth, sDay, sHour, sMinute, sSecond, sMillisecond);

            //console.log(sqlDate, sYear, sMonth, sDay, sHour, sMinute, sSecond, sMillisecond);
            return newDate;
        }
    }
    catch (e) { console.error(e); return null; }
}

function IsValidInput(value, vtype) {
    var validationResult = undefined;
    switch (vtype) {
        case "email":
            validationResult = validate.single(value, { email: true });
            break;
        case "int":
            validationResult = validate.single(value, { numericality: { onlyInteger: true, strict: true } });
            break;
        case "number":
            validationResult = validate.single(value, { numericality: { strict: true } });
            break;
        case "tel":
            //assume html5 validated
            if (value === undefined) validationResult = "Invalid phone per the browser HTML5";
            //var pattern = /[\+]\d{2}[\(]\d{2}[\)]\d{4}[\-]\d{4};/i; //  title='Phone Number (Format: +99(99)9999-9999)'
            //if (!pattern.test(value)) validationResult = "failed tel pattern match";
            break;
        case "url":
            validationResult = validate.single(value, { url: true });
            break;
    }
    if (validationResult === undefined) return true;
    else {
        //console.error(validationResult);
        return false;
    }
}

function ZeroFill(number, length) {
    var zeros = "000000000000000";
    if (number == undefined) number = 0;
    var sNo = number.toString();

    return zeros.substring(0, length - sNo.length) + sNo;
}

//ROUNDING EXTENSIONS to Math from Mozilla
// Closure
(function () {
    /**
     * Decimal adjustment of a number.
     *
     * @param {String}  type  The type of adjustment.
     * @param {Number}  value The number.
     * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
     * @returns {Number} The adjusted value.
     */
    function decimalAdjust(type, value, exp) {
        // If the exp is undefined or zero...
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](value);
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        // Shift
        value = value.toString().split('e');
        value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    // Decimal round
    if (!Math.round10) {
        Math.round10 = function (value, exp) {
            return decimalAdjust('round', value, exp);
        };
    }
    // Decimal floor
    if (!Math.floor10) {
        Math.floor10 = function (value, exp) {
            return decimalAdjust('floor', value, exp);
        };
    }
    // Decimal ceil
    if (!Math.ceil10) {
        Math.ceil10 = function (value, exp) {
            return decimalAdjust('ceil', value, exp);
        };
    }
})();
