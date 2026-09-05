chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) chrome.sidePanel.open({ windowId: tab.windowId });
});
