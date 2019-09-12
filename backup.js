class MediaFile {
    constructor(id,src,pdf){
        this.id = id;
        this.src = src;
		this.pdf = pdf;
    }
    toString(){
        return JSON.stringify(this);
    }
}

var files = [];
var snippets = [];
var cut_scale = { x: 1, y: 1};
var canvasPages = 1;

function init(){
	$(".side-btn").click(toggleSide);
	$(".panel-title").click(clickPanel);
	$("nav li").click(clickNavButton);
	$("input[type='file']").change(addNewFile);
	$("#next-page").click(function(event){
		var cur = parseInt($("#cur-page").text());
		var max = parseInt($("#max-page").text());
		if (cur < max) drawPdfOnCanvas(currentSelectData.pdf,$("#cut-main canvas"),cur+1);
	});
	$("#last-page").click(function(event){
		var cur = parseInt($("#cur-page").text());
		if (cur > 1) drawPdfOnCanvas(currentSelectData.pdf,$("#cut-main canvas"),cur-1);
	});
	$("#cut-main canvas, #square").on("mousedown touchstart",canvasClickStart);
	$("#cut-main canvas").on("mouseup mouseleave touchend touchcancel",canvasClickEnd);
	$("#cut-main canvas, #square").on("contextmenu",function(event){
		event.preventDefault();
		cut_snippet();
	});
	
	$(".canvas-wrapper").droppable({
		drop: function(event,ui){
			var img = $(ui.draggable);
			if (!$(ui.draggable).hasClass("already-dropped")){
				img = $(ui.draggable).clone();
				var offset = $(this).offset();
				var s = snippets.filter(e=>e.src == img.attr("src"));
				console.log("FILTERED: ",s);
				img.css({
					position: "absolute",
					left: parseFloat($(ui.helper).css("left"))-offset.left,
					top: parseFloat($(ui.helper).css("top"))-offset.top,
					zIndex: $(ui.helper).css("z-index"),
					maxWidth: "100%",
					maxHeight: "100%",
					width: s.width,
					height: s.height,
				});
				img.draggable({
					revert: "invalid",
					stack: "img"
				});
			}
			
			$("img.active").removeClass("active");
			img.addClass("active");
			img.off("contextmenu");
			img.on("contextmenu",function(event){
				event.preventDefault();
				$(img).remove();
			});
			$(this).append(img);
			img.addClass("already-dropped");
		}
	});
	
	$("[data-toggle='popover']").popover({
		html: true,
	});
	
	$(document).keydown(function(event){
		if ($("nav li[name='Files']").hasClass("active")){
			if (event.keyCode == 37) $("#last-page").click();
			else if (event.keyCode == 39) $("#next-page").click();
		}
	});
}

function canvasClickStart(event){
	if (event.which !== 1) return;
	var p1 = getCoordinates(event);
	var s = $("#square");
	$("#square").css({
		top: p1.y,
		left: p1.x,
		width: 1,
		height: 1,
		display: "block",
	});
	$("#cut-main canvas, #square").on("mousemove touchmove",function(event){
		var p2 = getCoordinates(event);
		var minX = Math.min(p1.x,p2.x);
		var minY = Math.min(p1.y,p2.y);
		var maxX = Math.max(p1.x,p2.x);
		var maxY = Math.max(p1.y,p2.y);
		
		var width = maxX-minX;
		var height = maxY-minY;
		s.css({
			top: minY,
			left: minX,
			width: width,
			height: height
		});
	});
}

function canvasClickEnd(event){
	if (event.relatedTarget){
		if (event.relatedTarget.id == "square") return;
	}
	$("#cut-main canvas, #square").off("mousemove touchmove");
}

function cut_snippet(){
	var s = $("#square");
	var ctx = $("#cut-main canvas")[0].getContext("2d");
	var data = ctx.getImageData(parseFloat(s.css("left"))*cut_scale.x,parseFloat(s.css("top"))*cut_scale.y,parseFloat(s.css("width"))*cut_scale.x,parseFloat(s.css("height"))*cut_scale.y);
	//var data = ctx.getImageData(parseFloat(s.css("left"))*cut_scale.x,parseFloat(s.css("top"))*cut_scale.y,parseFloat(s.css("width"))*cut_scale.x,parseFloat(s.css("height"))*cut_scale.y);
	//var data = ctx.getImageData(0,0,$("#cut-main canvas")[0].width,$("#cut-main canvas")[0].height);
	console.log(data);
	
	var canvas = $("<canvas></canvas>");
	canvas.appendTo("body");
	canvas[0].width = data.width;
	canvas[0].height = data.height;
	
	ctx = canvas[0].getContext("2d");
	
	// TODO: calculate square position and canvas dimension
	ctx.putImageData(data,0,0);
	//ctx.drawImage($("#cut-main canvas")[0],parseFloat(s.css("left"))*cut_scale.x,parseFloat(s.css("top"))*cut_scale.y,parseFloat(s.css("width"))*cut_scale.x,parseFloat(s.css("height"))*cut_scale.y,0,0,parseFloat(s.css("width")),parseFloat(s.css("height")));
	
	var imgSrc = canvas[0].toDataURL("image/png");
	
	var mf = new MediaFile("Snippet",imgSrc);
	mf.width = parseFloat(s.css("width"));
	mf.height = parseFloat(s.css("height"));
	
	snippets.push(mf);
	appendImage("#merge-snippets",imgSrc,"",mf);
	
	canvas.remove();
	$("li[name='Snippets']").click();
	$("#square").css("display","none");
}

