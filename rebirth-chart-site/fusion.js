const rarityOrder = ["MYTHIC", "LEGENDARY", "EPIC", "RARE"];
const groups = document.querySelector("#fusion-groups");
const shoppingGrid = document.querySelector("#shopping-grid");
const copyButton = document.querySelector("#copy-shopping");
const fusionIncomeTable = document.querySelector("#fusion-income-table");
const fusionImpactTable = document.querySelector("#fusion-impact-table");
const fusionImpactSummary = document.querySelector("#fusion-impact-summary");
const fusionImpactImage = document.querySelector("#fusion-impact-image");
const openImpactViewer = document.querySelector("#open-impact-viewer");
const chartLightbox = document.querySelector("#chart-lightbox");
const chartLightboxImage = document.querySelector("#chart-lightbox-image");
const chartLightboxViewport = document.querySelector("#chart-lightbox-viewport");
const chartLightboxClose = document.querySelector("#chart-lightbox-close");
const chartZoomOut = document.querySelector("#chart-zoom-out");
const chartZoomReset = document.querySelector("#chart-zoom-reset");
const chartZoomIn = document.querySelector("#chart-zoom-in");
const chartZoomLabel = document.querySelector("#chart-zoom-label");
const chipCostTable = document.querySelector("#chip-cost-table");
let fusionData = null;
let chartZoom = 1;

function alignHashTarget() {
  if (!window.location.hash) return;
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
}

function setChartZoom(nextZoom) {
  chartZoom = Math.min(3, Math.max(0.5, nextZoom));
  chartLightboxImage.style.width = `${chartZoom * 100}%`;
  chartZoomLabel.textContent = `${Math.round(chartZoom * 100)}%`;
  chartZoomOut.disabled = chartZoom <= 0.5;
  chartZoomIn.disabled = chartZoom >= 3;
}

function openChartLightbox() {
  if (chartLightbox.open) return;
  chartLightboxImage.src = fusionImpactImage.dataset.fullSrc;
  setChartZoom(1);
  chartLightbox.showModal();
  chartLightboxViewport.scrollTo({ top: 0, left: 0 });
  chartLightboxClose.focus();
}

function closeChartLightbox() {
  if (!chartLightbox.open) return;
  chartLightbox.close();
}

function handleChartKeydown(event) {
  if (!chartLightbox.open) return;
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    setChartZoom(chartZoom + 0.25);
  } else if (event.key === "-") {
    event.preventDefault();
    setChartZoom(chartZoom - 0.25);
  } else if (event.key === "0") {
    event.preventDefault();
    setChartZoom(1);
  }
}

openImpactViewer.addEventListener("click", openChartLightbox);
fusionImpactImage.addEventListener("click", openChartLightbox);
fusionImpactImage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openChartLightbox();
  }
});
chartLightboxClose.addEventListener("click", closeChartLightbox);
chartZoomOut.addEventListener("click", () => setChartZoom(chartZoom - 0.25));
chartZoomReset.addEventListener("click", () => setChartZoom(1));
chartZoomIn.addEventListener("click", () => setChartZoom(chartZoom + 0.25));
chartLightbox.addEventListener("click", (event) => {
  if (event.target === chartLightbox) closeChartLightbox();
});
chartLightbox.addEventListener("close", () => openImpactViewer.focus());
chartLightboxViewport.addEventListener("wheel", (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setChartZoom(chartZoom + (event.deltaY < 0 ? 0.25 : -0.25));
}, { passive: false });
document.addEventListener("keydown", handleChartKeydown);

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderRecipes() {
  const sections = rarityOrder.map((rarity) => {
    const recipes = fusionData.recipes.filter((recipe) => recipe.rarity === rarity);
    const section = document.createElement("section");
    section.className = `fusion-group rarity-${rarity.toLowerCase()}`;
    section.append(textElement("h3", "fusion-group-title", `${rarity} FUSIONS • ${recipes.length}`));
    const grid = document.createElement("div");
    grid.className = "fusion-recipe-grid";
    recipes.forEach((recipe) => {
      const card = document.createElement("article");
      card.className = `fusion-recipe-card role-${recipe.role.toLowerCase()}`;
      const header = document.createElement("header");
      header.append(
        textElement("span", "fusion-output", recipe.output),
        textElement("span", "fusion-role", recipe.role),
      );
      const summary = document.createElement("p");
      summary.className = "fusion-income-summary";
      summary.append(
        textElement("span", "", `Default ${formatCredits(recipe.income_per_second.DEFAULT)}/s`),
        textElement("span", "", `Stellar ${formatCredits(recipe.income_per_second.STELLAR)}/s`),
      );
      card.append(header, summary, textElement("p", "fusion-equation", recipe.ingredients.join(" + ")));
      grid.append(card);
    });
    section.append(grid);
    return section;
  });
  groups.replaceChildren(...sections);
}

