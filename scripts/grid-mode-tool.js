const accessError = document.getElementById("access-error");
const gridCheckbox = document.getElementById("grid-toggle-switch");
const gridForm = document.getElementById("grid-mode-form");
const gridFormInputs = gridForm.querySelectorAll("input");
const colorPicker = document.getElementById("grid-form-color-picker");
const opacityPercent = document.getElementById("grid-form-color-alpha");
const hexcodeInput = document.getElementById("grid-form-color-hexcode");
const gridButton = document.getElementById("grid-tool-button");
const gridMenu = document.getElementById("grid-mode-section");
let rgbaColor;
let inputsValue;

const onInternalPage = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url.startsWith("chrome://")) {
    const activeSection = document.querySelector("section.active");
    activeSection.classList.remove("active");
    accessError.classList.add("active");
  }
};

onInternalPage();

const getGridDefaultSettings = () => ({
  columns: 6,
  width: 1140,
  gutter: 20,
  colorPicker: "#EAD56C",
  colorAlpha: 50,
  colorHexcode: "#EAD56C",
  rgbaColor: "#EAD56C80",
});

const rewriteGridSettings = (settings) => {
  localStorage.setItem("ewd-grid-settings", JSON.stringify(settings));
};

const getGridSettings = () => {
  const storedSettings = localStorage.getItem("ewd-grid-settings");
  return storedSettings ? JSON.parse(storedSettings) : getGridDefaultSettings();
};

const updateFormInputs = (settings) => {
  gridFormInputs[0].value = settings.columns;
  gridFormInputs[1].value = settings.width;
  gridFormInputs[2].value = settings.gutter;
  gridFormInputs[3].value = settings.colorPicker;
  gridFormInputs[4].value = settings.colorAlpha;
  gridFormInputs[5].value = settings.colorHexcode;
  gridCheckbox.checked = settings.gridActive;
};

const updateSettingsFromInputs = () => {
  const newSettings = {
    columns: parseInt(gridFormInputs[0].value) || 6,
    width: parseInt(gridFormInputs[1].value) || 1140,
    gutter: parseInt(gridFormInputs[2].value) || 20,
    colorPicker: gridFormInputs[3].value || "#EAD56C",
    colorAlpha: parseInt(gridFormInputs[4].value) || 50,
    colorHexcode: gridFormInputs[5].value || "#EAD56C",
    rgbaColor: rgbaColor || "#EAD56C80",
    gridActive: gridCheckbox.checked,
  };
  rewriteGridSettings(newSettings);
  inputsValue = newSettings;
};

const inPageChange = async (reset = false) => {
  updateSettingsFromInputs();
  inputsValue = reset
    ? { ...getGridDefaultSettings(), gridActive: gridCheckbox.checked }
    : getGridSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (settings, active) => {
      let gridOverlay = document.querySelector("div#ewd-grid-overlay");
      if (active) {
        if (!gridOverlay) {
          gridOverlay = document.createElement("div");
          gridOverlay.setAttribute("id", "ewd-grid-overlay");
          gridOverlay.setAttribute(
            "style",
            `position: fixed;top: 0;left: 50%;transform: translateX(-50%);z-index: 99999 !important;width: ${settings.width}px;height: 100%;gap: ${settings.gutter}px;max-height: 100%;max-width: 100%;pointer-events: none;user-select: none;display: flex;flex-direction: row;justify-content: space-between;`,
          );
          document.body.insertBefore(gridOverlay, document.body.firstChild);
        }
        gridOverlay.style.width = `${settings.width}px`;
        gridOverlay.style.gap = `${settings.gutter}px`;
        gridOverlay.innerHTML = "";
        for (let i = 0; i < settings.columns; i++) {
          const gridColumn = document.createElement("div");
          gridColumn.setAttribute("class", "ewd-grid");
          gridColumn.setAttribute(
            "style",
            `flex: 1; width: 100%; background: ${settings.rgbaColor}; height: 100%;`,
          );
          gridOverlay.appendChild(gridColumn);
        }
      } else {
        gridOverlay?.remove();
      }
    },
    args: [inputsValue, gridCheckbox.checked],
  });
  updateFormInputs(inputsValue);
};

const alphaHexToDecimal = (color) => {
  const alphaHex = color.slice(-2);
  const alphaDecimal = parseInt(alphaHex, 16);
  return Math.round((alphaDecimal / 255) * 100);
};

const updateColor = () => {
  let opacity = parseInt(opacityPercent.value);
  opacity = isNaN(opacity) || opacity < 1 ? 1 : opacity > 100 ? 100 : opacity;
  opacityPercent.value = opacity;
  const alpha = Math.round((opacity / 100) * 255);
  const alphaHex = alpha.toString(16).padStart(2, "0");
  rgbaColor = `${colorPicker.value}${alphaHex}`;
  hexcodeInput.value = rgbaColor.toUpperCase();
  const alphaConverted = hexcodeInput.value.length === 9 ? alphaHexToDecimal(rgbaColor) : null;
  if (alphaConverted) opacityPercent.value = alphaConverted;
  inPageChange();
};

gridFormInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.type === "number") input.value = Math.max(1, parseInt(input.value) || 1);
    inPageChange();
  });
  if (input.type === "number") {
    input.addEventListener("wheel", (e) => {
      e.preventDefault();
      let value = parseInt(input.value) || 1;
      input.value = e.deltaY < 0 ? value + 1 : Math.max(1, value - 1);
      updateColor();
      inPageChange();
    });
  }
});

gridForm.addEventListener("submit", (e) => {
  e.preventDefault();
});

gridCheckbox.addEventListener("change", () => {
  gridForm.classList.toggle("inactive", !gridCheckbox.checked);
  inPageChange();
});

colorPicker.addEventListener("input", updateColor);
opacityPercent.addEventListener("input", updateColor);
hexcodeInput.addEventListener("input", updateColor);

const resetButton = gridForm.querySelector("button");
resetButton.addEventListener("click", (e) => {
  e.preventDefault();
  const defaultSettings = { ...getGridDefaultSettings(), gridActive: gridCheckbox.checked };
  inputsValue = defaultSettings;
  rewriteGridSettings(inputsValue);
  updateFormInputs(inputsValue);
  inPageChange(true);
});

const startExtension = () => {
  const storedSettings = getGridSettings();
  updateFormInputs(storedSettings);
  updateColor();
  gridForm.classList.toggle("inactive", !gridCheckbox.checked);
};

startExtension();
