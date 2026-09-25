const { ipcRenderer, contextBridge } = require('electron');

let activeDOMWaitCancel = null;
let activeWaitCancel = null;
let activeInitialObserverCancel = null;
let agentContext = null;

const cancelAgentWaits = () => {
    activeDOMWaitCancel?.();
    activeWaitCancel?.();
    activeInitialObserverCancel?.();
    activeDOMWaitCancel = null;
    activeWaitCancel = null;
    activeInitialObserverCancel = null;
};

window.addEventListener('DOMContentLoaded', () => {

    // Temporarily disabled: AI agent handles page actions.
    // const observer = new MutationObserver((mutations, obs) => {
    // if (tryUnsubscribe() || tryConfirm()) {
    //     obs.disconnect();
    // }
    // });

    // Schedule a snapshot after DOM mutations settle.
    const observer = new MutationObserver((mutations, obs) => {
        const elements = getInteractiveElements();

        if (elements.length > 0) {
            // console.log(
            //     'Interactive elements became available:',
            //     JSON.stringify(elements, null, 2)
            // );

            obs.disconnect();

            sendDOMSnapshot();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    activeInitialObserverCancel = () => observer.disconnect();

    const elements = getInteractiveElements();

    // console.log(
    //     'Interactive elements:',
    //     JSON.stringify(elements, null, 2)
    // );

    if (elements.length > 0) {
        sendDOMSnapshot();
    }

    // console.log(
    //     'BODY HTML:',
    //     document.body?.innerHTML
    // );

    // let initialUnsubscribe = tryUnsubscribe();
    // let initialConfirm = tryConfirm();

    // if (initialConfirm || initialUnsubscribe) {
    //     checkPageStatus();
    // } else {
    //     checkPageStatus(true);
    // }

    // setTimeout(async () => {
    //     executeAgentAction({ action: "type", id: 0, text: "test@yahoo.com" })
    //     await executeAgentAction({
    //         action: 'wait',
    //         ms: 2000
    //     });
    //     executeAgentAction({
    //         action: 'click',
    //         id: 1
    //     });
    // }, 2000);
});

window.addEventListener('error', (e) => {
    console.log('[webviewPreload] Error:', e.message, e.filename, e.lineno);
});

ipcRenderer.on('execute-agent-action', async (event, action) => {
    if (!agentContext || action?.jobId !== agentContext.jobId || action?.navigationId !== agentContext.navigationId) {
        return;
    }
    const actionContext = agentContext;
    console.log(
        'AGENT ACTION RECEIVED:',
        JSON.stringify(action, null, 2)
    );

    const result = await executeAgentAction(action);

    console.log('AGENT ACTION RESULT:', result);
    ipcRenderer.sendToHost('agent-action-result', {
        jobId: actionContext.jobId,
        navigationId: actionContext.navigationId,
        action: Object.fromEntries(Object.entries(action).filter(([key]) => key !== 'jobId' && key !== 'navigationId')),
        success: result === true
    });
});

ipcRenderer.on('set-agent-context', (event, context) => {
    cancelAgentWaits();
    agentContext = context;
    if (document.readyState !== 'loading') {
        sendDOMSnapshot();
    }
});

ipcRenderer.on('cancel-agent-activity', (event, context) => {
    if (agentContext && context?.jobId === agentContext.jobId && context?.navigationId === agentContext.navigationId) {
        cancelAgentWaits();
        agentContext = null;
    }
});

const getInteractiveElements = () => {
    return Array.from(
        document.querySelectorAll(
            'a, button, input, select, textarea, [role="button"], [onclick], .button'
        )
    )
        // .filter(el => {
        //     const style = window.getComputedStyle(el);

        //     return (
        //         style.display !== 'none' &&
        //         style.visibility !== 'hidden' &&
        //         !el.disabled &&
        //         !el.classList.contains('disabled')
        //     );
        // })
        .filter(el => el.offsetParent !== null)
        // .filter(el => {
        //     const style = window.getComputedStyle(el);

        //     return (
        //         style.display !== 'none' &&
        //         style.visibility !== 'hidden' &&
        //         !el.disabled
        //     );
        // })

        .map((el, index) => {
            el.dataset.agentId = index;

            const label = el.closest('label');
            const parentText = el.parentElement?.innerText || '';

            const options = el.tagName.toLowerCase() === 'select'
                ? Array.from(el.options).map(option => ({
                    text: option.textContent.trim(),
                    value: option.value,
                    selected: option.selected
                }))
                : undefined;

            return {
                id: index,
                tag: el.tagName.toLowerCase(),
                idAttribute: el.getAttribute('id'),
                className: el.className,
                text: (
                    el.innerText ||
                    label?.innerText ||
                    parentText ||
                    el.value ||
                    ''
                ).trim(),
                ariaLabel: el.getAttribute('aria-label'),
                href: el.getAttribute('href'),
                type: el.getAttribute('type'),
                placeholder: el.getAttribute('placeholder'),
                name: el.getAttribute('name'),
                value: el.value,
                checked: el.checked,
                disabled: el.disabled,
                options
            };
        });
};

const waitForDOMMutation = (callback) => {
    let settleTimeout;
    let fallbackTimeout;
    let finished = false;

    const finish = () => {
        if (finished) {
            return;
        }

        finished = true;

        clearTimeout(settleTimeout);
        clearTimeout(fallbackTimeout);

        observer.disconnect();

        if (activeDOMWaitCancel === cancel) {
            activeDOMWaitCancel = null;
        }

        callback();
    };

    const cancel = () => {
        if (finished) {
            return;
        }

        finished = true;

        clearTimeout(settleTimeout);
        clearTimeout(fallbackTimeout);

        observer.disconnect();

        if (activeDOMWaitCancel === cancel) {
            activeDOMWaitCancel = null;
        }
    };

    const observer = new MutationObserver(() => {
        clearTimeout(settleTimeout);

        settleTimeout = setTimeout(() => {
            finish();
        }, 500);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });

    fallbackTimeout = setTimeout(() => {
        finish();
    }, 2000);

    activeDOMWaitCancel = cancel;

    return cancel;
};


let lastSnapshotKey = null;

const sendDOMSnapshot = () => {
    if (!agentContext) {
        return;
    }
    const elements = getInteractiveElements();

    // console.log(
    //     'AGENT ELEMENTS:',
    //     JSON.stringify(elements, null, 2)
    // );

    const snapshot = {
        url: window.location.href,
        title: document.title,
        text: document.body?.innerText || '',
        elements
    };

    const snapshotKey = JSON.stringify(snapshot);

    // if (snapshotKey === lastSnapshotKey) {
    //     console.log('Skipping duplicate DOM snapshot.');
    //     return;
    // }

    lastSnapshotKey = snapshotKey;

    ipcRenderer.sendToHost('dom-snapshot', { ...snapshot, ...agentContext });
};

const isPageReadyForAgent = () => {
    if (document.readyState !== 'complete') {
        return false;
    }

    const elements = getInteractiveElements();

    return elements.some(el => {
        if (el.tag === 'a') {
            return Boolean(el.text || el.ariaLabel);
        }

        return true;
    });
};

const executeAgentAction = (action) => {
    if (!action || typeof action.action !== 'string') {
        console.warn('Invalid agent action:', action);
        return false;
    }

    action.action = action.action.toLowerCase();

    if (action.action === 'wait') {
        return new Promise(resolve => {
            let finished = false;

            const finish = () => {
                if (finished) {
                    return;
                }

                finished = true;

                if (activeWaitCancel === cancelWait) {
                    activeWaitCancel = null;
                }

                resolve(true);
            };

            const cancelWait = () => {
                if (finished) {
                    return;
                }

                finished = true;

                clearTimeout(waitTimeout);

                if (activeWaitCancel === cancelWait) {
                    activeWaitCancel = null;
                }

                resolve(false);
            };

            const waitTimeout = setTimeout(() => {
                if (finished) {
                    return;
                }

                sendDOMSnapshot();
                finish();
            }, action.ms || 1000);

            activeWaitCancel = cancelWait;
        });
    }

    if (action.action === 'done') {
        cancelAgentWaits();
        agentContext = null;

        console.log(
            'Agent completed the task.'
        );

        return true;
    }

    const element = document.querySelector(
        `[data-agent-id="${action.id}"]`
    );

    if (!element) {
        console.warn('Agent element not found:', action.id);
        return false;
    }
    if (action.action === 'check') {
        if (element.type !== 'checkbox') {
            console.warn('Agent tried to check a non-checkbox:', action.id);
            return false;
        }

        if (element.checked) {
            console.log('Checkbox already checked:', action.id);
            sendDOMSnapshot();
            return true;
        }

        element.click();

        sendDOMSnapshot();

        return true;
    }

    if (action.action === 'uncheck') {
        if (element.type !== 'checkbox') {
            console.warn('Agent tried to uncheck a non-checkbox:', action.id);
            return false;
        }

        if (element.checked) {
            element.click();
        }

        console.log('UNCHECK AFTER:', {
            id: action.id,
            checked: element.checked
        });

        sendDOMSnapshot();

        return true;
    }

    if (action.action === 'select') {
        if (element.tagName.toLowerCase() !== 'select') {
            console.warn('SELECT action requires a select element.');
            return false;
        }

        element.value = action.value;

        element.dispatchEvent(new Event('change', {
            bubbles: true
        }));

        sendDOMSnapshot();

        return true;
    }

    if (action.action === 'click') {
        waitForDOMMutation(() => {
            sendDOMSnapshot();
        });

        element.click();

        return true;
    }

    if (action.action === 'type') {
        element.focus();
        element.value = action.text || '';

        element.dispatchEvent(
            new Event('input', {
                bubbles: true
            })
        );

        element.dispatchEvent(
            new Event('change', {
                bubbles: true
            })
        );

        console.log('Typed into element:', action.id);

        sendDOMSnapshot();

        return true;
    }

    console.warn('Unknown agent action:', action.action);
    return false;
};

const clog = (...args) => {
    ipcRenderer.sendToHost('console.log', ...args);
}
