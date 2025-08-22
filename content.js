function sendMessageClearURLS(which) {
  browser.runtime
    .sendMessage({ action: "clearURLS", url: window.location.href, id: which })
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
function generateRandomString(length, prefix_string) {
  if (prefix_string == undefined) prefix_string = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    prefix_string += characters[randomIndex];
  }
  return prefix_string;
}

function timeAgo(epoch) {
  const now = Date.now();
  const time = epoch.toString().length === 10 ? epoch * 1000 : epoch; // convert to ms if in seconds
  const diffMs = now - time;

  if (diffMs < 1000) return "just now";

  const seconds = Math.floor(diffMs / 1000) % 60;
  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let parts = [];
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} min`);
  if (seconds && !days) parts.push(`${seconds} sec`);

  return parts.join(" ") + " ago";
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");
  sendMessageClearURLS(1);
});
document.addEventListener("load", () => {
  console.log("loaded");
  sendMessageClearURLS(2);
});

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "console.log") {
    console.log(JSON.stringify(message.data));
  }
});

function addMime(where, tabId) {
  const style = document.createElement("style");
  style.innerHTML = `
        .${vmicroGetName("mimeClass")} {
            font-size: inherit;
            line-height: inherit;
            color: inherit;
            border: 1px solid black;
            border-radius:5px;
            width:fit-content;
            padding:4px
        }

        .${vmicroGetName("mimeClass")} input {
            width: max-content;
            height: 1.5em;
            line-height: inherit;
            font-size: inherit;
            resize: none;
            overflow: hidden;
            border: 1px solid black;
            outline:none;
            background: white !important;

        }

        .${vmicroGetName("mimeClass")} button {
            margin-left: 2px;
            cursor: pointer;
            background: red !important;
            color: inherit;
            border: 1px solid black;
            border-radius: 4px;
            font-weight: inherit;
            line-height: inherit;
            font-size:inherit;
        }

        .${vmicroGetName("mimeClass")} span {
            color: red;
            margin-left: 10px;
            line-height: inherit;
            font-size:inherit;
            height: 100%;
            display: none;
            border:none;
        }
    `;
  const outerDiv = document.createElement("div");
  outerDiv.classList.add(vmicroGetName("mimeClass"));

  const input = document.createElement("input");
  input.id = "mimeTextArea";
  input.classList.add(vmicroGetName("mimeClass"));
  input.placeholder = "Add MIME type";
  input.setAttribute("id", vmicroGetName("mimeTypeInput"));

  const button = document.createElement("button");
  button.id = "submitMimeButton";
  button.classList.add(vmicroGetName("mimeClass"));
  button.textContent = "Submit MIME";

  const errorSpan = document.createElement("span");
  errorSpan.id = "mimeError";
  errorSpan.classList.add(vmicroGetName("mimeClass"));
  errorSpan.style.display = "none";

  outerDiv.appendChild(input);
  outerDiv.appendChild(button);
  outerDiv.appendChild(errorSpan);

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    handleSubmitButton();
  });
  button.addEventListener("click", handleSubmitButton);

  async function handleSubmitButton() {
    const mimeType = input.value.trim();
    input.value = "";
    if (mimeType.length > 0) {
      const errorElement = (document.getElementById("mimeError").style.display =
        "none");
      browser.runtime
        .sendMessage({ action: "addMime", tabId: tabId, mimeType: mimeType })
        .then(async (re) => {
          if (re["error"] !== undefined) {
            await mimeShowInfo(re["error"], true);
          }
        })
        .then(() => {});
    } else {
      await mimeShowInfo("Invalid MIME type", true);
    }
  }

  async function mimeShowInfo(message, error) {
    const errorElement = document.getElementById("mimeError");
    errorElement.style.color = error ? "red" : "green";
    errorElement.textContent = message;
    errorElement.style.display = "inline";
    return new Promise((r) =>
      setTimeout(function () {
        errorElement.style.display = "none";
        r();
      }, 1000),
    );
  }

  where.appendChild(style);
  where.appendChild(outerDiv);
}

function downloadURL(originalUrl) {
  const url = new URL(originalUrl);
  const paramsToRemove = ["bytestart", "byteend"];

  for (const [key] of url.searchParams) {
    if (paramsToRemove.some((p) => p.toLowerCase() === key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  const a = document.createElement("a");
  a.href = url.toString();
  a.download = a.download = url.pathname.split("/").pop();
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function vmicroGetName(name) {
  return name + "95115101105103104101105108";
}

const modalId = vmicroGetName("modal");
const modalContentId = vmicroGetName("modalContent");
const jsonString = vmicroGetName("jsonString");
const jsonStringDeleteButton = vmicroGetName("jsonStringDeleteButton");
const jsonStringsContainer = vmicroGetName("jsonStringsContainer");
const jsonStringTitleDiv = vmicroGetName("jsonStringTypeTitle");
const mimeTypeTitleText = vmicroGetName("videoMimeTypeTitle");
const jsonStringValuesList = vmicroGetName("jsonStringValueList");
const jsonStringCopyButton = vmicroGetName("jsonStringCopyButton");
const ctc = "copy json to clipboard";

browser.runtime.onMessage.addListener((request) => {
  let messageAction = 0;
  switch (request.action) {
    case "showVideosContent":
      messageAction = 1;
      break;
    case "toggleVideosContentVisibility":
      messageAction = 2;
      break;
    case "updateIfAlreadyShowing":
      if (
        document.getElementById(modalId) &&
        document.getElementById(modalId).style.display == "block"
      )
        messageAction = 3;
      else return;
      break;
    default:
      return; //!important
  }

  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement("div");
    const stl = document.createElement("style");
    stl.textContent = `
            #${modalId}{
                position:fixed;
                top:0px;
                right:0px;
                bottom:0px;
                left:0px;
                z-index:999999999999;
                cursor=default;
                overflow:hidden;
                background-color:rgba(0,0,0,0.8123);
                display:none;
                white-space:nowrap;
                width:100vw
            }
            #${modalContentId}{
                margin:auto;
                background-color:white !important;
                margin-top:20px;
                height:fit-content;
                max-height:80%;
                min-height:50%;
                width:80%;
                padding:5px;
                border-radius:4px;
                border:2px solid #1F20A0;
                overflow-y:scroll;
                color:black;
                line-height: 1.0 !important;
                font-size:16px !important;

            }

            .${jsonString}{
                color:black;
                margin-top:10px;
                border-radius: 4px;
                padding:12px;
                line-break:anywhere;
                white-space:preserve-breaks;
                font-size:inherit;
                line-height:inherit;
            }

            .${jsonString}::selection{
                background-color:red;
              }

            .${jsonString}:hover{
                background-color: #deeede !important;
              }

            .${jsonStringValuesList}{
                display:none;
                overflow:hidden
            }

            .${jsonStringCopyButton}{
                background-color:#2020f0 !important;
                color:white;
                border-radius:5px;
                font-weight:bolder;
                width:100%;
                border:none;
                font-size:30px;
                line-height:inherit;
                margin-right:1.2rem !important;
            }
            
            .${jsonStringDeleteButton}{
                background-color: red !important; 
                height:fit-content;
                color: white; 
                border:none;
                border-radius: 4px; 
                cursor: pointer; 
                margin:0px;
                margin-left:5px;
                width:100%;
                font-size:inherit;
                line-height:inherit;
            }
            
            .${jsonStringsContainer}{
                padding:0px 5px 0px 5px;
                overflow:hidden;
            }
            .${jsonStringTitleDiv}{
                display:flex;
                width:100%;
                align-items:baseline;
            }

            .${mimeTypeTitleText}{
                margin-top:20px;
                font-weight:bolder;
                border-bottom:1px solid #102020;
                font:10px;
                width:100%;
            }

            `;
    modal.setAttribute("id", modalId);
    function ee(k) {
      // console.log(k.target);
      if (k.target == modal) modal.style.display = "none";
    }
    document.body.addEventListener("click", ee);

    modal.appendChild(stl);
    const modalContent = document.createElement("div");
    modalContent.setAttribute("id", modalContentId);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }

  let modalContent = document.getElementById(modalContentId);
  if (modalContent === null) {
    window.alert(
      `Vmicro: cannot get objects? did u delete them? document.getElementById(modalContentId) returns null`,
    );
    return;
  }

  if (modal.style.display === "block" && messageAction == 2) {
    modal.style.display = "none";
    return;
  }

  modal.style.display = "block";
  browser.runtime
    .sendMessage({ action: "getVideoContentObjects", tabId: request.tabId })
    .then((response) => {
      function formatQuality(input) {
        const match = input.match(
          /(\d{2,4}[kK]|\d{3,4}p|\d{1,4}x\d{1,4}|[23468]k|[1248]K|HD|UHD|SD|\d{1,4}px\d{1,4}(p?))/g,
        );
        return match ? match[match.length - 1] : undefined;
      }
      let r = response.data;
      modalContent.innerHTML = "";
      addMime(modalContent, request.tabId);
      Object.keys(r).forEach((key) => {
        const hasItems = r[key].length > 0;
        const resourceContainer = document.createElement("div");
        resourceContainer.classList.add(jsonStringsContainer);
        const titlediv = document.createElement("div");
        titlediv.classList.add(jsonStringTitleDiv);
        resourceContainer.appendChild(titlediv);
        const titleText = document.createElement("div");

        titleText.textContent = key;
        titleText.classList.add(mimeTypeTitleText);

        const keyContent = document.createElement("span");
        const items = r[key].length;
        keyContent.textContent = hasItems
          ? `${items} item${items > 1 ? "s" : ""}`
          : "No items";
        keyContent.textContent = ` (${keyContent.textContent})`;
        keyContent.style.color = hasItems ? "green" : "red";
        titleText.appendChild(keyContent);

        const arrowIndicator = document.createElement("span");
        titleText.appendChild(arrowIndicator);
        titlediv.appendChild(titleText);
        if (hasItems) {
          titleText.style.cursor = "pointer";
          const valuesList = document.createElement("div");
          valuesList.classList.add(jsonStringValuesList);
          arrowIndicator.textContent = "↓";

          const deleteButton = document.createElement("button");
          deleteButton.classList.add(jsonStringDeleteButton);
          deleteButton.textContent = `clear items`;
          deleteButton.onclick = () => {
            browser.runtime
              .sendMessage({
                action: "deleteVideoObjects",
                tabId: request.tabId,
                videoKey: key,
              })
              .catch((e) => console.log(e));
          };
          titlediv.appendChild(deleteButton);

          titleText.onclick = () => {
            const v = valuesList.style.display !== "block";
            valuesList.style.display = v ? "block" : "none";
            arrowIndicator.textContent = v ? "↑" : "↓";
          };
          r[key].forEach((value) => {
            const valueItem = document.createElement("div");
            valueItem.classList.add(jsonString);

            {
              value["time"] = timeAgo(value["time"]);
              const s = formatQuality(value["url"]);
              const l = value["length"];
              if (s != undefined || l != undefined) {
                const getSpan = (text) => {
                  const s = document.createElement("span");
                  s.textContent = text;
                  s.style.padding = "0px";
                  s.style.paddingRight = s.style.paddingLeft = "3px";
                  s.style.margin = "0px";
                  return s;
                };
                const summary = document.createElement("div");
                summary.style.margin = "0px";
                summary.style.marginBottom = "1px";
                summary.style.BorderBottom = "1px solid black";
                summary.style.padding = "0px";
                summary.style.width = "fit-content";
                summary.style.height = "min-content";
                summary.style.margin = "auto";
                summary.style.backgroundColor = "#dede00";

                summary.appendChild(getSpan("Summary:"));

                if (s != undefined) {
                  summary.appendChild(getSpan(s));
                }
                if (l != undefined) {
                  summary.appendChild(getSpan(`Length = ${value["length"]}`));
                }
                valueItem.appendChild(summary);
              }
            }

            const dnc = document.createElement("div");
            dnc.style.display = "flex";
            const j = Array.from(JSON.stringify(value)).reduce((x, y) => x + y);
            valueItem.appendChild(document.createTextNode(j));
            valuesList.appendChild(valueItem);
            const copyButton = document.createElement("button");
            copyButton.classList.add(jsonStringCopyButton);
            copyButton.textContent = ctc;
            copyButton.addEventListener("click", () => {
              navigator.clipboard.writeText(j);
              copyButton.textContent = "copied";
              setTimeout(() => {
                copyButton.textContent = ctc;
              }, 1000);
            });
            dnc.appendChild(copyButton);
            const downloadButton = document.createElement("button");
            downloadButton.classList.add(jsonStringCopyButton);
            downloadButton.textContent = "donwload";
            downloadButton.onclick = () => downloadURL(value["url"]);
            dnc.appendChild(downloadButton);
            valueItem.appendChild(dnc);
          });
          resourceContainer.appendChild(valuesList);
        }
        const removeMimeButton = document.createElement("button");
        removeMimeButton.classList.add(jsonStringDeleteButton);
        removeMimeButton.textContent = `remove this mime`;
        removeMimeButton.onclick = () => {
          browser.runtime
            .sendMessage({
              action: "removeMime",
              tabId: request["tabId"],
              mimeType: key,
            })
            .catch((e) => console.log(e));
        };
        titlediv.appendChild(removeMimeButton);
        modalContent.appendChild(resourceContainer);
      });
    });
});

/*----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  HIDE PAGE
*/

let overlayDiv;
let isOverlayVisible = false;
let loadingText;
let intervalId;
let fileCount = 0;
let totalFiles;

function createOverlay() {
  const overlayDivId = generateRandomString(30);
  overlayDiv = document.createElement("div");
  overlayDiv.setAttribute("id", overlayDivId);

  const cname = generateRandomString(30);
  const v = document.createElement("style");
  v.textContent = `
    #${overlayDivId}{
        position:fixed;
        width:100%;
        height:100%;
        inset:0px;
        background-color:black;
        z-index:99999999999;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        cursor:move;
    }
    .${cname} {
        width: 48px;
        height: 48px;
        border: 5px solid #FFF;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
        }
        @keyframes rotation {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
         `;
  overlayDiv.appendChild(v);

  const loader = document.createElement("div");
  loader.classList.add(cname);
  loadingText = document.createElement("div");
  loadingText.style.color = "white";
  loadingText.style.fontSize = "24px";
  loadingText.style.marginTop = "20px";
  loadingText.textContent =
    "downloading movie (Taken 2007)... 0 / 1000000 (0.000000000%)";

  overlayDiv.appendChild(loader);
  overlayDiv.appendChild(loadingText);
  document.body.appendChild(overlayDiv);

  totalFiles = Math.floor(Math.random() * 50 + 700);
  fileCount = Math.floor(Math.random() * 100);

  startFileCountUpdate();

  enableDragging(overlayDiv);
}

function startFileCountUpdate() {
  const v = () => {
    const percentage = ((fileCount / totalFiles) * 100).toFixed(4);
    loadingText.textContent = `downloading movie (Taken 2007)... ${fileCount.toFixed(6)}MB / ${totalFiles}Mb (${percentage}%)`;
  };
  v();
  intervalId = setInterval(() => {
    fileCount += Math.random() / 1000.0;
    v();
  }, 500);
}

function stopFileCountUpdate() {
  clearInterval(intervalId);
}

function enableDragging(element) {
  let isDragging = false;
  let startX, startY, initialX, initialY;

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = element.getBoundingClientRect().left;
    initialY = element.getBoundingClientRect().top;

    function onMouseMove(e) {
      if (isDragging) {
        const newX = initialX + (e.clientX - startX);
        const newY = initialY + (e.clientY - startY);
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
      }
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  element.ondragstart = function () {
    return false;
  };
}

function toggleOverlay() {
  if (isOverlayVisible) {
    overlayDiv.remove();
    stopFileCountUpdate();
    isOverlayVisible = false;
  } else {
    createOverlay();
    isOverlayVisible = true;
  }
}

browser.runtime.onMessage.addListener((request) => {
  if (request.action === "toggleOverlay") {
    toggleOverlay();
  }
});
