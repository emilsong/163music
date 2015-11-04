$(function(){

var netease = {};
netease.lckey = "";
netease.domain = "http://music.163.com";
netease.loaded = {
	list:false,
	listType:"hot",
	loadingMore:null,
	rank:false,
	radio:false,
	singer:false,
	singerKey:"",
	page:1,
	pageCount:20,
	songCount:1,
	userInfo:null,
	loadingTimer:null,
	uid:null,
	hasMore:true,
	playing:false
};
netease.lyric = null;
netease.options = Settings.getObject("options")||{list:1,radio:1,rank:1,mine:1,lyric:1,notify:1,cover:"album"};
if(!netease.options.lyric){
	netease.options.lyric = 1;
}

var port  = new mainConnector();

netease.init = function(){
	
	//获取通讯key
	chrome.cookies.get({
		url: netease.domain,
		name: '__csrf'
		}, function (c) {
			if(c!=null){
				netease.lckey = c.value;
			}
			Settings.setValue("lckey",netease.lckey);
	});
	
	netease.loaded.userInfo = Settings.getObject("userInfo");
	//console.log(netease.loaded.userInfo);
	
	//netease.user(false,true);

	port.name = "163music";
	port.init();
	port.onMessage(function(msg){
		//console.log(msg);
		
		switch(msg.act){
			case "play":
				netease.player.info();
			break;
			case "loading":
				netease.loading();
			break;
			case "loaded":
				netease.loading(true);
			break;
			case "timeupdate":
				if(!netease.loaded.playing){
					netease.loaded.playing = true;
					if($(".cd img").hasClass("pausing")){
						$(".cd img").removeClass("pausing");
					}
					if($(".cd .ctrl").hasClass("play")){
						$(".cd .ctrl").removeClass("play").addClass("pause");
					}
				}
				netease.player.timing(msg);
			break;
		}
	});

	//初始化选项
	var op = netease.options;
	if(op.rank==0){
		$("nav ul li").eq(1).hide();
	}
	if(op.radio==0){
		$("nav ul li").eq(2).hide();
	}
	if(op.mine==0){
		$("nav ul li").eq(3).hide();
	}

	netease.bind();
	netease.player.info();

	if(Settings.getObject("song")==undefined){
		$(".footer").trigger("click");
	}

};

netease.nav = function(){
	netease.nav.scroll(true);
};

netease.nav.scroll = function(bind){
	if(!bind){
		$(".list").unbind("scroll");
	}else{
		$(".list").unbind("scroll");
		$(".list").bind("scroll",function(){
			var top = $(".list").scrollTop();
			if(!netease.loaded.loadingMore){
				if(netease.loaded.hasMore){
					if($(".list ul:visible").height() - top < 300){
						netease.loaded.page++;
						netease.loaded.loadingMore = true;
						if(netease.loaded.listType=="dj"){
							netease.dj(netease.loaded.page,netease.loaded.pageCount,true);
						}else{
							netease.list(netease.loaded.listType,netease.loaded.page,netease.loaded.pageCount,true);
						}
						
					}
				}
			}
			//console.log($(".list ul:visible").height() - top);
		});
	}
};

netease.bind = function(){

	netease.nav();

	$(".footer").bind("click",function(){
		$(".body").animate({top:0});
		$(this).hide();
		setTimeout(function(){$(".header").addClass("up");$("nav div input").show();},300);
		if(!netease.loaded.list){
			netease.list("hot",1,20);
		}
	});


	$(".arrow").bind("click",function(){
		$("nav div input").hide();
		$(".body").animate({top:"285px"});
		$("footer").show();
		$("header").removeClass("up");
	});

	$("nav ul li").bind("click",function(){
		var This = $(this);
		$("nav ul li").removeClass("hover");
		This.addClass("hover");
		var text = This.text();
		switch(text){
			case "分类":
				netease.rank();
				netease.nav.scroll(false);
			break;
			case "最热":
				netease.list("hot",1,20);
				netease.nav.scroll(true);
			break;
			case "最新":
				netease.list("new",1,20);
				netease.nav.scroll(true);
			break;
			case "DJ":
				netease.dj(1,20);
				netease.nav.scroll(true);
			break;
			case "收藏":
				netease.user(true);
				netease.nav.scroll(false);
			break;
			default:
				netease.search();
				netease.nav.scroll(false);
			break;
		}
	});

	$(".search button").bind("click",function(){
		var key = $("#keyword").val();
		if(key!="")
			netease.list("search",0,100,false,key);
	});

	$("nav input").bind("keydown",function(){
		if(event.keyCode==13){
			$("nav ul li").removeClass("hover");
			netease.nav.scroll(false);
			var key = $(this).val();
			netease.singer(key);
		}
	});

	$(".list").on("mouseover","li p",function(){
		var p = $(this);
		$("."+p.attr("class")).siblings(".loc").hide();
		$("."+p.attr("class")).siblings(".intro").hide();
		p.siblings(".loc").show();
		p.siblings(".intro").show();
	});

	
	$(".list").on("click","p a",function(){
		//console.log($(this).attr("data-id"));
		var This = $(this);
		//增加是否是全部都是加心歌曲
		netease.player.playlist(This.attr("data-id"),This.attr("data-type"),This.attr("data-fav"));
		
		setTimeout(function(){$(".arrow").trigger("click");},200);
	});

	$(".rank").on("click","li a",function(){
		//console.log($(this).attr("data-id"));
		var This = $(this);
		netease.list(This.text(),1,20);
		netease.nav.scroll(true);
	});

	$(".cd .ctrl").bind("click",function(){
		var btn = $(this);
		if(btn.hasClass("pause")){
			netease.player.pause();
		}else{
			netease.player.play();
		}
	});

	$(".player").bind("mouseover",function(){
		$(".info").show();
		if(parseInt(Settings.getValue("index",0))>0){
			$(".prev").show();
		}
		if(netease.loaded.songCount!=1){
			$(".next").show();
		}
		$("#favBtn").show();
	});
	$("#favBtn").bind("click",function(){
		netease.fav();
	});
	$(".player").bind("mouseout",function(){
		$(".next,.prev,.info,#favBtn").hide();
	});

	$(".next").bind("click",function(){
		netease.player.reset();
		netease.player.next();
	});

	$(".prev").bind("click",function(){
		netease.player.reset();
		netease.player.prev();
	});

	if(Settings.getValue("cycle",0)==1){
		$(".cycle").addClass("cycle1");
	}
	$(".cycle").bind("click",function(){
		var cycle = $(this);
		cycle.toggleClass("cycle1");
		if(cycle.hasClass("cycle1")){
			Settings.setValue("cycle",1);
			cycle.attr("title","单曲循环");
		}else{
			Settings.setValue("cycle",0);
			cycle.attr("title","顺序播放");
		}
	});

	$(".cd img").bind("error",function(){
		$(this).attr("src","img/cover.png");
	});

	$(".list").on("click","a.fav",function(){
		netease.subscribe($(this));
	});

	$(".list").on("click",".author",function(){
		var a = $(this);
		if(a.attr("data-uid")){
			netease.loaded.uid = a.attr("data-uid");
			netease.list("profile",1,40,false,netease.loaded.uid);
		}
	});
	$(".author").bind("click",function(){
		var a = $(this);
		if(a.attr("data-uid")){
			netease.loaded.uid = a.attr("data-uid");
			netease.list("profile",1,40,false,netease.loaded.uid);
			$(".body").animate({top:0});
			$(".footer").hide();
			setTimeout(function(){$(".header").addClass("up");$("nav div input").show();},300);
		}
	});

	
	$(".sider").bind("click",function(){
		$(".song").animate({marginLeft: "350"}, 200 );
	});
	
	$(".list").on("click",".memo",function(){
		var listid = $(this).data("id");
		var data = {title:$(this).data("title"),author:$(this).data("author"),face:$(this).data("face"),type:$(this).data("type")};
		netease.songlist(listid,data);
	
	});
	
	$(".song").on("click",".s-play",function(){
		var This = $(this);
		//增加是否是全部都是加心歌曲
		netease.player.playlist(This.data("id"),This.data("type"),0,This.data("index"));
		setTimeout(function(){$(".sider").trigger("click");
			setTimeout(function(){$(".arrow").trigger("click");},200);
		},500);
		
	});

	$(".lyric").click(function(){
		if($(this).data("link")){
			window.open($(this).data("link"));
		}
	});
	
};

netease.player = {
	reset:function(){
		//$(".cd img").attr("src","img/cover.png");
	},
	playlist:function(id,type,fav,idx){
		type = "play"+type;//playlist/playrank/playradio
		var msg = {act:type,data:Settings.getCacheValue(id),fav:fav,idx:idx};
		//console.log(msg);
		port.send(msg);
	},
	up:function(){
		//音量放大
		port.send({act:"up"});
	},
	down:function(){
		//音量减小
		port.send({act:"down"});
	},
	play:function(){
		$(".ctrl").addClass("pause").removeClass("play");
		$(".cd img").removeClass("pausing");
		port.send({act:"play"});
	},
	pause:function(){
		netease.loaded.playing = true;
		port.send({act:"pause"});
		$(".ctrl").removeClass("pause").addClass("play");
		$(".cd img").addClass("pausing");
		
	},
	next:function(){
		port.send({act:"next"});
	},
	prev:function(){
		port.send({act:"prev"});
	},
	timing:function(data){
		/*act: "timeupdate"
		duration: 217.5245361328125
		percent: 43
		time: 92.61347198486328*/
		var now = Math.ceil(data.time);
		var sec = Math.ceil(data.duration-data.time);
		$(".timer").text(tool.formatTime(sec));
		
		if(netease.options&&netease.options.lyric==1){
			if(netease.lyric!=null&&netease.lyric[now]!=undefined){
				$(".lyric").html(netease.lyric[now]);
			}
		}
	},
	info:function(){
		
		var song = Settings.getObject("song");

		if(song){
			if(song.isfaved){
				$("#favBtn").addClass("faved");
			}else{
				$("#favBtn").removeClass("faved");
			}
			
			$(".info,.lyric").html("&lt;"+song.name+"&gt;&nbsp;&nbsp;"+song.artists[0].name);
				
			if(netease.options&&netease.options.cover=="album"){
				$(".cd img").attr("src",song.album.picUrl);
			}else{
				$(".cd img").attr("src",song.artists[0].picUrl);	
			}

			if(!song.lyric){
				netease.getLyric(song);
			}else{
				netease.lyric = song.lyric;
			}

			$(".lyric").data("link","http://music.163.com/#/song?id="+song.id);

		}else{
			//加载歌单列表
		}
		
		
		var list = Settings.getObject("list");
		if(list){
			var cover = list.coverUrl||list.coverImgUrl;
			$(".cover img").attr("src",cover+"?param=60y60");
			$(".title h1").text(list.name);
			var creator = list.dj||list.creator;
			$(".title h2 a").text(creator.nickname);
			$(".face a img").attr("src",creator.avatarUrl);
			$(".title h2 a").attr("data-uid",creator.userId);
			
		}
		var songs = Settings.getObject("songs");
		if(songs)
			netease.loaded.songCount = songs.length;
	
	}

};

//type: hot/new 歌单（新增user，用户自己歌单类型 新增profile类型 新增dj 大牌DJ列表）
netease.list = function(type,page,size,getMore,uid){
	
	getMore=getMore||false;
	if(netease.loaded.list&&!getMore&&netease.loaded.listType==type&&type!="profile"&&type!="search"){
		$(".list ul").hide();
		$(".list .collection").show();
		return;
	}
	netease.loading();

	var r = new Date().getTime();
	var cate = "全部";
	cate = encodeURIComponent(cate);
	var url = "";
	var postData = {};
	page = (page-1)*20;
	switch(type){
		case "user":
		var userId = netease.loaded.userInfo.userId;
		url = netease.domain+"/api/user/playlist?uid="+userId+"&wordwrap=7&offset="+page+"&total=true&limit="+size;
		break;
		case "profile":
		url = netease.domain+"/api/user/playlist/?offset=0&limit=301&uid="+uid;
		break;
		case "hot":
		url = netease.domain+"/api/playlist/list?cat="+cate+"&order="+type+"&offset="+page+"&total=true&limit="+size;
		break;
		case "new":
		url = netease.domain+"/api/playlist/list?cat="+cate+"&order="+type+"&offset="+page+"&total=true&limit="+size;
		break;
		case "search":
		url = netease.domain+"/api/search/get/web?cmd=search";
		postData.s = uid;
		postData.type = 1000;
		postData.offset = 0;
		postData.limit = 100;
		postData.total = "false";
		break;
		default:
		cate = encodeURIComponent(type);
		url = netease.domain+"/api/playlist/list?cat="+type+"&order=hot&offset="+page+"&total=true&limit="+size;
		break;
	}
	url +="&csrf_token="+netease.lckey;
	
	var template = '<li>\
	<p class="p[i]"><a title="[name]" data-id="[id]" data-type="list" data-fav="[favst]"></a><img src="[cover]" /></p>\
	<i class="loc"></i>\
	<section class="intro">\
	<div class="face"><img src="[face]"/></div>\
	<div class="memo" title="点击查看歌单歌曲列表" data-type="list" data-id="[id]" data-title="[name]" data-author="[nick]" data-face="[face]">[desc]</div>\
	<div class="num">\
		<i class="author" title="点击查看用户所有歌单" data-uid="[creator]">[nick]</i><a title="[title]" class="fav[faved]" data-id="[id]">[fav]</a><a class="hits">[hits]</a>\
	</div>\
	</section>\
	</li>';
	var html = "";
	var buildHtml = function(data){
		if(data.code==200){
			netease.loaded.list = true;
			netease.loaded.listType = type;
			netease.loaded.loadingMore = false;
			var datas = data.playlists;
			var dataall = data;
			if(type=="user"||type=="profile"){
				datas = data.playlist;
				dataall = data;
			}
			if(type=="search"){
				datas = data.result.playlists;
				dataall = data;
			}
			
			if(data.more){
				netease.loaded.hasMore = true;
			}else{
				netease.loaded.hasMore = false;
			}
			for(var i=0;i<datas.length;i++){
				var d = datas[i];
				Settings.setCacheValue(d.id,d);
				if(d.coverImgUrl==null||d.coverImgUrl==""){d.coverImgUrl="img/cover.png"};
				if(d.description==""||d.description==null){d.description=d.name};
				var temp = template.replace("[cover]",d.coverImgUrl+"?param=60y60");
				var col =parseInt((i+4)/4)+(5*(page-1));
				temp = temp.replace("[i]",col );
				if(d.creator.avatarUrl==undefined)
					temp = temp.replace(/\[face\]/g,"img/logo.png");
				else
					temp = temp.replace(/\[face\]/g,d.creator.avatarUrl);
				temp = temp.replace(/\[nick\]/g,d.creator.nickname);
				temp = temp.replace("[creator]",d.creator.userId);
				temp = temp.replace("[desc]",d.description);
				temp = temp.replace(/\[name\]/g,d.name);
				temp = temp.replace("[hits]",d.playCount);
				temp = temp.replace("[fav]",d.subscribedCount);
				temp = temp.replace(/\[id\]/g,d.id);
				
				if(type=="user"){
					temp = temp.replace("[faved]"," faved");
					temp = temp.replace("[title]"," 取消收藏");
					if(i==0){
						//console.log(i);
						temp = temp.replace("[favst]","1");
					}else{
						temp = temp.replace("[favst]","0");
					}
				}
				else{
					temp = temp.replace("[favst]","0");
					temp = temp.replace("[faved]","");
					temp = temp.replace("[title]"," 收藏歌单");
				}

				html+=temp;
			}
			if(!getMore){
				$(".list ul").hide();
				$(".list .collection").html(html).show();
				$(".list").scrollTop(0);
			}else{
				$(".list .collection").append(html);
			}
			
			netease.loading(true);
			
		}else{
			netease.loaded.hasMore = false;
		}
	}
	if(type!="search"){
		$.getJSON(url,function(data){
			buildHtml(data);
		});
	}else{
		$.post(url,postData,function(data){
			var json = JSON.parse(data);
			buildHtml(json);
		});
	}
};


netease.search = function(key){
	$(".list ul").hide();
	$(".list").scrollTop(0);
	$(".list .search").show();


};

netease.dj = function(page,size,getMore){
	
	getMore=getMore||false;
	if(netease.loaded.list&&!getMore&&netease.loaded.listType=="dj"){
		$(".list ul").hide();
		$(".list .collection").show();
		return;
	}
	netease.loading();

	page = (page-1)*20;
	var url = netease.domain+"/api/djprogram/list?type=hot&offset="+page+"&total=true&limit="+size;
	url +="&csrf_token="+netease.lckey;
	var template = '<li>\
	<p class="p[i]"><a title="[name]" data-id="[id]" data-type="dj"></a><img src="[cover]" /></p>\
	<i class="loc"></i>\
	<section class="intro">\
	<div class="face"><img src="[face]"/></div>\
	<div class="memo" data-type="dj" data-id="[id]" data-title="[name]" data-author="[nick]" data-face="[face]">[desc]</div>\
	<div class="num">\
		<i data-uid="[creator]">[nick]</i><a class="hits">[hits]</a>\
	</div>\
	</section>\
	</li>';
	var html = "";
	$.getJSON(url,function(data){
		if(data.code==200){
			netease.loaded.list = true;
			netease.loaded.listType = "dj";
			netease.loaded.loadingMore = false;
			var datas = data.result;
			
			if(data.more){
				netease.loaded.hasMore = true;
			}else{
				netease.loaded.hasMore = false;
			}

			for(var i=0;i<datas.length;i++){
				var d = datas[i];
				Settings.setCacheValue(d.id,d);
				if(d.coverUrl==null||d.coverUrl==""){d.coverUrl="img/cover.png"};
				if(d.description==""||d.description==null){d.description=d.name};
				var temp = template.replace("[cover]",d.coverUrl+"?param=60y60");
				var col =parseInt((i+4)/4)+(5*(page-1));
				temp = temp.replace("[i]",col );
				temp = temp.replace(/\[face\]/g,d.dj.avatarUrl);
				temp = temp.replace(/\[nick\]/g,d.dj.nickname);
				temp = temp.replace("[creator]",d.dj.userId);
				temp = temp.replace("[desc]",d.description);
				temp = temp.replace(/\[name\]/g,d.name);
				temp = temp.replace("[hits]",d.listenerCount);
				temp = temp.replace("[fav]",d.subscribedCount);
				temp = temp.replace(/\[id\]/g,d.id);
				
				html+=temp;
			}
			if(!getMore){
				$(".list ul").hide();
				$(".list .collection").html(html).show();
				$(".list").scrollTop(0);
			}else{
				$(".list .collection").append(html);
			}
			
			netease.loading(true);
			
		}else{
			netease.loaded.hasMore = false;
		}
	});
};


//排行榜
netease.rank = function(){
	//if(netease.loaded.rank){
		$(".list ul").hide();
		$(".list").scrollTop(0);
		$(".list .rank").show();
		return;
	//}
};


//电台
netease.radio = function(){
	if(netease.loaded.radio){
		$(".list ul").hide();
		$(".list .radio").show();
		return;
	}
	netease.loading();
	var r = new Date().getTime();
	var url = netease.domain+"/api/djprogram/list?type=new&offset=0&total=true&limit=20";
	url +="&csrf_token="+netease.lckey;
	var template = '<li>\
	<p class="p[i]"><a data-id="[id]" data-type="radio"></a><img src="[cover]" /></p>\
	<em>[name]</em></li>';
	var html = "";
	$.get(url,function(data){
		data = $.parseJSON(data);
		if(data.code==200){
			netease.loaded.radio = true;
			for(var i=0;i<data.result.length;i++){
				var d = data.result[i];
				Settings.setCacheValue(d.id,d);
				var cover = d.coverUrl+"?param=60y60";
				var temp = template.replace("[cover]",cover);
				temp = temp.replace("[i]",parseInt((i+4)/4));
				temp = temp.replace("[name]",d.name);
				temp = temp.replace("[id]",d.id);
				html+=temp;
			}
			$(".list ul").hide();
			$(".list .radio").html(html).show();
			netease.loading(true);
		}
		
	});


};



//歌手
netease.singer = function(keyword,page){
	if(page==undefined){
			if(netease.loaded.singer&&netease.loaded.singerKey==keyword){
			$(".list ul").hide();
			$(".list .singer").show();
			return;
		}
	}
	netease.loading();
	page=page||1;
	var r = new Date().getTime();
	var url = netease.domain+"/search-ajaxsearch-searchalbum?kw="+keyword+"&pi="+page+"&pz=100&_="+r+"&lckey="+netease.lckey;
	var template = '<li[class]>\
	<p class="p[i]"><a data-id="[id]" data-type="[type]" title="[title]"></a><img src="[cover]" /></p>\
	<em>[name]</em></li>';
	var html = "";
	$.getJSON(url,function(data){
		if(data.dm_error==0){
			netease.loaded.singer = true;
			netease.loaded.singerKey = keyword;
			var i=0;
			for(i=0;i<data.artists.length;i++){
				var d = data.artists[i];
				Settings.setCacheValue(d.id,d);
				var cover = d.portrait;
				if(cover==null)
					cover = "img/cover.png";
				var temp = template.replace("[cover]",cover);
				temp = temp.replace("[i]",parseInt((i+4)/4) );
				temp = temp.replace("[name]",d.name);
				temp = temp.replace("[title]",d.name+"歌手电台");
				temp = temp.replace("[id]",d.id);
				temp = temp.replace("[type]","singer");
				temp = temp.replace("[class]"," class='star'");
				html+=temp;
			}
			$(".list ul").hide();
			
			//显示专辑
			var j=0;
			for(j=0;j<data.albums.length;j++){
				var d = data.albums[j];
				Settings.setCacheValue(d.id,d);
				var cover = d.cover;
				if(cover==null)
					cover = "img/cover.png";
				var temp = template.replace("[cover]",cover);
				temp = temp.replace("[i]",parseInt((j+i+4)/4) );
				temp = temp.replace("[name]",d.name);
				temp = temp.replace("[title]",d.name);
				temp = temp.replace("[id]",d.id);
				temp = temp.replace("[type]","album");
				temp = temp.replace("[class]","");
				html+=temp;
			}

			$(".list .singer").html(html).show();
			$(".list").scrollTop(0);
			netease.loading(true);

		}
		
	});


};



netease.getLyric = function(song){
	
	
	var id = song.id;
	
	$(".lyric").text("正在加载歌词");
	var url = netease.domain+"/api/song/media?id="+id+"&version=0";
	url +="&csrf_token="+netease.lckey;
	$.getJSON(url,function(result){
		if(result.code==200&&!result.nolyric){
			var lrc = result.lyric.split('\n');
			
			var filter = /^((?:\[[\d.:]+?\])+?)([^\[\]]*)$/;
			var lyricArray = {};
			for (var i = 0, len = lrc.length; i < len; i += 1) {
				var res = lrc[i].match(filter);
				var time;
				if (res) {
					time = res[1].slice(1, -1).split('][');
					for (var j = 0, jLen = time.length, tmp ; j < jLen ; j += 1) {
						tmp = time[j].split(':');
						lyricArray[Number(tmp[0])*60+Math.round(tmp[1])] = res[2];
					}
				}
			}
			
			song.lyric = lyricArray;			
			Settings.setObject("song",song);
			
			netease.lyric = lyricArray;
			$(".lyric").text(song.name);//加载完毕
		}
		
	});
	
	
	$(".lyric").html(song.name);//加载完毕

	
};

netease.user = function(getMyList,justCheck){
	chrome.cookies.get({
		url: 'http://music.163.com',
		name: 'MUSIC_U'
		}, function (c){
			if(c!=null){
				//已经登录
				$(".login").fadeOut(); 
				var userStr = "";
				//获取用户信息
				$.get("http://music.163.com/user/home",function(result){
					var reg1 = /var\sGUser={(.*)}/i;
					userStr = "{"+result.match(reg1)[1]+"}";
					userStr = userStr.replace("userId",'"userId"');
					userStr = userStr.replace("nickname",'"nickname"');
					userStr = userStr.replace("avatarUrl",'"avatarUrl"');
					userStr = userStr.replace("userType",'"userType"');
					userStr = userStr.replace("birthday",'"birthday"');
					
					var userInfo = $.parseJSON(userStr);
					Settings.setObject("userInfo",userInfo);
					netease.loaded.userInfo = userInfo;
					if(getMyList)
						netease.list("user",1,100);
						
					//获取通讯key
					chrome.cookies.get({
						url: netease.domain,
						name: '__csrf'
						}, function (c) {
							if(c!=null){
								netease.lckey = c.value;
							}
							Settings.setValue("lckey",netease.lckey);
					});
					
				});

				
			}else{
				if(justCheck){
					netease.loaded.userInfo = null;
				}else{
						
					$(".login").fadeIn();
					$(".login .close").unbind("click");
					$(".login .close").bind("click",function(){
						$(".login").fadeOut(); 
					});
				}
				
				
			}

		});
};

netease.subscribe = function(dom){

	if(netease.loaded.userInfo==null){
		netease.user();
		return;
	}
	netease.loading();
	var id = dom.attr("data-id");
	var url = netease.domain+"/api/playlist/subscribe/?id="+id;
	if(dom.hasClass("faved")){
		url = netease.domain+"/api/playlist/unsubscribe?pid="+id+"&id="+id;
	}
	url +="&csrf_token="+netease.lckey;
	$.get(url,function(result){

		if(result.code==200){
			if(dom.hasClass("faved")){
				netease.loaded.list = false;
				netease.showtip("取消收藏成功");
			}else{
				netease.showtip("收藏成功");
			}
			dom.toggleClass("faved");
			netease.loading(true);
		}
	});
};



netease.loading = function(loaded){
	if(loaded){
		$(".loading").fadeOut();
		clearTimeout(netease.loaded.loadingTimer);
	}else{
		$(".loading").fadeIn();
		/*netease.loaded.loadingTimer = setTimeout(function(){
			$(".loading").fadeOut();
		},5000);*/
	}
}


netease.fav = function(){

	if(netease.loaded.userInfo==null){
		netease.user();
		return;
	}

	var fav = "1";
	var song = Settings.getObject("song");
	var op = "add";
	if($("#favBtn").hasClass("faved")){
		$("#favBtn").removeClass("faved");
			op = "del";
			fav = "0";
			netease.showtip("取消收藏成功");
		}else{
			$("#favBtn").addClass("faved");	
			netease.showtip("收藏成功");
	}
	

	var getListUrl = netease.domain+"/api/user/playlist/?offset=0&limit=301&uid="+netease.loaded.userInfo.userId;
	getListUrl +="&csrf_token="+netease.lckey;
	
	$.getJSON(getListUrl,function(json){
		if(json.code==200){

			var pid = "";
			for(var i=0;i<json.playlist.length;i++){
				var plist = json.playlist[i];
				if(!plist.subscribed){
					pid = plist.id;
					break;
				}
			}

			if(pid!=""){
				
				var favUrl = netease.domain+"/api/playlist/manipulate/tracks";
				
				var data = {pid:pid,op:op,trackIds:"["+song.id+"]",csrf_token:netease.lckey};
				$.post(favUrl,data,function(result){
					//console.log(result);
				});

			}
		}
	});
	
	
	
	var songs = Settings.getObject("songs");
	for(var i=0;i<songs.length;i++){
		songs[i].isfaved = fav;
		song.isfaved = fav;
		Settings.setObject("song",song);
		Settings.setObject("songs",songs);
	}
	//console.log(song);
}




//快捷键设置
netease.hotkey = function(){
	var timeout = null;
	var showtip = function(msg){
		$(".tips").fadeIn().text(msg);
		clearTimeout(timeout);
		timeout = setTimeout(function(){
			$(".tips").fadeOut();
		},1000);
	};
	netease.showtip = showtip;
	
	$("body").bind("keydown",function(){
		var a=window.event.keyCode;
		//right 39 left 37 up 38 down 40
		switch(a){
			case 39:
				netease.player.reset();
				netease.player.next();
				showtip("下一首");
			break;
			case 37:
				netease.player.reset();
				netease.player.prev();
				showtip("上一首");
			break;
			case 38:
				netease.player.up();
				var volume = Settings.getValue("volume",1)*100;
				showtip("音量"+volume+"%");
			break;
			case 40:
				netease.player.down();
				var volume = Settings.getValue("volume",1)*100;
				showtip("音量"+volume+"%");
			break;
			case 80:
				if($(".cd .ctrl").hasClass("play")){
					netease.player.play();
					showtip("播放");
				}	
				else{
					netease.player.pause();
					showtip("暂停");
				}
					

			break;
		}

		//console.log(a);
	});
}


netease.songlist = function(id,data){
	
	var url = netease.domain+"/playlist?id="+id;
	if(data.type=="dj")
		url = netease.domain+"/dj?id="+id;
	
	$(".s-title").text(data.title);
	$(".s-pic").attr("title",data.author);
	$(".s-pic img").attr("src",data.face);
	$(".s-list").html('<p style="margin-left: 98px;margin-top: 80px;"><img src="img/loading.gif"></p>');
	$(".song").animate({marginLeft: "0"}, 200 );
		
	$.get(url,function(result){
		//console.log(result);
		//var reg1 = /var\sGUser={(.*)}/i;
		var reg = /<table\sid="m-song-module"\sclass="m-table">([\s\S]*)<\/table>/
		if(!reg.test(result)){
			$(".s-list").html('<p style="text-align:center;margin-top: 80px;">无歌曲列表~</p>');
			return;
		}
		
		var tableStr = result.match(reg)[1];
		//console.log(tableStr);
		
		var table = document.createElement("table");
		table.innerHTML = tableStr;
		
		var songlist = {
			ids:[],
			names:[],
			singers:[]
		};
		
		var $table = $(table);
		$table.find(".ztag").each(function(){
			songlist.ids.push($(this).data("id"));
		});
		$table.find(".txt b a").each(function(){
			songlist.names.push($(this).text());
		});
		$table.find(".text span").each(function(){
			songlist.singers.push($(this).text());
		});
		
		
		//console.log(songlist);
		var html = [];
		for(var i=0;i<songlist.ids.length;i++){
			
			html.push('<li><span class="s-btn"><a class="s-play" data-index="'+i+'" data-type="'+data.type+'" data-id="'+id+'"></a><a class="s-index">'+(i+1)+'</a></span>\
				<a class="s-name" title="'+songlist.names[i]+'">'+songlist.names[i]+'</a><a class="s-singer" title="'+songlist.singers[i]+'">'+songlist.singers[i]+'</a></li>');
		}
		
		
		$(".s-list").html(html.join(''));
		
		
		
	});
	
	
}



netease.init();
netease.hotkey();


//for test

window.netease = netease;


});