$(document).ready(function() {
	$.ajax({
		method: 'POST',
		url: 'http://192.168.56.1:8080/username',
		success: function(data) {
			if(data) {
				$("#user").html('<a href="https://twitter.com/'
					+ data.replace(/['"]+/g, "")
					+ '"><i class="fab fa-twitter"></i>'
					+ data.replace(/['"]+/g, "")
					+ '</a>'
				);
				$("#user, #logout").css({
					"visibility": "",
					"display": ""
				});
				$("#login, #buttonlogin").css({
					"visibility": "hidden",
					"display": "none"
				});
			}
		},
		error: function() {
			$("#user, #logout").css({
				"visibility": "hidden",
				"display": "none"
			});
			$("#login, #buttonlogin").css({
				"visibility": "",
				"display": ""
			});
		}
	});
});
