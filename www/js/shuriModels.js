
//---Enums -----------------------------------------------------------------------
var shuri_enums = {
    auditType: { sql: 0, system: 1, services: 2, api: 3, error: 4, delete: 5 },
    changetype: { none: 0, update: 1, remove: 2 },
    contactpointprimitive: { unknown: 0, email: 1, phone: 2, url: 3, smhandle: 4 },
    documentprimitive: { none: 0, file: 1, customText: 2, customlongtext: 3, custominteger: 4, customfloat: 5, custombinary: 6, customdate: 7, ratingyesno: 8, ratingyesnomaybe: 9, rating0to5: 10, rating0to100: 11, currency: 12, object: 13, credentials: 14, uniqueidentifier: 15 },
    entitytypes: { all: -1, contactpoint: 0, document: 1, group: 2, location: 3, person: 4, tag: 5, touch: 6, ref: 7, usertype: 8, organization: 9, team: 10, private: 11, subscription: 12, personteam: 13, user: 14, subscriber: 15, usage: 16 },
    grouptype: { private: 0, collection: 1, team: 2, organization: 3 },
    licenselevel: { none: 0, free: 1, professional: 2, enterprise: 3 },
    licensestatus: {  ok: 0, grace: 1, shutdown: 2},
    paytype: { comp: 0, store: 1 },
    querydatatype: { text: 0, binary: 1, numeric: 2, date: 3 },
    queryoperator: { equals: 0, isTrue: 1, isFalse: 2, begins: 3, contains: 4, between: 5, isGreaterThan: 6, isGreaterOrEqual: 7, isLessThan: 8, isLessOrEqual: 9 },
    reviewtype: { none: 0, regular: 1, expert: 2 },
    slottype: { none: 0, production: 1, staging: 2, development: 3 },
    subscriptionapprovalstatus: { notrequired: 0, approved: 1, pending: 2, disapproved: 3 },
    subscriptiontype: { demo: 0, private: 1, monthly: 2, annual: 3 },
    touchprimitive: { meeting: 0, timedmeeting: 1, email: 2, trackedemail: 3, twitter: 4, event: 5, mediacapture: 6, update: 7, payment: 8 },
    watchtype: { none: 0, twitterScreenname: 1, twitterId: 2, twitterHashtag: 3 },
    workerprocessstatus: { readywork: 0, inwork: 1, readyreview: 2, inreview: 3, rejected: 4, approved: 5, paid: 6, readyexpert: 7, inexpert: 8, rejectedreview: 9 }
}

function shuri_syncItem(touch) {
    this.id = null;
    this.itemType = 1; //olMailItem = 0,  olAppointmentItem = 1,
    this.platform = "unknown";
    this.folderName = null;
    this.folderId = null;
    this.lastSyncAppt = null;
    this.lastSyncTouch = new Date();

    //persists for mobile
    this.title = "";
    this.startDate = new Date();
    this.endDate = new Date();
    this.url = null;
    this.notes = "";
    this.loc = "";
    this.prevTitle = null;
    this.prevStartDate = null;
    this.prevEndDate = null;

    if (touch) {
        this.title = touch.name;
        this.notes = touch.description;
        this.startDate = new Date(touch.dateStart);
        this.endDate = new Date(touch.dateEnd);
        if (this.startDate >= this.endDate || !this.endDate) {
            this.endDate = moment(this.startDate).add(30, "minutes").toDate();
        }
        if (touch.locations && touch.locations.length > 0) this.loc = touch.locations[0].address;
    }
}

function shuri_syncCalendar() {
    this.id = null;
    this.name = null;
    this.storeId = null;
}

//--Entities
function shuri_contactPoint() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.userType_Id = '00000000-0000-0000-0000-000000000000';
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.changeType = shuri_enums.changetype.update;
    this.deletable = true;
    this.updatable = true;
}

