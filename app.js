const STORAGE_KEY = "flashCardsP2State";

const sampleState = {
  groups: [
    { id: crypto.randomUUID(), name: "Spanish Basics", createdAt: Date.now() - 1000 },
    { id: crypto.randomUUID(), name: "Travel Phrases", createdAt: Date.now() - 500 }
  ],
  cards: [],
  drafts: [],
  studySession: null
};

sampleState.cards = [
  {
    id: crypto.randomUUID(),
    front: "hola",
    back: "hello",
    groupId: sampleState.groups[0].id,
    createdAt: Date.now() - 900,
    sourceType: "notes"
  },
  {
    id: crypto.randomUUID(),
    front: "gracias",
    back: "thank you",
    groupId: sampleState.groups[0].id,
    createdAt: Date.now() - 800,
    sourceType: "notes"
  },
  {
    id: crypto.randomUUID(),
    front: "¿Dónde está el baño?",
    back: "Where is the bathroom?",
    groupId: sampleState.groups[1].id,
    createdAt: Date.now() - 700,
    sourceType: "notes"
  }
];

const state = loadState();

const elements = {
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: [...document.querySelectorAll(".view")],
  totalCardsStat: document.getElementById("total-cards-stat"),
  totalGroupsStat: document.getElementById("total-groups-stat"),
  groupFilter: document.getElementById("group-filter"),
  sortSelect: document.getElementById("sort-select"),
  groupList: document.getElementById("group-list"),
  cardList: document.getElementById("card-list"),
  notesGroupInput: document.getElementById("notes-group-input"),
  notesInput: document.getElementById("notes-input"),
  generateNotesButton: document.getElementById("generate-notes-button"),
  imageGroupInput: document.getElementById("image-group-input"),
  imageInput: document.getElementById("image-input"),
  scanImageButton: document.getElementById("scan-image-button"),
  ocrStatus: document.getElementById("ocr-status"),
  ocrText: document.getElementById("ocr-text"),
  generateImageButton: document.getElementById("generate-image-button"),
  draftEmptyState: document.getElementById("draft-empty-state"),
  draftList: document.getElementById("draft-list"),
  clearDraftsButton: document.getElementById("clear-drafts-button"),
  saveDraftsButton: document.getElementById("save-drafts-button"),
  createGroupButton: document.getElementById("create-group-button"),
  groupDialog: document.getElementById("group-dialog"),
  groupNameInput: document.getElementById("group-name-input"),
  saveGroupButton: document.getElementById("save-group-button"),
  studyGroupSelect: document.getElementById("study-group-select"),
  studyModeSelect: document.getElementById("study-mode-select"),
  startStudyButton: document.getElementById("start-study-button"),
  studyEmptyState: document.getElementById("study-empty-state"),
  studySession: document.getElementById("study-session"),
  studyProgress: document.getElementById("study-progress"),
  studyGroupLabel: document.getElementById("study-group-label"),
  studyFront: document.getElementById("study-front"),
  studyBack: document.getElementById("study-back"),
  flashAnswer: document.getElementById("flash-answer"),
  typedAnswerPanel: document.getElementById("typed-answer-panel"),
  typedAnswerInput: document.getElementById("typed-answer-input"),
  typedAnswerResult: document.getElementById("typed-answer-result"),
  revealButton: document.getElementById("reveal-button"),
  checkAnswerButton: document.getElementById("check-answer-button"),
  nextCardButton: document.getElementById("next-card-button")
};

