# FlashCardsP2

Simple language study app built as a lightweight browser app.

## Features

- Create flash cards from pasted notes
- Read text from uploaded images and turn it into flash cards
- Organize cards into groups
- Study in flashcard mode or typed-answer mode
- Save everything locally in the browser with `localStorage`

## Run

Because this project is plain HTML, CSS, and JavaScript, you can run it with any simple local server.

Example with Python:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

## Notes

- Image OCR uses `Tesseract.js` from a CDN in the browser.
- OCR works best on clear screenshots or notes with high contrast.
- Generated cards are reviewed before they are saved.
# FlashCardsP2
