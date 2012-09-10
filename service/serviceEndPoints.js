//JSLint options:
/*jslint sub: true, nomen:true */
/*global _ , Future , isEmpty , ical, AjaxCall, Transport, Base64, PalmCall, convertEvent */

//***************************************************
// Validate calendar username/password 
//***************************************************
// To debug on this service you can novaterm into the device or emulator and use
// run-js-service -d /media/cryptofs/apps/usr/palm/services/de.t8ch.webosical.service/
// To view the console.log outputs.

"use strict";

var now = function () {
    return new Date().valueOf();
};

var syncCal = function (cal) {
    console.log("syncCal: " + JSON.stringify(cal));

    var accountId = cal["accountId"],
        calendarId  = cal["_id"],
        fDel        = new Future(),
        fUrl        = new Future(),
        fConverted  = new Future(),
        deleteQuery = {
            "from": "de.t8ch.webosical.calendarevent:1",
            "where": [{
                "prop": "calendarId",
                "op": "=",
                "val": calendarId
            }]
        };

    // delete old events
    PalmCall.call("palm://com.palm.db/", "del",
                  { "query": deleteQuery }).then(function (future) {
        console.log("delete old: " + JSON.stringify(future.result));
    });

     // get calendar URL from keymanager
    PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
                  {"keyname" : "ical-url-" + accountId}
        ).then(function (query) {
        fUrl.result = Base64.decode(query.result.keydata);
    });

    // get converted events, ready to store
    fUrl.then(function (future) {
        console.log("Getting file from " + fUrl.result);
        AjaxCall.get(fUrl.result).then(function (request) {
                // Called two times, WTF
                // getResponseHeader
            console.log(request.result.getAllResponseHeaders());
            var rawEvents = ical.parseICS(request.result.responseText),
                eventDefaults = {
                    "_kind": "de.t8ch.webosical.calendarevent:1",
                    "calendarId": calendarId,
                    "accountId": accountId
                },
                convertEventWithDefaults = function (event) {
                    return convertEvent(event, eventDefaults);
                };

            fConverted.result = _.map(
                // does _.isEmpty() work?
                _.reject(rawEvents, _.isEmpty),
                convertEventWithDefaults
            );
        });
    });

    // insert events, mark calendar updated
    // TODO use transport, else we're losing our calendarobject
    fDel.then(fConverted.then(function (future) {
        var newEvents = fConverted.result,
            newCal = cal;

        newCal["_id"] = cal["_id"];
        newCal["nextDate"] = cal.nextDate + 21600; // 6 hours

        PalmCall.call("palm://com.palm.db/", "put",
                      {"objects": newEvents}).then(function (f) {
            console.log("Inserted " + f.result.results.length + " events");
        });

        console.log("Updating nextDate");

        PalmCall.call("palm://com.palm.db/", "merge",
                      {"objects": [newCal]}).then(function (f) {
            console.log("Merging" + JSON.stringify(f.result));
        });
    }));
};

var checkCredentialsAssistant = function (future) {
};

checkCredentialsAssistant.prototype.run = function (future) {

    var logInArgs = this.controller.args,
        url = logInArgs.username,
        // https://developer.palm.com/content/api/reference/javascript-libraries/foundations/foundations-comms-ajax-call.html
        // TODO use for all requests
        options = {
            "headers": {
                "Accept" : "text/calendar"
            }
        },
        // https://developer.palm.com/content/api/dev-guide/synergy/account-manager.html#synergy-service-error-codes
        error = {
            returnValue: false,
            "errorCode": "500_SERVER_ERROR"
        };

    if (url.substr(0, 4) !== "http") {
        url = "http://" + url;
    }

    console.log("this.controller.args=" + JSON.stringify(this.controller.args));

    // TODO check response for text/calendar
    console.log("Connecting to " + url);
    AjaxCall.head(url, options).then(function (request) {
        console.log(JSON.stringify(request.result));

        if (request.result.status === 200) {
            //...Pass back credentials and config (username/password); config is passed to onEnabled where
            //...we will save username/password in encrypted storage
            future.result = {
                returnValue: true,
                "credentials": {
                    "common": {
                        "username": url,
                        "password": "ignored"
                    }
                },
                "config": {
                    "username": url,
                    "password": "ignored"
                }
            };
        } else {
            // TODO
            console.log("Connection failed");
            future.result = error;
        }
    },
    // Errorhandler
    function(request) {
        console.log("--> " + request.exception);
        future.result = error;
    });
};


//***************************************************
// Capabilites changed notification
//***************************************************
var onCapabilitiesChangedAssistant = function (future) {};

// 
// Called when an account's capability providers changes. The new state of enabled 
// capability providers is passed in. This is useful for transports that handle all syncing where 
// it is easier to do all re-syncing in one step rather than using multiple 'onEnabled' handlers.
//

onCapabilitiesChangedAssistant.prototype.run = function (future) {

    var args = this.controller.args;
    console.log("#------&&-----# Test Service: onCapabilitiesChanged args =" + JSON.stringify(args));
    future.result = {
        returnValue: true
    };
};

//***************************************************
// Credentials changed notification 
//***************************************************
var onCredentialsChangedAssistant = function (future) {};
//
// Called when the user has entered new, valid credentials to replace existing invalid credentials. 
// This is the time to start syncing if you have been holding off due to bad credentials.
//
onCredentialsChangedAssistant.prototype.run = function (future) {
    var args = this.controller.args;
    console.log("#------&&-----#Sample Service: onCredentialsChanged args =" + JSON.stringify(args));
    future.result = {
        returnValue: true
    };
};


