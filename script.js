let signedInEmail = "";

const scriptURL =
  "https://script.google.com/macros/s/AKfycbxd8lhscg78qUJMhoEebUY3YDQMsDEj2RuzBOyVrykJ1rEGKVSuhbZABsdINnk0v1ye3w/exec";

// =====================================================
// GOOGLE SIGN-IN
// =====================================================

function handleCredentialResponse(response) {
  const data = jwt_decode(response.credential);

  signedInEmail = data.email;

  document.getElementById("submittedBy").value = signedInEmail;

  document.getElementById("googleSignIn").style.display = "none";
}

// =====================================================
// NORMALIZE FILTER VALUES
// =====================================================

function normalizeFilterValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// =====================================================
// FORM VISIBILITY
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
  const festivalEl = document.getElementById("festival");
  const typeEl = document.getElementById("type");
  const paymentTypeEl = document.getElementById("paymentType");

  const fgType = document.getElementById("fg-type");
  const fgName = document.getElementById("fg-name");
  const fgAmount = document.getElementById("fg-amount");
  const fgLocal = document.getElementById("fg-local");
  const fgVillage = document.getElementById("fg-village");
  const fgYear = document.getElementById("fg-year");
  const fgRemarks = document.getElementById("fg-remarks");
  const fgPaymentType = document.getElementById("fg-paymentType");
  const fgAttachment = document.getElementById("fg-attachment");

  const lblName = document.getElementById("lbl-name");
  const lblLocal = document.getElementById("lbl-local");

  function updateFormVisibility() {
    const festival = festivalEl.value;
    const type = typeEl.value;
    const paymentType = paymentTypeEl.value;

    // Festival selected
    if (festival) {
      fgType.style.display = "block";
      typeEl.required = true;
    } else {
      fgType.style.display = "none";
      typeEl.required = false;
    }

    // Collection / Expense
    if (type === "Expense" || type === "Collection") {
      if (type === "Expense") {
        // -------------------------
        // EXPENSE
        // -------------------------

        fgName.style.display = "block";
        lblName.textContent = "Product Name";

        document.getElementById("name").required = true;

        fgAmount.style.display = "block";

        fgLocal.style.display = "block";
        lblLocal.textContent = "Shop Name";

        document.getElementById("local").required = true;

        fgVillage.style.display = "none";
        document.getElementById("village").required = false;
        document.getElementById("village").value = "";
      } else {
        // -------------------------
        // COLLECTION
        // -------------------------

        fgName.style.display = "block";
        lblName.textContent = "Name";

        document.getElementById("name").required = true;

        fgAmount.style.display = "block";

        fgLocal.style.display = "block";
        lblLocal.textContent = "Local";

        document.getElementById("local").required = true;

        fgVillage.style.display = "block";
        document.getElementById("village").required = true;
      }

      fgYear.style.display = "block";
      fgRemarks.style.display = "block";

      fgPaymentType.style.display = "block";
      paymentTypeEl.required = true;

      // Online payment requires attachment
      if (paymentType === "Online") {
        fgAttachment.style.display = "block";
      } else {
        fgAttachment.style.display = "none";

        document.getElementById("attachment").value = "";
        document.getElementById("fileInfo").innerHTML = "";
      }
    } else {
      // Hide everything
      [
        fgName,
        fgAmount,
        fgLocal,
        fgVillage,
        fgYear,
        fgRemarks,
        fgPaymentType,
        fgAttachment,
      ].forEach((el) => {
        el.style.display = "none";
      });

      document.getElementById("village").required = false;
      document.getElementById("name").required = false;
      document.getElementById("local").required = false;

      paymentTypeEl.required = false;

      document.getElementById("attachment").value = "";
      document.getElementById("fileInfo").innerHTML = "";
    }
  }

  festivalEl.addEventListener("change", updateFormVisibility);
  typeEl.addEventListener("change", updateFormVisibility);
  paymentTypeEl.addEventListener("change", updateFormVisibility);

  updateFormVisibility();
});

// =====================================================
// GOOGLE LOGIN INITIALIZATION
// =====================================================

