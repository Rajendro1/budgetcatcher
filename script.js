let signedInEmail = "";

const scriptURL =
  "https://script.google.com/macros/s/AKfycbwOJTOCV_nNfsQ5-xYn-ESU30PIyJckQnmmSU8omhyt2GmBWGqYQSNvNTLTO9-Ozv6j3A/exec";

function handleCredentialResponse(response) {
  const data = jwt_decode(response.credential);
  signedInEmail = data.email;
  document.getElementById("submittedBy").value = signedInEmail;
  document.getElementById("googleSignIn").style.display = "none";
}

document.getElementById("year").value = new Date().getFullYear();

// Form Visibility Logic
document.addEventListener('DOMContentLoaded', function () {
  const festivalEl = document.getElementById('festival');
  const typeEl = document.getElementById('type');
  const paymentTypeEl = document.getElementById('paymentType');

  const fgType = document.getElementById('fg-type');
  const fgName = document.getElementById('fg-name');
  const fgAmount = document.getElementById('fg-amount');
  const fgLocal = document.getElementById('fg-local');
  const fgVillage = document.getElementById('fg-village');
  const fgYear = document.getElementById('fg-year');
  const fgRemarks = document.getElementById('fg-remarks');
  const fgPaymentType = document.getElementById('fg-paymentType');
  const fgAttachment = document.getElementById('fg-attachment');

  const lblName = document.getElementById('lbl-name');
  const lblLocal = document.getElementById('lbl-local');

  function updateFormVisibility() {
    const festival = festivalEl.value;
    const type = typeEl.value;
    const paymentType = paymentTypeEl.value;

    if (festival) {
      fgType.style.display = 'block';
      typeEl.required = true;
    } else {
      fgType.style.display = 'none';
      typeEl.required = false;
    }

    if (type === 'Expense' || type === 'Collection') {
      if (type === 'Expense') {
        fgName.style.display = 'block';
        lblName.textContent = 'Product Name';
        document.getElementById('name').required = true;

        fgAmount.style.display = 'block';

        fgLocal.style.display = 'block';
        lblLocal.textContent = 'Shop Name';
        document.getElementById('local').required = true;

        fgVillage.style.display = 'none';
        document.getElementById('village').required = false;
        document.getElementById('village').value = '';
      } else {
        // Collection
        fgName.style.display = 'block';
        lblName.textContent = 'Name';
        document.getElementById('name').required = true;

        fgAmount.style.display = 'block';

        fgLocal.style.display = 'block';
        lblLocal.textContent = 'Local';
        document.getElementById('local').required = true;

        fgVillage.style.display = 'block';
        document.getElementById('village').required = true;
      }

      fgYear.style.display = 'block';
      fgRemarks.style.display = 'block';

      fgPaymentType.style.display = 'block';
      paymentTypeEl.required = true;

      if (paymentType === 'Online') {
        fgAttachment.style.display = 'block';
      } else {
        fgAttachment.style.display = 'none';
        document.getElementById('attachment').value = '';
        document.getElementById('fileInfo').innerHTML = '';
      }
    } else {
      [fgName, fgAmount, fgLocal, fgVillage, fgYear, fgRemarks, fgPaymentType, fgAttachment].forEach(el => el.style.display = 'none');
      document.getElementById('village').required = false;
      document.getElementById('name').required = false;
      document.getElementById('local').required = false;
      paymentTypeEl.required = false;
      document.getElementById('attachment').value = '';
      document.getElementById('fileInfo').innerHTML = '';
    }
  }

  festivalEl.addEventListener('change', updateFormVisibility);
  typeEl.addEventListener('change', updateFormVisibility);
  paymentTypeEl.addEventListener('change', updateFormVisibility);

  // Initial check
  updateFormVisibility();
}); window.onload = function () {
  google.accounts.id.initialize({
    client_id:
      "923748239564-vu6bjumjpfa36jt3rsvjtnrnh637m6a0.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(document.getElementById("googleSignIn"), {
    theme: "outline",
    size: "large",
    type: "standard",
    shape: "pill",
  });

  fetchData();
};
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

    if (file) {

      if (!validateFile(file)) {

        return;

      }

      if (file.type.startsWith("image/")) {

        const compressed = await compressImage(file);

        jsonData.fileName =

          file.name.replace(/\.[^.]+$/, ".jpg");

        jsonData.mimeType = "image/jpeg";

        jsonData.fileData =

          await blobToBase64(compressed);

      }

      else {

        jsonData.fileName = file.name;

        jsonData.mimeType = file.type;

        jsonData.fileData =

          await blobToBase64(file);

      }

    }

    try {
      const response = await fetch(scriptURL, {
        method: "POST",
        body: new URLSearchParams(jsonData),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const resultText = await response.text();
      alert(resultText);
      this.reset();

      document.getElementById("year").value =
        new Date().getFullYear();

      document.getElementById("submittedBy").value =
        signedInEmail;

      document.getElementById("fileInfo").innerHTML = "";
      document.getElementById("submittedBy").value = signedInEmail;
      console.log(
        "Submission successful:",
        resultText,
        "submitted by:",
        signedInEmail
      );
      fetchData();
    } catch (err) {
      console.error("Submission error:", err);
      alert("❌ Submission failed.");
    }
  });


