// ==UserScript==
// @name           GfyCatRedirect
// @namespace      gfycatredirect
// @version        1.0
// @description    Redirects gfycat links to the raw webm
// @downloadURL    https://github.com/CasualX/UserScripts/raw/master/gfycatredirect.user.js
// @updateURL      https://github.com/CasualX/UserScripts/raw/master/gfycatredirect.user.js
// @match          https://www.gfycat.com/*
// @match          https://gfycat.com/*
// @match          http://www.gfycat.com/*
// @match          http://gfycat.com/*
// @grant          none
// @run-at         document-end
// ==/UserScript==

var source_webm = document.querySelector("video>source#webmsource");
var source_mp4 = document.querySelector("video>source#mp4source");

if ( source_webm ) {
  window.location.replace( source_webm.src );
}
else if ( source_mp4 ) {
  window.location.replace( source_mp4.src );
}
