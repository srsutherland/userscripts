// ==UserScript==
// @name         Grok Download
// @namespace    http://dragonfang.tech
// @version      2026.10.03
// @description  Download content from Grok.com
// @author       dragonfang
// @match        https://grok.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=grok.com
// @grant        none
// ==/UserScript==
'use strict';

// pattern1: https://grok.com/c/<id>
// pattern2: https://grok.com/project/<proj-id>?chat=<id>
// ids are hex strings with hyphens
const getGrokIdFromUrl = () => {
    const url = window.location.href;
    const pattern1 = /\.com\/c\/([0-9a-fA-F-]+)/;
    const pattern2 = /\.com\/project\/[^?]+\?chat=([0-9a-fA-F-]+)/;

    let match = url.match(pattern1);
    if (match) {
        return match[1];
    }

    match = url.match(pattern2);
    if (match) {
        return match[1];
    }

    console.warn("Not a recognized Grok URL:", url);
    return null;
};

// https://grok.com/rest/app-chat/conversations/<id>/responses
const fetchGrokResponses = async (id) => {
    const rest = "https://grok.com/rest";
    const url = `${rest}/app-chat/conversations/${id}/responses`;
    const r = await fetch(url);
    const j = await r.json();
    return j;
};

const fetchGrokConversationData = async () => {
    const id = getGrokIdFromUrl();
    if (!id) return null;

    const j = await fetchGrokResponses(id);
    return j;
};

/* keys of interest in a response object:
    responseId, 
    parentResponseId,
    message,
    sender,
    createdTime,
*/

const extractGrokThread = (responses) => {
    if (!responses) return null;
    // If object with a "responses" key, extract it
    if (responses.responses) {
        responses = responses.responses;
    }
    if (!Array.isArray(responses)) {
        console.warn("Expected an array of responses, got:", responses);
        return null;
    }

    const conversation = [];
    const responseMap = new Map(responses.map(r => [r.responseId, r]));

    // Start with the last response
    let r = responses.at(-1);
    while (r) {
        conversation.unshift(r);
        if (!r.parentResponseId) break;
        r = responseMap.get(r.parentResponseId);
    }

    return conversation;
};

const getGrokThread = async () => {
    const j = await fetchGrokConversationData();
    if (!j) return null;
    const responses = j.responses;

    return extractGrokThread(responses);
};

const wrapInCallout = (text, type, title='', collapsed=null) => {
    let collapser = '';
    if (collapsed !== null) {
        collapser = collapsed ? '-' : '+';
    }
    // escape '<' characters
    text = text.replace(/</g, '&lt;');
    const lines = text.split('\n');
    // prefix with directive
    lines.unshift(`> [!${type}]${collapser} ${title}`);
    return lines.join('\n> ');
};

const formatGrokThreadAsMarkdown = (thread, title) => {
    if (!thread) return '';
    const blocks =  thread.map(r => 
        r.sender == 'human' ? 
            wrapInCallout(r.message, 'USER') : 
            r.message
    )
    // if title is null, grab it from the page title
    if (!title) {
        title = document.title;
    }
    blocks.unshift(`# ${title}`);
    return blocks.join('\n\n');
};

const dateString = () => {
    const now = new Date();
    return now
        .toLocaleString('sv')
        .replace(/ (\d+):(\d+):\d+/, "-$1$2");
};

/**
 * Download data as a file.
 * Usage: Download(text[, filename]).asMd([filename[, autodate]])
 * @param {*} data - Text for asMd/asTxt, any JSON-serializable value for asJSON
 * @param {string} filename - Optional filename (extension optional)
 */
// Proxy lets the class be called without `new`
const Download = new Proxy(class Download {
    constructor(data, filename) {
        this.data = data;
        this.filename = filename;
    }

    /**
     * @param {string} filename - Optional; 
     * @param {boolean} autodate - Append datetime to filename? (default: true)
     */
    asJSON(filename, autodate=true, indent=2) {
        if (filename) this.filename = filename;
        const jsonStr = JSON.stringify(this.data, null, indent);
        this._normalizeFilename("json", autodate);
        Download._save(jsonStr, "application/json", this.filename);
    }

    asMd(filename, autodate=true) {
        if (filename) this.filename = filename;
        this._normalizeFilename("md", autodate);
        Download._save(this.data, "text/markdown", this.filename);
    }

    asTxt(filename, autodate=true) {
        if (filename) this.filename = filename;
        this._normalizeFilename("txt", autodate);
        Download._save(this.data, "text/plain", this.filename);
    }

    static _save(text, mimeType, filenameWithExt) {
        const blobType = mimeType + ";charset=utf-8";
        const blob = new Blob([text], { type: blobType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filenameWithExt;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    _normalizeFilename(ext, autodate=true) {
        if (ext && ext.at(0) !== ".") {
            ext = "." + ext;
        }
        if (!this.filename) {
            this.filename = dateString() + (ext || ".txt");
            return;
        }
        if (autodate) {
            if (ext && this.filename.endsWith(ext)) {
                this.filename = this.filename.slice(0, -ext.length);
            }
            this.filename += "-" + dateString();
        }
        if (ext && !this.filename.endsWith(ext)) {
            this.filename += ext;
        }
    }
}, {
    apply: (target, thisArg, args) => new target(...args),
});

// Add a floating button to trigger raw json and markdown downloads
const addDownloadButtons = () => {
    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: '1000',
    });

    const down_arrow = '&#x2B07;'; 

    const downloadJsonButton = Object.assign(
        document.createElement('button'), {
        innerHTML: down_arrow + 'Raw',
        title: "Download Raw JSON",
        onclick: async () => {
            const threadData = await fetchGrokConversationData();
            const title = document.title || "grok-thread";
            if (threadData) {
                Download(threadData).asJSON(title);
            } else {
                alert("Failed to fetch Grok thread data.");
            }
        },
    });

    const downloadMdButton = Object.assign(
        document.createElement('button'), {
        innerHTML: down_arrow + 'Md',
        title: "Download as Markdown",
        onclick: async () => {
            const thread = await getGrokThread();
            const title = document.title || "grok-thread";
            if (thread) {
                const markdown = formatGrokThreadAsMarkdown(thread);
                Download(markdown).asMd(title);
            } else {
                alert("Failed to fetch Grok thread data.");
            }
        },
    });

    buttonContainer.append(downloadJsonButton, downloadMdButton);
    document.body.appendChild(buttonContainer);
};

// Run the script
(function() {
    addDownloadButtons();
})();