bindEvents();
render();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));
    return structuredClone(sampleState);
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.warn("Resetting invalid saved state", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleState));
    return structuredClone(sampleState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

  elements.sortSelect.addEventListener("change", renderLibrary);
  elements.groupFilter.addEventListener("change", renderLibrary);

  elements.generateNotesButton.addEventListener("click", () => {
    const rawNotes = elements.notesInput.value.trim();
    const groupName = elements.notesGroupInput.value.trim() || "Unsorted";

    if (!rawNotes) {
      showTemporaryStatus(elements.ocrStatus, "Paste some notes first.");
      setActiveView("import");
      return;
    }

    const cards = parseNotesToCards(rawNotes, groupName, "notes");
    replaceDrafts(cards);
    setActiveView("import");
  });

  elements.scanImageButton.addEventListener("click", scanImageToText);

  elements.generateImageButton.addEventListener("click", () => {
    const rawText = elements.ocrText.value.trim();
    const groupName = elements.imageGroupInput.value.trim() || "Image Imports";

    if (!rawText) {
      showTemporaryStatus(elements.ocrStatus, "Read an image or paste extracted text first.");
      return;
    }

    const cards = parseNotesToCards(rawText, groupName, "image");
    replaceDrafts(cards);
  });

  elements.clearDraftsButton.addEventListener("click", () => {
    state.drafts = [];
    persistAndRender();
  });

  elements.saveDraftsButton.addEventListener("click", saveDraftsToLibrary);

  elements.createGroupButton.addEventListener("click", () => {
    elements.groupDialog.showModal();
    elements.groupNameInput.value = "";
    elements.groupNameInput.focus();
  });

  elements.saveGroupButton.addEventListener("click", (event) => {
    event.preventDefault();
    const name = elements.groupNameInput.value.trim();

    if (!name) {
      elements.groupNameInput.focus();
      return;
    }

    ensureGroup(name);
    elements.groupDialog.close();
    render();
  });

  elements.startStudyButton.addEventListener("click", startStudySession);
  elements.revealButton.addEventListener("click", revealAnswer);
  elements.checkAnswerButton.addEventListener("click", checkTypedAnswer);
  elements.nextCardButton.addEventListener("click", nextStudyCard);
}

function setActiveView(viewName) {
  elements.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  elements.views.forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
}

function render() {
  elements.totalCardsStat.textContent = String(state.cards.length);
  elements.totalGroupsStat.textContent = String(state.groups.length);

  renderGroupSelects();
  renderLibrary();
  renderDrafts();
  renderStudy();
}

