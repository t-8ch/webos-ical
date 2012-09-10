#!/bin/bash

FROM=$1
TO=$2

HEADER='/*
* Tweaked for WebOS
* Upstream URL: https://github.com/peterbraden/ical.js
* License: unknown
*
* TODO:
* make modification unnecessary
*/

'

echo "$HEADER" > "$TO"
cat "$FROM" | sed "8ivar ical = new function() {" | sed 's/exports\./this\./g' >> "$TO"
echo "};" >> "$TO"