window.onload = function () {
  google.accounts.id.initialize({
    client_id:
      "923748239564-vu6bjumjpfa36jt3rsvjtnrnh637m6a0.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  });

  google.accounts.id.renderButton(
    document.getElementById("googleSignIn"),
    {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "pill",
    }
  );

  fetchData();
};

// =====================================================
// FORM SUBMIT
// =====================================================

document
  .getElementById("donationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!signedInEmail) {
      alert("⚠️ Please sign in with Google before submitting.");
      return;
    }

    document.getElementById("submittedBy").value = signedInEmail;

    const formData = new FormData(this);

    const jsonData = Object.fromEntries(formData.entries());

    const file = document.getElementById("attachment").files[0];

    // =================================================
    // FILE UPLOAD
    // =================================================

    if (file) {
      if (!validateFile(file)) {
        return;
      }

      // Compress images
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file);

        jsonData.fileName = file.name.replace(
          /\.[^.]+$/,
          ".jpg"
        );

        jsonData.mimeType = "image/jpeg";

        jsonData.fileData =
          await blobToBase64(compressed);
      } else {
        // PDF
        jsonData.fileName = file.name;

        jsonData.mimeType = file.type;

        jsonData.fileData =
          await blobToBase64(file);
      }
    }

    // =================================================
    // SEND TO GOOGLE APPS SCRIPT
    // =================================================

    try {
      const response = await fetch(scriptURL, {
        method: "POST",
        body: new URLSearchParams(jsonData),
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
      });

      const resultText = await response.text();

      alert(resultText);

      // Reset form
      this.reset();

      // Restore year
      document.getElementById("year").value =
        new Date().getFullYear();

      // Restore logged-in user
      document.getElementById("submittedBy").value =
        signedInEmail;

      document.getElementById("fileInfo").innerHTML = "";

      console.log(
        "Submission successful:",
        resultText,
        "submitted by:",
        signedInEmail
      );

      // Reload data
      fetchData();
    } catch (err) {
      console.error("Submission error:", err);

      alert("❌ Submission failed.");
    }
  });

// =====================================================
// GLOBAL DATA
// =====================================================

let allData = [];

// =====================================================
// FETCH DATA
// =====================================================

async function fetchData() {
  try {
    const response = await fetch(
      `${scriptURL}?action=read`
    );

    allData = await response.json();

    // Show all data
    renderTable(allData);

    // Populate filters
    populateDropdowns(allData);
  } catch (err) {
    console.error("Fetching error:", err);

    alert("❌ Failed to load data.");
  }
}

// =====================================================
// RENDER TABLE
// =====================================================

