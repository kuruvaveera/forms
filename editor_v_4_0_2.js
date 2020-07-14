// Blocks and elements editor for Startup v.4

var blockDefaults,
	blockLastAppliedLayout,
	editorSettings,
	editableBlock=false,
	editableElement;

function getBlockDefaults(){
	blockDefaults = editableBlock.find(".js-sf-section");
	blockLastAppliedLayout = editableBlock.find(".repository_block").clone();
	blockDefaults = blockDefaults.attr("data-sf-settings");
	blockDefaults = JSON.parse(blockDefaults);
	delete blockDefaults.category;
	delete blockDefaults.id;
	
	return blockDefaults;
}

function edit_block(el){
	editableBlock = $(el).parent();
	blockDefaults = getBlockDefaults();
	$("#editor_settings .nano-content").empty();
	
	// https://github.com/tckerr/walk MUST BE INCLUDED!!!
	// Make editorSettings array with all editable settings
	editorSettings = {};
    var uuid = 'SF_KEY'; // for minimal chance of key colision
	var walkConfig={
		pathFormat: function(key, isArr) {
			return uuid + key;
		},
		rootObjectCallbacks: false,
		callbacks: [
			{
				positions: ['preWalk'],
				callback: function(node){
					if(node.key!="uid"){ // some technical stuff that we don't need
						//console.log(node);
						switch (node.container) {
							case 'array':
								if(node.key!="classes" && node.key!="fa_classes" && node.key!="attributes"){
									Walk.updateObjectViaPathString(editorSettings, [], node.path, uuid);
								}else{
									Walk.updateObjectViaPathString(editorSettings, node.val, node.path, uuid);
								}
								break;
							case 'object':
								if(node.key=="attributes"){
									Walk.updateObjectViaPathString(editorSettings, node.val, node.path, uuid);
								}else{
									Walk.updateObjectViaPathString(editorSettings, {path:node.path}, node.path, uuid);									
								}
								break;
							case 'value':
								if(node.key!=undefined && node.parent.key!="attributes"){ // it's undefined when it's an element of array = class or attribute inside "class" or "attribute" param
									if((node.key!="classes" || node.key!="fa_classes" || node.key!="attributes") && node.type=="boolean" && (node.val===false || node.val===undefined)){
										node["val"] = [];
										node["type"] = "object";
									}
									Walk.updateObjectViaPathString(editorSettings, node.val, node.path, uuid);
									break;								
								}
						}						
						//console.log(node);
					}
				}
			}
		]
	}
	Walk.walk(blockDefaults, undefined, walkConfig);
	
	// Build editor's interface with all editable settings
	$.each(editorSettings,function(key, setting){
		var html = buildSetting(key,setting);
		$("#editor_settings .nano-content").append(html);
	});
	
	var editorInputType;
	
	// Delete highlight of editable now element
	$("#editor_settings").find("input, textarea").bind("focusout",function(){
		editorUnHighlight();
	});
	
	// Edit Text and HREF of an element
	$("#editor_settings").find("input[data-name=text], input[data-name=href], textarea[data-name=text]")
	.bind("focus",function(){ // Highlight editable now element
		editorHighlight($(this));
	})
	.bind("click", function () { // Select all text in input
		if($(this).hasClass("js-focused-from-block")){
			$(this).removeClass("js-focused-from-block").select();
		}
	})
	.bind("keyup",function(){ // Apply it's changes
		editorInputType = $(this).attr("data-name");
		editableElement = editableBlock.find(".js-edit-active");
		if(editorInputType=="text"){
			editableElement.html($(this).val());
		}else if(editorInputType=="href"){
			editableElement.attr("href",$(this).val());
		}
		var contentHeight = editableBlock.find(".repository_block").outerHeight(true)*0.5625;
		editableBlock.height(contentHeight);
		$("body").addClass("editor_not_saved");
	});
	
	// Edit HTML Tag of an element
	$("#editor_settings").find("input[data-name=tag]")
	.bind("focus",function(){ // Highlight editable now element
		editorHighlight($(this));
	})
	.bind("change",function(){ // Replace tag
		var tag = $(this).val();
		editableElement = editableBlock.find(".js-edit-active");
		editableElement.replaceWith(function() {
			var replacement = $('<'+tag+'>').html($(this).html());
			for (var i = 0; i < this.attributes.length; i++) {
				replacement.attr(this.attributes[i].name, this.attributes[i].value);
			}
			return replacement;
		});
		var contentHeight = editableBlock.find(".repository_block").outerHeight(true)*0.5625;
		editableBlock.height(contentHeight);
		$("body").addClass("editor_not_saved");
	});
	
	// Edit classes of an element
	$("#editor_settings").find("input.add_class_input")
	.bind("focus",function(){ // Highlight editable now element
		var input = $(this).closest(".classes").find("input[data-path]");
		editorHighlight(input);
	});
	
	$("#editor_settings").find(".classes input[type=hidden]")
	.bind("change",function(){ // Append classes to the editable now element
		var classes = $(this).val().split(" ");
		if(classes.length>0){
			$.each(classes,function(i, _class){
				if(!editableElement.hasClass(_class)){
					editableElement.addClass(_class);
				}
			});
		}
	});
	
	// Edit attributes of an element
	$("#editor_settings").find(".attributes input[type=text]")
	.bind("focus",function(){ // Highlight editable now element
		var input = $(this).closest(".attributes").find("input[data-path]");
		editorHighlight(input);
	});
	
	$("#editor_settings").find(".attributes input[type=hidden]")
	.bind("change",function(){ // Append attributes to the editable now element
		var attributes = $(this).val();
		if(attributes!=""){
			attributes = JSON.parse(attributes);
			if(Object.keys(attributes).length>0){
				$.each(attributes, function(name, value){
					editableElement.attr(name,value);
				});
			}
		}
	});
	
	// Show Editor popup
	$(".editor_overlay").fadeIn(150,function(){
		$("body").addClass("editor_on").removeClass("editor_not_saved");
		$("#editor").addClass("opened");
		$("#editor_settings").nanoScroller({ scrollTop: 0, sliderMaxHeight: 50, preventPageScrolling: true, iOSNativeScrolling: true });
		editableBlock.addClass("on_edit");
		// disable links click and forms submit in editor preview
		editableBlock.on("click","a",function(event){ event.preventDefault(); });
		editableBlock.on("submit","form",function(event){ event.preventDefault(); });
	});
	
	// Open tabs with setting
	$("#editor_settings .label").click(function(){
		var parent = $(this).parent(),
			parentParent = parent.parent();
		if(parentParent.hasClass("params_inner")){
			if(parent.hasClass("opened")){
				closeEditorTab($(this));
			}else{
				openEditorTab($(this));
			}
		}else{
			if(parent.hasClass("opened")){
				closeEditorTab($(this));
			}else{
				openEditorTab($(this));
			}
		}
	});
	// Open tab with setting when clicked on editable element in editable block
	editableBlock.find(".js-editable-element").click(function(){
		var path = $(this).attr("data-path");
		var labelToOpen = $("#editor_settings").find("[data-path="+path+"]");
		var holder = labelToOpen.closest(".element");
		if(!holder.hasClass("opened")){
			labelToOpen = holder.find(".label");
			$("#editor_settings .element.opened .label").click();
			labelToOpen.click();					
			var scroll = $("#editor_settings .element").index(holder) * $("#editor_settings .element:not(.opened)").outerHeight(true);
			$("#editor_settings .nano-content").stop().animate({'scrollTop': scroll}, 150);
		}
		holder.find("[data-path="+path+"]:eq(0)").addClass("js-focused-from-block").focus();
	});
	
}

