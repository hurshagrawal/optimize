var optimize = {};
optimize.selectedList = new Array();
optimize.dotCount = 0;
		
$(function() {
	var d = new Date();
	
	for(var i=1;i<=12;i++) {
		$("select[name='fromMonth']").append(new Option(i,i));
		$("select[name='toMonth']").append(new Option(i,i));	
	}
	$("select[name='fromMonth']").val(d.getMonth()+1);
	$("select[name='toMonth']").val(d.getMonth()+1);
	
	for(var i=1;i<=31;i++) {
		$("select[name='fromDay']").append(new Option(i,i));
		$("select[name='toDay']").append(new Option(i,i));	
	}
	$("select[name='fromDay']").val(d.getDate());
	$("select[name='toDay']").val(d.getDate()+1);
	
	for(var i=2000;i<=2020;i++) {
		$("select[name='fromYear']").append(new Option(i,i));
		$("select[name='toYear']").append(new Option(i,i));	
	}
	$("select[name='fromYear']").val(d.getFullYear());
	$("select[name='toYear']").val(d.getFullYear());
	
	var ampm = [" AM", " PM"];
	var runningTime = 0;
	for(var i=0;i<2;i++) {
		$("select[name='fromHour']").append(new Option("12"+ampm[i],12*i));
		$("select[name='toHour']").append(new Option("12"+ampm[i],12*i));
		for(var j=1;j<=11;j++) {
			$("select[name='fromHour']").append(new Option(j+ampm[i],(12*i)+j));
			$("select[name='toHour']").append(new Option(j+ampm[i],(12*i)+j));	
		}
	}
	$("select[name='fromHour']").val(d.getHours());
	$("select[name='toHour']").val((d.getHours()+1)%24);

	$("#loading").css("display", "none");
	
	$("#calendarList li").click(function() {
		if (!$(this).hasClass("clicked")) {
			$(this).addClass("clicked");
			optimize.selectedList.push($(this).html());
		} else {
			$(this).removeClass("clicked");
			for(var i=optimize.selectedList.length-1; i>=0; i--) {
				if (optimize.selectedList[i] === $(this).html()) {
					optimize.selectedList.splice(i,1);
				}
			}
		}
		//console.log(selectedList);
	});
	
	
	$("#continue").click(function() {
		$("#continue").hide();
		$("#loading").css("display", "table");
		
		var dataString = 'calendar=' + $.toJSON(optimize.selectedList) + '&fromDay=' + $("select[name='fromDay']").val() + '&fromMonth=' + $("select[name='fromMonth']").val() + '&fromYear=' + $("select[name='fromYear']").val() + '&fromHour=' + $("select[name='fromHour']").val() + '&toDay=' + $("select[name='toDay']").val() + '&toMonth=' + $("select[name='toMonth']").val() + '&toYear=' + $("select[name='toYear']").val() + '&toHour=' + $("select[name='toHour']").val();
		
		//console.log(dataString);
		
		$.ajax({
			type: 'POST',
			url: '/googleEventFetch',
			data: dataString,
			success: function(data) {
				optimize.events = data.eventList;
				$("#content").load(data.url);
			}
		});
	});	
});