// for app script 
const SPREADSHEET_ID = "1fNrQReyfq5ZAIinbS_DTBXHzWLAl4knvxY_bfBi9CV4";

function doPost(e) {
  try {
    const data = e.parameter;
    const attachmentUrl = uploadAttachment(data);
    const sheetName = `${data.year}_${data.festival}`;
    
    // Using openById instead of getActiveSpreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);

    // Set your expected fields (preserve order)
const expectedHeaders = [
  "Timestamp",
  "type",
  "paymentType",
  "year",
  "village",
  "festival",
  "remarks",
  "local",
  "name",
  "amount",
  "attachment",
  "submittedBy"
];
function getOrCreateFolder(parent, name) {

  const folders = parent.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent.createFolder(name);
}
function uploadAttachment(data) {

  if (!data.fileData) {
    return "";
  }

  const root = getOrCreateFolder(
    DriveApp.getRootFolder(),
    "Budget Catcher"
  );

  const festivalFolder = getOrCreateFolder(
    root,
    data.festival
  );

  const yearFolder = getOrCreateFolder(
    festivalFolder,
    data.year
  );

  const typeFolder = getOrCreateFolder(
    yearFolder,
    data.type
  );

  const bytes = Utilities.base64Decode(data.fileData);

  const blob = Utilities.newBlob(
    bytes,
    data.mimeType,
    data.fileName
  );

  const file = typeFolder.createFile(blob);

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return file.getUrl();

}

    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(expectedHeaders);
    }

    // Ensure headers match (optional safety check)
    const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (sheetHeaders.join() !== expectedHeaders.join()) {
      throw new Error("Sheet headers mismatch – please verify header structure.");
    }

    // Prepare row
const row = [
  new Date(),
  data.type || "",
  data.paymentType || "",
  data.year || "",
  data.village || "",
  data.festival || "",
  data.remarks || "",
  data.local || "",
  data.name || "",
  data.amount || "",
  attachmentUrl,
  data.submittedBy || ""
];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput("✅ Data saved successfully")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService
      .createTextOutput(`❌ Error: ${err.message}`)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "read") {
    return readSheetData();
  }

  return ContentService
    .createTextOutput("Invalid action")
    .setMimeType(ContentService.MimeType.TEXT);
}

function readSheetData() {
  // Using openById instead of getActiveSpreadsheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();

  const combinedData = [];
const expectedHeaders = [
  "Timestamp",
  "type",
  "paymentType",

  "year",

  "village",

  "festival",

  "remarks",

  "local",

  "name",

  "amount",

  "attachment",

  "submittedBy"

];
  for (const sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) continue; // skip if only header or empty

    const headers = data[0];
    if (!headers.includes("Timestamp")) continue; // Only skip if it doesn't look like a valid data sheet

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index];
      });
      combinedData.push(rowObject);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(combinedData))
    .setMimeType(ContentService.MimeType.JSON);
}