// Highlight editing now element
function editorHighlight(input){
	editableElement = input.attr("data-path");
	editableElement = editableBlock.find("[data-path='" + editableElement + "']");
	editableElement.addClass("js-edit-active");
	if(input.hasClass("js-focused-from-block")){
		input.click();			
	}
}

// Delete highlight of editing now element
function editorUnHighlight(){
	editableElement = editableBlock.find(".js-edit-active");
	editableElement.removeClass("js-edit-active");
}

// Open tab in the editor menu
function openEditorTab(label){
	console.log("fired openEditorTab()");
	var parent = label.parent(),
	parentParent = parent.parent(),
	params = label.next();
	var height = params.find(".params_inner").outerHeight(true);
	parent.addClass("opened");				
	if(parentParent.hasClass("params_inner")){
		var parentParentHeight = parentParent.height();
		parentParent.parent().animate({height:parentParentHeight + height},150,function(){
			params.animate({height:height},150,function(){
				$(this).addClass("visible");
				$("#editor_settings").nanoScroller({ sliderMaxHeight: 100, iOSNativeScrolling: true});						
			});
		});
	}else{			
		params.animate({height:height},150,function(){
			$(this).addClass("visible");
			$("#editor_settings").nanoScroller({ sliderMaxHeight: 100, iOSNativeScrolling: true});
		});				
	}
}

