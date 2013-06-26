// ==UserScript==
// @name       	TF2 Profile Script
// @namespace  	tfprofile
// @version    	1.1.0
// @description Mouse over profile links (steamcommunity/etf2l/wireplay/teamfortress.tv) to get links their profiles on otherwebsites
// @downloadURL https://github.com/CasualX/UserScripts/raw/master/tfprofile.user.js
// @updateURL   https://github.com/CasualX/UserScripts/raw/master/tfprofile.user.js
// @include     http://*
// @include     https://*
// @grant		GM_xmlhttpRequest
// @run-at document-end
// ==/UserScript==

// Base conversion of arbitrary precision integers
// Minified from http://danvk.org/hex2dec.html
function convertBase(e,t,n){function r(e,t,n){var r=[];var i=Math.max(e.length,t.length);var s=0;var o=0;while(o<i||s){var u=o<e.length?e[o]:0;var a=o<t.length?t[o]:0;var f=s+u+a;r.push(f%n);s=Math.floor(f/n);o++}return r}function i(e,t,n){if(e<0)return null;if(e==0)return[];var i=[];var s=t;while(true){if(e&1){i=r(i,s,n)}e=e>>1;if(e===0)break;s=r(s,s,n)}return i}function s(e,t){var n=e.split("");var r=[];for(var i=n.length-1;i>=0;i--){var s=parseInt(n[i],t);if(isNaN(s))return null;r.push(s)}return r}var o=s(e,t);if(o===null)return null;var u=[];var a=[1];for(var f=0;f<o.length;f++){if(o[f]){u=r(u,i(o[f],a,n),n)}a=i(t,a,n)}var l="";for(var f=u.length-1;f>=0;f--){l+=u[f].toString(n)}return l}
// Googled this for Chrome compat, minified
function addStyle(e){var t=document.createElement("style");t.type="text/css";t.appendChild(document.createTextNode(e));document.getElementsByTagName("head")[0].appendChild(t)}

//----------------------------------------------------------------
// Steam ID container
function CSteamID()
{
	this.unAccountID = 0;
	this.unAccountInstance = 0;
	this.EAccountType = CSteamID.EAccountType.k_EAccountTypeInvalid;
	this.EUniverse = CSteamID.EUniverse.k_EUniverseInvalid;
}
CSteamID.prototype.setID = function( sid, type, uni )
{
	this.unAccountID = sid;
	this.unAccountInstance = 1;
	this.EAccountType = type || CSteamID.EAccountType.k_EAccountTypeIndividual;
	this.EUniverse = uni || CSteamID.EUniverse.k_EUniversePublic;
}
CSteamID.prototype.setID64 = function( id )
{
	var hex = "0000000000000000" + convertBase( id, 10, 16 );

	// Break down the (hexadecimal) community id
	this.unAccountID = parseInt(hex.substr(-8,8),16);
	this.unAccountInstance = parseInt(hex.substr(-13,5),16);
	this.EAccountType = parseInt(hex.substr(-14,1),16);
	this.EUniverse = parseInt(hex.substr(-16,2),16);
}
CSteamID.prototype.render = function()
{
	// Old style STEAM_0:x:y format
	return "STEAM_0:" + (this.unAccountID%2) + ":" + (this.unAccountID>>1);
}
CSteamID.prototype.toString = function()
{
	function s( num, len )
	{
		var str = num.toString(16);
		return "0000000000000000".substr(0,len-str.length)+str;
	}
	var hex = s(this.EUniverse,2) + s(this.EAccountType,1) + s(this.unAccountInstance,5) + s(this.unAccountID,8);
	return convertBase( hex, 16, 10 );
}
CSteamID.EUniverse = { k_EUniverseInvalid:0, k_EUniversePublic:1, k_EUniverseBeta:2, k_EUniverseInternal:3, k_EUniverseDev:4, k_EUniverseRC:5, k_EUniverseMax:6 };
CSteamID.EAccountType = { k_EAccountTypeInvalid:0, k_EAccountTypeIndividual:1, k_EAccountTypeMultiseat:2, k_EAccountTypeGameServer:3, k_EAccountTypeAnonGameServer:4, k_EAccountTypePending:5, k_EAccountTypeContentServer:6, k_EAccountTypeClan:7, k_EAccountTypeChat:8, k_EAccountTypeP2PSuperSeeder:9, k_EAccountTypeMax:10 };
CSteamID.parse = function( str )
{
	var re, sid = null;
	// SteamID old format, 2nd part is how etf2l formats it.
	if ( re = /^(?:STEAM_)?0\:([01])\:(\d+)$/.exec( str ) )
	{
		sid = new CSteamID();
		sid.setID( parseInt(re[2])*2 + parseInt(re[1]) );
	}
	// Looks like a standard 64bit steamid
	else if ( re = /^\d+$/.exec( str ) )
	{
		sid = new CSteamID();
		sid.setID64( str );
	}
	return sid;
}
//----------------------------------------------------------------