function formatCredits(value) {
  const units = [
    [1_000_000_000_000, "T"],
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];
  const match = units.find(([threshold]) => value >= threshold);
  if (!match) return value.toLocaleString();
  const [threshold, suffix] = match;
  return `${(value / threshold).toFixed(3).replace(/\.?0+$/, "")}${suffix}`;
}

function renderFusionIncome() {
  const variants = Object.keys(fusionData.recipes[0].income_per_hour);
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const droidHeader = textElement("th", "", "Droid");
  droidHeader.scope = "col";
  headerRow.append(droidHeader);
  variants.forEach((variant) => {
    const label = variant === "DEFAULT" ? "Default" : variant;
    const cell = textElement("th", `quality-${variant.toLowerCase()}`, label);
    cell.scope = "col";
    headerRow.append(cell);
  });
  header.append(headerRow);

  const body = document.createElement("tbody");
  rarityOrder.forEach((rarity) => {
    fusionData.recipes.filter((recipe) => recipe.rarity === rarity).forEach((recipe) => {
      const row = document.createElement("tr");
      const label = document.createElement("th");
      label.scope = "row";
      label.className = `rarity-${rarity.toLowerCase()}`;
      label.append(
        textElement("span", "income-droid-name", recipe.output),
        textElement("span", "income-droid-role", recipe.role),
      );
      row.append(label);
      variants.forEach((variant) => {
        const cell = document.createElement("td");
        cell.append(
          textElement("strong", "income-secondly", `${formatCredits(recipe.income_per_second[variant])}/s`),
          textElement("span", "income-hourly", `${formatCredits(recipe.income_per_hour[variant])}/h`),
        );
        row.append(cell);
      });
      body.append(row);
    });
  });

  const caption = document.createElement("caption");
  caption.textContent = "Base fusion droid earnings per second by variant";
  fusionIncomeTable.replaceChildren(caption, header, body);
}

