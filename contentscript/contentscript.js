//Adapted from:
//https://medium.com/better-programming/chrome-extension-intercepting-and-reading-the-body-of-http-requests-dd9ebdf2348b
//https://stackoverflow.com/questions/45425169/intercept-fetch-api-responses-and-request-in-javascript
function interceptData() {
    var xhrOverrideScript = document.createElement('script');
    xhrOverrideScript.type = 'text/javascript';
    xhrOverrideScript.innerHTML = `
  	(function() {
		const fetch = window.fetch;
		window.fetch = (...args) => (async(args) => {
			var result = await fetch(...args);
				if (result.url.includes('action=get_comments')) {
					var res = result.clone().text().then(result=>{
						var dataDOMElement = document.createElement('div');
						dataDOMElement.id = '__interceptedData';
						dataDOMElement.innerText = result;
						dataDOMElement.style.height = 0;
						dataDOMElement.style.overflow = 'hidden';
						document.body.appendChild(dataDOMElement);
					})
				}         
			return result;
		})(args);
	})();
  `;
    document.head.prepend(xhrOverrideScript);
}
function checkForDOM() {
    if (document.body && document.head) {
        interceptData();
    } else {
        requestIdleCallback(checkForDOM);
    }
}

function getData() {
    var responseContainingEle = document.getElementById('__interceptedData');
    if (responseContainingEle) {
        const comments = JSON.parse(responseContainingEle.innerHTML);
        const title = document.querySelector('meta[property="og:title"]');
        let titleText = document.title;
        if (title) {
            titleText = title.getAttribute('content');
        }

        chrome.runtime.sendMessage({
            title: titleText,
            data: comments,
            type: 'gotComments',
        });
    } else {
        requestIdleCallback(getData);
    }
}

requestIdleCallback(checkForDOM);
chrome.runtime.sendMessage({ type: 'loaded' });
requestIdleCallback(getData);
