// ==UserScript==
// @name           Instant Video
// @namespace      instantvideo
// @version        1.0
// @description    Redirects gfycat.com and oddshot.tv links to the raw video files.
// @downloadURL    https://github.com/CasualX/UserScripts/raw/master/instantvideo.user.js
// @updateURL      https://github.com/CasualX/UserScripts/raw/master/instantvideo.user.js
// @match          https://www.gfycat.com/*
// @match          https://gfycat.com/*
// @match          http://www.gfycat.com/*
// @match          http://gfycat.com/*
// @match          http://oddshot.tv/shot/*
// @grant          none
// @run-at         document-end
// ==/UserScript==

var source = document.querySelector("video>source");
if ( source ) {
  window.location.replace( source.src );
}
