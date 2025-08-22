const videoContentTypes = [
    "application/dash+xml",
    "vnd.apple.mpegurl",
    "x-mpegurl",
    "vnd.americandynamics.acc",
    "vnd.rn-realmedia-vbr",
    "mp4",
    "vnd.trolltech.linguist",
    "3gpp",
    "3gpp2",
    "x-flv",
    "quicktime",
    "x-msvideo",
    "x-ms-wmv",
    "webm",
    "ogg",
    "x-f4v",
    "x-matroska",
    "iso.segment",
    "binary/octet-stream",
].map((x) => x.toLowerCase());


const c = "extension@xScruffers.github.com";
let requestData = {};
let vRequestData = {};

const deleteTabURLS = (tabId, clearURLS) => {
    delete requestData[tabId];
    if (clearURLS) {
	Object.entries(vRequestData[tabId]).forEach(([x, _]) => (vRequestData[tabId][x] = []));
	requestData[tabId] = {};
	return;
    }
    delete vRequestData[tabId];
};

function initTabURLS(tabId) {
    {
	vRequestData[tabId] = {};
	videoContentTypes.forEach((x) => {vRequestData[tabId][x] =[]})
	requestData[tabId] = {};			
    }
}
browser.tabs.onRemoved.addListener((tabId) => {
    console.log("tab closed");
    deleteTabURLS(tabId, false);
});

function reduceJSONNameValueHeaders(headers) {
    const v = new Headers();
    headers.forEach((header) => {
	try {
	    v.set(header.name, header.value);
	} catch (e) {
	    console.log(e.message);
	}
    });
    return v;
}

function nameValueheadersToDict(headerData) {
    return headerData.reduce((acc, vv) => {
	acc[`${vv["name"]}`] = `${vv.value}`;
	return acc;
    }, {});
}

function sendMessageToTabConsole(tabId, message) {
    console.log("sending ", message);
    return browser.tabs.sendMessage(tabId, { action: "console.log", data: message }).catch((e) => console.error(e));
}

//save request headers
browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
	const tabId = details.tabId;
	if (tabId < 0) {
	    // console.log(`NO-tab `,details.url)
	    return;
	}
	// console.log('tab ',details.url)
	browser.tabs
	    .get(tabId)
	    .then((tab) => {
		if (!tab.hidden) {
		    const requestId = details.requestId;
		    if (!requestData[tabId]) {
			initTabURLS(tabId);
		    }
		    let data = {
			tabURL:tab.url,
			url: details.url,
			headers: nameValueheadersToDict(details.requestHeaders),
		    };
		    requestData[tabId][requestId] = data;
		}
	    })
	    .catch((err) => {
		console.error("Error getting tab: mostly it was deleted", err);
	    });
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"],
);

class M3UError extends Error {}

function setError(data, error) {
    throw new M3UError((data["error"] = error));
}

