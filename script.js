const STORAGE_KEY = "acm-bahria-session-registrations";
// Change to false to close the local form. The Google Sheets backend has its own switch below.
const REGISTRATION_OPEN = true;
const ALLOWED_DEPARTMENTS = ["computer science", "information technology", "artificial intelligence"];
// Paste your deployed Google Apps Script web-app URL here after setup.
const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxPWCqwZ8CpZhZj_UlucFu_8Na9Ztqe6q0HnUmyEE-AeIdzo9gq3-TrGp3pVUSWns9K/exec";

const form = document.querySelector("#registrationForm");
const message = document.querySelector("#formMessage");
const submitButton = form.querySelector("button");
const registrationStatus = document.querySelector("#registrationStatus");
const fields = {
  name: document.querySelector("#name"),
  enrollment: document.querySelector("#enrollment"),
  phone: document.querySelector("#phone"),
  department: document.querySelector("#department"),
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
  registrationStatus.querySelector("strong").textContent = REGISTRATION_OPEN ? "Registration is open" : "Registration is closed";
  registrationStatus.classList.toggle("closed", !REGISTRATION_OPEN);
  submitButton.disabled = !REGISTRATION_OPEN;
}

function markInvalid(field, invalid) {
  field.closest(".field").classList.toggle("invalid", invalid);
}

function validate(name, enrollment, phone, department, linkedin) {
  const errors = [];
  const nameValid = /^[a-zA-Z][a-zA-Z .'-]{2,59}$/.test(name);
  const enrollmentValid = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{2,29}$/.test(enrollment);
  const phoneValid = /^(03\d{9}|\+923\d{9})$/.test(phone);
  const departmentValid = ALLOWED_DEPARTMENTS.includes(department);
  const linkedinValid = !linkedin || /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9%_-]+\/?(?:\?.*)?$/i.test(linkedin);
  markInvalid(fields.name, !nameValid);
  markInvalid(fields.enrollment, !enrollmentValid);
  markInvalid(fields.phone, !phoneValid);
  markInvalid(fields.department, !departmentValid);
  markInvalid(fields.linkedin, !linkedinValid);
  if (!nameValid) errors.push("Enter a valid name (at least 3 letters).");
  if (!enrollmentValid) errors.push("Enter a valid enrollment number.");
  if (!phoneValid) errors.push("Enter a valid Pakistani phone number, for example 03001234567.");
  if (!departmentValid) errors.push("Select one of the available departments.");
  if (!linkedinValid) errors.push("Enter a valid LinkedIn profile URL or leave it blank.");
  return errors;
}

async function saveToGoogleSheet(student) {
  const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(student)
  });
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
  const linkedin = (data.get("linkedin") || "").trim();
  const localRegistrations = getRegistrations();
  const validationErrors = validate(name, enrollment, phone, department, linkedin);

  if (validationErrors.length) {
    showMessage(validationErrors[0], "error");
    return;
  }
  if (localRegistrations.some((student) => student.name === name || student.phone === phone || student.enrollment === enrollment)) {
    showMessage("This name, enrollment number, or phone number is already registered.", "error");
    return;
  }

  const student = { name, enrollment, phone, department, linkedin };
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Saving...";
  showMessage("Saving your registration...", "pending");

  try {
    if (GOOGLE_SHEETS_ENDPOINT) {
      await saveToGoogleSheet(student);
    } else {
      localRegistrations.push({ ...student, registeredAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localRegistrations));
    }
    form.reset();
    Object.values(fields).forEach((field) => markInvalid(field, false));
    showMessage("Registration confirmed successfully.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Register now";
  }
});

updateRegistrationStatus();
