angular.module('ClickersApp', ['ClickersApp.controllers', 'ClickersApp.directives', 'ngAnimate']);

angular.module('ClickersApp.controllers', []).controller('mainController', function($scope, $rootScope) {
	
	$scope.student
	$scope.admin = false;
	
	$scope.admins = [];
		
	$scope.authed = false;
	$scope.questions = {};
	
	$scope.stats = {};
	
	$rootScope.rootfields = {
		stats: false,
		upload: false,
		droppedFiles: [],
		loading: false
	};
	
	$scope.fields = {
		username: "",
		password: "",
		associatedUsername: ""
	};
	
	$scope.sessions = [];
	$scope.selectedSession;
	
	$scope.blankTemplate = {
		text: "",
		image: "",
		options: [
			{
				text: "I don't know",
				correct: false
			},
			{
				text: "",
				correct: true
			}
		]
	};
	
	$scope.addSession = function() {
		var response = prompt("New Session: ");
		if (response) {
			$scope.sessions.push(response);
			$scope.selectedSession = response;
		}
	}
	
	$scope.getAllUsernames = function() {
		var names = [];
		for (var i = 0; i < $scope.questions.length; i++) {
			if ($scope.questions[i].responses) {
				for (var j = 0; j < $scope.questions[i].responses.length; j++) {
					for (var k = 0; k < names.length; k++) {
						if (names[k] == $scope.questions[i].responses[j].username) {
							names.splice(k, 1);
						}
					}
					names.push($scope.questions[i].responses[j].username);
				}
			}
		}
		return names;
	}
	
	$scope.buildStats = function() {
		var totalResponses = 0;
		$scope.stats = {};
		var usernames = $scope.getAllUsernames();
		for (var i = 0; i < $scope.questions.length; i++) {
			if ($scope.questions[i].session == $scope.selectedSession) {
				for (var k = 0; k < $scope.questions[i].options.length; k++) {
					totalResponses++;
					if ($scope.questions[i].options[k].correct) {
						if ($scope.questions[i].responses) {
							for (var j = 0; j < $scope.questions[i].responses.length; j++) {
								if ($scope.questions[i].options[k].text == $scope.questions[i].responses[j].text) {
									if (!$scope.stats[$scope.questions[i].responses[j].username]) {
										$scope.stats[$scope.questions[i].responses[j].username] = 0;
									}
									$scope.stats[$scope.questions[i].responses[j].username]++;
								}
							}
						}
					} else {
						for (var j = 0; j < usernames.length; j++) {
							if (!$scope.stats[usernames[j]]) {
								$scope.stats[usernames[j]] = 0;
							}
							var contained = false;
							if ($scope.questions[i].responses) {
								for (var l = 0; l < $scope.questions[i].responses.length; l++) {
									if ($scope.questions[i].options[k].text == $scope.questions[i].responses[l].text) {
										if ($scope.questions[i].responses[l].username == usernames[j]) {
											contained = true;
										}
									}
								}
							}
							if (!contained) {
								$scope.stats[usernames[j]]++;
							}
						}
					}
				}
			}
		}
		for (var name in $scope.stats) {
			$scope.stats[name] /= totalResponses;
		}
	}
	
	$scope.newQuestion = JSON.parse(JSON.stringify($scope.blankTemplate));
	$scope.editIndex = -1;
	
	$scope.error = false;
	
	$scope.socket = io();
	
	$scope.socket.on('reconnect', function(num) {
		$scope.login();
		$scope.getAdmins();
	});
	$scope.login = function() {
		if ($scope.fields.username && $scope.fields.password) {
			var login = {};
			login.username = $scope.fields.username;
			login.password = $scope.fields.password;
			$scope.socket.emit('login', login);
		}
	}
	$scope.getAdmins = function() {
		$scope.socket.emit('admins', {});
	}
	$scope.trash = function(date) {
		if (confirm("Are you sure you want to delete this question?  That will remove related statistics, as well.  You can also make it invisible...")) {
			var obj = {};
			obj["associatedUsername"] = $scope.fields.associatedUsername;
			obj["date"] = date;
			$scope.socket.emit('delete', obj);
		}
	}
	$scope.edit = function(question, index) {
		$scope.newQuestion = JSON.parse(JSON.stringify(question));
		$scope.editIndex = index;
		$rootScope.rootfields.upload = true;
		if ($scope.newQuestion.image) {
			var newImg = new Image();
			newImg.onload = function() {
				$scope.removeImage();
				$scope.newQuestion.image = dataString;
				newImg.id = "image";
				newImg.style.height = "auto";
				newImg.style.width = "auto";
				newImg.style.maxHeight = "100px";
				newImg.style.paddingTop = "15px";
				document.getElementById("imgpreview").appendChild(newImg);
			}
			var dataString = new String($scope.newQuestion.image);
			newImg.src = dataString;
			$rootScope.rootfields.droppedFiles.push("recycled");
			$rootScope.rootfields.droppedFiles.push("recycled");
		}
	}
	$scope.resetUpload = function() {
		$scope.newQuestion = JSON.parse(JSON.stringify($scope.blankTemplate));
		$scope.editIndex = -1;
	}
	$scope.sendResponse = function (question) {
		var questionObj = JSON.parse(JSON.stringify(question));
		delete questionObj.image;
		delete questionObj.text;
		delete questionObj.responses;
		delete questionObj.visible;
		questionObj["session"] = $scope.selectedSession;
		questionObj["username"] = $scope.fields.username;
		questionObj["associatedUsername"] = $scope.fields.associatedUsername;
		//leave options, date, session
		//alert(JSON.stringify(questionObj));
		$scope.socket.emit('answer', questionObj);
		alert("Got your submission!");
		
	}
	$scope.socket.on('login', function (msg) {
		$scope.$apply(function () {
			$scope.authed = msg;
			if (!$scope.authed) {
				$scope.error = true;
			} else {
				$scope.error = false;
				$scope.socket.emit('questions', $scope.fields.username);
				if ($scope.fields.username == $scope.fields.associatedUsername) {
					$scope.admin = true;
				} else {
					$scope.admin = false;
					$scope.student = true;
				}
			}
		});	
	});
	$scope.socket.on('admins', function(msg) {
		$scope.$apply(function() {
			if ($scope.fields.username) {
				if ($scope.admins.length > 0) {
					$scope.admins[0] = $scope.fields.username;
					$scope.fields.associatedUsername = $scope.admins[0];
					if ($scope.admins.length > 1) {
						for (var i = 1; i < $scope.admins.length; i++) {
							if ($scope.admins[i] == $scope.fields.username) {
								$scope.admins.splice(i, 1);
							}
						}
					}
				} else {
					$scope.admins.push($scope.fields.username);
					$scope.fields.associatedUsername = $scope.admins[0];
				}
			}
			for (var i = 0; i < msg.length; i++) {
				if ($scope.admins.indexOf(msg[i]) == -1) {
					$scope.admins.push(msg[i]);
				}
			}
		});
	});
	$scope.socket.on('questions', function (msg) {
		if (msg[$scope.fields.associatedUsername]) {
			msg = JSON.parse(JSON.stringify(msg[$scope.fields.associatedUsername]));
		} else {
			msg = [];
		}
		$scope.$apply(function () {
			var sessions = [];
			//$.extend(true, $scope.questions, msg);
			for (var i = 0; i < msg.length; i++) {
				
				for (var j = 0; j < sessions.length; j++) {
					if (sessions[j] == msg[i].session) {
						sessions.splice(j, 1);
					}
				}
				sessions.push(msg[i].session);
				
				if (msg[i].responses) {
					for (var j = 0; j < msg[i].responses.length; j++) {
						if (msg[i].responses[j].username == $scope.fields.username) {
							for (var k = 0; k < msg[i].options.length; k++) {
								if (msg[i].responses[j].text == msg[i].options[k].text) {
									msg[i].options[k].chosen = true;
									//break; //put break to kind of enforce unique options
								}
							}
						}
					}
				}
			}
			
			//alert(JSON.stringify(sessions));
			if (sessions.length == 0) {
				sessions.push("None");
			}
			var present = false;
			if ($scope.selectedSession) {
				for (var i = 0; i < sessions.length; i++) {
					if (sessions[i] == $scope.selectedSession) {
						present = true;
						break;
					}
				}
			}
			$scope.sessions = JSON.parse(JSON.stringify(sessions));
			if (!present) {
				$scope.selectedSession = $scope.sessions[0];
			}
			
			for (var i = 0; i < $scope.questions.length; i++) {
				for (var j = 0; j < msg.length; j++) {
					if ($scope.questions[i].date == msg[j].date) {
						for (var k = 0; k < $scope.questions[i].options.length; k++) {
							for (var l = 0; l < msg[j].options.length; l++) {
								if ($scope.questions[i].options[k].text == msg[j].options[l].text) {
									if ($scope.questions[i].options[k].chosen !== undefined) {
										msg[j].options[l].chosen = $scope.questions[i].options[k].chosen; //copy whatever the current state of the selection is for this option
									}
									//break; //put break to kind of enforce unique options
								}
							}
						}
						break;
					}
				}
			}
			$scope.questions = msg;
			$scope.buildStats();
		});	
	});
	$scope.removeImage = function() {
		$scope.newQuestion.image = "";
		try {
			document.getElementById("image").parentNode.removeChild(document.getElementById("image"));
		} catch (e) { }
	}
	$scope.parseImg = function(dropped) {
		if (dropped.files && dropped.files[0]) {
			dropped = dropped.files;
			if ($rootScope.rootfields.droppedFiles.length == 0 || ($rootScope.rootfields.droppedFiles.length > 0 && confirm("This will overwrite your previously selected image."))) {
				$rootScope.$apply(function () {
				$rootScope.rootfields.droppedFiles = [];
					for (var i in dropped) {
						try {
							var file = dropped[i];
							var imageType = /image.*/;
							if (!file.type.match(imageType)) {
								continue;
							}
							var img = document.createElement("img");
							img.classList.add("obj");
							img.file = file;
							var reader = new FileReader();
							reader.onload = (function(aImg) {
								return function(e) {
									aImg.onload = function() {
										var canvas = document.createElement("canvas");
										var ctx = canvas.getContext("2d");
										canvas.width = aImg.width;
										canvas.height = aImg.height;
										ctx.drawImage(aImg, 0, 0);
										var newImg = new Image();
										newImg.onload = function() {
											$scope.removeImage();
											$scope.newQuestion.image = dataString;
											newImg.id = "image";
											newImg.style.height = "auto";
											newImg.style.width = "auto";
											newImg.style.maxHeight = "100px";
											newImg.style.paddingTop = "15px";
											document.getElementById("imgpreview").appendChild(newImg);
										}
										var dataString = canvas.toDataURL('image/png');
										newImg.src = dataString;
									}
									aImg.src = e.target.result;
								};
							})(img);
							reader.readAsDataURL(file);
							$rootScope.rootfields.droppedFiles.push(dropped[i]);
							break;
						} catch (e) { }
					}
					if ($rootScope.rootfields.droppedFiles.length > 0) {
							$rootScope.rootfields.upload = true;
					} else {
						var fileInput = $("#file");
						alert("You selected a file that is not an image.  Please select an image file");
						fileInput.replaceWith( fileInput.val('').clone( true ) );
					}
				});	
			}
		}
	}
});