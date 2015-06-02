//Basic Node Web Server
var express = require('express');
var app = express();
//Used to serve a public path
var path = require('path');
//Used to perform file system operations
var fs = require('fs-extra');
//Binds to HTTP
var http = require('http').Server(app);
//Used for real-time socket communication
var io = require('socket.io')(http);
//Used to authenticate against Active Directory
var ActiveDirectory = require('activedirectory');

//LTU's address
var domain = "campus.ltu.edu";
//LTU's active directory address
var domainController = "hydrogen.campus.ltu.edu";

//Initialize Active Directory LDAP
var ad = new ActiveDirectory({ url: 'ldap://' + domainController, baseDN: 'dc=campus,dc=ltu,dc=edu' });

//Set the directory name for storing private question lists... uses the special variable __dirname
var dir = __dirname + '/files/';

//Global variable that represents all questions in the system
//Used so operations are instantaneous in RAM and can be periodically committed to disk
var globalquestions;

//Serve the "public" folder as the root WWW folder
app.use(express.static(path.join(__dirname, 'public')));

//Function that writes a certain user's questions to disk, in their own JSON file
var writeIndexFile = function(associatedUsername) {
	//if there are actually questions for the given username, then write the file
	if (globalquestions[associatedUsername] && globalquestions[associatedUsername].length > 0) {
		fs.writeFileSync(dir + associatedUsername + ".json", JSON.stringify(globalquestions[associatedUsername]));
	} else {
		//if there are no questions in the global questions variable for the given username, delete their JSON file of questions from disk
		try {
			fs.unlinkSync(dir + associatedUsername + ".json");
		} catch (e) {
			console.log(e);
			console.log("writeIndexFile: error removing index file");
		}
	}
}

//Function that attempts to authenticate a given username and password against active directory
var login = function(socket, username, password) {
	//Don't run if there was not both a username and password supplied
	if (username && password) {
		//Attempt to authenticate
		ad.authenticate(username + "@" + domain, password, function(err, auth) {
			//If there was an error, send a login false message
			if (err) {
				console.log("Error: could not authenticate user " + username);
				sendmessage(socket, "login", false);
				return;
			}
			//If there was no error and the authentication was successful, send a login true message
			if (auth) {
				console.log("Successfully authenticated user " + username);
				sendmessage(socket, "login", true);
				return;
			}
			//If there was no error but the authentication was not explicitly successful (timeout), send a login false message
			else {
				console.log("Could not authenticate user " + username);
				sendmessage(socket, "login", false);
				return;
			}
		});
	} else {
		sendmessage(socket, "login", false);
		return;
	}
}

//Function to delete a question by its unique timestamp for a given user
var deleteQuestion = function(associatedUsername, date) {
	//cycle through all of the questions for the given user
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		//if the timestamps match...
		if (globalquestions[associatedUsername][i].date == date) {
			console.log("Deleting question: " + globalquestions[associatedUsername][i].text);
			//remove this question from the global variable of questions
			globalquestions[associatedUsername].splice(i, 1);
			break;
		}
	}
}

//Sends a message of a given type to a given socket
//More of a separation-of-code formality than for actual utility
var sendmessage = function(socket, type, msg) {
	console.log("Sending " + type + ": " + msg);
	socket.emit(type, msg);
}

//Function to create a list of sessions for a given user
var sessionsList = function(associatedUsername, username) {
	//initialize the result with an empty array
	var sessions = [];
	//loop through all of the user's questions
	//for each session encountered, add it to the resultant array if it is not already in the array
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		var included = false;
		for (var j = 0; j < sessions.length; j++) {
			if (sessions[j] == globalquestions[associatedUsername][i].session) {
				included = true;
				break;
			}
		}
		if (!included) {
			//add the session to the result
			sessions.push(globalquestions[associatedUsername][i].session);
		}
	}
	//return the result... all of the unique sessions for a given user
	return sessions;
}

//return all questions of a specific session for a given username and session name
var filterSession = function(associatedUsername, sessionName) {
	var questionSubset = [];
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		if (globalquestions[associatedUsername][i].session == sessionName) {
			//if the session names match, add the question to the result
			questionSubset.push(globalquestions[associatedUsername][i]);
		}
	}
	//return all of the questions for the given session
	return questionSubset;
}

//Function to return the list of users who have created questions (not necessarily who has answered questions) since this is the list of potential administrator users
var adminList = function(msg) {
	var result = [];
	//since questions are added by their creator's username in the global variable, we can for:each it directly
	for (var admin in globalquestions) {
		result.push(admin);
	}
	return result;
}

