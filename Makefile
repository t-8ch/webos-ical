APPID=de.t8ch.webosical
NOVATERM=novaterm
DEBUGCMD=run-js-service -d /media/cryptofs/apps/usr/palm/services/$(APPID).service/

.PHONY: all uninstall package install

all: uninstall install

uninstall:
	palm-install -r $(APPID) || exit 0

package: service/ical.js
	palm-package app package service accounts

install: package
	palm-install $(APPID)*.ipk

service/ical.js: lib/ical.js/ical.js
	./generate_ical.sh $^ $@

debug:
	echo $(DEBUGCMD) | $(NOVATERM)
