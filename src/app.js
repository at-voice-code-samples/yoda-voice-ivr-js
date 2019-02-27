const express       = require('express');
const xmlBuilder    = require('xmlbuilder');
const redis         = require('redis');
const bodyParser    = require('body-parser');
const {promisify}   = require('util');

let client    = redis.createClient();
client.on("error", (err) => {
    console.error("Redis Error: " + err);
});

// let user = {};
// user.sessionId = "ABABABABA4082048";
// user.phoneNumber = "+254724587654";
// user.file = "http://something.something";

// client.hmset("user", user);

// let user2 = {};
// user2.sessionId = "ABABABABA4082048";
// user2.phoneNumber = "+254724587654";
// user2.file = "http://something.something"


// client.hgetall('user', function(err, object) {
//     console.log(object['file']);
// });

const app = express();
app.use(bodyParser.urlencoded({extended:true}));

const appPort = 3088;

let setUserDetails = (key, obj) => {
    let _key = key.toString();
    let _obj = obj;
    return client.hmset(_key, _obj);
};

// setUserDetails("user2", user2);


/**
 * Intro prompt
 * 
 * The prompt that gives the user options to register or end the call
 * 
 * GetDigits expects:
 * 
 *      digits count -> digit(s) expected
 * 
 *      finish key -> the  symbol on the kepad to end entry
 * 
 *      timeout -> session timeout (seconds)
 * 
 *      callback url -> url to handle user input
 * 
 * <GetDigits numDigits="1" finishOnKey="#" timeout="15" callbackUrl="https://something.something" >
 * 
 *      <Say> Welcome to Voice Memo service. To register press 1. To hangup, press 2 </Say>
 * 
 * </GetDigits>
 * 
 * <Say> Sorry we did not get that </Say>
 * 
 */
const introPrompt = {
                    Response : {
                        GetDigits : {
                            '@numDigits' : '1',
                            '@finishOnKey' : '#',
                            '@timeout' : '15',
                            '@callbackUrl' : 'https://something.something',
                            Say : {
                                '@voice' : 'woman',
                                '#text' : 'Welcome to Voice Memo. Press 1 followed by the pound sign. Press 2 followed by the pound sign to exit.'
                            }
                        },
                        Say : {
                            '@voice' : 'woman',
                            '#text' : 'Sorry we did not get that'
                        }
                    }
                    };

const introPromptXmlResponse = xmlBuilder.create(introPrompt, {encoding : 'utf-8'}).end({pretty:true});

/**
 * Exit Response
 * 
 * <Response>
 * 
 *      <Say voice="woman">Bye bye for now!</Say>
 * 
 * </Response>
 */
const exitPhrase = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'Bye bye for now!'
        }
    }
};

const exitPhraseXml = xmlBuilder.create(exitPhrase, {encoding : 'utf-8'}).end({pretty:true});

/**
 * Record Phrase
 * 
 * <Response>
 *
 *      <GetDigits numDigits="1" finishOnKey="#" timeout="15" callbackUrl="https://something.something">
 * 
 *           <Say voice="woman">Welcome to Voice Memo. Press 1 followed by the pound sign. Press 2 followed by the pound sign to exit.</Say>
 * 
 *      </GetDigits>
 * 
 *      <Say voice="woman">Sorry we did not get that</Say>
 * 
 * </Response>
 */

const recordPhrase = {
    Response : {
        Record : {
            '@finishOnKey' : '#',
            '@maxLength' : '15',
            '@trimSilence' : 'true',
            '@playBeep' : 'true',
            '@callBackUrl' : 'https://something.something',
            Say : {
                '@voice' : 'man',
                '#text' : 'Press the pound sign to end the recording'
            }
        }
    }
};

const recordPhraseXml = xmlBuilder.create(recordPhrase, {encoding : 'utf-8'}).end({pretty:true});

let recordedFileUrl = "";
/**
 * Play Prevoius Recording Response
 * 
 * <Response>
 * 
 *      <Say voice="woman">Playing your last recored file</Say>
 * 
 *      <Play url="https://something.something"/>
 * 
 * </Response>
 * 
 */

let playPreviousRecording = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'Playing your last recored file'
        },
        Play : {
            '@url' : `${recordedFileUrl}`
        }
    }
};

const playPreviousRecordingXml = xmlBuilder.create(playPreviousRecording, {encoding : 'utf-8'}).end({pretty:true});

/**
 * Play Previous Recording
 * 
 * <Response>
 * 
 *      <Say voice="woman">You have no prevous file. Playing random file</Say>
 * 
 *      <Play url="https://something.something"/>  
 * 
 * </Response>
 */
const playPreviousRecordingNotFoundPhrase = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'You have no prevous file. Playing random file'
        },
        Play : {
            '@url' : 'https://s3.eu-west-2.amazonaws.com/at-voice-sample/play.mp3'
        }
    }
};

const playPreviousRecordingNotFoundPhraseXml = xmlBuilder.create(playPreviousRecordingNotFoundPhrase, {encoding : 'utf-8'}).end({pretty:true});