// Find profiles with search engine because they don't have an API...
function searchEngine( site, title, content, fn )
{
	function search( engine )
	{
		GM_xmlhttpRequest( {
			method: "GET",
			url: engine.qurl + encodeURIComponent( 'site:'+site+' title:"'+title+'" "'+content+'"' ),
			onload: function( resp ) { match( resp.responseText, engine ); },
			onerror: function( resp ) { match( "", engine ); }
		} );
	}
	function match( text, engine )
	{
		var r;
		while ( r = engine.regex.exec( text ) )
		{
			// Found a valid result
			if ( r[1].indexOf(site)>=0 )
				return fn( r );
		}
		// Not found, try another search engine
		if ( engine.next ) search( engine.next );
		// Tried all engines, nothing found
		else fn( false );
	}
	var engines = {
		qurl: "https://ixquick.com/do/search?q=",
		regex: /<a href='([^']*)' id='title_\d'/,
		next: {
		qurl: "https://startpage.com/do/search?q=",
		regex: /<a href='([^']*)' id='title_\d'/,
	}
	};
	search( engines );
}

//----------------------------------------------------------------
// Websites supported
//----------------------------------------------------------------
// Each website may have these 3 functions:
//  match: Given an url return a non false value if you can handle this profile link
//  source: Source the player's steamid from this profile url, directly called after match with its returned value (eg, regex result). Callback player.initialize with the steamid on success.
//  query: Find out given the steamid if this player has a profile on this website. Callback player.addLink with the url and description on success.

function siteSetLink( p, url, desc, html )
{
	var a = document.createElement('a');
	a.href = url;
	if ( html ) a.innerHTML = html;
	var text = document.createTextNode(desc);
	if ( a.firstChild ) a.insertBefore( text, a.firstChild );
	else a.appendChild( text );
	p.innerHTML = '';
	p.appendChild( a );
	p.className = 'TFProfile_Done';
}
function siteSetMissing( p )
{
	p.className = 'TFProfile_Missing';
}

