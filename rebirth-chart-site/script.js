const viewButtons = [...document.querySelectorAll("[data-view]")];
const quickButtons = [...document.querySelectorAll("[data-quick-cycle]")];
const image = document.querySelector("#chart-image");
const frame = document.querySelector("#chart-frame");
const download = document.querySelector("#download-link");
const quickDownload = document.querySelector("#quick-download-link");
const quickGrid = document.querySelector("#quick-grid");
const rarityOrder = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

let quickData = null;
let activeQuickCycle = "1";

function showView(view) {
  const isAll = view === "all";
  image.src = isAll
    ? "/assets/droid-advisor-all-rebirth-cycles.png?v=3"
    : `/assets/rebirth-cycle-${view}.png?v=3`;
  image.alt = isAll
    ? "All five Droid Advisor rebirth cycles from RB1 through RB35"
    : `Droid Advisor rebirth Cycle ${view} from RB1 through RB35`;
  download.href = isAll
    ? "/assets/droid-advisor-all-rebirth-cycles.png?v=3"
    : `/assets/rebirth-cycle-${view}.png?v=3`;
  download.textContent = isAll ? "Download full chart" : `Download Cycle ${view}`;
  frame.classList.toggle("all", isAll);
  frame.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (!isAll) setQuickCycle(view);
}

function makeTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderQuickCards(cycle) {
  if (!quickData) return;
  const cards = rarityOrder.map((rarity) => {
    const records = quickData[cycle][rarity];
    const tierLast = Math.max(...records.map((record) => record.last));
    const card = document.createElement("article");
    card.className = `quick-card rarity-${rarity.toLowerCase()}`;

    const header = document.createElement("header");
    header.append(
      makeTextElement("h3", "", `${rarity} • ${records.length}`),
      makeTextElement(
        "span",
        "quick-clear",
        tierLast < 35 ? `Sell from RB${tierLast + 1}` : "Check next cycle",
      ),
    );
    card.append(header);

    const list = document.createElement("ul");
    records.forEach((record) => {
      const row = document.createElement("li");
      row.className = `quality-${record.quality.toLowerCase()}`;
      row.append(
        makeTextElement("span", "quick-name", record.name),
        makeTextElement("span", "quick-quality", record.quality),
        makeTextElement("strong", "quick-last", `RB${record.last}`),
      );
      list.append(row);
    });
    card.append(list);
    return card;
  });
  quickGrid.replaceChildren(...cards);
}

function setQuickCycle(cycle) {
  activeQuickCycle = cycle;
  quickButtons.forEach((button) => {
    const active = button.dataset.quickCycle === cycle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  quickDownload.href = `/assets/rebirth-quick-list-cycle-${cycle}.png?v=3`;
  quickDownload.textContent = `Download Cycle ${cycle} quick list`;
  renderQuickCards(cycle);
}

async function loadQuickLists() {
  quickGrid.textContent = "Loading quick list…";
  try {
    const response = await fetch("/assets/rebirth-quick-lists.json?v=3");
    if (!response.ok) throw new Error(`Quick-list request failed: ${response.status}`);
    quickData = await response.json();
    setQuickCycle(activeQuickCycle);
  } catch (error) {
    quickGrid.textContent = "The quick list could not be loaded. Please refresh the page.";
    console.error(error);
  }
}

viewButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
quickButtons.forEach((button) => button.addEventListener("click", () => setQuickCycle(button.dataset.quickCycle)));
showView("all");
loadQuickLists();