// Close tab in the editor menu
function closeEditorTab(label){
	console.log("fired closeEditorTab()");
	var parent = label.parent(),
	parentParent = parent.parent(),
	params = label.next();
	parent.removeClass("opened");				
	if(parentParent.hasClass("params_inner")){
		var height = params.find(".params_inner").outerHeight(true),
		parentParentHeight = parentParent.height();
		params.removeClass("visible").animate({height:0},150,function(){
			parentParent.parent().animate({height:parentParentHeight - height},150,function(){
				$("#editor_settings").nanoScroller({ sliderMaxHeight: 100, iOSNativeScrolling: true});						
			});
		});
	}else{			
		params.removeClass("visible").animate({height:0},150,function(){
			$("#editor_settings").nanoScroller({ sliderMaxHeight: 100, iOSNativeScrolling: true});
		});			
	}
}

function buildSetting(key,setting){
	var path = setting.path;
	var html = '';
	
	if(setting.content){ // This is a block - has another elements inside
		$.each(setting.content,function(key, content){
			if(key!="path"){
				html+=buildSetting(key, content);						
			}
		});
	}else{ // That's a final element - nothing inside it
		html+='<div class="element">'
				+'<a class="label">'+setting.label+'</a>'
				+'<div class="params">'
					+'<div class="params_inner">'
						+ buildElement(setting)
					+'</div>'
				+'</div>'
			+ '</div>';	
	}
	
	return html;
}