var sites = {
// Steam community support
"steamcommunity.com": {
	group: "steam",
	match: function( url ) { return /^https?\:\/\/steamcommunity\.com\/(?:profiles|id)\/[^\/]*\/?$/.exec(url); },
	source: function( re, player )
	{
		GM_xmlhttpRequest( {
			method: "GET",
			url: re[0] + "?xml=1",
			onload: function( resp )
			{
				var parser = new DOMParser();
				var doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
				var str = doc.querySelector( "steamID64" ).textContent;
				player.initialize( CSteamID.parse( str ) );
			},
			onerror: function( resp )
			{
				player.error( resp.responseText );
			}
		} );
	},
	query: function( sid, player, el )
	{
		el.textContent = 'steamcommunity.com';
		
		var commid = sid.toString();
		GM_xmlhttpRequest( {
			method: "GET",
			url: "https://steamcommunity.com/profiles/"+commid+"?xml=1",
			onload: function( resp )
			{
				var parser = new DOMParser();
				doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
				
				// Profiles that haven't been set up do not have a name, in this case, steamID will be empty
				var desc = "Steam Community", name = doc.querySelector("steamID"), online = doc.querySelector("onlineState");
				if ( name && name.textContent ) desc += " ("+name.textContent+")";
				siteSetLink( el, "https://steamcommunity.com/profiles/"+commid, desc, online?'<span style="padding-left:5px;font-size:xx-small;">'+online.textContent+'</span>':undefined );
				
				var gameIP = doc.querySelector("inGameServerIP");
				var gameName = doc.querySelector("inGameInfo>gameName")
				var gameJoin = doc.querySelector("inGameInfo>gameJoinLink");
				if ( gameIP && gameIP.textContent && gameName && gameName.textContent && gameJoin && gameJoin.textContent )
				{
					var a = document.createElement('a');
					a.href = gameJoin.textContent;
					a.innerHTML = "In-Game: "+gameName.textContent;
					el.appendChild( a );
				}
			}
		} );
	}
},
// ETF2L Support
"etf2l.org": {
	group: "comptf2",
	match: function( url ) { return /^http\:\/\/etf2l.org\/forum\/user\/(\d+)\/?$/.exec(url); },
	source: function( re, player )
	{
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://etf2l.org/feed/player/?id=" + re[1],
			onload: function( resp )
			{
				var parser = new DOMParser();
				var doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
				var str = doc.querySelector( "player" );
				player.initialize( CSteamID.parse( str ? str.getAttribute("steamid") : "" ) );
			},
			onerror: function( resp )
			{
				player.error( resp.responseText );
			}
		} );
	},
	query: function( sid, player, el )
	{
		el.textContent = 'etf2l.org';
		
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://etf2l.org/feed/player/?steamid=" + sid.render(),
			onload: function( resp )
			{
				try {
					var parser = new DOMParser();
					var doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
					var id = doc.querySelector("player").getAttribute("id");
					var name = doc.querySelector("displayname").textContent;
					siteSetLink( el, "http://etf2l.org/forum/user/"+id+"/", "ETF2L Profile ("+name+")" );
				} catch(e) {
					siteSetMissing( el );
				}
			}
		} );
	}
},
// Wireplay TF2 League
"tf2.wireplay.co.uk": {
	group: "comptf2",
	match: function( url ) { return /^https?\:\/\/tf2\.wireplay\.co\.uk\/.*?index\.php\?pg=profile\&action=viewprofile\&aid=(\d+)/.exec(url); },
	source: function( re, player )
	{
		GM_xmlhttpRequest( {
			method: "GET",
			url: re[0],
			onload: function( resp )
			{
				var r = /<td align=left>(STEAM_0\:[01]\:\d+)<\/td>/.exec(resp.responseText);
				player.initialize( CSteamID.parse( r?r[1]:"" ) );
			},
			onerror: function( resp )
			{
				player.error( resp.responseText );
			}
		} );
	},
	query: function( sid, player, el )
	{
		el.textContent = 'tf2.wireplay.co.uk';
		
		GM_xmlhttpRequest( {
			method: "POST",
			url: "http://tf2.wireplay.co.uk/index.php?pg=search",
			data: "clantag=false&clanname=false&playername=false&steamid=true&searchterm=" + encodeURIComponent(sid.render()),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			onload: function( resp )
			{
				try {
					var r = /<td><a href="(index.php\?pg=profile\&action=viewprofile\&aid=\d+)">([^<]*)<\/a><\/td>/.exec(resp.responseText);
					siteSetLink( el, "http://tf2.wireplay.co.uk/"+r[1], "Wireplay Profile ("+r[2]+")" );
				} catch(e) {
					siteSetMissing( el );
				}
			}
		} );
	}
},
// UGC League
"ugcleague.com": {
	group: "comptf2",
	match: function( url ) { return /^https?\:\/\/www.ugcleague.com\/players_page\.cfm\?player_id=(\d+)$/.exec(url); },
	source: function( re, player ) { player.initialize( CSteamID.parse( re[1] ) ); },
	query: function( sid, player, el )
	{
		el.textContent = 'ugcleague.com';
		
		// Assumption: Just check if the player's steamid is on the page, that means he's played in a team.
		// FIXME! Use their player search page instead? http://www.ugcleague.com/playersearch.cfm
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://www.ugcleague.com/players_page.cfm?player_id="+sid.toString(),
			onload: function( resp )
			{
				if ( resp.responseText.indexOf( "<td>"+sid.render().substr(6)+"</td>" )>=0 )
					siteSetLink( el, "http://www.ugcleague.com/players_page.cfm?player_id="+sid.toString(), "UGC League Profile" );
				else
					siteSetMissing( el );
			}
		} );
	}
},
// TF2Lobby.com
"tf2lobby.com": {
	group: "lobby",
	match: function( url ) { return /^http\:\/\/(?:www.)?tf2lobby\.com\/profile\?(f?id)=(\d+)$/.exec(url); },
	source: function( re, player )
	{
		if ( re[1]==='fid' )
		{
			player.initialize( CSteamID.parse( re[2] ) );
			return;
		}
		
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://www.tf2lobby.com/profile?id="+re[2],
			onload: function( resp )
			{
				var dom = new DOMParser(), doc, el, sid;
				if ( ( doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement ) &&
					 ( el = doc.querySelector("#otherSites>ul>li>a") ) )
				{
					sid = CSteamID.parse( /\d+/.exec( el.href )[0] );
				}
				player.initialize( sid );
			},
			onerror: function( resp )
			{
				player.error( resp.responseText );
			}
		} );
	},
	query: function( sid, player, el )
	{
		el.textContent = 'tf2lobby.com';
		
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://www.tf2lobby.com/profile?fid="+sid.toString(),
			onload: function( resp )
			{
				try {
					var dom = new DOMParser();
					var doc = dom.parseFromString( resp.responseText, "text/html" ).documentElement;
					var name = ( doc.querySelector("#otherSites") && doc.querySelector("#player p") ).textContent;
					siteSetLink( el, "http://www.tf2lobby.com/profile?fid="+sid.toString(), "TF2Lobby Profile ("+name+")" );
				} catch(e) {
					siteSetMissing( el );
				}
			}
		} );
	}
},
// TeamFortress.tv profiles (barely works...)
"teamfortress.tv": {
	group: "forum",
	match: function( url ) { return /^https?\:\/\/teamfortress\.tv\/profile\/user\/[^\/]*\/?$/.exec(url); },
	source: function( re, player )
	{
		GM_xmlhttpRequest( {
			method: "GET",
			url: re[0],
			onload: function( resp )
			{
				var r = /(STEAM_0\:[01]\:\d+)/.exec( resp.responseText );
				player.initialize( CSteamID.parse( r?r[1]:0 ) );
			},
			onerror: function( resp )
			{
				player.error( resp.responseText );
			}
		} );
	},
	query: function( sid, player, el )
	{
		el.textContent = 'teamfortress.tv';
		
		// Cannot query by steamid...
		searchEngine( "teamfortress.tv", "Profile", sid.render(), function(r) {
			try {
				var url = r[1];
				var name = /profile\/user\/(.*?)\/?$/.exec(url)[1];
				siteSetLink( el, url, "TeamFortress.tv ("+name+")" );
			} catch(e) {
				siteSetMissing( el );
			}
		} );
	}
},
// logs.tf
"logs.tf": {
	group: "stats",
	match: function( url ) { return /^http\:\/\/logs\.tf\/profile\/(\d+)\/?$/.exec(url); },
	source: function( re, player ) { player.initialize( CSteamID.parse( re[1] ) ); },
	query: function( sid, player, el )
	{
		el.textContent = 'logs.tf';
		
		GM_xmlhttpRequest( {
			method: "GET",
			url: "http://logs.tf/profile/"+sid.toString(),
			onload: function( resp )
			{
				if ( !(/<h5>None found\.<\/h5>/.test(resp.responseText)) )
					siteSetLink( el, "http://logs.tf/profile/"+sid.toString(), "Logs.tf Profile" );
				else
					siteSetMissing( el );
			}
		} );
	}
},
// SizzlingStats.com (FIXME! Figure out their query api)
"sizzlingstats.com": {
	group: "stats",
	match: function( url ) { return /^http\:\/\/sizzlingstats\.com\/player\/(\d+)\/?$/.exec(url); },
	source: function( re, player ) { player.initialize( CSteamID.parse( re[1] ) ); },
	query: function( sid, player ) { return false; }
},
};

