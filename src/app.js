const express       = require('express');
const xmlBuilder    = require('xmlbuilder');
const redis         = require('redis');
const bodyParser    = require('body-parser');
const {promisify}   = require('util');

const client    = redis.createClient();
client.on("error", (err) => {
    console.error("Redis Error: " + err);
});


client.set("file1", "https://www.myfile.link.com/file.mp3");
client.set("file2", "https://www.myfile.link.com/file2.mp3");


client.get("file2", function(err, reply) {
    // reply is null when the key is missing
    console.log(reply);
});

const app = express();
app.use(bodyParser.urlencoded({extended:true}));

const appPort = 3088;

let callAction = "";

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

const playPreviousRecording = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'Playing your last recored file'
        },
        Play : {
            '@url' : 'https://something.something'
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
            '@url' : 'https://something.something'
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
            '@url' : 'https://something.something'
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

app.get('/', (req, res) =>{
res.send('It lives!');
});

app.post('/voice/service', (req, res) =>{
    callAction = introPrompt;
    res.send(introPromptXmlResponse);
});

app.post('/voice/menu', (req, res) =>{
    callAction = introPrompt;
    res.send(actionsMenuPhraseXml);
});

app.listen(process.env.PORT || appPort, () => {
console.info('We are up!');
});
