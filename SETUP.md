# ACM registration setup

## Connect registrations to Google Sheets

1. Create a Google Sheet in your Google Drive.
2. Open **Extensions > Apps Script**.
3. Replace the default code with the contents of `google-apps-script.gs`.
4. Click **Deploy > New deployment**.
5. Select **Web app** as the deployment type.
6. Set **Execute as** to **Me** and **Who has access** to **Anyone**.
7. Deploy, authorize the script, and copy the web-app URL.
8. Open `script.js` and paste that URL into `GOOGLE_SHEETS_ENDPOINT`.
9. Re-upload the updated website files to your host.

To close registration, change `REGISTRATION_OPEN = true` to `REGISTRATION_OPEN = false` in `google-apps-script.gs`, redeploy the Apps Script web app as a new version, and update the same setting in `script.js` before uploading the website again. Set both values back to `true` when registration should reopen.

The script creates a `Registrations` sheet automatically with timestamp, name, enrollment, phone, department, semester, and LinkedIn columns. Duplicate names, enrollment numbers, and phone numbers are rejected by the sheet backend.

## Publish the page as a link

Upload `index.html`, `styles.css`, `script.js`, `acmlogo-transparent.png`, and `acmlogo.png` to a static host such as GitHub Pages, Netlify, or Vercel. The host will give you a public URL to share with students.

Do not use the local `file://` address as the registration link. Students need the hosted HTTPS URL.