function buildElement(setting){
	//console.log(setting);
	var html = '';
	// Text field
	if(setting.type=="text"){
		html += settingName("Text",'HTML tags are allowed in this field. <br/>Use &lt;br&gt; to start a new line.');
		html += settingInput(setting.path,"text",setting.text,"Enter the text");
	}
	// Textarea field
	if(setting.type=="textarea"){
		html += settingName("Text",'HTML tags are allowed in this field. <br/>Use &lt;br&gt; to start a new line.');
		html += settingTextarea(setting.path,"text",setting.text,"Enter the text");
	}
	// Link's text & href
	if(setting.type=="link"){
		html += settingName("Text",'Text of the link');
		html += settingInput(setting.path,"text",setting.text,"Enter the text");
		html += settingHref(setting.path,"href",setting.href);
	}
	// Button's text & href
	if(setting.type=="btn"){
		html += settingName("Text",'Text of the button');
		html += settingInput(setting.path,"text",setting.text,"Enter the text");
		html += settingHref(setting.path,"href",setting.href);
	}
	/*
	if(setting.type=="img"){
		html += settingName("Image SRC",'The path where your image is located. Usually it's "i/image_name.jpg"');
		html += settingInput(setting.path,setting.type,setting.src,"Path to image");
		html += settingName("Image @2x SRC",'The 2x version of image for high-resolution retina displays. Must be twice larger than regulat image. Set the path where your image is located. Usually it's "i/image_name@2x.jpg"');
		html += settingInput(setting.path,setting.type,setting.src_2x,"Path to @2x image");
		html += settingName("Alt",'Alternative text that will be shown if image won't be loaded. Also used for SEO optimization.');
		html += settingInput(setting.path,setting.type,setting.alt,"Enter the text");
	}
	if(setting.type=="input"){
		html += settingName("Input",'Some tooltip here');
	}
	*/
	// Option's text
	if(setting.type=="option"){
		html += settingName("Text",'HTML tags are <b>not</b> allowed in this field.');
		html += settingInput(setting.path,"text",setting.text,"Enter the text");
	}
	// Tag
	if(setting.type!="icon" && setting.type!="img" && setting.type!="option"){
		html += settingName("HTML Tag",'This HTML tag will be used to create an element. Type only the tag name, without &lt; and &gt; symbols and closing part, e.g. just "p" instead of "&lt;p&gt;&lt;/p&gt;" If the tag is not set, the default tag for this type element will be set.');
		html += settingInput(setting.path,"tag",setting.tag,"Enter the tag");
	}
	// Classes
	html += settingName("Classes",'Classes of the element; <br/>use space or enter to add new class;<br/><a href="/startup/documentation/#classes" target="_blank" class="link color-white bold mt-1">Documentation</a>');
	html += settingClasses(setting.path,"classes",setting.classes);
	// Icon
	/*if(setting.type=="icon"){
		html += settingName("Icon",'FontAwesome Icon. ');
	}*/
	// Attributes
	html += settingName("Attributes",'Attributes of the element');
	html += settingAttributes(setting.path,"attributes",setting.attributes);
	// Animation delay

	if(html.length>0){
		html = '<div class="param">'+html+'</div>';
	}
	return html;
}

function settingName(text, description){
	if(description==undefined){
		var html = '<div class="name">'+text+'</div>';
	}else{
		var html = '<div class="name with_tooltip">'+text+'<i><span class="question">?</span><div class="editor-tooltip"><div class="inner">'+description+'</div></div></i></div>';
	}
	return html;
}

function settingInput(path,name,val,placeholder){
	if(val===false || val==undefined){val="";}
	var html = '<input type="text" data-path="'+path+'" data-name="'+name+'" value="'+val+'" placeholder="'+placeholder+'">';
	editableBlock.find("[data-path='" + path + "']").addClass("js-editable-element");
	return html;
}

function settingTextarea(path,name,val,placeholder){
	if(val===false || val==undefined){val="";}
	var html = '<textarea data-path="'+path+'" data-name="'+name+'" placeholder="'+placeholder+'">'+val+'</textarea>';
	editableBlock.find("[data-path='" + path + "']").addClass("js-editable-element");
	return html;
}

function settingHref(path,name,val){
	if(val===false || val==undefined){val="";}
	var html =	'<div class="href">'
			+		'<div class="name">HREF</div>'
			+		'<input type="text" data-path="'+path+'" data-name="'+name+'" value="'+val+'" placeholder="Link">'
			+	'</div>';
	editableBlock.find("[data-path='" + path + "']").addClass("js-editable-element");
	return html;
}
function settingClasses(path,name,classes){
	if(classes==undefined || classes===false){
		classes = [];
	}
	var html =	'<div class="classes">'
	html += '<input type="hidden" data-path="'+path+'" data-name="'+name+'" value="'+classes.join(" ")+'">';
	html += '<div class="list">';
	if(classes.length>0){
		$.each(classes, function(i,value){
			if(value!=""){
				html+='<div class="class"><span class="val">'+value+'</span><a class="remove_class" onclick="editorRemoveClass(this,event);"></a></div>';				
			}
		});
	}
	html += '</div>';
	html += '<div class="mt-2 d-flex align-items-center justify-content-between">';
	html += 	'<input type="text" class="add_class_input" placeholder="Class name" onkeydown="editorAddClass(this,event);" />';
	html += 	'<a class="btn action-1 add" onclick="editorAddClass(this);">Add</a>';
	html += '</div>';
	html += '</div>';
	editableBlock.find("[data-path='" + path + "']").addClass("js-editable-element");
	return html;
}

