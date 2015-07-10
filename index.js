// Once the skill is created you will need to update this to that string
var APP_ID = undefined;

// The AlexSkill prototype and helper functions
var http = require('http'),
	alexaDateUtil = require('./alexaDateUtil'),
	yahooFinance = require('yahoo-finance'),
	util = require('util');
	AlexaSkill = require('./AlexaSkill');


// Options house is a child object of the AlexSkill

var OptionsHouse = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend the skill
OptionsHouse.prototype = Object.create(AlexaSkill.prototype);
OptionsHouse.prototype.constructor = OptionsHouse;

// Initialization logic
OptionsHouse.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("HelloWorld onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

// Handler that is called when the app is launched
OptionsHouse.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

// Cleanup logic
OptionsHouse.prototype.eventHandlers.onSessionEnded = function(sessionEndedRequest,session){
	consol.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

// Begin mapping the  different intent handlling functions
// OptionsHouse.prototype.intentHandlers = {
// 	OneshotTideIntent
// }


OptionsHouse.prototype.intentHandlers = {
	OneshotSymbolIntent: function(intent, session,response){
		handleOneshotStockRequest(intent, session, response);
	},
	// Registers custom intent handlers
	HelloIntent: function(intent,session,response){
		response.tellWithCard("Hello World!", "Greeter", "Hello World!");
	},
	Helpintent: function(intent,session,response){
		response.ask("You can say hello to me!");
	}
};



// ----------- OptionsHouse Domain Specific Business Logic -----------
// An example array for testing purposes
var SYMBOLS = {
    'apple': "AAPL",
    'facebook': "FB"
};

function handleWelcomeRequest(response) {
    var whichStockPrompt = "Which stock would you like information for?";
    var speechOutput = "Welcome to Options House. " + whichStockPrompt;
    var repromptText = "I can lead you through provicing a symbol "
    	+ "and timefram to get analysis on the equity, "
    	+"or you can simply open Options House and ask a question like, "
    	+"get Apple analysis for the last twenty days."
    	+"For a list of all the different things you can do, simply ask what can I do"
    	+ whichStockPrompt;

    response.ask(speechOutput, repromptText);
}


/**
 * This handles the one-shot interaction, where the user utters a phrase like:
 * 'Alexa, open OptionsHouse and get symbol information for Apple for the last 20 days'.
 * If there is an error in a slot, this will guide the user to the dialog approach.
 */
function handleOneshotStockRequest(intent, session, response) {

    // Determine symbol, using default if none provided
    var symbolTicker = getSymbolFromIntent(intent, true);
    if (symbolTicker.error) {
        // invalid symbol. move to the dialog
        var repromptText = "Currently, I know ticker information for these symbols: " + getAllStationsText()
            + "Which symbol would you like  information for?";
        // if we received a value for the incorrect symbol, repeat it to the user, otherwise we received an empty slot
        var speechOutput = symbolTicker.symbol ? "I'm sorry, I don't have any data for " + symbolTicker.symbol + ". " + repromptText : repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // Determine custom date
    var date = getDateFromIntent(intent);
    if (!date) {
        // Invalid date. set city in session and prompt for date
        session.attributes.symbol = symbolTicker;
        var repromptText = "Please try again saying a day of the week, for example, Saturday. "
            + "For which date would you like tide information?";
        var speechOutput = "I'm sorry, I didn't understand that date. " + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // all slots filled, either from the user or by default values. Move to final request
    getFinalStockResponse(symbolTicker, date, response);
}

/**
 * Both the one-shot and dialog based paths lead to this method to issue the request, and
 * respond to the user with the final answer.
 */
function getFinalStockResponse(symbolTicker, date, response) {
	makeStockRequest(symbolTicker, date, function stockResponseCallback(err,stockResponse){
		var speechOutput;

		if (err){
			speechOutput = "Sorry, the service is experieinceing a problem. Please try again later.";
		} else {
			speechOutput = "Success";
		}

		response.tellWithCard(speechOutput, "OptionsHouse", speechOutput)
	});

	//	speechOutput = 'Got all the way to the response: ' + symbolTicker.ticker;



 /*   // Issue the request, and respond to the user
    makeTideRequest(cityStation.station, date, function tideResponseCallback(err, highTideResponse) {
        var speechOutput;

        if (err) {
            speechOutput = "Sorry, the National Oceanic tide service is experiencing a problem. Please try again later";
        } else {
            speechOutput = date.displayDate + " in " + cityStation.city + ", the first high tide will be around "
                + highTideResponse.firstHighTideTime + ", and will peak at about " + highTideResponse.firstHighTideHeight
                + ", followed by a low tide at around " + highTideResponse.lowTideTime
                + " that will be about " + highTideResponse.lowTideHeight
                + ". The second high tide will be around " + highTideResponse.secondHighTideTime
                + ", and will peak at about " + highTideResponse.secondHighTideHeight + ".";
        }

        response.tellWithCard(speechOutput, "TidePooler", speechOutput)
    });*/
}

function makeStockRequest(symbolTicker,date,stockResponseCallback){
	var SYMBOL = 'aapl';
	var FIELDS = ['s', 'n', 'd1', 'l1', 'y', 'r'];

	yahooFinance.snapshot({
  		symbol: SYMBOL,
  		fields: FIELDS
  	}, function (err, snapshot) {
  		if (err) { throw err; }
  		console.log(JSON.stringify(snapshot, null, 2));
	});
}



/**
 * Gets the symbol from the intent, or returns an error
 */
function getSymbolFromIntent(intent, assignDefault) {

    var symbolSlot = intent.slots.Symbol;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!symbolSlot || !symbolSlot.value) {
        if (!assignDefault) {
            return {
                error: true,
            }
        } else {
            // For sample skill, default to Apple.
            return {
                symbol: "apple",
                ticker: SYMBOLS.apple
            }
        }
    } else {
        // lookup the city. Sample skill uses well known mapping of a few known symbols to ticker.
        var symbolName = symbolSlot.value;
        if (SYMBOLS[symbolName]) {
            return {
                symbol: symbolName,
                ticker: SYMBOLS[symbolName]
            }
        } else {
            return {
                error: true,
                ticker: symbolName
            }
        }
    }
}


/**
 * Gets the date from the intent, defaulting to today if none provided,
 * or returns an error
 */
function getDateFromIntent(intent) {

    var dateSlot = intent.slots.Date;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!dateSlot || !dateSlot.value) {
        // default to today
        return {
            displayDate: "Today",
            requestDateParam: "date=today"
        }
    } else {

        var date = new Date(dateSlot.value);

        // format the request date like YYYYMMDD
        var month = (date.getMonth() + 1);
        month = month < 10 ? '0' + month : month;
        var dayOfMonth = date.getDate();
        dayOfMonth = dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth;
        var requestDay = "begin_date=" + date.getFullYear() + month + dayOfMonth
            + "&range=24";

        return {
            displayDate: alexaDateUtil.getFormattedDate(date),
            requestDateParam: requestDay
        }
    }
}

// Creates the handler that responds to the Alex Request
//exports.handler = function(event,context){
	// Creates an instance of the OptionsHouse skill
//	var optionsHouse = new OptionsHouse();
	//optionsHouse.execute(event,context);
//};

// For development/testing purposes
exports.handler = function( event, context ) {
  console.log( "Running index.handler" );
  console.log( "==================================");
  console.log( "event", event );
  console.log( "==================================");
  console.log( "Stopping index.handler" );
  context.done( );
}

