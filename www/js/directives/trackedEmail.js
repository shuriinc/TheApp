(function () {
    'use strict';

    angular.module("shuriApp").directive('trackedEmail', ['$state', '$filter', '$q', 'globals', 'dataApi', 'appGlobals', trackedEmail]);

    function trackedEmail($state, $filter, $q, globals, dataApi, appGlobals) {
        return {
            restrict: "E",
            scope: {
                touch: '='
            },
            templateUrl: "templates/directives/trackedEmail.html?" + _cacheBuster,
            link: function (scope, elem, attrs) {
                scope.title = "Email Tracking";
                var watcherP = scope.$watch('touch', function () {
                    if (scope.touch === undefined || !scope.touch) return;
                    if (scope.touch.dateSent === null) return;
                    if (scope.touch.userType_Id != appGlobals.utConstants.tch_emailTracked) console.error("Not a tracked email.");
                    if (scope.touch.dateSent) scope.isSent = true;
                    scope.sends = [];
                    scope.opens = [];
                    scope.delivers = [];
                    scope.fails = [];
                    scope.clickThrus = [];
                    scope.pcts = {};

                    $q.all({
                        dataP: dataApi.getPeopleForEntity(shuri_enums.entitytypes.touch, scope.touch.id, 500, 1),
                        dataO: dataApi.getOrgsForEntity(shuri_enums.entitytypes.touch, scope.touch.id, 500, 1)
                    }).then(function (d) {
                        console.log(d);
                        //------------PEOPLE
                        d.dataP.forEach(function (per) {
                            var personSent = false;
                            per.documents.forEach(function (doc) {
                                console.log(doc);
                                if (doc.userType_Id == appGlobals.utConstants.doc_emailTracking && !personSent) {
                                    //Tracking doc found
                                    personSent = true;
                                    if (doc.value && doc.value != "") {
                                        per.tracker = angular.fromJson(doc.value);
                                        //console.log(per.tracker);
                                        if (per.tracker.opened) {
                                            per.tracker.dateString = moment(per.tracker.openDate).format("MMM DD Y hh:mm a");
                                            scope.opens.push(per);
                                            updateClickThrus(per);
                                        }
                                        else if (per.tracker.delivered == "false" || per.tracker.delivered == false) scope.sends.push(per);
                                        else if (per.tracker.delivered == true || (per.tracker.sent && per.tracker.delivered == undefined)) scope.delivers.push(per);
                                        else {
                                            //console.log(per.tracker);
                                            per.failReason = "unable to deliver";
                                            scope.fails.push(per);
                                        }
                                    }
                                    else {
                                        per.failReason = "unable to send";
                                        scope.fails.push(per);
                                    }
                                }
                            });
                            if (!personSent) {
                                per.failReason = "unable to send";
                                scope.fails.push(per);
                            }
                        });

                        //------------ORGS
                        d.dataO.forEach(function (org) {
                            var orgSent = false;
                            org.documents.forEach(function (doc) {
                                if (doc.userType_Id == appGlobals.utConstants.doc_emailTracking) {
                                    //Tracking doc found
                                    orgSent = true;
                                    if (doc.value && doc.value != "") {
                                        org.tracker = angular.fromJson(doc.value);

                                        if (org.tracker.opened) {
                                            org.tracker.dateString = moment(org.tracker.openDate).format("MMM DD Y hh:mm a");
                                            scope.opens.push(org);
                                            updateClickThrus(org);
                                        }
                                        else if (org.tracker.delivered == "false") scope.sends.push(org);
                                        else if (org.tracker.delivered == true || (org.tracker.sent && org.tracker.delivered == undefined)) scope.delivers.push(org);
                                        else {
                                            org.failReason = "unable to deliver";
                                            scope.fails.push(org);
                                        }
                                    }
                                    else {
                                        org.failReason = "unable to send";
                                        scope.fails.push(org);
                                    }
                                }
                            });
                            if (!orgSent) {
                                org.failReason = "unable to send";
                                scope.fails.push(org);
                            }

                        });
                        scope.totalSent = (scope.opens.length + scope.delivers.length + scope.sends.length + scope.fails.length);
                        scope.pcts.send = parseInt((scope.sends.length / scope.totalSent) * 100);
                        scope.pcts.open = parseInt((scope.opens.length / scope.totalSent) * 100);
                        scope.pcts.deliver = parseInt((scope.delivers.length / scope.totalSent) * 100);
                        if (isNaN(scope.pcts.send)) scope.pcts.send = 0;
                        if (isNaN(scope.pcts.open)) scope.pcts.open = 0;
                        if (isNaN(scope.pcts.deliver)) scope.pcts.deliver = 0;

                        scope.clickThrus.forEach(function (ct) {
                            ct.percentage = (parseInt((ct.entities.length / scope.totalSent) * 1000)/10.0);
                        });
                        console.log(scope.totalSent, scope.pcts, scope.delivers, scope.fails, scope.clickThrus);
                    });
                });

                scope.goto = function (entity) {
                    console.log(entity);
                    if (entity.lastname) {
                        //person
                        $state.go("home.person", { personId: entity.id });

                    }
                    else {
                        //org
                        $state.go("home.org", { groupId: entity.id });
                    }
                }

                function updateClickThrus(entity) {
                    //console.log(entity);

                    if (entity && entity.tracker && (entity.tracker.clickthrus || entity.tracker.clickThrus)) {
                        var cts;
                        if (entity.tracker.clickthrus) cts = entity.tracker.clickthrus;
                        else cts = entity.tracker.clickThrus
                        cts.forEach(function (ct) {
                            //console.log(ct);
                            var scpClickThru;
                            var scpClickThrus = $filter("filter")(scope.clickThrus, function (scopeCT) { return scopeCT.url === ct.url; });
                            if (scpClickThrus.length == 0) {
                                scpClickThru = { url: ct.url, entities: [], displayUrl: ct.url.replace("http://", "").replace("https://", "").replace("HTTP://", "").replace("HTTPS://", "") };
                                scope.clickThrus.push(scpClickThru);
                            }
                            else scpClickThru = scpClickThrus[0];  //should only be 1 ct

                            scpClickThru.entities.push(entity);
                        });
                    }

                }

                //function refresh(people) {
                //    scope.people = people;
                //    scope.totalSent = scope.statusCount.opened + scope.statusCount.sent;
                //    scope.percentOpened = parseInt((scope.statusCount.opened / scope.totalSent) * 100);
                //    scope.percentSent = parseInt((scope.statusCount.sent / scope.totalSent) * 100);
                //    console.log(scope.statusCount);

                //    scope.clickThrus.forEach(function (ct) { ct.rate = parseInt((ct.people.length / scope.totalSent) * 100) })

                //}




            }
        }
    }
})();

