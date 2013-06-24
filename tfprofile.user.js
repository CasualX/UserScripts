// ==UserScript==
// @name       	TF2 Profile Script
// @namespace  	tfprofile
// @version    	1
// @description Mouse over profile links (steamcommunity/etf2l/wireplay/teamfortress.tv) to get links their profiles on otherwebsites
// @include     http://*
// @include     https://*
// @grant		GM_xmlhttpRequest
// @grant		GM_addStyle;
// @run-at document-end
// ==/UserScript==

// Base conversion of arbitrary precision integers
// Minified from http://danvk.org/hex2dec.html
function convertBase(e,t,n){function r(e,t,n){var r=[];var i=Math.max(e.length,t.length);var s=0;var o=0;while(o<i||s){var u=o<e.length?e[o]:0;var a=o<t.length?t[o]:0;var f=s+u+a;r.push(f%n);s=Math.floor(f/n);o++}return r}function i(e,t,n){if(e<0)return null;if(e==0)return[];var i=[];var s=t;while(true){if(e&1){i=r(i,s,n)}e=e>>1;if(e===0)break;s=r(s,s,n)}return i}function s(e,t){var n=e.split("");var r=[];for(var i=n.length-1;i>=0;i--){var s=parseInt(n[i],t);if(isNaN(s))return null;r.push(s)}return r}var o=s(e,t);if(o===null)return null;var u=[];var a=[1];for(var f=0;f<o.length;f++){if(o[f]){u=r(u,i(o[f],a,n),n)}a=i(t,a,n)}var l="";for(var f=u.length-1;f>=0;f--){l+=u[f].toString(n)}return l}

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
CSteamID.prototype.RenderOld = function()
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
	var re;
	// SteamID old format, 2nd part is how etf2l formats it.
	if ( ( re = /^STEAM_0\:(\d)\:(\d+)$/.exec( str ) ) || ( re = /^0\:(\d)\:(\d+)$/.exec( str ) ) )
	{
		var sid = new CSteamID();
		sid.setID( parseInt(re[2])*2 + parseInt(re[1]) );
		return sid;
	}
	return null;
}
//----------------------------------------------------------------

