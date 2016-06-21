var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

// email: gifmebot@gmail.com
// website: https://gifmebot.herokuapp.com/
// facebook page: https://www.facebook.com/Gifmebot-253471265031991

app.use(bodyParser.json());

app.listen(process.env.PORT || '3000', function () {
  console.log('Bot started on port: ' + this.address().port);
});

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var PAGE_ACCESS_TOKEN = require('./config.json').fb;
var VALIDATION_TOKEN = "funnyGifMessengerBot";
var giphyKey = require('./config.json').giphy;

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.post('/webhook', function (req, res) {
  var data = req.body;
  if (data.object == 'page') {
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });
    res.sendStatus(200);
  } else {
    console.log("Recieved request from unknown source: " + data);
  }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var message = event.message;

  var messageText = message.text;

  if (messageText) {
    createMessage(senderID, messageText)
  }
}

function createMessage(senderID, keyphrase) {
  var giphyLink = "http://api.giphy.com/v1/gifs/random?api_key=" + giphyKey + "&tag=" + keyphrase;
  request(giphyLink, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var imgURL = JSON.parse(body).data.image_url;
      if (imgURL) {
        var message = {
          attachment: {
            type: "image",
            payload: {
              url: imgURL
            }
          }
        };
        sendMessaage(senderID, message);
      } else {
        sendMessaage(senderID, { text: "Couldn't find gif with phrase: " + keyphrase });
      }
    } else {
      sendMessaage(senderID, { text: "Oops, something went wrong" });
    }
  });
}

function sendMessaage(sendTo, messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: sendTo },
      message: messageData,
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      console.log("Successfully sent message with id %s to recipient %s",  messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send("ERROR");
});


module.exports = app;