/**
 * Play Random File
 * 
 * <Response>
 *  
 *      <Say voice="woman">Playing your random file of the day</Say>
 * 
 *      <Play url="https://something.something"/>
 * 
 * </Response>
 */
const playRandomFilePhrase = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'Playing your random file of the day'
        },
        Play : {
            '@url' : 'https://s3.eu-west-2.amazonaws.com/at-voice-sample/play.mp3'
        }
    }
};

const playRandomFilePhraseXml = xmlBuilder.create(playRandomFilePhrase, {encoding : 'utf-8'}).end({pretty:true});

/**
 * Action Menus prompt
 * <Response>
 * 
 *      <GetDigits numDigits="1" finishOnKey="#" timeout="15" callbackUrl="https://something.something">
 *  
 *          <Say voice="woman">Press 1 followed by the pound sign to record a message.Press 2 followed by the pound sign to listen to your last recording. Press 3 followed by the pound sign to play a random file. Press 4 followed by the pound sign to exit.</Say>
 *      
 *      </GetDigits>
 *  
 * </Response>
 */
const actionsMenuPhrase = {
    Response : {
        GetDigits : {
            '@numDigits' : '1',
            '@finishOnKey' : '#',
            '@timeout' : '15',
            '@callbackUrl' : 'https://something.something',
            Say : {
                '@voice' : 'woman',
                '#text' : 'Press 1 followed by the pound sign to record a message.Press 2 followed by the pound sign to listen to your last recording. Press 3 followed by the pound sign to play a random file. Press 4 followed by the pound sign to exit.'
            }
        }
    }
};

const actionsMenuPhraseXml = xmlBuilder.create(actionsMenuPhrase, {encoding : 'utf-8'}).end({pretty:true});

let callAction = "";

app.get('/', (req, res) =>{
res.send('It lives!');
});
let level = 0;
let subscriber = {};
subscriber.phoneNumber ="";
subscriber.sessionId = "";
subscriber.level = level.toString();
subscriber.voiceNote = "";
subscriber.lastInput = "";
subscriber.file = "";

app.post('/voice/service', (req, res) =>{
        callAction = introPromptXmlResponse;
        res.send(callAction);
        // level = 1;
        // subscriber.phoneNumber = req.body.callerNumber;
        // subscriber.sessionId = req.body.sessionId;
        // subscriber.level = level.toString();
        // setUserDetails("subscriber", subscriber);
        //console.info(client.hmget("subscriber", "phoneNumber"));
         client.hgetall("subscriber", (err, object) => { 
             console.info(object);
          });
});

app.post('/voice/service/file', (req, res) =>{
    res.status(200).end();
    subscriber.file = req.body.fileUrl;
    recordedFileUrl = req.body.fileUrl;
    setUserDetails("subscriber", subscriber);
});

app.post('/voice/menu', (req, res) =>{
    let val = req.body.dtmfDigits;
    switch (val.toString()) {
        case "1":
        console.info(val);
            client.hgetall("subscriber", (err, object) => { 
                if (object['phoneNumber'] == "") {
                    // Register this guy
                    // Serve menu
                    callAction = actionsMenuPhraseXml;
                    level = 1;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                } else {
                    if (object['level'] == "1") {
                        // User wants to record message
                        callAction = recordPhraseXml;
                        level = 2;
                        subscriber.phoneNumber = req.body.callerNumber;
                        subscriber.sessionId = req.body.sessionId;
                        subscriber.level = level.toString();
                        subscriber.lastInput = req.body.dtmfDigits;
                        setUserDetails("subscriber", subscriber);
                    }
                }
             });


            break;
        case "2" :
        console.info(val);
            client.hgetall("subscriber", (err, object) => { 
                if ( (object['phoneNumber'] != "") && (object['level'] == "1") && (object['file'] != "")) {
                    // User wants to prevousfile
                    callAction = playPreviousRecordingXml;
                    level = 2;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                } else if ((object['phoneNumber'] != "") && (object['level'] == "1") && (object['file'] == "")) {
                    callAction = playPreviousRecordingNotFoundPhraseXml;
                    level = 2;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                }
        });
            break;

        case "3":
        client.hgetall("subscriber", (err, object) => { 
            if ( (object['phoneNumber'] != "") && (object['level'] == "1")) {
                // User wants to play random file
                callAction = playRandomFilePhraseXml;
                level = 2;
                subscriber.phoneNumber = req.body.callerNumber;
                subscriber.sessionId = req.body.sessionId;
                subscriber.level = level.toString();
                subscriber.lastInput = req.body.dtmfDigits;
                setUserDetails("subscriber", subscriber);
            }
     });
            break;
            
        case "4":
            client.hgetall("subscriber", (err, object) => { 
                if ( (object['phoneNumber'] != "") && (object['level'] == "1")) {
                    // User wants to play random file
                    callAction = exitPhraseXml;
                    level = 2;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                }
        });
            break;    
    
        default:
            callAction = exitPhraseXml;
            break;
    }
    res.send(callAction);
});

app.listen(process.env.PORT || appPort, () => {
console.info('We are up!');
});
