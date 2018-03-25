// exports.handler = (event, context, callback) => {
//     // TODO implement
//     callback(null, 'Hello from Lambda');
// };

/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
        http://aws.amazon.com/apache2.0/
    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/
/*
    This file has been modified under the terms of the above license October 2017
*/
/**
 * This code is dependant on data retreived from a ThingsSpeak channel
 * It is a Lambda function for handling Alexa Skill requests.
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask ESP8266 for temperature readings"
 *  Alexa: "Indoor temperature is 75.2 degrees and outdoor temperature is 86.2 degrees"
 */
/**
 * App ID for the skill
 */
var APP_ID = undefined; //OPTIONAL: replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";
//var APP_ID = "amzn1.ask.skill.018df58b-9e42-4e0f-927c-fd06ba2edb5b"; //OPTIONAL: replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";
/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
var https = require('https');
//ThingSpeak Data Access
var channel_id = 459148;                        //ThingSpeak Channel ID
var speak_key = '9L8E6B5D23NZ0BQD';            //ThingSpeak Channel Read Key
var press, temper, humid;                       //Sensor Readings
//shashwat.razdan@usc.edu
var adminUserId = "amzn1.ask.account.AF6JZIMKCYJGYDHWUVM6TNPKVGQA4DHCGRYBRU62BCEOZJ2YXZ47FEYAIKQOBZVHHKESTJN2BXPLR6AOCOFH5XA6P4LXDHDWIL2AJXWSPLYB7ZVQ6I4ADLNTNW32KZWYAOPGR4V64UMUBKBQJVHLWEP3AYWS2ISXIHBFMCNDMTOTZQDU6FEC47RVLFXF5PUKCFX3JZLYV6XLE3A"
//shashwatrazdan@outlook.com
//var adminUserId = "amzn1.ask.account.AE4JGNRTJ33JOZZPVFEMLNDECANFPRPMXXA7YT44DWDXO33DCK5LQNAUHQBH63NVABJFSSCZWFJ5VHM3R7NGH34YPQKI7NQYEVRYPMEGK4SCXPEL7OEMUBMQQJXGFGNJR24DRHRSH6XP6LADXLEYL4A6RZE6YNMOKN4IJPPEY3FUQK2KVM3JUGOC5Z5IZM3YZXAWFZNVNXXJHZQ";
var currentUserId;
// Create URL to retrieve latest temperature reading from my ThingsSpeak channel (JSON format)
var url = 'https://api.thingspeak.com/channels/' + channel_id + '/feed/last.json?api_key=' + speak_key;
/**
 * ESP8266 is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Esp8266 = function () {
    AlexaSkill.call(this, APP_ID);
};
// Extend AlexaSkill
Esp8266.prototype = Object.create(AlexaSkill.prototype);
Esp8266.prototype.constructor = Esp8266;
Esp8266.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
    console.log("[Shaz]" + session.user.userId);
    currentUserId = session.user.userId;
    // any initialization logic goes here
};
Esp8266.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleEsp8266Request(response);
};
/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
Esp8266.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};
Esp8266.prototype.intentHandlers = {
    "GetEspInfoIntent": function (intent, session, response) {
        var speechOutput;
        var cardTitle;
        var sensorSlot = intent.slots.Sensor,
            sensorName = "every";
        if (sensorSlot && sensorSlot.value){
            sensorName = sensorSlot.value.toLowerCase();
        }
        
        
        
        switch(sensorName) {
            default:
                speechOutput = "Sorry, I did not understand that.";
                cardTitle = "Incorrect Readings";
                break;
            case "everything":
                speechOutput = "The temperature is " + temper + " degrees fahrenheit" +
                " and the pressure is " + Math.floor(press*0.000986923*100)/100 + " a t m and " +
                "the humidity is " + humid + " percent";
                cardTitle = "Temperature Readings";
                break;
            case "temperature":
                speechOutput = "The temperature is " + temper + " degrees fahrenheit";
                cardTitle = "Temperature Reading";
               break;
            case "pressure":
                speechOutput = "The pressure is " + Math.floor(press*0.000986923*100)/100 + " a t m";
                cardTitle = "Pressure Reading";
                break;
            case "humidity":
                speechOutput = "The humidity is " + humid + " percent";
                cardTitle = "Humidity Reading";
                break;
        }
        if (adminUserId != currentUserId){
            speechOutput = "Sorry, You do not have any hack i o t devices in your account.";
                cardTitle = "Account not verified";
        }
        response.tellWithCard(speechOutput, cardTitle, speechOutput);
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can say ask ESP8266 for indoor temperature, or, you can say exit... What can I help you with?", "What can I help you with?");
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};
/* -------------------------------------------------------------
 * Get all sensors temperatures and return speech to the user.
 * -------------------------------------------------------------
 */
function handleEsp8266Request(response) {
    // Create speech output
    var speechOutput = "Greetings, I did not understand what you want. How may I serve you?";
    var cardTitle = "Initial Request";
    response.tellWithCard(speechOutput, cardTitle, speechOutput);
}
// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    https.get(url, function(res) {
        // Get latest sensor data from home IoT SoC
        res.on('data', function(d) {
            temper = JSON.parse(d).field1;
            temper = temper*1.8 + 32;
            temper = Math.floor(temper*100)/100;
            humid = JSON.parse(d).field2;
            press = JSON.parse(d).field3;
            
            // Create an instance of the SpaceGeek skill.
            var Esp8266_skill = new Esp8266();
            Esp8266_skill.execute(event, context);
        });
        res.on('end', function() {
        });
        res.on('error', function(e) {
            context.fail("Got error: " + e.message);
        });
    });
};