function renderTable(data) {
  const tbody =
    document.querySelector("#dataTable tbody");

  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style="white-space: nowrap;">
        ${row.Timestamp || ""}
      </td>

      <td>
        ${row.type || ""}
      </td>

      <td>
        ${row.paymentType || ""}
      </td>

      <td>
        ${row.name || ""}
      </td>

      <td>
        ${row.amount || ""}
      </td>

      <td>
        ${row.local || ""}
      </td>

      <td>
        ${row.village || ""}
      </td>

      <td>
        ${row.festival || ""}
      </td>

      <td>
        ${row.year || ""}
      </td>

      <td>
        ${row.remarks || ""}
      </td>

      <td>
        ${row.attachment
        ? `<a
                href="${row.attachment}"
                target="_blank"
                style="color: blue; text-decoration: underline;"
              >
                View
              </a>`
        : ""
      }
      </td>

      <td>
        ${row.submittedBy || ""}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// =====================================================
// APPLY FILTERS
// =====================================================

function applyFilters() {
  const nameInput = document
    .getElementById("searchByName")
    .value
    .trim()
    .toLowerCase();

  const villageInput = normalizeFilterValue(
    document.getElementById("searchByVillage").value
  );

  const yearInput = normalizeFilterValue(
    document.getElementById("searchByYear").value
  );

  const localInput = normalizeFilterValue(
    document.getElementById("searchByLocal").value
  );

  const festivalInput = normalizeFilterValue(
    document.getElementById("searchByFestival").value
  );

  const submittedByInput = document
    .getElementById("searchBySubmittedBy")
    .value
    .trim()
    .toLowerCase();

  const typeInput =
    document.getElementById("searchByType")?.value || "";

  const paymentTypeInput =
    document.getElementById("searchByPaymentType")?.value ||
    "";

  const amountRange =
    document.getElementById("searchByAmountRange")?.value ||
    "";

  // ===================================================
  // FILTER DATA
  // ===================================================

  const filtered = allData.filter((row) => {
    const name = String(
      row.name || ""
    ).toLowerCase();

    const village = normalizeFilterValue(
      row.village
    );

    const year = normalizeFilterValue(
      row.year
    );

    const local = normalizeFilterValue(
      row.local
    );

    const festival = normalizeFilterValue(
      row.festival
    );

    const submittedBy = String(
      row.submittedBy || ""
    ).toLowerCase();

    const amt = parseFloat(
      row.amount || "0"
    );

    const rowType = String(
      row.type || ""
    );

    const rowPaymentType = String(
      row.paymentType || ""
    );

    // =================================================
    // AMOUNT RANGE
    // =================================================

    const matchesAmount = (() => {
      if (!amountRange) {
        return true;
      }

      let min = 0;
      let max = Infinity;

      if (amountRange.includes("+")) {
        min = parseInt(
          amountRange.replace("+", ""),
          10
        );
      } else if (amountRange.includes("-")) {
        [min, max] =
          amountRange
            .split("-")
            .map(Number);
      }

      return amt >= min && amt <= max;
    })();

    // =================================================
    // ALL FILTER CONDITIONS
    // =================================================

    return (
      (!nameInput ||
        name.includes(nameInput)) &&

      (!villageInput ||
        village === villageInput) &&

      (!yearInput ||
        year === yearInput) &&

      (!localInput ||
        local === localInput) &&

      (!festivalInput ||
        festival === festivalInput) &&

      (!typeInput ||
        rowType === typeInput) &&

      (!paymentTypeInput ||
        rowPaymentType === paymentTypeInput) &&

      (!submittedByInput ||
        submittedBy.includes(submittedByInput)) &&

      matchesAmount
    );
  });

  // ===================================================
  // RENDER FILTERED DATA
  // ===================================================

  renderTable(filtered);

  // ===================================================
  // CALCULATE COLLECTION / EXPENSE
  // ===================================================

  let totalCollection = 0;
  let totalExpense = 0;

  filtered.forEach((row) => {
    const amt = parseFloat(row.amount);

    if (isNaN(amt)) {
      return;
    }

    const rowType = String(
      row.type || ""
    ).toLowerCase();

    if (rowType === "collection") {
      totalCollection += amt;
    } else if (rowType === "expense") {
      totalExpense += amt;
    }
  });

  // ===================================================
  // BALANCE
  // ===================================================

  const balance =
    totalCollection - totalExpense;

  document.getElementById(
    "totalCollection"
  ).textContent =
    totalCollection.toFixed(2);

  document.getElementById(
    "totalExpense"
  ).textContent =
    totalExpense.toFixed(2);

  const balanceEl =
    document.getElementById(
      "totalBalance"
    );

  const balanceLabelEl =
    document.getElementById(
      "balanceLabel"
    );

  const balanceBox =
    document.getElementById(
      "balanceBox"
    );

  balanceEl.textContent =
    "₹" +
    Math.abs(balance).toFixed(2);

  // ===================================================
  // PROFIT
  // ===================================================

  if (balance > 0) {
    balanceLabelEl.textContent =
      "🟢 Profit";

    balanceBox.style.background =
      "linear-gradient(135deg, #166534, #15803d)";

    balanceBox.style.color = "#fff";

    balanceEl.style.color =
      "#bbf7d0";

    // ===================================================
    // LOSS
    // ===================================================

  } else if (balance < 0) {
    balanceLabelEl.textContent =
      "🔴 Loss";

    balanceBox.style.background =
      "linear-gradient(135deg, #7f1d1d, #b91c1c)";

    balanceBox.style.color = "#fff";

    balanceEl.style.color =
      "#fecaca";

    // ===================================================
    // ZERO BALANCE
    // ===================================================

  } else {
    balanceLabelEl.textContent =
      "💰 Balance";

    balanceBox.style.background = "";

    balanceBox.style.color = "";

    balanceEl.style.color = "";
  }
}

// =====================================================
// LOAD DATA BUTTON
// =====================================================

document
  .getElementById("loadDataBtn")
  .addEventListener(
    "click",
    applyFilters
  );

// =====================================================
// POPULATE DROPDOWNS
// =====================================================

function getUniqueValues(data, field) {
  const uniqueMap = new Map();

  data.forEach((row) => {
    const originalValue = String(
      row[field] || ""
    )
      .trim()
      .replace(/\s+/g, " ");

    if (!originalValue) {
      return;
    }

    const normalizedValue =
      normalizeFilterValue(
        originalValue
      );

    // Only add first occurrence
    if (!uniqueMap.has(normalizedValue)) {
      uniqueMap.set(
        normalizedValue,
        originalValue
      );
    }
  });

  return Array.from(
    uniqueMap.values()
  );
}

function populateDropdowns(data) {
  const villages =
    getUniqueValues(
      data,
      "village"
    );

  const years =
    getUniqueValues(
      data,
      "year"
    );

  const locals =
    getUniqueValues(
      data,
      "local"
    );

  const festivals =
    getUniqueValues(
      data,
      "festival"
    );

  fillSelect(
    "searchByVillage",
    villages
  );

  fillSelect(
    "searchByYear",
    years
  );

  fillSelect(
    "searchByLocal",
    locals
  );

  fillSelect(
    "searchByFestival",
    festivals
  );
}

// =====================================================
// FILL SELECT
// =====================================================

function fillSelect(id, values) {
  const select =
    document.getElementById(id);

  let label = "";

  switch (id) {
    case "searchByVillage":
      label = "Select Village";
      break;

    case "searchByYear":
      label = "Select Year";
      break;

    case "searchByLocal":
      label = "Select Local";
      break;

    case "searchByFestival":
      label = "Select Festival";
      break;

    default:
      label = "-- Select --";
  }

  select.innerHTML =
    `<option value="">${label}</option>`;

  values
    .sort((a, b) =>
      a.localeCompare(
        b,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
    )
    .forEach((value) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = value;

      option.textContent = value;

      select.appendChild(
        option
      );
    });
}

// =====================================================
// PDF EXPORT
// =====================================================

document
  .getElementById("downloadPDF")
  .addEventListener(
    "click",
    function () {
      const exportArea =
        document.getElementById(
          "exportContent"
        );

      // Deep clone
      const clone =
        exportArea.cloneNode(true);

      // Check table rows
      const rows =
        clone.querySelectorAll(
          "tbody tr"
        );

      if (!rows.length) {
        alert(
          "⚠️ No data to export! Please load or filter data first."
        );

        return;
      }

      // =================================================
      // PDF STYLE
      // =================================================

      clone.style.width = "100%";

      clone.style.maxWidth = "100%";

      clone.style.padding = "20px";

      clone.style.background = "#fff";

      clone.style.color = "#000";

      clone.style.fontSize = "12px";

      // =================================================
      // TABLE STYLE
      // =================================================

      const table =
        clone.querySelector("table");

      if (table) {
        table.style.width = "100%";

        table.style.borderCollapse =
          "collapse";

        table
          .querySelectorAll(
            "th, td"
          )
          .forEach((cell) => {
            cell.style.wordBreak =
              "break-word";

            cell.style.whiteSpace =
              "normal";

            cell.style.padding =
              "6px 8px";

            cell.style.border =
              "1px solid #ccc";

            cell.style.fontSize =
              "11px";

            cell.style.textAlign =
              "left";

            cell.style.background =
              "#fff";

            cell.style.color =
              "#000";
          });
      }

      // =================================================
      // SUMMARY
      // =================================================

      const collectionVal =
        document.getElementById(
          "totalCollection"
        ).textContent;

      const expenseVal =
        document.getElementById(
          "totalExpense"
        ).textContent;

      const balanceVal =
        document.getElementById(
          "totalBalance"
        ).textContent;

      const balanceLabel =
        document.getElementById(
          "balanceLabel"
        ).textContent;

      const isLoss =
        balanceLabel.includes(
          "Loss"
        );

      const isProfit =
        balanceLabel.includes(
          "Profit"
        );

      // =================================================
      // SUMMARY DIV
      // =================================================

      const summaryDiv =
        document.createElement(
          "div"
        );

      summaryDiv.style.cssText =
        `
          display:flex;
          gap:10px;
          justify-content:center;
          flex-wrap:wrap;
          margin-top:20px;
        `;

      summaryDiv.innerHTML = `
        <div
          style="
            background:linear-gradient(
              135deg,
              #1e3a5f,
              #1d4ed8
            );
            color:#fff;
            padding:10px 20px;
            border-radius:10px;
            text-align:center;
            min-width:120px;
          "
        >
          <div
            style="
              font-size:11px;
              font-weight:600;
              opacity:0.9;
            "
          >
            📥 Collection
          </div>

          <div
            style="
              font-size:16px;
              font-weight:700;
            "
          >
            ₹${collectionVal}
          </div>
        </div>

        <div
          style="
            font-size:24px;
            font-weight:700;
            color:#555;
            align-self:center;
          "
        >
          −
        </div>

        <div
          style="
            background:linear-gradient(
              135deg,
              #4a1942,
              #7e22ce
            );
            color:#fff;
            padding:10px 20px;
            border-radius:10px;
            text-align:center;
            min-width:120px;
          "
        >
          <div
            style="
              font-size:11px;
              font-weight:600;
              opacity:0.9;
            "
          >
            📤 Expense
          </div>

          <div
            style="
              font-size:16px;
              font-weight:700;
            "
          >
            ₹${expenseVal}
          </div>
        </div>

        <div
          style="
            font-size:24px;
            font-weight:700;
            color:#555;
            align-self:center;
          "
        >
          =
        </div>

        <div
          style="
            background:${isProfit
          ? "linear-gradient(135deg,#166534,#15803d)"
          : isLoss
            ? "linear-gradient(135deg,#7f1d1d,#b91c1c)"
            : "linear-gradient(135deg,#1a3a2a,#15803d)"
        };
            color:#fff;
            padding:10px 20px;
            border-radius:10px;
            text-align:center;
            min-width:120px;
          "
        >
          <div
            style="
              font-size:11px;
              font-weight:600;
              opacity:0.9;
            "
          >
            ${balanceLabel}
          </div>

          <div
            style="
              font-size:16px;
              font-weight:700;
            "
          >
            ${balanceVal}
          </div>
        </div>
      `;

      clone.appendChild(
        summaryDiv
      );

      // =================================================
      // TEMP CONTAINER
      // =================================================

      const tempContainer =
        document.createElement(
          "div"
        );

      tempContainer.style.position =
        "absolute";

      tempContainer.style.left =
        "-9999px";

      tempContainer.appendChild(
        clone
      );

      document.body.appendChild(
        tempContainer
      );

      // =================================================
      // PDF OPTIONS
      // =================================================

      const opt = {
        margin: 10,

        filename:
          "budget-catcher-data.pdf",

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          scrollY: 0,
        },

        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },

        pagebreak: {
          mode: [
            "avoid-all",
            "css",
            "legacy",
          ],
        },
      };

      // =================================================
      // GENERATE PDF
      // =================================================

      html2pdf()
        .set(opt)
        .from(clone)
        .save()
        .then(() => {
          document.body.removeChild(
            tempContainer
          );
        });
    }
  );

