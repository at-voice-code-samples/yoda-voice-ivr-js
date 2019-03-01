const express       = require('express');
const xmlBuilder    = require('xmlbuilder');
const redis         = require('redis');
const bodyParser    = require('body-parser');

let client    = redis.createClient();
client.on("error", (err) => {
    console.error("Redis Error: " + err);
});

const app = express();
app.use(bodyParser.urlencoded({extended:true}));

const appPort = 3088;

let setUserDetails = (key, obj) => {
    let _key = key.toString();
    let _obj = obj;
    return client.hmset(_key, _obj);
};

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
                                '#text' : 'Welcome to Voice Memo. Press 1 followed by the pound sign to register. Press 2 followed by the pound sign to exit.'
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


const recordFileUrl = "https://something.something/voice/service/file"
/**
 * Record Phrase
 * 
 * <Response>
 *
 *      <Record trimSilence="true" playBeep="true" finishOnKey="#" maxLength="15" callbackUrl="https://something.something">
 * 
 *           <Say voice="man">Press the pound sign to end the recording</Say>
 * 
 *      </Record>
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
            '@callBackUrl' : `${recordFileUrl}`,
            Say : {
                '@voice' : 'man',
                '#text' : 'Press the pound sign to end the recording'
            }
        }
    }
};

const recordPhraseXml = xmlBuilder.create(recordPhrase, {encoding : 'utf-8'}).end({pretty:true});


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

const dtmfDigitsCallBackUrl = "https://something.something/voice/menu";
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
            '@callbackUrl' : `${dtmfDigitsCallBackUrl}`,
            Say : {
                '@voice' : 'woman',
                '#text' : 'Press 1 followed by the pound sign to record a message.Press 2 followed by the pound sign to listen to your last recording. Press 3 followed by the pound sign to play a random file. Press 4 followed by the pound sign to exit.'
            }
        }
    }
};

const actionsMenuPhraseXml = xmlBuilder.create(actionsMenuPhrase, {encoding : 'utf-8'}).end({pretty:true});

let callAction = "";

app.get('/', (req, res) => {

res.send('It lives!');

});

let level = 0;
let subscriber = {};
subscriber.phoneNumber ="";
subscriber.sessionId = "";
subscriber.level = level.toString();
subscriber.voiceNote = "";
subscriber.lastInput = "";
subscriber.file = "https://s3.eu-west-2.amazonaws.com/at-voice-sample/play.mp3";

// Have the fields so that redis does not keep throwing erros about null values
//setUserDetails("subscriber", subscriber);

app.post('/voice/service', (req, res) => {
    const  appUrl = "https://this.app.url/voice/menu";
    let sessionId = req.body.sessionId;
    let phoneNumber = req.body.callerNumber;
    level = 1;
    //setUserDetails("subscriber", subscriber);
     client.hgetall("subscriber", (err, object) => { 
         
        if ((object['phoneNumber'] != "") && object['phoneNumber'] == phoneNumber.toString()) {
            let redirectResponse = {
                Response : {
                    Redirect : {
                        '#text' : `${appUrl}`
                    }
                }
            };
            // subscriber.sessionId = req.body.sessionId.toString();
            // subscriber.level = 0;
            // setUserDetails("subscriber", subscriber);
            const redirectResponseXml = xmlBuilder.create(redirectResponse, {encoding : 'utf-8'}).end({pretty:true});
            res.send(redirectResponseXml);
        } else {
            // subscriber.sessionId = req.body.sessionId.toString();
            // subscriber.level = 0;
            // setUserDetails("subscriber", subscriber);
            callAction = introPromptXmlResponse;
            res.send(callAction);
        }
        subscriber.sessionId = sessionId.toString();
        subscriber.phoneNumber = phoneNumber.toString();
        subscriber.level = level.toString();
        console.info(subscriber);
        setUserDetails("subscriber", subscriber);
        //console.info(object);
      });

        client.hgetall("subscriber", (err, object) => { 
        console.info(object);
    });

});

app.post('/voice/service/file', (req, res) =>{
    res.status(200).end();
    recordedFileUrl = req.body.fileUrl;
    let sessionId = req.body.sessionId;
    let phoneNumber = req.body.callerNumber;
    subscriber.phoneNumber = phoneNumber.toString();
    subscriber.sessionId = sessionId.toString();
    subscriber.voiceNote = recordedFileUrl;
    setUserDetails("subscriber", subscriber);

    client.hgetall("subscriber", (err, object) => { 
        console.info(object);
    });

});

app.post('/voice/menu', (req, res) =>{
    let val = req.body.dtmfDigits;
    let phoneNumber = req.body.callerNumber.toString();
    switch (val.toString()) {
        case "1":
            client.hgetall("subscriber", (err, object) => { 
                console.info(object);
                if (object['phoneNumber'] == phoneNumber && object['level'] == '1') {
                    // Register this guy
                    // Serve menu
                    res.send(actionsMenuPhraseXml)  ;
                    level = 2;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                } else {
                    if (object['level'] == "2") {
                        // User wants to record message
                        res.send(recordPhraseXml);
                        level = 3;
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
            client.hgetall("subscriber", (err, object) => { 
                if ( (object['phoneNumber'] == phoneNumber)  && (object['voiceNote'] != "")) {
                    // User wants to prevous file
                    let recordedFileUrl = [object['voiceNote']];
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
                    res.send(playPreviousRecordingXml);
                    level = 2;
                    subscriber.phoneNumber = req.body.callerNumber;
                    subscriber.sessionId = req.body.sessionId;
                    subscriber.level = level.toString();
                    subscriber.lastInput = req.body.dtmfDigits;
                    setUserDetails("subscriber", subscriber);
                } else if ((object['phoneNumber'] == phoneNumber ) && (object['file'] == "")) {
                    res.send(playPreviousRecordingNotFoundPhraseXml);
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
            if (object['phoneNumber'] == phoneNumber) {
                // User wants to play random file
                console.info(object);
                res.send(playRandomFilePhraseXml);
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
                if ( (object['phoneNumber'] == req.body.callerNumber ) && (object['level'] != "0")) {
                    // User wants to play random file
                    res.send(exitPhraseXml);
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
           res.send(exitPhraseXml);
            break;
    }
});

app.listen(process.env.PORT || appPort, () => {
console.info('We are up!');
});