function renderGroupSelects() {
  const currentFilter = elements.groupFilter.value || "all";
  const currentStudyGroup =
    elements.studyGroupSelect.value || state.studySession?.groupId || state.groups[0]?.id || "";

  const options = [`<option value="all">All groups</option>`]
    .concat(
      state.groups
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)
    )
    .join("");

  elements.groupFilter.innerHTML = options;
  elements.groupFilter.value = state.groups.some((group) => group.id === currentFilter)
    ? currentFilter
    : "all";

  const studyOptions = state.groups.length
    ? state.groups
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`)
        .join("")
    : `<option value="">No groups yet</option>`;

  elements.studyGroupSelect.innerHTML = studyOptions;
  elements.studyGroupSelect.value = state.groups.some((group) => group.id === currentStudyGroup)
    ? currentStudyGroup
    : state.groups[0]?.id || "";
}

function renderLibrary() {
  const filterValue = elements.groupFilter.value || "all";
  const sortValue = elements.sortSelect.value || "newest";

  const groupsWithCounts = state.groups
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => ({
      ...group,
      count: state.cards.filter((card) => card.groupId === group.id).length
    }));

  if (!groupsWithCounts.length) {
    elements.groupList.innerHTML = `<div class="empty-state">Create your first group or import some cards.</div>`;
  } else {
    elements.groupList.innerHTML = groupsWithCounts
      .map(
        (group) => `
          <article class="group-card">
            <h3>${escapeHtml(group.name)}</h3>
            <p class="group-meta">${group.count} card${group.count === 1 ? "" : "s"}</p>
          </article>
        `
      )
      .join("");
  }

  const visibleCards = state.cards
    .filter((card) => filterValue === "all" || card.groupId === filterValue)
    .sort((a, b) => sortCards(a, b, sortValue));

  if (!visibleCards.length) {
    elements.cardList.innerHTML = `<div class="empty-state">No cards match this filter yet.</div>`;
    return;
  }

  elements.cardList.innerHTML = visibleCards
    .map((card) => {
      const group = state.groups.find((item) => item.id === card.groupId);

      return `
        <article class="library-card">
          <div class="chip-row">
            <span class="chip">${escapeHtml(group?.name || "Unknown group")}</span>
            <span class="chip">${escapeHtml(card.sourceType)}</span>
          </div>
          <div class="library-grid">
            <div>
              <p class="eyebrow">Front</p>
              <h3>${escapeHtml(card.front)}</h3>
            </div>
            <div>
              <p class="eyebrow">Back</p>
              <h3>${escapeHtml(card.back)}</h3>
            </div>
            <div>
              <p class="eyebrow">Created</p>
              <p class="library-meta">${new Date(card.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDrafts() {
  elements.draftEmptyState.style.display = state.drafts.length ? "none" : "block";
  elements.saveDraftsButton.disabled = state.drafts.length === 0;
  elements.clearDraftsButton.disabled = state.drafts.length === 0;

  if (!state.drafts.length) {
    elements.draftList.innerHTML = "";
    return;
  }

  elements.draftList.innerHTML = state.drafts
    .map(
      (draft, index) => `
        <article class="draft-item" data-draft-index="${index}">
          <div class="draft-grid">
            <label>
              <span>Front</span>
              <input data-field="front" value="${escapeHtmlAttribute(draft.front)}" />
            </label>
            <label>
              <span>Back</span>
              <input data-field="back" value="${escapeHtmlAttribute(draft.back)}" />
            </label>
            <label>
              <span>Group</span>
              <input data-field="groupName" value="${escapeHtmlAttribute(draft.groupName)}" />
            </label>
          </div>
          <button class="secondary-button" data-remove-draft="${index}">Remove</button>
        </article>
      `
    )
    .join("");

  [...elements.draftList.querySelectorAll("input[data-field]")].forEach((input) => {
    input.addEventListener("input", (event) => {
      const parent = event.target.closest("[data-draft-index]");
      const index = Number(parent.dataset.draftIndex);
      state.drafts[index][event.target.dataset.field] = event.target.value;
      saveState();
    });
  });

  [...elements.draftList.querySelectorAll("[data-remove-draft]")].forEach((button) => {
    button.addEventListener("click", () => {
      state.drafts.splice(Number(button.dataset.removeDraft), 1);
      persistAndRender();
    });
  });
}

function startStudySession() {
  const groupId = elements.studyGroupSelect.value;
  const mode = elements.studyModeSelect.value;
  const cards = state.cards.filter((card) => card.groupId === groupId);

  if (!groupId || !cards.length) {
    elements.studyEmptyState.textContent = "This group has no cards yet. Import some first.";
    renderStudy();
    return;
  }

  state.studySession = {
    groupId,
    mode,
    cards: shuffle(cards),
    currentIndex: 0,
    revealed: false,
    checked: false
  };

  persistAndRender();
}

function renderStudy() {
  if (!state.studySession || !state.studySession.cards.length) {
    elements.studyEmptyState.style.display = "block";
    elements.studySession.classList.add("is-hidden");
    return;
  }

  const currentCard = state.studySession.cards[state.studySession.currentIndex];
  const group = state.groups.find((item) => item.id === state.studySession.groupId);

  elements.studyEmptyState.style.display = "none";
  elements.studySession.classList.remove("is-hidden");
  elements.studyProgress.textContent = `Card ${state.studySession.currentIndex + 1} of ${state.studySession.cards.length}`;
  elements.studyGroupLabel.textContent = group?.name || "";
  elements.studyFront.textContent = currentCard.front;
  elements.studyBack.textContent = currentCard.back;
  elements.flashAnswer.classList.toggle("is-hidden", !state.studySession.revealed);

  const isTypedMode = state.studySession.mode === "typed";
  elements.typedAnswerPanel.classList.toggle("is-hidden", !isTypedMode);
  elements.revealButton.textContent = isTypedMode ? "Show answer" : "Reveal answer";

  if (!state.studySession.checked) {
    elements.typedAnswerInput.value = "";
    elements.typedAnswerResult.textContent = "Type your answer, then check it.";
  }
}

function revealAnswer() {
  if (!state.studySession) {
    return;
  }

  state.studySession.revealed = true;
  saveState();
  renderStudy();
}

function checkTypedAnswer() {
  if (!state.studySession) {
    return;
  }

  const currentCard = state.studySession.cards[state.studySession.currentIndex];
  const userAnswer = normalize(elements.typedAnswerInput.value);
  const expected = normalize(currentCard.back);

  if (!userAnswer) {
    elements.typedAnswerResult.textContent = "Type something before checking.";
    return;
  }

  state.studySession.checked = true;
  state.studySession.revealed = true;
  const isMatch =
    userAnswer === expected || expected.includes(userAnswer) || userAnswer.includes(expected);

  saveState();
  renderStudy();
  elements.typedAnswerResult.textContent = isMatch
    ? "Nice. That matches closely enough."
    : `Keep going. Expected answer: ${currentCard.back}`;
}

function nextStudyCard() {
  if (!state.studySession) {
    return;
  }

  const nextIndex = state.studySession.currentIndex + 1;

  if (nextIndex >= state.studySession.cards.length) {
    const mode = state.studySession.mode;
    const groupId = state.studySession.groupId;
    const cards = shuffle(state.cards.filter((card) => card.groupId === groupId));
    state.studySession = {
      groupId,
      mode,
      cards,
      currentIndex: 0,
      revealed: false,
      checked: false
    };
  } else {
    state.studySession.currentIndex = nextIndex;
    state.studySession.revealed = false;
    state.studySession.checked = false;
  }

  persistAndRender();
}

async function scanImageToText() {
  const file = elements.imageInput.files?.[0];

  if (!file) {
    elements.ocrStatus.textContent = "Choose an image first.";
    return;
  }

  if (!window.Tesseract) {
    elements.ocrStatus.textContent = "OCR library could not load. You can still paste text manually.";
    return;
  }

  elements.ocrStatus.textContent = "Reading image...";
  elements.scanImageButton.disabled = true;

  try {
    const result = await window.Tesseract.recognize(file, "eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          elements.ocrStatus.textContent = `Reading image... ${Math.round(message.progress * 100)}%`;
        }
      }
    });

    elements.ocrText.value = result.data.text.trim();
    elements.ocrStatus.textContent = elements.ocrText.value
      ? "Image read successfully. Review the extracted text, then generate cards."
      : "No text was detected. Try a clearer image or paste the text manually.";
  } catch (error) {
    console.error(error);
    elements.ocrStatus.textContent =
      "Image reading failed. Try another image, or paste the text manually into the box below.";
  } finally {
    elements.scanImageButton.disabled = false;
  }
}