// =====================================================
// IMAGE COMPRESSION
// =====================================================

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader =
      new FileReader();

    reader.onload =
      function (event) {
        const img =
          new Image();

        img.onload =
          function () {
            let width =
              img.width;

            let height =
              img.height;

            const MAX_WIDTH =
              1600;

            if (
              width >
              MAX_WIDTH
            ) {
              height =
                Math.round(
                  (height *
                    MAX_WIDTH) /
                  width
                );

              width =
                MAX_WIDTH;
            }

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width =
              width;

            canvas.height =
              height;

            const ctx =
              canvas.getContext(
                "2d"
              );

            ctx.drawImage(
              img,
              0,
              0,
              width,
              height
            );

            canvas.toBlob(
              function (blob) {
                resolve(blob);
              },
              "image/jpeg",
              0.75
            );
          };

        img.src =
          event.target.result;
      };

    reader.readAsDataURL(
      file
    );
  });
}

// =====================================================
// BLOB TO BASE64
// =====================================================

function blobToBase64(blob) {
  return new Promise(
    (resolve) => {
      const reader =
        new FileReader();

      reader.onloadend =
        function () {
          resolve(
            reader.result.split(
              ","
            )[1]
          );
        };

      reader.readAsDataURL(
        blob
      );
    }
  );
}

// =====================================================
// FILE VALIDATION
// =====================================================

function validateFile(file) {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (
    !allowed.includes(
      file.type
    )
  ) {
    alert(
      "Only JPG, PNG and PDF are allowed."
    );

    return false;
  }

  if (
    file.size >
    20 * 1024 * 1024
  ) {
    alert(
      "Maximum file size is 20 MB."
    );

    return false;
  }

  return true;
}

// =====================================================
// ATTACHMENT FILE INFO
// =====================================================

document
  .getElementById("attachment")
  .addEventListener(
    "change",
    function () {
      const file =
        this.files[0];

      if (!file) {
        document.getElementById(
          "fileInfo"
        ).innerHTML = "";

        return;
      }

      document.getElementById(
        "fileInfo"
      ).innerHTML =
        file.name +
        " (" +
        (
          file.size /
          1024 /
          1024
        ).toFixed(2) +
        " MB)";
    }
  );