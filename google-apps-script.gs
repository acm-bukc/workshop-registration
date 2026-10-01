const SHEET_NAME = "Registrations";
// Change to false and redeploy the web app to stop accepting registrations.
const REGISTRATION_OPEN = true;
const ALLOWED_DEPARTMENTS = ["computer science", "information technology", "artificial intelligence"];
const ALLOWED_SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function doPost(event) {
  if (!REGISTRATION_OPEN) return reply(false, "Registration is currently closed.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(event.postData.contents);
    const name = normalize(data.name);
    const enrollment = normalize(data.enrollment);
    const phone = normalizePhone(data.phone);
    const department = normalize(data.department);
    const semester = String(data.semester || "").trim();
    const linkedin = String(data.linkedin || "").trim();

    if (!/^[a-zA-Z][a-zA-Z .'-]{2,59}$/.test(name)) return reply(false, "Enter a valid name.");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{2,29}$/.test(enrollment)) return reply(false, "Enter a valid enrollment number.");
    if (!/^(03\d{9}|\+923\d{9})$/.test(phone)) return reply(false, "Enter a valid Pakistani phone number.");
    if (!ALLOWED_DEPARTMENTS.includes(department)) return reply(false, "Select a valid department.");
    if (!ALLOWED_SEMESTERS.includes(semester)) return reply(false, "Select a valid semester (1-8).");
    if (linkedin && !/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9%_-]+\/?(?:\?.*)?$/i.test(linkedin)) return reply(false, "Enter a valid LinkedIn profile URL or leave it blank.");

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const records = rows.slice(1);

    const duplicate = records.some((row) => normalize(row[1]) === name || normalize(row[2]) === enrollment || normalizePhone(row[3]) === phone);
    if (duplicate) return reply(false, "This name, enrollment number, or phone number is already registered.");

    sheet.appendRow([new Date(), name, enrollment, phone, department, semester, linkedin]);
    return reply(true, "Registration confirmed.");
  } catch (error) {
    return reply(false, "The registration could not be saved. Please try again.");
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Name", "Enrollment", "Phone", "Department", "Semester", "LinkedIn"]);
  return sheet;
}

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/^\+92/, "0");
}

function reply(success, message, remaining) {
  return ContentService.createTextOutput(JSON.stringify({ success, message, remaining }))
    .setMimeType(ContentService.MimeType.JSON);
}
