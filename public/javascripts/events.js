$(function() {
	for (var i=0; i<optimize.events.length; i++) {
		$("#eventList").append("<li>"+optimize.events[i].title+"</li>")
	}
});