async function addXmpegData(data) {
    data["segInfo"] = { streamURL: [], segments: [], info: "ADDING HLS INFO" };
    const v = (content) => {
	if (!content.startsWith("#EXTM3U")) {
	    setError(data, `resource from url '${data["url"]}' does not start with #EXTM3U tag ${content}`);
	}
	if (!content.includes("#EXTINF")) {
	    setError(data, `cannot find media segments in  ${data["url"]} returning`);
	}
	//segments
	let lcontent = content.split("\n");
	for (const l of ["#EXT-X-DISCONTINUITY", "EXT-X-KEY", "EXT-X-I-FRAMES-ONLY", "EXT-X-MEDIA", "EXT-X-I-FRAME-STREAM-INF", "EXT-X-SESSION-KEY"]) {
	    if (content.includes(`${l}:`)) {
		setError(data, `url content includes '${l} which are not not implement yet`);
	    }
	}
	for (let i = 0; i < lcontent.length; ++i) {
	    //may contain a map file
	    if (lcontent[i].startsWith("#EXT-X-MAP")) {
		let l = lcontent[i].match(/URI="(.+?)"/);
		console.error(l, lcontent[i]);
		if (!l || !l[1]) {
		    setError(data, "could not caputure #EXT-X-MAP URI property");
		}
		data["segInfo"]["segments"].push(l[1]);
	    }
	    if (lcontent[i].startsWith("#EXTINF")) {
		if (lcontent.length == i + 1) {
		    setError(data, "eof while reading segment url");
		}
		data["segInfo"]["segments"].push(lcontent[(i += 1)]);
		continue;
	    }
	    //validate video on demand
	    // if (lcontent[i].startsWith("#EXT-X-PLAYLIST-TYPE")) {
	    // 	if (!lcontent[i].endsWith("VOD")) {
	    // 	    setError(data, "WARN: media playlist type is not video on demand (VOD)");
	    // 	}
	    // }
	}

	//stream url
	data["segInfo"]["streamURL"] = data["url"]
	    .split("/")
	    .slice(0, -1)
	    .reduce((x, y) => `${x}/${y}`);
    };

    try {
	await fetch(data["url"], { headers: data["headers"] }).then(async (r) => {
	    const rr = await r.text();
	    try {
		v(rr);
	    } catch (e) {
		setError(data, e.message);
	    }
	});
    } catch (e) {
	setError(data, e.message);
    }
}

async function addXMLData(data) {
    try {
	await fetch(data["url"], { headers: data["headers"] }).then(async (r) => {
	    if (r.headers.get("Content-type").includes("application/dash+xml")) {
		data["xmlData"] = await r.text();
		return;
	    }
	    setError(data, "tried fetching  xml dash info. content type mismatch");
	});
    } catch (e) {
	setError(data, e);
    }
}