function replaceDrafts(cards) {
  if (!cards.length) {
    elements.ocrStatus.textContent = "No card pairs were found. Try one term-definition pair per line.";
    return;
  }

  state.drafts = cards;
  persistAndRender();
}

function saveDraftsToLibrary() {
  const cleanedDrafts = state.drafts
    .map((draft) => ({
      front: draft.front.trim(),
      back: draft.back.trim(),
      groupName: draft.groupName.trim(),
      sourceType: draft.sourceType
    }))
    .filter((draft) => draft.front && draft.back);

  if (!cleanedDrafts.length) {
    return;
  }

  cleanedDrafts.forEach((draft) => {
    const groupId = ensureGroup(draft.groupName || "Unsorted");

    state.cards.unshift({
      id: crypto.randomUUID(),
      front: draft.front,
      back: draft.back,
      groupId,
      createdAt: Date.now(),
      sourceType: draft.sourceType
    });
  });

  state.drafts = [];
  elements.notesInput.value = "";
  elements.ocrText.value = "";
  persistAndRender();
  setActiveView("library");
}

function ensureGroup(groupName) {
  const existing = state.groups.find(
    (group) => group.name.toLowerCase() === groupName.trim().toLowerCase()
  );

  if (existing) {
    return existing.id;
  }

  const group = {
    id: crypto.randomUUID(),
    name: groupName.trim(),
    createdAt: Date.now()
  };

  state.groups.push(group);
  saveState();
  return group.id;
}

function parseNotesToCards(rawText, groupName, sourceType) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const separators = ["\t", " - ", " – ", " — ", ":", "=", "->"];
      const separator = separators.find((item) => line.includes(item));

      if (!separator) {
        return null;
      }

      const [front, ...rest] = line.split(separator);
      const back = rest.join(separator).trim();

      if (!front?.trim() || !back) {
        return null;
      }

      return {
        front: front.trim(),
        back,
        groupName,
        sourceType
      };
    })
    .filter(Boolean);
}

function sortCards(a, b, sortValue) {
  switch (sortValue) {
    case "oldest":
      return a.createdAt - b.createdAt;
    case "front-asc":
      return a.front.localeCompare(b.front);
    case "front-desc":
      return b.front.localeCompare(a.front);
    case "newest":
    default:
      return b.createdAt - a.createdAt;
  }
}

function shuffle(items) {
  const copy = items.slice();

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function normalize(value) {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, "");
}

function showTemporaryStatus(element, message) {
  element.textContent = message;
  setTimeout(() => {
    if (element.textContent === message) {
      element.textContent = "No image selected yet.";
    }
  }, 2500);
}

function persistAndRender() {
  saveState();
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