function editorAddClass(el,event){
	var type = el.tagName;
	el = $(el);
	if(type=="INPUT"){
		if(event.which==32 || event.which==13 || event.which==188 || event.which==190){ // space, enter, comma, dot
			event.preventDefault();
			if(el.val().length>0){
				el.next("a.add").click();				
			}
		}
	}else{
		var input = el.prev("input.add_class_input");
		var val = input.val();
		var classesInput = el.closest(".classes").find("input[data-path]");
		var classes = classesInput.val();
		classes = classes.split(" ");
		if(classes.indexOf(val)==-1){
			classes.push(val);
			if(classes.indexOf("")!=-1){
				classes.splice(classes.indexOf(""),1);
			}
			classes = classes.join(" ");
			classesInput.val(classes);
			el.closest(".classes").find(".list").append('<div class="class"><span class="val">'+val+'</span><a class="remove_class" onclick="editorRemoveClass(this,event);"></a></div>');
			classesInput.trigger("change"); // check for binded event - it changes editable element
			openEditorTab(el.closest(".element").find(".label")); // recount tab height
		}
		input.val("");
	}
}

function editorRemoveClass(el,event){
	el = $(el);
	var classesInput = el.closest(".classes").find("input[data-path]");
	var editableElement = classesInput.attr("data-path");
	editableElement = editableBlock.find("[data-path='" + editableElement + "']");
	var val = el.closest(".class").find(".val").text();
	var classes = classesInput.val();
		classes = classes.split(" ");
	var index = classes.indexOf(val);
	if(index!=-1){
		classes.splice(index,1);
		if(classes.indexOf("")!=-1){
			classes.splice(classes.indexOf(""),1);
		}
		classes = classes.join(" ");
		classesInput.val(classes);
		editableElement.removeClass(val);
		var label = el.closest(".element").find(".label");
		el.closest(".class").remove();
		openEditorTab(label); // recount tab height		
	}
}

function settingAttributes(path,name,attributes){
	if(attributes==undefined || attributes===false){
		attributes = {};
	}
	var html =	'<div class="attributes">'
	html += '<input type="hidden" data-path="'+path+'" data-name="'+name+'" value=\''+JSON.stringify(attributes)+'\'>';
	if(Object.keys(attributes).length>0){
		html += '<div class="list">';
		$.each(attributes, function(name,value){
			html += '<div class="row no-gutters attribute">';
			html += 	'<div class="col">';
			html += 		'<input type="text" class="edit_attribute_name" value="'+name+'" placeholder="Name" disabled="disabled" />';
			html += 		'<input type="text" class="edit_attribute_val" value=\''+value+'\' placeholder="Value" onkeyup="editorEditAttribute(this,event);" />';
			html += 	'</div>';
			html += 	'<div class="col-auto">';
			html += 		'<a class="d-flex align-items-center justify-content-center remove_attribute" onclick="editorRemoveAttribute(this,event);">'; // delete
			html += 			'<svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.65872 6.6575L3.82997 3.82875L1.00122 1" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.999976 6.65774L3.82872 3.82899L6.65747 1.00024" stroke-linecap="round" stroke-linejoin="round"/></svg>';
			html += 		'</a>';
			html += 	'</div>';
			html += '</div>';
		});
		html += '</div>';
	}else{
		html += '<div class="list"></div>';
	}
	html += '<div class="row no-gutters add_attribute_row">';
	html += 	'<div class="col">';
	html += 		'<input type="text" class="add_attribute_name" placeholder="Name" />';
	html += 		'<input type="text" class="add_attribute_val" placeholder="Value" />';
	html += 	'</div>';
	html += 	'<div class="col-auto">';
	html += 		'<a class="d-flex align-items-center justify-content-center add_attribute" onclick="editorAddAttribute(this);">'; // add
	html += 			'<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.00073 10.0016V6.00119V2.00073" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.99934 6.00073H5.99979H10.0002" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	html += 		'</a>';
	html += 	'</div>';
	html += '</div>';
	html += '</div>';
	editableBlock.find("[data-path='" + path + "']").addClass("js-editable-element");
	return html;
}

