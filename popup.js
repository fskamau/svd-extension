document.addEventListener("DOMContentLoaded", () => {
  return browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      const tabId = tabs[0].id;
      browser.runtime.sendMessage({ action: "hasVideoContent", tabId: tabId }).then((r) => {
        switch (r.data) {
          case true: {
            return browser.tabs
              .sendMessage(tabId, {
                action: "showVideosContent",
                tabId: tabId,
              })
              .then(() => window.close())
              .catch((e) => (e.textContent += `${e}`));
          }
          case false:
            break;
          default: {
            //error
            setError(r.data);
          }
        }
      });
    })
    .catch((error) => {
      setError(error);
    });
});

function setError(error) {
  const errorDiv = document.getElementById("errorDiv");
  errorDiv.textContent += `${JSON.stringify(error)}`;
  errorDiv.style.display = "block";
}
