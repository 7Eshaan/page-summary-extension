document.getElementById("summarize").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type").value;

  resultDiv.innerHTML =
    '<div class="animate-spin rounded-full h-5 w-5 border-4 border-purple-600 border-t-transparent"></div>';

  // Get the user's API Key

  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.textContent = "No API Key set, Click the gear icon to add one.";
      return;
    }

    // Ask content.js for the page text

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_TEXT" },
        async (response) => {
          if (chrome.runtime.lastError) {
            resultDiv.textContent =
              "Cannot read this page. Make sure you are on a normal website (not a Chrome settings page) and refresh the tab!";
            return;
          }

          if (!response || !response.text) {
            resultDiv.textContent = "Couldn't extract text from this page.";
            return;
          }

          const text = response.text;

          // Send text to Gemini

          try {
            const summary = await getGeminiSummary(
              text,
              summaryType,
              geminiApiKey,
            );

            resultDiv.textContent = summary;
          } catch (err) {
            resultDiv.textContent = `Gemini error: ${err.message}`;
          }
        },
      );
    });
  });
});

async function getGeminiSummary(rawText, type, apiKey) {
  const max = 21000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

  const promptMap = {
    brief: `Summarize in 2-3 sentences:\n\n${text}`,
    detailed: `Give a detailed summary: \n\n${text}`,
    bullets: `Summarize in 7-8 bullet points {start each line with "-> "}:\n\n${text}`,
  };

  const prompt = promptMap[type] || promptMap.brief;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    },
  );

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error?.message || "Request failed");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary.";
}

document.getElementById("copy-btn").addEventListener("click", () => {
  const txt = document.getElementById("result").innerText;
  if (!txt) return;

  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById("copy-btn");
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = old), 2000);
  });
});