function editorAddAttribute(el,event){
	el = $(el);
	var nameInput = el.closest(".add_attribute_row").find(".add_attribute_name"),
		nameVal = nameInput.val(),
		valueInput = el.closest(".add_attribute_row").find(".add_attribute_val"),
		valueVal = valueInput.val(),
		attributesInput = el.closest(".attributes").find("input[data-path]"),
		attributes = attributesInput.val();
	attributes = JSON.parse(attributes);
	if(nameVal!="" && valueVal!=""){
		attributes[nameVal] = valueVal;
		attributesInput.val(JSON.stringify(attributes));
		el.closest(".attributes").find(".list").append(
'<div class="row no-gutters attribute">'+
	'<div class="col">'+
		'<input type="text" class="edit_attribute_name" value="'+nameVal+'" placeholder="Name" disabled="disabled" />'+
		'<input type="text" class="edit_attribute_val" value=\''+valueVal+'\' placeholder="Value" onkeyup="editorEditAttribute(this,event);" />'+
	'</div>'+
	'<div class="col-auto">'+
		'<a class="d-flex align-items-center justify-content-center remove_attribute" onclick="editorRemoveAttribute(this,event);">'+
			'<svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.65872 6.6575L3.82997 3.82875L1.00122 1" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.999976 6.65774L3.82872 3.82899L6.65747 1.00024" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
		'</a>'+
	'</div>'+
'</div>');
		attributesInput.trigger("change"); // check for binded event - it changes editable element
		openEditorTab(el.closest(".element").find(".label")); // recount tab height
		nameInput.val("");
		valueInput.val("");		
	}
}

function editorEditAttribute(el,event){
		el = $(el);
	var name = el.prev(".edit_attribute_name").val(),
		attributesInput = el.closest(".attributes").find("input[data-path]"),
		attributes = attributesInput.val();
	attributes = JSON.parse(attributes);
	attributes[name] = el.val();
	attributesInput.val(JSON.stringify(attributes));
	attributesInput.trigger("change"); // check for binded event - it changes editable element
}

function editorRemoveAttribute(el,event){
		el = $(el);
	var name = el.closest(".attribute").find(".edit_attribute_name").val(),
		attributesInput = el.closest(".attributes").find("input[data-path]"),
		attributes = attributesInput.val();
	attributes = JSON.parse(attributes);
	delete attributes[name];
	// attributes[name] = ""; //
	attributesInput.val(JSON.stringify(attributes));
	attributesInput.trigger("change"); // check for binded event - it changes editable element
	el.closest(".attribute").find(".edit_attribute_val").focus(); // fix - this is the way to choose editableElement
	editableElement.removeAttr(name);
	el.closest(".attribute").slideUp(150,function(){
		openEditorTab(el.closest(".element").find(".label")); // recount tab height
		$(this).remove();
	});
}

