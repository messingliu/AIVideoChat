const fs = require('fs');
const express = require('express');
var bodyParser = require('body-parser')
const http = require('http');
const { Configuration, OpenAIApi } = require("openai");
// require("dotenv").config();
let rawdata = fs.readFileSync('./api.json');
let API = JSON.parse(rawdata);

const configuration = new Configuration({
    apiKey: API.openai_key,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use('/', express.static(__dirname));
// Parse incoming requests with JSON payloads
app.use(bodyParser.json());
// Parse incoming requests with urlencoded payloads
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
server.listen(5000, () => console.log('Server started on port localhost:5000'));


let memory = [];
try {
    memory = JSON.parse(fs.readFileSync('./memory.json'));
    console.log("memory is ", memory);
} catch (err) {
    console.error(err);
}


let prompt;
prompt = "Suppose you are my girlfriend, please chat with me, you may refer to the conversation history, try to lead the conversation and ask question if needed:";
if (API.lang === "zh-CN") {
    prompt = "假设你是我的女朋友，我们正在热恋中，你需要和我交谈，尽可能回答以下问题。交谈者可能会给你一些提示信息，你可以根据这些提示信息得出答案。你还可以尽可能在回答问题后，发起继续讨论，引导提问者";
}
app.post('/chat', async function(req, res) {
    try {
        const question = req.body.question;
        const result = await getChatgptAnswer(question);
        const data = {answer: result};
        res.status(200).json(data);
    } catch (error) {
        console.log('Error in chat ', error.message);
        res.status(400).json({message: "Error"})
    }
});


async function getChatgptAnswer(user_input) {
    const messages = [];
    messages.push({role: "system", content: prompt});
    for (const one_history of memory) {
        messages.push({role: "user", content: one_history.user_input});
        messages.push({role: "assistant", content: one_history.completion_text});
    }

    messages.push({role: "user", content: user_input});

    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
        });
        const completion_text = completion.data.choices[0].message.content;

        const chat_history = {
            user_input: user_input,
            completion_text: completion_text
        };
        memory.push(chat_history);

        fs.writeFile("memory.json", JSON.stringify(memory), 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });
        return completion_text;
    } catch (error) {
        if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
        } else {
            console.log(error.message);
        }
    }
}

