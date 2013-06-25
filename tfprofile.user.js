// ==UserScript==
// @name       	TF2 Profile Script
// @namespace  	tfprofile
// @version    	1.0
// @description Mouse over profile links (steamcommunity/etf2l/wireplay/teamfortress.tv) to get links their profiles on otherwebsites
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
	var re;
	// SteamID old format, 2nd part is how etf2l formats it.
	if ( re = /^(?:STEAM_)?0\:([01])\:(\d+)$/.exec( str ) )
	{
		var sid = new CSteamID();
		sid.setID( parseInt(re[2])*2 + parseInt(re[1]) );
		return sid;
	}
	// Looks like a standard 64bit steamid
	else if ( re = /^\d+$/.exec( str ) )
	{
		var sid = new CSteamID();
		sid.setID64( str );
		return sid;
	}
	return null;
}
//----------------------------------------------------------------

//----------------------------------------------------------------
// Websites supported
//----------------------------------------------------------------
// Each website may have one of 3 functions:
//  match: Given an url return a non false value if you can handle this profile url
//  source: Source the player's steamid from this profile url, directly called after match with its returned value (eg, regex result). Callback player.initialize with the steamid on success.
//  query: Find out given the steamid if this player has a profile on this website. Callback player.addProfile with the url and description on success.
var sites = [
{// ETF2L Support
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
		url: "http://etf2l.org/feed/player/?steamid=" + sid.render(),
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
match: function( url ) { return /^https?\:\/\/teamfortress\.tv\/profile\/user\/[^\/]*\/?$/.exec(url); },
source: function( re, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: re[0],
		onload: function( resp )
		{
			// RegExp because no API and not easily accessible
			var r = /(STEAM_0\:[01]\:\d+)/.exec( resp.responseText );
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
	//player.addProfile( "https://encrypted.google.com/search?q=site:teamfortress.tv%20intitle%3A%22Profile%22%20" + sid.render(), "TeamFortress.tv search" );
	// No API?
	var query = encodeURIComponent( 'site:teamfortress.tv intitle:"Profile" ' + sid.render() );
	GM_xmlhttpRequest( {
		method: "GET",
		url: "https://ixquick.com/do/search?q="+query,
		onload: function( resp )
		{
			var r = /<a href='(http\:\/\/teamfortress.tv\/profile\/user\/([^']*?))' id='title_1'/.exec(resp.responseText);
			if ( r ) player.addProfile( r[1], "TeamFortress.tv (" + r[2] + ")" );
			else
			{
				GM_xmlhttpRequest( {
					method: "GET",
					url: "https://ixquick.com/do/search?q="+query,
					onload: function( resp )
					{
						var r = /<a href='(http\:\/\/teamfortress.tv\/profile\/user\/([^']*?))' id='title_1'/.exec(resp.responseText);
						if ( r ) player.addProfile( r[1], "TeamFortress.tv (" + r[2] + ")" );
					}
				} );
			}
		}
	} );
}
},
{// Wireplay
match: function( url ) { return /^https?\:\/\/tf2\.wireplay\.co\.uk\/.*?index\.php\?pg=profile\&action=viewprofile\&aid=(\d+)/.exec(url); },
source: function( re, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: re[0],
		onload: function( resp )
		{
			var r = /<td align=left>(STEAM_0\:[01]\:\d+)<\/td>/.exec(resp.responseText);
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
		data: "clantag=false&clanname=false&playername=false&steamid=true&searchterm=" + encodeURIComponent(sid.render()),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		onload: function( resp )
		{
			var r = /<td><a href="(index.php\?pg=profile\&action=viewprofile\&aid=\d+)">([^<]*)<\/a><\/td>/.exec(resp.responseText);
			player.addProfile( "http://tf2.wireplay.co.uk/"+r[1], "Wireplay Profile ("+r[2]+")" );
		}
	} );
}
},
{// UGC League
match: function( url ) { return /^https?\:\/\/www.ugcleague.com\/players_page\.cfm\?player_id=(\d+)$/.exec(url); },
source: function( re, player )
{
	player.initialize( CSteamID.parse( re[1] ) );
},
query: function( sid, player )
{
	// Assumption: Just check if the player's steamid is on the page, that means he's played in a team.
	// FIXME! Use their player search page instead? http://www.ugcleague.com/playersearch.cfm
	GM_xmlhttpRequest( {
		method: "GET",
		url: "http://www.ugcleague.com/players_page.cfm?player_id="+sid.toString(),
		onload: function( resp )
		{
			if ( resp.responseText.match( "<td>"+sid.render().substr(6)+"</td>" ) )
				player.addProfile( "http://www.ugcleague.com/players_page.cfm?player_id="+sid.toString(), "UGC League Profile" );
		}
	} );
}
},
{// logs.tf query only
query: function( sid, player )
{
	GM_xmlhttpRequest( {
		method: "GET",
		url: "http://logs.tf/profile/"+sid.toString(),
		onload: function( resp )
		{
			console.log(resp);
			if ( !(/<h5>None found\.<\/h5>/.test(resp.responseText)) )
				player.addProfile( "http://logs.tf/profile/"+sid.toString(), "Logs.tf Profile" );
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
	this.div.appendChild( p );
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
	var self = this;
	function hover()
	{
		// Delayed lookup, pass parameters through
		if ( !self.sourced )
		{
			self.sourced = true;
			site.source( re, self );
		}
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
	a.addEventListener( 'mouseover', hover, false );
	a.addEventListener( 'mouseleave', function(e) { /*for(var el=e.relatedTarget;el=el.parentNode;){if(el==a||el==self.div)return;}*/ self.timer = window.setTimeout( leave, 500 ); }, false );
	this.div.addEventListener( 'mouseover', clear, false );
	this.div.addEventListener( 'mouseleave', function(e) { /*for(var el=e.relatedTarget;el=el.parentNode;){if(el==a||el==self.div)return;}*/ leave(); }, false );
	// Work around for the above not working for chrome...
	var img = document.createElement('img');
	img.alt = "Close";
	img.src = "data:image/gif;base64,R0lGODlhDwAPANUAAP///wAAANTU1Pj4+Pv7+9nZ2c3NzeLi4u7u7uDg4O/v79/f3+bm5vHx8erq6vX19c/Pz/39/evr69zc3OXl5dDQ0Pf393V1dbOzsyMjI+3t7efn59ra2vz8/M7OztPT09LS0ldXV39/fz4+Pv7+/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAAAAAAALAAAAAAPAA8AAAaaQIAQoEgIDIKEYjgcHCYSC8kimRwGzcqmE+l2O5sKFnBgEM5oNONA5FgGgcBgHh9YOEXK4wEJZB4ZARB7FEYSDYgYASMBGIgNEkcaCJQIcQGVCBpIFA6eFwGgF54OFEkTDAwiASEMIQEiqRNKIAsLcba3AbYgSwcfBcHCwh9sAAMGFQLLzAIVBmPHBwYeENYeBldMQkVHSUtDQQA7";
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
	for ( var it = 0, end = sites.length; it<end; ++it )
	{
		var site = sites[it];
		var re = site.match && site.match( url );
		if ( re )
		{
			(new linkPlayer( link )).source( link, re, site );
		}
	}
});
addStyle( 'div.TFProfile { position:absolute !important; z-index:9999999 !important; background-color:#F8F8FF !important; border: solid 1px #C0C0C0 !important; min-width:200px !important; padding:5px; -webkit-border-radius: 2px; border-radius: 2px; -webkit-box-shadow: 1px 1px 1px 0px rgba(0, 0, 0, 0.3); box-shadow: 1px 1px 1px 0px rgba(0, 0, 0, 0.3); } \
div.TFProfile img { float:right !important; cursor:pointer !important; } \
div.TFProfile p { letter-spacing:0px !important; text-align:left !important; color:#555; padding:0 !important; margin:5px !important; display: block !important; border: none !important; font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10px; font-style: normal; line-height: normal; font-weight: normal; font-variant: normal; color: #4c4c4c; text-decoration: none; } \
div.TFProfile p>a { font-family:Verdana, Arial, Helvetica, sans-serif; font-size:9px; font-style:normal; line-height:normal; font-weight:700; font-variant:normal; text-decoration:none; letter-spacing:0 !important; text-align:left !important; color:#f8f8f8; border:1px solid #679bf3; background-color:#77a7f9; -webkit-border-radius:2px; border-radius:2px; width:auto; height:auto; display:block!important; margin:8px 0!important; padding:5px!important } \
div.TFProfile p>a:hover { font-family:Verdana, Arial, Helvetica, sans-serif;font-size:9px;font-style:normal;line-height:normal;font-weight:700;font-variant:normal;color:#fff;text-decoration:none;letter-spacing:0!important;text-align:left!important;border:1px solid #4585f3;-webkit-border-radius:2px;border-radius:2px;width:auto;height:auto;display:block!important;-webkit-box-shadow:1px 1px 2px 0 rgba(0,0,0,0.1);box-shadow:1px 1px 2px 0 rgba(0,0,0,0.1);background: #77a7f9;background: -moz-linear-gradient(top, #77a7f9 0%, #699cf2 100%);background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#77a7f9), color-stop(100%,#699cf2));background: -webkit-linear-gradient(top, #77a7f9 0%,#699cf2 100%);background: -o-linear-gradient(top, #77a7f9 0%,#699cf2 100%);background: -ms-linear-gradient(top, #77a7f9 0%,#699cf2 100%);background: linear-gradient(to bottom, #77a7f9 0%,#699cf2 100%);filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#77a7f9", endColorstr="#699cf2",GradientType=0 );margin:8px 0!important;padding:5px!important} \
' )