$(document).ready(function(){
	
	// Show editor By clicking on block
	$("#blocks").mouseup(function(e){
		if($(e.target).hasClass("up") || $(e.target).hasClass("down") || $(e.target).hasClass("delete") || $(e.target).hasClass("edit")){
			
		}else{
			if($(e.target).closest("li.free:not(.on_edit):not(.ui-sortable-helper)").length){
				var _this = $(e.target).closest("li.free:not(.on_edit):not(.ui-sortable-helper)").find(".edit");
				edit_block(_this);
			}
		}
	});

	// Close editor
	$(".editor_overlay").click(function(){
		if($("body").hasClass("editor_not_saved")){
			$(".controls_popup.close_editor").fadeIn(250);
		}else{
			$(".editor_overlay").fadeOut(250, function(){
				editableBlock.find(".repository_block").replaceWith(blockLastAppliedLayout);
				$("#editor").removeClass("opened");
				editableBlock.removeClass("on_edit");
				$("body").removeClass("editor_on");
				checkBlocksHeight();
			});			
		}
	});
	
	$("#close_editor").click(function(event){
		event.preventDefault();
		$("body").removeClass("editor_not_saved");
		$(".editor_overlay").click();
	});
	
	$("#continue_edit").click(function(event){
		event.preventDefault();
		$(".controls_popup.close_editor").fadeOut(250);
	});
	
	// Apply changes
	$("#editor_apply").click(function(){
		$("#editor_settings").submit();
	});
	
	$("#editor_settings").submit(function(e){
		e.preventDefault();
		showLoader();
		var form = $(this);		
		var settings = {};
		var uuid = 'SF_KEY'; // for minimal chance of key colision
		var walkConfig={
			pathFormat: function(key, isArr) {
				return uuid + key;
			},
			rootObjectCallbacks: false,
			callbacks: [
				{
					positions: ['preWalk'],
					callback: function(node){
						var params = node.val;
						delete params.path;
						delete params.label;
						var input = form.find("input[data-path="+node.path+"], textarea[data-path="+node.path+"]");
						if(input.length){
							input.each(function(){
								var name = $(this).attr("data-name");
								var val = $(this).val();
								if(name=="classes"){
									val = val.split(" ");
								}else if(name=="attributes"){
									val = JSON.parse(val);
								}else{
									// HTML entities
									//.replace(/&/g, '&amp;')
									//.replace(/"/g, '&quot;')
									//.replace(/"/g, '\"')
									//.replace(/'/g, "\'")
									val = val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
									val = val.replace(/"/g, '&quot;').replace(/'/g, "&apos;");									
								}
								params[name]=val;
							});
						}
						switch (node.container) {
							case 'array':
								Walk.updateObjectViaPathString(settings, params, node.path, uuid);
								break;
							case 'object':
								Walk.updateObjectViaPathString(settings, params, node.path, uuid);
								break;
						}
	
					}
				}
			]
		}
		Walk.walk(editorSettings, undefined, walkConfig);
		var appBackup = app.settings;
		app.settings.structure = [{cat:editableBlock.attr("data-id"),id:editableBlock.attr("data-number"),editorSettings:JSON.stringify(settings)/*.replace(/'/g,'&apos;')*/}];
		app.settings.anim = "off";

		$.post(preview_url, {layoutOnly:true,pageSettings:settingsToString()}).done(function(data){
			app.settings = appBackup;
			data = data.replace(/"i\//g,'"repository/i/');
			data = data.replace(/url\(i/g,'url(repository/i');
			editableBlock.find(".repository_block").html(data);
			editableBlock.attr("data-editor-settings",JSON.stringify(settings)/*.replace('&apos;/g',"\'")*/);
			blockDefaults = getBlockDefaults();
			updateStructure();
			$("body").removeClass("editor_not_saved");
			$(".editor_overlay").click(); // Close editor
			hideLoader();
		});
	});
	
	// Reset block's defaults
	$("#editor_reset").click(function(){
		showLoader();
		var appBackup = app.settings;
		app.settings.structure = [{cat:editableBlock.attr("data-id"),id:editableBlock.attr("data-number")}];
		app.settings.anim = "off";

		$.post(preview_url, {layoutOnly:true,pageSettings:settingsToString()}).done(function(data){
			app.settings = appBackup;
			data = data.replace(/"i\//g,'"repository/i/');
			data = data.replace(/url\(i/g,'url(repository/i');
			$("body").removeClass("editor_not_saved");
			editableBlock.find(".repository_block").html(data);
			editableBlock.find(".edit").click();
			checkBlocksHeight();
			hideLoader();
		});
	});
	
}); // $(document).ready end
