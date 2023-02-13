import bot from './assets/bot.svg'
import user from './assets/user.svg'
import {  marked } from 'marked';

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')

let loadInterval

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        element.textContent += '.';

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

    let userId = '';
    const storeItem = localStorage.getItem("oidc.user:https://sts.ivilson.com:assistant");
    if(storeItem) {
        userId = JSON.parse(storeItem).profile.preferred_username
    }
    if(userId == '') {
        userId = 'iwaitu';
    }
    

    const response = await fetch('http://localhost:5000/', {
        method: 'POST',
        // mode: 'no-cors',
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
        const parsedData = data.bot;
        let htmlData = marked(parsedData).replace(/&#39;/g,"'");
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
        // typeText(messageDiv, htmlData)
        
    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
}

const handleTest = async (e) => {
    // console.log(userId);
    // let s = '```javascript\n var a = "123" \n print(a)\n```';
    // console.log(s);
    // let htmlData = marked(s);
    // console.log(htmlData);
    // htmlData = htmlData.replace(/&#39;/g,"'");
    // console.log(htmlData);
    // const codeBlocks = htmlData.match(/<pre><code class="[^"]+">[\s\S]+?<\/code><\/pre>/g);
    // if (codeBlocks) {
    //     codeBlocks.forEach(codeBlock => {
    //         let language = codeBlock.match(/class="([^"]+)"/)[1];
    //         language = language.replace("language-","");
    //         const code = codeBlock.replace(/<[^>]+>/g, '');
    //         const highlightedCode = hljs.highlight(code,{language: language, ignoreIllegals: true}).value;
    //         htmlData = htmlData.replace(codeBlock, `<div class='markdown-body'><pre><code class="${language}">${highlightedCode}</code></pre></div>`);
    //     });
    // }
    // console.log(htmlData);
}

form.addEventListener('submit', handleSubmit)
form.addEventListener('keyup', (e) => {
    if (event.shiftKey && event.keyCode === 13) {
        event.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "\n" + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
        // handleTest(e);
        return;
    }
    
    if (e.keyCode === 13) {
        handleSubmit(e)
    }
})