//SETTINGS			
var appBuild = app.version || "4.0";
var blocks = app.blocks || [];
var blocks_styles = app.blocks_styles || [];
var app_url = app.url || 'https://designmodo.com/startup/app/';
var register_url = app.api_user_register || "../../wp-admin/admin-ajax.php?action=dm_startup_register_user";
var login_url = app.api_user_login || "../../wp-admin/admin-ajax.php?action=dm_startup_three_login";
var user_url = app.api_user_info || "../../wp-admin/admin-ajax.php?action=dm_startup_three_api";
var export_url = app.export_url || "export.php";
var preview_url = app.preview_url || "preview.php";
var projects_url = app.projects_url || "projects.php";
var userInfo = app.userInfo;

// fadeIn page after window.load

$(document).ready(function (e) {
	showLoader();
	setSettingsFromHash().then(function(){
		setColors();
		setFonts().then(function(){
			reBuildLayout().then(function(){
				hideLoader();
				setTimeout(function(){
					checkBlocksHeight();
				},500);
			});
		});		
	});
});

// FUNCTIONS

// Set project settings from URL by JSON or sharable link (call settingsToString() to get a JSON)
async function setSettingsFromHash(){
	var promise = new Promise((resolve, reject) => {
		console.log("fired setSettingsFromHash()");
		if(jQuery.isEmptyObject(app.settings)){
			var hash = decodeURIComponent(window.location.hash).substring(1);
			if(hash!=""){
				if(hash.indexOf("shared_project")!=-1){ // Load shared project
					var id, token, hashParts = hash.split("&");
					hashParts.forEach(function(param,value){
						param = param.split("=");
						if(param[0]=="shared_project"){
							id = param[1];
						}
						if(param[0]=="token"){
							token = param[1];
						}
					});
					if(typeof(id)=="string" && typeof(token)=="string"){
						$.ajax({
							method: 'POST',
							url: projects_url,
							data: {action:"share",id:id,token:token},
						}).done(function(data){
							if(data.indexOf("Error")!=-1){
								showAlert(data);
							}else{
								data = JSON.parse(data);
								// Old v.3 projects support
								if(typeof(data.structure)!="object"){
									var structure = data.structure.split(",");
									structure.forEach(function(block,key){
										block = block.split(":");
										structure[key] = {cat:parseInt(block[0]),id:parseInt(block[1])};
									});
									data["structure"] = structure;
								}
								app.settings = data;									
							}
							resolve("done");
						}).fail(function(){
							showAlert("Error. Server is unavailable. Can’t load a shared project!");
							resolve("done");
						});
					}else{
						showAlert("Could not load a shared project - wrong ID or token");
						resolve("done");
					}
				}else if(hash.indexOf("load_project_from_json")!=-1){ // Load project from a JSON string in URL
					var hashParts = hash.replace("load_project_from_json=","");
					app.settings = JSON.parse(hashParts);
					resolve("done");
				}else{
					var hashParts = hash.split("&");
					hashParts.forEach(function(param,value){
						param = param.split("=");
						if(param[0]=="structure"){ // Old v.3 projects support
							var structure = param[1].split(",");
							structure.forEach(function(block,key){
								block = block.split(":");
								structure[key] = {cat:parseInt(block[0]),id:parseInt(block[1])};
							});
							param[1] = structure;
						}
						app.settings[param[0]] = param[1];
					});
					resolve("done");
				}
			}else{
				resolve("done");
			}
		}else{
			resolve("done");
		}
		if(typeof(app.settings.subset)=="undefined"){app.settings.subset = "latin";}
		if(typeof(app.settings.fH)=="undefined"){app.settings.fH = "DM Sans";}
		if(typeof(app.settings.fHW)=="undefined"){app.settings.fHW = 700;}
		if(typeof(app.settings.fM)=="undefined"){app.settings.fM = "DM Sans";}
		if(typeof(app.settings.fMW)=="undefined"){app.settings.fMW = 400;}
		if(typeof(app.settings.CA1)=="undefined"){app.settings.CA1 = "25DAC5";}
		if(typeof(app.settings.CA2)=="undefined"){app.settings.CA2 = "482BE7";}
		if(typeof(app.settings.CA3)=="undefined"){app.settings.CA3 = "E93A7D";}
		if(typeof(app.settings.CB1)=="undefined"){app.settings.CB1 = "1E0E62";}
		if(typeof(app.settings.CB2)=="undefined"){app.settings.CB2 = "919DAB";}
		if(typeof(app.settings.CB3)=="undefined"){app.settings.CB3 = "ffffff";}
		if(typeof(app.settings.CB4)=="undefined"){app.settings.CB4 = "EBEAED";}
		if(typeof(app.settings.CBg1)=="undefined"){app.settings.CBg1 = "2F1893";}
		if(typeof(app.settings.CBg2)=="undefined"){app.settings.CBg2 = "ffffff";}
		if(typeof(app.settings.anim)=="undefined"){app.settings.anim = "on";}
		if(typeof(app.settings.animSpeed)=="undefined"){app.settings.animSpeed = 6;}
		if(typeof(app.settings.animStyle)=="undefined"){app.settings.animStyle = "FadeDown";}
		// Clean hash after setting
		window.location.hash = "";
	});
	return await promise;
}

// encode project's structure to url

function settingsToUrl(id=null){
	console.log("fired settingsToUrl()");
	var project = app.settings;
	if(id!=null){
		project = JSON.parse(app.projects[id].app_settings);
	}
	if(typeof(project) && jQuery.isEmptyObject(project)===false){
		var url = $.param(project);
	}else{
		var url="";
	}
	return url;
}

// Get project settings as a JSON string

function settingsToString(settingsToStringify=false){
	console.log("fired settingsToString()");
	if(!settingsToStringify){
		return JSON.stringify(app.settings);
	}else{
		return JSON.stringify(settingsToStringify); // could be any JSON, but if it's a project - it must be project.settings passed as settingsToStringify
	}
}

// create project layout

