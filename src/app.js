const express       = require('express');
const xmlBuilder    = require('xmlbuilder');
const redis         = require('redis');
const bodyParser    = require('body-parser');

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

const exitPhrase = {
    Response : {
        Say : {
            '@voice' : 'woman',
            '#text' : 'Bye bye for now!'
        }
    }
};

const exitPhraseXml = xmlBuilder.create(exitPhrase, {encoding : 'utf-8'}).end({pretty:true});


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

app.get('/', (req, res) =>{
res.send('It lives!');
});

//console.info(introPrompt);

app.post('/voice/service', (req, res) =>{
    callAction = introPrompt;
    res.send(introPromptXmlResponse);
});

app.listen(process.env.PORT || appPort, () => {
console.info('We are up!');
});
