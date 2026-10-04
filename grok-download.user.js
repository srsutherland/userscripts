// ==UserScript==
// @name         Grok Download
// @namespace    http://dragonfang.tech
// @version      2026.09.10
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

const _downloadDataStr = (text, mimeType, filename, ext) => {
    const header = `data:${mimeType};charset=utf-8,`;
    const dataStr = header + encodeURIComponent(text);
    assert(filename !== undefined)
    assert(ext !== undefined)
    if (!ext.at(0) == ".") ext = "." + ext;
    if (!filename.endsWith(ext)) {
        filename += ext;
    }
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

/**
 * Download text as a file.
 * @see modified from https://stackoverflow.com/a/30800715
 * @param {string} text - The text to download
 * @param {string} filename - Optional filename (without extension)
 * @param {boolean} autodate - Append datetime to filename? (default: true)
 */
const downloadTxt = (text, filename, autodate=true) => {
    if (filename === undefined) {
        filename = dateString();
    } else {
        if (autodate) {
            filename += "-" + dateString();
        }
    }
    _downloadDataStr(text, "text/plain", filename, "txt");
};

/**
 * Download text as a file.
 * @see modified from https://stackoverflow.com/a/30800715
 * @param {string} text - The text to download
 * @param {string} filename - Optional filename (without extension)
 * @param {boolean} autodate - Append datetime to filename? (default: true)
 */
const downloadMd = (text, filename, autodate=true) => {
    if (filename === undefined) {
        filename = dateString();
    } else {
        if (autodate) {
            filename += "-" + dateString();
        }
    }
    _downloadDataStr(text, "text/plain", filename, "md");
};

/**
 * Download a JS object as a 2-space indented JSON file.
 * @see modified from https://stackoverflow.com/a/30800715
 * @param {Object} exportObj - The JSON object to download
 * @param {string} filename - Optional filename (without extension)
 * @param {boolean} autodate - Append datetime to filename? (default: true)
 */
const downloadJSON = (exportObj, filename, autodate=true) => {
    if (filename === undefined) {
        filename = "download";
    } else {
        if (filename.endsWith(".json")) {
            filename = filename.slice(0, -5)
        }
    }
    if (autodate) {
        filename += "-" + dateString()
    }
    const jsonStr = JSON.stringify(exportObj, null, 2);
    _downloadDataStr(jsonStr, "text/json", filename, "json");
};

// Add a floating button to trigger raw json and markdown downloads
const addDownloadButtons = () => {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.right = '10px';
    buttonContainer.style.zIndex = '1000';

    const downloadJsonButton = document.createElement('button');
    downloadJsonButton.innerHTML = '&#x2B07;Raw';
    downloadJsonButton.title = "Download Raw JSON";
    downloadJsonButton.onclick = async () => {
        const threadData = await fetchGrokConversationData();
        const title = document.title || "grok-thread";
        if (threadData) {
            downloadJSON(threadData, title);
        } else {
            alert("Failed to fetch Grok thread data.");
        }
    };

    const downloadMdButton = document.createElement('button');
    // Should be {down arrow}Md
    downloadMdButton.innerHTML = '&#x2B07;Md';
    downloadMdButton.title = "Download as Markdown";
    downloadMdButton.onclick = async () => {
        const thread = await getGrokThread();
        const title = document.title || "grok-thread";
        if (thread) {
            const markdown = formatGrokThreadAsMarkdown(thread);
            downloadMd(markdown, title);
        } else {
            alert("Failed to fetch Grok thread data.");
        }
    };

    buttonContainer.appendChild(downloadJsonButton);
    buttonContainer.appendChild(downloadMdButton);
    document.body.appendChild(buttonContainer);
};

// Run the script
(function() {
    addDownloadButtons();
})();