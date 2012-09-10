/*global IMPORTS */
"use strict";

//...
//... Load the Foundations library and create
//... short-hand references to some of its components.
//...
var _ = IMPORTS.underscore._;
var Foundations = IMPORTS.foundations;
var Transport = IMPORTS["mojoservice.transport"];
var Json = IMPORTS["foundations.json"];
var XML = IMPORTS["foundations.xml"];
var Calendar = IMPORTS.calendar;
var IO = IMPORTS["calendar.io"];
var stringify = IO.stringify;
var Utils = IO.Utils;
IO = IO.IO;

var AjaxCall = Foundations.Comms.AjaxCall;
var Assert = Foundations.Assert;
var Class = Foundations.Class;
var DB = Foundations.Data.DB;
var Future = Foundations.Control.Future;
var mapReduce = Foundations.Control.mapReduce;
var ObjectUtils = Foundations.ObjectUtils;
var PalmCall = Foundations.Comms.PalmCall;
var StringUtils = Foundations.StringUtils;

//Simple base64 encoder/decoder using node buffers - used to encode password
var Base64 = {
   encode : function (utf8Data) {
      var localBase64 = new Buffer(utf8Data, 'utf8');
      return localBase64.toString('base64');
   },

   decode : function (base64Data) {
      var localUTF8 = new Buffer(base64Data, 'base64');
      return localUTF8.toString('utf8');
   }
};

var logobj = function (obj) {
    console.log(JSON.stringify(obj));
};

var isEmpty = function (ob) {
    var i;
    for(i in ob) {
        if (ob.hasOwnProperty(i)) {
        return false;
        }
    }
    return true;
}