function shuri_document() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.value = ''; //4000 char max
    this.userType_Id = '00000000-0000-0000-0000-000000000000';
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.changeType = shuri_enums.changetype.update;
    this.deletable = true;
    this.updatable = true;
    this.createdDt = new Date();
}

function shuri_group() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.grpType = shuri_enums.grouptype.private;
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.changeType = shuri_enums.changetype.update;
    this.contactPoints = [];
    this.documents = [];
    this.groups = [];
    this.locations = [];
    this.people = [];
    this.tags = [];
    this.touches = [];
    this.userTypes = [];
    this.deletable = true;
    this.updatable = true;
    //tenure
    this.title = '';
    this.startDt = new Date();
    this.endDt = null;
}

function shuri_location(locToClone) {
    if (locToClone) {
        this.id = locToClone.id;
        this.userType_Id = locToClone.userType_Id;
        this.address = locToClone.address;
        this.country = locToClone.country;
        this.postal = locToClone.postal;
        this.city = locToClone.city;
        this.state = locToClone.state;
        this.street = locToClone.street;
        this.latitude = locToClone.latitude;
        this.longitude = locToClone.longitude;
        this.place_Id = locToClone.place_Id;
        this.ownedBy_Id = locToClone.ownedBy_Id;
        this.ownedByGroup_Id = locToClone.ownedByGroup_Id;
        this.collection_Id = locToClone.collection_Id;
        this.changeType = locToClone.changeType;
        this.deletable = locToClone.deletable;
        this.updatable = locToClone.updatable;
    }
    else {
        this.id = '00000000-0000-0000-0000-000000000000';
        this.userType_Id = 'fc5b3e5d-9f76-44df-8cbb-e0b000f114a6'; //business
        this.address = '';  //512 char max
        this.country = ''; //140 char max
        this.postal = '';
        this.city = '';
        this.state = '';
        this.street = '';
        this.latitude = 0;
        this.longitude = 0;
        this.place_Id = '';
        this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
        this.ownedByGroup_Id = '00000000-0000-0000-0000-000000000000';
        this.collection_Id = '00000000-0000-0000-0000-000000000000';
        this.changeType = shuri_enums.changetype.update;
        this.modifiedDate = new Date();
        this.deletable = true;
        this.updatable = true;

    }
}


function shuri_person() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.firstname = '';   //140 char max
    this.middlename = '';  //140 char max
    this.lastname = '';    //140 char max
    this.nickname = '';    //140 char max
    this.name = '';    // ignored for post
    this.prefix = '';  //50 char max
    this.suffix = '';  //50 char max
    this.imageUrl = '';    //140 char max
    this.userType_Id = '00000000-0000-0000-0000-000000000000';
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.primaryCP_Id = '00000000-0000-0000-0000-000000000000';
    this.securityCP_Id = '00000000-0000-0000-0000-000000000000';
    this.changeType = shuri_enums.changetype.update;
    this.deletable = true;
    this.updatable = true;
    this.contactPoints = [];
    this.documents = [];
    this.groups = [];
    this.locations = [];
    this.tags = [];
    this.touches = [];
    //tenure
    this.title = '';
    this.startDt = new Date();
    this.endDt = null;

}

function shuri_subscription() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.group_Id = '00000000-0000-0000-0000-000000000000';
    this.availableToGroup_Id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.active = true;
    this.startDt = RoundDate(new Date(), 1);
    this.value = 0;
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.subscribers = [];
    this.subType = shuri_enums.subscriptiontype.private;
    this.approvalStatus = shuri_enums.subscriptionapprovalstatus.pending;
    this.changeType = shuri_enums.changetype.update;
    this.deletable = true;
    this.updatable = true;
    this.productId = "";        //140 char max
}

function shuri_subscriber() {
    this.person_Id = '00000000-0000-0000-0000-000000000000';
    this.subscription_Id = '00000000-0000-0000-0000-000000000000';
    this.paymentType = shuri_enums.paytype.store;
    this.active = true;
    this.startDt = moment.utc(new Date())._i
    this.endDt = moment.utc(new Date(2080, 05))._i
    this.receipt = "";          //4000 char max
    this.signature = "";        //512 char
    this.productId = "";
    this.transactionId = "";    //512 char

}