//----------------------------------------------------------------
// A link resource
//----------------------------------------------------------------
function linkPlayer( a )
{
	this.anchor = a;
	
	// Generate html
	var div = document.createElement('div');
	this.div = div;
	div.classList.add( 'TFProfile' );
	div.innerHTML = '<p>Pending...</p>';
}
// Initialize from a steamid
linkPlayer.prototype.initialize = function( sid )
{
	if ( sid )
	{
		// Show steam id
		var span = this.div.querySelector("p");
		span.innerHTML = '';
		span.appendChild( document.createTextNode( sid.render() ) );
		// Collect information about other websites
		for ( var it in sites )
		{
			var site = sites[it];
			
			// Find the group this belongs in
			var group = this.div.querySelector("article.TFProfile_"+site.group);
			if ( !group )
			{
				group = document.createElement('article');
				group.className = "TFProfile_"+site.group;
				this.div.appendChild( group );
			}
			
			var p = document.createElement('p');
			p.className = 'TFProfile_Pending';
			
			if ( site.query( sid, this, p )!==false )
			{
				group.appendChild( p );
			}
		}
	}
	else
	{
		this.error( "Invalid SteamID!" );
	}
}
// Error happened
linkPlayer.prototype.error = function( desc )
{
	var p = this.div.querySelector("p");
	p.innerHTML = '';
	p.appendChild( document.createTextNode( 'Error! ' + desc ) );
}
// Delay the query on mouse over
linkPlayer.prototype.source = function( a, re, site )
{
	this.show( a, function() {
		if ( !this.sourced )
		{
			this.sourced = true;
			site.source( re, this );
		}
	} );
}
// Show the UI, delay loading as needed
linkPlayer.prototype.show = function( a, fn )
{
	var self = this;
	function hover()
	{
		// Begin sourcing
		fn.call( self );
		// Show our overlay only
		Array.prototype.forEach.call( document.querySelectorAll(".TFProfile"), function(div) { div.style.display="none"; } );
		clear();
		// Compute position of the tooltip
		var r = a.getBoundingClientRect();
		var bottom = r.bottom + ( document.documentElement.scrollTop || document.body.scrollTop );
		var left = r.left + ( document.documentElement.scrollLeft || document.body.scrollLeft );
		self.div.style.top = bottom + "px";
		self.div.style.left = left + "px";
		// Show it
		self.div.style.display = "block";
		document.body.appendChild( self.div );
	}
	function clear()
	{
		if ( self.timer )
		{
			window.clearTimeout( self.timer );
			self.timer = false;
		}
	}
	function leave()
	{
		self.div.style.display = "none";
		clear();
	}
	a.addEventListener( 'mouseover', function(e) { clear(); self.timer = window.setTimeout( hover, 500 ); }, false );
	a.addEventListener( 'mouseleave', function(e) { clear(); self.timer = window.setTimeout( leave, 500 ); }, false );
	this.div.addEventListener( 'mouseover', clear, false );
	this.div.addEventListener( 'mouseleave', function(e) { clear(); self.timer = window.setTimeout( leave, 200 ); }, false );

	// Work around for mouseleave not working for chrome...
	var img = document.createElement('img');
	img.alt = "x";
	//img.src = "data:image/gif;base64,R0lGODlhDwAPANUAAAAAAP////7+/v39/fz8/Pv7+/j4+Pf39/X19fHx8e/v7+7u7u3t7evr6+rq6ufn5+bm5uXl5eLi4uDg4N/f39zc3Nra2tnZ2dTU1NPT09LS0tDQ0M/Pz87Ozs3NzbOzs39/f3V1dVdXVz4+PiMjI////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAACUALAAAAAAPAA8AAAaawJKwpJhgPJiJYjg0SCqNg+DQqEgMzc2DMOh2CY8NtiSBFM5oNERCtBwMAIBhHjccLMUIAsEBkBAkABx7EUYNCYgfACMAH4gJDUcMC5QLcQCVCwxIEQ6eIQCgIZ4OEUkVEBAgACIQIgAgqRVKGhQUcba3ALYaSxIZF8HCwhlsJQYeGxjLzBgbHmPHEh4dHNYdHldMQkVHSUtDQQA7";
	img.addEventListener( 'click', leave, false );
	this.div.insertBefore( img, this.div.firstChild );
}

