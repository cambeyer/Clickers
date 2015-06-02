//Defines an Angular application ClickersApp
//Indicates that there will be controllers, directives
//Also will utilize the ngAnimate module
angular.module('ClickersApp', ['ClickersApp.controllers', 'ClickersApp.directives', 'ngAnimate']);

//Defines an Angular controller
//In this case, we are just using one controller mainController
//Will use the rootScope also
angular.module('ClickersApp.controllers', []).controller('mainController', function($scope, $rootScope) {
	
	//Keeps track of whether the user is a student or admin
	$scope.student
	$scope.admin = false;
	
	//Keeps a list of all users given by the server to have created questions
	$scope.admins = [];
		
	//Keeps track of whether a user is properly authorized or not
	$scope.authed = false;
	//Initializes the questions list to be blank until the server populates it
	$scope.questions = {};
	
	//Keeps track of statistics, updated by the buildStats function
	$scope.stats = {};
	
	//Nested properties because Angular doesn't like to access them directly
	//On the rootScope for simplicity
	$rootScope.rootfields = {
		//Whether stats are being displayed
		stats: false,
		//Whether the upload form is being displayed
		upload: false,
		//What files have been drag-dropped onto the page
		droppedFiles: [],
		//Not-used property for when the question is being submitted to the server
		loading: false
	};
	
	//Nested properties because Angular doesn't like to access them directly
	$scope.fields = {
		//keeps track of the user's username/password, and also which user they want to see questions from (associatedUsername)
		username: "",
		password: "",
		associatedUsername: ""
	};
	
	//initialize the list of sessions available to choose from
	$scope.sessions = [];
	//keeps track of which session is currently active
	$scope.selectedSession;
	
	//initialize a blankTemplate object to be pushed into the upload form when it is needed
	//could be used to set any number of default questions that are desired
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
	
	//fuction that is called when the user wants to create a new session
	$scope.addSession = function() {
		//ask the user to input a new session name
		var response = prompt("New Session: ");
		//if the user actually input some text, then add that session to the list of sessions and select the new session
		if (response) {
			//loop through the current list of session to ensure no duplication is allowed
			for (var session in $scope.sessions) {
				if (session == response) {
					return;
				}
			}
			//add the new session
			$scope.sessions.push(response);
			//activate the new session
			$scope.selectedSession = response;
		}
	}
	
	//extracts all of the usernames that have answered questions at all
	$scope.getAllUsernames = function() {
		//initialize an empty array of names
		var names = [];
		//loop through all of the questions on the scope
		for (var i = 0; i < $scope.questions.length; i++) {
			//if the question has responses, loop through those otherwise move on to the next question
			if ($scope.questions[i].responses) {
				for (var j = 0; j < $scope.questions[i].responses.length; j++) {
					//loop through the resultant array to ensure the names there are not duplicated
					for (var k = 0; k < names.length; k++) {
						if (names[k] == $scope.questions[i].responses[j].username) {
							//if the name in the question being scanned is already present in the resultant array, remove it from the resultant array
							names.splice(k, 1);
						}
					}
					//add the username of the question/response currently being scanned into the resultant array
					names.push($scope.questions[i].responses[j].username);
				}
			}
		}
		//return the list of unique usernames
		return names;
	}
	
	//function that builds the list of stats from the questions variable for a current session
	$scope.buildStats = function() {
		var totalResponses = 0;
		//initialize the stats variable to an empty object
		$scope.stats = {};
		//get a list of all users who have interacted with any of the questions in this session
		var usernames = $scope.getAllUsernames();
		//loop through all of the questions on the scope
		for (var i = 0; i < $scope.questions.length; i++) {
			//if the session of the question matches the current session
			if ($scope.questions[i].session == $scope.selectedSession) {
				//loop through all of the question's options
				for (var k = 0; k < $scope.questions[i].options.length; k++) {
					//increment the total possible number of points a user might have
					totalResponses++;
					//if the question was marked as a correct response by the creator
					if ($scope.questions[i].options[k].correct) {
						//loop through all of the question's responses and add points to the users who answered correctly
						if ($scope.questions[i].responses) {
							for (var j = 0; j < $scope.questions[i].responses.length; j++) {
								//if the response being scanned matches the option currently being scanned
								if ($scope.questions[i].options[k].text == $scope.questions[i].responses[j].text) {
									//if the user doesn't already have a score, add them to the resultant object with an initial value of 0
									if (!$scope.stats[$scope.questions[i].responses[j].username]) {
										$scope.stats[$scope.questions[i].responses[j].username] = 0;
									}
									//increment the user's points
									$scope.stats[$scope.questions[i].responses[j].username]++;
								}
							}
						}
					} else {
						//if the question was marked as incorrect by the creator, then add points to all of the users who did not select this option
						//loop through all users and initialize their number of points to 0
						for (var j = 0; j < usernames.length; j++) {
							if (!$scope.stats[usernames[j]]) {
								$scope.stats[usernames[j]] = 0;
							}
							var contained = false;
							if ($scope.questions[i].responses) {
								//loop through all of the responses
								for (var l = 0; l < $scope.questions[i].responses.length; l++) {
									//if a particular user sent a response that matches the option currently being scanned, mark their username as having answered this incorrect response
									if ($scope.questions[i].options[k].text == $scope.questions[i].responses[l].text) {
										if ($scope.questions[i].responses[l].username == usernames[j]) {
											contained = true;
										}
									}
								}
							}
							//if the user did not select this incorrect response, then increment their number of points
							if (!contained) {
								$scope.stats[usernames[j]]++;
							}
						}
					}
				}
			}
		}
		//loop through all users in the resultant object and calculate their percentages by dividing the number of points they've accumulated by the total number of points available for this session (which is totalled while also totalling users' points)
		for (var name in $scope.stats) {
			$scope.stats[name] /= totalResponses;
		}
	}
	
	//Deep clone the blankTemplate into the newQuestion object (which is 2-way bound to the upload form)
	//Changes made in the upload form are reflected in this variable, but are not applied back to the blank template
	$scope.newQuestion = JSON.parse(JSON.stringify($scope.blankTemplate));
	//Keeps track of whether the user desires to edit a question or create a new one
	//Defaults to creating a new question (anything less than 0)
	$scope.editIndex = -1;
	
	//Keeps track of whether an error has occurred
	$scope.error = false;
	
	//Initializes the websocket connection
	$scope.socket = io();
	
	//If the websocket reconnects with the server (this computer was suspended, disconnected, the server went down temporarily, etc), verify the user's credentials are still correct and update the list of people who have created questions
	$scope.socket.on('reconnect', function(num) {
		$scope.login();
		$scope.getAdmins();
	});
	//Function to send login information to the server
	$scope.login = function() {
		//if the user has typed something for username and password, proceed
		if ($scope.fields.username && $scope.fields.password) {
			var login = {};
			login.username = $scope.fields.username;
			login.password = $scope.fields.password;
			//create a JSON object from the two values we require and send it to the server via websockets to handle
			$scope.socket.emit('login', login);
		}
	}
	//Function to send a message to the server indicating we want a list of administrators
	$scope.getAdmins = function() {
		$scope.socket.emit('admins', {});
	}
	//Function to allow a user to trash/delete a question...
	//Sends a message to the server with the unique timestamp of this question for the particular user
	$scope.trash = function(date) {
		//Remind the user they can simply make the question not-visible to students before actually (permanently) deleting it
		if (confirm("Are you sure you want to delete this question?  That will remove related statistics, as well.  You can also make it invisible...")) {
			var obj = {};
			//The only two attributes required by the server to know which question to delete are the username of the question creator and the timestamp
			obj["associatedUsername"] = $scope.fields.associatedUsername;
			obj["date"] = date;
			$scope.socket.emit('delete', obj);
		}
	}
	//Function to allow a user to edit a previously-defined question
	$scope.edit = function(question, index) {
		//Deep clone the old question so we don't modify the old one directly
		$scope.newQuestion = JSON.parse(JSON.stringify(question));
		//Set the edit index to the index passed to this function (logic for that handled by Angular in index.html)
		$scope.editIndex = index;
		//Pop open the upload form
		$rootScope.rootfields.upload = true;
		//If the old question had an image, then we need to put that image into the upload form
		if ($scope.newQuestion.image) {
			var newImg = new Image();
			newImg.onload = function() {
				//remove the old image in the upload from if there is one
				$scope.removeImage();
				//set the image to the dataString representing the image
				$scope.newQuestion.image = dataString;
				newImg.id = "image";
				//these auto parameters are required so that Internet Explorer doesn't try to render the image at full size, used in conjunction with the maxHeight attribute below
				newImg.style.height = "auto";
				newImg.style.width = "auto";
				newImg.style.maxHeight = "100px";
				newImg.style.paddingTop = "15px";
				//append the new image preview to the DOM
				document.getElementById("imgpreview").appendChild(newImg);
			}
			var dataString = new String($scope.newQuestion.image);
			newImg.src = dataString;
			//push the word "recycled" (arbitrary) onto the droppedFiles field so the user will be prompted that the image will be replaced if/when another is dropped onto the form
			$rootScope.rootfields.droppedFiles.push("recycled");
		}
	}
	//function to reset the upload form to the blankTemplate and clear the editIndex
	$scope.resetUpload = function() {
		$scope.newQuestion = JSON.parse(JSON.stringify($scope.blankTemplate));
		$scope.editIndex = -1;
	}
	//Function to send a response to the server for a given question
	$scope.sendResponse = function (question) {
		var questionObj = JSON.parse(JSON.stringify(question));
		//delete unneccessary parameters from the question since we are only sending the response
		delete questionObj.image;
		delete questionObj.text;
		delete questionObj.responses;
		delete questionObj.visible;
		questionObj["session"] = $scope.selectedSession;
		questionObj["username"] = $scope.fields.username;
		questionObj["associatedUsername"] = $scope.fields.associatedUsername;
		//leave options, date, session
		//send the response to the server
		$scope.socket.emit('answer', questionObj);
		//not necessary since the communication to the server is instantaneous, but the user might be wondering if their submission was actually received
		alert("Got your submission!");	
	}
	//Add a listener to the socket for when the server sends a response about login
	$scope.socket.on('login', function (msg) {
		//this construction forces Angular to update the DOM after these scope changes are applied
		$scope.$apply(function () {
			//update the authed variable
			$scope.authed = msg;
			//if the user is not authenticated, show them an error message so they can try again
			if (!$scope.authed) {
				$scope.error = true;
			} else {
				$scope.error = false;
				//now that the user has successfully authenticated, ask for a list of questions from the server
				$scope.socket.emit('questions', $scope.fields.username);
				//if the user is logging in for the same username that they asked to see questions from, then they can administer those questions
				if ($scope.fields.username == $scope.fields.associatedUsername) {
					$scope.admin = true;
				} else {
					//otherwise enforce student mode only
					$scope.admin = false;
					$scope.student = true;
				}
			}
		});	
	});
	//Add a listener for when the server sends a list of users who are admins of some questions
	//Adds the current username field into the list of options so they can always opt to create their own questions, even if they haven't created any yet
	$scope.socket.on('admins', function(msg) {
		//Update the DOM after applying changes
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
	//Add a listener for when the server sends the list of questions
	//Reconciles currently-selected options with the new information from the server so no information is lost before submitting
	$scope.socket.on('questions', function (msg) {
		if (msg[$scope.fields.associatedUsername]) {
			msg = JSON.parse(JSON.stringify(msg[$scope.fields.associatedUsername]));
		} else {
			msg = [];
		}
		$scope.$apply(function () {
			var sessions = [];
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
								}
							}
						}
					}
				}
			}
			
			//Add a default session of "None" to the list of options
			//Change to whatever is desired
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
			
			//reconcile mid-selections with incoming question information
			for (var i = 0; i < $scope.questions.length; i++) {
				for (var j = 0; j < msg.length; j++) {
					if ($scope.questions[i].date == msg[j].date) {
						for (var k = 0; k < $scope.questions[i].options.length; k++) {
							for (var l = 0; l < msg[j].options.length; l++) {
								if ($scope.questions[i].options[k].text == msg[j].options[l].text) {
									if ($scope.questions[i].options[k].chosen !== undefined) {
										msg[j].options[l].chosen = $scope.questions[i].options[k].chosen; //copy whatever the current state of the selection is for this option
									}
								}
							}
						}
						break;
					}
				}
			}
			$scope.questions = msg;
			//refresh the statistics
			$scope.buildStats();
		});	
	});
	//removes the preview image from the upload form
	$scope.removeImage = function() {
		$scope.newQuestion.image = "";
		try {
			document.getElementById("image").parentNode.removeChild(document.getElementById("image"));
		} catch (e) { }
	}
	//Function to parse an image that has been dropped onto the page
	$scope.parseImg = function(dropped) {
		if (dropped.files && dropped.files[0]) {
			dropped = dropped.files;
			if ($rootScope.rootfields.droppedFiles.length == 0 || ($rootScope.rootfields.droppedFiles.length > 0 && confirm("This will overwrite your previously selected image."))) {
				$rootScope.$apply(function () {
				//only allow one file to be uploaded, so blank the old one if there is one
				$rootScope.rootfields.droppedFiles = [];
					//loop through all the objects that have been dropped
					for (var i in dropped) {
						try {
							var file = dropped[i];
							var imageType = /image.*/;
							//if the file is not an image type then skip it
							if (!file.type.match(imageType)) {
								continue;
							}
							var img = document.createElement("img");
							img.classList.add("obj");
							img.file = file;
							//read the file from disk
							var reader = new FileReader();
							reader.onload = (function(aImg) {
								return function(e) {
									//draw the image to canvas on the upload form
									//this is the only method allowed with security restrictions on the web
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
					//when you drop a file on the page, it assumes you will want to create a question with it, so open the upload form
					if ($rootScope.rootfields.droppedFiles.length > 0) {
							$rootScope.rootfields.upload = true;
					} else {
						var fileInput = $("#file");
						alert("You selected a file that is not an image.  Please select an image file");
						//reset the file input picker
						fileInput.replaceWith( fileInput.val('').clone( true ) );
					}
				});	
			}
		}
	}
});