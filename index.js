var express = require('express');
var app = express();
var busboy = require('connect-busboy');
var path = require('path');
var fs = require('fs-extra');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var ActiveDirectory = require('activedirectory');

var domain = "campus.ltu.edu";
var domainController = "hydrogen.campus.ltu.edu";

var ad = new ActiveDirectory({ url: 'ldap://' + domainController, baseDN: 'dc=campus,dc=ltu,dc=edu' });

var dir = __dirname + '/files/';

var globalquestions;

app.use(busboy());
app.use(express.static(path.join(__dirname, 'public')));

var writeIndexFile = function(associatedUsername) {
	if (globalquestions[associatedUsername] && globalquestions[associatedUsername].length > 0) {
		fs.writeFileSync(dir + associatedUsername + ".json", JSON.stringify(globalquestions[associatedUsername]));
	} else {
		try {
			fs.unlinkSync(dir + associatedUsername + ".json");
		} catch (e) {
			console.log(e);
			console.log("writeIndexFile: error removing index file");
		}
	}
}

var login = function(socket, username, password) {
	if (username && password) {
		ad.authenticate(username + "@" + domain, password, function(err, auth) {
			if (err) {
				console.log("Error: could not authenticate user " + username);
				sendmessage(socket, "login", false);
			}
			if (auth) {
				console.log("Successfully authenticated user " + username);
				sendmessage(socket, "login", true);
			}
			else {
				console.log("Could not authenticate user " + username);
				sendmessage(socket, "login", false);
			}
		});
	} else {
		sendmessage(socket, "login", false);
	}
}

var deleteQuestion = function(associatedUsername, date) {
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		if (globalquestions[associatedUsername][i].date == date) {
			console.log("Deleting question: " + globalquestions[associatedUsername][i].text);
			globalquestions[associatedUsername].splice(i, 1);
			break;
		}
	}
}

var sendmessage = function(socket, type, msg) {
	console.log("Sending " + type + ": " + msg);
	socket.emit(type, msg);
}

var sessionsList = function(associatedUsername, username) {
	var sessions = [];
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		var included = false;
		for (var j = 0; j < sessions.length; j++) {
			if (sessions[j] == globalquestions[associatedUsername][i].session) {
				included = true;
				break;
			}
		}
		if (!included) {
			sessions.push(globalquestions[associatedUsername][i].session);
		}
	}
	return sessions;
}

var filterSession = function(associatedUsername, sessionName) {
	var questionSubset = [];
	for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
		if (globalquestions[associatedUsername][i].session == sessionName) {
			questionSubset.push(globalquestions[associatedUsername][i]);
		}
	}
	return questionSubset;
}

var adminList = function(msg) {
	var result = [];
	for (var admin in globalquestions) {
		result.push(admin);
	}
	return result;
}

io.on('connection', function(socket){
	socket.on('login', function(msg) {
		console.log('Received login request: ' + msg.username + ", " + msg.password);
		login(socket, msg.username, msg.password);
	});
	//socket.on('sessions', function(msg) {
	//	//filter by username which sessions they get
	//	socket.emit('sessions', sessionsList(msg));
	//});
	socket.on('admins', function(msg) {
		socket.emit('admins', adminList(msg));
	});
	socket.on('questions', function(msg) {
		socket.emit('questions', globalquestions);
	});
	socket.on('question', function(msg) {
		var question = JSON.parse(msg);
		var associatedUsername = question.associatedUsername;
		delete question.associatedUsername;
		if (question.date) {
			console.log('Editing old question');
			delete question.responses;
			question["responses"] = [];
			for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
				if (globalquestions[associatedUsername][i].date == question.date) {
					if (globalquestions[associatedUsername][i].responses) {
						question["responses"] = globalquestions[associatedUsername][i].responses.slice(0);
					}
					globalquestions[associatedUsername].splice(i, 1);
					break;
				}
			}
		} else {
			question.date = Date.now();
			console.log('Received new question: ' + question.text + " " + question.image.substring(0, 14));
		}
		if (!globalquestions[associatedUsername]) {
			globalquestions[associatedUsername] = [];
		}
		globalquestions[associatedUsername].push(question);
		writeIndexFile(associatedUsername);
		io.emit('questions', globalquestions);
	});
	socket.on('answer', function(question) {
		var associatedUsername = question.associatedUsername;
		delete question.associatedUsername;
		for (var i = 0; i < globalquestions[associatedUsername].length; i++) {
			if (globalquestions[associatedUsername][i].date == question.date) {
				if (!globalquestions[associatedUsername][i].responses) {
					globalquestions[associatedUsername][i]["responses"] = [];
				} else {
					for (var j = 0; j < globalquestions[associatedUsername][i].responses.length; j++) {
						if (globalquestions[associatedUsername][i].responses[j].username == question.username) {
							globalquestions[associatedUsername][i].responses.splice(j, 1);
							j--;
						}
					}
				}
				for (var j = 0; j < question.options.length; j++) {
					if (question.options[j].chosen) {
						var responseObj = {};
						responseObj["username"] = question.username;
						responseObj["text"] = question.options[j].text;
						//responseObj["date"] = Date.now();
						globalquestions[associatedUsername][i].responses.push(responseObj);
					}
				}
				break;
			}
		}
		writeIndexFile(associatedUsername);
		io.emit('questions', globalquestions);
	});
	socket.on('delete', function(msg) {
		console.log("Attempting to delete: " + msg.date);
		deleteQuestion(msg.associatedUsername, msg.date);
		writeIndexFile(msg.associatedUsername);
		io.emit('questions', globalquestions);
	});
});

http.listen(4000, "0.0.0.0", function(){
	console.log('listening on *:4000');
	globalquestions = {};
	try {
	fs.readdirSync(dir).forEach(function(file, index) {
		if (!fs.lstatSync(dir + file).isDirectory()) {
			globalquestions[file.split(".", 2)[0]] = JSON.parse(fs.readFileSync(dir + file, 'utf8'));
		}
	});
	} catch (e) {
		console.log(e);
	}
});