//***************************************************
// Account created notification
//***************************************************
var onCreateAssistant = function (future) {};

//
// The account has been created. Time to save the credentials contained in the "config" object
// that was emitted from the "checkCredentials" function.
// Even though we are not hitting an actual site to authenticate, this is how you would store the u/p 
// for future use 
onCreateAssistant.prototype.run = function (future) {
    console.log("#------&&-----# OnCreate");

    var args = this.controller.args,
        B64username = Base64.encode(args.config.username),
        B64password = Base64.encode(args.config.password),
        keystore1 = {
            "keyname": "ical-url-" + args.accountId,
            "keydata": B64username,
            "type": "AES",
            "nohide": true
        },
        keystore2 = {
            "keyname": "ical-pw-" + args.accountId,
            "keydata": B64password,
            "type": "AES",
            "nohide": true
        };

    console.log("#------&&-----# " + JSON.stringify(args));

    //...Save encrypted username/password for syncing.
    PalmCall.call("palm://com.palm.keymanager/", "store", keystore1).then(function (f) {
        if (f.result.returnValue === true) {
            PalmCall.call("palm://com.palm.keymanager/", "store", keystore2).then(function (f2) {
                future.result = f2.result;
            });
        } else {
            future.result = f.result;
        }
    });
    future.result = {
        returnValue: true
    };
};

//***************************************************
// Account deleted notification
//***************************************************
var onDeleteAssistant = function (future) {};

//
// Account deleted - transport should delete account and config information here.
//

onDeleteAssistant.prototype.run = function (future) {
    console.log("#------&&-----# OnDelete");

    //..Create query to delete contacts from our extended kind associated with this account
    var args = this.controller.args,
        calquery = {
            "query": {
                "from": "de.t8ch.webosical.calendar:1",
                "where": [{
                    "prop": "accountId",
                    "op": "=",
                    "val": args.accountId
                }]
            }
        },
        eventquery = {
            "query": {
                "from": "de.t8ch.webosical.calendarevent:1",
                "where": [{
                    "prop": "accountId",
                    "op": "=",
                    "val": args.accountId
                }]
            }
        };

    PalmCall.call("palm://com.palm.keymanager/", "remove",
                  {"keyname": "ical-url-" + args.accountId});
    PalmCall.call("palm://com.palm.keymanager/", "remove",
                  {"keyname": "ical-pw-" + args.accountId});

    PalmCall.call("palm://com.palm.db/", "del", calquery).then(function (f) {
        console.log("deleted " + f.result.count + " calendar");});

    //...Delete contacts from our extended kind
    PalmCall.call("palm://com.palm.db/", "del", eventquery).then(function (f) {
        console.log("deleted " + f.result.count + " events");
        future.result = f.result;
    });
};

//*****************************************************************************
// Capability enabled notification - called when capability enabled or disabled
//*****************************************************************************
var onEnabledAssistant = function (future) {};

//
// Transport got 'onEnabled' message. When enabled, a sync should be started and future syncs scheduled.
// Otherwise, syncing should be disabled and associated data deleted.
// Account-wide configuration should remain and only be deleted when onDelete is called.
// 

onEnabledAssistant.prototype.run = function (future) {

    var args = this.controller.args,
        acctId,
        ids,
        myCal,
        adCal,
        syncRec;

    if (args.enabled === true) {
        // First step lest create a new calendar

        console.log("#------&&-----# OnEnabled Transport enabled " + args.accountId);
        acctId = args.accountId;
        ids = [];

        myCal = {
            "_kind": "de.t8ch.webosical.calendar:1",
            "nextDate" : (now() - 1), // force first sync
            "accountId": acctId,
            "name": 'ical',
            "isReadOnly": true,
            "excludeFromAll": false,
            "color": 'green'
        };


        adCal = {
            "objects": [myCal]
        };
        PalmCall.call("palm://com.palm.db/", "put", adCal).then(function (f) {
            if (f.result.returnValue === true) {
                console.log("#------&&-----# Calendar created (" + f.result.results.length + " elements ");
            } else {
                future.result = f.result;
            }
        });
    }

    future.result = {
        "returnValue": true
    };
};


//***************************************************
// Sync function
// In this example the sync function will only be called once as we didn't setup any
// addition calls using the activity manager.
//***************************************************
var syncAssistant = function (future) {};
/*
 * TODO
 * First we query for all calendars which nextDate ist in the past.
 * Then we extract the IDs and call syncCal() with each calendar
 */

syncAssistant.prototype.run = function (future) {
    console.log("Syncing " + JSON.stringify(this.controller.args));

    var accountId = this.controller.args.accountId,
        q = {
        "query": {
            "from": "de.t8ch.webosical.calendar:1",
            "where": [
            //    "prop": "nextDate",
            //    "op": "<=",
            //    "val": now()
            //},
            {
                  "prop": "accountId",
                  "op": "=",
                  "val": accountId
            }]
        }
    };

    PalmCall.call("palm://com.palm.db/", "find", q).then(function (queryfuture) {
        console.log(JSON.stringify(queryfuture.result));
        if (queryfuture.result.returnValue === true) {
            syncCal(queryfuture.result.results[0]);
        } else {
            future.result = queryfuture.result;
        }
    });

    future.result = true;
};
