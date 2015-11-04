$(function(){

	var ver = Settings.getValue("ver"); 
	if(ver!="2.0"){
		Settings.setValue("ver","2.0");
		chrome.tabs.create({url: "options.html"});
	}

	var player = {};
	var port = new backgroundConnector();
	var audio = null;
	player.list = null;
	player.listCount = 0;
	player.listPage = 1;
	player.songs = new Array();
	player.index = 0;
	player.type = Settings.getValue("type","list");
	player.error = 0;
	player.fav = "0";
	player.errorTime = new Date();
	
	player.options = function(){
		return Settings.getObject("options")||{list:1,radio:1,rank:1,mine:1,lyric:1,notify:1,cover:"album"};
	}
	
	player.init = function(){
		$("body").append("<audio id='player' autoplay></audio>");
		audio = document.getElementById("player");
		audio.volume = Settings.getValue("volume",1);
		audio.addEventListener('error', function(evt) {
			//console.log(audio,"error");
			player.errorTime = new Date();
			var span = new Date() - player.errorTime;
			if(span>60000)
				player.error = 0;
			if(player.error<100){
				player.playNext();
			}
			player.error ++;
		});
		audio.addEventListener('timeupdate', function(evt) {
			var percentPlayed = Math.round(audio.currentTime / audio.duration * 100);
			//var barWidth = Math.ceil(percentPlayed * (width / 100));
			var msg = {act:"timeupdate",time:audio.currentTime,percent:percentPlayed,duration:audio.duration};
			port.send(msg);
		});
		audio.addEventListener('ended', function(evt) {
			//console.log(audio.currentTime+""+audio.duration,"ended");
			player.playNext();
		});

		//从缓存中取得上次收听的数据
		player.listCount = parseInt(Settings.getValue("count","0"));
		player.index = parseInt(Settings.getValue("index","0"));
		player.listPage = parseInt(Settings.getValue("page","1"));
		var list = Settings.getObject("list");
		if(list)
			player.list = list;
		var songs = Settings.getObject("songs");
		if(songs){
			player.songs = songs;
		}	
		

	};

	player.getAndPlay = function(playIndex){
		port.send({act:"loading"});
		switch(player.type){
			case"dj":
				player.getAndPlayDj();
			break;
			case"singer":
				player.getAndPlayRadio(true);
			break;
			case"album":
				player.getAndPlayAlbum();
			break;
			default:
				player.getAndPlayList(playIndex);
			break;
		}
	};

	player.getAndPlayList = function(playIndex){
		
		player.index = 0;
		if(playIndex)
			player.index = playIndex;
		player.listPage = 1;
		
		Settings.setValue("page",player.listPage);
		Settings.setValue("type","list");
		
		Settings.setObject("list",player.list);
		var id = player.list.id;
		
		var url = "http://music.163.com/api/playlist/detail?id="+id;
		url +="&csrf_token="+Settings.getValue("lckey","");
		$.get(url,function(data){
			
			if(data.code==200){
				
				player.listCount = data.result.trackCount;
				Settings.setValue("count",player.listCount);
				player.songs = data.result.tracks;
				if(player.fav=="1"){
					for(var a=0;a<player.songs.length;a++){
						player.songs[a].isfaved = "1";
					}
				}

				Settings.setObject("songs",player.songs);
				player.play();
			}
		});
	};


	player.getAndPlayAlbum = function(){
		
		player.index = 0;
		player.listPage = 1;
		Settings.setValue("page",player.listPage);
		Settings.setValue("type","album");
		var r = new Date().getTime();

		var newlist = {};
		newlist.id = player.list.id;
		newlist.coverurl = player.list.cover;
		newlist.name = player.list.name;
		if(player.list.artists.length>0){
			newlist.creator =  {nick_name:player.list.artists[0].name,portrait:player.list.artists[0].portrait};
		}
		Settings.setObject("list",newlist);
		var id = player.list.id;
		var lckey = Settings.getValue("lckey","");
		var url = "http://v5.pc.duomi.com/singer-ajaxsinger-albumsongs?id="+id+"&pi=1&pz=50&_="+r+"&lckey="+lckey;
		$.getJSON(url,function(data){
			if(data.dm_error==0){
				player.listCount = data.total;
				Settings.setValue("count",player.listCount);
				var songs = new Array();
				for(var i=0;i<data.tracks.length;i++){
					songs.push({track:data.tracks[i],album:data.tracks[i].album});
				}
				
				player.songs = songs;
				
				Settings.setObject("songs",player.songs);
				player.play();
			}
		});
	};

	player.getAndPlayDj = function(playIndex){
		player.index = 0;
		if(playIndex)
			player.index = playIndex;
		player.listPage = 1;
		Settings.setValue("page",player.listPage);
		
		var r = new Date().getTime();
		var id = player.list.id;
		var url = "http://music.163.com/api/dj/program/detail?id="+id+"&ids=%5B"+id+"%5D";
		url +="&csrf_token="+Settings.getValue("lckey","");
		$.getJSON(url,function(data){
			//console.log(data);

			if(data.program&&data.program.songs&&data.program.songs.length>0){
				player.songs = data.program.songs;
				player.listCount = data.program.songs.length;
				Settings.setValue("count",player.listCount);
				Settings.setObject("songs",player.songs);
				data.program.songs = null;
				player.list = data.program;
				Settings.setObject("list",player.list);
				player.playDj();
			}
		});
	};

	player.getAndPlayRadio = function(singerRadio){
		player.index = 0;
		player.listPage = 1;
		Settings.setValue("page",player.listPage);
		
		var r = new Date().getTime();
		var id = player.list.id;
		//歌手电台http://v5.pc.duomi.com/singer-ajaxsinger-radio?id=50001233
		var url = "http://search.pc.duomi.com/search?t=getrndlistsong&plid="+id+"&pi=50&mz";

		var newlist = {};
		newlist.id = player.list.id;
		newlist.creator = {nick_name:"网易云音乐",portrait:"img/logo.png"};
		if(singerRadio){
			url = "http://v5.pc.duomi.com/singer-ajaxsinger-radio?id="+id;
			newlist.coverurl = player.list.portrait;
			newlist.name = player.list.name+"电台";
			Settings.setValue("type","singer");
		}else{
			Settings.setValue("type","radio");
			newlist.coverurl = player.list.treenode.url;
			newlist.name = player.list.treenode.name;
		}
		Settings.setObject("list",newlist);
			
		$.getJSON(url,function(data){
			if(data.item){
				player.listCount = data.head.hit;
				Settings.setValue("count",player.listCount);
				player.songs = new Array();
				for(var i=0;i<data.item.length;i++){
					var song = data.item[i];
					var newsong = {};
					newsong.id = song.sid;
					newsong.name = song.sname;
					newsong.singer = song.sartist;
					if(song.alid!=""){
						newsong.pic = "http://imgv5.duomiyy.com/album/l"+song.alid+".jpg";
					}else{
						newsong.pic = "img/cover.png";
					}
					player.songs.push(newsong);
				}
				Settings.setObject("songs",player.songs);
				player.playRadio();
			}
		});
	};


	player.playPrev = function(){
		player.pause();
		player.index-=1;
		player.play();
	};
	player.playNext = function(){
		player.index+=1;
		player.play();
	};
	player.volumeUp = function(){
		var audio = document.getElementById("player");
		if((audio.volume + 0.1)<=1){
			audio.volume += 0.1;
		}else{
			audio.volume = 1;
		}
		Settings.setValue("volume",audio.volume.toFixed(2));
	},
	player.volumeDown = function(){
		var audio = document.getElementById("player");
		if((audio.volume - 0.1)>0){
			audio.volume -= 0.1;
		}else{
			audio.volume = 0;
		}
		Settings.setValue("volume",audio.volume.toFixed(2));
	},
	player.pause = function(){
		audio.pause();
	};
	player.replay = function(){
		if(audio.currentTime>0){
			audio.play();
		}else{
			audio.src = "";
			player.play();
		}
	};

	player.play = function(){
		if(Settings.getValue("cycle",0)==1){
			if(audio.currentTime>0){
				audio.play();
			}else{
				audio.src = "";
				if(player.type=="radio"||player.type=="singer"){
					player.playRadio();
				}else
				{
					player.playTo();
				}
			}
		}else{
			if(player.type=="radio"||player.type=="singer"){
				player.playRadio();
			}else
			{
				player.playTo();
			}
		}
		
	};

	player.playTo = function(){
		if(player.index<0){
			player.index = 0;
		}
		if(player.index>=player.listCount){
			player.index = 0;
		}else{
			
			var song = player.songs[player.index];
			Settings.setObject("song",song);
			Settings.setValue("index",player.index);
			port.send({act:"play"});//先显示歌手照片到CD
			//var songid = song.track.id||song.id;
			audio.setAttribute("src",song.mp3Url);
			audio.play();
			port.send({act:"loaded"});
		}
		if(player.options().notify==1){
			var ntfy = new notify();
			ntfy.show();
		}
		
	};

	player.playDj = function(){
		//console.log(player.listCount,"playradio");
		if(player.index<0){
			player.index = 0;
		}
		if(player.index>=player.listCount){
			player.getAndPlayDj();
		}else{
			var song = player.songs[player.index];
			Settings.setObject("song",song);
			Settings.setValue("index",player.index);
			port.send({act:"play"});
			audio.setAttribute("src",song.mp3Url);
			audio.play();
			port.send({act:"loaded"});
		}
		if(player.options().notify==1){
			var ntfy = new notify();
			ntfy.show();
		}
	};

	player.playRadio = function(){
		//console.log(player.listCount,"playradio");
		if(player.index<0){
			player.index = 0;
		}
		if(player.index>=player.listCount){
			player.getAndPlayRadio();
		}else{
			var song = player.songs[player.index];
			Settings.setObject("song",song);
			Settings.setValue("index",player.index);
			port.send({act:"play"});//先显示歌手照片到CD
			audio.setAttribute("src",player.url(song.id));
			audio.load();
			port.send({act:"loaded"});
		}
		if(player.options().notify==1){
			var ntfy = new notify();
			ntfy.show();
		}
	};


	player.url = function(id){
		return "http://www.duomi.com/third-getfile?id="+id;
	};

	
	window.notify = function () {
        var notify, visible = false, timer = null, self = this;
        return {
            show: function () {
				if(window.webkitNotifications){
					//notify = webkitNotifications.createHTMLNotification('../notify.html');
					var song = Settings.getObject("song");
					var icon = ""; 
					var title = song.artists[0].name;
					var name = song.name;
					var album = "";
					album = "<"+song.album.name+"> ";
					icon = song.album.picUrl+"?param=60y60";
					
					var body = album + name;
					notify = webkitNotifications.createNotification(icon, title, body);
					notify.show();
					visible = true;
					this.timer();
				}
            },
            hide: function () {
                notify.cancel();
                visible = false;
            },
            timer: function () {
                timer = setTimeout(function () {
                    this.hide();
                    timer = null;
                }.bind(this), 3000);
            },
            clear: function () {
                clearTimeout(timer);
                timer = null;
            },
            isVisible: function () {
                return visible;
            }
        }
    }

	var background = {};
	background.init = function(){
		port.name = "163music";
		port.onConnect = function(p){
			//console.log(p,"cnnt");
		};
		port.onDisConnect = function(p){
			//console.log(p,"disc");
		};

		port.init(function(msg){
			//console.log(msg,'message');
			switch(msg.act){
				case "playlist":
					player.list = msg.data;
					player.type = "list";
					player.fav = msg.fav;
					player.songs = new Array();
					player.getAndPlay(msg.idx);
				break;
				case "playdj":
					player.list = msg.data;
					player.songs = new Array();
					player.type = "dj";
					player.getAndPlayDj(msg.idx);
				break;
				case "playradio":
					player.list = msg.data;
					player.songs = new Array();
					player.type = "radio";
					player.getAndPlay();
				break;
				case "playalbum":
					player.list = msg.data;
					player.type = "album";
					player.songs = new Array();
					player.getAndPlay();
				break;
				case "playsinger":
					player.list = msg.data;
					player.type = "singer";
					player.songs = new Array();
					player.getAndPlay();
				break;
				case "pause":
					player.pause();
				break;
				case "play":
					player.replay();//先检查是否继续播放
				break;
				case "next":
					player.playNext();
				break;
				case "prev":
					player.playPrev();
				break;
				case "up":
					player.volumeUp();
				break;
				case "down":
					player.volumeDown();
				break;
				
			}
		});

		player.init();
	};


//调用
background.init();
//window.player = player;


});


chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        if (details.type === 'xmlhttprequest'||details.type === 'other') {
            var exists = false;
            for (var i = 0; i < details.requestHeaders.length; ++i) {
                if (details.requestHeaders[i].name === 'Referer') {
                    exists = true;
                    details.requestHeaders[i].value = 'http://music.163.com';
                    break;
                }
            }

            if (!exists) {
             details.requestHeaders.push({ name: 'Referer', value: 'http://music.163.com'});
            }

            return { requestHeaders: details.requestHeaders };
        }
    },
    {urls: ['http://music.163.com/api/*','http://*.music.126.net/*']},
    ["blocking", "requestHeaders"]
);