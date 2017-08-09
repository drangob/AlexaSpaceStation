// Copyright Daniel Horbury 2017

'use strict';

var request = require('request');
var Speech = require('ssml-builder');
var cheerio = require('cheerio');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
	try {
		console.log("event.session.application.applicationId=" + event.session.application.applicationId);

		//only accept requests from my skill 
		 
	if (event.session.application.applicationId !== "amzn1.ask.skill.4ba44e80-a9d3-4963-bef6-e458938e7ce9") {
		context.fail("Invalid Application ID");
	 }

		if (event.session.new) {
			onSessionStarted({requestId: event.request.requestId}, event.session);
		}

		if (event.request.type === "LaunchRequest") {
			onLaunch(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "IntentRequest") {
			onIntent(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		} else if (event.request.type === "SessionEndedRequest") {
			onSessionEnded(event.request, event.session);
			context.succeed();
		}
	} catch (e) {
		context.fail("Exception: " + e);
	}
};


function onSessionStarted(sessionStartedRequest, session) {
	console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
		+ ", sessionId=" + session.sessionId);
}

function getHelpMsg(){
	var speech = new Speech();
	speech.say("You can ask the International Space Station who's onboard.");
	speech.pause('200ms');
	speech.say("For example");
	speech.pause('200ms');
	speech.say("ask the International Space Station"); 
	speech.say("who`s onboard.");
	
	var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";
	return speechOutput;
}

//Skill launched without any intent
function onLaunch(launchRequest, session, callback) {
	console.log("onLaunch requestId=" + launchRequest.requestId
		+ ", sessionId=" + session.sessionId);
	
	callback(session.attributes,
		buildSpeechletResponseWithoutCard(getHelpMsg(), "Request now", false));
}

//specific intent
function onIntent(intentRequest, session, callback) {
	console.log("onIntent requestId=" + intentRequest.requestId
		+ ", sessionId=" + session.sessionId);

	var intent = intentRequest.intent,
		intentName = intentRequest.intent.name;

	// if the user asks for a quote, happy days, lets get them one
	if (intentName == 'RequestOccupants') {
		handleOccupantsRequest(intent, session, callback);
	} else if (intentName == 'AMAZON.HelpIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard(getHelpMsg(), "Request now", false));
	} else if (intentName == 'AMAZON.CancelIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard("", "", true));
	} else if (intentName == 'AMAZON.StopIntent') {
		callback(session.attributes,
			buildSpeechletResponseWithoutCard("", "", true));
	} else {
		throw "Invalid intent";
	}
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
		+ ", sessionId=" + session.sessionId);

}

//get the joke and send it to the response maker
function handleOccupantsRequest(intent, session, callback) {

	request('http://www.skythisweek.info/iss.htm', function (error, response, html) {
	
	  var $html = cheerio.load(html);
	  
	  var occupantCount = $html('td').length;

	  var names = $html('td');

	  var speech = new Speech();

	  speech.say("The following Astronauts are currently onboard the International space station!");
	  speech.pause("100ms");

	  for (var i = 0; i < occupantCount; i++) {
	  	switch(i){
	  		case 0:
	  			speech.say("First up there`s");
	  			break;
	  		case occupantCount-1:
	  			speech.say("Last but not least there`s ");
	  			break;
	  		default:
	  			speech.say("Next there`s");
	  			break;
	  	}

	  	var astronautStr = names.eq(i).text();
	  	var astronautStrSplit = astronautStr.split(' ');

	  	//say first and last name
	  	speech.say(astronautStrSplit[0] + ' ' + astronautStrSplit[1]);

	  	astronautStrSplit[4] = astronautStrSplit[4].replace('\n', '');

	  	//say their agency make it sound nice if possible
	  	speech.say("of");
	  	switch(astronautStrSplit[4]){
	  		case 'RSA':
	  			speech.say("the Russian Space Agency.");
	  			break;
	  		case 'ESA':
	  			speech.say("the European Space Agency");
	  			break;
	  		default:
	  			speech.say(astronautStrSplit[4]+".");
	  	}

	  	astronautStrSplit[3] = astronautStrSplit[3].replace(")", '');
	  	speech.say("who is " + astronautStrSplit[3] + " years old!");

	  	speech.pause('150ms');
	  }

		  
	  var speechOutput = "<speak>" + speech.ssml(true) + "</speak>";

	  callback(session.attributes,
		buildSpeechletResponseWithoutCard(speechOutput, "", "true"));
	});

	
}

// ------- Helper functions to build responses -------



function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
	return {
		outputSpeech: {
			type: "SSML",
			ssml: output
		},
		reprompt: {
			outputSpeech: {
				type: "PlainText",
				text: repromptText
			}
		},
		shouldEndSession: shouldEndSession
	};
}

function buildResponse(sessionAttributes, speechletResponse) {
	return {
		version: "1.0",
		sessionAttributes: sessionAttributes,
		response: speechletResponse
	};
}