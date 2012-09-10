/* vim: set sw=8 tabstop=4 : */
"use strict";

// Keys here are keys from ical.js, values are keys in db8
var mappingtable = {
    "summary"     : "subject",
    "description" : "note",
    "url"         : "url",
    "location"    : "location"
};

var noop = function (argument) {
    return argument;
};

var convertDate = function (date) {
    // TODO Error checking
    return date.valueOf();
};

var convertEvent = function (event, defaults) {

    if(event.start === undefined) {
        console.log("Warning event missing startdate:");
        logobj(event);
    } else {
        var result = {},
            key,
            tmp;

        if (defaults !== undefined) {
            result = _.clone(defaults);
        }

        result.dtstart = convertDate(event.start);
        if(event.end !== undefined) {
            result.dtend = convertDate(event.end);
        } else {
            console.log("Omitting enddate for:");
            logobj(event);
        }

        for (key in event) {
            if (event.hasOwnProperty(key)) {
                tmp = mappingtable[key];
                if (tmp !== undefined) {
                    result[tmp] = event[key];
                }
            }
        }

        return result;
    }
};