async function createLayout(){
	var html;
	var promise = new Promise((resolve, reject) => {
		console.log("fired createLayout()");
		if(jQuery.isEmptyObject(app.settings)===false){
			var elements = [];
			var cat;
			var id;
			var row=0;
			var date = new Date();
			if(typeof(app.settings.structure)!="undefined"){
				app.settings.structure.forEach(function(block,index){ // add unique id for each block to prevent dublication later
					if(block.uid==undefined){
						app.settings.structure[index]["uid"] = "SF_UID_" + date.getTime() + "_" + Math.random().toString(36).substring(5);					
					}
				});
				var layoutHTML = $.post(preview_url,{layoutOnly:true,pageSettings:settingsToString()});
				layoutHTML.done(function(data){
					console.log(settingsToString());
					$("#blocks").empty();
					//console.log(app.settings.structure, data);
					app.settings.structure.forEach(function(block){
						cat = parseInt(block.cat);
						id = parseInt(block.id);
						var editorSettings = block.editorSettings;
						if(typeof(editorSettings)!="undefined"){
							editorSettings = 'data-editor-settings=\''+editorSettings.replace(/'/g,'&apos;')+'\'';
						}else{
							editorSettings = "";
						}
						var element;
						blocks.forEach(function(index,value){
							if(index.id==cat){
								row=value;
							}
						});
						if (blocks[row] !== undefined ) {
							var name = blocks[row].filename;
							var img_src = 'i/blocks/'+name+'_'+(id+1);
							var isFree = (blocks[row].free_blocks.indexOf(id)!=-1) ? "free" : "locked";
							if(userInfo.status=="purchased"){
								isFree = "free";
							}
							var isDark = (blocks[row].dark_blocks.indexOf(id)!=-1) ? "" : "dark";
							element = $('<li data-id="'+cat+'" data-number="'+id+'" data-uid="'+block.uid+'" '+editorSettings+' class="'+isFree+' '+isDark+'"></li>');
							element.append('<span>'+name.replace(/_/g," ")+' '+(id+1)+'</span>');
							element.append('<div class="move"><a class="up" onclick="move_block(\'up\',this);"></a><a class="down" onclick="move_block(\'down\',this);"></a></div>');
							element.append('<a class="delete" onclick="delete_block(this);"></a>');
							element.append('<a class="edit" onclick="edit_block(this);"></a>');
							if(isFree=="free" || userInfo.status=="purchased"){
								data = data.replace(/"i\//g,'"repository/i/');
								data = data.replace(/url\(i/g,'url(repository/i');
								//html = $.parseHTML(data);
								data = '<div>'+data+'</div>';
								//console.log(data);
								//console.log($(data).find("[data-sf-uid='"+block.uid+"']"));
								var foundBlock = $(data).find("[data-sf-uid='"+block.uid+"']");
								if(foundBlock.hasClass(name+"_"+(id+1))){
									element.append('<div class="repository_block"></div>');
									element.find(".repository_block").append(foundBlock);
								}
								/*$(html).each(function(index,selector){
									//console.log(block.uid, selector);
									if($(selector).hasClass(name+"_"+(id+1))){
										element.append('<div class="repository_block"></div>');
										element.find(".repository_block").append(selector);
									}
								});*/
							}else{
								element.append('<img srcset="'+img_src+'@2x.jpg?v='+appBuild+' 2x" src="'+img_src+'.jpg?v='+appBuild+'" />');
							}
							$("#blocks").append(element);
						}
					});
					$("body").removeClass("noBlocks");
					$("#sortable").sortable("refresh");
					resolve(html);
				});
			}
			if(typeof(app.settings.name)!="undefined"){
				$('#js-current-project-name').html("<span>"+app.settings.name.split('_').join(' ')+"</span>");				
			}
		}else{
			resolve(html);
		}
	});
	return await promise;
}

// re-build layout after setting animation or some other changes

async function reBuildLayout(){
	console.log("fired reBuildLayout()");
	var promise = new Promise((resolve, reject) => {
		if(typeof(app.settings.structure)!="undefined"){
			createLayout().then(function(){
				$("#sortable").sortable("refresh");
				if(typeof(SF_scripts)=="function"){
					setTimeout(function(){ 
						SF_scripts();
						setAnim();
						checkBlocksHeight();
						reInitAOS();
						resolve("done");
					},60);
				}else{
					resolve("done");
				}
			});
		}else{
			resolve("done");
		}
	});
	return await promise;
}

// rebuild CSS (set custom styles)

async function rebuildCSS(){
	console.log("fired rebuildCSS()");
	var promise = new Promise((resolve, reject) => {
		//var url = preview_url+"?";
		if(typeof(app.settings.structure)=="undefined" && $("body").hasClass("firstLoad")){
			$("body").removeClass("firstLoad");
			resolve("done");
		}else{
			if(typeof(app.settings.structure)=="undefined"){
				//url = url+"structure=1:1&";
				var structureBackup = app.settings.structure;
				app.settings.structure = [{cat:1,id:1}];
			}
			//url = url+settingsToUrl()+'&compileCss=true';
			var layoutHTML = $.post(preview_url,{compileCss:true,pageSettings:settingsToString()});
			layoutHTML.done(function(data){
				if(structureBackup){
					app.settings.structure = structureBackup;					
				}
				$("#SF_Custom_CSS").attr("href",data);
				resolve(data);
			});
		}
		
	});
	return await promise;
}

// rebuild Fonts (set custom fonts)

async function rebuildFonts(){
	console.log("fired rebuildFonts()");
	var promise = new Promise((resolve, reject) => {
		var oldGoogleFontUrl = $("#SF_Google_Fonts").attr("href");
		var GoogleFontsUrlParts = ['https://fonts.googleapis.com/css2?family='];
		if(app.settings.fH!=undefined){
			GoogleFontsUrlParts.push(app.settings.fH.replace(" ","+"));
			GoogleFontsUrlParts.push(":wght@100;200;300;400;500;600;700;800;900");
		}
		if(app.settings.fM!=undefined && app.settings.fM != app.settings.fH){
			GoogleFontsUrlParts.push("&amp;"+app.settings.fM.replace(" ","+"));
			GoogleFontsUrlParts.push(":wght@100;200;300;400;500;600;700;800;900");
		}
		if(app.settings.subset!=undefined){
			GoogleFontsUrlParts.push("&amp;subset="+app.settings.subset);
		}
		GoogleFontsUrlParts.push("&amp;display=swap");
		GoogleFontsUrlParts = GoogleFontsUrlParts.join("");
		if(oldGoogleFontUrl != GoogleFontsUrlParts){
			$("#SF_Google_Fonts").attr("href",GoogleFontsUrlParts);
		}
		resolve("done");
	});
	return await promise;
}

// Update structure param in app.settings after add/remove some block
function updateStructure(){
	console.log("fired updateStructure()");
	var updatedStructure = [];
	$("#blocks").find("li").each(function(){
		var params = {};
		var cat = parseInt($(this).attr("data-id"));
		var id = parseInt($(this).attr("data-number"));
		var uid = $(this).attr("data-uid");
		var editorSettings = $(this).attr("data-editor-settings");
		if(typeof(editorSettings)!="undefined" && editorSettings!=""){
			params["editorSettings"]=editorSettings.replace(/'/g,'&apos;');
		}
		if(typeof(uid)!="undefined" && uid!=""){
			params["uid"]=uid;
		}
		if(!isNaN(cat) && !isNaN(id)){
			//updatedStructure[updatedStructure.length] = cat+":"+id;
			params["cat"]=cat;
			params["id"]=id;
			updatedStructure[updatedStructure.length] = params;
		}
	});
	//app.settings.structure = updatedStructure.join(",");
	app.settings.structure = updatedStructure;
	$("#sortable").sortable("refresh");
	checkBlocksHeight();
}

// Create block preview (for center column)
async function createBlock(cat, id, size){
	var html;
	var promise = new Promise((resolve, reject) => {
		var row=0;
		id=parseInt(id);
		cat=parseInt(cat);
		blocks.forEach(function(index,value){
			if(index.id==cat){
				row=value;
			}
		});
		if (blocks[row] !== undefined ) {
			var name = blocks[row].filename;
			var suffix = (size=="sm")?"_sm":"";
			var img_src = 'i/blocks/'+name+'_'+(id+1);
			var isFree = (blocks[row].free_blocks.indexOf(id)!=-1) ? "free" : "locked";
			if(userInfo.status=="purchased"){
				isFree = "free";
			}
			var isDark = (blocks[row].dark_blocks.indexOf(id)!=-1) ? "" : "dark";
			if(isFree=="free" && size=="lg" || userInfo.status=="purchased" && size=="lg"){
				//var layoutUrl = preview_url+"?structure="+cat+":"+(id)+'&layoutOnly=true';
				var structureBackup = app.settings.structure;
				//app.settings.structure = cat+":"+id;
				app.settings.structure = [{cat:cat,id:id/*,editorSettings:editorSettings*/}];
				//var layoutUrl = preview_url+"?"+settingsToUrl()+'&layoutOnly=true';
				var layoutHTML = $.post(preview_url,{layoutOnly:true,pageSettings:settingsToString()});
				layoutHTML.done(function(data){
					app.settings.structure = structureBackup;
					data = data.replace(/"i\//g,'"repository/i/');
					data = data.replace(/url\(i/g,'url(repository/i');
					html = '<li data-id="'+cat+'" data-number="'+id+'" class="'+isFree+' '+isDark+'">'
					+'<span>'+name.replace(/_/g," ")+' '+(id+1)+'</span>'
					+'<div class="move"><a class="up" onclick="move_block(\'up\',this);"></a><a class="down" onclick="move_block(\'down\',this);"></a></div>'
					+'<a class="delete" onclick="delete_block(this);"></a>'
					+'<a class="edit" onclick="edit_block(this);"></a>'
					+'<div class="repository_block">'+data+'</div>'
					+'</li>';
					resolve(html);
				});
			}else{
				html = '<li data-id="'+cat+'" data-number="'+id+'" class="'+isFree+' '+isDark+'">'
				+'<span>'+name.replace(/_/g," ")+' '+(id+1)+'</span>'
				+'<div class="move"><a class="up" onclick="move_block(\'up\',this);"></a><a class="down" onclick="move_block(\'down\',this);"></a></div>'
				+'<a class="delete" onclick="delete_block(this);"></a>';
				if(suffix=="_sm"){
					html += '<img data-srcset="'+img_src+suffix+'@2x.jpg?v='+appBuild+' 2x" data-src="'+img_src+suffix+'.jpg?v='+appBuild+'" />';					
				}else{
					html += '<img srcset="'+img_src+suffix+'@2x.jpg?v='+appBuild+' 2x" src="'+img_src+suffix+'.jpg?v='+appBuild+'" />';					
				}
				html += '</li>';
				resolve(html);
			}
		}
	});
	return await promise;
}

// Function for creating HTML of block while it's not loaded (after drag from left side)

function loadingBlockTemplate(){
	var html = '<div class="block_is_loading"></div>';
	return html;
}

// Refresh card, Delete card, move card up or down

function delete_block(button){
	$(button).parent().slideUp(250,function(){
		$(this).remove();
		updateStructure();
	});
}
function move_block(direction, button){
	var block = $(button).parent().parent();
	var transition = block.css("transition");
	block.css("transition","none").slideUp(250, function(){
		if(direction=="up"){
			block.prev().before(block);
		}else{
			block.next().after(block);
		}
		block.slideDown(250,function(){
			$('html, body').stop().animate({'scrollTop': block.offset().top - 100}, 250, function () {
				updateStructure();
			});
		});
	});
}

// Function for set params in right menu

async function setFonts(){
	console.log("fired setFonts()");
	var isNeedFontsRebuild = false;
	var promise = new Promise((resolve, reject) => {
		if(app.settings.subset){
			var old_subset = $("input[name=subset]").val();
			var new_subset = app.settings.subset;
			if(old_subset!=new_subset){
				$("input[name=subset]").val(new_subset);
				var text = $(".subset li[data-value="+new_subset+"]").text();			
				$(".subset li").removeClass("active");
				$(".subset li[data-value="+new_subset+"]").addClass("active");
				$(".choose_font_popup .variants li").each(function(){
					var this_subsets = $(this).attr("data-subsets");
					if(this_subsets.indexOf(new_subset)!=-1){
						$(this).removeClass("hidden_by_subset");
					}else{
						$(this).addClass("hidden_by_subset");
					}
				});
				$(".subset .selected").text(text);
				var available_fonts = $(".choose_font_popup .variants li:not(.hidden_by_subset)");
				if(app.settings.fH){
					if($(".choose_font_popup .variants li:contains('"+app.settings.fH+"')").hasClass("hidden_by_subset")){
						var random = Math.floor(Math.random() * available_fonts.length-1);
						app.settings.fH = available_fonts.eq(random).text();
					}
				}
				if(app.settings.fM){
					if($(".choose_font_popup .variants li:contains('"+app.settings.fM+"')").hasClass("hidden_by_subset")){
						var random = Math.floor(Math.random() * available_fonts.length-1);
						app.settings.fM = available_fonts.eq(random).text();
					}
				}
			}
			isNeedFontsRebuild = true;
		}
		if(app.settings.fH){
			var name = app.settings.fH;
			var _this = $(".choose_font_popup li:contains("+name+")");
			var available_weights = _this.attr("data-weights").split(",");

			$("input[name=fH]").val(name);
			$(".font_heading_selected div").text(name);
			var weight = available_weights[available_weights.length-1];
			$(".choose_heading_weight .variants").attr("data-weights", available_weights.join(","));
			var weight_text = $(".choose_heading_weight li[data-weight="+weight+"]").text();
			$("input[name=fHW]").val(weight);
			$(".choose_heading_weight .selected").css("font-weight",weight).text(weight_text);
			if(available_weights.length<=1){
				$(".choose_heading_weight .selected").addClass("single_weight");
			}else{
				$(".choose_heading_weight .selected").removeClass("single_weight");
			}
			$(".choose_heading_weight .variants li").each(function(){
				var this_weight = $(this).attr("data-weight");
				if(available_weights.indexOf(this_weight)!=-1){
					$(this).show();
				}else{
					$(this).hide();
				}
				if(this_weight == weight){
					$(this).addClass("active");
				}else{
					$(this).removeClass("active");
				}
			});
			isNeedFontsRebuild = true;
		}
		if(app.settings.fM){
			var name = app.settings.fM;
			var _this = $(".choose_font_popup li:contains("+name+")");
			var available_weights = _this.attr("data-weights").split(",");

			$("input[name=fM]").val(name);
			$(".font_main_selected div").text(name);
			var weight = available_weights[0];
			$(".choose_main_weight .variants").attr("data-weights", available_weights.join(","));
			var weight_text = $(".choose_main_weight li[data-weight="+weight+"]").text();
			$("input[name=fMW]").val(weight);
			$(".choose_main_weight .selected").css("font-weight",weight).text(weight_text);
			if(available_weights.length<=1){
				$(".choose_main_weight .selected").addClass("single_weight");
			}else{
				$(".choose_main_weight .selected").removeClass("single_weight");
			}
			$(".choose_main_weight .variants li").each(function(){
				var this_weight = $(this).attr("data-weight");
				if(available_weights.indexOf(this_weight)!=-1){
					$(this).show();
				}else{
					$(this).hide();
				}
				if(this_weight == weight){
					$(this).addClass("active");
				}else{
					$(this).removeClass("active");
				}
			});
			isNeedFontsRebuild = true;
		}
		if(app.settings.fHW){
			var weight = app.settings.fHW;
			var _this = $(".choose_heading_weight li[data-weight="+weight+"]");
			var weight_text = _this.text();
			$("input[name=fHW]").val(weight);
			$(".choose_heading_weight .selected").css("font-weight",weight).text(weight_text);
		}
		if(app.settings.fMW){
			var weight = app.settings.fMW;
			var _this = $(".choose_main_weight li[data-weight="+weight+"]");
			var weight_text = _this.text();
			$("input[name=fMW]").val(weight);
			$(".choose_main_weight .selected").css("font-weight",weight).text(weight_text);
		}
		
		if(isNeedFontsRebuild===true){
			rebuildFonts().then(function(){
				rebuildCSS().then(function(){
					resolve("done");
				});
			});
		}else{
			rebuildCSS().then(function(){
				resolve("done");
			});	
		}
	});
	return await promise;
}

function setColors(){
	console.log("fired setColors()");
	var colors = [];
	if(app.settings.CA1!=undefined){colors["CA1"]=app.settings.CA1;}
	if(app.settings.CA2!=undefined){colors["CA2"]=app.settings.CA2;}
	if(app.settings.CA3!=undefined){colors["CA3"]=app.settings.CA3;}
	if(app.settings.CB1!=undefined){colors["CB1"]=app.settings.CB1;}
	if(app.settings.CB2!=undefined){colors["CB2"]=app.settings.CB2;}
	if(app.settings.CB3!=undefined){colors["CB3"]=app.settings.CB3;}
	if(app.settings.CB4!=undefined){colors["CB4"]=app.settings.CB4;}
	if(app.settings.CBg1!=undefined){colors["CBg1"]=app.settings.CBg1;}
	if(app.settings.CBg2!=undefined){colors["CBg2"]=app.settings.CBg2;}
	if(colors){
		Object.keys(colors).forEach(function(key) {
			$("input[name="+key+"]").attr("value","#"+colors[key]).attr("data-default","#"+colors[key]).spectrum("set","#"+colors[key]);
		});
	}
}

function setAnim(){
	if(app.settings.anim!=undefined){
		if(app.settings.anim=="off"){
			$("#animation_toggle").prop("checked",false);
		}else{
			$("#animation_toggle").prop("checked","checked");
		}
	}else{
		app.settings.anim="on";
		$("#animation_toggle").prop("checked","checked");
	}
	
	if(app.settings.animStyle!=undefined){
		$("input[name=anim_style]:checked").prop("checked",false);
		$("input[name=anim_style]").each(function(){
			if($(this).val() == app.settings.animStyle){
				$(this).prop("checked","checked");
				var title = $(this).attr("data-title");
				$(".animation .title .on").text(title);
				return false; 
			}
		});
	} 
	if(app.settings.animSpeed!=undefined){
		anim_speed.noUiSlider.set(app.settings.animSpeed);
		$("#anim_speed_value").html(11-app.settings.animSpeed);
	}
}

//Re-init AOS plugin for animations after adding new block to centrel panel

function reInitAOS(){
	console.log("fired reInitAOS()");
	if(typeof(AOS) !== 'undefined'){
		AOS.init({
			easing: 'ease-out-cubic',
			offset: 0,
			once:true,
		});
		$(".aos-init").addClass("aos-animate");
	}
}

// Set pre-made styles (in right panel)
async function setStyles(style){
	var params = blocks_styles[style];
	Object.keys(params).forEach(function(key) {
		app.settings[key] = params[key];
	});
	showLoader();
	var promise = new Promise((resolve, reject) => {
		setColors();
		setAnim();
		setFonts().then(function(){
			reBuildLayout().then(function(){
				hideLoader();
				setTimeout(function(){
					checkBlocksHeight();
				},500);
				resolve("done");
			});
		});
	});
	return await promise;
}

//Change Size of Blocks Holder
function checkBlocksHeight(){
	console.log("fired checkBlocksHeight()");
	if ($("#blocks li:not(.placeholder):visible").length>0){
		$("body").removeClass("noBlocks");
		$('#blocks').removeClass("empty");
		
		var images = $("#blocks").find("img");
		var checkBlocksHeightInterval = setInterval(function(){
			if(images.length>0){
				$.each(images,function(i,image){
					if($(image).length){
						if($(image)[0].complete===true){
							images.splice(i,1);
						}						
					}
				});
			}else{
				clearInterval(checkBlocksHeightInterval);
				$("#blocks").find("li").each(function(){
					var contentHeight = $(this).find(".repository_block").outerHeight(true)*0.5625;
					$(this).height(contentHeight);
					// Check if block have too small height to contain controls
					if(contentHeight<155){
						$(this).addClass("small_height");
					}
					if(contentHeight<60){
						$(this).addClass("center_controls");
					}
				});
			}
		},100);
	} else {
		$("body").addClass("noBlocks");
		$('#blocks').addClass("empty");
	}	
}
checkBlocksHeight();

// Open window with login/purchase
function openPromoWindow(textType="export"){
	$('.promo .pretitle span, .promo .title span, .promo .sign_in span').hide();
	$('.promo .pretitle .text-for-'+textType+', .promo .title .text-for-'+textType+', .promo .sign_in .text-for-'+textType).show();
	$('body').addClass('noscroll');
	console.log(userInfo.status, textType);
	if(userInfo.status=="not_logged_in" && textType!="paid-block"){
		$(".buttons .open-plans").hide();
		$(".buttons .sign-up").show();
	}else{
		$(".buttons .open-plans").show();
		$(".buttons .sign-up").hide();
	}
	$('.promo, .overlay').fadeIn(250);
}

// Show alert message

function showAlert(text){
	$("#alertPopup").text(text).fadeIn(250,function(){
		setTimeout(function(){
			$("#alertPopup").fadeOut(250);
		},3000);
	})
}

// Show "Success" message

function showAlertSuccess(text){
	$("#alertPopupSuccess").text(text).fadeIn(250,function(){
		setTimeout(function(){
			$("#alertPopupSuccess").fadeOut(250);
		},3000);
	})
}

// Show loader icon
function showLoader(){
	$("#loading_icon").fadeIn(150);
}

// Hide loader icon
function hideLoader(){
	$("#loading_icon").fadeOut(150);
}

// Load project
function load_project(id){
	id = parseInt(id);
	var project = app.projects[id];
	if(project!=undefined){
		if(!isNaN(id)){
			$("#load").attr("data-id",id);
			if(settingsToString() == project.app_settings || app.settings.structure==undefined || app.settings.structure==""){
				$("#load").click();
			}else{
				var current_project_id = parseInt($("#js-current-project-name").attr("data-id"));
				if(!isNaN(current_project_id)){
					if(settingsToString() == app.projects[current_project_id].app_settings){
						$("#load").click();
					}else{
						$(".controls_popup.load, .overlay").fadeIn(250);					
					}					
				}else{
					$(".controls_popup.load, .overlay").fadeIn(250);
				}
			}
		}
	}else{
		showAlert("There is no saved project with this ID");
	}
}

// Show actions menu

function show_project_actions(id){
	var actions_panel = $("#actions");
	var project_to_bind = $("#js-saved-projects").find(".project[data-id="+id+"] .js-open-project-actions");
	var top = project_to_bind.parent().position().top;
	var left = project_to_bind.position().left;
	var panel_height = actions_panel.outerHeight(true);
	var holder_panel_height = $("#js-saved-projects .generator-nano").outerHeight(true);
	var diff = holder_panel_height - top;
	if(diff < panel_height && holder_panel_height > panel_height){
		top = top - (panel_height - diff);
	}
	actions_panel.css({top:top,left:left}).fadeIn(250).attr("data-id",id);
}

// Generate link to exported archive
function generateArchive(){
	if($("#controls").hasClass('preloader')===false){		
		if(app.settings.name=="" || typeof(app.settings.name)=="undefined"){ app.settings["name"] = 'untitled';}
		var hasLockedBlocks = false;
		$("#blocks").find("li").each(function(){
			if($(this).hasClass("locked")){
				hasLockedBlocks=true;
			}
		});
		if (hasLockedBlocks===false){
			if(typeof(app.settings.structure)!="undefined"){
				$('#controls').addClass('preloader');
				showLoader();
				$.post(export_url, {pageSettings:settingsToString()}, function(data) {
					if (data.error){
						if (data.error.code == 763424){ // 763424 - not authorized
							openPromoWindow("export-need-sign-up");
						}else if (data.error.code == 373845){ //373845 - not purchased
							openPromoWindow();
						}else if (data.error.code == 499259){
							showAlert("You need an additional license!");
						}				   
					}else if(data.result){
						if(userInfo.status=="not_logged_in"){
							openPromoWindow("export-need-sign-up");
						}else{
							window.location = data.result;							
						}
					}
					$('#controls').removeClass('preloader');
					hideLoader();
				}, 'json').done(function(){
					setTimeout(function(){
						$('#controls').removeClass('preloader');
						hideLoader();
					},2000);
				});
			}else{
				showAlert("Choose at least one block!");
				hideLoader();
			}
		}else{
			openPromoWindow("paid-block");
			hideLoader();
		}
	}
} 

//code
$(document).ready(function(e) {
	
	// Detect IOS
	if(navigator.platform.toUpperCase().indexOf('MAC')!==-1){
		$("body").addClass("ios");
	}

	// Remove locks for purchased users
	if(userInfo.status == 'purchased') { 
		$("#menu .locked, #export.locked, #save.locked").removeClass("locked");
		$("#blocks").find(".locked").removeClass("locked");
	} 
	if(userInfo.status != 'not_logged_in') {
		$(".promo .sign_in").addClass("hidden");
	}
	
	// Range slider in Animation block
	var anim_speed = document.getElementById('anim_speed');
	var start_speed = 6;
	if(app.settings.animSpeed!=undefined){
		start_speed = app.settings.animSpeed;
	}
	noUiSlider.create(anim_speed, {
		start: [ start_speed ],
		step:1,
		direction: 'rtl',
		connect: [false, true],
		range: {
			'min': [ 1 ],
			'max': [ 11 ]
		}
	});
	$("#anim_speed_value").html(11-start_speed);
	
	//Create Submenu From Array	
	async function createLeftMenu(){
		var promise = new Promise((resolve, reject) => {
			blocks.forEach(function(element){
				$('#subMenu .nano-content').append('<ul id="'+element.type+'"></ul>');               
				for (i = 0; i < element.count; i++){
					createBlock(element.id, i, "sm").then(function(value) {
						$('#subMenu ul#'+element.type).append(value);
					});
				}
			});
			resolve("done");
		});
		return await promise;
	}
	createLeftMenu().then(function(value){
		//Make Menu Items Draggable	
		var draggableParams = {
			connectToSortable: "#blocks",
			addClasses: false,
			cancel:".locked",
			scope: "#blocks",
			helper: "clone",
			appendTo: 'body',
			distance: 10,
			drag: function(event, ui){
				$(window).mousemove(function( event ) {
					var windowY = event.pageY - $(window).scrollTop();
					var windowX = event.pageX;
					$('.ui-draggable-dragging').css('top',$(window).scrollTop() + windowY - 50).css('left',windowX-50).css('width','100px!important');
				});
			},
			start: function(event, ui){
				$("body").addClass("drag_on");
				window.droppedData = 'dragStart';
				draggingElement = $('.ui-draggable-dragging');
				if (draggingElement.height() > 100){
					draggingElement.height('100px');
				}
				draggingElement.css("z-index",1000);
			},
			stop: function(event, ui){
				setTimeout (function(){
					window.droppedData = '';
					$("body").removeClass("drag_on");
				},500);
			}
		};
		$("#subMenu li:not(.locked)").draggable(draggableParams);
		$("#subMenu li:not(.locked)").bind('click', function() {
			$("body").removeClass("drag_on").removeClass("noBlocks");
			var cat = $(this).attr("data-id");
			var id = $(this).attr("data-number");
			showLoader();
			var temporaryHolder = $(this).clone().append(loadingBlockTemplate()).addClass("no_content");
			temporaryHolder.find("img").remove();
			$("#blocks").removeClass("empty").append(temporaryHolder);
			createBlock(cat,id,"lg").then(function(value){
				var block = $("#blocks").find(temporaryHolder).replaceWith(value);
				updateStructure();
				if(typeof(SF_scripts)=="function"){
					setTimeout(function(){ 
						SF_scripts(); 
						checkBlocksHeight();
					},60);
				}
				reInitAOS();
				hideLoader();
			});
		});
	
		$("#subMenu li.locked").bind('mousedown', function(e) {
			if (e.which == 1) {
				var $this = $(this);
				$this.bind('mouseleave', function(){
					openPromoWindow("paid-block");
				});
				$this.mouseup(function() {
					$(this).unbind('mouseleave');
					openPromoWindow("paid-block");
				});
			}
		});
		
		//SORT AND DRAG
		//Make Blocks Sortable
		var sortableParams = {
			cancel:"a, .on_edit",
			opacity:0.75,
			placeholder: "placeholder",
			revert:300,
			distance: 20,
			cursorAt: { top:5, left: 5 },
			refreshPositions: true,
			start: function(event, ui){
				$("body").addClass("drag_on");
				//checkBlocksHeight();
			},
			out: function( event, ui ){
				/* setTimeout(function(){
					checkBlocksHeight();
				},50); */
			},
			over: function( event, ui ){
				//checkBlocksHeight();
			},
			stop: function( event, ui ){
				$("body").removeClass("drag_on");
				$(ui.item).css({"z-index":"","position":"","opacity":"","left":"","top":""});
				var cat = $(ui.item).attr("data-id");
				var id = $(ui.item).attr("data-number");
				$(ui.item).html(loadingBlockTemplate());
				showLoader();
				createBlock(cat,id,"lg").then(function(value){
					$(ui.item).replaceWith(value);
					updateStructure();
					if(typeof(SF_scripts)=="function"){
						setTimeout(function(){ 
							SF_scripts(); 
							checkBlocksHeight();
						},60);
					}
					reInitAOS();
					hideLoader();
				});
			}
		};
		$("#blocks").sortable(sortableParams);
	});
	
	
	// Initialize custom scroll
	$("#subMenu, #rightSide").nanoScroller({ scrollTop: 0, sliderMaxHeight: 50, preventPageScrolling: true, iOSNativeScrolling: true });
	
	// Close project's actions on bodyclick
	$(document).click(function(event) {	
		if (!$(event.target).closest('.js-open-project-actions').length && $("#actions").is(":visible")) {
			$("#actions").fadeOut(250);
		};
	});
	
	// Close project's actions on scroll inside projects
	$("#js-saved-projects .nano-content").scroll(function() {	
		$("#actions").fadeOut(250);
	});
	
	// Close project's actions on hoverOut projects
	$(".projects").hover(function(){
		// nothing
	}, function(){
		$("#actions").fadeOut(250);
	});
	
	
	// Hide left & right menu on doluble click
	$("#toggle").click(function(){
		if($("body").hasClass("drag_on")){
			$("body").removeClass("drag_on");
		}else{
			$("body").addClass("drag_on");
		}
	});
	
	// Random template
	
	function generateRandomBlock(cat,exclude){
		var block_cat_id = 0;
		blocks.forEach(function(value, index){
			if(value.id==cat){
				block_cat_id = index;
			}
		});
		if(userInfo.status=="purchased"){
			var id = Math.floor(Math.random() * blocks[block_cat_id].count);
		}else{
			var id = Math.floor(Math.random() * 2);
		}
		if(exclude!==null){
			exclude = exclude[cat];
			var found=false;
			while(found===false){
				if(exclude.indexOf(id)==-1){
					found=true;
				}else{
					if(userInfo.status=="purchased"){
						id = Math.floor(Math.random() * blocks[block_cat_id].count);
					}else{
						var id = Math.floor(Math.random() * 2);
					}
				}
			}			
		}
		return id;
	}
	
	function generateRandomBlocks(structure){
		var addedBlocks = [[],[],[],[],[],[],[],[],[],[],[],[]]; // numbers of arrays in array the same as number of categories in generator
		var blocks = [];
		for(var i=0;i<structure.length;i++){
			cat = structure[i];
			id = generateRandomBlock(cat,addedBlocks);
			addedBlocks[cat].push(id);
			blocks.push({cat:cat, id:id});
		}
		return blocks;
	}
	
	function generateRandomLayout(){
		showLoader();
		var blocks_quantity = parseInt(random_layout_input.val());
		var cat, block;
		var structure = [{cat:0,id:generateRandomBlock(0,null)}]; // header
		if(userInfo.status=="purchased"){
			if(blocks_quantity==3){$.merge(structure,generateRandomBlocks([4]));}
			if(blocks_quantity==4){$.merge(structure,generateRandomBlocks([4,4]));}
			if(blocks_quantity==5){$.merge(structure,generateRandomBlocks([4,4,7]));}
			if(blocks_quantity==6){$.merge(structure,generateRandomBlocks([4,4,4,7]));}
			if(blocks_quantity==7){$.merge(structure,generateRandomBlocks([4,4,4,11,7]));}
			if(blocks_quantity==8){$.merge(structure,generateRandomBlocks([4,1,4,4,11,7]));}
			if(blocks_quantity==9){$.merge(structure,generateRandomBlocks([4,1,4,4,2,11,7]));}
			if(blocks_quantity==10){$.merge(structure,generateRandomBlocks([4,1,4,4,2,11,7,3]));}
			if(blocks_quantity==11){$.merge(structure,generateRandomBlocks([4,1,4,1,4,2,11,7,3]));}
			if(blocks_quantity==12){$.merge(structure,generateRandomBlocks([4,4,1,4,1,4,2,11,7,3]));}
			if(blocks_quantity==13){$.merge(structure,generateRandomBlocks([8,4,4,1,4,1,4,2,11,7,3]));}
			if(blocks_quantity==14){$.merge(structure,generateRandomBlocks([8,4,4,1,4,1,4,2,11,7,3,2]));}
			if(blocks_quantity==15){$.merge(structure,generateRandomBlocks([8,4,4,4,1,4,1,4,2,11,7,3,2]));}
			if(blocks_quantity==16){$.merge(structure,generateRandomBlocks([8,4,4,4,1,4,4,1,4,2,11,7,3,2]));}
			if(blocks_quantity==17){$.merge(structure,generateRandomBlocks([8,4,4,4,1,4,4,1,4,4,2,11,7,3,2]));}
			if(blocks_quantity==18){$.merge(structure,generateRandomBlocks([8,4,4,4,1,4,4,4,1,4,4,2,11,7,3,2]));}
			if(blocks_quantity==19){$.merge(structure,generateRandomBlocks([8,4,4,4,1,4,4,4,1,4,4,4,2,11,7,3,2]));}
			if(blocks_quantity==20){$.merge(structure,generateRandomBlocks([11,8,4,4,4,1,4,4,4,1,4,4,4,2,11,7,3,2]));}
		}else{
			if(blocks_quantity==3){$.merge(structure,generateRandomBlocks([4]));}
			if(blocks_quantity==4){$.merge(structure,generateRandomBlocks([4,2]));}
			if(blocks_quantity==5){$.merge(structure,generateRandomBlocks([4,4,2]));}
			if(blocks_quantity==6){$.merge(structure,generateRandomBlocks([4,4,7,2]));}
			if(blocks_quantity==7){$.merge(structure,generateRandomBlocks([4,4,9,7,2]));}
			if(blocks_quantity==8){$.merge(structure,generateRandomBlocks([4,4,9,7,2,3]));}
			if(blocks_quantity==9){$.merge(structure,generateRandomBlocks([1,4,4,9,7,2,3]));}
			if(blocks_quantity==10){$.merge(structure,generateRandomBlocks([1,4,4,9,8,7,2,3]));}
		}
		if(blocks_quantity>1){
			structure.push({cat:10,id:generateRandomBlock(10,null)}); // footer
		}
		
		app.settings.structure = structure;
		reBuildLayout().then(function(){
			hideLoader();
			setTimeout(function(){
				checkBlocksHeight();
			},500);
		});
	}
	
	// set max and start values

	var random_layout_input = $("#random_layout_input");
	var random_layout_max = (userInfo.status=="purchased")?20:10;
	var random_layout_start = (userInfo.status=="purchased")?10:5;
	random_layout_input.val(random_layout_start).attr("max",random_layout_max);
	
	$("#random_up").click(function(){
		var _val = parseInt(random_layout_input.val());
		if(_val < random_layout_max){
			random_layout_input.val(_val+1);
		}
	});
	
	$("#random_down").click(function(){
		var _val = parseInt(random_layout_input.val());
		if(_val > 1){
			random_layout_input.val(_val-1);
		}
	});
	
	$("#random_layout_btn").click(function(event){
		event.preventDefault();
		if(app.settings.structure==undefined || app.settings.structure==""){
			$(".overlay").click();
			generateRandomLayout();
		}else{
			$(".controls_popup.generate").fadeOut(250);
			$(".controls_popup.generate_alert, .overlay").fadeIn(250);
		}
	});
	
	$("#random_layout_confirm").click(function(event){
		event.preventDefault();
		generateRandomLayout();
	});
	
	// Close any popup
	
	$(".overlay, .popup .close, .controls_popup .btn:not(#create):not(#random_layout_btn):not(#continue_edit)").click(function(event){
		event.preventDefault();
		$('.overlay, .popup, .controls_popup').fadeOut(250,function(){
			$(".promo").css("height","auto");
			$('.promo').removeClass('blue').removeClass('green');
			$(".purchase, .buttons").show();
			$(".login, .plans").hide();
			$('body').removeClass('noscroll');			
		});
	});
	
	// Bind ESC key
	$(document).keyup(function(e){
		if(e.keyCode === 27){
			$('.overlay, #changelogPopup .close').click();
			//$("#js-saved-projects, #actions").fadeOut(250);
			$("#actions").fadeOut(250);
		}
	});
	
	// Controls popups
	
	// Generate Random Layout
	$("#random_layout_toggle").click(function(){
		$(".controls_popup.generate, .overlay").fadeIn(250);
	});
	
	// New project
	$(".js-new-project").click(function(){
		var id = parseInt($("#js-current-project-name").attr("data-id"));
		if(!isNaN(id)){
			if(settingsToString() == app.projects[id].app_settings){
				$("#new").click();
			}else{
				$(".controls_popup.new, .overlay").fadeIn(250);
			}
			
		}else{
			if(app.settings.structure==undefined || app.settings.structure==""){
				showAlertSuccess("New project created. Now choose some blocks!");
			}else{
				$(".controls_popup.new, .overlay").fadeIn(250);
			}
		}
	});
	
	// Clear layout 
	$("#clear_toggle").click(function(){
		$(".controls_popup.clear, .overlay").fadeIn(250);
	});
	
	// Delete project 
	$("#delete_toggle").click(function(){
		$(".controls_popup.delete, .overlay").fadeIn(250);
	});
	
	// Promo popups
	
	// Promo window - open plans
	$(".js-open-plan").click(function(event){
		event.preventDefault();
		$('.promo').removeClass('blue').addClass('green');
		$(".buttons").slideUp(200,function(){
			$(".plans").slideDown(250,function(){
				setTimeout(function(){
					if($(".promo").outerHeight(true)>$(window).height()*0.9){
						$(".promo").nanoScroller({ scrollTop: 0, sliderMaxHeight: 50, preventPageScrolling: true, iOSNativeScrolling: true });
					}
				},100);
			});			
		});
	});
	
	// Promo window - open login (sign in) form
	$(".js-open-login").click(function(event){
		event.preventDefault();
		$('.promo').removeClass('blue').removeClass('green');
		$(".purchase").slideUp(250);
		$(".login").slideDown(250,function(){
			setTimeout(function(){
				var height = $(".login").outerHeight(true);
				$(".promo").animate({height:height},100);
			},50);
		});
	});
	
	//Export
	$('#export').click(function(event) {
		if($("body").hasClass("noBlocks")){
			showAlert("Please, choose some blocks first!");
		}else{
			generateArchive();
		}
	});
        
	// Preview
	$('#preview').click(function(event) {
		if($("body").hasClass("noBlocks")){
			showAlert("Please, choose some blocks first!");
		}else{
			$("#previewForm input[name=pageSettings]").val(settingsToString());
			$("#previewForm").submit();
		}
	});
	
	// Preview in Actions
	$('.action.preview').click(function(event) {
		event.preventDefault();
		var id = parseInt($(this).parent().attr("data-id"));
		if(isNaN(id)){
			showAlert("There is no project with this ID");
		}else{
			var project = JSON.parse(app.projects[id].app_settings);
			// old Startup 3 stuff support (when "structure" was a string)
			if(typeof(project.structure)=="string"){
				var structure = project.structure.split(",");
				structure.forEach(function(block,key){
					block = block.split(":");
					structure[key] = {cat:parseInt(block[0]),id:parseInt(block[1])};
				});
				project.structure = structure;
			}// end
			$("#previewForm input[name=pageSettings]").val(settingsToString(project));
			$("#previewForm").submit();
		}
	});
	
	// Save
	function save_project(params){
		showLoader();
		$.ajax({
			method: 'POST',
			url: projects_url,
			data: params,
		}).done(function(data){
			data = JSON.parse(data);
			if(data.success){
				showAlertSuccess("Saved!");
				if(params.action=="add"){
					$('.overlay').click();
					$("#js-current-project-name").html("<span>"+app.settings.name+"</span>");
					$("#js-current-project-name").attr("data-id",data.project_id);
					var new_project = '<div class="block project" data-id="'+data.project_id+'">'+
											'<a href="#" onclick="load_project('+data.project_id+');" class="name">'+app.settings.name+'</a>'+
											'<a class="js-open-project-actions" onclick="show_project_actions('+data.project_id+');"></a>'+
										'</div>';
					$(new_project).insertBefore($("#js-saved-projects .block:eq(0)"));
					$("#js-saved-projects .block.no_projects").remove();
					app.projects[data.project_id]={
						app_settings: settingsToString(),
						id: data.project_id,
						project_name: app.settings.name,
						user_id: app.userInfo.user_id
					};
				}else{ // = update
					app.projects[params.id].app_settings = settingsToString();
				}
			}else{
				showAlert(data.error);
				$('.overlay').click();
			}
			hideLoader();
		}).fail(function(){
			showAlert("Error. Server is unavailable. Can’t save the project!");
			if(params.action=="add"){$('.overlay').click();}
			hideLoader();
		});
	}
	
	$('#save').click(function(event) {
		event.preventDefault();
		if(userInfo.status=="purchased"){
			if(app.settings.structure==undefined || app.settings.structure==""){
				showAlert("Choose at least one block!");
			}else{
				var id = parseInt($("#js-current-project-name").attr("data-id"));
				if(isNaN(id)){ // project was not added to DB, action="add"
					$(".controls_popup.create, .overlay").fadeIn(250);
				}else{ // project is already in DB, action="update"
					var params = {action:"update","id":id,project_settings:settingsToString()};
					save_project(params);
				}
			}
		}else{
			openPromoWindow("save");
		}
	});
	
	// Create new project
	$('#create').click(function(event) {
		event.preventDefault();
		var name = $("#create_project_name").val();
		if(name==""){
			showAlert("Please enter your project name.");
		}else{
			app.settings.name = name;
			var params = {action:"add",project_settings:settingsToString()};
			save_project(params);
		}
	});
	
	$("#create_project_name").keyup(function(e){
		if(e.which == 13){
			$('#create').click();
		}
	});
	
	// New project alert
	$('#new').click(function(event) {
		event.preventDefault();
		$("#js-current-project-name").attr("data-id","").find("span").remove();
		$('#clear').click();
	});
	
	// Load project alert
	$('#load').click(function(event) {
		event.preventDefault();
		showLoader();
		var id = parseInt($(this).attr("data-id"));
		var project = app.projects[id];
		$("body").addClass("noBlocks");
		$("#blocks").empty();
		$("#js-current-project-name").html("<span>"+project.project_name+"</span>");
		$("#js-current-project-name").attr("data-id",id);
		project = JSON.parse(project.app_settings);
		// old Startup 3 stuff support (when "structure" was a string)
		if(typeof(project.structure)=="string"){
			var structure = project.structure.split(",");
			structure.forEach(function(block,key){
				block = block.split(":");
				structure[key] = {cat:parseInt(block[0]),id:parseInt(block[1])};
			});
			project.structure = structure;
		}// end
		app.settings = project;
		setColors();
		setFonts().then(function(){
			reBuildLayout().then(function(){
				hideLoader();
				setTimeout(function(){
					checkBlocksHeight();
				},500);
			});
		});
	});
	
	// Clear
	$('#clear').click(function(event) {
		event.preventDefault();
		app.settings={};
		setStyles("Colorful").then(function(){
			$("body").addClass("noBlocks");
			$("#blocks").empty();
		});
	});
	
	// Rename
	$('.action.rename').click(function(event) {
		event.preventDefault();
		var id = parseInt($(this).parent().attr("data-id"));
		if(isNaN(id)){
			showAlert("There is no project with this ID");
		}else{
			var current_name = $("#js-saved-projects .project[data-id="+id+"]").find(".name").text();
			$("#rename").attr("data-id",id);
			$("#rename_project").val(current_name);
			$(".controls_popup.rename, .overlay").fadeIn(250);
		}
	});
	
	$("#rename").click(function(event){
		event.preventDefault();
		var id = parseInt($(this).attr("data-id"));
		var name = $("#rename_project").val();
		if(name==""){
			showAlert("Please enter your project name.");
		}else{
			showLoader();
			$.ajax({
				method: 'POST',
				url: projects_url,
				data: {action:"rename",id:id,rename:name},
			}).done(function(data){
				data = JSON.parse(data);
				if(data.success){
					var old_name = app.projects[id].project_name;
					app.projects[id].app_settings = app.projects[id].app_settings.replace(old_name, name);
					app.projects[id].project_name = name;
					$("#js-saved-projects .project[data-id="+id+"] .name").text(name);
					if(id == parseInt($("#js-current-project-name").attr("data-id"))){
						$("#js-current-project-name span").text(name);
						app.settings.name = name;
					}
					showAlertSuccess("Success!");
				}else{
					showAlert(data.error);
					hideLoader();
				}
			}).fail(function(){
				showAlert("Error. Server is unavailable. Can’t rename project!");
				hideLoader();
			});
		}
	});
	
	// Clone
	$('.action.clone').click(function(event) {
		event.preventDefault();
		var id = parseInt($(this).parent().attr("data-id"));
		if(isNaN(id)){
			showAlert("There is no project with this ID");
		}else{
			$("#clone").attr("data-id",id);
			$(".controls_popup.clone, .overlay").fadeIn(250);
		}
	});
	
	$("#clone").click(function(event){
		event.preventDefault();
		var id = parseInt($(this).attr("data-id"));
		var name = $("#clone_project").val();
		if(name==""){
			showAlert("Please enter your project name.");
		}else{
			showLoader();
			$.ajax({
				method: 'POST',
				url: projects_url,
				data: {action:"clone",id:id,rename:name},
			}).done(function(data){
				data = JSON.parse(data);
				if(data.success){
					var new_project = $("#js-saved-projects .project[data-id="+id+"]").clone();
					new_project.attr("data-id",data.project_id);
					new_project.find(".name").attr("onclick","load_project("+data.project_id+");").text(name);
					new_project.find(".js-open-project-actions").attr("onclick","show_project_actions("+data.project_id+");");
					new_project.insertBefore($("#js-saved-projects .project:eq(0)"));
					var old_name = app.projects[id].project_name;
					app.projects[data.project_id]={
						app_settings: app.projects[id].app_settings.replace(old_name, name),
						id: data.project_id,
						project_name: name,
						user_id: app.userInfo.user_id
					};
					showAlertSuccess("Cloned!");
					hideLoader();
				}else{
					showAlert(data.error);
					hideLoader();
				}
			}).fail(function(){
				showAlert("Error. Server is unavailable. Can’t rename project!");
				hideLoader();
			});
		}
	});
	
	// Delete
	$('.action.delete').click(function(event) {
		event.preventDefault();
		var id = parseInt($(this).parent().attr("data-id"));
		if(isNaN(id)){
			showAlert("There is no project with this ID");
		}else{
			$("#delete").attr("data-id",id);
			$(".controls_popup.delete, .overlay").fadeIn(250);
		}
	});
	
	$("#delete").click(function(event){
		event.preventDefault();
		var id = $(this).attr("data-id");
		showLoader();
		$.ajax({
			method: 'POST',
			url: projects_url,
			data: {action:"delete",id:id},
		}).done(function(data){
			data = JSON.parse(data);
			if(data.success){
				$("#js-saved-projects .project[data-id="+id+"]").remove();
				if(id == $("#js-current-project-name").attr("data-id")){
					app.settings={};
					setStyles("Colorful").then(function(){
						$("body").addClass("noBlocks");
						$("#blocks").empty();
						$("#js-current-project-name").attr("data-id","").html("");
						if($("#js-saved-projects .project").length==0){
							$("#js-saved-projects").html('<div class="block no_projects">You haven\'t saved projects</div>');
						}
						showAlertSuccess("Deleted!");
					});
				}else{
					if($("#js-saved-projects .project").length==0){
						$("#js-saved-projects").html('<div class="block no_projects">You haven\'t saved projects</div>');
					}
					showAlertSuccess("Deleted!");
				}
			}else{
				showAlert(data.error);
				hideLoader();
			}
		}).fail(function(){
			showAlert("Error. Server is unavailable. Can’t delete the project!");
			hideLoader();
		});
	});
	
	// Share
	$('.action.share').click(function(event) {
		event.preventDefault();
		var id = parseInt($(this).parent().attr("data-id"));
		if(isNaN(id)){
			showAlert("There is no project with this ID");
		}else{
			showLoader();
			$.ajax({
				method: 'POST',
				url: projects_url,
				data: {action:"share",id:id,data:app.userInfo},
			}).done(function(data){
				if(data.indexOf("Error")!=-1){
					showAlert(data);			
				}else{
					var link = app_url+"#shared_project="+id+"&token="+data;
					var copyText = document.getElementById("share_link_input");
					copyText.value = link;
					$(".share_link_hider").css({"width":"1px","height":"1px"});
					copyText.select();
					copyText.setSelectionRange(0, 99999);
					document.execCommand("copy");
					showAlertSuccess("The link is copied to your clipboard!");									
					$(".share_link_hider").css({"width":"0px","height":"0px"});
				}
				hideLoader();
			}).fail(function(){
				showAlert("Error. Server is unavailable. Can’t share the project!");
				hideLoader();
			});
		}
	});
	
	//Ajax Login 
	$('#loginform').submit(function(event){
		event.preventDefault();
		var form = $(this),
		term = form.serialize(),
		url = login_url,
		errors = form.find(".errors");
		errors.slideUp(250);
 
		var posting = $.post( url, term );
	 
		posting.done(function(data) {
			data = JSON.parse(data);
			if(data.success == true){
				$('.overlay').click();
				$.get( app.api_user_info).done(function( data_user_info ) {
					data_user_info = JSON.parse(data_user_info);
					userInfo = data_user_info;
					if(userInfo.status=="purchased"){
						$("#menu .locked").removeClass("locked");
						$("#blocks").find(".locked").removeClass("locked");
					}
					//updateHash();
					$(".promo .sign_in").addClass("hidden");
				}).fail(function(){
					//updateHash();										
				});
			}else{
				errors.slideDown(250);
				if (data.error == 100){
					errors.html('<div class="red e100">Incorrect Email or Password</span></div>');
					$('#password').val('');
				} else if (data.error == 200){
					errors.html('<div class="red e200">Invalid Email</span></div>');
					$('#login').val('').focus();
				} else if (data.error == 300){
					errors.html('<div class="red e300">Password Required</span></div>');
					$('#password').focus();
				} else if (data.error == 400){
					errors.html('<div class="red e400">Email Required</span></div>');
					$('#login').focus();
				} else if (data.error == 500){
					errors.html('<div class="red e500">Email & Password Required</span></div>');
					$('#login').focus();
				} else if (data.error == 600){
					errors.html('<div class="red e600">Err. Please try again.</span></div>');
					$('#login').focus();
				}
			}
		}).fail(function(){
			errors.slideDown(250);
			errors.html('Something goes wrong. Please, try again');
		});
	});
	
	// Open Support = Intercom
	$("#openSupport").click(function(event){
		event.preventDefault();
		if(typeof(Intercom)=="function"){
			Intercom('show');
		}
	});
	
	// Open popup with changelog
	$("#changelog").click(function(event){
		event.preventDefault();
		var _this = $(this);
		var popup = $("#changelogPopup");
		if(_this.hasClass("not_viewed")){
			var posting = $.get(app_url+"?update_last_viewed_version=true");
			posting.done(function(){
				_this.removeClass("not_viewed");
			});
		} 
		popup.fadeIn(250,function(){
			popup.find(".generator-nano").nanoScroller({ scrollTop: 0, sliderMaxHeight: 50, preventPageScrolling: true, iOSNativeScrolling: true });
		});
	});
	
	// Close popup with changelog
	$("#changelogPopup .close").click(function(){
		$("#changelogPopup").fadeOut(250);
	});
	
	// Close popup with changelog on bodyclick
	$(document).click(function(event) {	
		if (!$(event.target).closest('#changelogPopup').length && !$(event.target).closest('#changelog').length && $('#changelogPopup').is(":visible") ) {
			$('#changelogPopup .close').click();
		};
	});
	
	//UX STUFF

	// Left side
	// Menu
	 
	$("#sideMenu, #subMenu").on( "mouseenter", function() {
		setTimeout(function(){
			$("#menuGradient").removeClass('hidden');
		},50);
	});
	 
	$("#menu").on( "mouseleave", function() {
		$("#subMenu, #menu").addClass('hidden');
		$("#sideMenu li.selected").removeClass('selected');
		setTimeout(function(){
			$("#menuGradient").addClass('hidden');
		},50);
	});
	
	$('#sideMenu > ul').menuAim({
		activate: function(event){
			if (!$('#sideMenu').hasClass('disabled')){
				$("#subMenu, #menu").removeClass('hidden');
				$("#sideMenu li.selected").removeClass('selected');
				$(event).addClass('selected');
				
				var currentItem = $(event).data('menu-item');
				
				$('#subMenu').scrollTop(0);
				$('#subMenu ul.visible').removeClass('visible');
				$('#subMenu ul#'+currentItem).addClass('visible');
				$('#subMenu ul#'+currentItem).find("img").each(function(){
					var _this = $(this);
					var srcset = _this.attr("data-srcset");
					var _src = _this.attr("data-src");
					if(srcset!=undefined){
						_this.attr("srcset",srcset).removeAttr("data-srcset");
					}
					if(_src!=undefined){
						_this.attr("src",_src).removeAttr("data-src");
					}
				});
			}
		},
		exitMenu: function() {
			return true;
		}
	});

	// Right side
	// Dropdown in Style block
	
	$("#rightSide .style").click(function(){
		var _this = $(this);
		var list = _this.find(".list");
		var height = list.outerHeight(true);
		if(height==0){
			height = list.find("ul").outerHeight(true);
			_this.addClass("open");
		}else{
			height = 0;
			_this.removeClass("open");
		}
		list.css("height",height);
	});
	
	$("#rightSide .style .list li").click(function(){
		var text = $(this).text();
		$("#rightSide .style .list").css("height","0px");
		$("#rightSide .style").removeClass("open");
		setStyles(text);
	});
	
	// hide Dropdown in Style block on bodyclick
	$(document).click(function(event) {	
		if (!$(event.target).closest('#rightSide .style').length) {
			$("#rightSide .style .list").css("height","0px");
			$("#rightSide .style").removeClass("open");
		};
	});
	
	// Show Custom fonts window
	$("#rightSide .font_selector").click(function(){
		var title = $(this).prev().text();
		$(".choose_font_popup .title").text(title);
		$(".choose_font_popup .variants").attr("data-choose-for",title);
		$(".choose_font_popup").fadeIn(300,function(){
			$(this).find(".variants .hidden_by_search").removeClass("hidden_by_search");
			$(this).find(".generator-nano").nanoScroller({ sliderMaxHeight: 50, iOSNativeScrolling: true});
			$(this).find(".search_font_input").val("").focus();
		});
	});
	
	// Close Custom fonts window
	$(".choose_font_popup .title").click(function(){
		$(this).parent().fadeOut(300);
	});
	
	// Open / close dropdowns in font section
	$(".font .dropdown .selected").click(function(event){
		var _this = $(this);
		var list = _this.next();
		var height = list.outerHeight(true);
		if(_this.parent().hasClass("dropdown_weight")){
			if(list.find("li:visible").length==1){
				return false;
			}
		}
		if(height==0){
			height = list.find("ul").outerHeight(true);
			_this.addClass("opened");
		}else{
			height = 0;
			setTimeout(function(){
				_this.removeClass("opened");
			},250);
		}
		list.css("height",height);
	});
	
	// Subset dropdown - choose subset
	$(".font .subset .list li").click(function(){
		var subset = $(this).attr("data-value");
		app.settings.subset = subset;
		showLoader();
		setFonts().then(function(){
			hideLoader();
		});
		$(".font .subset .list").css("height","0px");
		setTimeout(function(){
			$(".font .subset .selected").removeClass("opened");
		},250);
	});
	
	// Search font family
	$(".search_font input").keyup(function(){
		var list = $(".choose_font_popup .variants li");
		var query = $(this).val().toLowerCase();
		list.each(function(){
			if($(this).text().toLowerCase().indexOf(query)==0){
				$(this).removeClass("hidden_by_search");
			}else{
				$(this).addClass("hidden_by_search");
			}
		});
	});
	
	// Choose custom font
	$(".choose_font_popup li").click(function(){
		var _this = $(this);
		var name = _this.text();
		if(_this.parent().attr("data-choose-for")=="Heading"){
			app.settings.fH = name;
		}else{
			app.settings.fM = name;
		}
		showLoader();
		setFonts().then(function(){
			hideLoader();
		});
		$(".choose_font_popup").fadeOut(300);
	});
	
	// Choose custom font Weight
	$(".font .dropdown_weight .list li").click(function(){
		var _this = $(this);
		var weight = _this.attr("data-weight");
		if(_this.parent().parent().parent().hasClass("choose_heading_weight")){
			app.settings.fHW = weight;
		}else{
			app.settings.fMW = weight;
		}
		showLoader();
		setFonts().then(function(){
			hideLoader();
		});
		_this.parent().find("li").removeClass("active");
		_this.addClass("active");
		$(".font .dropdown_weight .list").css("height","0px");
		setTimeout(function(){
			$(".font .dropdown_weight .selected").removeClass("opened");
		},250);
	});
	
	// hide Subset Dropdown on bodyclick
	$(document).click(function(event) {	
		if (!$(event.target).closest('.font .dropdown').length) {
			$(".font .dropdown .list").css("height","0px");
			setTimeout(function(){
				$(".font .dropdown .selected").removeClass("opened");
			},250);
		};
	});
	
	// hide font family popup on bodyclick
	$(document).click(function(event) {	
		if (!$(event.target).closest('.choose_font_popup').length && !$(event.target).closest('.font_selector').length) {
			$(".choose_font_popup").fadeOut(300);
		};
	});
	
	// Color pickers
	$(".js-spectrum").spectrum({
		showInitial: true,
		showInput: true,
		preferredFormat: "hex",
		appendTo: "parent",
		clickoutFiresChange: true,
		change: function(color) {
			showLoader();
			$(this).attr("value",color.toHexString());
			$(this).val(color.toHexString());
			var colorName = $(this).attr("name");
			app.settings[colorName] = color.toHexString().replace("#","");
			rebuildCSS().then(function(){
				hideLoader();
			});
		}
	});
	
	// Random color
	$("#rightSide .color .random").click(function(){
		showLoader();
		var palettes = [
			["#F7C96B", "#479BA2", "#30637B", "#1F213F", "#8E8F9E", "#FFFFFF", "#DDDAED", "#49416F", "#FFFFFF"],
			["#64BDED", "#D3B357", "#D97A45", "#50260E", "#A79286", "#FFFFFF", "#E4D5D0", "#3E3029", "#FFFFFF"],
			["#011486", "#E48C58", "#813320", "#050F46", "#9094AC", "#FFFFFF", "#E1D6BF", "#7A340B", "#FFFFFF"],
			["#C54FD3", "#50BAF2", "#1B34CB", "#4D095F", "#A583AE", "#FFFFFF", "#D8D4D9", "#112148", "#FFFFFF"],
			["#2BD095", "#1FA3EE", "#7C3AE9", "#000000", "#999999", "#FFFFFF", "#EBEAED", "#112148", "#FFFFFF"],
			["#DA5A31", "#E2B513", "#A8CD13", "#5A190B", "#999999", "#FFFFFF", "#CCCCCC", "#112148", "#FFFFFF"],
			["#383838", "#717171", "#000000", "#000000", "#999999", "#FFFFFF", "#717171", "#000000", "#FFFFFF"],
			["#1CA3AA", "#3490C5", "#DB6397", "#084043", "#9CB3B4", "#FFFFFF", "#D9E4D7", "#054246", "#FFFFFF"],
			["#DE379F", "#2045B8", "#510D15", "#2045B8", "#8696C5", "#FFFFFF", "#D7D7D9", "#510D15", "#FFFFFF"],
			["#DE313A", "#0D0D0D", "#DF3A9D", "#0D0D0D", "#9E9E9E", "#FFFFFF", "#F2F2F2", "#521A21", "#FFFFFF"],
			["#565AF6", "#E365B4", "#F4B37A", "#171AA5", "#BBBBBB", "#FFFFFF", "#EAEAED", "#40429B", "#FFFFFF"],
			["#EBD126", "#5469F6", "#87F1D1", "#343563", "#AEAEC1", "#FFFFFF", "#DFDFF1", "#28423F", "#FFFFFF"],
		];
		var pallete = palettes[Math.floor(Math.random() * palettes.length)];
		var colors = [];
		colors["CA1"] = pallete[0];
		colors["CA2"] = pallete[1];
		colors["CA3"] = pallete[2];
		colors["CB1"] = pallete[3];
		colors["CB2"] = pallete[4];
		colors["CB3"] = pallete[5];
		colors["CB4"] = pallete[6];
		colors["CBg1"] = pallete[7];
		colors["CBg2"] = pallete[8];
		Object.keys(colors).forEach(function(key) {
			$("input[name="+key+"]").attr("value",colors[key]).attr("data-default",colors[key]).spectrum("set",colors[key]);
			app.settings[key] = colors[key].replace("#","");
		});
		rebuildCSS().then(function(){
			hideLoader();
		});
	});
	
	
	// Animation block change
	
	$("#animation_toggle").change(function(){
		if($("#animation_toggle").prop("checked")===false){
			app.settings["anim"]="off";
		}else{
			app.settings["anim"]="on";
		}
		showLoader();
		reBuildLayout().then(function(){
			hideLoader();
			setTimeout(function(){
				checkBlocksHeight();
			},500);
		});
	});
	
	// Play animation
	$("#replayAnim").click(function(event){
		event.preventDefault();
		var timeout_duration = parseInt($("body").attr("data-aos-duration"))+100;
		$(".aos-init").removeClass("aos-animate");
		if(timeout){
			clearTimeout(timeout);
		}
		var timeout = setTimeout(function(){
			$(".aos-init").addClass("aos-animate");
		},timeout_duration);
	});
	
	// Range slider in Animation block
	var anim_speed_value = document.getElementById('anim_speed_value');

	anim_speed.noUiSlider.on('end', function( values, handle ) {
		var sliderValue = parseInt(values[handle]);
		anim_speed_value.innerHTML = 11-sliderValue; //10-sliderValue;
		$("#anim_speed_input").val(sliderValue);
		if(typeof(app.settings.structure)!="undefined"){
			app.settings.animSpeed = sliderValue;
			showLoader();
			reBuildLayout().then(function(){
				hideLoader();
				setTimeout(function(){
					checkBlocksHeight();
				},500);
			});
		}
	});
	
	// Set animation style
	$(".anim_style input").change(function(){
		app.settings["animStyle"]=$(".anim_style input:checked").val();
		showLoader();
		reBuildLayout().then(function(){
			hideLoader();
			setTimeout(function(){
				checkBlocksHeight();
			},500);
		});
	});
	
	
	
	
	
	/*
	$("#rightSide .color .sp-reset, .random, .subset li, .choose_font_popup li, .dropdown_weight li").click(function(){
		//updateHash();
	}); */
});

// additional functions
//$.fn.preload = function() { this.each(function(){ $('<img/>')[0].src = this; }); }
//$.fn.exists = function(){return this.length>0;}
//extend for draggable
var oldMouseStart = $.ui.draggable.prototype._mouseStart;
$.ui.draggable.prototype._mouseStart = function (event, overrideHandle, noActivation) {
    this._trigger("beforeStart", event, this._uiHash());
    oldMouseStart.apply(this, [event, overrideHandle, noActivation]);
};

/////////////////////////////////////////////////////////////////////////////////