//----------------------------------------------------------------
// Apply to all links in the document
//----------------------------------------------------------------
// FIXME! Does not work on content loaded after page load!
Array.prototype.forEach.call( document.querySelectorAll("a"), function(link)
{
	var url = link.href;
	for ( var it in sites )
	{
		var site = sites[it];
		var re = site.match && site.match( url );
		if ( re )
		{
			(new linkPlayer( link )).source( link, re, site );
		}
	}
} );

// Make it all look pretty
addStyle('\
div.TFProfile { \
position:absolute !important; \
z-index:9999999 !important; \
background-color:#F8F8FF !important; \
border: solid 1px #C0C0C0 !important; \
min-width:200px !important; \
padding:5px; \
-webkit-box-shadow: 1px 1px 1px 0px rgba(0, 0, 0, 0.3); \
box-shadow: 1px 1px 1px 0px rgba(0, 0, 0, 0.3); } \
\
div.TFProfile img { \
float:right !important;\
margin:-5px 0px 0px 0px !important;\
background-color: #cbcbcb;\
display: block;\
height: 18px;\
width: 36px;\
font-family: Verdana, Arial, Helvetica, sans-serif;\
font-size: 11px;\
font-weight: bold;color: #fff;\
text-decoration: none;\
text-align:center;\
cursor: pointer;\
line-height: 16px;\
border: none;\
-webkit-transition: background 100ms ease-in-out;\
-moz-transition: background 100ms ease-in-out;\
-ms-transition: background 100ms ease-in-out;\
-o-transition: background 100ms ease-in-out;\
transition: background 100ms ease-in-out; } \
\
div.TFProfile img:hover { \
background-color: #de5044;\
} \
\
div.TFProfile p { \
letter-spacing:0px !important; \
text-align:left !important; \
color:#555!important; \
padding:0!important; \
margin:0px!important; \
display: block !important; \
border: none !important; \
font-family: Verdana, Arial, Helvetica, sans-serif; \
font-size: 10px; \
font-style: normal; \
line-height: normal; \
font-weight: normal; \
font-variant: normal; \
color: #4c4c4c; \
text-decoration: none; } \
\
div.TFProfile p.TFProfile_Done>a { \
font-family:Verdana, Arial, Helvetica, sans-serif; \
font-size:9px; \
font-style:normal; \
line-height:normal; \
font-weight:700; \
font-variant:normal; \
text-decoration:none; \
letter-spacing:0 !important; \
text-align:left !important; \
color:#f8f8f8; \
border:1px solid #679bf3; \
background-color:#77a7f9; \
width:auto; \
height:auto; \
display:block!important; \
margin:8px 5px!important; \
padding:5px!important } \
\
div.TFProfile p.TFProfile_Done>a:hover { \
color:#fff; \
border:1px solid #4585f3; \
-webkit-box-shadow:1px 1px 2px 0 rgba(0,0,0,0.1);\
box-shadow:1px 1px 2px 0 rgba(0,0,0,0.1);\
background: #77a7f9;\
background: -moz-linear-gradient(top, #77a7f9 0%, #699cf2 100%);\
background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#77a7f9), color-stop(100%,#699cf2));\
background: -webkit-linear-gradient(top, #77a7f9 0%,#699cf2 100%);\
background: -o-linear-gradient(top, #77a7f9 0%,#699cf2 100%);\
background: -ms-linear-gradient(top, #77a7f9 0%,#699cf2 100%);\
background: linear-gradient(to bottom, #77a7f9 0%,#699cf2 100%);\
filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#77a7f9", endColorstr="#699cf2",GradientType=0 );} \
\
div.TFProfile p.TFProfile_Pending { \
font-family:Verdana, Arial, Helvetica, sans-serif !important; \
font-size:9px !important; \
font-style:normal !important; \
line-height:normal !important; \
font-weight:700 !important; \
font-variant:normal !important; \
text-decoration:none !important; \
letter-spacing:0 !important; \
text-align:left !important; \
color:#b1b1b1 !important; \
border:1px solid #cbcbcb !important; \
background-color:#e5e5e5 !important; \
width:auto !important; \
height:auto !important; \
display:block !important; \
margin:8px 5px !important;\
padding:5px !important } \
\
div.TFProfile p.TFProfile_Missing { \
display:none!important; \
} \
');