function getCoordinates(event){
	if (event.targetTouches) {
		//console.log("touch event");
	    var rect = event.target.getBoundingClientRect();
	    return {
			x: event.targetTouches[0].pageX - rect.left,
		    y: event.targetTouches[0].pageY - rect.top
	    };
	}
	else {
		//console.log("mouse event");
		var offset = $(event.target).closest("canvas").offset();
		if (offset === undefined) offset = $("#cut-main canvas").offset();
		return {
			x: event.clientX-offset.left,
			y: event.clientY-offset.top
		};
	}
}

function clickPanel(event){
	var h4 = $(event.target).closest("h4");
	var txt = h4.text().trim();
	if (txt == "Tools") return;
	$("nav .active").removeClass("active");
	$("li[name='"+txt+"']").addClass("active");
	$("#cut-main, #paste-main").addClass("hidden");
	$(txt == "Files" ? "#cut-main" : "#paste-main").removeClass("hidden");
	$(".Files-tools, .Snippets-tools").addClass("hidden");
	$("."+txt+"-tools").removeClass("hidden");
}

function clickNavButton(event){
	var li = $(event.target).closest("li");
	$(".panel-title").filter(function(i,e){
		return $(e).text().trim() == li.attr("name");
	}).click();
}

function toggleSide(event){
	var btn = $(event.target).closest(".btn");
	btn.children("span").toggleClass("glyphicon-circle-arrow-left glyphicon-circle-arrow-right");
	var side,main;
	$("#side h3, #side .col-xs-8, #side .panel-group, #side .panel-default, #side hr").toggleClass("hidden");
	$("#side").toggleClass("col-xs-1 col-md-1 col-xs-6 col-md-4");
	$("#main").toggleClass("col-xs-6 col-md-8 col-xs-11 col-md-11");
	var div = btn.parent();
	div.css("text-align",div.css("text-align")=="left"?"right":"left");
}

function addNewFile(event){
	var input = $("input[type='file']")[0];
    for (var i=0;i<input.files.length;i++){
        let file = input.files[i];
        let fileReader = new FileReader();
        if (file.name.endsWith(".pdf")){    // Handle PDF's
            fileReader.onload = function(){
                let typedarray = new Uint8Array(this.result);
                pdfjsLib.getDocument(typedarray).then(function(pdf){
                    pdfToImgSrc(pdf).then(function(imgSrc){
						var mf = new MediaFile(file.name,imgSrc,pdf);
						files.push(mf);
						appendImage("#cut-files",imgSrc,file.name,mf);
					}).catch(function(err){
						console.log(err);
						console.log("[ERROR] Could not convert PDF to Image Src ...");
					});
                });
            };
            fileReader.readAsArrayBuffer(file);
        }
        else {                                // Handle Images
            fileReader.onload = function(event){
                var mf = new MediaFile(file.name,event.target.result);
				files.push(mf);
                appendImage("#cut-files",event.target.result,file.name,mf);
            }
            fileReader.readAsDataURL(file);
        }
    }
}

function pdfToImgSrc(pdf,pageNr){
	pageNr = parseInt(pageNr) ? pageNr : 1;
    return new Promise(function(resolve,reject){
        var canvas = $("<canvas class='hidden'></canvas>");
        canvas.appendTo("body");
        pdf.getPage(pageNr).then(function(page){
            var viewport = page.getViewport(2.0);
            canvas[0].width = viewport.width;
            canvas[0].height = viewport.height;
            var renderTask = page.render({canvasContext:canvas[0].getContext("2d"), viewport:viewport});
            renderTask.promise.then(function(){
                // save canvas as image
                var imgData = canvas[0].toDataURL("image/jpeg", 1.0);
                // Append image to side list
                resolve(imgData);
				canvas.remove();
            }).catch(function(...args){
				reject(...args);
				canvas.remove();
			});
        }).catch(function(...args){
			reject(...args);
			canvas.remove();
		});
    });
}

