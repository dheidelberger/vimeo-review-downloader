let comments = {};

function setIcon(tab, color) {
    chrome.pageAction.setIcon({
        tabId: tab,
        path: {
            48: `../icons/Icon${color}48.png`,
            128: `../icons/Icon${color}128.png`,
        },
    });
}

function showModal() {
    //We're going to get a message from the iframe when the user hides the modal
    //We need an iframe to avoid style conflicts
    //Code adapted from: https://anderspitman.net/3/chrome-extension-content-script-stylesheet-isolation/

    //Content script opens an iframe,
    //   iframe messages background.js when modal is closed,
    //   background.js messages content script to delete the iframe and clean up
    //Yep, it's annoying!
    chrome.runtime.onMessage.addListener(function (request, sender) {
        if (request.type === 'modalClosed') {
            console.log('We got a close modal request from the iframe');
            console.log(request);

            //Send message back to content script
            chrome.tabs.sendMessage(sender.tab.id, {
                type: 'closeModal',
            });
        }
    });
    chrome.tabs.insertCSS(null, { file: '/popup/modal.css' }, function () {
        chrome.tabs.executeScript(
            null,
            { file: '/popup/modal.js' },
            function () {}
        );
    });
}

//Save the comments and set the icon to green
function gotComments(request, sender, sendResponse) {
    chrome.pageAction.show(sender.tab.id);
    comments[sender.tab.id] = {
        comment: request.data,
        title: request.title,
    };
    console.log(comments);
    setIcon(sender.tab.id, 'Green');
}

//As soon as we know the content script is injected,
//set the icon to red to indicate we have not yet received the comments
function loaded(request, sender, sendResponse) {
    chrome.pageAction.show(sender.tab.id);
    comments[sender.tab.id] = null;
    setIcon(sender.tab.id, 'Red');
}

//Listen for messages from the content script, dispatch messages to one of the above
//functions based on the .type property
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request.type);
    console.log(request);

    //Allows us to talk back to the content script if need be
    //Set to false within an if block if we don't want to
    var returnValue = true;

    if (request.type === 'loaded') {
        returnValue = false;
        loaded(request, sender, sendResponse);
    }

    if (request.type === 'gotComments') {
        returnValue = false;
        gotComments(request, sender, sendResponse);
    }

    //The URL of the open page

    //This tells the content script that it should keep the connection open and wait until it gets a response.
    //We need this because the query takes longer than the function takes to execute,
    //So the content script needs to be patient and wait for a response.

    //From the API documentation (https://developer.chrome.com/extensions/runtime#event-onMessage):
    //...return true from the event listener to indicate you wish to send a response asynchronously
    //(this will keep the message channel open to the other end until sendResponse is called).
    return returnValue;
});

chrome.tabs.onActivated.addListener(function (currentTab) {
    console.log('Tab activation changed');
    console.log(currentTab.tabId);
    console.log(comments);
    if (comments.hasOwnProperty(currentTab.tabId)) {
        if (comments[currentTab.tabId]) {
            setIcon(currentTab.tabId, 'Green');
        } else {
            setIcon(currentTab.tabId, 'Red');
        }
    } else {
        console.log('Hide');
        chrome.pageAction.hide(currentTab.tabId);
    }
});

//https://bugs.chromium.org/p/chromium/issues/detail?id=892133
chrome.pageAction.onClicked.addListener(function (tab) {
    console.log('Clicked');
    console.log(comments);
    console.log(tab);
    try {
        if (!comments[tab.id]) {
            showModal();
            return;
        }
        let blob = new Blob([JSON.stringify(comments[tab.id].comment)], {
            type: 'application/vnote',
        });
        var url = URL.createObjectURL(blob);
        console.log(url);
        let filename = comments[tab.id].title + '.vnote';
        chrome.downloads.download(
            { url: url, filename: filename, saveAs: true },
            function () {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                } else {
                    console.info('download ok');
                }
            }
        );
    } catch (err) {
        console.log('In the catch');
        console.log(err);
        showModal();

        return;
    }
});