// ✅ START: Filter setup (only on Load Data button)
let allData = []; // Store all data once loaded

async function fetchData() {
  try {
    const response = await fetch(`${scriptURL}?action=read`);
    allData = await response.json(); // store for filtering
    renderTable(allData); // show all initially
    populateDropdowns(allData); // populate dropdowns from unique values
  } catch (err) {
    console.error("Fetching error:", err);
    alert("❌ Failed to load data.");
  }
}

function renderTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="white-space: nowrap;">${row.Timestamp || ""}</td>
      <td>${row.type || ""}</td>
      <td>${row.paymentType || ""}</td>
      <td>${row.name || ""}</td>
      <td>${row.amount || ""}</td>
      <td>${row.local || ""}</td>
      <td>${row.village || ""}</td>
      <td>${row.festival || ""}</td>
      <td>${row.year || ""}</td>
      <td>${row.remarks || ""}</td>
      <td>${row.attachment ? `<a href="${row.attachment}" target="_blank" style="color: blue; text-decoration: underline;">View</a>` : ""}</td>
      <td>${row.submittedBy || ""}</td>
    `;
    tbody.appendChild(tr);
  });

  // Attach edit button listeners
}

function applyFilters() {
  const nameInput = document
    .getElementById("searchByName")
    .value.trim()
    .toLowerCase();
  const villageInput = document.getElementById("searchByVillage").value;
  const yearInput = document.getElementById("searchByYear").value;
  const localInput = document.getElementById("searchByLocal").value;
  const festivalInput = document.getElementById("searchByFestival").value;
  const submittedByInput = document
    .getElementById("searchBySubmittedBy")
    .value.trim()
    .toLowerCase();
  const typeInput = document.getElementById("searchByType")?.value || "";
  const paymentTypeInput = document.getElementById("searchByPaymentType")?.value || "";
  const amountRange = document.getElementById("searchByAmountRange")?.value || "";

  const filtered = allData.filter((row) => {
    const name = String(row.name || "").toLowerCase();
    const village = String(row.village || "");
    const year = String(row.year || "");
    const local = String(row.local || "");
    const festival = String(row.festival || "");
    const submittedBy = String(row.submittedBy || "").toLowerCase();
    const amt = parseFloat(row.amount || "0");
    const rowType = String(row.type || "");
    const rowPaymentType = String(row.paymentType || "");

    const matchesAmount = (() => {
      if (!amountRange) return true;

      let min = 0, max = Infinity;

      if (amountRange.includes("+")) {
        min = parseInt(amountRange.replace("+", ""), 10);
      } else if (amountRange.includes("-")) {
        [min, max] = amountRange.split("-").map(Number);
      }

      return amt >= min && amt <= max;
    })();



    return (
      (!nameInput || name.includes(nameInput)) &&
      (!villageInput || village === villageInput) &&
      (!yearInput || year === yearInput) &&
      (!localInput || local === localInput) &&
      (!festivalInput || festival === festivalInput) &&
      (!typeInput || rowType === typeInput) &&
      (!paymentTypeInput || rowPaymentType === paymentTypeInput) &&
      (!submittedByInput || submittedBy.includes(submittedByInput)) &&
      matchesAmount
    );
  });

  renderTable(filtered);

  // ✅ Show total amount
  const total = filtered.reduce((sum, row) => {
    const amt = parseFloat(row.amount);
    return !isNaN(amt) ? sum + amt : sum;
  }, 0);

  document.getElementById("totalAmount").textContent = total.toFixed(2);
}



// ✅ Now filters only apply when user clicks "Load Data"
document.getElementById("loadDataBtn").addEventListener("click", applyFilters);

document.getElementById("downloadPDF").addEventListener("click", function () {
  const exportArea = document.getElementById("exportContent");

  // Create a deep clone to preserve content
  const clone = exportArea.cloneNode(true);

  // Check if table has rows — otherwise cancel
  const rows = clone.querySelectorAll("tbody tr");
  if (!rows.length) {
    alert("⚠️ No data to export! Please load or filter data first.");
    return;
  }

  // Force visual style
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  clone.style.padding = "20px";
  clone.style.background = "#fff";
  clone.style.color = "#000";
  clone.style.fontSize = "12px";

  const table = clone.querySelector("table");
  if (table) {
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    table.querySelectorAll("th, td").forEach(cell => {
      cell.style.wordBreak = "break-word";
      cell.style.whiteSpace = "normal";
      cell.style.padding = "6px 8px";
      cell.style.border = "1px solid #ccc";
      cell.style.fontSize = "11px";
      cell.style.textAlign = "left";
      cell.style.background = "#fff"; // force white background
      cell.style.color = "#000";      // ensure dark text
    });
  }

  // Append total amount to bottom
  const totalBox = document.getElementById("totalAmountBox").cloneNode(true);
  totalBox.style.background = "#fef08a";
  totalBox.style.color = "#92400e";
  totalBox.style.fontWeight = "bold";
  totalBox.style.fontSize = "14px";
  totalBox.style.textAlign = "center";
  totalBox.style.marginTop = "20px";
  totalBox.style.padding = "10px";
  totalBox.style.borderRadius = "10px";
  clone.appendChild(totalBox);

  // Create a temp container
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.appendChild(clone);
  document.body.appendChild(tempContainer);

  const opt = {
    margin: 10,
    filename: "budget-catcher-data.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      scrollY: 0,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  html2pdf().set(opt).from(clone).save().then(() => {
    document.body.removeChild(tempContainer);
  });
});



function populateDropdowns(data) {
  const villages = new Set();
  const years = new Set();
  const locals = new Set();
  const festivals = new Set();

  data.forEach((row) => {
    if (row.village) villages.add(row.village);
    if (row.year) years.add(row.year);
    if (row.local) locals.add(row.local);
    if (row.festival) festivals.add(row.festival);
  });

  fillSelect("searchByVillage", villages);
  fillSelect("searchByYear", years);
  fillSelect("searchByLocal", locals);
  fillSelect("searchByFestival", festivals);
}

function fillSelect(id, valuesSet) {
  const select = document.getElementById(id);
  let label = '';
  switch (id) {
    case 'searchByVillage':
      label = 'Select Village';
      break;
    case 'searchByYear':
      label = 'Select Year';
      break;
    case 'searchByLocal':
      label = 'Select Local';
      break;
    case 'searchByFestival':
      label = 'Select Festival';
      break;
    default:
      label = '-- Select --';
  }

  select.innerHTML = `<option value="">${label}</option>`;


  Array.from(valuesSet)
    .sort()
    .forEach((val) => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });
}
async function compressImage(file) {

  return new Promise((resolve) => {

    const reader = new FileReader();

    reader.onload = function (event) {

      const img = new Image();

      img.onload = function () {

        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1600;

        if (width > MAX_WIDTH) {

          height = Math.round(height * MAX_WIDTH / width);

          width = MAX_WIDTH;
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;

        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(

          function (blob) {

            resolve(blob);

          },

          "image/jpeg",

          0.75

        );

      };

      img.src = event.target.result;

    };

    reader.readAsDataURL(file);

  });

}
function blobToBase64(blob) {

  return new Promise((resolve) => {

    const reader = new FileReader();

    reader.onloadend = function () {

      resolve(reader.result.split(",")[1]);

    };

    reader.readAsDataURL(blob);

  });

}
function validateFile(file) {

  const allowed = [

    "image/jpeg",

    "image/png",

    "image/jpg",

    "application/pdf"

  ];

  if (!allowed.includes(file.type)) {

    alert("Only JPG, PNG and PDF are allowed.");

    return false;

  }

  if (file.size > 20 * 1024 * 1024) {

    alert("Maximum file size is 20 MB.");

    return false;

  }

  return true;

}
document
  .getElementById("attachment")
  .addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {

      return;

    }

    document.getElementById("fileInfo").innerHTML =

      file.name +

      " (" +

      (file.size / 1024 / 1024).toFixed(2) +

      " MB)";

  });