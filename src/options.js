$(function(){
	var options = Settings.getObject("options");
	
	if(options){
		$(".checkbox").removeAttr("checked");
		var ctrls = "";
		if(options.rank==1)
			document.getElementById("rank").checked = true;
		if(options.radio==1)
			document.getElementById("radio").checked = true;
		if(options.mine==1)
			document.getElementById("mine").checked = true;
		if(options.lyric==1)
			document.getElementById("lyric").checked = true;
		if(options.notify==1)
			document.getElementById("notify").checked = true;
		if(options.cover=="singer")
			document.getElementById("picsinger").checked = true;
		if(options.cover=="album")
			document.getElementById("picalbum").checked = true;

	}
	
	$(".checkbox,.radio").bind("click",function(){
		var op = {};
		op.rank = (document.getElementById("rank").checked)?1:0;		
		op.radio = (document.getElementById("radio").checked)?1:0;		
		op.mine = (document.getElementById("mine").checked)?1:0;
		op.lyric = (document.getElementById("lyric").checked)?1:0;
		op.notify = (document.getElementById("notify").checked)?1:0;
		if(document.getElementById("picalbum").checked)
			op.cover = "album";
		else
			op.cover = "singer";
		Settings.setObject("options",op);
	});

	$(".menu a").bind("click",function(){
		$(".menu a").removeClass("hover");
		$(this).addClass("hover");
		$("dl").hide();
		$("."+$(this).attr("id")).show();
	});

});