function shuri_tag(tagToClone) {
    if (tagToClone) {
        this.id = tagToClone.id;
        this.name = tagToClone.name;
        this.description = tagToClone.description;
        this.userType_Id = tagToClone.userType_Id;
        this.typename = tagToClone.typename;
        this.ownedBy_Id = tagToClone.ownedBy_Id;
        this.changeType = tagToClone.changeType;
        this.deletable = tagToClone.deletable;
        this.updatable = tagToClone.updatable;
    }
    else {
        this.id = '00000000-0000-0000-0000-000000000000';
        this.name = '';  //140 char max
        this.description = ''; //4000 char max
        this.userType_Id = 'A2E53FB1-8120-4A90-9422-0D5A3B3C959D'; //default
        this.typename = ' Tags';//default
        this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
        this.changeType = shuri_enums.changetype.update;
        this.deletable = true;
        this.updatable = true;
    }
}

function shuri_touch() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.userType_Id = '00000000-0000-0000-0000-000000000000';
    this.dateStart = RoundDate(new Date(), 1);
    this.dateEnd = null;
    this.dateSchedule = null;
    this.dateSent = null;
    this.isScheduled = false;
    this.from = '';  //140 char max
    this.replyTo = '';  //140 char max
    this.descriptDoc_Id = '00000000-0000-0000-0000-000000000000';
    this.location_Id = '00000000-0000-0000-0000-000000000000';
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.contactPoints = [];
    this.documents = [];
    this.groups = [];
    this.people = [];
    this.tags = [];
    this.deletable = true;
    this.updatable = true;
    this.changeType = shuri_enums.changetype.update;
}

function shuri_userType() {
    this.id = '00000000-0000-0000-0000-000000000000';
    this.name = '';  //140 char max
    this.codeName = '';  //50 char max
    this.value = ''; //4000 char max
    this.icon = '';  //140 char max - an ionic icon
    this.entityType = -1;
    this.primitive = 0;
    this.forPeople = false;
    this.forOrgs = false;
    this.forTouches = false;
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.tags = [];
    this.changeType = shuri_enums.changetype.update;

}

function shuri_watchedItem() {
    this.entityName = '';  //140 char max
    this.entityType = -1;
    this.entity_Id = '00000000-0000-0000-0000-000000000000';
    this.ownedBy_Id = '00000000-0000-0000-0000-000000000000';
    this.userType_Id = '00000000-0000-0000-0000-000000000000';
    this.subscription_Id = '00000000-0000-0000-0000-000000000000';
    this.watchType = 0;
    this.watchValue = ''; //140 char max
}

function shuri_query() {
    this.entityType = -1;
    this.summary = "";
    this.collectionIds = [];
    this.groupIds = [];
    this.groups = [];
    this.orgIds = [];
    this.organizations = [];
    this.ownerIds = [];
    this.owners = [];
    this.personIds = [];
    this.people = [];
    this.tagIds = [];
    this.tagIdsAll = [];
    this.teamIds = [];
    this.teams = [];
    this.touchIds = [];
    this.usertypeIds = [];
    this.queryItems = [];
    this.locationItems = [];
    this.timePeriod = "alltime";
    this.dateEndUTC = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    this.dateStartUTC = moment().utc().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    this.proximity = new shuri_proximityItem();
    this.recordType = 0;
    this.pagesize = 40;
    this.page = 0;
    this.updatable = true;

    this.equals = function (qry) {
    }
}

function shuri_proximityItem() {
  this.point = '';
  this.distanceKM = "false";
  this.distance = "10.0";
  this.address = "";
}

function shuri_queryItem() {
    this.field = ''; //50 char max
    this.operator = -1;
    this.value = ''; //140 char max
}
