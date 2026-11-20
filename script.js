const STORAGE_KEY = "acm-bahria-session-registrations";
// Change to false to close the local form. The Google Sheets backend has its own switch below.
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
let seatAvailability = {};
// Paste your deployed Google Apps Script web-app URL here after setup.
const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBvs5XMPjnALb_vvLXmmhVvK6m5K-e6dClKcEkr0D6IFfrvipML97mNEebDcyWvxLV/exec";

const form = document.querySelector("#registrationForm");
const message = document.querySelector("#formMessage");
const submitButton = form.querySelector("button");
const registrationStatus = document.querySelector("#registrationStatus");
const fields = {
  name: document.querySelector("#name"),
  enrollment: document.querySelector("#enrollment"),
  phone: document.querySelector("#phone"),
  department: document.querySelector("#department"),
  semester: document.querySelector("#semester"),
  linkedin: document.querySelector("#linkedin")
};

function getRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizedPhone(value) {
  return value.replace(/[^\d+]/g, "").replace(/^\+92/, "0");
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function updateRegistrationStatus() {
  const department = normalize(fields.department.value);
  const semester = fields.semester.value;
  const key = `${department}|${semester}`;
  const remaining = department && semester ? (seatAvailability[key] ?? SEATS_PER_CLASS) : null;
  const unavailable = remaining !== null && remaining <= 0;
  const statusText = !REGISTRATION_OPEN
    ? "Registration is closed"
    : unavailable
      ? "This class is full"
      : remaining !== null
        ? `${remaining} seat${remaining === 1 ? "" : "s"} remaining`
        : "Registration is open";
  registrationStatus.querySelector("strong").textContent = statusText;
  registrationStatus.classList.toggle("closed", !REGISTRATION_OPEN || unavailable);
  submitButton.disabled = !REGISTRATION_OPEN || unavailable;
}

function markInvalid(field, invalid) {
  field.closest(".field").classList.toggle("invalid", invalid);
}

function validate(name, enrollment, phone, department, semester, linkedin) {
  const errors = [];
  const nameValid = /^[a-zA-Z][a-zA-Z .'-]{2,59}$/.test(name);
  const enrollmentValid = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{2,29}$/.test(enrollment);
  const phoneValid = /^(03\d{9}|\+923\d{9})$/.test(phone);
  const departmentValid = ALLOWED_DEPARTMENTS.includes(department);
  const semesterValid = ALLOWED_SEMESTERS.includes(semester);
  const linkedinValid = !linkedin || /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9%_-]+\/?(?:\?.*)?$/i.test(linkedin);
  markInvalid(fields.name, !nameValid);
  markInvalid(fields.enrollment, !enrollmentValid);
  markInvalid(fields.phone, !phoneValid);
  markInvalid(fields.department, !departmentValid);
  markInvalid(fields.semester, !semesterValid);
  markInvalid(fields.linkedin, !linkedinValid);
  if (!nameValid) errors.push("Enter a valid name (at least 3 letters).");
  if (!enrollmentValid) errors.push("Enter a valid enrollment number.");
  if (!phoneValid) errors.push("Enter a valid Pakistani phone number, for example 03001234567.");
  if (!departmentValid) errors.push("Select one of the available departments.");
  if (!semesterValid) errors.push("Select a semester from 1 to 8.");
  if (!linkedinValid) errors.push("Enter a valid LinkedIn profile URL or leave it blank.");
  return errors;
}

async function saveToGoogleSheet(student) {
  const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(student)
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { success: true };
  }
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "Registration could not be saved.");
  return result;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!REGISTRATION_OPEN) {
    showMessage("Registration is currently closed.", "error");
    return;
  }
  const data = new FormData(form);
  const name = normalize(data.get("name") || "");
  const enrollment = normalize(data.get("enrollment") || "");
  const phone = normalizedPhone(data.get("phone") || "");
  const department = normalize(data.get("department") || "");
  const semester = String(data.get("semester") || "").trim();
  const linkedin = (data.get("linkedin") || "").trim();
  const localRegistrations = getRegistrations();
  const validationErrors = validate(name, enrollment, phone, department, semester, linkedin);

  if (validationErrors.length) {
    showMessage(validationErrors[0], "error");
    return;
  }
  if (localRegistrations.some((student) => student.name === name || student.phone === phone || student.enrollment === enrollment)) {
    showMessage("This name, enrollment number, or phone number is already registered.", "error");
    return;
  }
  const seatKey = `${department}|${semester}`;
  if ((seatAvailability[seatKey] ?? SEATS_PER_CLASS) <= 0) {
    showMessage("This department and semester class is full.", "error");
    return;
  }

  const student = { name, enrollment, phone, department, semester, linkedin };
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Saving...";
  showMessage("Saving your registration...", "pending");

  try {
    if (GOOGLE_SHEETS_ENDPOINT) {
      await saveToGoogleSheet(student);
    } else {
      localRegistrations.push({ ...student, registeredAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localRegistrations));
      seatAvailability[seatKey] = Math.max(0, (seatAvailability[seatKey] ?? SEATS_PER_CLASS) - 1);
    }
    form.reset();
    Object.values(fields).forEach((field) => markInvalid(field, false));
    showMessage("Registration confirmed successfully.", "success");
    await refreshAvailability();
    updateRegistrationStatus();
  } catch (error) {
    const messageText = error instanceof TypeError && error.message.toLowerCase().includes("fetch")
      ? "Could not connect to Google Sheets. Check that the Apps Script is deployed as a Web app for Anyone."
      : error.message;
    showMessage(messageText, "error");
  } finally {
    submitButton.querySelector("span").textContent = "Register now";
    updateRegistrationStatus();
  }
});

async function refreshAvailability() {
  if (!GOOGLE_SHEETS_ENDPOINT) {
    const registrations = getRegistrations();
    seatAvailability = {};
    registrations.forEach((student) => {
      const key = `${normalize(student.department)}|${student.semester}`;
      seatAvailability[key] = Math.max(0, (seatAvailability[key] ?? SEATS_PER_CLASS) - 1);
    });
    updateRegistrationStatus();
    return;
  }
  try {
    const response = await fetch(GOOGLE_SHEETS_ENDPOINT);
    if (!response.ok) return;
    const result = await response.json();
    if (result.availability) seatAvailability = result.availability;
  } catch {
    // The form will rely on the Apps Script to enforce the seat limit.
  }
  updateRegistrationStatus();
}

fields.department.addEventListener("change", updateRegistrationStatus);
fields.semester.addEventListener("change", updateRegistrationStatus);

updateRegistrationStatus();
refreshAvailability();