function appendImage(listId, imgSrc, fileName, mf){
    var list = $(listId);
    var img = $("<div class='text-center' name='"+fileName+"'><hr/><span>"+fileName+"</span> <span class='glyphicon glyphicon-remove-circle hover-red' style='color:grey' onclick='removeImage(this)'></span><br/><img style='width:"+mf.width+";height:"+mf.height+";' src='"+imgSrc+"' class='preview-img'></div>");
    img.click(function(event){
		if (listId == "#cut-files"){
			var imgTag = $(event.target).find("img");
			if (imgTag.length == 0) imgTag = $(event.target).closest("img");
			
			if (mf.pdf) {
				drawPdfOnCanvas(mf.pdf,$("#cut-main canvas"),1);
				currentSelectData = mf;
				$("#switch-page").removeClass("hidden");
				$("#cur-page").text("1");
				$("#max-page").text(mf.pdf._pdfInfo.numPages);
			}
			else {
				drawImageOnCanvas(imgTag[0],$("#cut-main canvas")[0]);
				$("#switch-page").addClass("hidden");
			}
			if (!$("#tools-panel .panel-body").is(":visible")) $("#tools-panel h4").click();
			$(listId).closest(".panel-default").find(".panel-title").click();
		}
	});
	if (listId == "#merge-snippets") {
		img.find("img").draggable({
			appendTo: "#content",
			containment: "window",
			helper: "clone",
			revert: "invalid",
			stack: "img"
		});
	}
    if (list.find("img").length == 0) list.empty();
    list.append(img);
}

function removeImage(elem){
	console.log("REMOVE: ",elem);
	$(elem).closest("div").remove();
}

function drawImageOnCanvas(img,canvas){
	iWidth = img.naturalWidth;
	iHeight = img.naturalHeight;
	cWidth = $(canvas).innerWidth();
	cHeight = $(canvas).innerHeight();
	console.log("I: ",iWidth," ",iHeight);
	console.log("C: ",cWidth," ",cHeight);

	//canvas.getContext("2d").drawImage(img,0,0);
	
	if (iWidth < iHeight){	// HOCHFORMAT
		canvas.width = iWidth;
		canvas.height = iHeight;
		canvas.getContext("2d").drawImage(img,0,0);
	}
	else {					// QUERFORMAT
		canvas.width = iWidth;
		if (iHeight < cHeight) {
			canvas.height = cHeight;
			canvas.getContext("2d").drawImage(img,0,(cHeight-iHeight)/2);
		}
		else {
			canvas.height = iWidth;
			canvas.getContext("2d").drawImage(img,0,0);
		}
	}
	cut_scale.x = canvas.width/$(canvas).outerWidth();
	cut_scale.y = canvas.height/$(canvas).outerHeight();
}

function drawPdfOnCanvas(pdf,canvas,pageNr){
	return new Promise(function(resolve,reject){
		pageNr = parseInt(pageNr) ? pageNr : 1;
		pdf.getPage(pageNr).then(function(page){
			var viewport = page.getViewport(2.0);
			canvas[0].width = viewport.width;
			canvas[0].height = viewport.height;
			cut_scale.x = canvas[0].width/$(canvas).outerWidth();
			cut_scale.y = canvas[0].height/$(canvas).outerHeight();
			var renderTask = page.render({canvasContext:canvas[0].getContext("2d"), viewport:viewport});
			renderTask.promise.then(function(){
				if (canvas.closest("#cut-main").length > 0) $("#cur-page").text(pageNr);
				resolve();
			}).catch(function(...args){
				reject(...args);
				canvas.remove();
			});
		}).catch(function(...args){
			reject(...args);
			canvas.remove();
		});
	});
}

function resizeActiveImage(faktor){
	$("label[for='zoom-input']").text($("#zoom-input").val());
	var active = $(".canvas-wrapper .active");
	if (active.length > 0){
		var img = active.find("img");
		if (img.length == 0) img = active;
		var scale = $("#zoom-input").val();
		img.css({
			width: "+="+parseFloat(img.css("width"))*faktor,
			height: "+="+parseFloat(img.css("height"))*faktor
		});
	}
}

function saveAsPdf(){
	/*
		TODO: 
			1) Render each image onto canvas at given position
			2) Search for jsPDF library to download canvas as pdf
			3) trigger download
	*/
	var imgs = $(".canvas-wrapper img");
	imgs.sort(function(a,b){
		return parseInt($(a).css("z-index")) > parseInt($(b).css("z-index"));
	});
	var canvas = $("#paste-main canvas")[0];
	canvas.width = 595;
	canvas.height = 842;
	var ctx = canvas.getContext("2d");
	ctx.rect(0,0,1000*1000,1000*1000);
	ctx.fillStyle = "white";
	ctx.fill();
	for (var i=0;i<imgs.length;i++){
		console.log(imgs.eq(i));
		var x = parseFloat(imgs.eq(i).css("left"));
		var y = parseFloat(imgs.eq(i).css("top"));
		var w = parseFloat(imgs.eq(i).outerWidth());
		var h = parseFloat(imgs.eq(i).outerHeight());
		ctx.drawImage(imgs[i],x,y,w,h);
		//imgs.eq(i).remove();
	}
	var imgData = canvas.toDataURL("image/jpeg");
	var downloadPdf = new jsPDF();
	downloadPdf.addImage(imgData,"JPEG",0,0);
	/*ctx.rect(0,0,1000*1000,1000*1000);
	ctx.fillStyle = "white";
	ctx.fill();*/
	downloadPdf.save("download.pdf");
}

function clearCanvas(canvasId){
	var canvas = $(canvasId)[0];
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0,0,canvas.width,canvas.height);
}

$(document).ready(init);