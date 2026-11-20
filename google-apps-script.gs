const SHEET_NAME = "Registrations";
// Change to false and redeploy the web app to stop accepting registrations.
const REGISTRATION_OPEN = true;
const SEATS_PER_CLASS = 5;
const ALLOWED_DEPARTMENTS = [
  "bs computer science",
  "bs information technology",
  "bs artificial intelligence",
  "bachelor of software engineering",
  "bachelor of computer engineering",
  "bs business analytics",
  "bachelor of business administration",
  "bs accounting and finance"
];
const ALLOWED_SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function doGet() {
  const sheet = getSheet();
  const availability = getAvailability(sheet.getDataRange().getValues().slice(1));
  return reply(true, "ACM registration service is online.", availability);
}

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
    if (!ALLOWED_SEMESTERS.includes(semester)) return reply(false, "Select a semester from 1 to 8.");
    if (linkedin && !/^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9%_-]+\/?(?:\?.*)?$/i.test(linkedin)) return reply(false, "Enter a valid LinkedIn profile URL or leave it blank.");

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const records = rows.slice(1);

    const duplicate = records.some((row) => normalize(row[1]) === name || normalize(row[2]) === enrollment || normalizePhone(row[3]) === phone);
    if (duplicate) return reply(false, "This name, enrollment number, or phone number is already registered.");

    const key = department + "|" + semester;
    const count = records.filter((row) => normalize(row[4]) + "|" + String(row[5] || "").trim() === key).length;
    if (count >= SEATS_PER_CLASS) {
      return reply(false, "This department and semester class is full.");
    }

    sheet.appendRow([new Date(), name, enrollment, phone, department, semester, linkedin]);
    const availability = getAvailability(sheet.getDataRange().getValues().slice(1));
    return reply(true, "Registration confirmed.", availability);
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
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Name", "Enrollment", "Phone", "Department", "Semester", "LinkedIn"]);
  } else if (sheet.getLastColumn() < 7) {
    sheet.getRange(1, 1, 1, 7).setValues([["Timestamp", "Name", "Enrollment", "Phone", "Department", "Semester", "LinkedIn"]]);
  }
  return sheet;
}

function getAvailability(records) {
  const availability = {};
  ALLOWED_DEPARTMENTS.forEach((department) => {
    ALLOWED_SEMESTERS.forEach((semester) => {
      const key = department + "|" + semester;
      const count = records.filter((row) =>
        normalize(row[4]) + "|" + String(row[5] || "").trim() === key
      ).length;
      availability[key] = Math.max(0, SEATS_PER_CLASS - count);
    });
  });
  return availability;
}

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").replace(/^\+92/, "0");
}

function reply(success, message, availability) {
  return ContentService.createTextOutput(JSON.stringify({ success, message, availability }))
    .setMimeType(ContentService.MimeType.JSON);
}