//When a new socket connection is made, add the socket listeners
io.on('connection', function(socket){
	//Add a login listener to the socket which will call the login function with the username and password from the incoming message
	socket.on('login', function(msg) {
		console.log('Received login request: ' + msg.username + ", " + msg.password);
		login(socket, msg.username, msg.password);
	});
	//Listener to return the list of sessions for a given user... not necessary in the current architecture since the client handles this
	//socket.on('sessions', function(msg) {
	//	//filter by username which sessions they get
	//	socket.emit('sessions', sessionsList(msg));
	//});
	//Add a listener to return the list of users who have created questions
	socket.on('admins', function(msg) {
		socket.emit('admins', adminList(msg));
	});
	//Add a listener to emit all questions
	socket.on('questions', function(msg) {
		socket.emit('questions', globalquestions);
	});
	//Add a listener to create a new question
	socket.on('question', function(msg) {
		var question = JSON.parse(msg);
		var associatedUsername = question.associatedUsername;
		//We don't want the associatedUsername to be persisted, so we delete that property from the object
		delete question.associatedUsername;
		//If the question already has a timestamp, we must be editing an old question
		if (question.date) {
			console.log('Editing old question');
			//Since there may be responses in an old question, we should delete them and merge the current responses-on-file in with the question
			delete question.responses;
			question["responses"] = [];
			//cycle through all of the user's questions to find a date match
			for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
				if (globalquestions[associatedUsername][i].date == question.date) {
					if (globalquestions[associatedUsername][i].responses) {
						//set the existing responses into the new edited question
						question["responses"] = globalquestions[associatedUsername][i].responses.slice(0);
					}
					//remove the old question entirely since the new object will replace it
					globalquestions[associatedUsername].splice(i, 1);
					break;
				}
			}
		} else {
			//If the question does not already have a timestamp, create one right NOW
			question.date = Date.now();
			console.log('Received new question: ' + question.text + " " + question.image.substring(0, 14));
		}
		//If this is the user's first question, add a property for them in the global variable
		if (!globalquestions[associatedUsername]) {
			globalquestions[associatedUsername] = [];
		}
		//Add this question for the specified user
		globalquestions[associatedUsername].push(question);
		//Commit the global question variable to disk for the given user
		writeIndexFile(associatedUsername);
		//Send to all clients all questions so they can update
		io.emit('questions', globalquestions);
	});
	//Add a listener that handles question-responses
	socket.on('answer', function(question) {
		var associatedUsername = question.associatedUsername;
		//Since we will be mashing this response object into the question object, remove the associatedUsername information
		delete question.associatedUsername;
		//Cycle through all questions to find one for the given user that matches the timestamp given by the response object
		for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
			if (globalquestions[associatedUsername][i].date == question.date) {
				if (!globalquestions[associatedUsername][i].responses) {
					//if the question has no responses associated with it, create an empty array
					globalquestions[associatedUsername][i]["responses"] = [];
				} else {
					//if the question already has some responses, cycle through all of them to see if this student has already answered this question
					for (var j = 0; j < globalquestions[associatedUsername][i].responses.length; j++) {
						if (globalquestions[associatedUsername][i].responses[j].username == question.username) {
							//if the user has already answered this question, remove the old response since we're about to add the new response
							globalquestions[associatedUsername][i].responses.splice(j, 1);
							j--;
						}
					}
				}
				//loop through all of the question's possible options
				for (var j = 0; j < question.options.length; j++) {
					//if the student chose one of the options, then reflect that in the global variable of questions
					if (question.options[j].chosen) {
						var responseObj = {};
						//add the user's username and the text of the option they selected
						responseObj["username"] = question.username;
						responseObj["text"] = question.options[j].text;
						//Optionally, include when the question was answered (NOW) for statistics purposes later
						//Not included by default since only the most recent answer is stored
						//responseObj["date"] = Date.now();
						//Add the response to the question's associated responses in the global variable
						globalquestions[associatedUsername][i].responses.push(responseObj);
					}
				}
				break;
			}
		}
		//update the disk for the given username
		writeIndexFile(associatedUsername);
		//Send to all clients all questions so they can update
		io.emit('questions', globalquestions);
	});
	//Add a listener that will delete a given question for a given user
	socket.on('delete', function(msg) {
		console.log("Attempting to delete: " + msg.date);
		//Call the auxiliary deleteQuestion function
		deleteQuestion(msg.associatedUsername, msg.date);
		//update the disk for the given username
		writeIndexFile(msg.associatedUsername);
		//Send to all clients all questions so they can update
		io.emit('questions', globalquestions);
	});
});

//Actually starts HTTP listening for Clickers on port 4000
//Change 4000 to whichever port is desired (an error will be thrown if the port is already in use by another application)
http.listen(4000, "0.0.0.0", function(){
	console.log('listening on *:4000');
	//Initialize the global variable of questions
	globalquestions = {};
	try {
		//For each JSON file that is in the directory, add those questions into the global questions variable for the username indicated by the JSON file's name
		fs.readdirSync(dir).forEach(function(file, index) {
			//Make sure the file we are attempting to parse isn't actually a directory
			if (!fs.lstatSync(dir + file).isDirectory()) {
				globalquestions[file.split(".", 2)[0]] = JSON.parse(fs.readFileSync(dir + file, 'utf8'));
			}
	});
	} catch (e) {
		try {
			//if there was an error while trying to read the directory where questions are stored, it could be that the directory doesn't exist, so create it and ignore errors during creation
			fs.mkdirSync(dir);
		} catch (e) { }
		console.log(e);
	}
});