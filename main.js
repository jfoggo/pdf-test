class MediaFile {
    constructor(id,name,src,pdf){
        this.id = "mf"+id;
		this.name = name;
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
var canvasWidth,canvasHeight;
var idCounter = 0;
var currentlyRendering = false;
var vp = 2;
var lastMF;

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
	
	$("#paste-main .canvas-wrapper").droppable({
		drop: function(event,ui){
			var img = $(ui.draggable);
			if (!$(ui.draggable).hasClass("already-dropped")){
				img = $(ui.draggable).clone();
				var offset = $(this).offset();
				img.css({
					position: "absolute",
					left: parseFloat($(ui.helper).css("left"))-offset.left,
					top: parseFloat($(ui.helper).css("top"))-offset.top,
					zIndex: $(ui.helper).css("z-index"),
					maxHeight: "100%",
					maxWidth: "100%"
				});
				var mf_id = img.attr("id");
				var mf = files.concat(snippets).filter(e=>e.id == mf_id)[0];
				img.draggable({
					revert: "invalid",
					stack: "img",
					start: function(event,ui){
						$(ui.helper).css({
							width: mf.width,
							height: mf.height
						});
						$(".canvas-wrapper .active").removeClass("active");
						$(ui.helper).addClass("active");
					}
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
		if (!currentlyRendering && $("nav li[name='Files']").hasClass("active")){
			if (event.keyCode == 37) $("#last-page").click();
			else if (event.keyCode == 39) $("#next-page").click();
		}
	});
	
	canvasHeight2 = parseFloat($("canvas:visible").css("height"));
	canvasWidth2 = parseFloat($("canvas:visible").css("width"));
	canvasWidth = 2480;
	canvasHeight = 3508;
	/*canvasWidth = canvasWidth2*4;
	canvasHeight = canvasHeight2*4;*/
	var c = $("#paste-main canvas")[0];
	c.width = canvasWidth;
	c.height = canvasHeight;
	clearCanvas("#paste-main canvas");
	clearCanvas("#cut-main canvas");
	
	enumeratePages();
	
	/*$("#combine-list").sortable({
		containment: "parent"
	});*/
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
        event.preventDefault();
	});
    event.preventDefault();
}

function canvasClickEnd(event){
	if (event.relatedTarget){
		if (event.relatedTarget.id == "square") return;
	}
	$("#cut-main canvas, #square").off("mousemove touchmove");
}

function cut_snippet(){
	var s = $("#square");
	if (!s.is(":visible")) return;
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
	ctx.putImageData(data,0,0);
	//ctx.drawImage($("#cut-main canvas")[0],parseFloat(s.css("left"))*cut_scale.x,parseFloat(s.css("top"))*cut_scale.y,parseFloat(s.css("width"))*cut_scale.x,parseFloat(s.css("height"))*cut_scale.y,0,0,parseFloat(s.css("width")),parseFloat(s.css("height")));
	
	var imgSrc = canvas[0].toDataURL("image/png",1.0);
	
	var mf = new MediaFile(idCounter++,"Snippet",imgSrc);
	mf.width = parseFloat(s.css("width"));
	mf.height = parseFloat(s.css("height"));
	
	snippets.push(mf);
	appendImage("#merge-snippets",imgSrc,"",mf);
	
	canvas.remove();
	//$("li[name='Snippets']").click();
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
	var txt = h4.text().trim().split(" ")[0];
	if (txt == "Tools") return;
	console.log(txt);
	$("nav .active").removeClass("active");
	$("li[name='"+txt+"']").addClass("active");
	$("#cut-main, #paste-main, #combine-main").addClass("hidden");
	$(txt == "Files" ? "#cut-main" : (txt == "Snippets" ? "#paste-main" : "#combine-main")).removeClass("hidden");
	$(".Files-tools, .Snippets-tools, .Combine-tools").addClass("hidden");
	$("."+txt+"-tools").removeClass("hidden");
	$("#square").css("display","none");
}

function clickNavButton(event){
	var li = $(event.target).closest("li");
	$(".panel-title").filter(function(i,e){
		return li.attr("name") == $(e).text().trim().split(" ")[0];
	}).click();
}

function toggleSide(event){
	var btn = $(event.target).closest(".btn");
	btn.children("span").toggleClass("glyphicon-circle-arrow-left glyphicon-circle-arrow-right");
	var side,main;
	$("#side h3, #side .col-xs-8, #side .panel-group, #side .panel-default, #side hr").toggleClass("hidden");
	$("#side").toggleClass("col-xs-2 col-md-1 col-xs-6 col-md-4");
	$("#main").toggleClass("col-xs-6 col-md-8 col-xs-10 col-md-11");
	var div = btn.parent();
	div.css("text-align",div.css("text-align")=="left"?"right":"left");
}

function addNewFile(event){
	var input = $("input[type='file']")[0];
	console.log("ADDING NEW FILE");
    for (let i=0;i<input.files.length;i++){
        let file = input.files[i];
		console.log("[*] Try adding file: "+file.name);
        let fileReader = new FileReader();
        if (file.name.endsWith(".pdf")){    // Handle PDF's
			console.log("Handling PDF file ...");
            fileReader.onload = function(){
				console.log("FileReader loaded ...");
                let typedarray = new Uint8Array(this.result);
				currentlyRendering = true;
				console.log("Converting pdf to array ...");
                pdfjsLib.getDocument(typedarray).promise.then(function(pdf){
					console.log("PDFjs converted array to pdf ...");
                    pdfToImgSrc(pdf).then(function(imgSrc){
						console.log("PDF converted to IMG src ...");
						currentlyRendering = false;
						var mf = new MediaFile(idCounter++,file.name,imgSrc,pdf);
						appendPdfToCombineList(mf);
						lastMF = mf;
						files.push(mf);
						appendImage("#cut-files",imgSrc,file.name,mf);
					}).catch(function(err){
						currentlyRendering = false;
						console.log(err);
						console.log("[ERROR] Could not convert PDF to Image Src ...");
                        alert("Could not render PDF ... STEP 0");
					});
                }).catch(function(err){
					currentlyRendering = false;
					console.log(err);
					console.log("[ERROR] Could not convert PDF to Image Src ...");
					alert("Could not render PDF ... STEP 1");
				});
            };
			fileReader.onerror = function(err){
				console.log(err);
				console.log("[ERROR] Could not convert PDF to Image Src ...");
				alert("Could not render PDF ... STEP 1B");
			}
            fileReader.readAsArrayBuffer(file);
        }
        else {                                // Handle Images
			console.log("Handling IMAGE file ...");
            fileReader.onload = function(event){
                var mf = new MediaFile(idCounter++,file.name,event.target.result);
				lastMF = mf;
				files.push(mf);
                appendImage("#cut-files",event.target.result,file.name,mf);
				//if (i == input.files.length-1) $("#cut-files img:last-of-type").click();
            }
			fileReader.onerror = function(err){
				console.log(err);
				console.log("[ERROR] Could not convert PDF to Image Src ...");
				alert("Could not render PDF ... STEP 1C");
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
            var viewport = page.getViewport(vp);
            canvas[0].width = viewport.width;
            canvas[0].height = viewport.height;
			$("button").prop("disabled",true);
			currentlyRendering = true;
            var renderTask = page.render({canvasContext:canvas[0].getContext("2d"), viewport:viewport});
            renderTask.promise.then(function(){
				$("button").prop("disabled",false);
				currentlyRendering = false;
                // save canvas as image
                var imgData = canvas[0].toDataURL("image/jpeg", 1.0);
                // Append image to side list
                resolve(imgData);
				canvas.remove();
            }).catch(function(...args){
				$("button").prop("disabled",false);
				currentlyRendering = false;
				reject(...args);
				canvas.remove();
                alert("Could not render PDF ... STEP 2");
			});
        }).catch(function(...args){
			reject(...args);
			canvas.remove();
            alert("Could not render PDF ... STEP 3");
		});
    });
}

function appendImage(listId, imgSrc, fileName, mf){
    var list = $(listId);
    var img = $("<div class='text-center' name='"+fileName+"'><hr/><span>"+fileName+"</span> <span class='glyphicon glyphicon-remove-circle hover-red' style='color:grey' onclick='removeImage(this)'></span><br/><img id="+mf.id+" style='width:"+mf.width+";height:"+mf.height+";' src='"+imgSrc+"' class='preview-img'></div>");
    img.find("img").css({
		width: mf.width,
		height: mf.height
	});
	$(listId).closest(".panel").find(".counter").text("("+(listId=="#cut-files"?files.length:snippets.length)+")");
	img.click(function(event){
		lastMF = mf;
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
			//$(listId).closest(".panel-default").find(".panel-title").click();
		}
	});
	if (listId == "#merge-snippets") {
		var mf_id = img.find("img").attr("id");
		var mf = files.concat(snippets).filter(e=>e.id == mf_id)[0];
		img.find("img").draggable({
			appendTo: "#content",
			containment: "window",
			helper: "clone",
			revert: "invalid",
			stack: ".canvas-wrapper img",
			start: function(event,ui){
				$(ui.helper).css({
					width: mf.width,
					height: mf.height,
					maxWidth: "100%",
					maxHeight: "100%",
				});
				$(".canvas-wrapper img.active").removeClass("active");
				$(ui.helper).addClass("active");
			}
		});
	}
    if (list.find("img").length == 0) list.empty();
    list.append(img);
}

function removeImage(elem){
	console.log("REMOVE: ",elem);
	var div = $(elem).closest("div");
	console.log("div: ",div);
	var id = div.find("img").attr("id");
	console.log("id: ",id);
	files = files.filter(e=>e.id != id);
	snippets = snippets.filter(e=>e.id != id);
	div.remove();
	$("#file-count").text("("+files.length+")");
	$("#snippet-count").text("("+snippets.length+")");
}

function drawImageOnCanvas(img,canvas){
	iWidth = img.naturalWidth;
	iHeight = img.naturalHeight;
	cWidth = $(canvas).innerWidth();
	cHeight = $(canvas).innerHeight();
	console.log("I: ",iWidth," ",iHeight);
	console.log("C: ",cWidth," ",cHeight);

	console.log("before: ",iWidth,iHeight);
	var scale = 1, scale2 = 1;
	if (iWidth > canvasWidth2 || iHeight > canvasHeight2){
		if (iWidth > canvasWidth2 && iHeight > canvasHeight2) {
			if (iWidth > iHeight) scale = canvasWidth2/iWidth, scale2 = iWidth/canvasWidth2;
			else scale = canvasHeight2/iHeight, scale2=iHeight/canvasHeight2;
		}
		else if (iWidth > canvasWidth2) scale = canvasWidth2/iWidth, scale2=iWidth/canvasWidth2;
		else scale = canvasHeight2/iHeight, scale2=iHeight/canvasHeight2;
	}
	console.log("scale: "+scale);
	console.log("scale2: "+scale2);
	console.log("after: ",iWidth,iHeight);
	$(canvas).closest(".canvas-wrapper").outerWidth(iWidth*scale);
	$(canvas).closest(".canvas-wrapper").outerHeight(iHeight*scale);
	$(canvas).closest(".canvas-wrapper").css("left",-iWidth/2*scale);
	canvas.width = iWidth;
	canvas.height = iHeight;
	canvas.getContext("2d").drawImage(img,0,0,iWidth,iHeight);
	cut_scale.x = scale2;
	cut_scale.y = scale2;
	$("#quality-page").addClass("hidden");
}

function drawPdfOnCanvas(pdf,canvas,pageNr){
	return new Promise(function(resolve,reject){
		pageNr = parseInt(pageNr) ? pageNr : 1;
		pdf.getPage(pageNr).then(function(page){
			var viewport = page.getViewport(vp);
			var scale = 1, scale2 = 1;
			if (viewport.width > canvasWidth2 || viewport.height > canvasHeight2){
				if (viewport.width > canvasWidth2 && viewport.height > canvasHeight2) {
					if (viewport.width > viewport.height) scale = canvasWidth2/viewport.width, scale2 = viewport.width/canvasWidth2;
					else scale = canvasHeight2/viewport.height, scale2=viewport.height/canvasHeight2;
				}
				else if (viewport.width > canvasWidth2) scale = canvasWidth2/viewport.width, scale2=viewport.width/canvasWidth2;
				else scale = canvasHeight2/viewport.height, scale2=viewport.height/canvasHeight2;
			}
			console.log("JEEEEEETZT: ",scale,scale2);
			$(canvas).closest(".canvas-wrapper").css({
				width: viewport.width*scale,
				height: viewport.height*scale,
				left: -viewport.width*scale/2
			});
			
			canvas[0].width = viewport.width;
			canvas[0].height = viewport.height;
			console.log("viewport: ",viewport);
			cut_scale.x = scale2;
			cut_scale.y = scale2;
			$("button").prop("disabled",true);
			currentlyRendering = true;
			var renderTask = page.render({canvasContext:canvas[0].getContext("2d"), viewport:viewport});
			renderTask.promise.then(function(){
				$("button").prop("disabled",false);
				currentlyRendering = false;
				if (canvas.closest("#cut-main").length > 0) $("#cur-page").text(pageNr);
				resolve();
				$("#quality-page").removeClass("hidden");
			}).catch(function(...args){
				$("button").prop("disabled",false);
				currentlyRendering = false;
				reject(...args);
				canvas.clone().appendTo(canvas.parent());
				canvas.remove();
                alert("Could not render PDF ... STEP 4");
			});
		}).catch(function(...args){
			reject(...args);
			canvas.clone().appendTo(canvas.parent());
			canvas.remove();
            alert("Could not render PDF ... STEP 5");
		});
	});
}

function drawPdfOnCanvas2(pdf,canvas,pageNr){
	return new Promise(function(resolve,reject){
		pageNr = parseInt(pageNr) ? pageNr : 1;
		pdf.getPage(pageNr).then(function(page){
			var viewport = page.getViewport(2.5);
			$(canvas).css({
				width: viewport.width,
				height: viewport.height
			});
			canvas[0].width = viewport.width;
			canvas[0].height = viewport.height;
			$("button").prop("disabled",true);
			currentlyRendering = true;
			var renderTask = page.render({canvasContext:canvas[0].getContext("2d"), viewport:viewport});
			renderTask.promise.then(function(){
				$("button").prop("disabled",false);
				currentlyRendering = false;
				if (canvas.closest("#cut-main").length > 0) $("#cur-page").text(pageNr);
				resolve(viewport);
			}).catch(function(...args){
				$("button").prop("disabled",false);
				currentlyRendering = false;
				reject(...args);
                alert("Could not render PDF ... STEP 4");
			});
		}).catch(function(...args){
			reject(...args);
            alert("Could not render PDF ... STEP 5");
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
	$("#loader").removeClass("hidden");
	console.log("=> ON");
	setTimeout(function(){
		var imgs = $(".canvas-wrapper img");
		imgs.sort(function(a,b){
			return parseInt($(a).css("z-index")) > parseInt($(b).css("z-index"));
		});
		var allCanvas = $("#paste-main canvas");
		var downloadPdf = new jsPDF("p","mm",[canvasWidth*0.2645833333,canvasHeight*0.2645833333]);	// 1px = 0.2645833333 mm
		downloadPdf.setProperties({
			title: 'Customized PDF',
			subject: 'Generated via PDF-Generator (https://jfoggo.github.io/pdf-test)',		
			author: 'J.Foggo',
			keywords: 'generated, javascript, pdf, customized',
			creator: 'J.Foggo'
		});
		for (var j=0;j<allCanvas.length;j++){
			var canvas = allCanvas[j];
			var ctx = canvas.getContext("2d");
			// Draw white background
			ctx.rect(0,0,canvasWidth,canvasHeight);
			ctx.fillStyle = "white";
			ctx.fill();
			enumeratePages();
			var wrapper = $(canvas).closest(".canvas-wrapper");
			var scaled = {
				x: canvas.width/wrapper.outerWidth(),
				y: canvas.height/$(canvas).outerHeight(),
			}
			for (var i=0;i<imgs.length;i++){
				if (!overlapping($(canvas),imgs.eq(i))) continue;
				var x = parseFloat(imgs.eq(i).css("left"));
				var y = parseFloat(imgs.eq(i).css("top"))-(j*$(canvas).outerHeight());
				var w = parseFloat(imgs.eq(i).outerWidth());
				var h = parseFloat(imgs.eq(i).outerHeight());
				console.log(x,y,w,h,scaled);
				ctx.drawImage(imgs[i],x*scaled.x,y*scaled.y,w*scaled.x,h*scaled.y);
			}
			var imgData = canvas.toDataURL("image/jpeg",1.0);
			if (j > 0) downloadPdf.addPage([canvasWidth*0.2645833333,canvasHeight*0.2645833333],"p");		// 1px = 0.2645833333 mm
			downloadPdf.addImage(imgData,"JPEG",0,0);
			ctx.rect(0,0,canvasWidth,canvasHeight);
			ctx.fillStyle = "white";
			ctx.fill();
		}
		downloadPdf.save("download.pdf");
		enumeratePages();
		$("#loader").addClass("hidden");
		console.log("=> OFF");
	},100);
	
}

var overlapping = function( div1, div2 ) {
	// Div 1 data
	var d1_offset             = div1.offset();
	var d1_height             = div1.outerHeight( true );
	var d1_width              = div1.outerWidth( true );
	var d1_distance_from_top  = d1_offset.top + d1_height;
	var d1_distance_from_left = d1_offset.left + d1_width;

	// Div 2 data
	var d2_offset             = div2.offset();
	var d2_height             = div2.outerHeight( true );
	var d2_width              = div2.outerWidth( true );
	var d2_distance_from_top  = d2_offset.top + d2_height;
	var d2_distance_from_left = d2_offset.left + d2_width;

	var not_colliding = ( d1_distance_from_top < d2_offset.top || d1_offset.top > d2_distance_from_top || d1_distance_from_left < d2_offset.left || d1_offset.left > d2_distance_from_left );

	// Return whether it IS colliding
	return ! not_colliding;
};

function clearCanvas(canvasId){
	var canvas = $(canvasId);
	for (var i=0;i<canvas.length;i++){
		var ctx = canvas[i].getContext("2d");
		ctx.clearRect(0,0,canvas[i].width,canvas[i].height);
	}
	enumeratePages();
}

function addPage(){
	canvasPages++;
	$("#paste-main .canvas-wrapper").css({
		height: canvasPages*canvasHeight2,
	});
	$("#paste-main .canvas-wrapper").append("<canvas width="+canvasWidth+" height="+canvasHeight+"></canvas>");
	$("#paste-main canvas").css("height",100/canvasPages+"%");
	enumeratePages();
}

function delPage(){
	if (canvasPages > 1){
		canvasPages--;
		$("#paste-main .canvas-wrapper").css({
			height: canvasPages*canvasHeight2,
		});
		$("#paste-main canvas:last-of-type").remove();
		$("#paste-main canvas").css("height",100/canvasPages+"%");
	}
}
function removeSnippet(){
	$("#paste-main img.active").remove();
}

function enumeratePages(){
	var allCanvas = $("#paste-main canvas");
	for (var i=0;i<allCanvas.length;i++){
		var c = allCanvas[i];
		var ctx = c.getContext("2d");
		ctx.font = "50px Arial";
		ctx.fillStyle = "black";
		var size = 220;
		ctx.fillText("Page "+(i+1),c.width-size,120,size);
	}
}

function setQuality(adj){
	if (vp+adj >= 1 && vp+adj <= 10){
		vp += adj;
		if (lastMF) {
			if (lastMF.pdf) drawPdfOnCanvas(lastMF.pdf,$("#cut-main canvas"),parseInt($("#cur-page").text()));
			else drawImageOnCanvas($("<img src='"+lastMF.src+"'>")[0],$("#cut-main canvas")[0]);
		}
	}
}

function appendPdfToCombineList(mf){
	var elem = $("<div class='row'><div class='input-group'><span class='input-group-addon'><input type='checkbox'></span><span class='input-group-addon'><span class=' glyphicon glyphicon-resize-vertical'></span></span><input type='text' class='form-control' readonly value='"+mf.name+"'></div></div>")
	if ($("#combine-list .row").length == 0) {
		$("#combine-list").empty();
		$("#save-row").removeClass("hidden");
	}
	$("#combine-list").append(elem);
	$("#combine-list").sortable({
		axis: "y",
		containment: "parent",
		tolerance: "pointer"
	});
}

function combinePdfs(){
	$(".modal .btn").prop("disabled",true);
	var checked = $(".modal input[type='checkbox']:checked");
	let p = new Promise(function(resolve,reject){resolve();});
	let p2 = new Promise(function(resolve,reject){resolve();});
	let arr = [];
	let rendered = 0;
	var max = 0;
	for (let i=0;i<checked.length;i++){
		let pdf = files.filter((e)=>e.name == checked.eq(i).closest(".input-group").find("input[type='text']").val())[0].pdf;
		max += pdf._pdfInfo.numPages;
		p.then(function(){
			for (let j=1;j<=pdf._pdfInfo.numPages;j++){
				let c = $("<canvas class='hidden'></canvas>");
				c.appendTo("body");
				arr.push(c[0]);
				p2.then(function(){
					return drawPdfOnCanvas2(pdf,c,j);
				}).then(function(viewport){
					rendered++;
					$(".modal .btn").prop("disabled",true);
				});
			}
		});
	}
	p.then(function(){
		$(".modal .btn").prop("disabled",true);
		p2.then(function(){
			var f = function(){
				$(".modal .btn").prop("disabled",true);
				if (rendered < max) {
					setTimeout(f,500);
					return;
				}
				$(".modal .btn").prop("disabled",true);
				let combinedPdf = new jsPDF("p","mm",[arr[0].width*0.2645833333,arr[0].height*0.2645833333]);
				for (let i=0;i<arr.length;i++){
					console.log("=> "+arr[i].width+" "+arr[i].height);
					if (i > 0) combinedPdf.addPage([arr[i].width*0.2645833333,arr[i].height*0.2645833333],"p");		// 1px = 0.2645833333 mm
					let imgData = arr[i].toDataURL("image/jpeg",1.0);
					combinedPdf.addImage(imgData,"JPEG",0,0);
					$(arr[i]).remove();
				}
				combinedPdf.save("download.pdf");
				$(".modal .btn").prop("disabled",false);
			};
			f();
		});
	});
}
$(document).ready(init);
