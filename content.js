function getText() {
  const article = document.querySelector("article");
  if (article) return article.innerText;

  const main = document.querySelector(
    'main, [role="main"], .post-content, .article-body, .entry-content',
  );
  if (main) return main.innerText;

  return document.body.innerText;
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.type === "GET_TEXT") {
    const text = getText();
    sendResponse({ text });
  }
});
