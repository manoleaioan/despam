const { ipcRenderer, contextBridge } = require('electron');


let unsubSuccessKeywords = [];
let triggerUnsubscribeKeywords = [];
let triggerConfirmKeywords = [];

let keywordsReadyResolve;
const keywordsReady = new Promise(resolve => {
    keywordsReadyResolve = resolve;
});

const findElementsContainingKeywords = (keywords, tagNames = ['button', 'a', 'input', 'div', 'span']) => {
    const elements = [];
    tagNames.forEach(tag => {
        document.querySelectorAll(tag).forEach(el => {
            if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT' || el.offsetParent === null) {
                return;
            }

            const text = el.innerText || el.value || el.alt || '';
            if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
                elements.push(el);
            }
        });
    });
    return elements;
};

var email = '';

const tryUnsubscribe = () => {
    if (window.name != '') return;

    const unsubscribeElements = findElementsContainingKeywords(triggerUnsubscribeKeywords);

    if (unsubscribeElements.length > 0) {
        // Check if there is an input field nearby
        const parentElement = unsubscribeElements[0].closest('form') || unsubscribeElements[0].parentElement;
        const inputElement = parentElement && parentElement.querySelector('input[type="email"], input[type="text"]');

        if (inputElement) {
            inputElement.value = email;
            // Trigger input events
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }

        window.name = "ready-to-confirm";
        unsubscribeElements[0].click();
        return true;
    }

    return false;
};


const tryConfirm = () => {
    if (window.name != '') return;

    const confirmElements = findElementsContainingKeywords(triggerConfirmKeywords);
    if (confirmElements.length > 0) {
        window.name = "ready-to-confirm";
        confirmElements[0].click();
        return true;
    }
    return false;
};

const checkPageStatus = (timeout) => {
    const pageText = document.documentElement.innerHTML.toLowerCase();
    const foundKeyword = unsubSuccessKeywords.find(keyword => pageText.includes(keyword));

    if (foundKeyword || timeout) {
        window.name = "";
        ipcRenderer.sendToHost('unsubscribe', { success: foundKeyword, url: window.location.href });
    } else {
        setTimeout(() => {
            console.log('timeout')
            checkPageStatus(true);
        }, 3000);
    }
};

window.addEventListener('DOMContentLoaded', async () => {
    await keywordsReady;

    const observer = new MutationObserver((mutations, obs) => {
        if (tryUnsubscribe() || tryConfirm()) {
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    let initialUnsubscribe = tryUnsubscribe();
    let initialConfirm = tryConfirm();

    if (initialConfirm || initialUnsubscribe) {
        checkPageStatus();
    } else {
        checkPageStatus(true);
    }
});

window.addEventListener('error', (e) => {
    console.log('[webviewPreload] Error:', e.message, e.filename, e.lineno);
});

ipcRenderer.on("set-email", function (event, data) {
    email = data;
});

ipcRenderer.on('set-keywords', (event, keywords) => {
    unsubSuccessKeywords = keywords.unsubSuccessKeywords || [];
    triggerUnsubscribeKeywords = keywords.triggerUnsubscribeKeywords || [];
    triggerConfirmKeywords = keywords.triggerConfirmKeywords || [];

    keywordsReadyResolve();
});


const clog = (...args) => {
    ipcRenderer.sendToHost('console.log', ...args);
}