function formatSignedCredits(value) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${formatCredits(Math.abs(value))}`;
}

function renderFusionImpact(data) {
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const droidHeader = textElement("th", "", "Fusion droid");
  droidHeader.scope = "col";
  headerRow.append(droidHeader);
  data.variants.forEach((variant) => {
    const label = variant === "BASIC" ? "Basic / Default" : variant;
    const cell = textElement("th", `quality-${variant.toLowerCase()}`, label);
    cell.scope = "col";
    headerRow.append(cell);
  });
  header.append(headerRow);

  const body = document.createElement("tbody");
  rarityOrder.forEach((rarity) => {
    data.comparisons.filter((comparison) => comparison.rarity === rarity).forEach((comparison) => {
      const row = document.createElement("tr");
      const label = document.createElement("th");
      label.scope = "row";
      label.className = `rarity-${rarity.toLowerCase()}`;
      label.append(
        textElement("span", "income-droid-name", comparison.output),
        textElement("span", "impact-ingredients", comparison.ingredients.join(" + ")),
      );
      row.append(label);

      data.variants.forEach((variant) => {
        const result = comparison.variants[variant];
        const cell = document.createElement("td");
        if (!result) {
          cell.className = "impact-undocumented";
          cell.textContent = "N/A";
        } else {
          cell.className = `impact-${result.outcome}`;
          cell.append(
            textElement("strong", "impact-net", `${formatSignedCredits(result.net_income_per_second)}/s`),
            textElement("span", "impact-flow", `${formatCredits(result.input_income_per_second)}/s → ${formatCredits(result.output_income_per_second)}/s`),
            textElement("span", "impact-retained", `${(result.retained_ratio * 100).toFixed(1)}% retained`),
          );
        }
        row.append(cell);
      });
      body.append(row);
    });
  });

  const caption = document.createElement("caption");
  caption.textContent = "Fusion output income minus combined ingredient income at the same variant";
  fusionImpactTable.replaceChildren(caption, header, body);

  const summaryItems = [
    [data.recipe_results.gain, "recipes gain at every documented variant", "gain"],
    [data.recipe_results.loss, "recipes lose at every documented variant", "loss"],
    [data.recipe_results.mixed, "recipes change result by variant", "mixed"],
    [2, "droid slots freed by each fusion", "slots"],
  ];
  fusionImpactSummary.replaceChildren(...summaryItems.map(([number, label, type]) => {
    const item = document.createElement("div");
    item.className = `impact-summary-${type}`;
    item.append(textElement("strong", "", number), textElement("span", "", label));
    return item;
  }));
}

function renderShopping() {
  const items = fusionData.shopping.map((item) => {
    const row = document.createElement("div");
    row.className = `shopping-item rarity-${item.rarity.toLowerCase()}`;
    row.append(
      textElement("span", "shopping-name", item.name),
      textElement("strong", "shopping-count", `×${item.quantity}`),
    );
    return row;
  });
  shoppingGrid.replaceChildren(...items);
}

function renderChipCosts(data) {
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const rarityHeader = textElement("th", "", "Rarity");
  rarityHeader.scope = "col";
  headerRow.append(rarityHeader);
  data.qualities.forEach((quality) => {
    const cell = textElement("th", `quality-${quality.toLowerCase()}`, quality);
    cell.scope = "col";
    headerRow.append(cell);
  });
  header.append(headerRow);

  const body = document.createElement("tbody");
  data.rarities.forEach((rarity) => {
    const row = document.createElement("tr");
    const label = textElement("th", `rarity-${rarity.toLowerCase()}`, rarity);
    label.scope = "row";
    row.append(label);
    data.qualities.forEach((quality) => {
      const cost = data.costs[rarity][quality];
      row.append(textElement("td", cost ? "" : "unavailable", cost ? `${cost.toLocaleString()} chips` : "Not used"));
    });
    body.append(row);
  });

  const caption = document.createElement("caption");
  caption.textContent = `Droid Tycoon Update ${data.update} chip costs`;
  chipCostTable.replaceChildren(caption, header, body);
}

async function copyShoppingList() {
  const lines = [
    "Droid Advisor Fusion Shopping List",
    ...fusionData.shopping.map((item) => `${item.name} x${item.quantity}`),
    `Total: ${fusionData.totals.droid_units} droid units`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    copyButton.textContent = "Copied";
  } catch {
    copyButton.textContent = "Copy unavailable";
  }
  setTimeout(() => { copyButton.textContent = "Copy shopping list"; }, 1600);
}

async function loadFusionData() {
  try {
    const [fusionResponse, chipResponse, impactResponse] = await Promise.all([
      fetch("/assets/fusion-recipes.json?v=3"),
      fetch("/assets/upgrade-chip-costs.json?v=1"),
      fetch("/assets/fusion-profitability.json?v=1"),
    ]);
    if (!fusionResponse.ok) throw new Error(`Fusion request failed: ${fusionResponse.status}`);
    if (!chipResponse.ok) throw new Error(`Chip-cost request failed: ${chipResponse.status}`);
    if (!impactResponse.ok) throw new Error(`Fusion-impact request failed: ${impactResponse.status}`);
    fusionData = await fusionResponse.json();
    const chipCostData = await chipResponse.json();
    const fusionImpactData = await impactResponse.json();
    renderRecipes();
    renderFusionIncome();
    renderFusionImpact(fusionImpactData);
    renderShopping();
    renderChipCosts(chipCostData);
    copyButton.addEventListener("click", copyShoppingList);
    alignHashTarget();
  } catch (error) {
    groups.textContent = "Fusion recipes could not be loaded. Please refresh the page.";
    shoppingGrid.textContent = "Shopping list unavailable.";
    fusionIncomeTable.replaceChildren(textElement("caption", "", "Fusion income unavailable."));
    fusionImpactTable.replaceChildren(textElement("caption", "", "Fusion income comparison unavailable."));
    fusionImpactSummary.textContent = "Fusion comparison unavailable.";
    chipCostTable.replaceChildren(textElement("caption", "", "Upgrade-chip costs unavailable."));
    console.error(error);
  }
}

window.addEventListener("load", alignHashTarget);
window.addEventListener("hashchange", alignHashTarget);
loadFusionData();
