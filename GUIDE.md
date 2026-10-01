# Google Sheets & Setup Guide for Semester Field

This guide explains how to update your Google Sheet and Google Apps Script to support the new **Semester** field (Options 1–8).

---

## 1. What Changed?

- **Frontend (`index.html`)**: Added a `<select id="semester">` with options 1 through 8 directly below **Department**.
- **Validation (`script.js`)**: Added client-side validation ensuring a semester from 1 to 8 is chosen.
- **Backend (`google-apps-script.gs`)**: Added backend validation for semester and updated the row output format to:
  `[Timestamp, Name, Enrollment, Phone, Department, Semester, LinkedIn]`

---

## 2. Google Sheets Configuration: Do you need to create a new table?

### Scenario A: If you are starting fresh OR have only test data
**You do NOT need to create anything manually.**
1. If you already have a tab named `Registrations` with dummy/test data, simply **delete** or **rename** it (e.g., rename to `Registrations_Old`).
2. The Google Apps Script automatically detects that no `Registrations` sheet exists and will **automatically create** the sheet with the correct 7 columns:
   - `Timestamp`
   - `Name`
   - `Enrollment`
   - `Phone`
   - `Department`
   - `Semester`
   - `LinkedIn`

---

### Scenario B: If you already have existing registered student data that you want to keep
Google Sheets will **not** automatically insert columns into an existing table with data. To keep your existing columns aligned:

1. Open your Google Sheet in your browser.
2. In the `Registrations` sheet, look at the first row (headers):
   - Column A: `Timestamp`
   - Column B: `Name`
   - Column C: `Enrollment`
   - Column D: `Phone`
   - Column E: `Department`
   - Column F: `LinkedIn`
3. **Right-click on Column F (`LinkedIn`)** at the top header bar and click **"Insert 1 column left"**.
4. In the newly created Column F, type **`Semester`** as the header in Row 1.
5. Your columns should now be:
   | Column A | Column B | Column C | Column D | Column E | Column F | Column G |
   | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
   | Timestamp | Name | Enrollment | Phone | Department | **Semester** | LinkedIn |

---

## 3. How to Update & Redeploy Google Apps Script

Whenever code in `google-apps-script.gs` is changed, you **must create a new deployment version** in Google Apps Script; otherwise, Google will continue running the old version.

1. Open your Google Sheet.
2. Click **Extensions** > **Apps Script**.
3. Select all the existing code in the Apps Script editor and replace it with the updated code from [`google-apps-script.gs`](google-apps-script.gs).
4. Click the **Save** icon (disk icon or `Ctrl + S`).
5. Click **Deploy** (top right) > **Manage deployments**.
6. In the modal that appears, click the **Pencil (Edit)** icon next to your active Web App deployment.
7. Under **Version**, click the dropdown and choose **New version**.
8. (Optional) In the description field, type `Added semester support`.
9. Click **Deploy**.
10. Click **Done**. *(Note: Your Web App URL remains the same, so you do not need to change the endpoint in `script.js` if updating the existing deployment).*

---

## 4. Verification & Testing

1. Open `index.html` in your browser.
2. Verify that **Semester** appears below **Department** with options 1 to 8.
3. Fill out the form and submit a test registration.
4. Check your Google Sheet to confirm that the row appears with all values in their correct columns, including the Semester.
