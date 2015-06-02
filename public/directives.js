//Defines the Angular directives used by Clickers
angular.module('ClickersApp.directives', []).
//Directive for the login form
directive('loginform', function() {
	return {
		scope: false,
		replace: true,
		restrict: 'E',
		template: '' + 
			'<form ng-submit="login()">' + 
				'<table style="background-color: #4558A7; color: white; padding: 30px; padding-left: 100px; padding-right: 100px; border-radius: 10px; border: 1px solid white" cellpadding="20" cellspacing="0" border="0" align="center">' + 
					'<tr>' + 
						'<td colspan="2">' + 
							'<h2>Clickers Login</h2><span ng-if="error" style="color: red"><br>Incorrect login credentials</span>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>Username:</td>' + 
						'<td>' + 
							'<input type="text" ng-change="getAdmins()" ng-model="fields.username">' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>Password:</td>' + 
						'<td>' + 
							'<input type="password" ng-model="fields.password">' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>Questions from user:</td>' + 
						'<td>' + 
							'<select ng-model="fields.associatedUsername" ng-options="admin for admin in admins" ng-init="getAdmins()"><option ng-if="false"></option></select>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td colspan="2">' + 
							'<input type="submit" value="Submit">' + 
						'</td>' + 
					'</tr>' + 
				'</table>' + 
			'</form>',
			//Specifies that this directive will be controlled directly by the main controller scope rather than having an isolated scope
		controller: function ($scope) {
		}
	};
}).
//Drag and drop directive to intercept a user placing a file onto the element this is specified on
directive('dragAndDrop', function($rootScope) {
	return {
		scope: false,
		//can only be an attribute of another element; can't be its own element
		restrict: 'A',
		//bind to the dragenter, dragleave, dragover, and drop events
		//for each, stop the propogation and prevent the default action from occurring since we are handling the events directly
		link: function($scope, elem, attr) {
			elem.bind('dragenter', function(e) {
				e.stopPropagation();
				e.preventDefault();
			});
			elem.bind('dragleave', function(e) {
				e.stopPropagation();
				e.preventDefault();
			});
			elem.bind('dragover', function(e) {
				e.stopPropagation();
				e.preventDefault();
			});
			//when the file is dropped, the event's dataTransfer property is examined to get the image content
			elem.bind('drop', function(e) {
				e.stopPropagation();
				e.preventDefault();
				//only allow dropping if the user is not in student mode
				if (!$scope.student) {
					$scope.parseImg(e.originalEvent.dataTransfer); //no originalEvent if jQuery script is included after angular in the HTML file
				}
			});
		}
	};
}).
//Directive to provide the upload form
directive('uploadForm', function($rootScope) {
	return {
		scope: false,
		restrict: 'A',
		template: '' + 
			'<table ng-style="{backgroundColor : (rootfields.loading && \'#FF9999\') || \'transparent\'}" style="width: 510px; padding: 15px; border-radius: 10px; border: 1px solid white; text-align: left" cellpadding="10" cellspacing="0" border="0" align="center">' + 
				'<tr>' + 
					'<td valign="top">Question:</td>' + 
					'<td width="100%">' + 
						'<textarea required="true" type="text" id="text" ng-model="newQuestion.text" name="text" style="border-radius: 10px; width: 100%; height: 70px"></textarea>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td valign="top">Lock:</td>' + 
					'<td valign="top" width="100%">' + 
						'<div class="checkboxes">' + 
							'<label><input type="checkbox" name="visible" ng-model="newQuestion.visible" style="height: initial"><span> Visible</span></label><div style="clear: both"></div>' + 
						'</div>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td valign="top">Image:</td>' + 
					'<td id="imgpreview">' + 
						'<div ng-if="!(rootfields.droppedFiles.length > 0)"><input style="width: 100%; padding-left: 0px; padding-right: 0px" id="file" onchange="angular.element(this).scope().parseImg(this)" ng-disabled="rootfields.loading" type="file" name="file" ><br /></div>' + 
						'<div ng-show="rootfields.droppedFiles.length"><div style="color: red"><b>Image selected</b> <img style="padding-left: 10px; max-height: 12px" ng-src="x.png" ng-click="rootfields.droppedFiles = []; removeImage()"><br /></div></div>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td valign="top">Options:</td>' + 
					'<td>' + 
						'<ul class="example-animate-container">' + 
							'<li class="animate-repeat" ng-repeat="option in newQuestion.options track by $index" style="position: relative; display: inline-block; width: 100%">' + 
								'{{$index + 1}}) <input style="width: 50%" required="true" type="text" id="text" ng-model="newQuestion.options[$index].text" name="{{$index}}"> ' + 
								'<button style="line-height: 30px; position: relative; top: -1px" ng-if="newQuestion.options.length > 1" type="button" ng-click="newQuestion.options.splice($index, 1)"><span style="vertical-align: middle">Remove</span></button><br />' + 
								'<div class="checkboxes">' + 
									'<label style="padding-left: 20px"><input type="checkbox" name="correct" ng-model="newQuestion.options[$index].correct" style="height: initial"><span> Correct Answer</span></label><div style="clear: both"></div>' + 
								'</div>' + 
							'</li>' + 
						'</ul>' + 
						'<button style="position: relative; left: 20px; clear: both" type="button" ng-click="newQuestion.options.push(JSON.parse(\'{}\'))">Add Another</button>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td colspan="2" align="center" style="padding-top: 20px">' + 
						'<input style="width: 60%; height: 40px" type="submit" ng-disabled="rootfields.loading" value="Submit"></input>' + 
					'</td>' + 
				'</tr>' + 
			'</table>',
		link: function($scope, elem, attr) {
			//When the form is submitted, this function is called
			elem.bind('submit', function(e) {
				//prevent the default submit behavior of refreshing the page
				e.preventDefault();
				//set the session variable on the new question object
				$scope.newQuestion.session = $scope.selectedSession;
				$scope.newQuestion.associatedUsername = $scope.fields.associatedUsername;
				//deep clone the question object so we can modify it before sending to the server
				var duplicate = JSON.parse(JSON.stringify($scope.newQuestion));
				for (var i = 0; i < duplicate.options.length; i++) {
					try {
						//delete whether an option is chosen or not before sending back to the server
						delete duplicate.options[i].chosen;
					} catch (e) {}
				}
				//send the question object to the server via websockets
				$scope.socket.emit('question', JSON.stringify(duplicate));
				//reset the upload form
				$scope.resetUpload();
				//clear the droppedFiles
				$rootScope.rootfields.droppedFiles = [];
				//get rid of the image on the form, if there is one
				$scope.removeImage();
				//get a reference to the file browse... button
				var fileInput = $("#file");
				//trick to blank out the file browser with a new one
				fileInput.replaceWith( fileInput.val('').clone( true ) );
			});
		}
	};
}).
//Directive for the main question list
directive('questionList', function() {
	return {
		scope: false,
		//may only be an element
		restrict: 'E',
		template: '' + 
			'<ul class="example-animate-container">' + 
				'<li ng-if="question.session == selectedSession && (!student || question.visible)" class="animate-repeat" style="border-radius: 10px; background-color: #4558A7; color: white; border: 1px solid white; padding-left: 40px; padding-right: 40px; margin-top: 20px; line-height: normal" ng-repeat="question in object | orderBy: \'date\' track by question.date">' + 
					'<div style="position: relative; top: 15px"><h2>Question {{$index + 1}}<a ng-show="!student" href="" class="button" style="position: relative; left: 20px" ng-click="trash(question.date)"><img src="delete.png" style="max-height: 30px; position: relative; top: 5px"></a><a ng-show="!student" href="" class="button" style="position: relative; left: 30px" ng-click="edit(question, $index)"><img src="edit.png" style="max-height: 30px; position: relative; top: 5px"></a></h2></div><br />' + 
					'<div style="padding-top: 15px" ng-bind="question.text"></div><br />' + 
					'<div style="text-align: center; width: 100%" ng-show="question.image"><div style="text-align: center; border: 1px solid white; border-radius: 10px; background-color: #7383c5; padding: 25px; margin-right: 20px"><img ng-src="{{question.image}}" style="max-width: 100%"></div></div><br />' + 
					'<p style="margin-top: 20px; margin-bottom: 5px"><b>Options:</b></p>' + 
					'<form ng-submit="sendResponse(question)">' + 
						'<ul class="example-animate-container">' + 
							'<li class="animate-repeat" ng-repeat="option in question.options track by $index">' + 
								'<div class="checkboxes noselect">' + 
									'<label style="padding-left: 20px"><input ng-show="student" style="height: initial" type="checkbox" ng-model="question.options[$index].chosen" name="$index">' + 
									' <span ng-click="hideresponses = !hideresponses">{{option.text}}<span ng-if="!student">{{option.correct ? \' (Correct)\' : \' (Incorrect)\'}}</span> ({{(question.responses | filter:option.text:true).length}} <span ng-if="(question.responses | filter:option.text:true).length == 1">response</span><span ng-if="(question.responses | filter:option.text:true).length !== 1">responses</span>)<img ng-show="!student" style="position: relative; top: 5px; left: 5px; max-height: 20px" ng-src="{{hideresponses ? \'expand.png\' : \'collapse.png\'}}"></span></label>' + 
								'</div><div style="clear: both"></div>' + 
								'<div style="padding-left: 60px; line-height: initial" ng-show="!student && !hideresponses" ng-repeat="response in question.responses | filter:option.text:true | orderBy: \'username\' track by $index">{{response.username}}</div>' + 
							'</li>' + 
						'</ul>' + 
						'<p style="margin-top: 20px; margin-bottom: 40px; padding-left: 15px"><input ng-show="student" type="submit" value="Submit"></p>' + 
					'</form>' + 
				'</li>' + 
			'</ul>',
		link: function($scope, elem, attr) {
			//allows the directive to update when the data attribute ($scope.questions) is updated
			$scope.$watch(attr.data, function (value) {
				//if the value is not undefined...
				if (value) {
					//set the internal object to the contents of the value that was updated
					$scope.object = value;
				}
			});
		}
	};
});