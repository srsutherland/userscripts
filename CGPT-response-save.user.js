// ==UserScript==
// @name         ChatGPT Response Saver
// @namespace    https://srsutherland.github.io/flickr-twin/
// @version      2023.03.15
// @description  Preserve ChatGPT responses
// @author       srsutherland
// @match        https://chat.openai.com/chat*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @run-at       document-idle
// ==/UserScript==

window.responses = {}
// eslint-disable-next-line no-undef
if (unsafeWindow) {
    // eslint-disable-next-line no-undef
    unsafeWindow.responses = window.responses
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
        const twelveWords = this.streamText.match(/(\w+\W+){12}/)
        if (twelveWords) {
            const deferred = this.key
            this.key = twelveWords[0]
            if (deferred.resolve) {
                deferred.resolve(this.key)
            }
        }
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

const queue = []

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
const saveResponseSimple = () => {
    const r = window.responses
    const stream = document.querySelector(".result-streaming")
    if (!stream) return;
    const streamText = stream.innerText || stream.textContent;
    if (streamText.match(/(\w+\W+){12}/)) {
        const key = streamText.match(/(\w+\W+){12}/)[0]
        if (stream.innerHTML.length > (r[key]?.length || 0)) {
            r[key] = stream.innerHTML
        }
    }
}

let interval_id = null
const stopSaving = () => {
    window.clearInterval(interval_id);
    interval_id = null;
}
// eslint-disable-next-line no-unused-vars
const saveAllResponses = () => {
    stopSaving()
    interval_id = window.setInterval(saveResponse, 500)
}
// eslint-disable-next-line no-unused-vars
const saveAllResponsesSimple = () => {
    stopSaving()
    interval_id = window.setInterval(saveResponseSimple, 200)
}

// eslint-disable-next-line no-unused-vars
const displayAll = () => {
    const win = window.open()
    const chatboxes = Object.values(window.responses).map(
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

console.log("loaded extension")
addButtons()

//saveAllResponses()