// Capture the response headers
browser.webRequest.onHeadersReceived.addListener(
    (details) => {
	// console.log('recv ',details.url)
	const tabId = details.tabId;
	if (tabId < 0) {
	    return;
	}
	browser.tabs
	    .get(tabId)
	    .then(async (tab) => {
		if (tab.hidden) return;
		const storedRequests = requestData[tabId];
		if (storedRequests) {
		    const reqt = storedRequests[details.requestId];
		    if (reqt && reqt.url === details.url) {
			const responseHeaders = reduceJSONNameValueHeaders(details.responseHeaders);
			const getContentLength = (headers) => {
			    const gLen = (headers) => {
				const contentLengthHeader = headers.get("content-length");
				if (contentLengthHeader !== null) {
				    const length = parseInt(contentLengthHeader, 10);
				    return isNaN(length) ? undefined : length;
				}
				const contentRangeHeader = headers.get("content-range");
				if (contentRangeHeader !== null) {
				    const regex = /^bytes \d+-\d+\/(\d+)$/;
				    const match = contentRangeHeader.match(regex);
				    if (match) {
					return parseInt(match[1], 10);
				    }
				}
				return undefined;
			    };
			    fint = (l) => (l === undefined ? undefined : `${l}b -> ${Intl.NumberFormat().format(l / 1024 ** 2)}Mb`);
			    return fint(gLen(headers));
			};
			const contentTypeHeader = responseHeaders.get("content-type");
			if (contentTypeHeader === null) {
			    return;
			}
			let k;
			if ((k = Object.keys(vRequestData[tabId]).find((x) => contentTypeHeader.toLowerCase().includes(x)))) {
			    if (vRequestData[tabId] === undefined) initTabURLS(tabId);

			    //if url exists, we delete it
			    let a = Object.entries(requestData[tabId]).find((x) => x[1]["url"] === details.url);
			    if (a !== undefined) {
				a = a[0]; //request id
				let v = vRequestData[tabId][k].length;
				vRequestData[tabId][k] = vRequestData[tabId][k].filter((x) => x["url"] !== details.url);
				delete requestData[tabId][a];
				msg = { skip: `deleting url since it exists ${details.url}` };
				// console.log(msg);
				sendMessageToTabConsole(tabId, msg);
			    }

			    let data = {
				"time":Date.now(),									
				...reqt,
				// "rh":nameValueheadersToDict(details.responseHeaders),
				length: getContentLength(responseHeaders),
			    };

			    data['type']='raw';
			    //if data contains hls info, fetch it
			    if (["segment", "mpegurl", "apple", "americandynamics.acc", "vnd"].some((x) => k.includes(x))) {
				data['type']='segments'
				addXmpegData(data);
			    }
			    if (k.includes("application/dash+xml")) {
				data['type']='xml'
				addXMLData(data)
			    }
			    vRequestData[tabId][k].push(data);
			    console.log(`Stored Data for Tab ${tabId}: match ${k}`, vRequestData);
			}
			delete requestData[tabId][details.requestId];
		    }
		}
	    })
	    .catch((err) => {
		console.error("Error getting tab:", err);
	    });
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"],
);

browser.webRequest.onErrorOccurred.addListener(
    (details) => {
	const requestId = details.requestId;
	let tabId = Object.entries(requestData)
	    .map((x) => [x[0], Object.entries(x[1]).find(([x]) => x == requestId)])
	    .filter((x) => x[1]);
	if (tabId.length != 0) tabId = tabId[0][0];
	else return;
	delete requestData[tabId][requestId];
    },
    { urls: ["<all_urls>"] },
);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let valueToSend;
    let tabId = message.tabId;
    if (tabId === undefined) {
	tabId = sender.tab.id;
    }
    if (tabId == undefined) {
	valueToSend = { error: "cannot fetch the tabId" };
    }
    // console.log("on message evevent", tabId, message.action);
    if (tabId !== undefined) {
	switch (message.action) {
	case "hasVideoContent": {
            valueToSend = Object.entries(vRequestData[tabId]).some((x) => x[1].length > 0);
            break;
	}
	case "getVideoContentObjects": {
            let v = vRequestData[tabId];
            if (v === undefined) {
		initTabURLS(tabId);
		v = vRequestData[tabId];
            }
            valueToSend = Object.fromEntries(Object.entries(v));
	    for (let key in valueToSend) {
		if (Array.isArray(valueToSend[key])) {
		    valueToSend[key].reverse();
		}
	    }
            sendMessageToTabConsole(tabId, { info: "sending data" });
            if (valueToSend === undefined) {
		valueToSend = { error: "what? tabid given does not exist" };
		break;
            }
            break;
	}
	case "clearURLS": {
            deleteTabURLS(tabId, true);
            valueToSend = { ok: message.action };
            break;
	}
	case "deleteVideoObjects": {
            const videoKey = message["videoKey"];
            vRequestData[tabId][videoKey] = [];
            return browser.tabs.sendMessage(tabId, { action: "showVideosContent" }).catch((e) => console.error(e));
	}
	case "addMime": {
            if (vRequestData[tabId][message["mimeType"]] !== undefined) {
		return sendResponse({ error: "mimetype already exists!" });
            }
            vRequestData[tabId] = {
		[message["mimeType"]]: [],
		...vRequestData[tabId],
            };
            sendResponse({ ok: "mimetype added successfully!" });
            browser.tabs.sendMessage(tabId, { action: "showVideosContent" }).catch((e) => console.error(e));
            return;
	}
	case "removeMime": {
            delete vRequestData[tabId][message["mimeType"]];
            browser.tabs.sendMessage(tabId, { action: "showVideosContent" }).catch((e) => console.error(e));
            return;
	}
	default: {
            valueToSend = { error: `unknown action ${message.action}` };
	}
	}
    }
    // console.log("sending message", valueToSend);
    sendResponse({ data: valueToSend });
});

/*----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  HIDE PAGE
*/

browser.commands.onCommand.addListener((command) => {
    switch (command) {
    case "toggleOverlay":
	return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, { action: "toggleOverlay" });
	});
    case "toggleVideosContentVisibility":
	return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, {
		action: "toggleVideosContentVisibility",
		tabId: tabs[0].id,
            });
	});
    }
});
