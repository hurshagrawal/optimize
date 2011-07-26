function googleOAuthSuccess() {
	$("#content").load('/calendars');
}

function openGoogleOAuthWindow() {
	googleAuthWin = window.open('/getGoogleRequestToken', 
		'open_window', 
		'status, scrollbars, resizable, dependent, width=640, height=400');
}