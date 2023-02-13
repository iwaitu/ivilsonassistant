import bot from './assets/bot.svg'
import user from './assets/user.svg'
import {  marked } from 'marked';

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')

let loadInterval

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

function typeText(element, text) {
    let index = 0

    let interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index)
            index++
        } else {
            clearInterval(interval)
        }
    }, 20)
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
    return (
        `
        <div class="wrapper ${isAi && 'ai'}">
            <div class="chat">
                <div class="profile">
                    <img 
                      src=${isAi ? bot : user} 
                      alt="${isAi ? 'bot' : 'user'}" 
                    />
                </div>
                <div class="message" id=${uniqueId}><code>${value}</code></div>
            </div>
        </div>
    `
    )
}

const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    // user's chatstripe
    chatContainer.innerHTML += chatStripe(false, data.get('prompt').trim())

    // to clear the textarea input 
    form.reset()

    // bot's chatstripe
    const uniqueId = generateUniqueId()
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId)

    // to focus scroll to the bottom 
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // specific message div 
    const messageDiv = document.getElementById(uniqueId)

    // messageDiv.innerHTML = "..."
    loader(messageDiv)

    const userId = 'iwaitu';

    const response = await fetch('http://localhost:5000', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: data.get('prompt'),userId
        })
    })

    clearInterval(loadInterval)
    messageDiv.innerHTML = " "

    if (response.ok) {
        const data = await response.json();
        const parsedData = data.bot // trims any trailing spaces/'\n' 
        let htmlData = marked(parsedData);
        // var temp = new DOMParser().parseFromString(htmlData, "text/xml");
        // htmlData = temp.firstChild.innerHTML;
        const codeBlocks = htmlData.match(/<pre><code class="[^"]+">[\s\S]+?<\/code><\/pre>/g);
        if (codeBlocks) {
            codeBlocks.forEach(codeBlock => {
                let language = codeBlock.match(/class="([^"]+)"/)[1];
                language = language.replace("language-","");
                const code = codeBlock.replace(/<[^>]+>/g, '');
                const highlightedCode = hljs.highlight(code,{language: language, ignoreIllegals: true}).value;
                htmlData = htmlData.replace(codeBlock, `<div class='markdown-body'><pre><code class="${language}">${highlightedCode}</code></pre></div>`);
            });
        }
        
        messageDiv.innerHTML = htmlData;
        // typeText(messageDiv, parsedData)
        
    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
}

form.addEventListener('submit', handleSubmit)
form.addEventListener('keyup', (e) => {
    if (event.shiftKey && event.keyCode === 13) {
        event.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "\n" + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    }
    if (e.keyCode === 13) {
        handleSubmit(e)
    }
})