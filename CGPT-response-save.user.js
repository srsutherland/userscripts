// ==UserScript==
// @name         ChatGPT Response Saver
// @namespace    https://srsutherland.github.io/flickr-twin/
// @version      2023.03.18
// @description  Preserve ChatGPT responses
// @author       srsutherland
// @match        https://chat.openai.com/chat*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @run-at       document-idle
// ==/UserScript==

window.responses = {}
const extension = {}
// eslint-disable-next-line no-undef
if (unsafeWindow) {
    // eslint-disable-next-line no-undef
    unsafeWindow.responses = window.responses
    // eslint-disable-next-line no-undef
    unsafeWindow.extension = extension
}

class ChatGPTResponse {
    /**
     * 
     * @param {HTMLDivElement} resultStreaming 
     */
     constructor(resultStreaming) {
        this.div = resultStreaming;
        this.isStreaming = true;
        const div = resultStreaming;
        //get prompt
        let group = div;
        while(group.parentElement && !group.classList.contains("group")) {
            group = group.parentElement
        }
        if (group.classList.contains("group")) {
            const promptGroup = group.previousElementSibling
            this.promptGroup = promptGroup
            const promptDiv = promptGroup.querySelector(".whitespace-pre-wrap")
            this.prompt = promptDiv?.innerHTML
            this.promptText = promptDiv?.innerText
            this.key = unixTimeInBase64() + ": " + this.promptText
        }
        this.updateFromStream();
        //set update interval
        this.iid = window.setInterval(() => this.update(), 100)
    }

    update() {
        if (this.div.classList.contains("result-streaming")) {
            this.updateFromStream()
        } else {
            this.isStreaming=false
            window.clearInterval(this.iid)
        }
    }

    updateFromStream() {
        const stream = this.div;
        this.streamText = stream.innerText || stream.textContent;
        // const twelveWords = this.streamText.match(/(\w+\W+){12}/)
        // if (twelveWords) {
        //     const deferred = this.key
        //     this.key = twelveWords[0]
        //     if (deferred.resolve) {
        //         deferred.resolve(this.key)
        //     }
        // }
        if (stream.innerHTML.length > (this.content?.length || 0)) {
            this.content = stream.innerHTML
        }
    }

    async awaitKey() {
        if (this.key === undefined) {
            this.key = defer()
        }
        return this.key
    }

    delete() {
        delete window.responses[this.key]
    }
}
extension.ChatGPTResponse = ChatGPTResponse

const queue = []
extension.queue = queue

const saveResponse = async () => {
    const stream = document.querySelector(".result-streaming");
    if (!stream) return;
    if (!queue.some(r=> r.div === stream)) {
        const response = new ChatGPTResponse(stream);
        console.log("new response!")
        console.log(response)
        queue.push(response)
        const key = await response.awaitKey()
        window.responses[key] = response
    }
}
extension.saveResponse = saveResponse

let interval_id = null
const stopSaving = () => {
    window.clearInterval(interval_id);
    interval_id = null;
}
const saveAllResponses = () => {
    stopSaving()
    interval_id = window.setInterval(saveResponse, 500)
}

// eslint-disable-next-line no-unused-vars
const displayAll = (responseList) => {
    const win = window.open()
    responseList instanceof Event ?
        responseList = Object.values(window.responses) :
        responseList ??= Object.values(window.responses)
    const chatboxes = responseList.map(
        r => 
            (r.prompt ? `<div class="chatbox prompt">${r.prompt || r}</div>` : "") +
            `<div class="chatbox">${r.content || r}</div>`
    ).join("");
    win.document.body.innerHTML = chatboxes;
    win.document.head.innerHTML = `<style>
        .chatbox {
            border:1px solid grey;
            margin: 1em;
            padding: 1em
        }
        body {
            max-width: 40em;
            margin: auto;
            font-family: arial;
        }
        .ghost {
            font-size: .8em;
            opacity: 0.5;
        }
        .chatbox.prompt {
            border-color: palegoldenrod;
            font-size: .9em;
            opacity: 0.8;
        }
        .save-button {
            position: fixed;
            right: 5px;
            top: 5px;
            padding: 2px;
            margin: 2px;
        }
    </style>`
    for (const p of win.document.querySelectorAll(".chatbox p")) {
        const first_hundo = p.innerText.substr(0, 100);
        if (
            first_hundo.match("Sorry") || 
            first_hundo.match("sorry") || 
            first_hundo.match("I apologize") ||
            first_hundo.match("I cannot") || 
            first_hundo.match("I can't")
        ) {
            p.classList.add("ghost")
        }
    }
    const saveButton = win.document.createElement("button")
    saveButton.textContent = "💾"
    saveButton.classList.add("save-button")
    win.document.body.insertAdjacentElement("beforeend", saveButton)
    saveButton.addEventListener("click", () => {
        win.document.body.removeChild(saveButton)
        const dl = document.createElement('a');
        const content = win.document.head.innerHTML + "\n" + win.document.body.innerHTML
        dl.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(content));
        dl.setAttribute('download', "CGPT.html");
        document.body.appendChild(dl); // required for firefox
        dl.click();
        dl.remove();
        win.document.body.insertAdjacentElement("beforeend", saveButton)
    })
}
extension.displayAll = displayAll

const addButtons = () => {
    const playPause = document.createElement("button")
    playPause.textContent = "⏵"
    playPause.addEventListener("click", () => {
        if (interval_id == null) {
            saveAllResponses()
            playPause.textContent = "⏸"
        } else {
            stopSaving()
            playPause.textContent = "⏵"
        }
    })
    const displayInNew = document.createElement("button")
    displayInNew.textContent = "⧉"
    displayInNew.addEventListener("click", displayAll)
    const addOldResponse = document.createElement("button")
    addOldResponse.textContent = "+"
    const buttons = [playPause, displayInNew, addOldResponse]
    const buttonContain = document.createElement("div")
    buttonContain.classList.add("ext-button-contain")
    for (const b of buttons) {
        b.classList.add("ext-button")
        buttonContain.insertAdjacentElement("beforeend", b)
    }
    document.body.insertAdjacentElement("beforeend", buttonContain)
    document.head.insertAdjacentHTML("beforeend",
        `<style>
            .ext-button-contain {
                position: fixed;
                right: 5px;
                top: 5px;
            }
            .ext-button {
                padding: 2px;
                margin: 2px;
            }
        </style>`
    )
}

//helper functions

function unixTimeInBase64() {
    const unixTime = Math.floor(Date.now() / 1000);
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < 4; i++) {
      result = base64Chars.charAt(unixTime >> (6 * i) & 0x3F) + result;
    }
    
    return result;
}

function defer() {
	var res, rej;

	var promise = new Promise((resolve, reject) => {
		res = resolve;
		rej = reject;
	});

	promise.resolve = res;
	promise.reject = rej;

	return promise;
}

console.log("loaded extension")
addButtons()

//saveAllResponses()