const rarityOrder = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON", "ICONIC"];
const table = document.querySelector("#all-droids-table");
const resultCount = document.querySelector("#result-count");
const searchInput = document.querySelector("#droid-search");
const rarityFilter = document.querySelector("#rarity-filter");
const roleFilter = document.querySelector("#role-filter");
const kindFilter = document.querySelector("#kind-filter");
let allDroidData = null;

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatCredits(value) {
  if (value === null || value === undefined) return "N/A";
  const units = [[1_000_000, "M"], [1_000, "K"]];
  const match = units.find(([threshold]) => value >= threshold);
  if (!match) return value.toLocaleString();
  const [threshold, suffix] = match;
  return `${(value / threshold).toFixed(3).replace(/\.?0+$/, "")}${suffix}`;
}

function selectedDroids() {
  const search = searchInput.value.trim().toLowerCase();
  return allDroidData.droids.filter((droid) => (
    (!search || droid.name.toLowerCase().includes(search))
    && (rarityFilter.value === "ALL" || droid.rarity === rarityFilter.value)
    && (roleFilter.value === "ALL" || droid.role === roleFilter.value)
    && (kindFilter.value === "ALL" || droid.kind === kindFilter.value)
  ));
}

function renderTable() {
  const droids = selectedDroids();
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Droid", "Role", ...allDroidData.variants].forEach((label, index) => {
    const display = label === "BASIC" ? "Basic / Default" : label;
    const cell = textElement("th", label === "BASIC" ? "quality-basic" : `quality-${label.toLowerCase()}`, display);
    cell.scope = "col";
    if (index < 2) cell.className = "";
    headerRow.append(cell);
  });
  header.append(headerRow);

  const body = document.createElement("tbody");
  rarityOrder.forEach((rarity) => {
    const group = droids.filter((droid) => droid.rarity === rarity);
    if (!group.length) return;
    const groupRow = document.createElement("tr");
    groupRow.className = `rarity-heading rarity-${rarity.toLowerCase()}`;
    const groupCell = textElement("th", "", `${rarity} • ${group.length}`);
    groupCell.colSpan = 9;
    groupCell.scope = "rowgroup";
    groupRow.append(groupCell);
    body.append(groupRow);

    group.forEach((droid) => {
      const row = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      name.append(textElement("span", "droid-name", droid.name));
      if (droid.kind === "FUSION") name.append(textElement("span", "kind-badge", "Fusion"));
      row.append(name, textElement("td", `role-${droid.role.toLowerCase()}`, droid.role === "ASTRO" ? "Astromech" : droid.role));

      if (droid.kind === "ICONIC") {
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.className = "iconic-income";
        cell.append(textElement("strong", "", droid.income), textElement("span", "", droid.perk));
        row.append(cell);
      } else {
        allDroidData.variants.forEach((variant) => {
          const value = droid.income_per_second[variant];
          row.append(textElement("td", value === null ? "undocumented" : "", value === null ? "N/A" : `${formatCredits(value)}/s`));
        });
      }
      body.append(row);
    });
  });

  const caption = document.createElement("caption");
  caption.textContent = "Base Droid Tycoon income per second by variant";
  table.replaceChildren(caption, header, body);
  resultCount.textContent = `${droids.length} of ${allDroidData.totals.all} droids`;
}

async function loadDroids() {
  try {
    const response = await fetch("/assets/all-droid-income.json?v=1");
    if (!response.ok) throw new Error(`Droid income request failed: ${response.status}`);
    allDroidData = await response.json();
    [searchInput, rarityFilter, roleFilter, kindFilter].forEach((control) => control.addEventListener("input", renderTable));
    renderTable();
  } catch (error) {
    table.replaceChildren(textElement("caption", "", "All-droid income data could not be loaded."));
    resultCount.textContent = "Income data unavailable";
    console.error(error);
  }
}

loadDroids();