//----------------------------------------------------------------
// Websites supported
//----------------------------------------------------------------
var sites = [
{// ETF2L Support
match: function( url ) { return (/^http\:\/\/etf2l.org\/forum\/user\/(\d+)\/?$/).exec(url); },
source: function( re, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: "http://etf2l.org/feed/player/?id=" + re[1],
		onload: function( resp )
		{
            var parser = new DOMParser();
            var doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
            var str = doc.querySelector( "player" ).getAttribute("steamid");
			player.initialize( CSteamID.parse( str ) );
		},
		onerror: function( resp )
		{
			player.error( resp.responseText );
		}
	} );
},
query: function( sid, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: "http://etf2l.org/feed/player/?steamid=" + sid.RenderOld(),
		onload: function( resp )
		{
			var parser = new DOMParser();
			var doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
			var id = doc.querySelector("player").getAttribute("id");
			var name = doc.querySelector("displayname").textContent;
			player.addProfile( "http://etf2l.org/forum/user/"+id+"/", "ETF2L Profile (" + name + ")" );
		}
	} );
}
},
{// Steam community support
match: function( url ) { return (/^https?\:\/\/steamcommunity\.com\/(?:profiles|id)\/[^\/]*\/?$/).exec(url); },
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
			var sid = new CSteamID();
			sid.setID64( str );
			player.initialize( sid );
		},
		onerror: function( resp )
		{
			player.error( resp.responseText );
		}
	} );
},
query: function( sid, player )
{
	var commid = sid.toString();
	GM_xmlhttpRequest( {
		method: "GET",
		url: "https://steamcommunity.com/profiles/"+commid+"?xml=1",
		onload: function( resp )
		{
			var parser = new DOMParser();
			doc = parser.parseFromString( resp.responseText, "text/xml" ).documentElement;
			var name = doc.querySelector("steamID").textContent || "missing profile";
			player.addProfile( "https://steamcommunity.com/profiles/"+commid, "Steam Community ("+name+")" );
		}
	} );
}
},
{// TeamFortress.tv profiles
match: function( url ) { return (/^https?\:\/\/teamfortress\.tv\/profile\/user\/[^\/]*\/?$/).exec(url); },
source: function( re, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: re[0],
		onload: function( resp )
		{
			// RegExp because no API and not easily accessible
			var r = (/(STEAM_0\:\d\:\d+)/).exec( resp.responseText );
			if ( r ) player.initialize( CSteamID.parse( r[1] ) );
			else player.error( "regex failure" );
		},
		onerror: function( resp )
		{
			player.error( resp.responseText );
		}
	} );
},
query: function( sid, player )
{
	// Not perfect...
	//player.addProfile( "https://encrypted.google.com/search?q=site:teamfortress.tv%20intitle%3A%22Profile%22%20" + sid.RenderOld(), "TeamFortress.tv search" );
	// No API?
	GM_xmlhttpRequest( {
		method: "GET",
		url: "https://startpage.com/do/search?q=site:teamfortress.tv%20intitle%3A%22Profile%22%20" + sid.RenderOld(),
		onload: function( resp )
		{
			var r = (/<a href='(http\:\/\/teamfortress.tv\/profile\/user\/([^']*?))' id='title_1'/).exec(resp.responseText);
			player.addProfile( r[1], "TeamFortress.tv (" + r[2] + ")" );
		}
	} );
}
},
{// Wireplay
match: function( url ) { return (/^https?\:\/\/tf2\.wireplay\.co\.uk\/.*?index\.php\?pg=profile\&action=viewprofile\&aid=(\d+)/).exec(url); },
source: function( re, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: re[0],
		onload: function( resp )
		{
			var r = (/<td align=left>(STEAM_0:\d:\d+)<\/td>/).exec(resp.responseText);
			if ( r ) player.initialize( CSteamID.parse( r[1] ) );
			else player.error( "regex failure" );
		},
		onerror: function( resp )
		{
			player.error( resp.responseText );
		}
	} );
},
query: function( sid, player )
{
	GM_xmlhttpRequest( {
		method: "POST",
		url: "http://tf2.wireplay.co.uk/index.php?pg=search",
		data: "clantag=false&clanname=false&playername=false&steamid=true&searchterm=" + encodeURIComponent(sid.RenderOld()),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		onload: function( resp )
		{
			// RegExp because no API
			var r = (/<td><a href="(index.php\?pg=profile\&action=viewprofile\&aid=\d+)">([^<]*)<\/a><\/td>/).exec(resp.responseText);
			player.addProfile( "http://tf2.wireplay.co.uk/"+r[1], "Wireplay Profile ("+r[2]+")" );
		}
	} );
}
},
];

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
	div.innerHTML = '<div class="panel"><p><span class="sid">Pending...</span></p></div>';
	//if ( a.nextSibling ) a.parentNode.insertBefore( div, a.nextSibling );
	//else a.parentNode.appendChild( div );
}
// Initialize from a steamid
linkPlayer.prototype.initialize = function( sid )
{
	if ( sid )
	{
		// Show steam id
		var span = this.div.querySelector(".sid");
		span.innerHTML = '';
		span.appendChild( document.createTextNode( sid.RenderOld() ) );
		// Collect information about other websites
		for ( var i = 0; i<sites.length; ++i )
		{
			var site = sites[i];
			try { site.query( sid, this ); }
			catch ( e ) { } // Fuck error checking, this will do
		}
	}
	else
	{
		this.error( "Invalid SteamID!" );
	}
}
// Add a profile
linkPlayer.prototype.addProfile = function( url, desc )
{
	var p = document.createElement('p');
	p.innerHTML = '<a href="' + url + '" target="_blank">' + desc + '</a>';
	this.div.firstChild.appendChild( p );
}
// Error happened
linkPlayer.prototype.error = function( desc )
{
	var p = document.createElement('p');
	p.appendChild( document.createTextNode( 'Error! ' + desc ) );
	this.div.innerHTML = '';
	this.div.appendChild( p );
}
// Delay the query on mouse over
linkPlayer.prototype.source = function( a, re, site )
{
	var self = this;
	function hover()
	{
		// Delayed lookup
		if ( !self.sourced )
		{
			self.sourced = true;
			site.source( re, self );
		}
		// Show our overlay only
		clear();
		var r = a.getBoundingClientRect();
		var bottom = r.bottom + ( document.documentElement.scrollTop || document.body.scrollTop );
		var left = r.left + ( document.documentElement.scrollLeft || document.body.scrollLeft );
		self.div.style.top = bottom + "px";
		self.div.style.left = left + "px";
		
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
	a.addEventListener( 'mouseover', hover, false );
	a.addEventListener( 'mouseleave', function() { self.timer = window.setTimeout( leave, 500 ); }, false );
	this.div.addEventListener( 'mouseover', clear, false );
	this.div.addEventListener( 'mouseleave', leave, false );
}

//----------------------------------------------------------------
// Apply to all links in the document
//----------------------------------------------------------------
// FIXME! Does not work on content loaded after page load!
Array.prototype.forEach.call( document.querySelectorAll("a"), function(link)
{
	var url = link.href;
	for ( var it = 0, end = sites.length; it<end; ++it )
	{
		var site = sites[it];
		var re = site.match( url );
		if ( re )
		{
			(new linkPlayer( link )).source( link, re, site );
		}
	}
});
GM_addStyle( 'div.TFProfile { position:absolute !important; z-index:9999999 !important; background-color:#F8F8FF !important; border: solid 1px #C0C0C0 !important; min-width:200px !important; } \
div.TFProfile p { font: normal normal normal x-small sans-serif !important; letter-spacing:0px !important; text-align:left !important; color:#213911; padding:0 !important; margin:5px !important; display: block !important; border: none !important; } \
div.TFProfile p>a { font: normal normal normal x-small sans-serif !important; letter-spacing:0px !important; text-align:left !important; color:#4169E1; padding:0 !important; margin:0 !important; display: block !important; border: none !important; } \
' );

